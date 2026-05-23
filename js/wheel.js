// ═══════════════════════════════════════════════════════════
// wheel.js — Ferris wheel spin, attach point extraction,
//            cabin placement, sway physics, door animation
//
// HOW IT WORKS OVERALL:
// 1. We load the wheel GLB and find the 12 "attach_" empty objects
// 2. Each attach point gets a "pivot" group placed at its position
// 3. A cabin clone is added as a child of each pivot, hanging below it
// 4. Every frame, we rotate the wheelScene — all pivots rotate with it
// 5. Each cabin counter-rotates to stay upright (like a real gondola)
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { WHEEL, SWAY, CABINS, MODEL_SCALE } from './config.js'

// ── NOISE FUNCTIONS ──────────────────────────────────────────
// These generate smooth random numbers for organic cabin sway
// Think of it like a random wind generator that doesn't jump suddenly

// Raw noise — returns a pseudo-random value between -1 and 1 for any input t
function noise(t) {
  const s = Math.sin(t * 127.1) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

// Smooth noise — blends between two noise values so there are no sharp jumps
// This is what actually gets used for sway
function smoothNoise(t) {
  const i = Math.floor(t)       // integer part
  const f = t - i               // fractional part (0 to 1)
  const u = f * f * (3 - 2 * f) // smoothstep curve — eases in and out
  return noise(i) * (1 - u) + noise(i + 1) * u // blend between two noise values
}

// ═══════════════════════════════════════════════════════════
// FerrisWheel CLASS
// This is the main controller for everything wheel-related
// Create one instance of this and call .update(delta) every frame
// ═══════════════════════════════════════════════════════════
export class FerrisWheel {

  // ── CONSTRUCTOR ───────────────────────────────────────────
  // Called once when the wheel is first created
  // Receives the three loaded GLB scenes and the main Three.js scene
  constructor({ wheelScene, standScene, cabinTemplate, scene }) {
    this.wheelScene    = wheelScene     // the spinning wheel GLB (wheel-rails.glb)
    this.standScene    = standScene     // the static stand GLB (wheel-stand.glb)
    this.cabinTemplate = cabinTemplate  // the cabin GLB — gets cloned 6 times
    this.scene         = scene          // the main Three.js scene everything lives in

    // Rotation state
    this.wheelAngle    = 0              // current rotation in radians (increases every frame)
    this.spinSpeed     = WHEEL.spinSpeed // how fast it spins normally
    this.targetAngle   = null           // when a cabin is selected, this is the angle to spin to
    this.isSelecting   = false          // true while wheel is spinning to find a cabin

    // Storage arrays
    this.cabins        = []             // holds data for each cabin: { pivot, cabinClone, door, etc }
    this.attachPoints  = []             // holds the world positions of all 12 attach empties

    // Internal state
    this._swayTime     = 0              // time counter for sway noise (increases every frame)
    this._doorOpen     = false          // is the door currently open?
    this._doorTarget   = null           // which door mesh is being animated

    // Start everything up
    this._init()
  }

  // ── _init ─────────────────────────────────────────────────
  // Sets up the scene — adds models, finds attach points, places cabins
  // Called automatically by the constructor
  _init() {
    // Add both GLB scenes to the main Three.js scene so they render
    this.scene.add(this.standScene)
    this.scene.add(this.wheelScene)

    // IMPORTANT: force Three.js to calculate all world positions NOW
    // before we try to read them with getWorldPosition()
    // Without this, positions might be wrong or zero
    this.wheelScene.updateMatrixWorld(true)

    this._extractAttachPoints() // find where the cabins should hang
    this._placeCabins()         // create and position all 6 cabins
  }

  // ── _extractAttachPoints ──────────────────────────────────
  // Walks through every object in the wheel GLB
  // Finds anything named "attach_01" through "attach_12"
  // Saves their world positions so we know where to hang cabins
  _extractAttachPoints() {
    const found = []

    // traverse() visits every single object in the scene tree
    this.wheelScene.traverse((child) => {
      // We want objects named "attach_" but NOT "attach_bar_"
      // attach_ = the empty axes (position markers)
      // attach_bar_ = the actual bracket geometry (gets a material, not a cabin)
      if (
        child.name.startsWith('attach_') &&
        !child.name.startsWith('attach_bar')
      ) {
        const pos = new THREE.Vector3()
        child.getWorldPosition(pos) // gets position in world space (accounts for parent transforms)
        found.push({ name: child.name, position: pos.clone() })

        // ── DEBUG SPHERE ──
        // Red sphere placed at each attach point so we can see them
        // Remove these once cabin positioning is confirmed correct
        // To remove: call ferrisWheel.removeDebugSpheres() in the console
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(2, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        )
        sphere.position.copy(pos)
        sphere.name = 'debug_attach_sphere'
        //this.scene.add(sphere)
      }
    })

    if (found.length >= 6) {
      // Sort alphabetically so attach_01 = index 0, attach_02 = index 1, etc.
      found.sort((a, b) => a.name.localeCompare(b.name))
      this.attachPoints = found.map(f => f.position)
      console.log(`[Wheel] Found ${found.length} attach points:`,
        found.map(f => `${f.name}: ${f.position.x.toFixed(1)}, ${f.position.y.toFixed(1)}, ${f.position.z.toFixed(1)}`))
    } else {
      // Fallback: if empties didn't export, calculate positions mathematically
      console.warn(`[Wheel] Only found ${found.length} — falling back to math`)
      this._calculateAttachPointsMath()
    }
  }

  // ── _calculateAttachPointsMath ────────────────────────────
  // FALLBACK ONLY — used if attach empties didn't export from Blender
  // Calculates 12 evenly spaced points around the wheel rim
  // using the wheel's bounding box to find the radius
  _calculateAttachPointsMath() {
    const box    = new THREE.Box3().setFromObject(this.wheelScene)
    const size   = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Use the larger of X or Y as the radius
    // (Z is depth, not relevant for a flat wheel)
    const radius = Math.max(size.x, size.y) / 2

    console.log(`[Wheel] Math fallback — size: ${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}, radius: ${radius.toFixed(1)}`)

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 // evenly space 12 points around a circle
      this.attachPoints.push(new THREE.Vector3(
        center.x + Math.sin(angle) * radius,
        center.y + Math.cos(angle) * radius,
        center.z
      ))
    }
  }

  // ── _placeCabins ──────────────────────────────────────────
  // Creates one cabin clone per entry in the CABINS config array
  // Each cabin gets a "pivot" group at the attach point position
  // The cabin hangs below the pivot, so gravity counter-rotation works
  //
  // HIERARCHY:
  // wheelScene
  //   └── pivot (at attach point, rotates with wheel)
  //         └── cabinClone (offset downward, counter-rotates to stay upright)
  
// ───────────────────────────────────────────────────────────
// Extract door hinge empties + door mesh from a cabin clone
// Returns: { doorTop, doorBottom, doorMesh }
// ───────────────────────────────────────────────────────────
_extractDoorAxes(cabinClone) {
  let doorTop = null;
  let doorBottom = null;
  let doorMesh = null;

  cabinClone.traverse((child) => {
    // Hinge empties
    if (child.name === 'door_hinge_top') {
      doorTop = child;
    }
    if (child.name === 'door_hinge_bottom') {
      doorBottom = child;
    }

    // Door mesh — prefer "cabin_door_body" if present
    if (child.name.startsWith('cabin_door')) {
      if (!doorMesh || child.name === 'cabin_door_body') {
        doorMesh = child;
      }
    }
  });

  // If we found hinges + door, re-parent door under top hinge
  if (doorTop && doorMesh) {
    doorMesh.position.sub(doorTop.position);
    doorTop.add(doorMesh);
  }

  return { doorTop, doorBottom, doorMesh };
}
  _placeCabins() {
    CABINS.forEach((cabinConfig, i) => {
      const attachIndex = cabinConfig.attachIndex  // which of the 12 points to use (0,2,4,6,8,10 for 6 cabins)
      const attachPos   = this.attachPoints[attachIndex]
      
      if (!attachPos) {
        console.warn(`[Wheel] No attach point at index ${attachIndex}`)
        return
      }

      // Clone the cabin template — clone(true) means clone children too
      const cabinClone = this.cabinTemplate.clone(true)

      // ── POSITION THE PIVOT ──
      // The pivot must be in wheelScene's LOCAL coordinate space
      // because it's a child of wheelScene
      // The attach positions are in WORLD space (from getWorldPosition)
      // So we divide by MODEL_SCALE to convert back to local space
      // (wheelScene has scale 14.29 applied, so local = world / 14.29)
      const pivot = new THREE.Group()
      pivot.name  = `cabin_pivot_${i}`
      const localPos = this.wheelScene.worldToLocal(attachPos.clone())
      pivot.position.copy(localPos)
      
      // ── HANG THE CABIN ──
      // Offset the cabin downward from the pivot point
      // WHEEL.cabinHangOffset is negative (downward in Y)
      // Adjust this value in config.js if cabin is too high or too low
      cabinClone.position.set(0, 0, 0)

      // Add cabin to pivot, pivot to wheel
      pivot.add(cabinClone)
      this.wheelScene.add(pivot)
      const interiorViewpoint = cabinClone.getObjectByName("interior_viewpoint");
      // ─────────────────────────────────────────────
      // DEBUG: Verify interior_viewpoint empty
      // ─────────────────────────────────────────────
      if (!interiorViewpoint) {
        console.warn(
          `[Cabin ${i}] interior_viewpoint NOT FOUND. ` +
          `Check Blender: object must be named exactly "interior_viewpoint".`
        );
      } else {
        const wp = new THREE.Vector3();
        interiorViewpoint.getWorldPosition(wp);

        console.log(
          `%c[Cabin ${i}] interior_viewpoint FOUND`,
          "color: #4CAF50; font-weight: bold;"
        );
        console.log("   Local position:", interiorViewpoint.position);
        console.log("   World position:", wp);
        console.log("   Parent:", interiorViewpoint.parent?.name);
        console.log("   Cabin clone:", cabinClone.name);
      }
// ── EXTRACT SEAT EMPTIES ──────────────────────────────────
      const seatEmpties = {}
      cabinClone.traverse((child) => {
        if (
          child.name === 'cabin_chair_left_seat' ||
          child.name === 'cabin_chair_right_seat'
        ) {
          seatEmpties[child.name] = child  // store the Object3D reference
        }
      })

      if (!seatEmpties.cabin_chair_left_seat)  console.warn(`[Cabin ${i}] cabin_chair_left_seat not found`)
      if (!seatEmpties.cabin_chair_right_seat) console.warn(`[Cabin ${i}] cabin_chair_right_seat not found`)



      const interiorLight = new THREE.PointLight(
            '#ffb347',  // warm amber
            2.0,        // intensity
            15          // radius — contained inside cabin
          )
      interiorLight.position.copy(interiorViewpoint.position)
      cabinClone.add(interiorLight)
      
      const { doorTop, doorBottom, doorMesh } = this._extractDoorAxes(cabinClone);

      if (!doorMesh) {
        console.warn(`[Wheel] Cabin ${i} has no door mesh starting with "cabin_door"`);
      }
      if (!doorTop) {
        console.warn(`[Wheel] Cabin ${i} missing door_hinge_top`);
      }
      // ── SWAY STATE ──
      // Each cabin gets its own independent sway values
      // noiseOffset makes each cabin sway slightly differently
      // so they don't all rock in sync (looks unnatural)
      const swayData = {
        angle:       0,              // current sway angle in radians
        velocity:    0,              // current sway speed (decays over time due to damping)
        noiseOffset: Math.random() * 1000,     // unique random starting point in noise space
        noisePhase:  Math.random() * Math.PI * 2, // unique phase offset
      }

      // Store everything we need to update this cabin each frame
      this.cabins.push({ pivot, cabinClone, doorTop,doorBottom, doorMesh, config: cabinConfig, swayData, interiorViewpoint, seatEmpties, attachIndex })
    });
}

  // ── openDoor / closeDoor ──────────────────────────────────
  // Sets which door to animate and which direction
  // The actual animation happens in update() every frame
openDoor(cabinIndex) {
  const cabin = this.cabins[cabinIndex];
  if (!cabin || !cabin.doorTop || !cabin.doorMesh) return;

  this._doorTarget = cabin;   // store entire cabin reference
  this._doorOpen   = true;    // animate toward open position
}

closeDoor(cabinIndex) {
  const cabin = this.cabins[cabinIndex];
  if (!cabin || !cabin.doorTop || !cabin.doorMesh) return;

  this._doorTarget = cabin;
  this._doorOpen   = false;   // animate toward closed position
}

  // ── selectCabin ───────────────────────────────────────────
  // Spins the wheel to bring a specific cabin to the bottom (6 o'clock)
  // Returns a Promise that resolves when the cabin arrives
  // Usage: await ferrisWheel.selectCabin(2)
  selectCabin(cabinIndex) {
    return new Promise((resolve) => {
      const cabin = this.cabins[cabinIndex]
      if (!cabin) { resolve(); return }

      // Calculate what angle this cabin is currently at on the wheel
      const targetAttachAngle = (cabin.attachIndex / 12) * Math.PI * 2

      // 6 o'clock position = -PI/2 in standard math angles
      const bottomAngle = -Math.PI / 2

      // How far do we need to rotate to get there?
      let delta = bottomAngle - (this.wheelAngle + targetAttachAngle)

      // Normalize to [-PI, PI] so we always take the shortest path
      delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI

      this.targetAngle = this.wheelAngle + delta  // absolute angle to reach
      this.isSelecting = true                      // switch to seeking mode
      this._onArrived  = resolve                   // callback when done
      this.spinSpeed   = WHEEL.selectSpeedBoost    // spin faster while seeking
    })
  }

  // ── update ────────────────────────────────────────────────
  // Called EVERY FRAME from the animation loop in main.js
  // delta = time since last frame in seconds (usually ~0.016 at 60fps)
  // Everything time-based should multiply by delta for consistent speed
  update(delta) {
    this._swayTime += delta  // advance sway clock
    
    // ── SPIN THE WHEEL ──
    if (this.isSelecting && this.targetAngle !== null) {
      // SEEKING MODE: spin toward a specific target angle
      const remaining = Math.abs(this.targetAngle - this.wheelAngle)

      if (remaining < 0.01) {
        // Close enough — snap to exact target and stop seeking
        this.wheelAngle  = this.targetAngle
        this.targetAngle = null
        this.isSelecting = false
        this.spinSpeed   = WHEEL.spinSpeed  // back to normal speed
        if (this._onArrived) { this._onArrived(); this._onArrived = null } // resolve the Promise
      } else {
        // Ease in as we approach the target (slow down near the end)
        const ease = remaining < WHEEL.easeInDistance
          ? THREE.MathUtils.mapLinear(remaining, 0, WHEEL.easeInDistance, 0.01, this.spinSpeed)
          : this.spinSpeed
        this.wheelAngle += Math.sign(this.targetAngle - this.wheelAngle) * ease
      }
    } else {
      // FREE SPIN MODE: just keep rotating at constant speed
      this.wheelAngle += this.spinSpeed
    }

    // Apply the rotation to the wheel scene
    // rotation.z = spinning like a clock face (wheel faces camera)
    this.wheelScene.rotation.z = this.wheelAngle

    // ── SWAY — disabled for positioning debug ──
    // Uncomment this block once cabins are confirmed in the right positions
     //this.cabins.forEach((cabin) => { this._updateSway(cabin, delta) })

    // ── COUNTER-ROTATION ──
    // As the wheel rotates, each cabin rotates the OPPOSITE direction
    // Result: cabin always hangs straight down like a real gondola
    // Without this, cabins would spin around wildly with the wheel
    this.cabins.forEach((cabin) => {
      cabin.cabinClone.rotation.z = -this.wheelAngle
    })

    // ── DOOR ANIMATION ──
    // Smoothly lerp the door rotation toward open or closed target
    // lerp = linear interpolation: moves 6% closer to target each frame
    if (this._doorTarget) {
      const cabin = this._doorTarget;

      // Rotate around the hinge (doorTop)
      const hinge = cabin.doorTop;

      // Target rotation: open = 135°, closed = 0°
      const targetRot = this._doorOpen ? Math.PI * 0.75 : 0;

      hinge.rotation.y = THREE.MathUtils.lerp(
        hinge.rotation.y,
        targetRot,
        0.06
      );
    }
    
  }

  // ── _updateSway ───────────────────────────────────────────
  // PRESERVED but disabled — re-enable in update() after positioning is fixed
  //
  // Simulates wind + inertia sway on each cabin independently
  // Uses a spring/damper physics model:
  //   force pushes the cabin → velocity builds up → angle changes
  //   damping drains velocity over time so it settles back to center
  _updateSway(cabin, delta) {
    const sd = cabin.swayData

    // Wind force: slow-changing noise unique to this cabin
    const noiseForce    = smoothNoise(this._swayTime * 0.3 + sd.noiseOffset) * SWAY.noiseScale

    // Inertia force: faster the wheel spins, more the cabin swings outward
    const pendulumForce = this.spinSpeed * SWAY.pendulumStrength * 50

    // Combined force (scaled down so it's subtle)
    const force = (noiseForce + pendulumForce) * 0.001

    // Physics integration: force → velocity → angle
    sd.velocity += force
    sd.velocity *= SWAY.damping  // damping: multiply by <1 each frame to drain energy
    sd.angle    += sd.velocity

    // Clamp so cabin never swings more than maxAngle degrees
    sd.angle = THREE.MathUtils.clamp(sd.angle, -SWAY.maxAngle, SWAY.maxAngle)

    // Apply sway to the pivot (swings the whole cabin)
    cabin.pivot.rotation.z = sd.angle

    // Keep cabin upright despite both wheel rotation AND sway
    cabin.cabinClone.rotation.z = -this.wheelAngle
  }

  // ── removeDebugSpheres ────────────────────────────────────
  // Call this from the browser console once attach points look correct:
  //   ferrisWheel.removeDebugSpheres()
  // Finds all red debug spheres and removes them from the scene
  removeDebugSpheres() {
    const toRemove = []
    this.scene.traverse((child) => {
      if (child.name === 'debug_attach_sphere') toRemove.push(child)
    })
    toRemove.forEach(obj => this.scene.remove(obj))
    console.log(`[Wheel] Removed ${toRemove.length} debug spheres`)
  }

  // ── getCabinWorldPosition ─────────────────────────────────
  // Returns the world position of a cabin's 3D object
  // Used by the camera system to know where to fly to when entering a cabin
  getCabinWorldPosition(cabinIndex) {
    const cabin = this.cabins[cabinIndex]
    if (!cabin) return new THREE.Vector3()
    const pos = new THREE.Vector3()
    cabin.cabinClone.getWorldPosition(pos)
    return pos
  }

  // ── getCabinMeshes ────────────────────────────────────────
  // Returns an array of all cabin 3D objects
  // Used by the raycaster in main.js to detect mouse clicks on cabins
  getCabinMeshes() {
    return this.cabins.map(c => c.cabinClone)
  }
}