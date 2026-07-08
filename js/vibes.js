// ═══════════════════════════════════════════════════════════
// vibes.js — 6 Themes, performance-adaptive post-processing,
//            cinematic transition engine
//
// INTEGRATION — call from main.js after all GLBs are loaded:
//
//   import { detectPerformanceTier, initVibes, applyVibe, updateVibes } from './vibes.js'
//
//   await detectPerformanceTier()   // run once before initVibes
//
//   initVibes({
//     scene,                          // THREE.Scene
//     camera,                         // THREE.Camera
//     renderer,                       // THREE.WebGLRenderer
//     cabinGroups,                    // Array<THREE.Group>   — one per cabin
//     wheelScene,                     // THREE.Object3D
//     standScene,                     // THREE.Object3D
//     boothScene,                     // THREE.Object3D
//     robotScene,                     // THREE.Object3D
//     ambientLight,                   // THREE.AmbientLight
//     moonLight,                      // THREE.DirectionalLight
//     warmFillLight,                  // THREE.PointLight
//     attachLights,                   // Array<THREE.PointLight>  one per spoke
//     fogParticleSystem,              // { setColor(hex), setOpacity(0-1) }
//   })
//
//   applyVibe('suave')               // set initial theme (no transition)
//
//   // In render loop:
//   updateVibes(delta)               // rain / scanlines need per-frame tick
//   vibeComposer?.render() ?? renderer.render(scene, camera)
// ═══════════════════════════════════════════════════════════

import * as THREE                   from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutlinePass }    from 'three/addons/postprocessing/OutlinePass.js'
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader }     from 'three/addons/shaders/FXAAShader.js'
import { getDevSkipTransitions } from './devmode.js'
// ─────────────────────────────────────────────────────────────
// PERFORMANCE TIER DETECTION
// 'low' | 'medium' | 'high'
// ─────────────────────────────────────────────────────────────

let _perfTier = 'medium'

/**
 * Measures average rAF frame time over 30 frames, combines with
 * hardware heuristics (memory, cores, maxTextureSize, mobile).
 * Must be awaited before initVibes().
 */
export async function detectPerformanceTier() {
  const memory = navigator.deviceMemory         ?? 4     // GB (undefined on Firefox)
  const cores  = navigator.hardwareConcurrency  ?? 4
  const mobile = /Mobi|Android/i.test(navigator.userAgent)

  const canvas  = document.createElement('canvas')
  const gl      = canvas.getContext('webgl2') || canvas.getContext('webgl')
  const maxTex  = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048

  // 30-frame benchmark
  const avgMs = await new Promise(resolve => {
    let n = 0
    const t0 = performance.now()
    const tick = () => (++n < 30) ? requestAnimationFrame(tick) : resolve((performance.now() - t0) / n)
    requestAnimationFrame(tick)
  })

  let score = 0
  if (!mobile)       score += 2
  if (memory  >= 8)  score += 2
  if (cores   >= 8)  score += 2
  if (maxTex  >= 8192) score += 1
  if (avgMs   <= 8)  score += 3   // ≥ ~125 fps headroom
  else if (avgMs <= 16) score += 1 // ≥ ~60 fps

  _perfTier = score >= 7 ? 'high' : score >= 3 ? 'medium' : 'low'
  console.log(`[vibes] Tier: ${_perfTier}  (${avgMs.toFixed(1)}ms/frame, score ${score})`)
  return _perfTier
}

export const getPerformanceTier = () => _perfTier


// ─────────────────────────────────────────────────────────────
// SOUND SYSTEM
// Sound paths — name your files to match these:
//   sounds/vibe_crackle.mp3   short electrical burst / static snap
//   sounds/vibe_startup.mp3   low rumble building to wheel-crank momentum
//   sounds/vibe_boot.mp3      soft synth chime / boot-complete tone
// ─────────────────────────────────────────────────────────────

const _audioCtx   = new (window.AudioContext || window.webkitAudioContext)()
const _soundCache = {}

async function _loadSound(path) {
  if (_soundCache[path]) return _soundCache[path]
  try {
    const buf     = await (await fetch(path)).arrayBuffer()
    const decoded = await _audioCtx.decodeAudioData(buf)
    return (_soundCache[path] = decoded)
  } catch {
    console.warn(`[vibes] Sound not found: ${path}`)
    return null
  }
}

function _playSound(path, { volume = 1, offset = 0 } = {}) {
  _loadSound(path).then(buf => {
    if (!buf) return
    if (_audioCtx.state === 'suspended') _audioCtx.resume()
    const src = _audioCtx.createBufferSource()
    const gain = _audioCtx.createGain()
    src.buffer = buf
    gain.gain.value = volume
    src.connect(gain)
    gain.connect(_audioCtx.destination)
    src.start(_audioCtx.currentTime + offset)
  })
}


// ─────────────────────────────────────────────────────────────
// BASE MATERIALS  (Suave palette — mirrors config.js defaults)
// All other vibes are delta patches merged on top of these.
// ─────────────────────────────────────────────────────────────

const BASE = {
  // ── Cabin ────────────────────────────────────────────────
  cabin_body:             { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },
  cabin_trim:             { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.40 },
  cabin_trim_window_ext:  { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },
  cabin_trim_window_int:  { color: '#f0e6cc', metalness: 0.10, roughness: 0.60, emissive: '#f0e6cc', emissiveIntensity: 0.08 },
  cabin_window:           { color: '#ffffff', metalness: 0.00, roughness: 0.00, transparent: true, opacity: 0.15 },
  cabin_door_body:        { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },
  cabin_door_trim:        { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.40 },
  cabin_door_trim_red:    { color: '#8b1a1a', metalness: 0.00, roughness: 0.80 },
  cabin_door_base:        { color: '#1a1a1a', metalness: 0.20, roughness: 0.90 },
  cabin_door_handle:      { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.30 },
  cabin_door_bar:         { color: '#8b7536', metalness: 0.70, roughness: 0.75, emissive: '#3d3218', emissiveIntensity: 0.10 },
  cabin_seat:             { color: '#8b1a1a', metalness: 0.00, roughness: 0.90 },
  cabin_roof:             { color: '#b8960c', metalness: 0.80, roughness: 0.30, emissive: '#7a6408', emissiveIntensity: 0.15 },
  cabin_floor:            { color: '#2a2a2a', metalness: 0.10, roughness: 0.95 },
  cabin_hook:             { color: '#4a4a4a', metalness: 0.90, roughness: 0.40 },

  // ── Wheel — always near-white structural, contrasting spokes ─
  wheel_body:             { color: '#e8e8f2', metalness: 0.88, roughness: 0.35 },
  wheel_spoke:            { color: '#c0c0d8', metalness: 0.85, roughness: 0.30 }, // ← add this
  wheel_rim_front:        { color: '#a8c8ff', metalness: 0.60, roughness: 0.20, emissive: '#a8c8ff', emissiveIntensity: 0.60 },
  attach_bar:             { color: '#8b7536', metalness: 0.70, roughness: 0.75, emissive: '#3d3218', emissiveIntensity: 0.10 },

  // ── Stand ────────────────────────────────────────────────
  stand_body:             { color: '#1a1a1a', metalness: 0.80, roughness: 0.60 },
  stand_axle:             { color: '#1a1a1a', metalness: 0.90, roughness: 0.30 },

  // ── Booth ────────────────────────────────────────────────
  booth_stripe_a:         { color: '#ec500d', metalness: 0.85, roughness: 0.25 },
  booth_stripe_b:         { color: '#ffffff', metalness: 0.15, roughness: 0.75 },
  booth_bar:              { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.40 },
  booth_ledge_top:        { color: '#c9a84c', metalness: 0.90, roughness: 0.20 },
  booth_ledge_bottom:     { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },
  booth_sign_base:        { color: '#1a1a1a', metalness: 0.20, roughness: 0.90 },
  booth_letter:           { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },
  booth_roof:             { color: '#1a1a1a', metalness: 0.20, roughness: 0.90 },
  booth_body:             { color: '#f5f0e8', metalness: 0.00, roughness: 0.70 },

  // ── Robot ────────────────────────────────────────────────
  robot_body:             { color: '#2a2a3a', metalness: 0.80, roughness: 0.30 },
  robot_suit:             { color: '#1e1a2e', metalness: 0.30, roughness: 0.65 },
  robot_undershirt:       { color: '#3a3550', metalness: 0.10, roughness: 0.80 },
  robot_jaw:              { color: '#2a2a3a', metalness: 0.80, roughness: 0.30 },
  robot_face_plate:       { color: '#f0ece0', metalness: 0.05, roughness: 0.55 },
  robot_face_trim:        { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.30 },
  robot_eye_socket:       { color: '#1a1a2e', metalness: 0.90, roughness: 0.20 },
  robot_eye_outer:        { color: '#1a1a2e', metalness: 0.70, roughness: 0.20 },
  robot_eye_inner:        { color: '#4488ff', metalness: 0.10, roughness: 0.10, emissive: '#4488ff', emissiveIntensity: 0.90 },
  robot_pupil:            { color: '#88ccff', metalness: 0.00, roughness: 0.00, emissive: '#88ccff', emissiveIntensity: 1.20 },
  robot_monocle:          { color: '#1a1a2e', metalness: 0.30, roughness: 0.05, transparent: true, opacity: 0.50 },
  robot_hat_base:         { color: '#1a1a3a', metalness: 0.40, roughness: 0.50 },
  robot_hat_trim:         { color: '#c9a84c', metalness: 0.90, roughness: 0.20, emissive: '#c9a84c', emissiveIntensity: 0.30 },
  robot_clock_face:       { color: '#e8e4d0', metalness: 0.05, roughness: 0.60 },
  robot_clock_hands:      { color: '#c9a84c', metalness: 0.90, roughness: 0.20 },
  robot_neck_big:         { color: '#3a3a4a', metalness: 0.75, roughness: 0.40 },
  robot_neck_small:       { color: '#2a2a3a', metalness: 0.80, roughness: 0.35 },
  robot_collar:           { color: '#1e1a2e', metalness: 0.40, roughness: 0.55 },
  robot_eyebrow:          { color: '#c9a84c', metalness: 0.90, roughness: 0.20 },
  robot_button_inside:    { color: '#8855ff', metalness: 0.10, roughness: 0.20, emissive: '#8855ff', emissiveIntensity: 0.70 },
  robot_button_outside:   { color: '#2a2a3a', metalness: 0.70, roughness: 0.40 },
  robot_stroke:           { color: '#000000', metalness: 0.00, roughness: 1.00 },
}


