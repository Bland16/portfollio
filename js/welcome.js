// ═══════════════════════════════════════════════════════════
// welcome.js — Clockwork robot rig, animations, and welcome
//              sequence. Runs inside the main Ferris Wheel
//              scene — no separate renderer or GLB load.
//
// Usage in main.js:
//   import { ClockworkRig, ClockworkAnimations, showWelcome } from './welcome.js'
//
//   // Create persistent rig + anim ONCE after robot.glb loads:
//   const rig  = new ClockworkRig(robotGLTF.scene)
//   const anim = new ClockworkAnimations(rig)
//
//   // Pass them in — showWelcome will use them but NOT drive them.
//   // Your main animation loop must call anim.update(delta) every frame.
//   showWelcome({
//     name:         'Sarah',
//     mainCamera:   camera,
//     mainRenderer: renderer,
//     robotScene:   robotGLTF.scene,
//     rig,          // ← optional: reuse instead of creating new
//     anim,         // ← optional: reuse instead of creating new
//     onDismiss:    () => { ... }
//   })
//
// TICKET BOOK CAMERA (booth front):
//   TICKET_BOOK_POS uses the booth world position with Z offset added.
//   Update BOOTH_WORLD_POS to match your boothGLTF.scene.position.
//   Only TICKET_BOOK_Z_OFFSET needs tweaking at runtime.
//
// BLENDER EMPTY NAMES:
//   Every string in ClockworkRig._names must exactly match
//   the Blender GLB export. See confirmed hierarchy doc.
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'

// ── TICKET BOOK / BOOTH CAMERA ────────────────────────────
// Booth world position — matches boothGLTF.scene.position.set(75, -95, 40) in main.js
const BOOTH_WORLD_POS = new THREE.Vector3(75, -95, 40)
// Camera lands Z units in FRONT of the booth (add to booth Z)
const TICKET_BOOK_Z_OFFSET   = 350
// How far up from booth Y the camera sits (at robot head height)
const TICKET_BOOK_Y_LIFT     = 7

const TICKET_BOOK_POS    = new THREE.Vector3(
  BOOTH_WORLD_POS.x,
  BOOTH_WORLD_POS.y + TICKET_BOOK_Y_LIFT,
  BOOTH_WORLD_POS.z + TICKET_BOOK_Z_OFFSET
)
const TICKET_BOOK_TARGET = new THREE.Vector3(
  BOOTH_WORLD_POS.x,
  BOOTH_WORLD_POS.y + TICKET_BOOK_Y_LIFT * 0.5,
  BOOTH_WORLD_POS.z
)

const CAMERA_ANIM_DURATION = 1.4   // seconds for camera to travel to ticket book

// ── CONSTANTS ─────────────────────────────────────────────
const TWO_PI = Math.PI * 2
const DEG    = Math.PI / 180

const LOOKAT_SPEED        = 6.0
// Fraction of the full look-at arc applied each frame.
// 1.0 = eyes rotate fully toward target; lower = subtler travel.
const LOOKAT_SENSITIVITY  = 0.4
const BLINK_INTERVAL     = 3.5
const BLINK_CLOSE        = 0.06
const BLINK_OPEN         = 0.10
const IDLE_MIN_WAIT      = 4.0
const IDLE_MAX_WAIT      = 9.0

const IDLE_POOL = [
  ['monocle_spin',  40],
  ['hat_hop',       20],
  ['body_sway',     20],
  ['jaw_stretch',   15],
  ['dance',          5],
]
const SIR_MOTION_SCALAR = 0.3

// ── INLINE STYLES ─────────────────────────────────────────
const CSS = `
  @keyframes fw-bulge   { 0%,100%{transform:scale(1)}50%{transform:scale(1.04)} }
  @keyframes fw-blink-a { 0%,49%,100%{opacity:1}50%,99%{opacity:.15} }
  @keyframes fw-blink-b { 0%,49%,100%{opacity:.15}50%,99%{opacity:1} }
  @keyframes fw-fadein  { from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:none} }
  @keyframes fw-fadeout { from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.92)} }
  @keyframes fw-star    { 0%,100%{opacity:.2;transform:scale(.8) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(20deg)} }

  .fw-overlay {
    position:fixed;inset:0;display:flex;align-items:flex-end;justify-content:center;
    z-index:9999;pointer-events:none;padding-bottom:40px;
  }
  .fw-panel {
    pointer-events:auto;position:relative;width:min(520px,90vw);
    background:#110428;border:3px solid #c9a84c;border-radius:6px;
    padding:0;overflow:hidden;cursor:pointer;
    animation:fw-fadein .55s cubic-bezier(.22,1,.36,1) both;
    box-shadow:0 0 0 6px #0d0221,0 0 0 8px #c9a84c44,0 24px 64px rgba(0,0,0,.75);
  }
  .fw-panel.fw-closing { animation:fw-fadeout .38s ease forwards; }

  .fw-bulbs {
    display:flex;justify-content:space-around;align-items:center;
    padding:6px 12px;background:#0d0221;border-bottom:1px solid #c9a84c33;
  }
  .fw-bulbs.fw-bulbs--bottom { border-bottom:none;border-top:1px solid #c9a84c33; }
  .fw-bulb  { width:9px;height:9px;border-radius:50%;flex-shrink:0; }
  .fw-bulb--gold-a { background:#c9a84c;box-shadow:0 0 7px #c9a84c;animation:fw-blink-a 1.1s ease infinite; }
  .fw-bulb--gold-b { background:#c9a84c;box-shadow:0 0 7px #c9a84c;animation:fw-blink-b 1.1s ease infinite; }
  .fw-bulb--blue-a { background:#a8c8ff;box-shadow:0 0 7px #a8c8ff;animation:fw-blink-a 1.4s ease infinite; }
  .fw-bulb--blue-b { background:#a8c8ff;box-shadow:0 0 7px #a8c8ff;animation:fw-blink-b 1.4s ease infinite; }
  .fw-bulb--red-a  { background:#e05050;box-shadow:0 0 7px #e05050;animation:fw-blink-a  .9s ease infinite; }
  .fw-bulb--red-b  { background:#e05050;box-shadow:0 0 7px #e05050;animation:fw-blink-b  .9s ease infinite; }

  .fw-body {
    display:flex;flex-direction:column;padding:18px 22px 12px;gap:12px;
  }
  .fw-step {
    font-family:'Georgia',serif;font-size:11px;letter-spacing:.35em;
    text-transform:uppercase;color:#c9a84c;opacity:.7;margin:0;text-align:center;
  }
  .fw-title {
    font-family:'Georgia',serif;font-size:clamp(17px,3.5vw,22px);
    color:#f5f0e8;line-height:1.2;margin:0;
    animation:fw-bulge 3.5s ease-in-out infinite;text-align:center;
  }
  .fw-title span { color:#c9a84c; }
  .fw-divider { display:flex;align-items:center;gap:8px; }
  .fw-divider-line { flex:1;height:1px;background:linear-gradient(to right,transparent,#c9a84c77,transparent); }
  .fw-divider-star { color:#c9a84c;font-size:13px;animation:fw-star 2s ease-in-out infinite; }
  .fw-warning {
    display:flex;align-items:flex-start;gap:10px;
    background:#1e0a0a;border:1px solid #8b1a1a77;border-radius:4px;padding:10px 12px;
  }
  .fw-warning-icon {
    width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;
    justify-content:center;background:#8b1a1a;border-radius:3px;margin-top:1px;
    color:#f5c6c6;font-family:'Georgia',serif;font-size:13px;font-weight:bold;
  }
  .fw-warning-text {
    font-family:'Georgia',serif;font-size:13px;line-height:1.5;color:#f5e0e0;margin:0;
  }
  .fw-warning-text strong { color:#ffc2c2;font-style:italic; }
  .fw-sub {
    text-align:center;font-family:'Georgia',serif;font-size:11px;
    color:#a8c8ff;opacity:.65;letter-spacing:.08em;margin:0;
  }
  .fw-dismiss {
    text-align:center;font-size:10px;color:#f5f0e833;
    letter-spacing:.12em;padding:7px 0 4px;font-family:monospace;text-transform:uppercase;
  }
  .fw-portfolio-link {
    margin:4px 0 0;padding:0 4px;
  }
  .fw-portfolio-btn {
    display:flex;align-items:center;justify-content:center;gap:9px;
    width:100%;padding:11px 18px;
    background:transparent;
    border:1.5px solid #c9a84c;
    border-radius:4px;
    color:#c9a84c;
    font-family:'Georgia',serif;font-size:13px;letter-spacing:.06em;
    cursor:pointer;
    transition:background .18s,color .18s,box-shadow .18s;
    box-shadow:0 0 0 0 #c9a84c00;
  }
  .fw-portfolio-btn:hover {
    background:#c9a84c;color:#0d0221;
    box-shadow:0 0 18px #c9a84c66;
  }
  .fw-portfolio-btn-icon { font-size:15px;line-height:1; }
  .fw-portfolio-btn-arrow { font-size:14px;opacity:.7;transition:transform .18s; }
  .fw-portfolio-btn:hover .fw-portfolio-btn-arrow { transform:translateX(3px);opacity:1; }
`

