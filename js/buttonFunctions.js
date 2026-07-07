// ═══════════════════════════════════════════════════════════
// buttonFunctions.js — Delegated button click handlers
//
// handleVibeCycle is fully wired to vibes.js.
// All others receive their logic via initButtonCallbacks(),
// called once from buttons.js during initButtons().
// ═══════════════════════════════════════════════════════════

import {
  triggerVibeTransition,
  getActiveVibe,
  VIBE_KEYS,
  isTransitioning
} from './vibes.js'

// NOTE: guestbook.js is intentionally left in the tree but no longer
// wired to any button. To bring it back, re-import openGuestbook here
// and call it from a handler (see git history for the old wiring).
import { toggleMusic, setMusicVibe } from './music.js'


// ─────────────────────────────────────────────────────────────
// CALLBACK REGISTRY
// Populated by initButtonCallbacks() which buttons.js calls
// at the start of initButtons() after receiving the options.
// ─────────────────────────────────────────────────────────────

let _cb = {
  onRobotNav:      null,   // () => void
  onSkillsOpen:    null,   // () => void  ← Skills Gallery overlay
  onPortfolioOpen: null,   // () => void
  onVibeChange:    null,
}

/**
 * Wire up the stub handlers.
 * Called once by buttons.js with the options forwarded from main.js.
 *
 * @param {{
 *   onRobotNav?:      Function,
 *   onSkillsOpen?:    Function,
 *   onPortfolioOpen?: Function,
 *   onVibeChange?:    Function,
 * }} callbacks
 */
export function initButtonCallbacks({ onRobotNav, onPortfolioOpen, onVibeChange } = {}) {
  if (onRobotNav)      _cb.onRobotNav      = onRobotNav
  if (onPortfolioOpen) _cb.onPortfolioOpen = onPortfolioOpen
  if (onVibeChange)    _cb.onVibeChange    = onVibeChange
}


// ─────────────────────────────────────────────────────────────
// ROBOT
// ─────────────────────────────────────────────────────────────

export function handleRobotClick() {
  console.log('[buttons] Robot clicked')
  if (_cb.onRobotNav) {
    _cb.onRobotNav()
  } else {
    console.warn('[buttons] handleRobotClick: no onRobotNav callback registered')
  }
}


// ─────────────────────────────────────────────────────────────
// MUSIC TOGGLE — WIRED
// This slot previously opened the guestbook. It now toggles the
// generative background music (music.js). The button's icon/tooltip
// are updated here to reflect on/off state.
// ─────────────────────────────────────────────────────────────

export async function handleMusicToggle() {
  const on  = await toggleMusic()
  const btn = document.getElementById('html-btn-music')
  if (btn) {
    btn.textContent = on ? '🎵' : '🔇'
    btn.setAttribute('data-tooltip', on ? 'Mute music' : 'Play music')
  }
}

// Back-compat alias — buttons_LEGACY.js (dead/reference) imports this name.
export { handleMusicToggle as handleSkillsClick }


// ─────────────────────────────────────────────────────────────
// VIBE CYCLE — WIRED
// buttons.js swaps the keycap GLB preview before this fires.
// This advances the vibe index and triggers the full transition.
// ─────────────────────────────────────────────────────────────

export function handleVibeCycle() {
  if (isTransitioning()) return false   // ← bail, signal keycap not to advance
  const current = getActiveVibe()
  const idx     = VIBE_KEYS.indexOf(current)
  const next    = VIBE_KEYS[(idx + 1) % VIBE_KEYS.length]
  triggerVibeTransition(next)
  setMusicVibe(next)              // re-tune background music to the new vibe (no-op if music is off)
  _cb.onVibeChange?.(next)
  return true
}


// ─────────────────────────────────────────────────────────────
// PORTFOLIO SHEET
// Delegates to the PortfolioSheet overlay (initButtonCallbacks
// must have been called with { onPortfolioOpen } from main.js).
// ─────────────────────────────────────────────────────────────

export function handlePDFClick() {
  console.log('[buttons] Portfolio button clicked')
  if (_cb.onPortfolioOpen) {
    _cb.onPortfolioOpen()
  } else {
    console.warn('[buttons] handlePDFClick: no onPortfolioOpen callback registered')
  }
}