// ─────────────────────────────────────────────────────────────
// VIBE DEFINITIONS  (delta patches — only what changes from BASE)
// ─────────────────────────────────────────────────────────────

const VIBES = {

  // ── 1. SUAVE ─────────────────────────────────────────────
  suave: {
    label: 'Suave',
    atmosphere: {
      ambientColor: '#1a0a2e', ambientIntensity: 0.40,
      moonColor: '#a8c8ff',    moonIntensity:    0.80,
      fogColor:  '#d4c5e8',
      bloomStrength: 0.55, bloomRadius: 0.55, bloomThreshold: 0.70,
      skyColor: '#0d0221',

    },
    fx: { bloom: true, outlines: false, rain: false, wireframe: false, neon: true, scanlines: false, robotLightIntensity: 50, },
    delta: {},  // all BASE
  },

  // ── 2. CARNIVAL ──────────────────────────────────────────
  carnival: {
    label: 'Carnival',
    atmosphere: {
      ambientColor: '#2d1005', ambientIntensity: 0.30,
      moonColor: '#ffb347',    moonIntensity:    0.75,
      fogColor:  '#ff8c42',
      bloomStrength: 0.65, bloomRadius: 0.50, bloomThreshold: 0.75,
      skyColor: '#0d0221',
    },
    fx: { bloom: true, outlines: false, rain: false, wireframe: false, neon: false, scanlines: false, robotLightIntensity: 50, },
    delta: {
      cabin_body:            { color: '#f2e4c8', metalness: 0.00, roughness: 0.85 },
      cabin_trim:            { color: '#c84c08', metalness: 0.75, roughness: 0.35, emissive: '#c84c08', emissiveIntensity: 0.50 },
      cabin_trim_window_ext: { color: '#e8d4a8', metalness: 0.00, roughness: 0.85 },
      cabin_trim_window_int: { color: '#ffe0a0', metalness: 0.05, roughness: 0.70, emissive: '#ffe08c', emissiveIntensity: 0.20 },
      cabin_window:          { color: '#ffeecc', metalness: 0.00, roughness: 0.05, transparent: true, opacity: 0.22 },
      cabin_door_body:       { color: '#f2e4c8', metalness: 0.00, roughness: 0.85 },
      cabin_door_trim:       { color: '#c84c08', metalness: 0.75, roughness: 0.35, emissive: '#c84c08', emissiveIntensity: 0.50 },
      cabin_door_trim_red:   { color: '#aa2200', metalness: 0.00, roughness: 0.85 },
      cabin_door_base:       { color: '#3a1a0a', metalness: 0.10, roughness: 0.95 },
      cabin_door_handle:     { color: '#d4a030', metalness: 0.85, roughness: 0.25, emissive: '#d4a030', emissiveIntensity: 0.30 },
      cabin_door_bar:        { color: '#8b6020', metalness: 0.65, roughness: 0.80 },
      cabin_seat:            { color: '#aa2200', metalness: 0.00, roughness: 0.90 },
      cabin_roof:            { color: '#c84c08', metalness: 0.60, roughness: 0.45, emissive: '#aa3000', emissiveIntensity: 0.15 },
      cabin_floor:           { color: '#3a1a0a', metalness: 0.05, roughness: 0.95 },
      // Wheel — warm white + amber glow
      wheel_body:            { color: '#f0ead8', metalness: 0.80, roughness: 0.40 },
      wheel_rim_front:       { color: '#ffb347', metalness: 0.55, roughness: 0.25, emissive: '#ffb347', emissiveIntensity: 0.70 },
      attach_bar:            { color: '#8b5a14', metalness: 0.65, roughness: 0.80, emissive: '#4a2e08', emissiveIntensity: 0.10 },
      // Booth — worn red/cream carnival stripes
      booth_stripe_a:        { color: '#cc2200', metalness: 0.60, roughness: 0.40 },
      booth_stripe_b:        { color: '#f8f0e0', metalness: 0.10, roughness: 0.80 },
      booth_bar:             { color: '#d4a030', metalness: 0.85, roughness: 0.25, emissive: '#d4a030', emissiveIntensity: 0.40 },
      booth_ledge_top:       { color: '#d4a030', metalness: 0.85, roughness: 0.25 },
      booth_ledge_bottom:    { color: '#f2e4c8', metalness: 0.00, roughness: 0.85 },
      booth_sign_base:       { color: '#3a1a0a', metalness: 0.10, roughness: 0.95 },
      booth_letter:          { color: '#f8f0e0', metalness: 0.00, roughness: 0.80 },
      booth_roof:            { color: '#3a1a0a', metalness: 0.10, roughness: 0.95 },
      booth_body:            { color: '#f2e4c8', metalness: 0.00, roughness: 0.85 },
      // Robot — warm brass fairground automaton
      robot_body:            { color: '#7a5018', metalness: 0.75, roughness: 0.35 },
      robot_suit:            { color: '#4a1a08', metalness: 0.25, roughness: 0.70 },
      robot_undershirt:      { color: '#e0c890', metalness: 0.05, roughness: 0.80 },
      robot_jaw:             { color: '#7a5018', metalness: 0.75, roughness: 0.35 },
      robot_face_plate:      { color: '#f5e8c0', metalness: 0.05, roughness: 0.55 },
      robot_face_trim:       { color: '#c84c08', metalness: 0.80, roughness: 0.25, emissive: '#c84c08', emissiveIntensity: 0.35 },
      robot_eye_socket:      { color: '#3a1a0a', metalness: 0.80, roughness: 0.25 },
      robot_eye_outer:       { color: '#3a1a0a', metalness: 0.65, roughness: 0.25 },
      robot_eye_inner:       { color: '#ff8c00', metalness: 0.10, roughness: 0.10, emissive: '#ff8c00', emissiveIntensity: 1.00 },
      robot_pupil:           { color: '#ffcc44', metalness: 0.00, roughness: 0.00, emissive: '#ffcc44', emissiveIntensity: 1.40 },
      robot_hat_base:        { color: '#4a1a08', metalness: 0.35, roughness: 0.55 },
      robot_hat_trim:        { color: '#d4a030', metalness: 0.85, roughness: 0.20, emissive: '#d4a030', emissiveIntensity: 0.30 },
      robot_clock_face:      { color: '#e8d8a0', metalness: 0.05, roughness: 0.60 },
      robot_clock_hands:     { color: '#d4a030', metalness: 0.85, roughness: 0.20 },
      robot_neck_big:        { color: '#7a5018', metalness: 0.70, roughness: 0.45 },
      robot_neck_small:      { color: '#6a4010', metalness: 0.75, roughness: 0.40 },
      robot_eyebrow:         { color: '#d4a030', metalness: 0.85, roughness: 0.20 },
      robot_button_inside:   { color: '#ff4400', metalness: 0.10, roughness: 0.25, emissive: '#ff4400', emissiveIntensity: 0.80 },
      robot_button_outside:  { color: '#3a1a0a', metalness: 0.65, roughness: 0.45 },
      

    },
  },

  // ── 3. NOIR ──────────────────────────────────────────────
  noir: {
  label: 'Pop Art',
  atmosphere: {
    ambientColor: '#1a0033', ambientIntensity: 0.60,
    moonColor: '#ffee00',    moonIntensity:    1.00,
    fogColor:  '#330066',
    bloomStrength: 0.50, bloomRadius: 0.30, bloomThreshold: 0.65,
    skyColor: '#0d0022',
  },
  fx: { bloom: true, outlines: true, rain: false, wireframe: false, neon: false, scanlines: false, robotLightColor:     '#ffffff', robotLightIntensity: 50,},
  delta: {
    cabin_body:            { color: '#6600cc', metalness: 0.00, roughness: 0.80 },
    cabin_trim:            { color: '#ffee00', metalness: 0.00, roughness: 0.50,
                             emissive: '#ffee00', emissiveIntensity: 0.60 },
    cabin_trim_window_int: { color: '#ffee00', emissive: '#ffee00', emissiveIntensity: 0.80 },
    cabin_window:          { color: '#aa66ff', transparent: true, opacity: 0.35 },
    cabin_door_body:       { color: '#5500aa', metalness: 0.00, roughness: 0.80 },
    cabin_door_trim:       { color: '#ffee00', metalness: 0.00, roughness: 0.50,
                             emissive: '#ffee00', emissiveIntensity: 0.60 },
    cabin_door_trim_red:   { color: '#ff2200', metalness: 0.00, roughness: 0.70 },
    cabin_door_base:       { color: '#110022', metalness: 0.00, roughness: 0.90 },
    cabin_door_handle:     { color: '#ffee00', metalness: 0.00, roughness: 0.40 },
    cabin_door_bar:        { color: '#8833cc', metalness: 0.00, roughness: 0.70 },
    cabin_seat:            { color: '#ff2200', metalness: 0.00, roughness: 0.90 },
    cabin_roof:            { color: '#ffee00', metalness: 0.00, roughness: 0.60,
                             emissive: '#ccbb00', emissiveIntensity: 0.30 },
    cabin_floor:           { color: '#110022', metalness: 0.00, roughness: 1.00 },

    wheel_body:            { color: '#8833cc', metalness: 0.10, roughness: 0.60 },
    wheel_spoke:           { color: '#6600cc', metalness: 0.10, roughness: 0.60 },
    wheel_rim_front:       { color: '#ffee00', metalness: 0.00, roughness: 0.40,
                             emissive: '#ffee00', emissiveIntensity: 0.80 },
    attach_bar:            { color: '#ffee00', metalness: 0.00, roughness: 0.50 },

    stand_body:            { color: '#110022', metalness: 0.10, roughness: 0.80 },
    stand_axle:            { color: '#330066', metalness: 0.10, roughness: 0.60 },

    booth_stripe_a:        { color: '#6600cc', metalness: 0.00, roughness: 0.70 },
    booth_stripe_b:        { color: '#ffee00', metalness: 0.00, roughness: 0.70 },
    booth_bar:             { color: '#ffee00', metalness: 0.00, roughness: 0.40,
                             emissive: '#ccbb00', emissiveIntensity: 0.50 },
    booth_ledge_top:       { color: '#ffee00', metalness: 0.00, roughness: 0.40 },
    booth_ledge_bottom:    { color: '#8833cc', metalness: 0.00, roughness: 0.70 },
    booth_sign_base:       { color: '#110022', metalness: 0.00, roughness: 0.90 },
    booth_letter:          { color: '#ffee00', emissive: '#ffee00', emissiveIntensity: 1.00 },
    booth_roof:            { color: '#110022', metalness: 0.00, roughness: 0.90 },
    booth_body:            { color: '#5500aa', metalness: 0.00, roughness: 0.80 },

    robot_body:            { color: '#4400aa', metalness: 0.00, roughness: 0.70 },
    robot_suit:            { color: '#330088', metalness: 0.00, roughness: 0.80, emissive: '#330088', emissiveIntensity: 0 },
    robot_undershirt:      { color: '#ffee00', metalness: 0.00, roughness: 0.80 },
    robot_jaw:             { color: '#4400aa', metalness: 0.00, roughness: 0.70 },
    robot_face_plate:      { color: '#aa88ff', metalness: 0.00, roughness: 0.60, emissive: '#aa88ff', emissiveIntensity: 0  },
    robot_face_trim:       { color: '#ffee00', metalness: 0.00, roughness: 0.40,
                             emissive: '#ffee00', emissiveIntensity: 0.60 },
    robot_eye_socket:      { color: '#110022', metalness: 0.00, roughness: 0.60 },
    robot_eye_outer:       { color: '#330066', metalness: 0.00, roughness: 0.60 },
    robot_eye_inner:       { color: '#ffee00', emissive: '#ffee00', emissiveIntensity: 2.00 },
    robot_pupil:           { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.50 },
    robot_hat_base:        { color: '#110022', metalness: 0.00, roughness: 0.70 },
    robot_hat_trim:        { color: '#ffee00', metalness: 0.00, roughness: 0.40,
                             emissive: '#ffee00', emissiveIntensity: 0.50 },
    robot_clock_face:      { color: '#aa88ff', metalness: 0.00, roughness: 0.70 },
    robot_clock_hands:     { color: '#ffee00', metalness: 0.00, roughness: 0.40 },
    robot_neck_big:        { color: '#4400aa', metalness: 0.00, roughness: 0.65 },
    robot_neck_small:      { color: '#330088', metalness: 0.00, roughness: 0.60 },
    robot_eyebrow:         { color: '#ffee00', metalness: 0.00, roughness: 0.40 },
    robot_button_inside:   { color: '#ff2200', emissive: '#ff2200', emissiveIntensity: 1.50 },
    robot_button_outside:  { color: '#330088', metalness: 0.00, roughness: 0.60 },
    robot_stroke:          { color: '#110022' },
  },
},
  // ── 4. BLUEPRINT ─────────────────────────────────────────
  blueprint: {
    label: 'Blueprint',
    atmosphere: {
      ambientColor: '#6e8ed2', ambientIntensity: 0.35,
      moonColor: '#4488ff',    moonIntensity:    0.60,
      fogColor:  '#0a2255',
      bloomStrength: 0.70, bloomRadius: 0.40, bloomThreshold: 0.50,
      skyColor: '#001033',

    },
    fx: { bloom: true, outlines: true, rain: false, wireframe: true, neon: false, scanlines: false },
    delta: {
      // All structural meshes become wireframe lines in the blueprint color
      cabin_body:            { color: '#4488ff', wireframe: true },
      cabin_trim:            { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.60 },
      cabin_trim_window_ext: { color: '#4488ff', wireframe: true },
      cabin_trim_window_int: { color: '#88ccff', wireframe: true, emissive: '#88ccff', emissiveIntensity: 0.40 },
      cabin_window:          { color: '#88ccff', transparent: true, opacity: 0.10 },
      cabin_door_body:       { color: '#4488ff', wireframe: true },
      cabin_door_trim:       { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.60 },
      cabin_door_trim_red:   { color: '#2266cc', wireframe: true },
      cabin_door_base:       { color: '#001033', wireframe: true },
      cabin_door_handle:     { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.50 },
      cabin_door_bar:        { color: '#4488ff', wireframe: true },
      cabin_seat:            { color: '#2266cc', wireframe: true },
      cabin_roof:            { color: '#88ccff', wireframe: true, emissive: '#88ccff', emissiveIntensity: 0.30 },
      cabin_floor:           { color: '#001033', wireframe: true },
      wheel_body:            { color: '#88ccff', wireframe: true },
      wheel_rim_front:       { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.60 },
      wheel_spoke: { color: '#2266cc', wireframe: true },
      attach_bar:            { color: '#4488ff', wireframe: true },
      stand_body:            { color: '#2266cc', wireframe: true },
      stand_axle:            { color: '#4488ff', wireframe: true },
      booth_stripe_a:        { color: '#2266cc', wireframe: true },
      booth_stripe_b:        { color: '#88ccff', wireframe: true },
      booth_bar:             { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.60 },
      booth_ledge_top:       { color: '#ffffff', wireframe: true },
      booth_ledge_bottom:    { color: '#4488ff', wireframe: true },
      booth_sign_base:       { color: '#001033', wireframe: true },
      booth_letter:          { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.50 },
      booth_roof:            { color: '#001033', wireframe: true },
      booth_body:            { color: '#4488ff', wireframe: true },
      robot_body:            { color: '#4488ff', wireframe: true },
      robot_suit:            { color: '#2266cc', wireframe: true },
      robot_undershirt:      { color: '#001033', wireframe: true },
      robot_jaw:             { color: '#4488ff', wireframe: true },
      robot_face_plate:      { color: '#88ccff', wireframe: true },
      robot_face_trim:       { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.60 },
      robot_eye_socket:      { color: '#001033', wireframe: true },
      robot_eye_outer:       { color: '#2266cc', wireframe: true },
      robot_eye_inner:       { color: '#00ccff', emissive: '#00ccff', emissiveIntensity: 1.20 },
      robot_pupil:           { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.60 },
      robot_hat_base:        { color: '#001033', wireframe: true },
      robot_hat_trim:        { color: '#ffffff', wireframe: true, emissive: '#ffffff', emissiveIntensity: 0.50 },
      robot_clock_face:      { color: '#88ccff', wireframe: true, emissive: '#88ccff', emissiveIntensity: 0.30 },
      robot_clock_hands:     { color: '#ffffff', wireframe: true },
      robot_neck_big:        { color: '#4488ff', wireframe: true },
      robot_neck_small:      { color: '#2266cc', wireframe: true },
      robot_eyebrow:         { color: '#ffffff', wireframe: true },
      robot_button_inside:   { color: '#00ccff', emissive: '#00ccff', emissiveIntensity: 1.00 },
      robot_button_outside:  { color: '#2266cc', wireframe: true },
      robot_stroke:          { color: '#4488ff' },

    },
  },


  // ── 5. MIDNIGHT ARCADE ───────────────────────────────────
  midnight_arcade: {
    label: 'Midnight Arcade',
    atmosphere: { 
      ambientColor: '#000010', ambientIntensity: 0.10,
      moonColor: '#ff00ff',    moonIntensity:    0.50,
      fogColor:  '#110022',
      skyColor: '#000000',

      bloomStrength: 1.20, bloomRadius: 0.70, bloomThreshold: 0.40,
    },
    fx: { bloom: true, outlines: false, rain: false, wireframe: false, neon: true, scanlines: true },
    delta: {
      cabin_body:            { color: '#0a0a14', metalness: 0.10, roughness: 0.85 },
      cabin_trim:            { color: '#ff00ff', metalness: 0.20, roughness: 0.15, emissive: '#ff00ff', emissiveIntensity: 1.00 },
      cabin_trim_window_ext: { color: '#0a0a14', metalness: 0.10, roughness: 0.85 },
      cabin_trim_window_int: { color: '#00ffff', metalness: 0.10, roughness: 0.10, emissive: '#00ffff', emissiveIntensity: 0.80 },
      cabin_window:          { color: '#00ffff', transparent: true, opacity: 0.20 },
      cabin_door_body:       { color: '#0a0a14', metalness: 0.10, roughness: 0.85 },
      cabin_door_trim:       { color: '#ff00ff', metalness: 0.20, roughness: 0.15, emissive: '#ff00ff', emissiveIntensity: 1.00 },
      cabin_door_trim_red:   { color: '#ff0044', metalness: 0.10, roughness: 0.30, emissive: '#ff0044', emissiveIntensity: 0.70 },
      cabin_door_base:       { color: '#050510', metalness: 0.20, roughness: 0.95 },
      cabin_door_handle:     { color: '#ffff00', metalness: 0.10, roughness: 0.20, emissive: '#ffff00', emissiveIntensity: 0.90 },
      cabin_door_bar:        { color: '#00ff88', metalness: 0.10, roughness: 0.30, emissive: '#00ff88', emissiveIntensity: 0.60 },
      cabin_seat:            { color: '#ff0044', metalness: 0.05, roughness: 0.75, emissive: '#ff0044', emissiveIntensity: 0.30 },
      cabin_roof:            { color: '#ff00ff', metalness: 0.20, roughness: 0.20, emissive: '#cc00cc', emissiveIntensity: 0.60 },
      cabin_floor:           { color: '#050510', metalness: 0.10, roughness: 1.00 },
      // Wheel — near-white structural; neon magenta spokes
      wheel_body:            { color: '#e0e0ff', metalness: 0.90, roughness: 0.25 },
      wheel_rim_front:       { color: '#ff00ff', metalness: 0.20, roughness: 0.10, emissive: '#ff00ff', emissiveIntensity: 0.8 },
      attach_bar:            { color: '#00ff88', metalness: 0.20, roughness: 0.30, emissive: '#00ff88', emissiveIntensity: 0.50 },
      wheel_spoke: { color: '#cc00ff', metalness: 0.20, roughness: 0.20, emissive: '#cc00ff', emissiveIntensity: 0.70 },

      booth_stripe_a:        { color: '#ff00ff', metalness: 0.15, roughness: 0.20, emissive: '#ff00ff', emissiveIntensity: 0.30 },
      booth_stripe_b:        { color: '#00ffff', metalness: 0.15, roughness: 0.20, emissive: '#00ffff', emissiveIntensity: 0.30 },
      booth_bar:             { color: '#ffff00', metalness: 0.15, roughness: 0.20, emissive: '#ffff00', emissiveIntensity: 0.20 },
      booth_ledge_top:       { color: '#ffff00', metalness: 0.15, roughness: 0.20, emissive: '#ffff00', emissiveIntensity: 0.20 },
      booth_ledge_bottom:    { color: '#0a0a14', metalness: 0.10, roughness: 0.85 },
      booth_sign_base:       { color: '#050510', metalness: 0.20, roughness: 0.95 },
      booth_letter:          { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.40 },
      booth_roof:            { color: '#050510', metalness: 0.20, roughness: 0.95 },
      booth_body:            { color: '#0a0a14', metalness: 0.10, roughness: 0.85 },
      // Robot — neon arcade cabinet
      robot_body:            { color: '#0a0a14', metalness: 0.85, roughness: 0.20 },
      robot_suit:            { color: '#050510', metalness: 0.20, roughness: 0.75 },
      robot_undershirt:      { color: '#ff00ff', metalness: 0.10, roughness: 0.50, emissive: '#ff00ff', emissiveIntensity: 0.40 },
      robot_jaw:             { color: '#0a0a14', metalness: 0.85, roughness: 0.20 },
      robot_face_plate:      { color: '#111122', metalness: 0.15, roughness: 0.50 },
      robot_face_trim:       { color: '#ff00ff', metalness: 0.20, roughness: 0.15, emissive: '#ff00ff', emissiveIntensity: 1.00 },
      robot_eye_socket:      { color: '#050510', metalness: 0.90, roughness: 0.10 },
      robot_eye_outer:       { color: '#050510', metalness: 0.70, roughness: 0.10 },
      robot_eye_inner:       { color: '#00ffff', emissive: '#00ffff', emissiveIntensity: 1.50 },
      robot_pupil:           { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.00 },
      robot_hat_base:        { color: '#050510', metalness: 0.35, roughness: 0.50 },
      robot_hat_trim:        { color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 0.90 },
      robot_clock_face:      { color: '#111122', metalness: 0.10, roughness: 0.50 },
      robot_clock_hands:     { color: '#00ff88', emissive: '#00ff88', emissiveIntensity: 0.90 },
      robot_neck_big:        { color: '#0a0a14', metalness: 0.80, roughness: 0.30 },
      robot_neck_small:      { color: '#050510', metalness: 0.85, roughness: 0.25 },
      robot_eyebrow:         { color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 0.80 },
      robot_button_inside:   { color: '#ffff00', emissive: '#ffff00', emissiveIntensity: 1.20 },
      robot_button_outside:  { color: '#0a0a14', metalness: 0.65, roughness: 0.40 },
      robot_stroke:          { color: '#ff00ff' },

    },
  },

  // ── 6. PASTEL ───────────────────────────────────────────
  pastel: {
    label: 'Pastel Dream',
    atmosphere: {
      ambientColor: '#e8f4ff', ambientIntensity: 0.7,
      moonColor: '#fff0f8',    moonIntensity:    0.85,
      fogColor:  '#32e0ff',
      skyColor: '#ddc8ff',

      bloomStrength: 0.35, bloomRadius: 0.40, bloomThreshold: 0.80,
    },
    fx: { bloom: true, outlines: false, rain: false, wireframe: false, neon: false, scanlines: false },
    delta: {
      cabin_body:            { color: '#ffffff', metalness: 0.00, roughness: 0.85 },
      cabin_trim:            { color: '#ffb8d4', metalness: 0.00, roughness: 0.60, emissive: '#ffb8d4', emissiveIntensity: 0.18 },
      cabin_trim_window_ext: { color: '#ffffff', metalness: 0.00, roughness: 0.85 },
      cabin_trim_window_int: { color: '#c8f0d8', metalness: 0.00, roughness: 0.60, emissive: '#c8f0d8', emissiveIntensity: 0.12 },
      cabin_window:          { color: '#e8f8ff', transparent: true, opacity: 0.30 },
      cabin_door_body:       { color: '#ffffff', metalness: 0.00, roughness: 0.85 },
      cabin_door_trim:       { color: '#ffb8d4', metalness: 0.00, roughness: 0.60, emissive: '#ffb8d4', emissiveIntensity: 0.18 },
      cabin_door_trim_red:   { color: '#ffb8d4', metalness: 0.00, roughness: 0.70 },
      cabin_door_base:       { color: '#f0e8f8', metalness: 0.00, roughness: 0.90 },
      cabin_door_handle:     { color: '#c8f0d8', metalness: 0.10, roughness: 0.60 },
      cabin_door_bar:        { color: '#d4b8e8', metalness: 0.00, roughness: 0.80 },
      cabin_seat:            { color: '#ff9ec4', metalness: 0.00, roughness: 0.90 },
      cabin_roof:            { color: '#ffb8d4', metalness: 0.00, roughness: 0.70, emissive: '#ffb8d4', emissiveIntensity: 0.10 },
      cabin_floor:           { color: '#f0e8f8', metalness: 0.00, roughness: 0.95 },
      cabin_hook:            { color: '#d4b8e8', metalness: 0.30, roughness: 0.60 },
      wheel_body:            { color: '#f8f0ff', metalness: 0.70, roughness: 0.35 },
      wheel_rim_front:       { color: '#ffb8d4', metalness: 0.20, roughness: 0.40, emissive: '#ffb8d4', emissiveIntensity: 0.45 },
      wheel_spoke: { color: '#d4c8f0', metalness: 0.20, roughness: 0.55 },
      attach_bar:            { color: '#c8f0d8', metalness: 0.20, roughness: 0.60, emissive: '#c8f0d8', emissiveIntensity: 0.18 },
      stand_body: { color: '#f2ecff', metalness: 0.30, roughness: 0.70 },
      stand_axle: { color: '#f2ecff', metalness: 0.40, roughness: 0.55 },
      booth_stripe_a:        { color: '#ffb8d4', metalness: 0.00, roughness: 0.80 },
      booth_stripe_b:        { color: '#ffffff', metalness: 0.00, roughness: 0.80 },
      booth_bar:             { color: '#c8f0d8', metalness: 0.10, roughness: 0.60 },
      booth_ledge_top:       { color: '#c8f0d8', metalness: 0.10, roughness: 0.60 },
      booth_ledge_bottom:    { color: '#ffffff', metalness: 0.00, roughness: 0.80 },
      booth_sign_base:       { color: '#e8d4f0', metalness: 0.00, roughness: 0.90 },
      booth_letter:          { color: '#ffb8d4', metalness: 0.00, roughness: 0.70 },
      booth_roof:            { color: '#c8e8ff', metalness: 0.00, roughness: 0.85 },
      booth_body:            { color: '#ffffff', metalness: 0.00, roughness: 0.85 },
      robot_body:            { color: '#e8c8e8', metalness: 0.20, roughness: 0.70 },
      robot_suit:            { color: '#c8e8ff', metalness: 0.10, roughness: 0.80 },
      robot_undershirt:      { color: '#ffffff', metalness: 0.00, roughness: 0.90 },
      robot_jaw:             { color: '#e8c8e8', metalness: 0.20, roughness: 0.70 },
      robot_face_plate:      { color: '#fff8f8', metalness: 0.00, roughness: 0.80 },
      robot_face_trim:       { color: '#ffb8d4', metalness: 0.00, roughness: 0.60 },
      robot_eye_socket:      { color: '#d4b8e8', metalness: 0.30, roughness: 0.50 },
      robot_eye_outer:       { color: '#d4b8e8', metalness: 0.30, roughness: 0.50 },
      robot_eye_inner:       { color: '#88ccff', metalness: 0.10, roughness: 0.10, emissive: '#88ccff', emissiveIntensity: 0.60 },
      robot_pupil:           { color: '#ddeeff', metalness: 0.00, roughness: 0.00, emissive: '#ddeeff', emissiveIntensity: 0.80 },
      robot_hat_base:        { color: '#c8e8ff', metalness: 0.10, roughness: 0.75 },
      robot_hat_trim:        { color: '#ffb8d4', metalness: 0.00, roughness: 0.60 },
      robot_clock_face:      { color: '#fff8f8', metalness: 0.00, roughness: 0.80 },
      robot_clock_hands:     { color: '#c8f0d8', metalness: 0.10, roughness: 0.60 },
      robot_neck_big:        { color: '#e8c8e8', metalness: 0.20, roughness: 0.65 },
      robot_neck_small:      { color: '#d4b8e8', metalness: 0.25, roughness: 0.60 },
      robot_eyebrow:         { color: '#ffb8d4', metalness: 0.00, roughness: 0.60 },
      robot_button_inside:   { color: '#c8f0d8', metalness: 0.10, roughness: 0.25, emissive: '#c8f0d8', emissiveIntensity: 0.40 },
      robot_button_outside:  { color: '#e8c8e8', metalness: 0.20, roughness: 0.60 },
      robot_stroke:          { color: '#ffb8d4' },
    },
  },

  // ── 7. AURORA ────────────────────────────────────────────────
  aurora: {
    label: 'Aurora',
    atmosphere: {
      ambientColor: '#001a10', ambientIntensity: 0.28,
      moonColor:    '#00ffaa', moonIntensity:    0.55,
      fogColor:     '#002a18',
      bloomStrength: 0.1, bloomRadius: 0.65, bloomThreshold: 0.42,
      skyColor: '#000d06',
    },
    fx: { bloom: true, outlines: false, rain: true, wireframe: false,
          neon: true, scanlines: false, aurora: true, auroraOpacity: 1 },
    delta: {
      // Cabin — near-black body, teal/cyan emissive trim
      cabin_body:            { color: '#060f0a', metalness: 0.15, roughness: 0.85 },
      cabin_trim:            { color: '#00ffaa', metalness: 0.20, roughness: 0.20, emissive: '#00ffaa', emissiveIntensity: 0.90 },
      cabin_trim_window_ext: { color: '#060f0a', metalness: 0.10, roughness: 0.85 },
      cabin_trim_window_int: { color: '#00ccff', metalness: 0.10, roughness: 0.15, emissive: '#00ccff', emissiveIntensity: 0.70 },
      cabin_window:          { color: '#00ffcc', transparent: true, opacity: 0.18 },
      cabin_door_body:       { color: '#060f0a', metalness: 0.15, roughness: 0.85 },
      cabin_door_trim:       { color: '#00ffaa', metalness: 0.20, roughness: 0.20, emissive: '#00ffaa', emissiveIntensity: 0.90 },
      cabin_door_trim_red:   { color: '#00aa66', metalness: 0.10, roughness: 0.40, emissive: '#00aa66', emissiveIntensity: 0.40 },
      cabin_door_base:       { color: '#020808', metalness: 0.20, roughness: 0.95 },
      cabin_door_handle:     { color: '#00ffcc', metalness: 0.30, roughness: 0.25, emissive: '#00ffcc', emissiveIntensity: 0.60 },
      cabin_door_bar:        { color: '#007755', metalness: 0.40, roughness: 0.50 },
      cabin_seat:            { color: '#003322', metalness: 0.00, roughness: 0.90 },
      cabin_roof:            { color: '#00cc88', metalness: 0.30, roughness: 0.35, emissive: '#00aa66', emissiveIntensity: 0.40 },
      cabin_floor:           { color: '#020808', metalness: 0.05, roughness: 1.00 },
      // Wheel — dark teal structure, bright glowing rim + spokes
      wheel_body:            { color: '#0a2018', metalness: 0.85, roughness: 0.30 },
      wheel_rim_front:       { color: '#00ffaa', metalness: 0.20, roughness: 0.10, emissive: '#00ffaa', emissiveIntensity: 1.00 },
      wheel_spoke:           { color: '#00cc88', metalness: 0.30, roughness: 0.25, emissive: '#00aa66', emissiveIntensity: 0.50 },
      attach_bar:            { color: '#00ff88', metalness: 0.20, roughness: 0.30, emissive: '#00cc66', emissiveIntensity: 0.40 },
      // Booth
      booth_stripe_a:        { color: '#00cc88', metalness: 0.15, roughness: 0.40, emissive: '#00cc88', emissiveIntensity: 0.25 },
      booth_stripe_b:        { color: '#060f0a', metalness: 0.10, roughness: 0.85 },
      booth_bar:             { color: '#00ffaa', metalness: 0.20, roughness: 0.20, emissive: '#00ffaa', emissiveIntensity: 0.55 },
      booth_ledge_top:       { color: '#00ffaa', metalness: 0.20, roughness: 0.25, emissive: '#00aa66', emissiveIntensity: 0.30 },
      booth_ledge_bottom:    { color: '#0a1a10', metalness: 0.10, roughness: 0.80 },
      booth_sign_base:       { color: '#020808', metalness: 0.20, roughness: 0.95 },
      booth_letter:          { color: '#00ffaa', emissive: '#00ffaa', emissiveIntensity: 0.80 },
      booth_roof:            { color: '#020808', metalness: 0.20, roughness: 0.95 },
      booth_body:            { color: '#060f0a', metalness: 0.10, roughness: 0.85 },
      // Robot — gloss black shell, teal glow accents
      robot_body:            { color: '#060f0a', metalness: 0.85, roughness: 0.20 },
      robot_suit:            { color: '#020808', metalness: 0.20, roughness: 0.75 },
      robot_undershirt:      { color: '#00cc88', metalness: 0.10, roughness: 0.50, emissive: '#00aa66', emissiveIntensity: 0.30 },
      robot_jaw:             { color: '#060f0a', metalness: 0.85, roughness: 0.20 },
      robot_face_plate:      { color: '#0a1a12', metalness: 0.15, roughness: 0.50 },
      robot_face_trim:       { color: '#00ffaa', metalness: 0.20, roughness: 0.15, emissive: '#00ffaa', emissiveIntensity: 0.90 },
      robot_eye_socket:      { color: '#020808', metalness: 0.90, roughness: 0.10 },
      robot_eye_outer:       { color: '#020808', metalness: 0.70, roughness: 0.10 },
      robot_eye_inner:       { color: '#00ffcc', emissive: '#00ffcc', emissiveIntensity: 1.40 },
      robot_pupil:           { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.80 },
      robot_hat_base:        { color: '#020808', metalness: 0.35, roughness: 0.55 },
      robot_hat_trim:        { color: '#00ffaa', emissive: '#00ffaa', emissiveIntensity: 0.70 },
      robot_clock_face:      { color: '#0a1a12', metalness: 0.10, roughness: 0.55 },
      robot_clock_hands:     { color: '#00cc88', emissive: '#00cc88', emissiveIntensity: 0.70 },
      robot_neck_big:        { color: '#060f0a', metalness: 0.80, roughness: 0.30 },
      robot_neck_small:      { color: '#020808', metalness: 0.85, roughness: 0.25 },
      robot_eyebrow:         { color: '#00ffaa', emissive: '#00ffaa', emissiveIntensity: 0.70 },
      robot_button_inside:   { color: '#00ffcc', emissive: '#00ffcc', emissiveIntensity: 1.10 },
      robot_button_outside:  { color: '#060f0a', metalness: 0.65, roughness: 0.40 },
      robot_stroke:          { color: '#00ffaa' },
    },
  },
}
// ─────────────────────────────────────────────────────────────
// MATERIAL KEY RESOLVERS
// Map mesh names → material keys used in VIBES / BASE dicts
// ─────────────────────────────────────────────────────────────

