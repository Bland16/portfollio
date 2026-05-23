// ═══════════════════════════════════════════════════════════
// camera.js — Three camera modes:
//   1. ORBIT   — auto-orbit + mouse drag (OrbitControls)
//   2. TRANSIT — smooth tween into cabin
//   3. INTERIOR — arrow key look-around inside cabin
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CAMERA } from './config.js'
import { isDevModeActive } from './devmode.js'

export const CameraMode = {
  ORBIT:    'orbit',
  TRANSIT:  'transit',
  INTERIOR: 'interior',
  INSPECT:  'inspect',
}

export class CameraController {
  constructor({ camera, renderer, domElement }) {
    this.camera     = camera
    this.renderer   = renderer
    this.domElement = domElement

    this.mode       = CameraMode.ORBIT
    this._autoOrbit = true  // auto-orbit until user interacts

    // Interior look state
    this._yaw   = 0    // left/right
    this._pitch = 0    // up/down
    this._pitchMin = -0.6  // radians (~34°) — floor
    this._pitchMax =  0.5  // radians (~28°) — ceiling

    // Auto-explore override — set by AutoExplore each frame
    this._aeActive = false
    this._aeYaw    = 0
    this._aePitch  = 0

    // Arrow key state
    this._keys = { left: false, right: false, up: false, down: false }
    this._keysEverPressed = false

    // Interior camera position (set when entering cabin)
    this._interiorPosition = new THREE.Vector3()

    // Transit tween
    this._transitFrom  = new THREE.Vector3()
    this._transitTo    = new THREE.Vector3()
    this._transitLookAt = new THREE.Vector3()
    this._transitT     = 0
    this._transitDone  = null

    // Set up OrbitControls
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping  = true
    this.controls.dampingFactor  = 0.05
    this.controls.minDistance    = CAMERA.minDistance
    this.controls.maxDistance    = CAMERA.maxDistance
    this.controls.target.set(0, 0, 0)
    this.controls.autoRotate     = true
    this.controls.autoRotateSpeed = 0.4

    // Stop auto-orbit on user interaction
    this.controls.addEventListener('start', () => {
      this._autoOrbit = false
      this.controls.autoRotate = false
    })

    this._bindKeys()
  }

  // ── KEY BINDINGS ──────────────────────────────────────────
  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (isDevModeActive()) return   // ← add this line

      if (this.mode !== CameraMode.INTERIOR &&
          this.mode !== CameraMode.INSPECT) return

