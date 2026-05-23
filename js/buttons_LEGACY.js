// ═══════════════════════════════════════════════════════════
// buttons.js — 3D physical navigation bar
//
// Exports:  initButtons(options)
//           → { update, knob, buttonGroup }
//
// Options:
//   scene, camera, renderer, domElement   — Three.js refs
//   onRobotNav(void)                      — forwarded to buttonFunctions
//   onSkillsOpen(void)                    — forwarded to buttonFunctions
//   onVolumeChange(value: 0-1)            — called on every knob change
//   pdfPath(string)                       — forwarded to buttonFunctions
//
// Vibe keycap:
//   A single  models/buttons/keycap_vibes.glb  is loaded once.
//   On each vibe cycle the mesh materials are recoloured in-place
//   using VIBE_KEYCAP_COLORS — no GLB swap, no network request
//   after first load.
//
// Blender mesh names expected inside keycap_vibes.glb:
//   keycap_vibes_body             flat top face of the cap
//   keycap_vibes_base             button base / stem underside
//   keycap_vibes_palette          raised palette fill
//   keycap_vibes_palette_outline  border ridge(s) — prefix-matched, so
//                                 _outline_1, _outline_2 etc. all resolve here
//   keycap_vibes_dot_a            paint blob — circle 1
//   keycap_vibes_dot_b            paint blob — circle 2
//   keycap_vibes_dot_c            paint blob — circle 3
//   keycap_vibes_dot_d            paint blob — circle 4
//   keycap_vibes_mix              curved swoosh / mixing-area
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MATERIALS } from './config.js'
import {
  handleRobotClick,
  handleSkillsClick,
  handleVibeCycle,
  handlePDFClick,
  initButtonCallbacks,
} from './buttonFunctions.js'


// ─────────────────────────────────────────────────────────────
// VIBE CYCLE ORDER
// Must match VIBE_KEYS in vibes.js — change both together.
// ─────────────────────────────────────────────────────────────

const VIBE_NAMES = [
  'suave',
  'pastel',
  'midnight_arcade',
  'carnival',
  'noir',
  'blueprint',
  'aurora'
]

// Starts at 1 so the keycap loads showing carnival as a preview
// of what the first click will switch to from the default 'suave'.
let currentVibeIndex = 1


// ─────────────────────────────────────────────────────────────
// VIBE KEYCAP COLOUR TABLE
//
// Each entry maps to a named mesh inside keycap_vibes.glb.
//   color         — base albedo  (required)
//   emissive      — emissive tint (omit to disable)
//   emissiveInt   — emissive intensity multiplier (default 0)
//
// The keycap always shows the NEXT vibe as a preview.
// Colours are applied immediately; the full scene transition is
// driven separately by vibes.js / handleVibeCycle.
// ─────────────────────────────────────────────────────────────