function _resolveKey(name) {
  // ── Cabin (mirrors materials.js, extended) ───────────────
  if (name.startsWith('cabin_door_trim_red'))   return 'cabin_door_trim_red'
  if (name.startsWith('cabin_door_trim'))        return 'cabin_door_trim'
  if (name.startsWith('cabin_door_handle'))      return 'cabin_door_handle'
  if (name.startsWith('cabin_door_bar'))         return 'cabin_door_bar'
  if (name.startsWith('cabin_door_base'))        return 'cabin_door_base'
  if (name.startsWith('cabin_door_body'))        return 'cabin_door_body'
  if (name.startsWith('cabin_door'))             return 'cabin_door_body'
  if (name.startsWith('cabin_trim_window_ext'))  return 'cabin_trim_window_ext'
  if (name.startsWith('cabin_trim_window_int'))  return 'cabin_trim_window_int'
  if (name.startsWith('cabin_trim'))             return 'cabin_trim'
  if (name.startsWith('Body91'))                 return 'cabin_trim'
  if (name.startsWith('cabin_window'))           return 'cabin_window'
  if (name.startsWith('cabin_seat'))             return 'cabin_seat'
  if (name.startsWith('cabin_roof'))             return 'cabin_roof'
  if (name.startsWith('cabin_floor'))            return 'cabin_floor'
  if (name.startsWith('cabin_hook'))             return 'cabin_hook'
  if (name.startsWith('cabin_body'))             return 'cabin_body'

  // ── Wheel / Stand ────────────────────────────────────────
  if (name.startsWith('wheel_rim_front'))        return 'wheel_rim_front'
  if (name.startsWith('attach_bar'))             return 'attach_bar'
  if (name.startsWith('wheel_spoke'))            return 'wheel_spoke'   // ← add this

  if (name === 'Body')                           return 'wheel_body'
  if (name.startsWith('stand_axle'))             return 'stand_axle'
  if (name.startsWith('stand_'))                 return 'stand_body'

  // ── Booth ────────────────────────────────────────────────
  if (name.startsWith('booth_front-stripe')) {
    const n = parseInt(name.replace('booth_front-stripe_', ''), 10)
    return (n % 2 === 1) ? 'booth_stripe_a' : 'booth_stripe_b'
  }
  if (name.startsWith('booth_stripe')) {
    const n = parseInt(name.replace('booth_stripe_', ''), 10)
    return (n % 2 === 1) ? 'booth_stripe_a' : 'booth_stripe_b'
  }
  if (name.startsWith('booth_front_bar'))        return 'booth_bar'
  if (name.startsWith('booth_ledge_top'))        return 'booth_ledge_top'
  if (name.startsWith('booth_ledge_bottom'))     return 'booth_ledge_bottom'
  if (name.startsWith('booth_sign-base'))        return 'booth_sign_base'
  if (name.startsWith('booth_letter'))           return 'booth_letter'
  if (name.startsWith('booth_roof'))             return 'booth_roof'
  if (name.startsWith('booth_'))                 return 'booth_body'

  // ── Robot — most specific prefixes first ─────────────────
  if (name.startsWith('robot_U_button-inside'))  return 'robot_button_inside'
  if (name.startsWith('robot_U_button-outside')) return 'robot_button_outside'
  if (name.startsWith('robot_U_shirt'))          return 'robot_suit'
  if (name.startsWith('robot_U_collar') ||
      name.startsWith('robot_U_base'))           return 'robot_undershirt'
  if (name.startsWith('robot_S_collar'))         return 'robot_collar'
  if (name.startsWith('robot_S_'))               return 'robot_suit'
  if (name.startsWith('robot_B_eyebrow') ||
      name.startsWith('robot_eyebrow'))          return 'robot_eyebrow'
  if (name.startsWith('robot_B_'))               return 'robot_body'
  if (name.startsWith('robot_skull') ||
      name.startsWith('robot_chest') ||
      name.startsWith('robot_chin'))             return 'robot_body'
  if (name.startsWith('robot_J'))              return 'robot_jaw'
  if (name.startsWith('robot_F_face-plate-trim')||
      name.startsWith('robot_F_white-trim') ||
      name.startsWith('robot_F_monocle-trim'))   return 'robot_face_trim'
  if (name.startsWith('robot_F_face-plate'))     return 'robot_face_plate'
  if (name.startsWith('robot_F_monocle-base'))   return 'robot_monocle'
  if (name.startsWith('robot_F_outer-eye'))      return 'robot_eye_outer'
  if (name.startsWith('robot_F_inner-eye'))      return 'robot_eye_inner'
  if (name.startsWith('robot_F_pupil'))          return 'robot_pupil'
  if (name.startsWith('robot_eye-'))             return 'robot_eye_socket'
  if (name.startsWith('robot_H_hat-trim'))       return 'robot_hat_trim'
  if (name.startsWith('robot_H_hat-base'))       return 'robot_hat_base'
  if (name.startsWith('robot_C_') &&
      name.includes('-hand'))                    return 'robot_clock_hands'
  if (name.startsWith('robot_C_clock-face') ||
      name.startsWith('robot_C_clock-center'))   return 'robot_clock_face'
  if (name.startsWith('robot_N_big-joint'))      return 'robot_neck_big'
  if (name.startsWith('robot_N_little-joint'))   return 'robot_neck_small'
  if (name.startsWith('Stroke'))                 return 'robot_stroke'

  return null
}

