// ═══════════════════════════════════════════════════════════
// SkillsGallery.js — Carnival Boardwalk skills viewer
//
// USAGE (from main.js):
//   import { initSkillsGallery, openSkillsGallery } from './SkillsGallery.js'
//   import { CABINS, SKILLS } from './config.js'
//   import { getActiveVibe } from './vibes.js'
//
//   initSkillsGallery({ CABINS, SKILLS, getActiveVibe })
//   initButtons({ onSkillsOpen: openSkillsGallery, ... })
//
// DEPENDENCIES: vibes.js (getVibeInfo, getActiveVibe), config.js (CABINS, SKILLS)
// No Three.js — pure DOM + inline SVG.
// ═══════════════════════════════════════════════════════════

import { getVibeInfo } from './vibes.js'

// ─────────────────────────────────────────────────────────────
// CATEGORY REGISTRY
// object: which SVG shape represents this category
// colors: deterministic palette — index into this per skill
// ─────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES = {
  hardware: {
    label:  'Hardware & Electronics',
    object: 'can',
    colors: ['#8a9bb0', '#6d8598', '#a8b8c8', '#78909a', '#b0bec8', '#5c7a8a', '#9aabb8'],
  },
  coding: {
    label:  'Software & Code',
    object: 'bottle',
    colors: ['#4a8eff', '#6b5cbf', '#3ab8a0', '#7a5cef', '#5588cc', '#2a9870', '#8860df'],
  },
  design: {
    label:  'Design & 3D',
    object: 'duck',
    colors: ['#f5c820', '#f5a020', '#e0d000', '#f0b000', '#ffd040', '#c89000', '#f5d840'],
  },
  fabrication: {
    label:  'Fabrication & Making',
    object: 'target',
    colors: ['#c8934a', '#a87238', '#d4a860', '#b88040', '#e0b870', '#986830', '#c8a060'],
  },
  soft: {
    label:  'Soft Skills',
    object: 'balloon',
    colors: ['#ff7090', '#c870e8', '#60c890', '#ff9040', '#70b8f0', '#e870a8', '#a870f0'],
  },
}

// Size per level (1–5) in px — rendered HEIGHT of the object
const LEVEL_SIZE = [50, 62, 76, 92, 110]

// Category render order
const CAT_ORDER = ['hardware', 'coding', 'design', 'fabrication', 'soft']

// ─────────────────────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────────────────────

let _cfg = {
  CABINS:        [],
  SKILLS:        {},
  getActiveVibe: () => 'suave',
}

let _overlay     = null
let _activeCard  = null   // { slug, wrapperEl } of currently open detail
let _activeBooth = null   // currently stepped-up .sg-booth element

// ─────────────────────────────────────────────────────────────
// DATA AGGREGATION
// Scans all CABIN items for .skills arrays, merges with SKILLS registry
// ─────────────────────────────────────────────────────────────

function _aggregateSkills() {
  const map = new Map()   // slug → { skill, projects[] }

  for (const cabin of (_cfg.CABINS ?? [])) {
    for (const item of (cabin.items ?? [])) {
      if (!Array.isArray(item.skills)) continue

      const seenInItem = new Set()
      for (const slug of item.skills) {
        if (seenInItem.has(slug)) continue
        seenInItem.add(slug)

        const skillDef = _cfg.SKILLS[slug]
        if (!skillDef) {
          console.warn(`[SkillsGallery] Unknown skill slug "${slug}" on "${item.label}" — add it to SKILLS in config.js`)
          continue
        }

        if (!map.has(slug)) {
          map.set(slug, { skill: { slug, ...skillDef }, projects: [] })
        }
        if (item.label) {
          map.get(slug).projects.push({
            cabinId:    cabin.id,
            cabinLabel: cabin.label,
            itemLabel:  item.label,
          })
        }
      }
    }
  }

  return map
}

function _groupByCategory(skillMap) {
  const groups = new Map()

  for (const [, entry] of skillMap) {
    const cat = entry.skill.category ?? 'soft'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(entry)
  }

  for (const arr of groups.values()) {
    arr.sort((a, b) => {
      const lvDiff = (b.skill.level ?? 1) - (a.skill.level ?? 1)
      return lvDiff !== 0 ? lvDiff : a.skill.label.localeCompare(b.skill.label)
    })
  }

  return groups
}

// ─────────────────────────────────────────────────────────────
// COLOR UTILITIES
// ─────────────────────────────────────────────────────────────

