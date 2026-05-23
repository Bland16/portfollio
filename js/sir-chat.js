// ═══════════════════════════════════════════════════════════
// sir-chat.js — Chat interface for Sir's ticket booth
//
// Usage in main.js:
//   import { SirChat }    from './sir-chat.js'
//   import { SirMatcher } from './sir-matcher.js'
//
//   const matcher = new SirMatcher()
//   const chat    = new SirChat({ matcher, anim: robotAnim })
//   chat.mount()
//
// Pass anim (ClockworkAnimations instance) so Sir's jaw moves
// while he speaks. If omitted, voice still works, jaw stays still.
// ═══════════════════════════════════════════════════════════

// ── STYLES ────────────────────────────────────────────────
const CSS = `
  .sir-chat {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    z-index: 8000;
    pointer-events: none;
    font-family: 'Georgia', serif;
  }

  .sir-caption {
    pointer-events: none;
    max-width: min(560px, 88vw);
    background: rgba(0,0,0,0.76);
    color: #ffffff;
    font-size: 14px;
    line-height: 1.6;
    letter-spacing: 0.02em;
    padding: 9px 18px;
    border-radius: 4px 4px 0 0;
    text-align: center;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    width: 100%;
    box-sizing: border-box;
  }
  .sir-caption.sir-caption--visible {
    opacity: 1;
    transform: translateY(0);
  }

  .sir-followups {
    pointer-events: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    max-width: min(560px, 88vw);
    padding: 8px 12px 0;
    opacity: 0;
    transition: opacity 0.25s ease 0.1s;
  }
  .sir-followups.sir-followups--visible {
    opacity: 1;
  }
  .sir-followup-btn {
    background: transparent;
    border: 1px solid #c9a84c88;
    color: #c9a84c;
    font-family: 'Georgia', serif;
    font-size: 11px;
    letter-spacing: 0.08em;
    padding: 4px 12px;
    border-radius: 2px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .sir-followup-btn:hover {
    background: #c9a84c22;
    border-color: #c9a84c;
    color: #f5e4a0;
  }

  .sir-input-bar {
    pointer-events: auto;
    display: flex;
    align-items: stretch;
    gap: 0;
    width: min(560px, 88vw);
    background: #0d0221;
    border: 1px solid #c9a84c55;
    border-top: 2px solid #c9a84c;
    border-bottom: none;
    border-radius: 4px 4px 0 0;
    overflow: hidden;
    margin-top: 6px;
  }

  .sir-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #f5f0e8;
    font-family: 'Georgia', serif;
    font-size: 13px;
    letter-spacing: 0.03em;
    padding: 12px 14px;
    caret-color: #c9a84c;
  }
  .sir-input::placeholder {
    color: #f5f0e833;
    font-style: italic;
  }
  .sir-input:focus::placeholder {
    color: #f5f0e818;
  }

  .sir-ask-btn {
    flex-shrink: 0;
    background: #c9a84c;
    border: none;
    color: #0d0221;
    font-family: 'Georgia', serif;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0 20px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, opacity 0.2s ease;
    white-space: nowrap;
  }
  .sir-ask-btn:hover:not(:disabled) {
    background: #e0c06a;
  }
  .sir-ask-btn:disabled,
  .sir-ask-btn.sir-ask-btn--speaking {
    background: #3a3a3a;
    color: #666666;
    cursor: not-allowed;
    opacity: 0.7;
  }

  .sir-speaking-dots {
    display: none;
    gap: 4px;
    align-items: center;
    padding: 0 20px;
  }
  .sir-ask-btn--speaking .sir-speaking-dots { display: flex; }
  .sir-ask-btn--speaking .sir-ask-label     { display: none; }

  .sir-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #888888;
    animation: sir-dot-bounce 1.1s ease-in-out infinite;
  }
  .sir-dot:nth-child(2) { animation-delay: 0.18s; }
  .sir-dot:nth-child(3) { animation-delay: 0.36s; }

  @keyframes sir-dot-bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40%           { transform: scale(1.0); opacity: 1;   }
  }
`

