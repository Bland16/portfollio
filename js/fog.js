// ═══════════════════════════════════════════════════════════
// fog.js — Particle-based cartoon fog system
//   - Dense fog at ground level
//   - Whispy atmospheric fog through upper wheel
//   - Drifts over time like slow clouds
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { FOG } from './config.js'

export class FogSystem {
  constructor({ scene }) {
    this.scene    = scene
    this._time    = 0
    this._systems = []

    this._createGroundFog()
    this._createAtmosphericFog()
    this._addSceneFog()
  }

  // ── SCENE-LEVEL FOG ───────────────────────────────────────
  // Three.js built-in exponential fog for depth
  _addSceneFog() {
    this.scene.fog = new THREE.FogExp2(
      new THREE.Color(FOG.color),
      0.0003  // scaled down density — scene is 14x larger
    )
  }

  // ── GROUND FOG (dense, low) ───────────────────────────────
  _createGroundFog() {
    const count  = FOG.groundParticleCount
    const geo    = new THREE.BufferGeometry()
    const pos    = new Float32Array(count * 3)
    const scales = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * FOG.spread
      pos[i * 3 + 1] = FOG.groundHeight + Math.random() * (1.5 * 14.29)
      pos[i * 3 + 2] = (Math.random() - 0.5) * FOG.spread
      scales[i]       = 0.5 + Math.random() * 2     // varied sizes
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    // Soft circular sprite for each fog particle
    const canvas  = document.createElement('canvas')
    canvas.width  = 64
    canvas.height = 64
    const ctx     = canvas.getContext('2d')
    const grad    = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0,   'rgba(212, 197, 232, 0.35)')
    grad.addColorStop(0.4, 'rgba(212, 197, 232, 0.12)')
    grad.addColorStop(1,   'rgba(212, 197, 232, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)

    const texture = new THREE.CanvasTexture(canvas)

    const mat = new THREE.PointsMaterial({
      map:          texture,
      size:         3.5 * 14.29,
      sizeAttenuation: true,
      transparent:  true,
      opacity:      0.28,
      depthWrite:   false,
      blending:     THREE.AdditiveBlending,
      color:        new THREE.Color(FOG.color),
    })

    const points = new THREE.Points(geo, mat)
    points.name  = 'fog_ground'
    this.scene.add(points)

    this._systems.push({
      points,
      positions: pos,
      baseY:     FOG.groundHeight,
      type:      'ground',
      baseOpacity:0.28,
    })
  }

  // ── ATMOSPHERIC FOG (whispy, upper) ──────────────────────
  _createAtmosphericFog() {
    const count = 200
    const geo   = new THREE.BufferGeometry()
    const pos   = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 30 * 14.29
      pos[i * 3 + 1] = (Math.random() * 16) * 14.29-1
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 * 14.29
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    const mat = new THREE.PointsMaterial({
      size:         7 * 14.29,
      sizeAttenuation: true,
      transparent:  true,
      opacity:      FOG.upperOpacity,
      depthWrite:   false,
      blending:     THREE.AdditiveBlending,
      color:        new THREE.Color('#d4d8ff'),
    })

    const points = new THREE.Points(geo, mat)
    points.name  = 'fog_atmospheric'
    this.scene.add(points)

    this._systems.push({
      points,
      positions: pos,
      type:      'atmospheric',
      baseOpacity: FOG.upperOpacity,
    })
  }

  // ── UPDATE (call every frame) ──────────────────────────────
  update(delta) {
    this._time += delta

    this._systems.forEach((sys) => {
      const pos   = sys.positions
      const count = pos.length / 3

      for (let i = 0; i < count; i++) {
        // Drift each particle slowly
        pos[i * 3 + 0] += Math.sin(this._time * 0.1 + i * 0.5) * FOG.driftSpeed
        pos[i * 3 + 2] += Math.cos(this._time * 0.08 + i * 0.7) * FOG.driftSpeed

        // Gentle bob on Y for ground fog
        if (sys.type === 'ground') {
          pos[i * 3 + 1] = sys.baseY
            + Math.sin(this._time * 0.2 + i * 1.3) * 0.3
            + Math.random() * 0.01 // tiny jitter
        }

        // Wrap particles that drift too far
        if (Math.abs(pos[i * 3 + 0]) > 22 * 14.29) pos[i * 3 + 0] *= -0.9
        if (Math.abs(pos[i * 3 + 2]) > 22 * 14.29) pos[i * 3 + 2] *= -0.9
      }

      sys.points.geometry.attributes.position.needsUpdate = true
    })
  }

  // ── VIBE ADAPTER — called by vibes.js ─────────────────────

  /**
   * Update the tint colour of all particle systems and the scene fog.
   * @param {string} hex  e.g. '#c8b8e8'
   */
  setColor(hex) {
    const color = new THREE.Color(hex)
    this._systems.forEach(sys => {
      if (sys.points.material) sys.points.material.color.set(color)
    })
    if (this.scene.fog) this.scene.fog.color.set(color)
  }

  /**
   * Fade the particle opacity for all systems (0 = invisible, 1 = full).
   * Scene-level FogExp2 density is intentionally left alone — it's subtle
   * and distance-based, so opacity changes alone read as a fog swell.
   * @param {number} opacity  0 – 1
   */
  setOpacity(opacity) {
    this._systems.forEach(sys => {
      if (sys.points.material) {
        sys.points.material.opacity = sys.baseOpacity * opacity
      }
    })
  }
}