const VIBE_KEYCAP_COLORS = {

  suave: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#4a4538' },
    keycap_vibes_palette:          { color: '#c9a84c', emissive: '#c9a84c', emissiveInt: 0.15 },
    keycap_vibes_palette_outline:  { color: '#8b7536', emissive: '#8b7536', emissiveInt: 0.08 },
    keycap_vibes_dot_a:            { color: '#4488ff', emissive: '#4488ff', emissiveInt: 0.50 },
    keycap_vibes_dot_b:            { color: '#8855ff', emissive: '#8855ff', emissiveInt: 0.50 },
    keycap_vibes_dot_c:            { color: '#c9a84c', emissive: '#c9a84c', emissiveInt: 0.30 },
    keycap_vibes_dot_d:            { color: '#8b1a1a', emissive: '#8b1a1a', emissiveInt: 0.20 },
    keycap_vibes_mix:              { color: '#f0e6cc' },
  },

  carnival: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#4a2a18' },
    keycap_vibes_palette:          { color: '#ec500d', emissive: '#ec500d', emissiveInt: 0.20 },
    keycap_vibes_palette_outline:  { color: '#a33008', emissive: '#a33008', emissiveInt: 0.10 },
    keycap_vibes_dot_a:            { color: '#ff3366', emissive: '#ff3366', emissiveInt: 0.55 },
    keycap_vibes_dot_b:            { color: '#ffcc00', emissive: '#ffcc00', emissiveInt: 0.40 },
    keycap_vibes_dot_c:            { color: '#00cc66', emissive: '#00cc66', emissiveInt: 0.40 },
    keycap_vibes_dot_d:            { color: '#3366ff', emissive: '#3366ff', emissiveInt: 0.40 },
    keycap_vibes_mix:              { color: '#ff99cc' },
  },

  noir: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#2e2e2e' },
    keycap_vibes_palette:          { color: '#888888' },
    keycap_vibes_palette_outline:  { color: '#333333' },
    keycap_vibes_dot_a:            { color: '#ffffff', emissive: '#ffffff', emissiveInt: 0.10 },
    keycap_vibes_dot_b:            { color: '#cccccc' },
    keycap_vibes_dot_c:            { color: '#999999' },
    keycap_vibes_dot_d:            { color: '#444444' },
    keycap_vibes_mix:              { color: '#d8d8d8' },
  },

  blueprint: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#1e2e44' },
    keycap_vibes_palette:          { color: '#4488cc', emissive: '#4488cc', emissiveInt: 0.25 },
    keycap_vibes_palette_outline:  { color: '#aaccff', emissive: '#aaccff', emissiveInt: 0.15 },
    keycap_vibes_dot_a:            { color: '#ffffff', emissive: '#ffffff', emissiveInt: 0.35 },
    keycap_vibes_dot_b:            { color: '#88aaff', emissive: '#88aaff', emissiveInt: 0.35 },
    keycap_vibes_dot_c:            { color: '#4488cc', emissive: '#4488cc', emissiveInt: 0.25 },
    keycap_vibes_dot_d:            { color: '#2255aa', emissive: '#2255aa', emissiveInt: 0.15 },
    keycap_vibes_mix:              { color: '#aaccff', emissive: '#aaccff', emissiveInt: 0.10 },
  },

  midnight_arcade: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#1a0a2e' },
    keycap_vibes_palette:          { color: '#ff00ff', emissive: '#ff00ff', emissiveInt: 0.60 },
    keycap_vibes_palette_outline:  { color: '#00ffff', emissive: '#00ffff', emissiveInt: 0.50 },
    keycap_vibes_dot_a:            { color: '#ff0066', emissive: '#ff0066', emissiveInt: 0.80 },
    keycap_vibes_dot_b:            { color: '#ffcc00', emissive: '#ffcc00', emissiveInt: 0.80 },
    keycap_vibes_dot_c:            { color: '#00ff88', emissive: '#00ff88', emissiveInt: 0.80 },
    keycap_vibes_dot_d:            { color: '#ff6600', emissive: '#ff6600', emissiveInt: 0.80 },
    keycap_vibes_mix:              { color: '#0088ff', emissive: '#0088ff', emissiveInt: 0.40 },
  },

  pop_art: {
    keycap_vibes_body:             { color: '#dcdad4' },
    keycap_vibes_base:             { color: '#3a1a22' },
    keycap_vibes_palette:          { color: '#ff2244', emissive: '#ff2244', emissiveInt: 0.20 },
    keycap_vibes_palette_outline:  { color: '#1a1a1a' },
    keycap_vibes_dot_a:            { color: '#ff2244', emissive: '#ff2244', emissiveInt: 0.50 },
    keycap_vibes_dot_b:            { color: '#0033cc', emissive: '#0033cc', emissiveInt: 0.50 },
    keycap_vibes_dot_c:            { color: '#ffdd00', emissive: '#ffdd00', emissiveInt: 0.40 },
    keycap_vibes_dot_d:            { color: '#ff6600', emissive: '#ff6600', emissiveInt: 0.40 },
    keycap_vibes_mix:              { color: '#ff99bb' },
  },
}