function _adjustHex(hex, amount) {
  const clamp = v => Math.max(0, Math.min(255, v))
  const n = parseInt(hex.replace('#', ''), 16)
  const r = clamp((n >> 16) + amount)
  const g = clamp(((n >> 8) & 0xff) + amount)
  const b = clamp((n & 0xff) + amount)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

const _lighten = (hex, v) => _adjustHex(hex,  Math.round(v * 2.55))
const _darken  = (hex, v) => _adjustHex(hex, -Math.round(v * 2.55))

// ─────────────────────────────────────────────────────────────
// SVG RENDERERS  (unchanged)
// Each returns an inline SVG string at the requested size.
// ─────────────────────────────────────────────────────────────

function _truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/** HARDWARE → tin can */
function _renderCan(label, color, size) {
  const w   = Math.round(size * 0.72)
  const h   = size
  const lid = _lighten(color, 22)
  const bot = _darken(color, 18)
  const lbl = _truncate(label, 9)
  return `<svg width="${w}" height="${h}" viewBox="0 0 36 50" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="32" height="38" rx="2" fill="${color}"/>
    <ellipse cx="18" cy="7"  rx="16" ry="5" fill="${lid}"/>
    <ellipse cx="18" cy="45" rx="16" ry="5" fill="${bot}"/>
    <rect x="2" y="18" width="32" height="14" fill="rgba(255,255,255,0.10)"/>
    <line x1="2" y1="18" x2="34" y2="18" stroke="rgba(0,0,0,0.14)" stroke-width="1"/>
    <line x1="2" y1="32" x2="34" y2="32" stroke="rgba(0,0,0,0.14)" stroke-width="1"/>
    <text x="18" y="27.5" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="5.5" font-weight="700"
      fill="rgba(255,255,255,0.90)" letter-spacing="0.2">${lbl}</text>
  </svg>`
}

/** CODING → milk bottle */
function _renderBottle(label, color, size) {
  const w   = Math.round(size * 0.55)
  const h   = size
  const cap = _darken(color, 22)
  const lbl = _truncate(label, 6)
  return `<svg width="${w}" height="${h}" viewBox="0 0 30 54" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 20 Q4 25 4 32 L4 46 Q4 50 8 50 L22 50 Q26 50 26 46 L26 32 Q26 25 22 20 Z" fill="${color}"/>
    <rect x="11" y="6" width="8" height="14" rx="2" fill="${_lighten(color, 10)}"/>
    <rect x="10" y="2" width="10" height="6" rx="2" fill="${cap}"/>
    <rect x="5" y="30" width="20" height="12" rx="2" fill="rgba(255,255,255,0.18)"/>
    <path d="M8 25 Q6 32 6 39" stroke="rgba(255,255,255,0.32)" stroke-width="2" fill="none" stroke-linecap="round"/>
    <text x="15" y="39" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="4.5" font-weight="700"
      fill="rgba(255,255,255,0.88)">${lbl}</text>
  </svg>`
}

/** DESIGN → rubber duck */
function _renderDuck(label, color, size) {
  const w    = size
  const h    = Math.round(size * 0.86)
  const bill = _darken(color, 12)
  const wing = _darken(color, 7)
  return `<svg width="${w}" height="${h}" viewBox="0 0 62 54" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="28" cy="37" rx="24" ry="14" fill="${color}"/>
    <circle  cx="46" cy="22" r="11"          fill="${color}"/>
    <ellipse cx="24" cy="34" rx="11" ry="5"  fill="${wing}" opacity="0.50"/>
    <rect    x="34" y="28"  width="8" height="9" rx="4" fill="${color}"/>
    <circle  cx="50" cy="19" r="2.6" fill="white"/>
    <circle  cx="50.8" cy="19" r="1.4" fill="#222"/>
    <circle  cx="51.4" cy="18.2" r="0.55" fill="white"/>
    <ellipse cx="57" cy="23" rx="6" ry="3" fill="${bill}"/>
    <ellipse cx="28" cy="48" rx="21" ry="3.5" fill="rgba(255,255,255,0.16)"/>
    <ellipse cx="28" cy="50" rx="14" ry="2"   fill="rgba(255,255,255,0.09)"/>
  </svg>`
}

/** FABRICATION → bullseye target */
function _renderTarget(label, color, size) {
  const s  = size
  const cx = s / 2
  const cy = s / 2
  const r1 = s * 0.44
  const r2 = s * 0.31
  const r3 = s * 0.18
  const r4 = s * 0.07
  return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r1}" fill="${color}"/>
    <circle cx="${cx}" cy="${cy}" r="${r2}" fill="${_lighten(color, 16)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r3}" fill="${_darken(color, 10)}"/>
    <circle cx="${cx}" cy="${cy}" r="${r4}" fill="${_darken(color, 26)}"/>
    <line x1="${cx - r1}" y1="${cy}" x2="${cx + r1}" y2="${cy}" stroke="rgba(0,0,0,0.07)" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - r1}" x2="${cx}" y2="${cy + r1}" stroke="rgba(0,0,0,0.07)" stroke-width="1"/>
    <rect x="${cx - 1.5}" y="${cy - r1 - 6}" width="3" height="7" rx="1.5" fill="rgba(160,140,100,0.8)"/>
  </svg>`
}

/** SOFT SKILLS → balloon */
function _renderBalloon(label, color, size) {
  const w         = Math.round(size * 0.76)
  const h         = size
  const highlight = _lighten(color, 22)
  const knot      = _darken(color, 14)
  return `<svg width="${w}" height="${h}" viewBox="0 0 46 62" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 50 Q18 54 22 57 Q26 60 22 63" stroke="rgba(180,160,140,0.6)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="22" cy="24" rx="18" ry="22" fill="${color}"/>
    <ellipse cx="16" cy="14" rx="6"  ry="8"  fill="${highlight}" opacity="0.48"/>
    <circle  cx="14" cy="12" r="2.6"          fill="rgba(255,255,255,0.52)"/>
    <ellipse cx="22" cy="47" rx="3"  ry="2.5" fill="${knot}"/>
  </svg>`
}

function _renderObject(type, label, color, size) {
  switch (type) {
    case 'can':     return _renderCan(label, color, size)
    case 'bottle':  return _renderBottle(label, color, size)
    case 'duck':    return _renderDuck(label, color, size)
    case 'target':  return _renderTarget(label, color, size)
    case 'balloon': return _renderBalloon(label, color, size)
    default:        return _renderCan(label, color, size)
  }
}

// ─────────────────────────────────────────────────────────────
// PYRAMID ROW CALCULATOR
// Returns an array of row sizes ordered top → bottom,
// where the bottom row is always the widest.
// e.g. n=8  → [1, 2, 3, 2]
//      n=6  → [1, 2, 3]
//      n=10 → [1, 2, 3, 4]
// ─────────────────────────────────────────────────────────────

function _getPyramidRows(n) {
  const rows = []
  let rowSize = 1
  let placed  = 0
  while (placed < n) {
    rows.push(Math.min(rowSize, n - placed))
    placed  += rowSize
    rowSize++
  }
  return rows   // [1, 2, ..., remainder] — top to bottom
}

// ─────────────────────────────────────────────────────────────
// SHARED SKILL OBJECT BUILDER
// Extracts the common wrapper + event wiring used by every booth.
// ─────────────────────────────────────────────────────────────

function _buildSkillObject(entry, catDef, colorIndex) {
  const { skill } = entry
  const color     = catDef.colors[colorIndex % catDef.colors.length]
  const size      = LEVEL_SIZE[Math.max(0, Math.min(4, (skill.level ?? 3) - 1))]

  const wrapper = document.createElement('div')
  wrapper.className   = 'sg-obj-wrapper'
  wrapper.dataset.slug = skill.slug
  wrapper.setAttribute('title', skill.label)
  wrapper.setAttribute('role', 'button')
  wrapper.setAttribute('tabindex', '0')
  wrapper.innerHTML   = _renderObject(catDef.object, skill.label, color, size)

  const activate = (e) => {
    e.stopPropagation()
    _onObjectClick(wrapper, entry, catDef, color)
  }
  wrapper.addEventListener('click', activate)
  wrapper.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e) }
  })

  return wrapper
}

// ─────────────────────────────────────────────────────────────
// BOOTH ACTIVATION  (step-up mechanic)
// ─────────────────────────────────────────────────────────────

function _activateBooth(boothEl) {
  if (_activeBooth === boothEl) return
  if (_activeBooth) _activeBooth.classList.remove('sg-booth--active')
  _activeBooth = boothEl
  boothEl.classList.add('sg-booth--active')
  boothEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
}

// ─────────────────────────────────────────────────────────────
// CANOPY BUILDER  (shared by all 4 booths)
// stripeA / stripeB: the two alternating stripe colours
// accentColor: used for the string of lights along the fringe
// ─────────────────────────────────────────────────────────────

function _buildCanopy(title, stripeA, stripeB, accentColor) {
  const canopy = document.createElement('div')
  canopy.className = 'sg-canopy'
  canopy.style.setProperty('--stripe-a', stripeA)
  canopy.style.setProperty('--stripe-b', stripeB)

  const titleEl = document.createElement('div')
  titleEl.className   = 'sg-booth-title'
  titleEl.textContent = title
  canopy.appendChild(titleEl)

  // Fringe light-bulbs along the bottom scallop edge
  const lights = document.createElement('div')
  lights.className = 'sg-canopy-lights'
  for (let i = 0; i < 11; i++) {
    const bulb = document.createElement('div')
    bulb.className = 'sg-canopy-bulb'
    bulb.style.background    = accentColor
    bulb.style.boxShadow     = `0 0 6px 2px ${accentColor}99`
    bulb.style.animationDelay = `${(i * 0.28).toFixed(2)}s`
    lights.appendChild(bulb)
  }
  canopy.appendChild(lights)

  return canopy
}

// ─────────────────────────────────────────────────────────────
// BOOTH 1: TIN CAN ALLEY  (hardware)
// Cans stacked into a pyramid — bottom row widest, top = 1.
// ─────────────────────────────────────────────────────────────

function _buildBoothCanAlley(entries, catDef, accentColor) {
  const booth = document.createElement('div')
  booth.className = 'sg-booth sg-booth--cans'

  booth.appendChild(_buildCanopy(
    'TIN CAN ALLEY',
    '#4e6a80', '#6a8fa8',   // steel-blue stripes
    accentColor
  ))

  const body = document.createElement('div')
  body.className = 'sg-booth-body'

  const pyramid = document.createElement('div')
  pyramid.className = 'sg-pyramid'

  const rows = _getPyramidRows(entries.length)
  let idx = 0
  rows.forEach(rowSize => {
    const row = document.createElement('div')
    row.className = 'sg-pyramid-row'
    for (let i = 0; i < rowSize; i++) {
      row.appendChild(_buildSkillObject(entries[idx], catDef, idx))
      idx++
    }
    pyramid.appendChild(row)
  })

  body.appendChild(pyramid)
  body.appendChild(_buildPlank())
  booth.appendChild(body)
  booth.addEventListener('click', () => _activateBooth(booth))
  return booth
}

// ─────────────────────────────────────────────────────────────
// BOOTH 2: MILK BOTTLE TOSS  (coding)
// Bottles clustered in two dense groups on a counter top,
// overlapping with z-index depth to look clumped like a real toss.
// ─────────────────────────────────────────────────────────────

// Pre-set absolute positions for up to 10 bottles.
// right/bottom are % of the booth body; zIndex controls layering.
const _BOTTLE_POSITIONS = [
  // left cluster (back row)
  { right: '60%', bottom: '24%', z: 1 },
  { right: '68%', bottom: '30%', z: 2 },
  { right: '52%', bottom: '28%', z: 1 },
  { right: '64%', bottom: '14%', z: 0 },
  // right cluster (back row)
  { right: '18%', bottom: '24%', z: 1 },
  { right: '26%', bottom: '30%', z: 2 },
  { right: '10%', bottom: '28%', z: 1 },
  { right: '22%', bottom: '14%', z: 0 },
  // front lone bottles
  { right: '40%', bottom: '10%', z: 3 },
  { right: '32%', bottom: '10%', z: 3 },
]

function _buildBoothBottleToss(entries, catDef, accentColor) {
  const booth = document.createElement('div')
  booth.className = 'sg-booth sg-booth--bottles'

  booth.appendChild(_buildCanopy(
    'BOTTLE TOSS',
    '#2e1f5e', '#4a30a0',   // deep indigo / purple
    accentColor
  ))

  const body = document.createElement('div')
  body.className = 'sg-booth-body sg-booth-body--bottles'

  entries.forEach((entry, i) => {
    const pos     = _BOTTLE_POSITIONS[i] ?? { right: `${5 + (i * 9) % 70}%`, bottom: '12%', z: 1 }
    const wrapper = _buildSkillObject(entry, catDef, i)
    wrapper.style.position = 'absolute'
    wrapper.style.right    = pos.right
    wrapper.style.bottom   = pos.bottom
    wrapper.style.zIndex   = pos.z
    body.appendChild(wrapper)
  })

  body.appendChild(_buildPlank())
  booth.appendChild(body)
  booth.addEventListener('click', () => _activateBooth(booth))
  return booth
}

// ─────────────────────────────────────────────────────────────
// BOOTH 3: SHOOTING GALLERY  (design + fabrication)
// Two moving tracks — ducks scroll right-to-left on track 1,
// targets scroll left-to-right (reverse) on track 2.
// Hovering pauses the animation so users can click accurately.
// ─────────────────────────────────────────────────────────────

function _buildTrack(entries, catDef, durationSecs, reverse) {
  const wrapper = document.createElement('div')
  wrapper.className = 'sg-track-wrapper'

  const label = document.createElement('div')
  label.className   = 'sg-track-label'
  label.textContent = catDef.label.toUpperCase() + (reverse ? '  ↞' : '  ↠')
  wrapper.appendChild(label)

  const track = document.createElement('div')
  track.className = 'sg-track'

  const inner = document.createElement('div')
  inner.className = 'sg-track-inner'
  inner.style.animationDuration  = `${durationSecs}s`
  inner.style.animationDirection = reverse ? 'reverse' : 'normal'

  // Duplicate items so the loop is seamless
  ;[...entries, ...entries].forEach((entry, i) => {
    inner.appendChild(_buildSkillObject(entry, catDef, i % entries.length))
  })

  track.appendChild(inner)
  wrapper.appendChild(track)
  return wrapper
}

function _buildBoothShootingGallery(designEntries, fabEntries, designDef, fabDef, accentColor) {
  const booth = document.createElement('div')
  booth.className = 'sg-booth sg-booth--gallery'

  booth.appendChild(_buildCanopy(
    'SHOOTING GALLERY',
    '#b81a24', '#e8e8e8',   // classic red / white
    accentColor
  ))

  const body = document.createElement('div')
  body.className = 'sg-booth-body sg-booth-body--gallery'

  if (designEntries.length > 0) {
    body.appendChild(_buildTrack(
      designEntries, designDef,
      Math.max(10, designEntries.length * 3.8),
      false   // left → right exit
    ))
  }

  if (fabEntries.length > 0) {
    body.appendChild(_buildTrack(
      fabEntries, fabDef,
      Math.max(10, fabEntries.length * 4.2),
      true    // right → left exit (reverse)
    ))
  }

  booth.appendChild(body)
  booth.addEventListener('click', () => _activateBooth(booth))
  return booth
}

// ─────────────────────────────────────────────────────────────
// BOOTH 4: BALLOON DARTS  (soft skills)
// Balloons pinned to a cork/wood backboard at scattered positions.
// ─────────────────────────────────────────────────────────────

// [left%, top%] pairs — up to 10 slots
const _BALLOON_POSITIONS = [
  [10,  6], [34,  3], [60,  8], [82,  4],
  [20, 46], [50, 42], [74, 50], [88, 44],
  [30, 24], [62, 22],
]

function _buildBoothBalloonDarts(entries, catDef, accentColor) {
  const booth = document.createElement('div')
  booth.className = 'sg-booth sg-booth--balloons'

  booth.appendChild(_buildCanopy(
    'BALLOON DARTS',
    '#9020b8', '#c040e0',   // magenta / purple
    accentColor
  ))

  const body = document.createElement('div')
  body.className = 'sg-booth-body'

  const wall = document.createElement('div')
  wall.className = 'sg-balloon-wall'

  entries.forEach((entry, i) => {
    const pos = _BALLOON_POSITIONS[i] ?? [
      8 + (i * 19 % 72),
      8 + (i * 23 % 48),
    ]
    const wrapper = _buildSkillObject(entry, catDef, i)
    wrapper.style.position = 'absolute'
    wrapper.style.left     = `${pos[0]}%`
    wrapper.style.top      = `${pos[1]}%`
    wall.appendChild(wrapper)
  })

  body.appendChild(wall)
  booth.appendChild(body)
  booth.addEventListener('click', () => _activateBooth(booth))
  return booth
}

// ─────────────────────────────────────────────────────────────
// SHARED PLANK BUILDER
// ─────────────────────────────────────────────────────────────

function _buildPlank() {
  const plank = document.createElement('div')
  plank.className = 'sg-plank'
  return plank
}

// ─────────────────────────────────────────────────────────────
// MAIN OVERLAY  (replaces _buildShelf / wall layout)
// ─────────────────────────────────────────────────────────────

function _buildOverlay(groupedSkills) {
  const vibe        = getVibeInfo(_cfg.getActiveVibe()) ?? {}
  const atm         = vibe.atmosphere ?? {}
  const accentColor = atm.moonColor  ?? '#a8c8ff'

  const overlay = document.createElement('div')
  overlay.className = 'sg-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Skills Gallery')

  // ── Header ──────────────────────────────────────────────
  const header = document.createElement('div')
  header.className = 'sg-header'

  const title = document.createElement('h2')
  title.className   = 'sg-title'
  title.textContent = '— SKILL GALLERY —'
  title.style.color = accentColor

  const subtitle = document.createElement('p')
  subtitle.className   = 'sg-subtitle'
  subtitle.textContent = 'step up to a booth · click any target to learn more'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'sg-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.setAttribute('aria-label', 'Close skills gallery')
  closeBtn.addEventListener('click', _closeOverlay)

  // Legend — small icon + category name row
  const legend = document.createElement('div')
  legend.className = 'sg-legend'
  for (const catKey of CAT_ORDER) {
    if (!groupedSkills.has(catKey)) continue
    const catDef = SKILL_CATEGORIES[catKey]
    if (!catDef) continue
    const item = document.createElement('div')
    item.className = 'sg-legend-item'
    const icon = document.createElement('span')
    icon.className = 'sg-legend-icon'
    icon.innerHTML = _renderObject(catDef.object, '·', catDef.colors[0], 24)
    const lbl = document.createElement('span')
    lbl.className   = 'sg-legend-label'
    lbl.textContent = catDef.label
    item.appendChild(icon)
    item.appendChild(lbl)
    legend.appendChild(item)
  }

  header.appendChild(title)
  header.appendChild(subtitle)
  header.appendChild(legend)
  header.appendChild(closeBtn)
  overlay.appendChild(header)

  // ── Boardwalk ────────────────────────────────────────────
  const boardwalk = document.createElement('div')
  boardwalk.className = 'sg-boardwalk'

  const design = groupedSkills.get('design')      ?? []
  const fab    = groupedSkills.get('fabrication')  ?? []

  if (groupedSkills.has('hardware')) {
    boardwalk.appendChild(_buildBoothCanAlley(
      groupedSkills.get('hardware'),
      SKILL_CATEGORIES.hardware,
      accentColor
    ))
  }

  if (groupedSkills.has('coding')) {
    boardwalk.appendChild(_buildBoothBottleToss(
      groupedSkills.get('coding'),
      SKILL_CATEGORIES.coding,
      accentColor
    ))
  }

  if (design.length > 0 || fab.length > 0) {
    boardwalk.appendChild(_buildBoothShootingGallery(
      design, fab,
      SKILL_CATEGORIES.design,
      SKILL_CATEGORIES.fabrication,
      accentColor
    ))
  }

  if (groupedSkills.has('soft')) {
    boardwalk.appendChild(_buildBoothBalloonDarts(
      groupedSkills.get('soft'),
      SKILL_CATEGORIES.soft,
      accentColor
    ))
  }

  overlay.appendChild(boardwalk)

  // ── Detail panel ────────────────────────────────────────
  const detail = document.createElement('div')
  detail.className = 'sg-detail'
  detail.id        = 'sg-detail'
  overlay.appendChild(detail)

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeOverlay() })
  document.addEventListener('keydown', _handleKeyDown)

  _overlay = overlay

  // Step up the first booth by default
  requestAnimationFrame(() => {
    const first = boardwalk.querySelector('.sg-booth')
    if (first) _activateBooth(first)
  })

  return overlay
}

// ─────────────────────────────────────────────────────────────
// INTERACTION
// ─────────────────────────────────────────────────────────────

function _onObjectClick(wrapper, entry, catDef, color) {
  // Also activate the parent booth
  const booth = wrapper.closest('.sg-booth')
  if (booth) _activateBooth(booth)

  const slug = entry.skill.slug

  // Clicking the already-open skill closes it
  if (_activeCard?.slug === slug) {
    _clearActiveCard()
    return
  }

  _clearActiveCard()

  // Animate the object based on its type
  const type = catDef.object
  wrapper.classList.add('sg-obj--hit')
  if      (type === 'balloon') wrapper.classList.add('sg-obj--pop')
  else if (type === 'target')  wrapper.classList.add('sg-obj--bullseye')
  else if (type === 'duck')    wrapper.classList.add('sg-obj--tip')
  else                         wrapper.classList.add('sg-obj--knock')

  // Show detail panel
  const detail = document.getElementById('sg-detail')
  if (detail) {
    detail.innerHTML = ''
    detail.appendChild(_buildDetailCard(entry.skill, entry.projects, catDef, color))
    detail.classList.add('sg-detail--open')
  }

  _activeCard = { slug, wrapper }
}

function _clearActiveCard() {
  if (_activeCard) {
    _activeCard.wrapper.classList.remove(
      'sg-obj--hit', 'sg-obj--knock', 'sg-obj--tip',
      'sg-obj--pop', 'sg-obj--bullseye'
    )
    _activeCard = null
  }
  const detail = document.getElementById('sg-detail')
  if (detail) detail.classList.remove('sg-detail--open')
}

function _buildDetailCard(skill, projects, catDef, color) {
  const card = document.createElement('div')
  card.className = 'sg-card'

  // Colour accent bar
  const bar = document.createElement('div')
  bar.className        = 'sg-card-bar'
  bar.style.background = color

  // Name + category badge
  const nameRow = document.createElement('div')
  nameRow.className = 'sg-card-name-row'

  const name = document.createElement('h3')
  name.className   = 'sg-card-name'
  name.textContent = skill.label

  const badge = document.createElement('span')
  badge.className       = 'sg-card-badge'
  badge.textContent     = catDef.label
  badge.style.background  = color + '22'
  badge.style.color       = _lighten(color, 20)
  badge.style.borderColor = color + '44'

  nameRow.appendChild(name)
  nameRow.appendChild(badge)

  // Level pips
  const levelRow = document.createElement('div')
  levelRow.className = 'sg-card-level'

  const levelLabel = document.createElement('span')
  levelLabel.className   = 'sg-card-level-label'
  levelLabel.textContent = 'PROFICIENCY'

  const pips = document.createElement('div')
  pips.className = 'sg-card-pips'
  for (let i = 1; i <= 5; i++) {
    const pip = document.createElement('div')
    pip.className = 'sg-pip' + (i <= (skill.level ?? 1) ? ' sg-pip--on' : '')
    pip.style.setProperty('--pip-color', color)
    pips.appendChild(pip)
  }

  const levelWords = ['Beginner', 'Familiar', 'Proficient', 'Experienced', 'Expert']
  const levelWord  = document.createElement('span')
  levelWord.className   = 'sg-card-level-word'
  levelWord.textContent = levelWords[(skill.level ?? 1) - 1] ?? ''
  levelWord.style.color = color

  levelRow.appendChild(levelLabel)
  levelRow.appendChild(pips)
  levelRow.appendChild(levelWord)

  card.appendChild(bar)
  card.appendChild(nameRow)
  card.appendChild(levelRow)

  if (projects.length) {
    const projSection = document.createElement('div')
    projSection.className = 'sg-card-projects'

    const projLabel = document.createElement('div')
    projLabel.className   = 'sg-card-proj-label'
    projLabel.textContent = 'USED IN'
    projSection.appendChild(projLabel)

    const list = document.createElement('ul')
    list.className = 'sg-card-proj-list'
    for (const p of projects) {
      const li = document.createElement('li')
      li.className   = 'sg-card-proj-item'
      li.textContent = p.itemLabel || p.cabinLabel
      list.appendChild(li)
    }
    projSection.appendChild(list)
    card.appendChild(projSection)
  }

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.className = 'sg-card-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.setAttribute('aria-label', 'Close detail')
  closeBtn.addEventListener('click', e => { e.stopPropagation(); _clearActiveCard() })
  card.appendChild(closeBtn)

  return card
}

// ─────────────────────────────────────────────────────────────
// OVERLAY LIFECYCLE
// ─────────────────────────────────────────────────────────────

function _handleKeyDown(e) {
  if (!_overlay) return
  if (e.key === 'Escape') {
    if (_activeCard) _clearActiveCard()
    else _closeOverlay()
  }
}

function _closeOverlay() {
  if (!_overlay) return
  _overlay.classList.remove('sg-visible')
  setTimeout(() => {
    document.removeEventListener('keydown', _handleKeyDown)
    if (_overlay?.parentNode) _overlay.parentNode.removeChild(_overlay)
    _overlay     = null
    _activeCard  = null
    _activeBooth = null
  }, 300)
}

// ─────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────

const _CSS = /* css */`

