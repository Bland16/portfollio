// ═══════════════════════════════════════════════════════════
// autoExplore.js — Auto-explore camera mode for cabin interiors
//
// USAGE (from main.js):
//   import { AutoExplore } from './autoExplore.js'
//   const autoExplore = new AutoExplore({ camera })
//
//   // After cabin transition completes:
//   autoExplore.onCabinEnter()
//
//   // When exiting the cabin:
//   autoExplore.onCabinExit()
//
//   // When a side panel opens / closes (freeze during panel):
//   autoExplore.setPanelOpen(true | false)
//
//   // Every frame — call AFTER cameraController.update() so
//   // auto-explore overwrites any controller rotation:
//   autoExplore.update(delta)
//
//   // True while auto-explore is driving the camera (MINI_PAN or AUTO).
//   // Use to suppress your own keypress side-effects if needed:
//   autoExplore.isConsumingInput()
// ═══════════════════════════════════════════════════════════

// ── TUNABLE CONSTANTS ──────────────────────────────────────
// Tweak these without touching any logic below.

export const AUTO_EXPLORE_TILT        = 0.5   // radians — pitch down amount  (↑ more, ↓ less)
export const AUTO_EXPLORE_YAW_SPEED   = 0.50   // radians/sec — full auto sweep speed
export const AUTO_EXPLORE_YAW_RANGE   = 1.70   // radians — half-width of full auto sweep arc
export const AUTO_EXPLORE_MINI_RANGE  = 1.70   // radians — half-width of intro mini-pan
export const AUTO_EXPLORE_MINI_SPEED  = 0.35   // radians/sec — intro mini-pan speed
export const AUTO_EXPLORE_BEAT_DELAY  = 2.4    // seconds after cabin entry before intro starts
export const AUTO_EXPLORE_HINT_CYCLES = 3      // full loops before hint re-appears in auto mode

// Internal feel constants
const TILT_LERP  = 2.0   // pitch settle speed (higher = snappier)
const YAW_LERP   = 2.0   // yaw settle speed (only used on exit to manual)

// ── STATE MACHINE ──────────────────────────────────────────
const S = {
  IDLE:     'IDLE',      // Not in a cabin
  WAITING:  'WAITING',   // Entered cabin, counting beat delay
  MINI_PAN: 'MINI_PAN',  // Intro tilt + gentle pan, hint visible
  AUTO:     'AUTO',      // Full auto-explore running (A pressed)
  MANUAL:   'MANUAL',    // User took control — hands off camera
}

export class AutoExplore {

  constructor({ camera, cameraController }) {
    this._camera             = camera
    this._cameraController   = cameraController
    this._inspectSystem      = null
    this._state              = S.IDLE
    // Beat delay timer
    this._waitTimer = 0

    // Absolute yaw/pitch in controller space (starts at 0 each cabin entry)
    this._aeYaw   = 0
    this._aePitch = 0

    // Sin-wave oscillator state
    this._panPhase  = 0

    // Loop counter for hint recycle
    this._loopCount        = 0
    this._lastHintLoop     = 0

    // DOM
    this._hintEl    = null

    // Bound handlers for clean removal
    this._onKeyDown = this._onKeyDown.bind(this)
  }

  // ── PUBLIC API ─────────────────────────────────────────────

  /**
   * Call once the cabin entry camera transition has completed.
   * Captures current camera orientation as the base.
   */
  onCabinEnter() {
    this._aeYaw     = 0
    this._aePitch   = 0
    this._waitTimer = 0
    this._panPhase    = 0
    this._loopCount   = 0
    this._lastHintLoop = 0
    this._addListeners()
    this._buildHint()      // Build now, show after beat delay
    this._setState(S.WAITING)
  }

  /**
   * Call as soon as the cabin exit flow begins.
   */
  onCabinExit() {
    if (this._state === S.MINI_PAN || this._state === S.AUTO) this._cameraController.clearAutoExploreLook()
    this._setState(S.IDLE)
    this._removeHint()
    this._removeListeners()
  }

  /**
   * Wire up the InspectSystem so auto-explore can freeze while
   * an object panel is open. Call once after both are instantiated.
   * @param {InspectSystem} sys
   */
  setInspectSystem(sys) {
    this._inspectSystem = sys
  }

  /**
   * True while auto-explore is driving the camera (MINI_PAN or AUTO).
   * Arrow key presses during this time exit auto-explore rather than
   * doing nothing — they are still consumed by the camera controller
   * after this module relinquishes control.
   */
  isConsumingInput() {
    return this._state === S.MINI_PAN || this._state === S.AUTO
  }

  /**
   * Call every frame from the animation loop, AFTER cameraController.update(),
   * so auto-explore rotation wins when active.
   * @param {number} delta — seconds since last frame
   */
  update(delta) {
    if (this._state === S.IDLE || this._state === S.MANUAL) return

    // Frozen while an object panel is open
    if (this._inspectSystem?.isActive) return

    switch (this._state) {
      case S.WAITING:  this._tickWaiting(delta);  break
      case S.MINI_PAN: this._tickMiniPan(delta);  break
      case S.AUTO:     this._tickAuto(delta);      break
    }


  }

  // ── STATE TICKS ────────────────────────────────────────────

  _tickWaiting(delta) {
    this._waitTimer += delta
    if (this._waitTimer >= AUTO_EXPLORE_BEAT_DELAY) {
      this._setState(S.MINI_PAN)
      this._showHint()
    }
  }