// ─────────────────────────────────────────────────────────────
// KEYCAP MATERIAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Strip Blender's auto-appended duplicate suffix (.001, _001, etc.)
 * so mesh names match the VIBE_KEYCAP_COLORS keys exactly.
 * e.g.  "keycap_vibes_dot_a.001"  →  "keycap_vibes_dot_a"
 */
function _stripBlenderSuffix(name) {
  return name.replace(/[._]\d{3}$/, '')
}

/**
 * Run once after the vibe GLB loads.
 * Clones each mesh's material so they can all be recoloured
 * independently without sharing state.
 */
function _initVibeKeycapMaterials(keycapScene) {
  keycapScene.traverse((child) => {
    if (!child.isMesh) return
    child.material = child.material.clone()
    child.castShadow    = true
    child.receiveShadow = true
    // Ensure emissive channel exists (it does on MeshStandardMaterial
    // but this guards against simpler material types)
    if (!child.material.emissive) {
      child.material.emissive = new THREE.Color(0x000000)
    }
  })
}

/**
 * Traverse the keycap scene and apply a vibe's colour palette.
 * Instant — no async work, no allocation beyond Color.set().
 *
 * @param {string}         vibeName    — key in VIBE_KEYCAP_COLORS
 * @param {THREE.Object3D} keycapScene — root of the loaded GLB
 */
function _applyVibeKeycapColors(vibeName, keycapScene) {
  const palette     = VIBE_KEYCAP_COLORS[vibeName]
  if (!palette || !keycapScene) return

  const paletteKeys = Object.keys(palette)

  keycapScene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const key = _stripBlenderSuffix(child.name)
    // Exact match first; fall back to prefix match so e.g.
    // keycap_vibes_palette_outline_2 resolves to keycap_vibes_palette_outline.
    const resolvedKey = paletteKeys.find(k => key === k || key.startsWith(k + '_'))
    const entry       = resolvedKey ? palette[resolvedKey] : null
    if (!entry) return

    child.material.color.set(entry.color)

    if (child.material.emissive) {
      if (entry.emissive) {
        child.material.emissive.set(entry.emissive)
        child.material.emissiveIntensity = entry.emissiveInt ?? 0
      } else {
        child.material.emissive.set('#000000')
        child.material.emissiveIntensity = 0
      }
    }
  })
}


// ─────────────────────────────────────────────────────────────
// BUTTON DEFINITIONS
// ─────────────────────────────────────────────────────────────

const BUTTON_DEFS = [
  {
    id:      'robot',
    label:   'Robot',
    keycap:  'models/buttons/keycap_robot.glb',
    onClick: handleRobotClick,
  },
  {
    id:      'skills',
    label:   'Skills',
    keycap:  'models/buttons/keycap_skills.glb',   // falls back to procedural housing if missing
    onClick: handleSkillsClick,
  },
  {
    id:      'vibe',
    label:   'Vibe',
    keycap:  'models/buttons/keycap_vibes.glb',   // single file, recoloured at runtime
    onClick: handleVibeCycle,
  },
  {
    id:      'pdf',
    label:   'PDF',
    keycap:  'models/buttons/keycap_pdf.glb',
    onClick: handlePDFClick,
  },
]


// ─────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────

const BTN_SPACING = 2.2
//const KNOB_GAP    = 3.4
const ROW_START_X = -((BUTTON_DEFS.length - 1) * BTN_SPACING) / 2


// ─────────────────────────────────────────────────────────────
// PRESS ANIMATION
// ─────────────────────────────────────────────────────────────

const PRESS_DEPTH  = 0.22
const PRESS_SPRING = 14

const pressStates = new Map()

function tickPressAnimations(delta) {
  for (const [, state] of pressStates) {
    if (!state.keycapRoot) continue
    const targetZ = state.pressing ? -PRESS_DEPTH : 0
    const diff    = targetZ - state.keycapRoot.position.z
    state.keycapRoot.position.z += diff * Math.min(1, PRESS_SPRING * delta)
  }
}


// ─────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────

let _tooltipEl = null