function injectStyles() {
  if (document.getElementById('sir-chat-styles')) return
  const s = document.createElement('style')
  s.id = 'sir-chat-styles'
  s.textContent = CSS
  document.head.appendChild(s)
}

const TOPIC_EXPRESSIONS = {
  // ── Warm / welcoming ──────────────────────────────────
  how_are_you:      'greeting',
  sarah_general:    'greeting',
  contact:          'greeting',
  study:            'greeting',
  about_sarah:      'greeting',
  motivation:       'greeting',
  sarah_hobbies:    'greeting',
  ferris_wheel:     'excited',

  // ── Pride in her work ─────────────────────────────────
  sarah_skills:     'proud',
  hire:             'proud',
  looking:          'proud',
  proud:            'proud',
  strength:         'proud',
  five_years:       'proud',
  future:           'proud',
  projects:         'proud',
  tapn:             'proud',
  rfid:             'proud',
  trebuchet:        'excited',
  charity:          'proud',
  trophies:         'proud',
  mathgame:         'proud',
  arcade_machine:   'excited',
  catbed:           'proud',
  poker:            'proud',
  rockefeller:      'proud',
  modelun:          'proud',
  shelf:            'proud',
  treealgo:         'thinking',
  makeuptray:       'proud',
  eggdrop:          'excited',

  // ── Sassy / superior ──────────────────────────────────
  name:             'sassy',
  why_talk:         'sassy',
  languages:        'sassy',
  tools:            'sassy',
  tech_site:        'sassy',
  ticket:           'sassy',
  bored:            'sassy',
  favorite:         'sassy',
  weirdest:         'sassy',
  clock:            'sassy',
  arms:             'sassy',
  eyebrows:         'sassy',
  itch:             'sassy',
  bot_fun:          'sassy',
  hay:              'sassy',
  arcade:           'sassy',

  // ── Thinking / philosophical ───────────────────────────
  identity:         'thinking',
  ai:               'thinking',
  happy:            'thinking',
  creation_process: 'thinking',
  work_style:       'thinking',
  learning:         'thinking',
  sarah_person:     'thinking',
  love:             'thinking',

  // ── Wistful / melancholy ───────────────────────────────
  lonely:           'wistful',
  sleep:            'wistful',
  window:           'wistful',
  see_visitor:      'wistful',
  wishes:           'wistful',
  outside_world:    'wistful',
  leave_booth:      'wistful',

  // ── Dramatic ──────────────────────────────────────────
  goodbye:          'dramatic',
  failure:          'dramatic',
  website:          'dramatic',
  weather:          'dramatic',

  // ── Idle (just talks) ─────────────────────────────────
  more:             'idle',
  weakness:         'idle',
  sarah_skills:     'idle',
}

// Fallback pool for social responses / unknown topics
const EXPR_POOL = [
  ['greeting', 30],
  ['sassy',    30],
  ['proud',    20],
  ['thinking', 15],
  ['idle',     20],
]
function _pickExpression(topic) {
  if (topic && TOPIC_EXPRESSIONS[topic]) return TOPIC_EXPRESSIONS[topic]
  // Weighted random fallback
  const total = EXPR_POOL.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [name, weight] of EXPR_POOL) {
    r -= weight
    if (r <= 0) return name
  }
  return 'greeting'
}


// ═══════════════════════════════════════════════════════════
// VOICE — picks best available en-GB male voice at runtime
// ═══════════════════════════════════════════════════════════

let _voice = null

// ── Blacklist — add any voice names that sound wrong ──────
const VOICE_BLACKLIST = [
  "Microsoft Oliver Online (Natural) - English (United Kingdom)",
  "Microsoft Ada Multilingual Online (Natural) - English (United Kingdom)" ,
  "Microsoft Ollie Multilingual Online (Natural) - English (United Kingdom)",
  "Microsoft Sonia Online (Natural) - English (United Kingdom)",
  // e.g. 'Google UK English Female',
  // e.g. 'Samantha',
]