// ═══════════════════════════════════════════════════════════
// ClockworkRig
// ═══════════════════════════════════════════════════════════
export class ClockworkRig {

  constructor(scene) {
    this._scene = scene
    this._map   = {}
    this._build()
  }

  static _names = [
    'robot_chest-center',
    'robot_chest-left',
    'robot_chest-right',
    'robot_chest-top',
    'robot_clock-pivot',
    'robot_C_clock-center_4',
    'robot_C_clock-face_5',
    'robot_C_day-hand_4',
    'robot_C_hour-hand_4',
    'robot_C_minute-hand_4',
    'robot_N_little-joint_16_03',
    'robot_N_big-joint_16_02',
    'robot_N_little-joint_16_02',
    'robot_neck-pivot',
    'robot_N_big-joint_16_01',
    'robot_N_little-joint_16_01',
    'robot_head-pivot',
    'robot_skull-center',
    'robot_skull-back',
    'robot_hat-pivot',
    'robot_eye-left_center',
    'robot_eye-right_center',
    'robot_eye-left_look-at',
    'robot_eye-right_look-at',
    'robot_F_inner-eye_9_left',
    'robot_F_inner-eye_9_right',
    'robot_F_outer-eye_8_left',
    'robot_F_outer-eye_8_right',
    'robot_F_pupil_10_left',
    'robot_F_pupil_10_right',
    'robot_F_monocle-base_7',
    'robot_F_monocle-trim_2',
    'robot_eyebrow-left_I',
    'robot_eyebrow-left_O',
    'robot_eyebrow-right_I',
    'robot_eyebrow-right_O',
    'robot_jaw-hinge-left',
    'robot_jaw-hinge-right',
    'robot_J_J_1',
    'robot_chin-center',
    'robot_chin-left',
    'robot_chin-right',
    'robot_F_face-plate-trim_15_left',
    'robot_F_face-plate_14_left',
    'robot_F_white-trim_2',
  ]

  _build() {
    const names = new Set(ClockworkRig._names)
    this._scene.traverse((obj) => {
      if (names.has(obj.name)) {
        this._map[obj.name] = obj
        obj.userData.restQuaternion = obj.quaternion.clone()
        obj.userData.restPosition   = obj.position.clone()
        obj.userData.restScale      = obj.scale.clone()
        // Pre-compute pivot-to-visual-centre offset for monocle spin-in-place (Bug 2)
        if (obj.name === 'robot_F_monocle-base_7' || obj.name === 'robot_F_monocle-trim_2') {
          obj.updateWorldMatrix(true, false)
          const bbox        = new THREE.Box3().setFromObject(obj)
          const worldCenter = new THREE.Vector3()
          bbox.getCenter(worldCenter)
          if (obj.parent) obj.parent.worldToLocal(worldCenter)
          obj.userData.spinOffset = worldCenter.clone().sub(obj.userData.restPosition)
        }
      }
    })
    const found   = Object.keys(this._map).length
    const missing = [...names].filter(n => !this._map[n])
    console.log(`[ClockworkRig] ${found}/${names.size} bones found`)
    if (missing.length) console.warn('[ClockworkRig] Missing:', missing)
  }

  get(name) { return this._map[name] ?? null }

  resetAll(duration = 0.4) {
    console.log('[rig] resetAll called from:', new Error().stack.split('\n')[2])
    this._resettingAll  = true
    this._resetDuration = duration
    this._resetTimer    = 0
  }

  tickReset(dt) {
    if (!this._resettingAll) return
    this._resetTimer += dt
    const t = Math.min(this._resetTimer / this._resetDuration, 1)
    for (const name of ClockworkRig._names) {
      const obj = this._map[name]
      if (!obj) continue
      obj.quaternion.slerp(obj.userData.restQuaternion, t)
      obj.position.lerp(obj.userData.restPosition, t)
      obj.scale.lerp(obj.userData.restScale, t)
    }
    if (t >= 1) this._resettingAll = false
  }
}