function _ensureTooltip() {
  if (_tooltipEl) return _tooltipEl
  const el = document.createElement('div')
  el.id = 'btn3d-tooltip'
  Object.assign(el.style, {
    position:      'fixed',
    pointerEvents: 'none',
    background:    '#f7f6f3',
    color:         '#1c1c1c',
    fontFamily:    '"SF Pro Text", "Segoe UI", system-ui, sans-serif',
    fontSize:      '11.5px',
    fontWeight:    '500',
    letterSpacing: '0.04em',
    padding:       '5px 11px',
    borderRadius:  '7px',
    boxShadow:     '0 2px 12px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)',
    opacity:       '0',
    transform:     'translateY(2px)',
    transition:    'opacity 0.12s ease, transform 0.12s ease',
    zIndex:        '10000',
    whiteSpace:    'nowrap',
    userSelect:    'none',
  })
  document.body.appendChild(el)
  _tooltipEl = el
  return el
}

function _showTooltip(label, clientX, clientY) {
  const el = _ensureTooltip()
  el.textContent     = label
  el.style.left      = `${clientX + 16}px`
  el.style.top       = `${clientY - 34}px`
  el.style.opacity   = '1'
  el.style.transform = 'translateY(0)'
}

function _hideTooltip() {
  if (!_tooltipEl) return
  _tooltipEl.style.opacity   = '0'
  _tooltipEl.style.transform = 'translateY(2px)'
}


// ─────────────────────────────────────────────────────────────
// MATERIAL HELPERS
// ─────────────────────────────────────────────────────────────

function _makeHousingMaterial() {
  const cfg = MATERIALS.cabin_floor ?? {}
  return new THREE.MeshStandardMaterial({
    color:     new THREE.Color(cfg.color     ?? '#1e1e1e'),
    metalness: cfg.metalness ?? 0.75,
    roughness: cfg.roughness ?? 0.40,
  })
}

function _makeKeycapMaterial() {
  return new THREE.MeshStandardMaterial({
    color:     new THREE.Color('#dcdad4'),
    metalness: 0.08,
    roughness: 0.62,
  })
}

function _applyMatToScene(gltfScene, mat) {
  gltfScene.traverse((child) => {
    if (!child.isMesh) return
    child.material      = mat
    child.castShadow    = true
    child.receiveShadow = true
  })
}


// ─────────────────────────────────────────────────────────────
// VOLUME KNOB CLASS
// ─────────────────────────────────────────────────────────────

class VolumeKnob {
  constructor(parentGroup, loader, position, onChange) {
    this.value        = 0.5
    this._parentGroup = parentGroup
    this._loader      = loader
    this._onChange    = onChange ?? null

    this.group = new THREE.Group()
    this.group.position.set(...position)
    parentGroup.add(this.group)

    this._dialScene    = null
    this._housingScene = null

    this._setupArcCanvas()
    this._buildArcMesh()
    this._loadGLBs()
  }