@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

/* ══ Overlay ══════════════════════════════════════════════════ */
.sg-overlay {
  position: fixed;
  inset: 0;
  z-index: 9100;
  background: rgba(5, 2, 12, 0.94);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.28s ease;
  font-family: 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
}
.sg-overlay.sg-visible { opacity: 1; }

/* ══ Header ════════════════════════════════════════════════════ */
.sg-header {
  flex-shrink: 0;
  padding: 16px 24px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative;
}
.sg-title {
  margin: 0 0 2px;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 0.22em;
}
.sg-subtitle {
  margin: 0 0 10px;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: rgba(255,255,255,0.26);
  text-transform: uppercase;
}
.sg-close {
  position: absolute;
  top: 16px; right: 20px;
  width: 30px; height: 30px;
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.14);
  border-radius: 50%;
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
  z-index: 10;
}
.sg-close:hover { background: rgba(255,255,255,0.10); color: #fff; }

/* ══ Legend ════════════════════════════════════════════════════ */
.sg-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  align-items: center;
}
.sg-legend-item {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.sg-legend-icon {
  display: flex;
  align-items: flex-end;
  height: 26px;
}
.sg-legend-icon svg { display: block; }
.sg-legend-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgba(255,255,255,0.38);
  padding-bottom: 2px;
}