// ═══════════════════════════════════════════════════════════
// ClockworkAnimations
// ═══════════════════════════════════════════════════════════
export class ClockworkAnimations {

  constructor(rig) {
    this.rig = rig

    this._blinkTimer   = 0
    this._blinkPhase   = 'wait'
    this._blinkT       = 0

    this._idleTimer    = _randBetween(IDLE_MIN_WAIT, IDLE_MAX_WAIT)
    this._idleActive   = false
    this._idlePlaying  = false
    this._idlesEnabled = true

    this._clockActive  = false

    this._lookTarget   = new THREE.Vector3()
    this._lookActive   = false

    this._pendingTicks = new Set()

    this._v3a = new THREE.Vector3()
    this._v3b = new THREE.Vector3()
  }

  // ── PUBLIC API ────────────────────────────────────────

  update(dt) {
    this.rig.tickReset(dt)
    if (this._lookActive)   this._tickLookAt(dt)
    if (this._clockActive)  this._tickClock()
    if (this._idlesEnabled) this._tickIdlePool(dt)
    this._tickBlink(dt)
    this._flushTicks(dt)
  }

  idle_blink()  { this._blinkTimer = 0; this._blinkPhase = 'wait' }
  idle_clock()  { this._clockActive = true }
  idle_wait()   { this._idleActive = true; this._idleTimer = _randBetween(IDLE_MIN_WAIT, IDLE_MAX_WAIT) }

  stopIdles()   {
    this._idlesEnabled = false
    this._clockActive  = false
    this._blinkPhase   = 'wait'
    this._idleActive   = false
  }

  resumeIdles() {
    this._idlesEnabled = true
    this._idleActive   = true
    this._clockActive  = true
    this._idleTimer    = _randBetween(IDLE_MIN_WAIT, IDLE_MAX_WAIT)
  }

  setLookTarget(worldPos) {
    this._lookTarget.copy(worldPos)
    this._lookActive = true
  }

  clearLookTarget() {
    this._lookActive = false
  }

  // ── EXPRESSIONS ──────────────────────────────────────