  _loadGLBs() {
    const housingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e0ddd8'), metalness: 0.25, roughness: 0.55,
    })
    const dialMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c6c4be'), metalness: 0.65, roughness: 0.28,
    })
    this._loader.load('models/buttons/volume_knob_housing.glb', (gltf) => {
      this._housingScene = gltf.scene
      _applyMatToScene(this._housingScene, housingMat)
      this.group.add(this._housingScene)
    })
    this._loader.load('models/buttons/volume_knob_dial.glb', (gltf) => {
      this._dialScene = gltf.scene
      _applyMatToScene(this._dialScene, dialMat)
      this.group.add(this._dialScene)
      this._updateDialRotation()
    })
  }

  _setupArcCanvas() {
    this._arcCanvas        = document.createElement('canvas')
    this._arcCanvas.width  = 256
    this._arcCanvas.height = 256
    this._arcCtx           = this._arcCanvas.getContext('2d')
    this._arcTex           = new THREE.CanvasTexture(this._arcCanvas)
  }

  _buildArcMesh() {
    const geo = new THREE.PlaneGeometry(2.0, 2.0)
    const mat = new THREE.MeshBasicMaterial({
      map: this._arcTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
    this._arcMesh = new THREE.Mesh(geo, mat)
    this._arcMesh.rotation.x = -Math.PI / 2
    this._arcMesh.position.set(0, -0.02, 0)
    this.group.add(this._arcMesh)
    this._drawArc()
  }

  _drawArc() {
    const ctx = this._arcCtx
    const S   = this._arcCanvas.width
    const cx  = S / 2
    const cy  = S / 2
    const r   = S * 0.37

    ctx.clearRect(0, 0, S, S)

    const startAngle = (225 * Math.PI) / 180
    const totalArc   = Math.PI * 2 - (Math.PI / 2)

    ctx.beginPath()
    ctx.arc(cx, cy, r, startAngle, startAngle + totalArc)
    ctx.strokeStyle = 'rgba(150,148,140,0.30)'
    ctx.lineWidth   = 14
    ctx.lineCap     = 'round'
    ctx.stroke()

    if (this.value > 0.005) {
      const fillEnd = startAngle + totalArc * this.value
      const hue     = 30 + this.value * 155
      const lum     = 55 + this.value * 10

      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillEnd)
      ctx.strokeStyle = `hsl(${hue}, 88%, ${lum}%)`
      ctx.lineWidth   = 14
      ctx.lineCap     = 'round'
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(cx, cy, r, startAngle, fillEnd)
      ctx.strokeStyle = `hsla(${hue}, 100%, ${lum + 12}%, 0.28)`
      ctx.lineWidth   = 26
      ctx.lineCap     = 'round'
      ctx.stroke()

      const tipX = cx + r * Math.cos(fillEnd)
      const tipY = cy + r * Math.sin(fillEnd)
      ctx.beginPath()
      ctx.arc(tipX, tipY, 6, 0, Math.PI * 2)
      ctx.fillStyle = `hsl(${hue}, 92%, ${lum + 15}%)`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }

    ctx.font         = `bold ${Math.round(S * 0.09)}px "SF Pro Text", system-ui`
    ctx.fillStyle    = 'rgba(100,98,92,0.70)'
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GLOW', cx, cy)

    this._arcTex.needsUpdate = true
  }

  _updateDialRotation() {
    if (!this._dialScene) return
    this._dialScene.rotation.y = (this.value - 0.5) * (Math.PI * 1.5)
  }

  setValue(v) {
    this.value = Math.max(0, Math.min(1, v))
    this._updateDialRotation()
    this._drawArc()
    this._onChange?.(this.value)
  }

  nudge(delta) { this.setValue(this.value + delta) }
}


// ─────────────────────────────────────────────────────────────
// VIBE KEYCAP CYCLE
// No GLB swap — recolour the single keycap_vibes.glb in place.
// ─────────────────────────────────────────────────────────────

/**
 * Advance the preview index and recolour the keycap.
 *
 * Click timeline:
 *   Before click  — keycap shows vibe N+1 (preview of next active)
 *   User clicks   — vibes.js activates N+1 via handleVibeCycle
 *   After click   — keycap advances to show N+2 as the new preview
 *
 * Both trackers (buttons.js currentVibeIndex and vibes.js internal
 * index) start aligned and advance by 1 per click, so they stay
 * in sync without any cross-module communication needed.
 */
function _cycleVibeKeycap(vibeEntry) {
  currentVibeIndex = (currentVibeIndex + 1) % VIBE_NAMES.length
  if (vibeEntry.keycapScene) {
    _applyVibeKeycapColors(VIBE_NAMES[currentVibeIndex], vibeEntry.keycapScene)
  }
}


// ─────────────────────────────────────────────────────────────
// initButtons — PUBLIC EXPORT
// ─────────────────────────────────────────────────────────────