      switch (e.key) {
        case 'ArrowLeft':  this._keys.right  = true; this._keysEverPressed = true; break
        case 'ArrowRight': this._keys.left = true; this._keysEverPressed = true; break
        case 'ArrowUp':    this._keys.up    = true; this._keysEverPressed = true; break
        case 'ArrowDown':  this._keys.down  = true; this._keysEverPressed = true; break
        case 'Escape':
          if (this.mode === CameraMode.INSPECT) {
            this.setMode(CameraMode.INTERIOR)
          } else if (this.mode === CameraMode.INTERIOR) {
            this._onExitCabin && this._onExitCabin()
          }
          break
      }
    }) 

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':  this._keys.right  = false; break
        case 'ArrowRight': this._keys.left = false; break
        case 'ArrowUp':    this._keys.up    = false; break
        case 'ArrowDown':  this._keys.down  = false; break
      }
    })
  }

  // ── SET MODE ──────────────────────────────────────────────
  setMode(mode) {
    this.mode = mode

    if (mode === CameraMode.ORBIT) {
      this.controls.enabled = true
      this._keysEverPressed = false
    } else {
      this.controls.enabled = false
    }
  }

  // ── TRANSIT INTO CABIN ────────────────────────────────────
  // Smoothly moves camera from current position into cabin interior
  transitToCabin(cabin, onComplete) {
    this.setMode(CameraMode.TRANSIT);

    // Start position
    this._transitFrom.copy(this.camera.position);

    // Get world position of the interior viewpoint empty
    const interiorPos = new THREE.Vector3();
    cabin.interiorViewpoint.getWorldPosition(interiorPos);
    console.log(interiorPos);
    // Camera target position
    this._transitTo.copy(interiorPos);
    this._interiorBasePos = interiorPos.clone();
    // Camera look direction = forward direction of the empty
    const lookTarget = new THREE.Vector3(0, 0, -1);
    cabin.interiorViewpoint.localToWorld(lookTarget);
    this._transitLookAt.copy(lookTarget);

    this._transitT = 0;

    this._transitDone = () => {
      this.setMode(CameraMode.INTERIOR);
      this._yaw = 0;
      this._pitch = 0;
      onComplete && onComplete();
    };
}


  // ── TRANSIT OUT OF CABIN ──────────────────────────────────
  transitOutOfCabin(orbitTarget, onComplete) {
    this.setMode(CameraMode.TRANSIT)

    this._transitFrom.copy(this.camera.position)
    this._transitTo.copy(orbitTarget)
    this._transitLookAt.set(0, 0, 0)
    this._transitT    = 0
    this._transitDone = () => {
      this.setMode(CameraMode.ORBIT)
      onComplete && onComplete()
    }
  }

  // ── SET EXIT CABIN CALLBACK ───────────────────────────────
  onExitCabin(cb) {
    this._onExitCabin = cb
  }

  // ── UPDATE (call every frame) ──────────────────────────────

  // ── AUTO-EXPLORE HOOKS ────────────────────────────────────
  // Called each frame by AutoExplore while active. Uses the same
  // lookAt math as _updateInteriorLook — no Euler-order conflicts.
  setAutoExploreLook(yaw, pitch) {
    this._aeActive = true
    this._aeYaw    = yaw
    this._aePitch  = pitch
  }

  // Called by AutoExplore when the user exits to manual control.
  // Bakes current AE values into the controller's own yaw/pitch so
  // manual look picks up seamlessly from the same angle.
  clearAutoExploreLook() {
    this._yaw      = this._aeYaw
    this._pitch    = this._aePitch
    this._aeActive = false
  }

  // ── UPDATE (call every frame) ──────────────────────────────
  update(delta) {
    switch (this.mode) {

      case CameraMode.ORBIT:
        this.controls.update()
        break

      case CameraMode.TRANSIT:
        this._transitT = Math.min(this._transitT + delta * 0.8, 1)
        const t = easeInOutCubic(this._transitT)

        this.camera.position.lerpVectors(this._transitFrom, this._transitTo, t)
        this.camera.lookAt(this._transitLookAt)

        if (this._transitT >= 1 && this._transitDone) {
          this._transitDone()
          this._transitDone = null
        }
        break

      case CameraMode.INTERIOR:
        this._updateInteriorLook(delta)
        break

      case CameraMode.INSPECT:
        // Camera stays still in inspect mode
        // Object rotation is handled by inspect.js
        break
    }
  }

  // ── INTERIOR LOOK ──────────────────────────────────────────
_updateInteriorLook(delta) {
  // Auto-explore override: use AE yaw/pitch instead of keys
  if (this._aeActive) {
    const dir = new THREE.Vector3(
      Math.sin(this._aeYaw)   * Math.cos(this._aePitch),
      Math.sin(this._aePitch),
      -Math.cos(this._aeYaw)  * Math.cos(this._aePitch)
    )
    this.camera.position.copy(this._interiorBasePos)
    this.camera.lookAt(this._interiorBasePos.clone().add(dir))
    return
  }

  const lookSpeed = 1.2 * delta;

  if (this._keys.left)  this._yaw   += lookSpeed;
  if (this._keys.right) this._yaw   -= lookSpeed;
  if (this._keys.up)    this._pitch  = Math.min(this._pitch + lookSpeed, this._pitchMax);
  if (this._keys.down)  this._pitch  = Math.max(this._pitch - lookSpeed, this._pitchMin);

  // Build direction from yaw/pitch
  const dir = new THREE.Vector3(
    Math.sin(this._yaw) * Math.cos(this._pitch),
    Math.sin(this._pitch),
    -Math.cos(this._yaw) * Math.cos(this._pitch)
  );

  const lookTarget = this._interiorBasePos.clone().add(dir)
  this.camera.position.copy(this._interiorBasePos)
  this.camera.lookAt(lookTarget)

}


  // ── DID USER PRESS KEYS YET ───────────────────────────────
  // Used to hide the key hint HUD after first press
  get keysEverPressed() { return this._keysEverPressed }
}

// ── EASING ───────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}