/* ══ Boardwalk ═════════════════════════════════════════════════
   Horizontal scroll container. Each booth is a snap target.
   Background mimics weathered wooden planks.
══════════════════════════════════════════════════════════════ */
.sg-boardwalk {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 28px 48px 28px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;

  /* Wooden plank texture */
  background:
    repeating-linear-gradient(
      90deg,
      transparent        0px,
      transparent        58px,
      rgba(0,0,0,0.09)   58px,
      rgba(0,0,0,0.09)   60px
    ),
    repeating-linear-gradient(
      0deg,
      transparent        0px,
      transparent        28px,
      rgba(255,255,255,0.015) 28px,
      rgba(255,255,255,0.015) 29px
    ),
    linear-gradient(180deg, #100a04 0%, #0a0602 100%);
}
.sg-boardwalk::-webkit-scrollbar       { height: 4px; }
.sg-boardwalk::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

/* ══ Booth wrapper ═════════════════════════════════════════════
   Booths dim + shrink slightly when not active ("stepped-up").
   Clicking any booth snaps it to centre and brings it forward.
══════════════════════════════════════════════════════════════ */
.sg-booth {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  scroll-snap-align: center;
  border-radius: 4px 4px 2px 2px;
  overflow: visible;
  position: relative;
  cursor: pointer;
  /* Dim until active */
  filter: brightness(0.55) saturate(0.6);
  transform: translateY(0px);
  transition:
    transform  0.42s cubic-bezier(0.22, 1, 0.36, 1),
    filter     0.42s ease;
}
.sg-booth--active {
  filter: brightness(1) saturate(1);
  transform: scaleY(1.025) translateY(-6px);
  transform-origin: bottom center;
  cursor: default;
  z-index: 2;
}

/* Booth widths */
.sg-booth--cans     { width: 380px; }
.sg-booth--bottles  { width: 340px; }
.sg-booth--gallery  { width: 460px; }
.sg-booth--balloons { width: 320px; }

/* ══ Canopy ════════════════════════════════════════════════════
   Striped awning with a scalloped/zigzag bottom edge and a
   row of mini light-bulbs sitting along the fringe.
══════════════════════════════════════════════════════════════ */
.sg-canopy {
  flex-shrink: 0;
  height: 76px;
  position: relative;
  background: repeating-linear-gradient(
    90deg,
    var(--stripe-a) 0px,  var(--stripe-a) 22px,
    var(--stripe-b) 22px, var(--stripe-b) 44px
  );
  /* Scalloped bottom — 11 triangular points */
  clip-path: polygon(
    0% 0%, 100% 0%, 100% 65%,
    95.5% 100%, 91%  65%,
    86.5% 100%, 82%  65%,
    77.5% 100%, 73%  65%,
    68.5% 100%, 64%  65%,
    59.5% 100%, 55%  65%,
    50.5% 100%, 46%  65%,
    41.5% 100%, 37%  65%,
    32.5% 100%, 28%  65%,
    23.5% 100%, 19%  65%,
    14.5% 100%, 10%  65%,
    5.5%  100%, 0%   65%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(0,0,0,0.7);
}
.sg-booth-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.20em;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 6px rgba(0,0,0,0.8);
  text-align: center;
  padding: 0 12px;
  margin-bottom: 20px;   /* offset up from scallop clipping */
  position: relative;
  z-index: 1;
  pointer-events: none;
}

/* Fringe bulbs — sit at the scallop tips */
.sg-canopy-lights {
  position: absolute;
  bottom: 5px;
  left: 0; right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0 4px;
  pointer-events: none;
}
.sg-canopy-bulb {
  width: 7px; height: 9px;
  border-radius: 50% 50% 50% 50% / 58% 58% 42% 42%;
  animation: sg-bulb-flicker 3.5s ease-in-out infinite alternate;
}
@keyframes sg-bulb-flicker {
  0%,  80%  { opacity: 1; }
  84%        { opacity: 0.25; }
  87%        { opacity: 0.95; }
  93%        { opacity: 0.5; }
  100%       { opacity: 1; }
}

/* ══ Booth body ════════════════════════════════════════════════ */
.sg-booth-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(6, 3, 14, 0.94);
  border: 1px solid rgba(255,255,255,0.07);
  border-top: 3px solid rgba(255,255,255,0.09);
  position: relative;
  overflow: hidden;
}

