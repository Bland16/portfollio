// ═══════════════════════════════════════════════════════════
// buttons.js — 3D physical navigation bar (CSS Replacement)
//
// Exports:  initButtons(options)
//           → { update, buttonGroup }
//
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MATERIALS } from './config.js'
import {
  handleRobotClick,
  handleMusicToggle,
  handleVibeCycle,
  handlePDFClick,
  initButtonCallbacks,
} from './buttonFunctions.js'


// ─────────────────────────────────────────────────────────────
// VIBE CYCLE ORDER
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

let currentVibeIndex = 1


// ─────────────────────────────────────────────────────────────
// VIBE KEYCAP COLOUR TABLE (Preserved for compatibility)
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

// Unused structural remnants kept clean so compiler doesn't complain about deletion edits
function _stripBlenderSuffix(name) { return name.replace(/[._]\d{3}$/, '') }
function _initVibeKeycapMaterials() {}
function _applyVibeKeycapColors() {}


// ─────────────────────────────────────────────────────────────
// INJECT GLOBAL NAVIGATION CSS
// ─────────────────────────────────────────────────────────────

const styleElement = document.createElement('style')
styleElement.textContent = `
  .nav-bar-3d-fallback {
    position: fixed;
    top: 20px;            /* Moves it down from the top edge */
    left: 20px;           /* Moves it in from the left edge */
    display: flex;
    gap: 16px;
    z-index: 99999;
    pointer-events: auto;
  }
  .btn-housing {
    background: #1e1e1e;
    padding: 6px;
    border-radius: 12px;
    box-shadow: 0 10px 20px rgba(0,0,0,0.5), inset 0 2px 0px rgba(255,255,255,0.1), inset 0 -4px 6px rgba(0,0,0,0.6);
    border: 2px solid #2a2a2a;
  }
  .btn-keycap {
    appearance: none;
    border: none;
    outline: none;
    width: 64px;
    height: 64px;
    border-radius: 8px;
    background: #dcdad4;
    color: #1c1c1c;
    font-size: 24px;
    cursor: pointer;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translateY(-6px);
    box-shadow: 0 6px 0px #9c9a94, 0 8px 10px rgba(0,0,0,0.3);
    transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.25s ease;
  }
  .btn-keycap:active {
    transform: translateY(0px);
    box-shadow: 0 0px 0px #9c9a94, 0 2px 4px rgba(0,0,0,0.4);
  }
  .btn-keycap::before {
    content: attr(data-tooltip);
    position: absolute;
    top: -45px;
    left: 50%;
    transform: translateX(-50%) translateY(5px);
    background: #f7f6f3;
    color: #1c1c1c;
    font-family: "SF Pro Text", "Segoe UI", system-ui, sans-serif;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.04em;
    padding: 5px 11px;
    border-radius: 7px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
    opacity: 0;
    pointer-events: none;
    white-space: nowrap;
    transition: opacity 0.12s ease, transform 0.12s ease;
  }
  .btn-keycap:hover::before {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .vibe-keycap[data-vibe="suave"] { background: #dcdad4; }
  .vibe-keycap[data-vibe="suave"] .vibe-icon { text-shadow: 0 0 8px #4488ff; }
  .vibe-keycap[data-vibe="pastel"] { background: #fbc4ab; }
  .vibe-keycap[data-vibe="pastel"] .vibe-icon { text-shadow: 0 0 8px #f08080; }
  .vibe-keycap[data-vibe="carnival"] { background: #ff99cc; }
  .vibe-keycap[data-vibe="carnival"] .vibe-icon { text-shadow: 0 0 10px #ec500d; }
  .vibe-keycap[data-vibe="noir"] { background: #d8d8d8; }
  .vibe-keycap[data-vibe="noir"] .vibe-icon { text-shadow: none; }
  .vibe-keycap[data-vibe="blueprint"] { background: #aaccff; box-shadow: 0 6px 0px #4488cc, 0 8px 10px rgba(0,0,0,0.3); }
  .vibe-keycap[data-vibe="blueprint"]:active { box-shadow: 0 0px 0px #4488cc, 0 2px 4px rgba(0,0,0,0.4); }
  .vibe-keycap[data-vibe="midnight_arcade"] { background: #1a0a2e; box-shadow: 0 6px 0px #ff00ff, 0 8px 10px rgba(0,0,0,0.3); }
  .vibe-keycap[data-vibe="midnight_arcade"]:active { box-shadow: 0 0px 0px #ff00ff, 0 2px 4px rgba(0,0,0,0.4); }
  .vibe-keycap[data-vibe="midnight_arcade"] .vibe-icon { text-shadow: 0 0 12px #00ffff; }
  .vibe-keycap[data-vibe="aurora"] { background: #e0fbfc; }
  .vibe-keycap[data-vibe="aurora"] .vibe-icon { text-shadow: 0 0 10px #4ecdc4; }
`
document.head.appendChild(styleElement)


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

  // Forward all operational structural components safely 
  initButtonCallbacks({ onRobotNav, onSkillsOpen, onPortfolioOpen, onVibeChange })

  // Clean up any existing instance wrapper element to prevent duplicate UI bars on reload
  const existingNav = document.getElementById('css-nav-bar-wrapper')
  if (existingNav) existingNav.remove()

  // Generate pure HTML modern layout component
  const navContainer = document.createElement('div')
  navContainer.id = 'css-nav-bar-wrapper'
  navContainer.className = 'nav-bar-3d-fallback'
  navContainer.innerHTML = `
    <div class="btn-housing">
      <button class="btn-keycap" id="html-btn-robot" data-tooltip="Robot">🤖</button>
    </div>
    <div class="btn-housing">
      <button class="btn-keycap" id="html-btn-music" data-tooltip="Play music">🔇</button>
    </div>
    <div class="btn-housing">
      <button class="btn-keycap vibe-keycap" id="html-btn-vibe" data-tooltip="Vibe" data-vibe="${VIBE_NAMES[currentVibeIndex]}">
        <span class="vibe-icon">🎨</span>
      </button>
    </div>
    <div class="btn-housing">
      <button class="btn-keycap" id="html-btn-pdf" data-tooltip="PDF">📄</button>
    </div>
  `

  // Attach navbar overlay cleanly inside the document parent layout space
  const mountTarget = domElement?.parentElement || document.body
  mountTarget.appendChild(navContainer)

  // ── Hook Interactive Component Events ───────────────────────
  
  document.getElementById('html-btn-robot').addEventListener('click', () => {
    if (typeof handleRobotClick === 'function') handleRobotClick()
  })

  document.getElementById('html-btn-music').addEventListener('click', () => {
    if (typeof handleMusicToggle === 'function') handleMusicToggle()
  })

  document.getElementById('html-btn-pdf').addEventListener('click', () => {
    if (typeof handlePDFClick === 'function') handlePDFClick()
  })

  const vibeBtn = document.getElementById('html-btn-vibe')
  vibeBtn.addEventListener('click', () => {
    if (typeof handleVibeCycle === 'function') {
      const fired = handleVibeCycle()
      // If the dynamic theme execution was allowed, advance UI visual state preview
      if (fired !== false) {
        currentVibeIndex = (currentVibeIndex + 1) % VIBE_NAMES.length
        vibeBtn.setAttribute('data-vibe', VIBE_NAMES[currentVibeIndex])
      }
    }
  })

  // ── Engine Compatibility Architecture ───────────────────────
  
  // Return dummy standard Three objects and active loops so your engine cycle can run unbothered.
  const dummyButtonGroup = new THREE.Group()

  function update() {
    // Left cleanly empty; CSS state tracking handles transitions and visual clicks natively.
  }

  return { 
    update, 
    buttonGroup: dummyButtonGroup 
  }
}