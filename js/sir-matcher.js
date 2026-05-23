// ═══════════════════════════════════════════════════════════
// sir-matcher.js — JS port of sir_algorithm.py
//
// Implements the same 4-layer pipeline as the Python version.
// Imports phrase data from sir-phrases.js.
// No external dependencies.
//
// ML logging writes to localStorage in dev so you can still
// inspect unknowns. Run the Python version for the full
// ml-report against real traffic logs.
//
// Usage:
//   import { SirMatcher } from './sir-matcher.js'
//   const matcher = new SirMatcher()
//   const result  = matcher.respond("who made you")
//   console.log(result.full_text)
//   console.log(result.followups)
// ═══════════════════════════════════════════════════════════

import {
  TOPIC_KEYWORDS,
  TOPIC_MIRRORS,
  MIRROR_EXACT,
  BUCKET9,
  PHRASES,
} from './sir-phrases.js'


// ── STOP WORDS ────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'do','does','did','have','has','had','will','would','could',
  'should','may','might','shall','can','i','you','he','she',
  'it','we','they','me','him','her','us','them','my','your',
  'his','its','our','their','that','this','these','those','what',
  'who','where','when','why','how','which','and','but','or','so',
  'if','of','to','in','on','at','for','with','about','up','out',
  'just','tell','like','know','think','want','get','go','really',
  'very','also','too','more','than','then','there','here','not',
  'no','yes','please','hey','hi','hello','ok','okay','right',
])


// ── LAYER 0 — EXACT PRE-MATCH ─────────────────────────────
// Only the shortest, most unambiguous social inputs.
// Everything else runs through the full pipeline.
const EXACT_MATCHES = {
  // Greetings → identity
  'hi':       '__greeting',
  'yo':       '__greeting',
  'hey':      '__greeting',
  'hello':    '__greeting',
  'hiya':     '__greeting',
  'howdy':    '__greeting',
  'yello':    '__greeting',
  'hewo':    '__greeting',
  'hii':    '__greeting',



  // Farewells → goodbye
  'bye':      '__goodbye',
  'goodbye':  '__goodbye',
  'farewell': '__goodbye',
  'ciao':     '__goodbye',

  // Affirmations — handled specially in respond() using last topic
  'yes':      '__affirm',
  'yeah':     '__affirm',
  'yep':      '__affirm',
  'yup':      '__affirm',
  'ok':       '__affirm',
  'okay':     '__affirm',
  'sure':     '__affirm',

  // Negations
  'no':       '__negate',
  'nope':     '__negate',
  'nah':      '__negate',

  // Thanks → fixed Sir response
  'thanks':       '__thanks',
  'thank you':    '__thanks',
  'cheers':       '__thanks',

  // Filler → general idle
  'cool':         '__filler',
  'interesting':  '__filler',
  'wow':          '__filler',
  'hm':           '__filler',
  'hmm':          '__filler',
  'huh':          '__filler',
}

// Fixed responses for social inputs that don't need the phrase bank
const SOCIAL_RESPONSES = {
  __thanks: [
    "Think nothing of it.",
    "You are welcome. I think.",
    "Of course. It is what I am here for.",
    "Don't mention it. Although you can if you like.",
  ],
  __filler: [
    "Yes. I thought so too.",
    "Indeed.",
    "I notice things. It is mostly what I do.",
    "Quite.",
  ],
  __negate: [
    "Fair enough. What would you like to know.",
    "Understood. Ask me something else.",
    "Alright. I have other things to say if you want them.",
  ],
}


// ── UTILITY ───────────────────────────────────────────────
function normalise(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokenise(text) {
  return normalise(text).split(' ').filter(t => t && !STOP_WORDS.has(t))
}

function randFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}


// ── FUZZY CORRECTION ─────────────────────────────────────
// Levenshtein distance — used to correct typos before matching.

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    }
  }
  return dp[m][n]
}

// Similarity ratio 0-1 (mirrors Python SequenceMatcher ratio approx)
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Build flat keyword pool once
const _ALL_KEYWORDS = (() => {
  const out = new Set()
  for (const kws of Object.values(TOPIC_KEYWORDS)) {
    for (const kw of kws) {
      if (!kw.includes(' ')) out.add(kw)
    }
  }
  return [...out]
})()