  expression_greeting({ onComplete } = {}) {
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const hat      = this.rig.get('robot_hat-pivot')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const browRI   = this.rig.get('robot_eyebrow-right_I')
    const mono     = this.rig.get('robot_F_monocle-base_7')

    const duration = 1.8
    let   elapsed  = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      // Z side-tilt fades out while X bow fades in — blended so there's no
      // snapping when the phases transition.
      let greetRx = 0, greetRz = 0
      if (t < 0.15) {
        greetRz = _easeInOut(t / 0.15) * (-3 * DEG) * SIR_MOTION_SCALAR
      } else if (t < 0.55) {
        const fwd = _easeInOut((t - 0.15) / 0.4)
        greetRx = fwd * (14 * DEG) * SIR_MOTION_SCALAR
        greetRz = (1 - fwd) * (-3 * DEG) * SIR_MOTION_SCALAR
      } else {
        greetRx = (1 - _easeInOut((t - 0.55) / 0.45)) * (14 * DEG) * SIR_MOTION_SCALAR
      }
      this._applyDeltaRot(neck,     greetRx,       0, greetRz)
      this._applyDeltaRot(chestTop, greetRx * 0.5, 0, greetRz * 0.5)

      if (hat) {
        if (t < 0.2) {
          hat.rotation.z = 0
        } else if (t < 0.55) {
          hat.rotation.z = _easeInOut((t - 0.2) / 0.35) * (18 * DEG) * SIR_MOTION_SCALAR
        } else if (t < 0.75) {
          const over = _easeInOut((t - 0.55) / 0.2)
          hat.rotation.z = (18 * DEG - over * (22 * DEG)) * SIR_MOTION_SCALAR
        } else {
          const settle = _easeInOut((t - 0.75) / 0.25)
          hat.rotation.z = (-4 * DEG + settle * (4 * DEG)) * SIR_MOTION_SCALAR
        }
      }

      if (t > 0.25 && t < 0.75) {
        const browT = _easeInOut((t - 0.25) / 0.5)
        const rise  = Math.sin(browT * Math.PI) * 0.04 * SIR_MOTION_SCALAR
        if (browLI) browLI.position.y = browLI.userData.restPosition.y + rise
        if (browRI) browRI.position.y = browRI.userData.restPosition.y + rise
      }

      if (mono && t > 0.3 && t < 0.6) {
        const pulse = 1 + Math.sin(((t - 0.3) / 0.3) * Math.PI) * 0.08 * SIR_MOTION_SCALAR
        mono.scale.setScalar(pulse)
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (hat)      hat.rotation.z = 0
        if (browLI)   browLI.position.copy(browLI.userData.restPosition)
        if (browRI)   browRI.position.copy(browRI.userData.restPosition)
        if (mono)     mono.scale.copy(mono.userData.restScale)
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }

  expression_sassy({ onComplete } = {}) {
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const head     = this.rig.get('robot_head-pivot')
    const hat      = this.rig.get('robot_hat-pivot')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const mono     = this.rig.get('robot_F_monocle-base_7')
    const monoTr   = this.rig.get('robot_F_monocle-trim_2')

    const duration = 1.4
    let   elapsed  = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      const rx = _easeInOut(Math.min(t / 0.4, 1)) * (-8 * DEG) * SIR_MOTION_SCALAR
      this._applyDeltaRot(neck,     rx, 0, 0)
      this._applyDeltaRot(chestTop, rx * 0.5, 0, 0)

      if (hat && t > 0.1) {
        hat.rotation.x = _easeInOut(Math.min((t - 0.1) / 0.4, 1)) * (5 * DEG) * SIR_MOTION_SCALAR
      }

      if (browLI && t > 0.15 && t < 0.85) {
        const bT   = _easeInOut((t - 0.15) / 0.35)
        const hold = t < 0.5 ? bT : 1 - _easeInOut((t - 0.5) / 0.35)
        browLI.position.y = browLI.userData.restPosition.y + hold * 0.035 * SIR_MOTION_SCALAR
      }

      this._spinInPlace(mono,   t * TWO_PI)
      this._spinInPlace(monoTr, t * TWO_PI)

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (hat)      hat.rotation.x = 0
        if (browLI)   browLI.position.copy(browLI.userData.restPosition)
        if (mono)   { mono.rotation.z   = 0; mono.position.copy(mono.userData.restPosition) }
        if (monoTr) { monoTr.rotation.z = 0; monoTr.position.copy(monoTr.userData.restPosition) }
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }

  expression_dramatic({ onComplete } = {}) {
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const hat      = this.rig.get('robot_hat-pivot')
    const jawL     = this.rig.get('robot_jaw-hinge-left')
    const jawR     = this.rig.get('robot_jaw-hinge-right')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const browRI   = this.rig.get('robot_eyebrow-right_I')

    const duration = 1.6
    let   elapsed  = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      let neckRx = 0
      if (t < 0.2) {
        neckRx = _easeInOut(t / 0.2) * (-12 * DEG) * SIR_MOTION_SCALAR
      } else if (t < 0.45) {
        neckRx = (-12 * DEG + ((t - 0.2) / 0.25) * (22 * DEG)) * SIR_MOTION_SCALAR
      } else {
        neckRx = (10 * DEG - _easeInOut((t - 0.45) / 0.55) * (10 * DEG)) * SIR_MOTION_SCALAR
      }
      this._applyDeltaRot(neck,     neckRx, 0, 0)
      this._applyDeltaRot(chestTop, neckRx * 0.5, 0, 0)

      if (hat) {
        if (t < 0.2) {
          hat.position.y = hat.userData.restPosition.y
        } else if (t < 0.5) {
          hat.position.y = hat.userData.restPosition.y
            + _easeInOut((t - 0.2) / 0.3) * 0.22 * SIR_MOTION_SCALAR
        } else {
          const wobble = Math.sin((t - 0.5) * Math.PI * 4) * (1 - (t - 0.5) / 0.5)
          hat.position.y = hat.userData.restPosition.y + wobble * 0.06 * SIR_MOTION_SCALAR
        }
      }

      if (jawL && jawR) {
        if (t > 0.2 && t < 0.75) {
          const jawT  = t < 0.45
            ? _easeInOut((t - 0.2) / 0.25)
            : 1 - _easeInOut((t - 0.45) / 0.3)
          const angle = jawT * 26 * DEG * SIR_MOTION_SCALAR
          jawL.rotation.x = angle
          jawR.rotation.x = angle
        } else if (t >= 0.75) {
          jawL.rotation.x = 0
          jawR.rotation.x = 0
        }
      }

      if (t > 0.2 && t < 0.8) {
        const bT   = t < 0.45
          ? _easeInOut((t - 0.2) / 0.25)
          : 1 - _easeInOut((t - 0.45) / 0.35)
        const rise = bT * 0.05 * SIR_MOTION_SCALAR
        if (browLI) browLI.position.y = browLI.userData.restPosition.y + rise
        if (browRI) browRI.position.y = browRI.userData.restPosition.y + rise
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (hat)      hat.position.copy(hat.userData.restPosition)
        if (jawL)     jawL.rotation.x = 0
        if (jawR)     jawR.rotation.x = 0
        if (browLI)   browLI.position.copy(browLI.userData.restPosition)
        if (browRI)   browRI.position.copy(browRI.userData.restPosition)
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }
  expression_proud({ onComplete } = {}) {
    // Chest-top lifts, head tilts back and up, both eyebrows rise, monocle pulse
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const browRI   = this.rig.get('robot_eyebrow-right_I')
    const mono     = this.rig.get('robot_F_monocle-base_7')

    const duration = 1.6
    let elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      // Head tilts back then returns
      const rx = Math.sin(t * Math.PI) * (-10 * DEG) * SIR_MOTION_SCALAR
      this._applyDeltaRot(neck,     rx, 0, 0)
      this._applyDeltaRot(chestTop, rx * 0.4, 0, 0)

      // Both eyebrows rise symmetrically
      if (t > 0.1 && t < 0.9) {
        const rise = Math.sin(((t - 0.1) / 0.8) * Math.PI) * 0.05 * SIR_MOTION_SCALAR
        if (browLI) browLI.position.y = browLI.userData.restPosition.y + rise
        if (browRI) browRI.position.y = browRI.userData.restPosition.y + rise
      }

      // Monocle pulse
      if (mono && t > 0.2 && t < 0.7) {
        const pulse = 1 + Math.sin(((t - 0.2) / 0.5) * Math.PI) * 0.1 * SIR_MOTION_SCALAR
        mono.scale.setScalar(pulse)
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (browLI)   browLI.position.copy(browLI.userData.restPosition)
        if (browRI)   browRI.position.copy(browRI.userData.restPosition)
        if (mono)     mono.scale.copy(mono.userData.restScale)
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }

  expression_wistful({ onComplete } = {}) {
    // Slow neck tilt sideways, eyebrows droop inward, still and quiet
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const browLO   = this.rig.get('robot_eyebrow-left_O')
    const browRO   = this.rig.get('robot_eyebrow-right_O')

    const duration = 2.2
    let elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      // Slow tilt right, hold, return
      let rz = 0
      if (t < 0.35) {
        rz = _easeInOut(t / 0.35) * (9 * DEG) * SIR_MOTION_SCALAR
      } else if (t < 0.7) {
        rz = (9 * DEG) * SIR_MOTION_SCALAR
      } else {
        rz = (1 - _easeInOut((t - 0.7) / 0.3)) * (9 * DEG) * SIR_MOTION_SCALAR
      }
      this._applyDeltaRot(neck,     0, 0, rz)
      this._applyDeltaRot(chestTop, 0, 0, rz * 0.4)

      // Outer brows droop (inward/down) during hold
      if (t > 0.2 && t < 0.85) {
        const droop = Math.sin(((t - 0.2) / 0.65) * Math.PI) * -0.03 * SIR_MOTION_SCALAR
        if (browLO) browLO.position.y = browLO.userData.restPosition.y + droop
        if (browRO) browRO.position.y = browRO.userData.restPosition.y + droop
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (browLO)   browLO.position.copy(browLO.userData.restPosition)
        if (browRO)   browRO.position.copy(browRO.userData.restPosition)
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }

  expression_thinking({ onComplete } = {}) {
    // Head bows forward and tilts to monocle side, one eyebrow up, monocle small adjust
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const mono     = this.rig.get('robot_F_monocle-base_7')
    const monoTr   = this.rig.get('robot_F_monocle-trim_2')

    const duration = 1.8
    let elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      // Forward bow + slight tilt toward monocle side
      const rx = Math.sin(t * Math.PI) * (8 * DEG) * SIR_MOTION_SCALAR
      const rz = Math.sin(t * Math.PI) * (-5 * DEG) * SIR_MOTION_SCALAR
      this._applyDeltaRot(neck,     rx, 0, rz)
      this._applyDeltaRot(chestTop, rx * 0.4, 0, rz * 0.4)

      // Monocle-side eyebrow raises
      if (browLI && t > 0.15 && t < 0.85) {
        const rise = Math.sin(((t - 0.15) / 0.7) * Math.PI) * 0.04 * SIR_MOTION_SCALAR
        browLI.position.y = browLI.userData.restPosition.y + rise
      }

      // Monocle small thoughtful rotation
      if (t > 0.2 && t < 0.8) {
        const angle = Math.sin(((t - 0.2) / 0.6) * Math.PI) * (15 * DEG) * SIR_MOTION_SCALAR
        this._spinInPlace(mono,   angle)
        this._spinInPlace(monoTr, angle)
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        if (browLI)   browLI.position.copy(browLI.userData.restPosition)
        if (mono)   { mono.rotation.z   = 0; mono.position.copy(mono.userData.restPosition) }
        if (monoTr) { monoTr.rotation.z = 0; monoTr.position.copy(monoTr.userData.restPosition) }
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }

  expression_excited({ onComplete } = {}) {
    // Fast hat hop, body bounces forward, eyebrows shoot up
    const hat      = this.rig.get('robot_hat-pivot')
    const chest    = this.rig.get('robot_chest-center')
    const neck     = this.rig.get('robot_neck-pivot')
    const browLI   = this.rig.get('robot_eyebrow-left_I')
    const browRI   = this.rig.get('robot_eyebrow-right_I')

    const duration = 1.2
    let elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const t = Math.min(elapsed / duration, 1)

      // Double hat hop
      if (hat) {
        hat.position.y = hat.userData.restPosition.y
          + Math.abs(Math.sin(t * Math.PI * 2)) * 0.2 * SIR_MOTION_SCALAR
      }

      // Body lurches forward then back
      const rx = Math.sin(t * Math.PI) * (-8 * DEG) * SIR_MOTION_SCALAR
      this._applyDeltaRot(neck, rx, 0, 0)

      // Both eyebrows shoot up fast then settle
      if (t < 0.5) {
        const rise = _easeInOut(t / 0.5) * 0.06 * SIR_MOTION_SCALAR
        if (browLI) browLI.position.y = browLI.userData.restPosition.y + rise
        if (browRI) browRI.position.y = browRI.userData.restPosition.y + rise
      } else {
        const settle = _easeInOut((t - 0.5) / 0.5)
        const rise   = (1 - settle) * 0.06 * SIR_MOTION_SCALAR
        if (browLI) browLI.position.y = browLI.userData.restPosition.y + rise
        if (browRI) browRI.position.y = browRI.userData.restPosition.y + rise
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        if (hat)    hat.position.copy(hat.userData.restPosition)
        if (neck)   neck.quaternion.copy(neck.userData.restQuaternion)
        if (browLI) browLI.position.copy(browLI.userData.restPosition)
        if (browRI) browRI.position.copy(browRI.userData.restPosition)
        onComplete?.()
      }
    }
    this._registerTick(tick)
  }


  // ── TALKING JAW ───────────────────────────────────────────
    // ── JAW AXIS HELPERS ──────────────────────────────────────
  _computeJawAxis() {
    const jawL = this.rig.get('robot_jaw-hinge-left')
    const jawR = this.rig.get('robot_jaw-hinge-right')
    const jawC = this.rig.get('robot_J_J_1')

    this._jawAxis = null
    this._jawObj  = null

    if (!jawL || !jawR || !jawC) return

    jawL.updateWorldMatrix(true, false)
    jawR.updateWorldMatrix(true, false)
    jawC.updateWorldMatrix(true, false)

    const posL = new THREE.Vector3()
    const posR = new THREE.Vector3()
    jawL.getWorldPosition(posL)
    jawR.getWorldPosition(posR)

    const worldAxis = new THREE.Vector3().subVectors(posR, posL).normalize()

    // Convert world axis into J_J_1's own local space
    this._jawAxis = worldAxis.clone()
      .transformDirection(new THREE.Matrix4().copy(jawC.matrixWorld).invert())
      .normalize()

    this._jawObj = jawC
  }

  _applyJawAngle(angle) {
    if (!this._jawObj || !this._jawAxis) return
    this._jawObj.quaternion
      .copy(this._jawObj.userData.restQuaternion)
      .multiply(new THREE.Quaternion().setFromAxisAngle(this._jawAxis, angle))
  }

  startTalking() {
    if (this._talkActive) return
    this._talkActive      = true
    this._currentJawAngle = 0
    this._jawTarget       = 0
    this._jawPhase        = 0
    this._computeJawAxis()

    const tick = (dt) => {
      if (!this._talkActive) return

      // Tiny background flutter so jaw isn't completely dead between words
      this._jawPhase += dt * 14
      const flutter = Math.max(0, Math.sin(this._jawPhase)) * 0.025

      // Smooth toward target + flutter
      this._currentJawAngle += (this._jawTarget + flutter - this._currentJawAngle)
        * Math.min(dt * 18, 1)

      // Target bleeds back to closed
      this._jawTarget *= Math.pow(0.001, dt)

      this._applyJawAngle(this._currentJawAngle)
      this._registerTick(tick)
    }
    this._registerTick(tick)
  }

  onWordBoundary() {
    // Each word pops the jaw open to a slightly randomised amount
    this._jawTarget = 0.16 + Math.random() * 0.08
  }

  stopTalking() {
    if (!this._talkActive) return
    this._talkActive = false

    const start   = this._currentJawAngle ?? 0
    let   elapsed = 0

    const closeTick = (dt) => {
      elapsed += dt
      const f = Math.min(elapsed / 0.2, 1)
      this._applyJawAngle(start * (1 - f))
      if (f < 1) {
        this._registerTick(closeTick)
      } else {
        // Snap fully to rest
        if (this._jawHinge)
          this._jawHinge.quaternion.copy(this._jawHinge.userData.restQuaternion)
      }
    }
    this._registerTick(closeTick)
  }
  // ── BLINK ─────────────────────────────────────────────
  _tickBlink(dt) {
    this._blinkTimer += dt

    if (this._blinkPhase === 'wait') {
      if (this._blinkTimer >= BLINK_INTERVAL) {
        this._blinkTimer = 0; this._blinkPhase = 'closing'; this._blinkT = 0
      }
      return
    }

    this._blinkT += dt

    if (this._blinkPhase === 'closing') {
      this._applyBlink(Math.min(this._blinkT / BLINK_CLOSE, 1))
      if (this._blinkT >= BLINK_CLOSE) { this._blinkT = 0; this._blinkPhase = 'opening' }
      return
    }

    if (this._blinkPhase === 'opening') {
      this._applyBlink(1 - Math.min(this._blinkT / BLINK_OPEN, 1))
      if (this._blinkT >= BLINK_OPEN) { this._blinkT = 0; this._blinkPhase = 'wait' }
    }
  }

  _applyBlink(t) {
    //for (const name of ['robot_F_outer-eye_8_left', 'robot_F_outer-eye_8_right']) {
      //const obj = this.rig.get(name)
      //if (obj) obj.scale.y = 1 - t * 0.95
    //}
  }

  // ── LOOK-AT ───────────────────────────────────────────
  _tickLookAt(dt) {
    const leftCenter  = this.rig.get('robot_eye-left_center')
    const rightCenter = this.rig.get('robot_eye-right_center')
    const leftLookAt  = this.rig.get('robot_eye-left_look-at')
    const rightLookAt = this.rig.get('robot_eye-right_look-at')

    if (!leftCenter || !rightCenter) return

    // Lazy-compute half the inter-eye distance from world positions once at runtime.
    if (!this._eyeHalfSep) {
      const lp = new THREE.Vector3()
      const rp = new THREE.Vector3()
      leftCenter.getWorldPosition(lp)
      rightCenter.getWorldPosition(rp)
      this._eyeHalfSep = Math.abs(lp.x - rp.x) * 0.5
    }

    // Each eye gets its own converging target offset inward by half the eye
    // separation — both eyes angle toward the cursor rather than staring at
    // the identical world point.
    const leftTarget  = new THREE.Vector3().copy(this._lookTarget)
    const rightTarget = new THREE.Vector3().copy(this._lookTarget)
    leftTarget.x  -= this._eyeHalfSep
    rightTarget.x += this._eyeHalfSep

    // Keep the scene-graph empties in sync (useful for debugging in Blender).
    if (leftLookAt)  leftLookAt.position.copy(leftTarget)
    if (rightLookAt) rightLookAt.position.copy(rightTarget)

    // Pure rotation only — no pupil translation.
    // LOOKAT_SENSITIVITY in _rotateTowardTarget governs the travel range.
    this._rotateTowardTarget(leftCenter,  leftTarget,  dt)
    this._rotateTowardTarget(rightCenter, rightTarget, dt)
  }

  _rotateTowardTarget(eyeCenter, worldTarget, dt) {
    eyeCenter.getWorldPosition(this._v3a)
    this._v3b.subVectors(worldTarget, this._v3a).normalize()
    const targetQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 1),
      this._v3b
    )
    if (eyeCenter.parent) {
      const parentWorldQ = new THREE.Quaternion()
      eyeCenter.parent.getWorldQuaternion(parentWorldQ)
      targetQ.premultiply(parentWorldQ.invert())
    }
    // Blend between the rest pose and the full look-at rotation by
    // LOOKAT_SENSITIVITY so travel range is tunable without touching
    // the plane depth or slerp speed.
    const scaledQ = eyeCenter.userData.restQuaternion.clone()
      .slerp(targetQ, LOOKAT_SENSITIVITY)
    eyeCenter.quaternion.slerp(scaledQ, Math.min(LOOKAT_SPEED * dt, 1))
  }


  // ── CLOCK ─────────────────────────────────────────────
  _tickClock() {
    const now = new Date()
    const h   = now.getHours()   + now.getMinutes() / 60
    const m   = now.getMinutes() + now.getSeconds() / 60

    const dayHand    = this.rig.get('robot_C_day-hand_4')
    const hourHand   = this.rig.get('robot_C_hour-hand_4')
    const minuteHand = this.rig.get('robot_C_minute-hand_4')

    if (dayHand)    dayHand.rotation.z    = -(h / 24) * TWO_PI
    if (hourHand)   hourHand.rotation.z   = -(h / 12) * TWO_PI
    if (minuteHand) minuteHand.rotation.z = -(m / 60) * TWO_PI
  }

  // ── IDLE POOL ─────────────────────────────────────────
  _tickIdlePool(dt) {
    if (!this._idleActive || this._idlePlaying) return
    this._idleTimer -= dt
    if (this._idleTimer > 0) return

    const pick = _weightedRandom(IDLE_POOL)
    this._idlePlaying = true
    const done = () => {
      this._idlePlaying = false
      this._idleTimer   = _randBetween(IDLE_MIN_WAIT, IDLE_MAX_WAIT)
    }

    switch (pick) {
      case 'monocle_spin': this._idle_monocle_spin(done); break
      case 'hat_hop':      this._idle_hat_hop(done);      break
      case 'body_sway':    this._idle_body_sway(done);    break
      case 'jaw_stretch':  this._idle_jaw_stretch(done);  break
      case 'dance':        this._idle_dance(done);        break
      default:             done()
    }
  }

  _idle_monocle_spin(done) {
    const mono   = this.rig.get('robot_F_monocle-base_7')
    const monoTr = this.rig.get('robot_F_monocle-trim_2')
    const inner  = this.rig.get('robot_F_inner-eye_9_left')
    const startZ      = mono?.rotation.z  ?? 0
    const innerStartZ = inner?.rotation.z ?? 0
    const dur    = 1.2
    let   elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const angle = _easeInOut(Math.min(elapsed / dur, 1)) * TWO_PI
      this._spinInPlace(mono,   startZ + angle)
      this._spinInPlace(monoTr, startZ + angle)
      if (inner)  inner.rotation.z  = innerStartZ + angle

      if (elapsed < dur) {
        this._registerTick(tick)
      } else {
        if (mono)   { mono.rotation.z   = startZ; mono.position.copy(mono.userData.restPosition) }
        if (monoTr) { monoTr.rotation.z = startZ; monoTr.position.copy(monoTr.userData.restPosition) }
        if (inner)  inner.rotation.z  = innerStartZ
        done()
      }
    }
    this._registerTick(tick)
  }

  _idle_hat_hop(done) {
    const hat    = this.rig.get('robot_hat-pivot')
    if (!hat) { done(); return }
    const restY  = hat.userData.restPosition.y
    const dur    = 0.9
    let elapsed  = 0

    const tick = (dt) => {
      elapsed += dt
      const t   = Math.min(elapsed / dur, 1)
      hat.position.y = restY + Math.sin(t * Math.PI) * 0.18
      hat.rotation.y = t * TWO_PI
      if (t > 0.85) {
        const squash = 1 - _easeInOut((t - 0.85) / 0.15) * 0.08
        hat.scale.set(1 / squash, squash, 1 / squash)
      }

      if (t < 1) {
        this._registerTick(tick)
      } else {
        hat.position.y = restY
        hat.rotation.y = 0
        hat.scale.copy(hat.userData.restScale)
        done()
      }
    }
    this._registerTick(tick)
  }

  _idle_body_sway(done) {
    const chest   = this.rig.get('robot_chest-center')
    if (!chest) { done(); return }
    const dur     = 2.4
    let   elapsed = 0

    const tick = (dt) => {
      elapsed += dt
      const t     = Math.min(elapsed / dur, 1)
      const env   = Math.sin(t * Math.PI)
      chest.rotation.z = Math.sin(t * TWO_PI) * 4 * DEG * env

      if (t < 1) {
        this._registerTick(tick)
      } else {
        chest.rotation.z = 0
        done()
      }
    }
    this._registerTick(tick)
  }

  _idle_jaw_stretch(done) {
    const jawL = this.rig.get('robot_jaw-hinge-left')
    const jawR = this.rig.get('robot_jaw-hinge-right')
    if (!jawL || !jawR) { done(); return }

    const maxOpen   = 22 * DEG
    const openTime  = 0.45
    const holdTime  = 0.4
    const closeTime = 0.2
    const total     = openTime + holdTime + closeTime
    let   elapsed   = 0

    const tick = (dt) => {
      elapsed += dt
      let angle = 0
      if (elapsed < openTime) {
        angle = _easeInOut(elapsed / openTime) * maxOpen
      } else if (elapsed < openTime + holdTime) {
        angle = maxOpen
      } else {
        angle = (1 - _easeInOut(Math.min((elapsed - openTime - holdTime) / closeTime, 1))) * maxOpen
      }
      jawL.rotation.x = angle
      jawR.rotation.x = angle

      if (elapsed < total) {
        this._registerTick(tick)
      } else {
        jawL.rotation.x = 0
        jawR.rotation.x = 0
        done()
      }
    }
    this._registerTick(tick)
  }

  _idle_dance(done) {
    const chest    = this.rig.get('robot_chest-center')
    const hat      = this.rig.get('robot_hat-pivot')
    const neck     = this.rig.get('robot_neck-pivot')
    const chestTop = this.rig.get('robot_chest-top')
    if (!chest) { done(); return }

    const restChestY = chest.userData.restPosition.y ?? 0
    const dur        = 3.2
    let   elapsed    = 0

    const tick = (dt) => {
      elapsed += dt
      const t   = Math.min(elapsed / dur, 1)
      const env = Math.sin(t * Math.PI)

      chest.position.y = restChestY + Math.sin(elapsed * 6) * 0.025 * env * SIR_MOTION_SCALAR
      chest.rotation.z = Math.sin(elapsed * 3) * 8 * DEG * env * SIR_MOTION_SCALAR
      if (hat) hat.rotation.y = elapsed * 3

      const neckRz = Math.sin(elapsed * 5 + 1) * 5 * DEG * env * SIR_MOTION_SCALAR
      this._applyDeltaRot(neck,     0, 0, neckRz)
      this._applyDeltaRot(chestTop, 0, 0, neckRz * 0.5)

      if (t < 1) {
        this._registerTick(tick)
      } else {
        chest.position.y = restChestY
        chest.rotation.z = 0
        if (hat)      hat.rotation.y = 0
        if (neck)     neck.quaternion.copy(neck.userData.restQuaternion)
        if (chestTop) chestTop.quaternion.copy(chestTop.userData.restQuaternion)
        done()
      }
    }
    this._registerTick(tick)
  }

  // ── MOTION HELPERS ────────────────────────────────────
  /**
   * Bug 1 fix — compose a local-space Euler delta on top of the object's
   * baked rest quaternion instead of overwriting the whole rotation.
   */
  _applyDeltaRot(obj, rx = 0, ry = 0, rz = 0) {
    if (!obj) return
    const q = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'))
    obj.quaternion.copy(obj.userData.restQuaternion).multiply(q)
  }

  /**
   * Bug 2 fix — rotate obj around its visual centre (not its off-centre
   * Blender pivot origin). Uses the spinOffset computed in _build().
   */
  _spinInPlace(obj, angle) {
    if (!obj) return
    const rest   = obj.userData.restPosition
    const offset = obj.userData.spinOffset ?? new THREE.Vector3()
    const cos    = Math.cos(angle)
    const sin    = Math.sin(angle)
    obj.rotation.z = angle
    obj.position.set(
      rest.x + offset.x - (cos * offset.x - sin * offset.y),
      rest.y + offset.y - (sin * offset.x + cos * offset.y),
      rest.z
    )
  }

  // ── TICK QUEUE ────────────────────────────────────────
  _registerTick(fn) { this._pendingTicks.add(fn) }

  _flushTicks(dt) {
    for (const fn of [...this._pendingTicks]) {
      this._pendingTicks.delete(fn)
      fn(dt)
    }
  }
}

// ═══════════════════════════════════════════════════════════
// showWelcome — runs inside the main Ferris Wheel scene.
//
// Pass your pre-created rig + anim from main.js so animations
// persist after the welcome panel closes.
// The caller's main animation loop must drive anim.update(dt).
// ═══════════════════════════════════════════════════════════
export function showWelcome({
  name          = 'Sarah',
  mainCamera,             // THREE.PerspectiveCamera from main.js
  mainRenderer,           // THREE.WebGLRenderer from main.js
  robotScene,             // the robot's root Object3D already in the scene
  rig:  externalRig  = null,  // ← pass your persistent rig
  anim: externalAnim = null,  // ← pass your persistent anim
  onPortfolioOpen   = null,   // ← opens the PortfolioSheet overlay
  onDismiss,
} = {}) {

  // Use external rig/anim if provided, otherwise create local ones
  const isExternal = !!(externalRig && externalAnim)
  const rig  = externalRig  ?? new ClockworkRig(robotScene)
  const anim = externalAnim ?? new ClockworkAnimations(rig)

  console.log('[showWelcome] isExternal:', isExternal, '| ticket cam pos:', TICKET_BOOK_POS)

  // ── INJECT STYLES ──────────────────────────────────
  if (!document.getElementById('fw-styles')) {
    const s = document.createElement('style')
    s.id = 'fw-styles'
    s.textContent = CSS
    document.head.appendChild(s)
  }

  // ── CAMERA ANIMATION TO TICKET BOOK ───────────────
  const fromPos    = mainCamera.position.clone()
  const fromTarget = new THREE.Vector3()
  mainCamera.getWorldDirection(fromTarget)
  fromTarget.multiplyScalar(10).add(fromPos)

  let cameraT        = 0
  let cameraAnimDone = false

  function tickCamera(dt) {
    if (cameraAnimDone) return
    cameraT += dt / CAMERA_ANIM_DURATION
    const t  = Math.min(cameraT, 1)
    const e  = _easeInOut(t)

    mainCamera.position.lerpVectors(fromPos, TICKET_BOOK_POS, e)
    const lookNow = new THREE.Vector3().lerpVectors(fromTarget, TICKET_BOOK_TARGET, e)
    mainCamera.lookAt(lookNow)

    if (t >= 1) cameraAnimDone = true
  }

  // ── MOUSE → LOOK-AT ────────────────────────────────
  const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const raycaster  = new THREE.Raycaster()
  const mouse      = new THREE.Vector2()
  const lookHit    = new THREE.Vector3()

  function onMouseMove(e) {
    const canvas = mainRenderer.domElement
    const rect   = canvas.getBoundingClientRect()
    mouse.x =  ((e.clientX - rect.left)  / rect.width)  * 2 -1
    mouse.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, mainCamera)
    raycaster.ray.intersectPlane(lookPlane, lookHit)
    if (lookHit) anim.setLookTarget(lookHit)
  }
  window.addEventListener('mousemove', onMouseMove)