/* ══ Shared plank ══════════════════════════════════════════════ */
.sg-plank {
  height: 18px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #7a5030 0%, #5a3820 45%, #3e2410 100%);
  border-top: 2.5px solid #9a7050;
  box-shadow: 0 6px 18px rgba(0,0,0,0.65);
  position: relative;
  overflow: hidden;
}
.sg-plank::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0px, transparent 64px,
    rgba(255,255,255,0.03) 64px, rgba(255,255,255,0.03) 65px
  );
}

/* ══ BOOTH 1: TIN CAN ALLEY — pyramid layout ══════════════════ */
.sg-pyramid {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;   /* push rows to bottom */
  gap: 5px;
  padding: 20px 16px 6px;
}
.sg-pyramid-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: flex-end;
}

/* ══ BOOTH 2: BOTTLE TOSS — absolute cluster layout ═══════════ */
.sg-booth-body--bottles {
  position: relative;
  background:
    linear-gradient(0deg, rgba(20,10,4,1) 0%, rgba(10,5,18,0.94) 100%);
}

/* ══ BOOTH 3: SHOOTING GALLERY — moving tracks ════════════════ */
.sg-booth-body--gallery {
  background: linear-gradient(180deg, #0c0618 0%, #080314 100%);
  gap: 0;
}

.sg-track-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-bottom: 3px solid #3a2408;
  overflow: hidden;
  position: relative;
}
.sg-track-wrapper:last-child { border-bottom: none; }