function fuzzyCorrect(text, cutoff = 0.82) {
  const tokens  = text.toLowerCase().split(/\s+/)
  let changed   = false
  const result  = []

  for (const tok of tokens) {
    const clean = tok.replace(/\W/g, '')
    if (clean.length < 3) { result.push(tok); continue }

    let bestSim  = 0
    let bestWord = null
    for (const kw of _ALL_KEYWORDS) {
      const sim = similarity(clean, kw)
      if (sim > bestSim) { bestSim = sim; bestWord = kw }
    }

    if (bestSim >= cutoff && bestWord !== clean) {
      result.push(bestWord)
      changed = true
    } else {
      result.push(tok)
    }
  }

  return { corrected: result.join(' '), wasChanged: changed }
}


// ── TOPIC SCORING ─────────────────────────────────────────
function scoreTopics(normalisedInput) {
  const scores = {}
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (normalisedInput.includes(kw)) score += 2.0
      } else {
        if (normalisedInput.split(' ').includes(kw)) score += 1.0
      }
    }
    if (score > 0) scores[topic] = score
  }
  return scores
}


// ── LAYER 2 — DIRECT MATCH ────────────────────────────────
function directMatch(normalisedInput, seenIds = new Set(), threshold = 2.0) {
  const topicScores = scoreTopics(normalisedInput)
  if (!Object.keys(topicScores).length) return null

  const candidates = []
  for (const phrase of PHRASES) {
    const ts = topicScores[phrase.topic] ?? 0
    if (ts === 0) continue
    const bucketBonus = phrase.bucket === 8 ? 1.5 : 0
    candidates.push({ score: ts * phrase.weight + bucketBonus, phrase })
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.score - a.score)

  for (const { score, phrase } of candidates) {
    if (score < threshold) break
    if (!seenIds.has(phrase.id)) return phrase
  }

  // All seen — return best with repeat flag
  const best = candidates[0]
  if (best && best.score >= threshold) {
    return { ...best.phrase, _repeat: true }
  }
  return null
}


// ── LAYER 3 — TOPIC BUCKET RETRIEVAL ─────────────────────
function topicBucketRetrieval(topic, seenIds = new Set(), count = 1) {
  const pool = PHRASES
    .filter(p => p.topic === topic && !seenIds.has(p.id))
    .sort((a, b) => b.weight - a.weight)
  return pool.slice(0, count)
}


// ── LAYER 4 — PHRASE BANK SCAN ────────────────────────────
function phraseBankScan(rawInput, seenIds = new Set(), minOverlap = 1) {
  const inputTokens = new Set(tokenise(rawInput))
  if (!inputTokens.size) return null

  let bestScore  = 0
  let bestPhrase = null

  for (const phrase of PHRASES) {
    if (seenIds.has(phrase.id)) continue
    const phraseTokens = new Set(tokenise(phrase.text))
    let overlap = 0
    for (const t of inputTokens) { if (phraseTokens.has(t)) overlap++ }
    const weighted = overlap * phrase.weight
    if (weighted > bestScore) { bestScore = weighted; bestPhrase = phrase }
  }

  return bestScore >= minOverlap ? bestPhrase : null
}


// ── DEFLECT ───────────────────────────────────────────────
function deflect(normalisedInput) {
  const tokens       = new Set(normalisedInput.split(' '))
  const outsideClues = new Set(['world','outside','out','there','beyond','real','exist'])
  const philClues    = new Set(['mean','why','purpose','meaning','exist','matter','point'])

  let pool
  if ([...tokens].some(t => outsideClues.has(t))) {
    pool = BUCKET9.deflections.outside_world
  } else if ([...tokens].some(t => philClues.has(t))) {
    pool = BUCKET9.deflections.philosophical
  } else {
    pool = BUCKET9.deflections.general
  }
  return randFrom(pool)
}


