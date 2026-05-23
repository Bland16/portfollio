// ═══════════════════════════════════════════════════════════
// materials.js — Applies materials to GLB meshes by name prefix
// All color logic lives here. config.js holds the color values.
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { MATERIALS } from './config.js'

// ── BUILD MATERIAL CACHE ─────────────────────────────────────
// Pre-build Three.js materials from config so they're reused
// across all cabin instances (not recreated per mesh)
const materialCache = {}

function getMaterial(key) {
  if (materialCache[key]) return materialCache[key]

  const cfg = MATERIALS[key]
  if (!cfg) return null

  const mat = new THREE.MeshStandardMaterial({
    color:            new THREE.Color(cfg.color),
    metalness:        cfg.metalness  ?? 0,
    roughness:        cfg.roughness  ?? 0.5,
    transparent:      cfg.transparent ?? false,
    opacity:          cfg.opacity    ?? 1.0,
  })

  if (cfg.emissive) {
    mat.emissive = new THREE.Color(cfg.emissive)
    mat.emissiveIntensity = cfg.emissiveIntensity ?? 0
  }

  materialCache[key] = mat
  return mat
}

// ── RESOLVE MATERIAL KEY FROM MESH NAME ─────────────────────
// Order matters — more specific prefixes must come first
function resolveMaterialKey(name) {
  // ── CABIN DOOR (most specific first) ──
  if (name.startsWith('cabin_door_trim_red'))   return 'cabin_door_trim_red'
  if (name.startsWith('cabin_door_trim'))        return 'cabin_door_trim'
  if (name.startsWith('cabin_door_handle'))      return 'cabin_door_handle'
  if (name.startsWith('cabin_door_bar'))         return 'cabin_door_bar'
  if (name.startsWith('cabin_door_base'))        return 'cabin_door_base'
  if (name.startsWith('cabin_door_body'))        return 'cabin_door_body'
  if (name.startsWith('cabin_door'))             return 'cabin_door_body' // fallback

  // ── CABIN TRIM (specific before general) ──
  if (name.startsWith('cabin_trim_window_ext'))  return 'cabin_trim_window_ext'
  if (name.startsWith('cabin_trim_window_int'))  return 'cabin_trim_window_int'
  if (name.startsWith('cabin_trim'))             return 'cabin_trim'

  // ── CABIN OTHER ──
  if (name.startsWith('cabin_window'))           return 'cabin_window'
  if (name.startsWith('cabin_seat'))             return 'cabin_seat'
  if (name.startsWith('cabin_roof'))             return 'cabin_roof'
  if (name.startsWith('cabin_floor'))            return 'cabin_floor'
  if (name.startsWith('cabin_hook'))             return 'cabin_hook'
  if (name.startsWith('cabin_body'))             return 'cabin_body'

  // ── WHEEL ──
  if (name.startsWith('wheel_rim_front'))        return 'wheel_rim_front'
  if (name.startsWith('attach_bar'))             return 'attach_bar'
  if (name.startsWith('Body'))                   return 'wheel_body'   // Blender auto-names

  // ── STAND ──
  if (name.startsWith('stand_axle'))             return 'stand_axle'
  if (name.startsWith('stand_'))                 return 'stand_body'

  // ── BOOTH ──
  // Front accent stripes — alternate with body stripes
  if (name.startsWith('booth_front-stripe')) {
    const n = parseInt(name.replace('booth_front-stripe_', ''), 10)
    return (n % 2 === 1) ? 'booth_stripe_a' : 'booth_stripe_b'
  }
  // Side body stripes — odd = dark purple, even = deep maroon
  if (name.startsWith('booth_stripe')) {
    const n = parseInt(name.replace('booth_stripe_', ''), 10)
    return (n % 2 === 1) ? 'booth_stripe_a' : 'booth_stripe_b'
  }
  // Front bar (horizontal gold accent rail)
  if (name.startsWith('booth_front_bar'))        return 'cabin_trim'
  // Ledge — top cap is gold trim, bottom base is cream
  if (name.startsWith('booth_ledge_top'))        return 'cabin_trim'
  if (name.startsWith('booth_ledge_bottom'))     return 'cabin_body'
  // Sign — dark base panel, cream embossed letters
  if (name.startsWith('booth_sign-base'))        return 'cabin_door_base'
  if (name.startsWith('booth_letter'))           return 'cabin_body'
  // Roof — dark rounded canopy matches cabin_door_base
  if (name.startsWith('booth_roof'))             return 'cabin_door_base'
  // Fallback — any remaining booth geometry gets cream body colour
  if (name.startsWith('booth_'))                 return 'cabin_body'

  return null // unknown — leave original material
}

// ── APPLY MATERIALS TO A LOADED GLB ─────────────────────────
// Call this after loading any GLB file
// Returns a Map of { meshName → material } for reference
export function applyMaterials(gltfScene) {
  const applied = new Map()

  gltfScene.traverse((child) => {
    if (!child.isMesh) return

    const key = resolveMaterialKey(child.name)
    if (!key) return

    const mat = getMaterial(key)
    if (!mat) return

    child.material = mat
    child.castShadow = true
    child.receiveShadow = true
    applied.set(child.name, key)
  })

  return applied
}

// ── FIND DOOR MESH ───────────────────────────────────────────
// Returns the door Object3D from a cabin scene
export function findDoor(cabinScene) {
  let door = null
  cabinScene.traverse((child) => {
    if (child.isMesh && child.name.startsWith('cabin_door')) {
      // Prefer cabin_door_body as the root animatable piece
      // (the whole door group animates together)
      if (!door || child.name === 'cabin_door_body') {
        door = child
      }
    }
  })
  return door
}

// ── FIND HOOK ────────────────────────────────────────────────
// Returns the hook Object3D — this is the pivot point for cabin hanging
export function findHook(cabinScene) {
  let hook = null
  cabinScene.traverse((child) => {
    if (child.name.startsWith('cabin_hook')) {
      hook = child
    }
  })
  return hook
}

// ── SET STAND OPACITY ────────────────────────────────────────
// Used when entering/exiting cabin to fade stand
export function setStandOpacity(standScene, opacity) {
  standScene.traverse((child) => {
    if (!child.isMesh) return
    child.material = child.material.clone() // don't mutate shared material
    child.material.transparent = opacity < 1
    child.material.opacity = opacity
  })
}
// ── applyItemGlow ─────────────────────────────────────────────────────────
// Called on each loaded item GLB to inject emissive properties.
// Bright saturated surfaces bloom; dark surfaces just catch light.
export function applyItemGlow(scene, glowColor) {
  const target = new THREE.Color(glowColor)

  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const mats = Array.isArray(child.material)
      ? child.material
      : [child.material]

    mats.forEach((mat) => {
      if (!mat.color) return

      const c          = mat.color
      const brightness = c.r * 0.299 + c.g * 0.587 + c.b * 0.114
      const saturation = Math.max(
        Math.abs(c.r - c.g),
        Math.abs(c.g - c.b),
        Math.abs(c.r - c.b)
      )

      if (brightness > 0.6 && saturation > 0.25) {
        // Bright saturated surface → strong bloom candidate
        mat.emissive          = c.clone()
        mat.emissiveIntensity = 0.8
        mat.userData.isGlow   = true
      } else if (saturation > 0.15) {
        // Mildly saturated → subtle ambient shimmer in the glow colour
        mat.emissive          = target.clone()
        mat.emissiveIntensity = 0.15
        mat.userData.isSubtle = true
      }
      mat.needsUpdate = true
    })
  })
}