.sg-track-label {
  flex-shrink: 0;
  font-size: 8px;
  letter-spacing: 0.20em;
  font-weight: 600;
  color: rgba(255,255,255,0.18);
  padding: 5px 12px 0;
  text-transform: uppercase;
  pointer-events: none;
}

.sg-track {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: flex-end;
  cursor: crosshair;
  background: linear-gradient(0deg, rgba(30,55,90,0.12) 0%, transparent 35%);
}

/* Hover pauses the animation so clicking is accurate */
.sg-track:hover .sg-track-inner,
.sg-track:focus-within .sg-track-inner {
  animation-play-state: paused;
}

.sg-track-inner {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 0 20px 8px;
  width: max-content;
  animation: sg-track-scroll linear infinite;
  will-change: transform;
}

@keyframes sg-track-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* ══ BOOTH 4: BALLOON DARTS — cork backboard ══════════════════ */
.sg-balloon-wall {
  flex: 1;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 18% 28%, rgba(90,40,12,0.4) 0%, transparent 52%),
    radial-gradient(ellipse at 78% 68%, rgba(60,18,50,0.28) 0%, transparent 48%),
    linear-gradient(155deg, #422510 0%, #2c1608 50%, #1e0e04 100%);
  border-top: 3px solid #5e3214;
}
/* Cork dot texture */
.sg-balloon-wall::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(200,155,80,0.07) 1px, transparent 1px);
  background-size: 18px 18px;
  pointer-events: none;
}