  _tickMiniPan(delta) {
    // Ease pitch down toward tilt target
    this._aePitch += (-AUTO_EXPLORE_TILT - this._aePitch) * Math.min(1, TILT_LERP * delta)

    // Gentle sin-wave yaw
    this._panPhase += AUTO_EXPLORE_MINI_SPEED * delta
    this._aeYaw     = Math.sin(this._panPhase) * AUTO_EXPLORE_MINI_RANGE

    this._cameraController.setAutoExploreLook(this._aeYaw, this._aePitch)
  }

  _tickAuto(delta) {
    // Keep pitch locked at tilt
    this._aePitch += (-AUTO_EXPLORE_TILT - this._aePitch) * Math.min(1, TILT_LERP * delta)

    // Full-width sin-wave sweep
    this._panPhase += AUTO_EXPLORE_YAW_SPEED * delta
    this._aeYaw     = Math.sin(this._panPhase) * AUTO_EXPLORE_YAW_RANGE

    this._cameraController.setAutoExploreLook(this._aeYaw, this._aePitch)

    // Count completed full cycles (2π per cycle) and recycle hint
    this._loopCount = Math.floor(this._panPhase / (2 * Math.PI))
    if (
      this._loopCount > 0 &&
      this._loopCount % AUTO_EXPLORE_HINT_CYCLES === 0 &&
      this._loopCount !== this._lastHintLoop
    ) {
      this._lastHintLoop = this._loopCount
      this._showHint()
      // Auto-hide hint again after 4 seconds
      setTimeout(() => this._hideHint(), 4000)
    }
  }

  // ── TRANSITIONS ────────────────────────────────────────────

  _setState(s) {
    this._state = s
  }

  /**
   * Hand control back to the camera controller.
   * Does NOT reset pitch/yaw — controller takes over from
   * wherever the camera currently is.
   */
  _exitToManual() {
    // Bake current AE yaw/pitch into the controller so manual
    // look continues from the exact same angle — no jump.
    this._cameraController.clearAutoExploreLook()
    this._setState(S.MANUAL)
    this._hideHint()
  }

  // ── KEYBOARD HANDLER ───────────────────────────────────────

  _onKeyDown(e) {
    // Never change state while an object panel is open
    if (this._inspectSystem?.isActive) return

    switch (e.key) {
      case 'a':
      case 'A':
        // A toggles auto-explore on / off
        if (this._state === S.AUTO) {
          this._exitToManual()
        } else if (this._state === S.MINI_PAN || this._state === S.WAITING) {
          // Jump straight into full auto
          this._panPhase    = 0
          this._loopCount   = 0
          this._lastHintLoop = 0
          this._setState(S.AUTO)
          this._hideHint()
        }
        break

      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Escape':
        // Arrow keys / Escape exit auto-explore and return control
        if (this._state !== S.MANUAL && this._state !== S.IDLE) {
          this._exitToManual()
          // Note: we do NOT call e.stopPropagation() — the camera
          // controller's own keydown handler should still receive
          // this event so it can act on the arrow key immediately.
        }
        break
    }
  }

  _addListeners() {
    window.addEventListener('keydown', this._onKeyDown)
  }

  _removeListeners() {
    window.removeEventListener('keydown', this._onKeyDown)
  }

  // ── HINT UI ────────────────────────────────────────────────

  _buildHint() {
    if (this._hintEl) return

    // Inject shared styles once
    if (!document.getElementById('ae-styles')) {
      const style = document.createElement('style')
      style.id = 'ae-styles'
      style.textContent = `
        #ae-hint {
          font-family: 'DM Sans', system-ui, sans-serif;
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%) translateY(14px);
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 13px 22px;
          background: rgba(8, 4, 20, 0.52);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 14px;
          opacity: 0;
          transition: opacity 0.45s ease, transform 0.45s ease;
          pointer-events: none;
          z-index: 9000;
          user-select: none;
        }
        #ae-hint.ae-visible {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .ae-keys-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .ae-key-row {
          display: flex;
          gap: 3px;
        }
        .ae-key {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.20);
          border-bottom: 2px solid rgba(0,0,0,0.40);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: rgba(255,255,255,0.70);
        }
        .ae-divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.10);
          flex-shrink: 0;
        }
        .ae-auto-group {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .ae-badge {
          width: 27px;
          height: 27px;
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.22);
          border-bottom: 2px solid rgba(0,0,0,0.40);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.80);
          flex-shrink: 0;
        }
        .ae-label {
          font-size: 11.5px;
          letter-spacing: 0.05em;
          color: rgba(255,255,255,0.48);
          white-space: nowrap;
        }
      `
      document.head.appendChild(style)
    }

    const el = document.createElement('div')
    el.id = 'ae-hint'
    el.innerHTML = `
      <div class="ae-keys-group">
        <div class="ae-key-row">
          <div class="ae-key">▲</div>
        </div>
        <div class="ae-key-row">
          <div class="ae-key">◀</div>
          <div class="ae-key">▼</div>
          <div class="ae-key">▶</div>
        </div>
      </div>
      <div class="ae-divider"></div>
      <div class="ae-auto-group">
        <div class="ae-badge">A</div>
        <span class="ae-label">Auto-explore</span>
      </div>
    `

    document.body.appendChild(el)
    this._hintEl = el
  }

  _showHint() {
    if (!this._hintEl) this._buildHint()
    // rAF ensures the element is in the DOM before class is added
    requestAnimationFrame(() => {
      this._hintEl?.classList.add('ae-visible')
    })
  }

  _hideHint() {
    this._hintEl?.classList.remove('ae-visible')
  }

  _removeHint() {
    this._hideHint()
    // Wait for fade-out transition before removing from DOM
    setTimeout(() => {
      this._hintEl?.remove()
      this._hintEl = null
    }, 500)
  }
}