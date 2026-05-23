// ═══════════════════════════════════════════════════════════
// lighting.js — Scene lighting setup
//   - Ambient (deep purple)
//   - Moon directional (cool blue)
//   - Warm fill (amber, simulates cabin window glow)
//   - Point lights at attach points (warm carnival glow)
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { LIGHTS } from './config.js'

export function setupLighting(scene) {
  // ── AMBIENT ───────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(
    new THREE.Color(LIGHTS.ambientColor),
    LIGHTS.ambientIntensity
  )
  scene.add(ambient)

  // ── MOON (main directional) ───────────────────────────────
  const moon = new THREE.DirectionalLight(
    new THREE.Color(LIGHTS.moonColor),
    LIGHTS.moonIntensity
  )
  moon.position.set(...LIGHTS.moonPosition)
  moon.castShadow            = true
  moon.shadow.mapSize.width  = 2048
  moon.shadow.mapSize.height = 2048
  moon.shadow.camera.near    = 0.5
  moon.shadow.camera.far     = 1000
  moon.shadow.camera.left    = -300
  moon.shadow.camera.right   = 300
  moon.shadow.camera.top     = 300
  moon.shadow.camera.bottom  = -300
  moon.shadow.bias           = -0.001
  scene.add(moon)

  // ── WARM FILL ─────────────────────────────────────────────
  // Simulates warm amber glow from cabin windows
  const warmFill = new THREE.PointLight(
    new THREE.Color(LIGHTS.warmFillColor),
    LIGHTS.warmFillIntensity,
    360
  )
  warmFill.position.set(0, 0, 57)
  scene.add(warmFill)

  // ── RIM LIGHT ─────────────────────────────────────────────
  // Back-lights the wheel from behind for silhouette
  const rim = new THREE.DirectionalLight(
    new THREE.Color(LIGHTS.rimColor),
    0.3
  )
  rim.position.set(0, 71, -214)
  scene.add(rim)

  return { ambient, moon, warmFill, rim }
}

// ── ATTACH POINT LIGHTS ───────────────────────────────────
// Call after attach points are extracted from wheel
// Places a small warm point light at each cabin attachment bracket
export function addAttachPointLights(scene, attachPositions) {
  const lights = []

  attachPositions.forEach((pos) => {
    const light = new THREE.PointLight(
      new THREE.Color('#ffb347'),
      1.6,
      43  // 3 * 14.29
    )
    light.position.copy(pos)
    scene.add(light)
    lights.push(light)
  })

  return lights
}