/* ══ Skill objects ══════════════════════════════════════════════ */
.sg-obj-wrapper {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: bottom center;
  outline: none;
  transition: transform 0.16s ease, filter 0.16s ease;
  will-change: transform;
  flex-shrink: 0;
}
.sg-obj-wrapper:hover {
  transform: scale(1.13) translateY(-6px);
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.55));
}
.sg-obj-wrapper:focus-visible {
  filter: drop-shadow(0 0 6px rgba(255,255,255,0.5));
}
.sg-obj-wrapper svg { display: block; }

/* ══ Hit animations ════════════════════════════════════════════ */

/* Can: tips and falls sideways */
.sg-obj--knock {
  animation: sg-knock 0.48s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
}
@keyframes sg-knock {
  0%   { transform: rotate(0deg)   translateX(0);                       }
  25%  { transform: rotate(-10deg) translateX(-3px);                    }
  100% { transform: rotate(-88deg) translateX(-26px) translateY(10px);  }
}

/* Bottle + duck: tip to the side */
.sg-obj--tip {
  animation: sg-tip 0.40s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
}
@keyframes sg-tip {
  0%   { transform: rotate(0deg);                                }
  20%  { transform: rotate(14deg);                               }
  100% { transform: rotate(-72deg) translateX(-14px) translateY(5px); }
}