// ─────────────────────────────────────────────────────────────
// MATERIAL BUILDER
// ─────────────────────────────────────────────────────────────

function _buildMat(cfg) {
  const mat = new THREE.MeshStandardMaterial({
    color:       new THREE.Color(cfg.color    ?? '#ffffff'),
    metalness:   cfg.metalness  ?? 0,
    roughness:   cfg.roughness  ?? 0.5,
    transparent: cfg.transparent ?? (cfg.opacity != null && cfg.opacity < 1),
    opacity:     cfg.opacity    ?? 1.0,
    wireframe:   cfg.wireframe  ?? false,
  })
  if (cfg.emissive) {
    mat.emissive          = new THREE.Color(cfg.emissive)
    mat.emissiveIntensity = (cfg.emissiveIntensity ?? 0) * _emissionScale
    mat.userData.baseEmissiveIntensity = cfg.emissiveIntensity ?? 0  // ← add this line
  }
  return mat
}

// Merge BASE + vibe delta, return unified material dict
function _mergedMats(vibeName) {
  const vibe = VIBES[vibeName]
  if (!vibe) return BASE
  return { ...BASE, ...vibe.delta }
}


// ─────────────────────────────────────────────────────────────
// RAIN PARTICLE SYSTEM  (Noir)
// ─────────────────────────────────────────────────────────────