// ── GET MIRROR ────────────────────────────────────────────
// ── GET MIRROR ────────────────────────────────────────────
function getMirror(normalisedInput, topic) {
  // 1. Check exact phrase patterns first (from sir-phrases.js)
  for (const entry of MIRROR_EXACT) {
    for (const pattern of entry.patterns) {
      if (normalisedInput.includes(pattern)) {
        return entry.mirror
      }
    }
  }

  // 2. Dynamic Keyword Extraction (Reads the actual question)
  // Looks for common question structures and echoes back the core subject
  const dynamicMatch = normalisedInput.match(/(?:what is|tell me about|who is|where are|what are|do you know about) (the |your |a |an )?(.+)/)
  if (dynamicMatch) {
    const article = dynamicMatch[1] || ''
    let subject = dynamicMatch[2].trim()
    
    // Only mirror if the subject is a reasonable length (e.g., 1-4 words) to avoid huge echoes
    if (subject.split(' ').length <= 4) {
      const combined = article + subject
      // Capitalize the first letter and add a period
      const capitalized = combined.charAt(0).toUpperCase() + combined.slice(1)
      return `${capitalized}.`
    }
  }

  // 3. Fallback to the general topic mirrors
  const options = TOPIC_MIRRORS[topic] ?? TOPIC_MIRRORS.general
  return randFrom(options)
}


// ── LOGGING ───────────────────────────────────────────────
// Unknowns → Google Sheet via silent form POST (fire and forget)
// Knowns   → localStorage only (for local dev inspection)
//
// To inspect locally:
//   JSON.parse(localStorage.getItem('sir_knowns') || '[]')

const _FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSf34Rs88YtOYxNNE2XY8os3eDzRzsSft19gsD-WjjulVEJCeQ/formResponse'
const _ENTRY_INPUT = 'entry.1903523312'
const _ENTRY_LAYER = 'entry.502117816'

function _logUnknown(raw, deflection) {
  // localStorage — local dev
  try {
    const log = JSON.parse(localStorage.getItem('sir_unknowns') || '[]')
    log.push({ ts: new Date().toISOString(), input: raw, deflection })
    if (log.length > 500) log.splice(0, log.length - 500)
    localStorage.setItem('sir_unknowns', JSON.stringify(log))
  } catch (_) {}

  // Google Forms — silent background POST, visitor never knows
  try {
    const body = new FormData()
    body.append(_ENTRY_INPUT, raw)
    body.append(_ENTRY_LAYER, 'unknown')
    fetch(_FORM_URL, { method: 'POST', body, mode: 'no-cors' })
      .catch(() => {})   // swallow network errors silently
  } catch (_) {}
}

function _logKnown(raw, topic, phraseId, layer) {
  // localStorage only — knowns don't need to go to the sheet
  try {
    const log = JSON.parse(localStorage.getItem('sir_knowns') || '[]')
    log.push({ ts: new Date().toISOString(), input: raw, topic, phraseId, layer })
    if (log.length > 500) log.splice(0, log.length - 500)
    localStorage.setItem('sir_knowns', JSON.stringify(log))
  } catch (_) {}
}


// ═══════════════════════════════════════════════════════════
// SirMatcher
// ═══════════════════════════════════════════════════════════
export class SirMatcher {

  constructor() {
    this._seenIds   = new Set()
    this._lastTopic = null
  }