export function initButtons({
  scene,
  camera,
  renderer,
  domElement,
  onRobotNav,
  onSkillsOpen,
  onEmissionChange,
  onPortfolioOpen,
  onVibeChange,
} = {}) {

  initButtonCallbacks({ onRobotNav, onSkillsOpen, onPortfolioOpen, onVibeChange })

  const loader      = new GLTFLoader()
  const buttonGroup = new THREE.Group()
  scene.add(buttonGroup)

  _ensureTooltip()

  const hitEntries = []

  for (const def of BUTTON_DEFS) {
    pressStates.set(def.id, { keycapRoot: null, pressing: false })
  }

  // ── Build one button (housing + hit box + keycap) ──────────
  // Extracted so it can be called with either a GLB housing clone
  // or a procedural fallback housing — identical from here down.

  function _buildButton(def, i, housingScene) {
    const x = ROW_START_X + i * BTN_SPACING

    housingScene.position.set(x, 0, 0)
    buttonGroup.add(housingScene)

    // Invisible hit-box for raycasting
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.9, 0.6),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    hitMesh.position.set(x, 0, 0.15)
    buttonGroup.add(hitMesh)

    const entry = { hitMesh, def, keycapScene: null }
    hitEntries.push(entry)

    // Keycap
    loader.load(
      def.keycap,
      (keycapGltf) => {
        const keycap = keycapGltf.scene
        keycap.position.set(x, 0, 0)
        buttonGroup.add(keycap)
        entry.keycapScene = keycap

        if (def.id === 'vibe') {
          keycap.rotation.x=Math.PI/2
          // Clone materials per mesh so each part is independently
          // colourable, then paint with the initial preview palette.
          _initVibeKeycapMaterials(keycap)
          _applyVibeKeycapColors(VIBE_NAMES[currentVibeIndex], keycap)
        } else {
          _applyMatToScene(keycap, _makeKeycapMaterial())
        }

        const state = pressStates.get(def.id)
        if (state) state.keycapRoot = keycap
      },
      undefined,
      (err) => {
        console.warn(`[buttons] Keycap GLB not found, button still functional: ${def.keycap}`, err)
      }
    )
  }

  /**
   * Procedural housing: a simple layered box that reads as a physical
   * key switch housing. Used when btn_housing.glb hasn't been made yet.
   * @returns {THREE.Group}
   */
  function _makeProceduralHousing() {
    const housingMat = _makeHousingMaterial()
    const lipMat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color('#2a2a2a'),
      metalness: 0.80,
      roughness: 0.28,
    })

    const group = new THREE.Group()

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.85, 0.48), housingMat)
    body.castShadow    = true
    body.receiveShadow = true
    group.add(body)

    // Top lip — slightly wider, gives a border/frame appearance
    const lip = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.05, 0.07), lipMat)
    lip.position.z = 0.235
    lip.castShadow  = true
    group.add(lip)

    // Bottom foot — slight overhang at base
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.10, 2.10, 0.06), lipMat)
    foot.position.z = -0.27
    foot.castShadow  = true
    group.add(foot)

    return group
  }

  // ── Load shared housing GLB, fall back to procedural if missing ──

  loader.load(
    'models/buttons/btn_housing.glb',
    (housingGltf) => {
      // GLB loaded — clone it for each button
      const housingMat = _makeHousingMaterial()
      BUTTON_DEFS.forEach((def, i) => {
        const clone = housingGltf.scene.clone(true)
        _applyMatToScene(clone, housingMat)
        _buildButton(def, i, clone)
      })
    },
    undefined,
    (err) => {
      // GLB not found — build procedural housings so buttons are
      // immediately functional without any 3D asset file.
      console.warn('[buttons] btn_housing.glb not found — using procedural housings:', err)
      BUTTON_DEFS.forEach((def, i) => {
        _buildButton(def, i, _makeProceduralHousing())
      })
    }
  )

  // ── Volume Knob ────────────────────────────────────────────

  //const knobX = ROW_START_X + BUTTON_DEFS.length * BTN_SPACING + KNOB_GAP
  //const knob  = new VolumeKnob(buttonGroup, loader, [knobX, 0, 0], onEmissionChange)