class RainSystem {
  constructor(scene) {
    const COUNT   = 2500
    const SPREAD  = 600
    const HEIGHT  = 350

    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * SPREAD
      pos[i * 3 + 1] = Math.random() * HEIGHT - 100
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))

    const mat = new THREE.PointsMaterial({
      color:       new THREE.Color('#9090a0'),
      size:        1.2,
      transparent: true,
      opacity:     0.55,
      depthWrite:  false,
    })

    this._mesh  = new THREE.Points(geo, mat)
    this._pos   = pos
    this._count = COUNT
    this._floor = -100
    this._top   = HEIGHT - 100
    this._speed = 120

    this._mesh.visible = false
    scene.add(this._mesh)
  }

  setActive(on) { this._mesh.visible = on }

  update(delta) {
    if (!this._mesh.visible) return
    const p = this._pos
    for (let i = 0; i < this._count; i++) {
      p[i * 3 + 1] -= this._speed * delta
      if (p[i * 3 + 1] < this._floor) p[i * 3 + 1] = this._top
    }
    this._mesh.geometry.attributes.position.needsUpdate = true
  }
}

// ─────────────────────────────────────────────────────────────
// AURORA OVERLAY  (Aurora vibe)
// A fullscreen quad rendered directly in the scene at renderOrder 999.
// Bypasses the EffectComposer entirely so it works regardless of
// whatever post-processing pipeline the host app uses.
// Uses gl_FragCoord + a resolution uniform so UVs are always correct.
// ─────────────────────────────────────────────────────────────