  // ── BUILD OVERLAY UI ───────────────────────────────
  const overlay = document.createElement('div')
  overlay.className = 'fw-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Welcome to the Ferris Wheel')

  overlay.innerHTML = `
    <div class="fw-panel" role="document" tabindex="0">
      <div class="fw-bulbs">${_buildBulbRow(40)}</div>
      <div class="fw-body">
        <p class="fw-step">★ &nbsp; Step right up &nbsp; ★</p>
        <h1 class="fw-title">Welcome to the<br><span>Ferris Wheel!</span></h1>
        <div class="fw-divider">
          <div class="fw-divider-line"></div>
          <div class="fw-divider-star">✦</div>
          <div class="fw-divider-line"></div>
        </div>
        <div class="fw-warning">
          <div class="fw-warning-icon">!</div>
          <p class="fw-warning-text">
            <strong>Attention, riders&nbsp;—</strong>
            please check your seat before sitting down.
            <strong>${name}</strong> has left her projects
            scattered all over the gondolas again.
          </p>
        </div>
        <p class="fw-sub">Click any cabin to step inside &amp; explore.</p>
        ${onPortfolioOpen ? `
        <div class="fw-portfolio-link">
          <button class="fw-portfolio-btn" type="button" aria-label="Open portfolio sheet">
            <span class="fw-portfolio-btn-icon">📋</span>
            Open Full Portfolio
            <span class="fw-portfolio-btn-arrow">→</span>
          </button>
        </div>` : ''}
      </div>
      <div class="fw-bulbs fw-bulbs--bottom">${_buildBulbRow(40)}</div>
      <p class="fw-dismiss">[ click anywhere to board ]</p>
    </div>
  `
  document.body.appendChild(overlay)

  const panel = overlay.querySelector('.fw-panel')
  panel.focus()

  // "Open Full Portfolio" button — opens sheet without dismissing welcome
  if (onPortfolioOpen) {
    const portfolioBtn = overlay.querySelector('.fw-portfolio-btn')
    if (portfolioBtn) {
      portfolioBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()   // don't trigger panel dismiss
        onPortfolioOpen()
      })
    }
  }

  // Hover: sassy
  panel.addEventListener('mouseenter', () => { if (!state.disposed) anim.expression_sassy() })
  panel.addEventListener('mouseleave', () => { if (!state.disposed) rig.resetAll(0.4) })

  // ── RAF LOOP (camera animation only when external anim) ──
  const clock    = new THREE.Clock()
  const state    = { disposed: false }
  let   rafId    = null

  function loop() {
    if (state.disposed) return
    rafId = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 0.05)
    tickCamera(dt)
    // Only drive anim here if we created it ourselves — external anim
    // is driven by the main THREE.js animation loop in main.js
    if (!isExternal) anim.update(dt)
  }

  // Start greeting, then idles
  anim.expression_greeting({
    onComplete: () => {
      if (state.disposed) return
      anim.idle_wait()
      anim.idle_blink()
      anim.idle_clock()
    }
  })
  loop()

  // ── DISMISS ────────────────────────────────────────
  let dismissed = false

  function doClose() {
    if (state.disposed) return
    state.disposed = true
    cancelAnimationFrame(rafId)
    window.removeEventListener('mousemove', onMouseMove)
    panel.classList.add('fw-closing')
    panel.addEventListener('animationend', () => {
      overlay.remove()
      _animateCameraBack(mainCamera, fromPos, fromTarget, onDismiss)
    }, { once: true })
  }

  function dismiss() {
    if (dismissed) return
    dismissed = true
    clearTimeout(autoTimer)
    // Only stop idles if we own the anim — external keeps running
    if (!isExternal) anim.stopIdles()
    anim.expression_dramatic({ onComplete: doClose })
    setTimeout(doClose, 700)
  }

  panel.addEventListener('click', dismiss)
  panel.addEventListener('keydown', (e) => {
    if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); dismiss() }
  })

  const autoTimer = setTimeout(dismiss, 10000)

  // Return rig/anim so caller can hold a reference
  return { rig, anim }
}