  respond(rawInput) {
    const stripped = rawInput.toLowerCase().trim().replace(/[?!.]+$/, '')

    // ── Layer 0: Exact social pre-match ───────────────────
    const exactTarget = EXACT_MATCHES[stripped]

    // ── Layer 0: Exact social pre-match ───────────────────

    if (exactTarget) {
      // Affirmation: if we have a last topic treat it like "more"
      if (exactTarget === '__affirm') {
        if (this._lastTopic) {
          const phrases = topicBucketRetrieval(this._lastTopic, this._seenIds)
          if (phrases.length) return this._buildResult(phrases[0], rawInput, 0, false)
        }
        // No last topic — fall through to filler
        return this._socialResult(randFrom(SOCIAL_RESPONSES.__filler), rawInput)
      }

      // Fixed social responses (Thanks, Filler, Negate)
      if (exactTarget === '__thanks' || exactTarget === '__filler' || exactTarget === '__negate') {
        return this._socialResult(randFrom(SOCIAL_RESPONSES[exactTarget]), rawInput)
      }

      // NEW: Pull Greetings and Goodbyes directly from BUCKET 9
      if (exactTarget === '__greeting') {
        // Fallback array provided just in case BUCKET9.greetings isn't set up yet
        const pool = BUCKET9.greetings || ["Hello."]
        return this._socialResult(randFrom(pool), rawInput)
      }
      
      if (exactTarget === '__goodbye') {
        const pool = BUCKET9.goodbyes || ["Goodbye."]
        return this._socialResult(randFrom(pool), rawInput)
      }

      // Real topics (if you have any other exact matches mapped to topics)
      const phrases = topicBucketRetrieval(exactTarget, this._seenIds)
      if (phrases.length) return this._buildResult(phrases[0], rawInput, 0, false)
    }

    // ── "more" redirect via last topic ────────────────────
    const normForMore = normalise(stripped)
    const moreWords   = new Set(['more','another','else','continue','go on','keep going'])
    const isMores     = normForMore.split(' ').some(t => moreWords.has(t))
    if (isMores && this._lastTopic) {
      const phrases = topicBucketRetrieval(this._lastTopic, this._seenIds)
      if (phrases.length) {
        const { corrected, wasChanged } = fuzzyCorrect(rawInput)
        return this._buildResult(phrases[0], rawInput, 2, wasChanged)
      }
    }

    // ── Layer 1: Fuzzy typo correction ────────────────────
    const { corrected, wasChanged } = fuzzyCorrect(rawInput)
    const normalised = normalise(corrected)

    // ── Layer 2: Direct keyword match ─────────────────────
    let phrase = directMatch(normalised, this._seenIds)
    let layer  = 2

    // ── Layer 3: Topic bucket retrieval ───────────────────
    if (!phrase) {
      const scores   = scoreTopics(normalised)
      const topTopic = Object.entries(scores).sort((a,b) => b[1]-a[1])[0]?.[0]
      if (topTopic) {
        const bucket = topicBucketRetrieval(topTopic, this._seenIds)
        if (bucket.length) { phrase = bucket[0]; layer = 3 }
      }
    }

    // ── Layer 4: Phrase bank scan ─────────────────────────
    if (!phrase) {
      phrase = phraseBankScan(corrected, this._seenIds)
      _logUnknown(rawInput,phrase)
      if (phrase) layer = 4
    }

    // ── Deflection ────────────────────────────────────────
    if (!phrase) {
      const def = deflect(normalised)
      _logUnknown(rawInput, def)
      return {
        full_text:    def,
        text:         def,
        mirror:       '',
        topic:        null,
        phrase_id:    null,
        followups:    [],
        layer:        0,
        was_corrected: wasChanged,
      }
    }

    return this._buildResult(phrase, rawInput, layer, wasChanged)
  }

  _buildResult(phrase, rawInput, layer, wasChanged) {
      const topic    = phrase.topic
      const body     = phrase.text
      const prefix   = phrase._repeat
        ? randFrom(BUCKET9.repeat_acknowledgments) + ' '
        : ''
      
      // Pass the normalised input to our new getMirror function
      const normalisedInput = normalise(rawInput)
      const mirror   = getMirror(normalisedInput, topic)
      const fullText = `${mirror} ${prefix}${body}`.trim()

      this._seenIds.add(phrase.id)
      this._lastTopic = topic
      _logKnown(rawInput, topic, phrase.id, layer)

      return {
        full_text:     fullText,
        text:          body,
        mirror,
        topic,
        phrase_id:     phrase.id,
        followups:     phrase.followups ?? [],
        layer,
        was_corrected: wasChanged,
      }
    }

  _socialResult(text, rawInput) {
    _logKnown(rawInput, 'general', '__social', 0)
    return {
      full_text:     text,
      text,
      mirror:        '',
      topic:         null,
      phrase_id:     null,
      followups:     [],
      layer:         0,
      was_corrected: false,
    }
  }

  resetSession() {
    this._seenIds.clear()
    this._lastTopic = null
  }
}