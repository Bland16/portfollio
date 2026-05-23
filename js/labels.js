// ═══════════════════════════════════════════════════════════
// labels.js — CSS3DRenderer cabin labels
//   Marquee-plate style signs that match the active vibe.
//   Same public API as before — drop-in replacement.
//
//   Public methods:
//     createLabel(cabinConfig, pivotGroup, onClickCallback)
//     setVisible(visible)
//     setVibe(vibeName)   ← new; call from main.js on vibe change
//     update()
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

// ─────────────────────────────────────────────────────────────
// VIBE PALETTE TABLE
// Each entry drives border colour, text colour, background, and
// the strength of the box-shadow glow.
// ─────────────────────────────────────────────────────────────

const VIBE_PALETTES = {
  suave:           { border: '#c9a84c', text: '#f0e6cc', bg: 'rgba(10,6,20,0.84)',    glow: 'rgba(201,168,76,0.22)' },
  carnival:        { border: '#ec500d', text: '#f5e8c0', bg: 'rgba(20,8,4,0.88)',     glow: 'rgba(236,80,13,0.24)'  },
  noir:            { border: '#cc8800', text: '#cccccc', bg: 'rgba(8,8,8,0.90)',      glow: 'rgba(204,136,0,0.18)'  },
  blueprint:       { border: '#4488ff', text: '#aaccff', bg: 'rgba(0,16,51,0.90)',    glow: 'rgba(68,136,255,0.25)' },
  midnight_arcade: { border: '#ff00ff', text: '#ffffff', bg: 'rgba(5,5,16,0.92)',     glow: 'rgba(255,0,255,0.32)'  },
  pastel:          { border: '#ffb8d4', text: '#a06080', bg: 'rgba(255,255,255,0.88)', glow: 'rgba(255,184,212,0.28)'},
  aurora:          { border: '#00ffaa', text: '#c0fff0', bg: 'rgba(2,8,8,0.90)',      glow: 'rgba(0,255,170,0.26)'  },
}

const FALLBACK_PALETTE = VIBE_PALETTES.suave

// ─────────────────────────────────────────────────────────────
// SHARED STYLESHEET
// Injected once into <head> so CSS3DRenderer picks it up.
// Only handles transitions and the inner hairline rings —
// colours are always set inline so setVibe() can update them
// without a stylesheet rebuild.
// ─────────────────────────────────────────────────────────────

function _injectStyles() {
  if (document.getElementById('label-system-styles')) return
  const el = document.createElement('style')
  el.id = 'label-system-styles'
  el.textContent = /* css */`
    .cabin-label {
      font-family: Georgia, 'Times New Roman', serif;
      font-style: italic;
      font-size: 22px;
      letter-spacing: 0.06em;
      white-space: nowrap;
      padding: 10px 24px;
      border-radius: 3px;
      position: relative;
      cursor: pointer;
      transition:
        color        0.45s ease,
        background   0.45s ease,
        border-color 0.45s ease,
        box-shadow   0.45s ease,
        opacity      0.40s ease,
        transform    0.18s ease;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Inner hairline rings for depth */
    .cabin-label::before,
    .cabin-label::after {
      content: '';
      position: absolute;
      left: 7px; right: 7px;
      height: 1px;
      background: currentColor;
      opacity: 0.22;
      pointer-events: none;
    }
    .cabin-label::before { top:    5px; }
    .cabin-label::after  { bottom: 5px; }

    .cabin-label:hover {
      transform: scale(1.06);
    }
  `
  document.head.appendChild(el)
}


// ─────────────────────────────────────────────────────────────
// LABEL SYSTEM CLASS
// ─────────────────────────────────────────────────────────────

export class LabelSystem {
  constructor({ scene, camera, container }) {
    this.scene   = scene
    this.camera  = camera
    this.labels  = []   // { cssObj, config, div }[]
    this._vibe   = 'suave'
    this._visible = true

    _injectStyles()

    this.renderer = new CSS3DRenderer()
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    Object.assign(this.renderer.domElement.style, {
      position:      'absolute',
      top:           '0',
      left:          '0',
      pointerEvents: 'none',
    })
    container.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  // ── CREATE LABEL ────────────────────────────────────────────
  createLabel(cabinConfig, pivotGroup, onClickCallback) {
    const div = document.createElement('div')
    div.className = 'cabin-label'
    div.textContent = cabinConfig.label
    div.style.pointerEvents = 'auto'

    this._applyPaletteToDiv(div, this._vibe)

    div.addEventListener('click',      () => onClickCallback?.(cabinConfig))
    div.addEventListener('mouseenter', () => this._onHoverEnter(div))
    div.addEventListener('mouseleave', () => this._onHoverLeave(div, this._vibe))

    const cssObj = new CSS3DObject(div)
    cssObj.position.set(0, 0, 0)
    cssObj.scale.setScalar(0.0008)
    pivotGroup.add(cssObj)

    this.labels.push({ cssObj, config: cabinConfig, div })
    return cssObj
  }

  // ── VIBE UPDATE ─────────────────────────────────────────────
  // Call this whenever the active vibe changes so labels repaint.
  // e.g. in main.js, after triggerVibeTransition():
  //   labelSystem.setVibe(vibeName)
  setVibe(vibeName) {
    this._vibe = vibeName
    for (const { div } of this.labels) {
      this._applyPaletteToDiv(div, vibeName)
    }
  }

  // ── HIDE / SHOW ─────────────────────────────────────────────
  setVisible(visible) {
    this._visible = visible
    for (const { div } of this.labels) {
      div.style.opacity       = visible ? '1' : '0'
      div.style.pointerEvents = visible ? 'auto' : 'none'
    }
  }

  // ── UPDATE (call every frame) ────────────────────────────────
  update() {
    for (const { cssObj } of this.labels) {
      // Counter-rotate so the label stays upright in world space
      const q = new THREE.Quaternion()
      cssObj.parent.getWorldQuaternion(q)
      cssObj.quaternion.copy(q.invert())
    }
    this.renderer.render(this.scene, this.camera)
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────

  _applyPaletteToDiv(div, vibeName) {
    const p = VIBE_PALETTES[vibeName] ?? FALLBACK_PALETTE
    div.style.background = p.bg
    div.style.color      = p.text
    div.style.border     = `1.5px solid ${p.border}`
    div.style.boxShadow  = `0 0 14px ${p.glow}, inset 0 0 6px rgba(255,255,255,0.03)`
  }

  _onHoverEnter(div) {
    const p = VIBE_PALETTES[this._vibe] ?? FALLBACK_PALETTE
    // Brighten glow and background on hover
    div.style.boxShadow = `0 0 24px ${p.glow}, 0 0 6px ${p.border}55, inset 0 0 8px rgba(255,255,255,0.05)`
  }

  _onHoverLeave(div, vibeName) {
    this._applyPaletteToDiv(div, vibeName)
  }
}