function _loadVoice() {
  if (_voice) return
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return

  const allowed = voices.filter(v => !VOICE_BLACKLIST.includes(v.name))

  _voice = (
    allowed.find(v => v.name === "Microsoft Ryan Online (Natural) - English (United Kingdom)")         ||
    allowed.find(v => v.name === 'Google UK English Male')         ||
    allowed.find(v => /male/i.test(v.name) && v.lang === 'en-GB') ||
    allowed.find(v => /male/i.test(v.name) && v.lang.startsWith('en-GB')) ||
    allowed.find(v => /daniel|oliver|arthur|george/i.test(v.name) && v.lang.startsWith('en')) ||
    allowed.find(v => v.lang === 'en-GB' && v.localService)        ||
    allowed.find(v => v.lang.startsWith('en-GB'))                  ||
    allowed.find(v => v.lang.startsWith('en') && v.localService)   ||
    allowed.find(v => v.lang.startsWith('en'))                     ||
    allowed[0]
  )

  if (_voice) {
    console.log(`[SirChat] Voice selected: "${_voice.name}" | lang: ${_voice.lang} | local: ${_voice.localService}`)
  } else {
    console.warn('[SirChat] No voice found. Available:', voices.map(v => `"${v.name}" (${v.lang})`))
  }
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = _loadVoice
  _loadVoice()
}

function _speak(text, { rate = 0.82, pitch = 0.72, onEnd,onBoundary } = {}) {
  if (typeof speechSynthesis === 'undefined') { onEnd?.(); return }

  speechSynthesis.cancel()

  // 50ms gap prevents Chrome's synthesis-failed race condition
  setTimeout(() => {
    _loadVoice()

    const utt   = new SpeechSynthesisUtterance(text)
    utt.voice   = _voice
    utt.lang    = 'en-GB'
    utt.rate    = rate
    utt.pitch   = pitch
    utt.onend   = () => onEnd?.()
    utt.onerror = (e) => { console.warn('[SirChat] Speech error:', e.error); onEnd?.() }
    utt.onboundary = (e) => {if (e.name === 'word') onBoundary?.()}
    speechSynthesis.speak(utt)
  }, 50)
}


// ═══════════════════════════════════════════════════════════
// SirChat
// ═══════════════════════════════════════════════════════════
export class SirChat {

  /**
   * @param {object} opts
   * @param {SirMatcher}            opts.matcher
   * @param {ClockworkAnimations}   [opts.anim]           — drives jaw while speaking
   * @param {string}                [opts.placeholder]
   * @param {boolean}               [opts.speakResponses] — default true
   */
  constructor({ matcher, anim = null, placeholder = 'Ask Sir something…', speakResponses = true } = {}) {
    this._matcher        = matcher
    this._anim           = anim          // ClockworkAnimations instance — optional
    this._placeholder    = placeholder
    this._speakResponses = speakResponses
    this._speaking       = false
    this._el             = null
    this._caption        = null
    this._followups      = null
    this._input          = null
    this._btn            = null
    this._captionTimer   = null
  }