let _auroraOverlay = null
let _auroraMat     = null

function _initAuroraOverlay(scene) {
  const geo = new THREE.PlaneGeometry(2, 2)
  _auroraMat = new THREE.ShaderMaterial({
    uniforms: {
      time:        { value: 0 },
      opacity:     { value: 0.65 },
      resolution:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      projMatInv:  { value: new THREE.Matrix4() },
      camWorldMat: { value: new THREE.Matrix4() },
    },
    vertexShader: /* glsl */`
      void main() {
        // Pin quad to clip space — camera has no effect
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform float opacity;
      uniform vec2  resolution;
      uniform mat4  projMatInv;
      uniform mat4  camWorldMat;

      void main() {
        // Reconstruct world-space view direction for this pixel
        vec2 ndc     = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
        vec4 viewRay = projMatInv * vec4(ndc, 1.0, 1.0);
        vec3 viewDir = normalize(viewRay.xyz / viewRay.w);
        vec3 worldDir = normalize((camWorldMat * vec4(viewDir, 0.0)).xyz);

        // elev: 0 = horizon, 1 = zenith — aurora lives above 0.35
        float elev = worldDir.y;
        float sky  = smoothstep(0.20, 0.55, elev);

        float x = gl_FragCoord.x / resolution.x;
        float t = time;

        // ── Pink / magenta — narrow nitrogen fringe ───────────────────────
        float cPk = 0.38
          + sin(x * 0.7  + t * 0.032 + 1.3) * 0.025
          + (sin(x * 4.4 + t * 0.31  + 0.8) - sin(x * 7.1 - t * 0.22)) * 0.016
          + sin(x * 14.0 - t * 0.28) * 0.005;
        float wPk = 0.013 + sin(x * 8.5 - t * 0.19 + 1.2) * 0.005;
        float dPk = (elev - cPk) / max(wPk, 0.005);
        float rPk = exp(-0.5 * dPk * dPk);
        float curtPk = 0.35 + 0.65 * abs(sin(x * 20.0 + t * 0.09));
        rPk *= curtPk;

        // ── Purple / violet — nitrogen lower border ───────────────────────
        float cP = 0.47
          + sin(x * 0.9  + t * 0.028 + 3.7) * 0.030
          + (sin(x * 3.1 - t * 0.26  + 2.4) - sin(x * 5.9 + t * 0.18)) * 0.024
          + sin(x * 12.0 - t * 0.22) * 0.006;
        float wP = 0.021 + sin(x * 6.3 + t * 0.14 + 0.7) * 0.008;
        float dP = (elev - cP) / max(wP, 0.006);
        float rP = exp(-0.5 * dP * dP);
        float curtP = 0.30 + 0.70 * abs(sin(x * 13.0 - t * 0.07 + 1.8));
        rP *= curtP;

        // ── Green — dominant band, oxygen 90–150 km ───────────────────────
        float cG = 0.58
          + sin(x * 0.6  + t * 0.022 + 0.4) * 0.035
          + (sin(x * 2.3 + t * 0.22)        - sin(x * 3.9 - t * 0.16)) * 0.034
          + sin(x * 8.5  - t * 0.18 + 0.4)  * 0.012;
        float wG = 0.036 + sin(x * 4.6 + t * 0.12 + 2.1) * 0.013;
        float dG = (elev - cG) / max(wG, 0.008);
        float rG = exp(-0.5 * dG * dG);
        float curtG = 0.30 + 0.70 * abs(sin(x * 8.5 + t * 0.05 + 0.9));
        rG *= curtG;

        // ── Cyan / teal — upper oxygen edge ──────────────────────────────
        float cC = 0.68
          + sin(x * 0.8  + t * 0.026 + 2.2) * 0.030
          + (sin(x * 1.8 + t * 0.19  + 1.1) - sin(x * 4.3 - t * 0.14)) * 0.028
          + sin(x * 10.0 + t * 0.15  + 2.6) * 0.009;
        float wC = 0.028 + sin(x * 5.9 - t * 0.10 + 1.4) * 0.010;
        float dC = (elev - cC) / max(wC, 0.007);
        float rC = exp(-0.5 * dC * dC);
        float curtC = 0.35 + 0.65 * abs(sin(x * 10.5 - t * 0.06 + 3.1));
        rC *= curtC;

        // ── Red / crimson — oxygen >300 km, very diffuse ──────────────────
        float cR = 0.80
          + sin(x * 0.5  + t * 0.018 + 4.8) * 0.045
          + (sin(x * 1.4 + t * 0.15  + 3.0) - sin(x * 2.8 - t * 0.10)) * 0.048;
        float wR = 0.062 + sin(x * 3.1 + t * 0.07 + 0.6) * 0.020;
        float dR = (elev - cR) / max(wR, 0.012);
        float rR = exp(-0.5 * dR * dR);

        // ── Physical colours ─────────────────────────────────────────────
        vec3 colPk = vec3(1.00, 0.27, 0.73) * rPk * 0.65;
        vec3 colP  = vec3(0.53, 0.13, 1.00) * rP  * 0.75;
        vec3 colG  = vec3(0.00, 1.00, 0.33) * rG  * 1.00;
        vec3 colC  = vec3(0.00, 0.87, 1.00) * rC  * 0.70;
        vec3 colR  = vec3(1.00, 0.13, 0.00) * rR  * 0.22;

        vec3  col   = (colPk + colP + colG + colC + colR) * sky;
        float alpha = (rPk * 0.65 + rP * 0.75 + rG * 1.00 + rC * 0.70 + rR * 0.22)
                      * sky * opacity;

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthTest:   false,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  })

  _auroraOverlay = new THREE.Mesh(geo, _auroraMat)
  _auroraOverlay.frustumCulled = false
  _auroraOverlay.renderOrder   = -1   // render first; scene geometry draws on top
  _auroraOverlay.visible       = false
  scene.add(_auroraOverlay)

  window.addEventListener('resize', () => {
    _auroraMat.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
  })
}

// ─────────────────────────────────────────────────────────────
// SCANLINE SHADER  (Midnight Arcade — high/medium tier)
// ─────────────────────────────────────────────────────────────

const ScanlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    time:     { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float     time;
    varying vec2      vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // Scrolling scanlines
      float line = sin(vUv.y * 600.0 - time * 3.0) * 0.035;
      col.rgb    = max(vec3(0.0), col.rgb - line);
      // Soft CRT vignette
      float d    = distance(vUv, vec2(0.5));
      col.rgb   *= 1.0 - d * 0.45;
      // Subtle RGB fringe
      col.r      = texture2D(tDiffuse, vUv + vec2(0.0015, 0.0)).r;
      col.b      = texture2D(tDiffuse, vUv - vec2(0.0015, 0.0)).b;
      gl_FragColor = col;
    }
  `,
}


// ─────────────────────────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────────────────────────

let _refs        = null          // sceneRefs from initVibes()
let _activeVibe  = 'suave'
let _composer    = null          // EffectComposer (null if low tier)
let _bloomPass   = null
let _outlinePass = null
let _scanPass    = null
let _fxaaPass    = null
let _rain        = null
let _transitioning = false
let _emissionScale = 1.0



// ─────────────────────────────────────────────────────────────
// POST-PROCESSING SETUP
// ─────────────────────────────────────────────────────────────

function _setupComposer() {
  const { scene, camera, renderer } = _refs
  const size = new THREE.Vector2()
  renderer.getSize(size)

  _composer = new EffectComposer(renderer)
  _composer.addPass(new RenderPass(scene, camera))

  // Bloom (medium + high)
  _bloomPass = new UnrealBloomPass(size, 0.55, 0.55, 0.70)
  _composer.addPass(_bloomPass)

  // Outline (high only — Blueprint / Pop Art)
  if (_perfTier === 'high') {
    _outlinePass = new OutlinePass(size, scene, camera)
    _outlinePass.edgeStrength  = 3.5
    _outlinePass.edgeThickness = 1.5
    _outlinePass.visibleEdgeColor.set('#ffffff')
    _outlinePass.enabled = false
    _composer.addPass(_outlinePass)
  }

  // Scanlines (high + medium — Midnight Arcade)
  _scanPass = new ShaderPass(ScanlineShader)
  _scanPass.enabled = false
  _composer.addPass(_scanPass)

  // FXAA at the end
  _fxaaPass = new ShaderPass(FXAAShader)
  _fxaaPass.uniforms['resolution'].value.set(1 / size.x, 1 / size.y)
  _composer.addPass(_fxaaPass)
}

function _configurePostFX(vibeName) {
    // Drive the real postprocessing bloom instead of the internal one
  const atm = VIBES[vibeName]?.atmosphere ?? {}
  const fx  = VIBES[vibeName]?.fx ?? {}
  const realBloom = _refs?.bloomPass
  const realMix   = _refs?.mixPass


  if (realBloom) {
    realBloom.strength  = atm.bloomStrength  ?? 0.55
    realBloom.radius    = atm.bloomRadius    ?? 0.55
    realBloom.threshold = atm.bloomThreshold ?? 0.70
  }
  if (realMix) {
    realMix.uniforms.bloomStrength.value = atm.bloomStrength ?? 0.8
  }
  // ── Outlines (Blueprint / Pop-Art) — real pass in the final composer ──
  const outline = _refs?.outlinePass
  if (outline) {
    outline.enabled = (fx.outlines ?? false) && _perfTier === 'high'
    if (outline.enabled) {
      // Select the whole scene root, NOT a hand-built mesh list. OutlinePass
      // hides every non-selected mesh each frame to build its mask; a partial
      // list meant the meshes it missed (Sir, the cabins — the rig/clones
      // produce different objects than our refs) got hidden and stranded
      // invisible. With the scene root selected, no mesh is ever "non-
      // selected", so the pass can never hide anything.
      outline.selectedObjects = [_refs.scene]
      const edge = vibeName === 'pop_art' ? '#111111' : '#4488ff'
      outline.visibleEdgeColor.set(edge)
      outline.hiddenEdgeColor.set(edge)
    } else {
      outline.selectedObjects = []
    }
  }

  // ── Scanlines (Midnight Arcade) — real pass in the final composer ──
  const scan = _refs?.scanPass
  if (scan) {
    scan.enabled = (fx.scanlines ?? false) && _perfTier !== 'low'
  }

  // Aurora overlay — show/hide and set opacity
  if (_auroraOverlay) {
    _auroraOverlay.visible = fx.aurora ?? false
    if (_auroraMat && _auroraOverlay.visible)
      _auroraMat.uniforms.opacity.value = fx.auroraOpacity ?? 0.65
  }
}


// ─────────────────────────────────────────────────────────────
// MATERIAL APPLICATION
// ─────────────────────────────────────────────────────────────

function _applyMatsToObject(obj, matDict) {
  if (!obj) return
  obj.traverse(child => {
    if (!child.isMesh) return
    const key = _resolveKey(child.name)
    if (!key || !matDict[key]) return
    // Clone to avoid sharing across instances
    child.material = _buildMat(matDict[key])
    child.castShadow    = true
    child.receiveShadow = true
    
    if ((matDict[key].emissiveIntensity ?? 0) > 0) {
      child.layers.enable(1)   // BLOOM_LAYER
    } else {
      child.layers.disable(1)
    }
  })
}

function _applyVibeMaterials(vibeName) {
  const mats = _mergedMats(vibeName)
  const r    = _refs

  // All cabin groups
  for (const cabin of (r.cabinGroups ?? [])) _applyMatsToObject(cabin, mats)
  _applyMatsToObject(r.wheelScene,  mats)
  _applyMatsToObject(r.standScene,  mats)
  _applyMatsToObject(r.boothScene,  mats)
  _applyMatsToObject(r.robotScene,  mats)
}


// ─────────────────────────────────────────────────────────────
// ATMOSPHERE APPLICATION  (lights + fog)
// ─────────────────────────────────────────────────────────────

function _applyAtmosphere(vibeName) {
  const atm = VIBES[vibeName]?.atmosphere
  if (!atm || !_refs) return

  if (_refs.ambientLight) {
    _refs.ambientLight.color.set(atm.ambientColor)
    _refs.ambientLight.intensity = atm.ambientIntensity
  }
  if (_refs.moonLight) {
    _refs.moonLight.color.set(atm.moonColor)
    _refs.moonLight.intensity = atm.moonIntensity
  }
  if (_refs.fogParticleSystem) {
    _refs.fogParticleSystem.setColor(atm.fogColor)
  }
  if (_refs.scene.fog) {
    _refs.scene.fog.color.set(atm.fogColor)
  }
  if (_refs.scene) _refs.scene.background = new THREE.Color(atm.skyColor ?? '#0d0221')
  // Rain
  if (_rain) _rain.setActive(VIBES[vibeName]?.fx?.rain ?? false)
}


// ─────────────────────────────────────────────────────────────
// TRANSITION HELPERS
// ─────────────────────────────────────────────────────────────

const _delay = ms => new Promise(r => setTimeout(r, ms))

async function _flickerLights(durationMs) {
  const al    = _refs.ambientLight
  const ml    = _refs.moonLight
  if (!al && !ml) return

  const origA = al?.intensity ?? 0
  const origM = ml?.intensity ?? 0
  const end   = performance.now() + durationMs

  while (performance.now() < end) {
    const on = Math.random() > 0.45
    if (al) al.intensity = on ? origA * 2.2 : 0
    if (ml) ml.intensity = on ? origM * 1.8 : 0
    await _delay(40 + Math.random() * 60)
  }

  if (al) al.intensity = origA
  if (ml) ml.intensity = origM
}

async function _flickerSpokes(vibeName) {
  const lights = _refs.attachLights
  if (!lights?.length) return
  const targetColor = new THREE.Color(VIBES[vibeName]?.atmosphere.moonColor ?? '#ffffff')

  for (const light of lights) {
    for (let i = 0; i < 4; i++) {
      light.intensity = i % 2 === 0 ? 2.5 : 0
      await _delay(55)
    }
    light.color.copy(targetColor)
    light.intensity = 1.0
    await _delay(75)
  }
}

async function _wakeGondolas(vibeName) {
  const cabins = _refs.cabinGroups
  if (!cabins?.length) return
  const mats = _mergedMats(vibeName)

  for (const cabin of cabins) {
    await _delay(140)
    // Three quick blinks of interior trim
    const trimMesh = []
    cabin.traverse(c => {
      if (c.isMesh && _resolveKey(c.name) === 'cabin_trim_window_int') trimMesh.push(c)
    })
    for (let b = 0; b < 5; b++) {
      const on = b % 2 === 0
      for (const m of trimMesh) {
        if (m.material) m.material.emissiveIntensity = on ? 0 : (mats.cabin_trim_window_int?.emissiveIntensity ?? 0.08)
      }
      await _delay(70)
    }
  }
}

async function _fadeFog(targetColor) {
  const fps = _refs.fogParticleSystem
  if (!fps) return
  fps.setOpacity(0)
  await _delay(100)
  fps.setColor(targetColor)
  // Fade up over 600ms in 10 steps
  for (let i = 1; i <= 10; i++) {
    fps.setOpacity(i * 0.1)
    await _delay(60)
  }
}


// ─────────────────────────────────────────────────────────────
// TRANSITION RUNNER
// ─────────────────────────────────────────────────────────────

async function _runTransition(vibeName) {
  if (_transitioning || !_refs) return
  _transitioning = true

  const vibe = VIBES[vibeName]
  if (!vibe) { _transitioning = false; return }

  // 1. Crackle sound
  _playSound('sounds/vibe_crackle.mp3', { volume: 0.70 })

  // 2. Light flicker (electrical surge)
  await _flickerLights(650)

  // 3. Startup rumble
  _playSound('sounds/vibe_startup.mp3', { volume: 0.80 })

  // 4. Swap all materials + atmosphere
  _applyVibeMaterials(vibeName)
  _applyAtmosphere(vibeName)
  _configurePostFX(vibeName)
  _activeVibe = vibeName

  // 5. Spokes flicker on one by one
  await _flickerSpokes(vibeName)

  // 6. Fog rolls back in
  await _fadeFog(vibe.atmosphere.fogColor)

  // 7. Gondola lights blink awake sequentially
  await _wakeGondolas(vibeName)

  // 8. Boot-complete chime
  _playSound('sounds/vibe_boot.mp3', { volume: 0.60 })

  _transitioning = false
}


// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Store scene refs, create rain system, set up post-processing.
 * Call once after all GLBs are loaded.
*/
export function initVibes(sceneRefs) {
  _refs = sceneRefs
  _rain = new RainSystem(_refs.scene)
  _initAuroraOverlay(_refs.scene)

  const robotLight = new THREE.PointLight('#ffffff', 1.5, 120)
  robotLight.castShadow = false  // ← roof can't block it

  if (_refs.robotScene) {
    const box    = new THREE.Box3().setFromObject(_refs.robotScene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())

    robotLight.position.set(
      center.x,
      center.y + size.y * 0.1,  // roughly face/chest height, not above the roof
      center.z + size.z * 1.5   // well in front of the booth opening
    )
  }

  _refs.scene.add(robotLight)
  _refs.robotLight = robotLight

  // NOTE: the vibe post-FX (outline + scanline) now live in the single
  // finalComposer built by postprocessing.js and are driven via
  // _refs.outlinePass / _refs.scanPass in _configurePostFX(). We no longer
  // build a second, never-rendered composer here. _setupComposer() and its
  // ScanlineShader are kept below for reference only.
  // if (_perfTier !== 'low') _setupComposer()
}
/**
 * Immediately apply a vibe without transition (use for initial load).
 */
export function applyVibe(vibeName) {
  if (!_refs) return
  _applyVibeMaterials(vibeName)
  _applyAtmosphere(vibeName)
  _configurePostFX(vibeName)
  _activeVibe = vibeName
}

/**
 * Full cinematic transition: flicker → startup sound → materials → 
 * spokes → fog → gondolas → boot chime.
 */
export function triggerVibeTransition(vibeName) {
  if (getDevSkipTransitions()) {
    applyVibe(vibeName)   // instant swap, no flicker/sounds/delays
    return
  }
  applyVibe(vibeName)
  //_runTransition(vibeName)
}

/** Returns the currently active vibe name. */
export const getActiveVibe = () => _activeVibe

/** Returns the EffectComposer (null on low-tier). Use instead of renderer.render(). */
export const getComposer = () => _composer

/**
 * Call every frame from the render loop.
 * Ticks rain particles and scanline time uniform.
 */
export function updateVibes(delta) {
  _rain?.update(delta)
  if (_refs?.scanPass) _refs.scanPass.uniforms.time.value += delta
  if (_auroraOverlay?.visible && _auroraMat)
    _auroraMat.uniforms.time.value += delta
  if (_refs?.camera) {
      _auroraMat.uniforms.projMatInv.value.copy(_refs.camera.projectionMatrixInverse)
      _auroraMat.uniforms.camWorldMat.value.copy(_refs.camera.matrixWorld)
    }
}

/** Expose vibe metadata (label, fx flags) — useful for UI. */
export const getVibeInfo = name => VIBES[name] ?? null
export const VIBE_KEYS   = Object.keys(VIBES)
export const INITIAL_VIBE = 'aurora'
export const isTransitioning = () => _transitioning
/**
 * Scale all emissive intensities scene-wide.
 * knobValue 0–1 maps to multiplier 0–2 (0.5 = natural/designed intensity).
 */
export function setEmissionScale(knobValue) {
  _emissionScale = knobValue * 2
  if (!_refs) return
  const scenes = [_refs.wheelScene, _refs.standScene, _refs.boothScene, _refs.robotScene]
  for (const cabin of (_refs.cabinGroups ?? [])) scenes.push(cabin)
  for (const obj of scenes) {
    if (!obj) continue
    obj.traverse(child => {
      if (!child.isMesh || !child.material) return
      const base = child.material.userData.baseEmissiveIntensity
      if (base != null) child.material.emissiveIntensity = base * _emissionScale
    })
  }
}
/**
 * Show or hide the aurora overlay independently of the active vibe.
 * Call setAuroraActive(false) when entering cabin interior view,
 * setAuroraActive(true) when returning to orbit/exterior.
 */
export function setAuroraActive(visible) {
  if (_auroraOverlay) {
    const isAuroraVibe = VIBES[_activeVibe]?.fx?.aurora ?? false
    _auroraOverlay.visible = visible && isAuroraVibe
  }
}