/*
  const knobHitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 0.7, 32),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  knobHitMesh.position.set(knobX, 0.35, 0)
  buttonGroup.add(knobHitMesh)
*/

  // ─────────────────────────────────────────────────────────
  // RAYCASTING HELPERS
  // ─────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster()
  const mouseNDC  = new THREE.Vector2()

  function _updateMouseNDC(event) {
    const rect = domElement.getBoundingClientRect()
    mouseNDC.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1
    mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1
  }

  function _allHitMeshes() {
    //return [...hitEntries.map(e => e.hitMesh), knobHitMesh]
    return [...hitEntries.map(e => e.hitMesh)]

  }

  function _entryForMesh(mesh) {
    return hitEntries.find(e => e.hitMesh === mesh) ?? null
  }
/*
  let _draggingKnob = false
  let _dragStartY   = 0
  let _dragStartVal = 0

*/
  // ─────────────────────────────────────────────────────────
  // EVENT LISTENERS
  // ─────────────────────────────────────────────────────────

  domElement.addEventListener('mousemove', (e) => {
    _updateMouseNDC(e)
    raycaster.setFromCamera(mouseNDC, camera)
    const hits = raycaster.intersectObjects(_allHitMeshes())

    if (hits.length > 0) {
      const topMesh  = hits[0].object
      const btnEntry = _entryForMesh(topMesh)
      if (btnEntry) {
        domElement.style.cursor = 'pointer'
        _showTooltip(btnEntry.def.label, e.clientX, e.clientY)
      /*} else if (topMesh === knobHitMesh) {
        domElement.style.cursor = _draggingKnob ? 'grabbing' : 'grab'
        _showTooltip('Volume', e.clientX, e.clientY) */
      }
    } else {
      domElement.style.cursor = ''
      _hideTooltip()
    }
/*
    if (_draggingKnob) {
      const dy = (_dragStartY - e.clientY) / 130
      knob.setValue(_dragStartVal + dy)
    } */
  })

  domElement.addEventListener('mousedown', (e) => {
    _updateMouseNDC(e)
    raycaster.setFromCamera(mouseNDC, camera)
    const hits = raycaster.intersectObjects(_allHitMeshes())

    if (hits.length > 0) {
      const topMesh  = hits[0].object
      const btnEntry = _entryForMesh(topMesh)
      if (btnEntry) {
        const state = pressStates.get(btnEntry.def.id)
        if (state) state.pressing = true
      } /*else if (topMesh === knobHitMesh) {
        _draggingKnob = true
        _dragStartY   = e.clientY
        _dragStartVal = knob.value
        domElement.style.cursor = 'grabbing'
      } */
    }
  })

  domElement.addEventListener('mouseup', (e) => {
    for (const [, state] of pressStates) state.pressing = false

   /* if (_draggingKnob) {
      _draggingKnob = false
      domElement.style.cursor = ''
      return
    } */

    _updateMouseNDC(e)
    raycaster.setFromCamera(mouseNDC, camera)
    const hits = raycaster.intersectObjects(hitEntries.map(e => e.hitMesh))

    if (hits.length > 0) {
      const btnEntry = _entryForMesh(hits[0].object)
      if (btnEntry) {
        if (btnEntry.def.id === 'vibe') {
          const fired = btnEntry.def.onClick()
          if (fired) _cycleVibeKeycap(btnEntry)
        } else {
          btnEntry.def.onClick()
        }
      }
    }
  })

  domElement.addEventListener('mouseleave', () => {
    for (const [, state] of pressStates) state.pressing = false
   // _draggingKnob = false
    _hideTooltip()
    domElement.style.cursor = ''
  })

  /*window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp'   || e.key === 'ArrowRight') knob.nudge( 0.05)
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft')  knob.nudge(-0.05)
  })
*/

  // ─────────────────────────────────────────────────────────
  // UPDATE LOOP
  // ─────────────────────────────────────────────────────────

  let _lastTime = performance.now()

  function update() {
    const now   = performance.now()
    const delta = (now - _lastTime) / 1000
    _lastTime   = now
    tickPressAnimations(delta)
  }

  //return { update, knob, buttonGroup }
  return { update, buttonGroup }

}