  // ── MOUNT ────────────────────────────────────────────────
  mount() {
    injectStyles()

    const root = document.createElement('div')
    root.className = 'sir-chat'
    root.innerHTML = `
      <div class="sir-caption" id="sir-caption"></div>
      <div class="sir-followups" id="sir-followups"></div>
      <div class="sir-input-bar">
        <input
          class="sir-input"
          id="sir-input"
          type="text"
          placeholder="${this._placeholder}"
          autocomplete="off"
          maxlength="200"
        />
        <button class="sir-ask-btn" id="sir-ask-btn" type="button">
          <span class="sir-ask-label">Ask Sir</span>
          <span class="sir-speaking-dots" aria-hidden="true">
            <span class="sir-dot"></span>
            <span class="sir-dot"></span>
            <span class="sir-dot"></span>
          </span>
        </button>
      </div>
    `
    document.body.appendChild(root)

    this._el        = root
    this._caption   = root.querySelector('#sir-caption')
    this._followups = root.querySelector('#sir-followups')
    this._input     = root.querySelector('#sir-input')
    this._btn       = root.querySelector('#sir-ask-btn')

    this._btn.addEventListener('click',   () => this._submit())
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this._speaking) this._submit()
    })

    requestAnimationFrame(() => this._input.focus())
  }

  // ── UNMOUNT ──────────────────────────────────────────────
  unmount() {
    // Make sure jaw is closed if we're torn down mid-speech
    this._anim?.stopTalking()
    speechSynthesis?.cancel()
    this._el?.remove()
    this._el = null
    clearTimeout(this._captionTimer)
  }

  // ── SPEAKING STATE ───────────────────────────────────────
  setSpeaking(isSpeaking) {
    this._speaking = isSpeaking
    if (!this._btn) return

    if (isSpeaking) {
      this._btn.disabled = true
      this._btn.classList.add('sir-ask-btn--speaking')
      this._btn.setAttribute('aria-label', 'Sir is speaking')
      this._input.disabled = true
    } else {
      this._btn.disabled = false
      this._btn.classList.remove('sir-ask-btn--speaking')
      this._btn.setAttribute('aria-label', '')
      this._input.disabled = false
      requestAnimationFrame(() => this._input.focus())
    }
  }

    // ── SHOW RESPONSE ────────────────────────────────────────
  showResponse(result) {
    const text      = result.full_text ?? result.text ?? ''
    const followups = result.followups ?? []
    const topic     = result.topic

    this._showCaption(text)
    this._showFollowups(followups)

    if (this._speakResponses) {
      this.setSpeaking(true)

      // Expression fires at the same time as speech starts —
      // upper body animates while jaw runs independently
      if (this._anim) {
        const expr = _pickExpression(topic)
        switch (_pickExpression(topic)) {
          case 'sassy':    this._anim.expression_sassy();    break
          case 'dramatic': this._anim.expression_dramatic(); break
          case 'proud':    this._anim.expression_proud();    break
          case 'wistful':  this._anim.expression_wistful();  break
          case 'thinking': this._anim.expression_thinking(); break
          case 'excited':  this._anim.expression_excited();  break
          case 'idle':     break
          default:         this._anim.expression_greeting(); break
        }
      }

      this._anim?.startTalking()

      _speak(text, {
        onBoundary: () => this._anim?.onWordBoundary(),
        onEnd: () => {
          this._anim?.stopTalking()
          this.setSpeaking(false)
        },
      })
    }
  }

  // ── CAPTION ──────────────────────────────────────────────
  _showCaption(text) {
    if (!this._caption) return
    clearTimeout(this._captionTimer)
    this._caption.textContent = text
    this._caption.classList.add('sir-caption--visible')
  }

  hideCaption() {
    if (!this._caption) return
    this._caption.classList.remove('sir-caption--visible')
  }

  // ── FOLLOWUP CHIPS ───────────────────────────────────────
  _showFollowups(followups) {
    if (!this._followups) return
    this._followups.innerHTML = ''

    if (!followups.length) {
      this._followups.classList.remove('sir-followups--visible')
      return
    }

    followups.forEach((text) => {
      const btn = document.createElement('button')
      btn.className   = 'sir-followup-btn'
      btn.textContent = text
      btn.addEventListener('click', () => {
        if (this._speaking) return
        this._input.value = text
        this._submit()
      })
      this._followups.appendChild(btn)
    })

    this._followups.classList.add('sir-followups--visible')
  }

  _clearFollowups() {
    if (!this._followups) return
    this._followups.innerHTML = ''
    this._followups.classList.remove('sir-followups--visible')
  }

  // ── SUBMIT ───────────────────────────────────────────────
  _submit() {
    if (this._speaking) return
    const text = this._input.value.trim()
    if (!text || !this._matcher) return

    this._input.value = ''
    this._clearFollowups()
    this.hideCaption()

    const result = this._matcher.respond(text)
    this.showResponse(result)
  }
}