// ── CAMERA RETURN ─────────────────────────────────────────
function _animateCameraBack(camera, toPos, toTarget, onComplete) {
  const fromPos    = camera.position.clone()
  const fromTarget = new THREE.Vector3()
  camera.getWorldDirection(fromTarget)
  fromTarget.multiplyScalar(10).add(fromPos)

  const duration = CAMERA_ANIM_DURATION
  let   elapsed  = 0
  let   last     = performance.now()

  function tick() {
    const now = performance.now()
    elapsed  += (now - last) / 1000
    last      = now
    const t   = Math.min(elapsed / duration, 1)
    const e   = _easeInOut(t)

    camera.position.lerpVectors(fromPos, toPos, e)
    const lookNow = new THREE.Vector3().lerpVectors(fromTarget, toTarget, e)
    camera.lookAt(lookNow)

    if (t < 1) requestAnimationFrame(tick)
    else onComplete?.()
  }
  requestAnimationFrame(tick)
}

// ── HELPERS ───────────────────────────────────────────────
function _buildBulbRow(count = 40) {
  const cls = [
    'fw-bulb--gold-a','fw-bulb--blue-b','fw-bulb--red-a',
    'fw-bulb--gold-b','fw-bulb--blue-a','fw-bulb--red-b',
  ]
  return Array.from({ length: count }, (_, i) =>
    `<div class="fw-bulb ${cls[i % cls.length]}"></div>`
  ).join('')
}

function _randBetween(min, max) { return min + Math.random() * (max - min) }

function _easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

function _weightedRandom(pool) {
  const total = pool.reduce((sum, [, w]) => sum + w, 0)
  let   r     = Math.random() * total
  for (const [name, weight] of pool) {
    r -= weight
    if (r <= 0) return name
  }
  return pool[pool.length - 1][0]
}