/* Target: bullseye flash — rings of light radiate from impact */
.sg-obj--bullseye {
  animation: sg-bullseye 0.52s ease-out forwards !important;
}
@keyframes sg-bullseye {
  0%   { transform: scale(1)    rotate(0deg);   filter: brightness(1);           }
  14%  { transform: scale(1.28) rotate(-7deg);  filter: brightness(2.8) saturate(2); }
  32%  { transform: scale(0.88) rotate(4deg);   filter: brightness(1.5);         }
  55%  { transform: scale(1.10) rotate(-2deg);  filter: brightness(1.9);         }
  100% { transform: scale(1)    rotate(0deg);   filter: brightness(1);           }
}

/* Balloon: expand → burst → disappear */
.sg-obj--pop {
  animation: sg-balloon-pop 0.46s ease-out forwards !important;
  pointer-events: none;
}
@keyframes sg-balloon-pop {
  0%   { transform: scale(1)    rotate(0deg);    opacity: 1;   filter: brightness(1);   }
  22%  { transform: scale(1.38) rotate(-4deg);   opacity: 1;   filter: brightness(1.55);}
  44%  { transform: scale(1.12) rotate(7deg);    opacity: 0.75;                         }
  65%  { transform: scale(0.22) rotate(-12deg);  opacity: 0.45;filter: brightness(2);  }
  100% { transform: scale(0)    rotate(18deg);   opacity: 0;                            }
}

/* ══ Detail panel ══════════════════════════════════════════════ */
.sg-detail {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 9200;
  background: rgba(7, 3, 16, 0.97);
  border-top: 1px solid rgba(255,255,255,0.08);
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  padding: 18px 28px 24px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  max-height: 38vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.10) transparent;
}
.sg-detail--open { transform: translateY(0); }
.sg-detail::-webkit-scrollbar       { width: 4px; }
.sg-detail::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }

/* ══ Detail card ══════════════════════════════════════════════ */
.sg-card {
  position: relative;
  max-width: 680px;
}
.sg-card-bar {
  width: 54px; height: 3px;
  border-radius: 2px;
  margin-bottom: 14px;
}
.sg-card-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.sg-card-name {
  margin: 0;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 23px;
  font-weight: 400;
  color: #fff;
  letter-spacing: -0.01em;
}
.sg-card-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid;
}
.sg-card-level {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.sg-card-level-label {
  font-size: 9px;
  letter-spacing: 0.16em;
  color: rgba(255,255,255,0.28);
  font-weight: 600;
  text-transform: uppercase;
}
.sg-card-pips  { display: flex; gap: 5px; }
.sg-pip {
  width: 11px; height: 11px;
  border-radius: 50%;
  background: rgba(255,255,255,0.10);
  transition: background 0.2s;
}
.sg-pip--on { background: var(--pip-color); }
.sg-card-level-word {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sg-card-proj-label {
  font-size: 9px;
  letter-spacing: 0.16em;
  color: rgba(255,255,255,0.28);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.sg-card-proj-list {
  margin: 0; padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sg-card-proj-item {
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 3px 11px;
  border-radius: 4px;
  line-height: 1.4;
}
.sg-card-close {
  position: absolute;
  top: 0; right: 0;
  width: 28px; height: 28px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 50%;
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.sg-card-close:hover { background: rgba(255,255,255,0.08); }

`

// ─────────────────────────────────────────────────────────────
// STYLE INJECTION
// ─────────────────────────────────────────────────────────────

function _injectStyles() {
  if (document.getElementById('sg-styles')) return
  const el = document.createElement('style')
  el.id = 'sg-styles'
  el.textContent = _CSS
  document.head.appendChild(el)
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Call once from main.js after config is ready.
 * @param {{ CABINS: object[], SKILLS: object, getActiveVibe: () => string }} opts
 */
export function initSkillsGallery({ CABINS, SKILLS, getActiveVibe } = {}) {
  if (CABINS)        _cfg.CABINS        = CABINS
  if (SKILLS)        _cfg.SKILLS        = SKILLS
  if (getActiveVibe) _cfg.getActiveVibe = getActiveVibe
  _injectStyles()
}

/**
 * Open the gallery. Rebuilds from current vibe + config every call.
 */
export function openSkillsGallery() {
  if (_overlay) _closeOverlay()

  const skillMap = _aggregateSkills()
  const grouped  = _groupByCategory(skillMap)

  if (grouped.size === 0) {
    console.warn('[SkillsGallery] No skills found. Add  skills: [...]  arrays to your CABIN items in config.js')
    return
  }

  const overlay = _buildOverlay(grouped)
  document.body.appendChild(overlay)
  requestAnimationFrame(() => overlay.classList.add('sg-visible'))
}