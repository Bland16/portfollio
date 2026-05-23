// ═══════════════════════════════════════════════════════════════════════════════
// devmode.js — Scene editor dev overlay
//
// FEATURES
//   • Click any spawned item → select it (cyan BoxHelper outline)
//   • WASD / arrow keys  → nudge X / Z  (no Y bleed)
//   • R / F              → nudge Y  (up / down)
//   • [ / ]              → rotate Y
//   • + / –              → scale
//   • Inline label + description editing
//   • "Copy Config" → prints ready-to-paste config entry to console
//   • Toggle to skip vibe transitions (instant swap)
//   • Mesh-name picker → hover any scene object, click to copy name
//
// INTEGRATION — three places need small additions:
//
//   1. main.js  ─ create + wire:
//        import { DevMode } from './devmode.js'
//        const devMode = new DevMode({ scene, camera, inspectSystem })
//        // inside render loop:
//        devMode.update()
//
//   2. camera.js  ─ skip arrow keys while devmode has an item selected:
//        import { isDevModeActive } from './devmode.js'
//        // at the top of the keydown handler inside _bindKeys():
//        if (isDevModeActive()) return
//
//   3. inspect.js  ─ block normal item-click while devmode is on:
//        import { isDevModeActive } from './devmode.js'
//        // at the top of _onItemClick():
//        if (isDevModeActive()) return
//
//   4. vibes.js  ─ honour the skip-transitions flag:
//        import { getDevSkipTransitions } from './devmode.js'
//        // wherever you start a vibe tween, guard it:
//        if (getDevSkipTransitions()) { /* apply end-state instantly */ return }
//
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three'

// ─── PUBLIC FLAGS ─────────────────────────────────────────────────────────────
// Consumed by vibes.js / camera.js — import and check these directly.

let _skipTransitions = false
/** @returns {boolean} true → vibes.js should skip tween and jump to end state */
export const getDevSkipTransitions = () => _skipTransitions

let _devActive = false
/** @returns {boolean} true while DevMode panel is open */
export const isDevModeActive = () => _devActive

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DEFAULT_NUDGE_STEP = 0.1   // scene units per keypress (configurable in panel)
const ROTATE_STEP        = 0.05  // radians per keypress (fixed)
const SCALE_STEP         = 0.5   // scene units per keypress (fixed)
const OUTLINE_COLOR      = 0x00ffff

// ─── PANEL STYLES (injected once) ────────────────────────────────────────────

const CSS = `
  #dm-panel {
    position: fixed;
    top: 14px;
    right: 14px;
    width: 268px;
    background: rgba(8, 8, 16, 0.94);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(0, 255, 255, 0.18);
    border-radius: 10px;
    padding: 14px 14px 12px;
    font-family: "JetBrains Mono", "Fira Mono", ui-monospace, monospace;
    font-size: 11px;
    color: #aaa;
    z-index: 10000;
    display: none;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 8px 40px rgba(0, 255, 255, 0.07), 0 2px 8px rgba(0,0,0,0.5);
    line-height: 1.55;
    pointer-events: all;
  }
  #dm-panel * { box-sizing: border-box; }

  .dm-section {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding-top: 9px;
  }
  .dm-label {
    color: #444;
    font-size: 9.5px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .dm-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: #ddd;
    padding: 4px 7px;
    border-radius: 5px;
    font-family: inherit;
    font-size: 11px;
    outline: none;
    transition: border-color 0.15s;
  }
  .dm-input:focus { border-color: rgba(0,255,255,0.4); }
  .dm-input[type=number] { -moz-appearance: textfield; }
  .dm-input[type=number]::-webkit-outer-spin-button,
  .dm-input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
  textarea.dm-input { resize: vertical; min-height: 52px; }

  .dm-btn {
    background: rgba(0,255,255,0.08);
    border: 1px solid rgba(0,255,255,0.25);
    color: #0ff;
    padding: 5px 8px;
    border-radius: 5px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .dm-btn:hover { background: rgba(0,255,255,0.18); }

  .dm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }

  .dm-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 2px 0;
    color: #888;
  }
  .dm-toggle:hover { color: #bbb; }
  .dm-toggle input[type=checkbox] { cursor: pointer; accent-color: #0ff; }

  #dm-pos-val   { color: #7df; white-space: pre; font-size: 11px; }
  #dm-sel-name  { font-size: 11.5px; }
  #dm-toast     { min-height: 13px; font-size: 10px; color: #ff0; }
  #dm-mesh-name { min-height: 13px; font-size: 10px; color: #fa0; word-break: break-all; }

  .dm-keys td { padding: 1px 0; }
  .dm-keys td:first-child { color: #555; width: 110px; }
  .dm-keys td:last-child  { color: #777; }
`

// ─── CLASS ────────────────────────────────────────────────────────────────────

export class DevMode {
  /**
   * @param {{
   *   scene:         THREE.Scene,
   *   camera:        THREE.Camera,
   *   inspectSystem: import('./inspect.js').InspectSystem
   * }} opts
   */
  constructor({ scene, camera, inspectSystem }) {
    this.scene         = scene
    this.camera        = camera
    this.inspectSystem = inspectSystem

    this.isActive     = false
    this.selected     = null          // root Object3D of selected item
    this.meshPickMode = false

    this._nudgeStep   = DEFAULT_NUDGE_STEP
    this._boxHelper   = null
    this._ray         = new THREE.Raycaster()
    this._mouse       = new THREE.Vector2()
    this._hoveredMesh = null
    this._toastTimer  = null

    this._injectCSS()
    this._buildPanel()
    this._bindEvents()
  }

  // ── PUBLIC: TOGGLE ──────────────────────────────────────────────────────────

  toggle() {
    this.isActive ? this._deactivate() : this._activate()
  }

  // ── PUBLIC: FRAME UPDATE ────────────────────────────────────────────────────
  /** Call once per frame from your render loop. */
  update() {
    if (this._boxHelper) this._boxHelper.update()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTIVATE / DEACTIVATE
  // ─────────────────────────────────────────────────────────────────────────────

  _activate() {
    this.isActive            = true
    _devActive               = true
    this._panel.style.display = 'flex'
    this._toast('Click any item to select it')
  }

  _deactivate() {
    this.isActive            = false
    _devActive               = false
    this._deselect()
    this._panel.style.display = 'none'
    this._hoveredMesh         = null
    this._meshNameEl.textContent = ''
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SELECTION
  // ─────────────────────────────────────────────────────────────────────────────

  _select(item) {
    if (this.selected === item) return
    this._deselect()
    this.selected = item

    this._boxHelper = new THREE.BoxHelper(item, OUTLINE_COLOR)
    this.scene.add(this._boxHelper)

    item.traverse(child => {
      if (!child.isMesh) return
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      const cloned = mats.map(m => {
        const c = m.clone()
        c.userData._dm_original = m          // keep a back-reference
        c.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 1.6)
        return c
      })
      // swap to clones
      child.material = Array.isArray(child.material) ? cloned : cloned[0]
      child.userData._dm_origMats = mats     // stash originals on the mesh
    })

    this._refreshPanel()
  }

  _deselect() {
    if (!this.selected) return

    if (this._boxHelper) {
      this.scene.remove(this._boxHelper)
      this._boxHelper.dispose?.()
      this._boxHelper = null
    }

    this.selected.traverse(child => {
      if (!child.isMesh || !child.userData._dm_origMats) return
      // dispose clones, restore originals
      const current = Array.isArray(child.material) ? child.material : [child.material]
      current.forEach(m => m.dispose())
      child.material = Array.isArray(child.material)
        ? child.userData._dm_origMats
        : child.userData._dm_origMats[0]
      delete child.userData._dm_origMats
    })

    this.selected = null
    this._refreshPanel()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MANIPULATION
  // ─────────────────────────────────────────────────────────────────────────────

  /** Move selected item. Pass 0 for any axis you don't want to touch. */
  _nudge(dx, dy, dz) {
    if (!this.selected) return

    this.selected.position.x += dx
    this.selected.position.y += dy
    this.selected.position.z += dz

    // Mirror into live config so Copy Config reflects the current state
    const cfg = this.selected.userData.itemConfig
    if (cfg?.positionOffset) {
      cfg.positionOffset[0] = round4(cfg.positionOffset[0] + dx)
      cfg.positionOffset[1] = round4(cfg.positionOffset[1] + dy)
      cfg.positionOffset[2] = round4(cfg.positionOffset[2] + dz)
    }

    this._refreshPos()
  }

  _rotateY(dr) {
    if (!this.selected) return
    this.selected.rotation.y += dr

    // Track rotation in userData (not a default config field — surfaced in Copy Config output)
    this.selected.userData._dm_rotY = round4(
      (this.selected.userData._dm_rotY ?? 0) + dr
    )
    this._refreshPos()
  }

  _scaleItem(ds) {
    if (!this.selected) return
    const next = Math.max(0.01, this.selected.scale.x + ds)
    this.selected.scale.setScalar(next)

    const cfg = this.selected.userData.itemConfig
    if (cfg) cfg.scale = round4(next)

    this._refreshPos()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COPY CONFIG
  // ─────────────────────────────────────────────────────────────────────────────

  _copyConfig() {
    if (!this.selected) {
      this._toast('Nothing selected')
      return
    }

    const src = this.selected.userData.itemConfig ?? {}
    const out = {
      glb:            src.glb            ?? null,
      seat:           src.seat           ?? null,
      positionOffset: (src.positionOffset ?? [0,0,0]).map(v => round4(v)),
      scale:          round4(this.selected.scale.x),
      label:          this._labelInput.value  || src.label  || null,
      link:           src.link           ?? null,
      description:    this._descInput.value || src.description || null,
      images:         src.images         ?? [],
    }

    // Include rotation only if it was intentionally edited
    if (this.selected.userData._dm_rotY !== undefined) {
      out.rotationY = -this.selected.userData._dm_rotY
    }

    if (src.imageOffset) out.imageOffset = src.imageOffset

    console.log(
      '%c[DevMode] Updated config entry — copy into config.js:',
      'color:#00ffff; font-weight:bold'
    )
    console.log(JSON.stringify(out, null, 2))

    // Try to put JSON on clipboard too
    navigator.clipboard?.writeText(JSON.stringify(out, null, 2)).catch(() => {})

    this._toast('Printed to console + clipboard ✓')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI BUILD
  // ─────────────────────────────────────────────────────────────────────────────

  _injectCSS() {
    if (document.getElementById('dm-styles')) return
    const tag = document.createElement('style')
    tag.id = 'dm-styles'
    tag.textContent = CSS
    document.head.appendChild(tag)
  }

  _buildPanel() {
    const panel = document.createElement('div')
    panel.id = 'dm-panel'
    panel.innerHTML = `

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#00ffff;font-weight:700;font-size:12px;letter-spacing:1.5px;">⚙ DEV MODE</span>
        <span style="color:#333;font-size:9.5px;">[\`] to close</span>
      </div>

      <!-- Toast -->
      <div id="dm-toast"></div>

      <!-- Selected item -->
      <div class="dm-section">
        <div class="dm-label">Selected Item</div>
        <div id="dm-sel-name" style="color:#444;font-style:italic;">none</div>
      </div>

      <!-- Item controls — hidden until selection -->
      <div id="dm-item-controls" style="display:none;flex-direction:column;gap:9px;">

        <!-- Live position / scale / rot readout -->
        <div>
          <div class="dm-label">Position · Scale · RotY</div>
          <div id="dm-pos-val"></div>
        </div>

        <!-- Step + Copy row -->
        <div class="dm-grid2">
          <div>
            <div class="dm-label">Nudge Step</div>
            <input id="dm-step" class="dm-input" type="number"
              value="0.1" step="0.05" min="0.01" />
          </div>
          <div style="display:flex;align-items:flex-end;">
            <button id="dm-copy" class="dm-btn" style="width:100%;">Copy Config</button>
          </div>
        </div>

        <!-- Label -->
        <div>
          <div class="dm-label">Label</div>
          <input id="dm-label" class="dm-input" type="text" />
        </div>

        <!-- Description -->
        <div>
          <div class="dm-label">Description</div>
          <textarea id="dm-desc" class="dm-input"></textarea>
        </div>

      </div>

      <!-- Scene tools -->
      <div class="dm-section">
        <div class="dm-label">Scene Tools</div>
        <label class="dm-toggle">
          <input type="checkbox" id="dm-skip-vibes" />
          Skip vibe transitions
        </label>
        <label class="dm-toggle" style="margin-top:3px;">
          <input type="checkbox" id="dm-mesh-pick" />
          Mesh name picker
        </label>
        <div id="dm-mesh-name"></div>
      </div>

      <!-- Keybinds -->
      <div class="dm-section">
        <div class="dm-label">Keybinds</div>
        <table class="dm-keys" style="width:100%;border-collapse:collapse;">
          <tr><td>WASD / ↑↓←→</td><td>move X / Z</td></tr>
          <tr><td>R / F</td><td>move Y  (up / down)</td></tr>
          <tr><td>[ / ]</td><td>rotate Y</td></tr>
          <tr><td>+ / –</td><td>scale ±${SCALE_STEP}</td></tr>
          <tr><td>Esc</td><td>deselect item</td></tr>
          <tr><td>Click item</td><td>select</td></tr>
          <tr><td>Click mesh*</td><td>log + copy name</td></tr>
        </table>
        <div style="color:#333;font-size:9.5px;margin-top:4px;">*mesh picker must be enabled</div>
      </div>
    `

    document.body.appendChild(panel)
    this._panel       = panel

    // Refs
    this._toastEl     = panel.querySelector('#dm-toast')
    this._selNameEl   = panel.querySelector('#dm-sel-name')
    this._itemCtrls   = panel.querySelector('#dm-item-controls')
    this._posValEl    = panel.querySelector('#dm-pos-val')
    this._stepInput   = panel.querySelector('#dm-step')
    this._copyBtn     = panel.querySelector('#dm-copy')
    this._labelInput  = panel.querySelector('#dm-label')
    this._descInput   = panel.querySelector('#dm-desc')
    this._skipVibesCb = panel.querySelector('#dm-skip-vibes')
    this._meshPickCb  = panel.querySelector('#dm-mesh-pick')
    this._meshNameEl  = panel.querySelector('#dm-mesh-name')

    // Panel interactions
    this._copyBtn.addEventListener('click', () => this._copyConfig())

    this._stepInput.addEventListener('input', () => {
      const v = parseFloat(this._stepInput.value)
      if (v > 0 && isFinite(v)) this._nudgeStep = v
    })

    this._labelInput.addEventListener('input', () => {
      const cfg = this.selected?.userData.itemConfig
      if (cfg) cfg.label = this._labelInput.value
      if (this._selNameEl && this.selected)
        this._selNameEl.textContent = this._labelInput.value || '(unnamed)'
    })

    this._descInput.addEventListener('input', () => {
      const cfg = this.selected?.userData.itemConfig
      if (cfg) cfg.description = this._descInput.value || null
    })

    this._skipVibesCb.addEventListener('change', () => {
      _skipTransitions = this._skipVibesCb.checked
    })

    this._meshPickCb.addEventListener('change', () => {
      this.meshPickMode = this._meshPickCb.checked
      if (!this.meshPickMode) {
        this._meshNameEl.textContent = ''
        this._hoveredMesh = null
      }
    })

    // Stop scene events leaking through panel clicks
    panel.addEventListener('mousedown', e => e.stopPropagation())
    panel.addEventListener('click',     e => e.stopPropagation())
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PANEL REFRESH
  // ─────────────────────────────────────────────────────────────────────────────

  _refreshPanel() {
    if (!this.selected) {
      this._selNameEl.textContent    = 'none'
      this._selNameEl.style.color    = '#444'
      this._selNameEl.style.fontStyle = 'italic'
      this._itemCtrls.style.display  = 'none'
      return
    }

    const cfg = this.selected.userData.itemConfig ?? {}
    this._selNameEl.textContent    = cfg.label || '(unnamed)'
    this._selNameEl.style.color    = '#7df'
    this._selNameEl.style.fontStyle = 'normal'
    this._itemCtrls.style.display  = 'flex'
    this._labelInput.value = cfg.label       ?? ''
    this._descInput.value  = cfg.description ?? ''
    this._refreshPos()
  }

  _refreshPos() {
    if (!this.selected || !this._posValEl) return
    const p  = this.selected.userData.itemConfig?.positionOffset ?? [0, 0, 0]
    const s  = this.selected.scale.x
    const ry = this.selected.userData._dm_rotY ?? this.selected.rotation.y
    this._posValEl.textContent =
      `[${p.map(v => (+v).toFixed(3)).join(', ')}]\n` +
      `scale ${s.toFixed(3)}   rotY ${ry.toFixed(3)}`
  }

  _toast(msg, ms = 2800) {
    this._toastEl.textContent = msg
    clearTimeout(this._toastTimer)
    this._toastTimer = setTimeout(() => {
      this._toastEl.textContent = ''
    }, ms)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EVENT BINDING
  // ─────────────────────────────────────────────────────────────────────────────

  _bindEvents() {
    // ── KEYBOARD ────────────────────────────────────────────────────────────
    window.addEventListener('keydown', (e) => {
      // Backtick always toggles, even when inactive
      if (e.key === '`') { this.toggle(); return }
      if (!this.isActive) return

      // If focus is inside a text input in our panel, let it type normally
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // When an item is selected, consume movement keys so camera.js ignores them
      // (camera.js should also guard with isDevModeActive() — see integration note)
      const movementKeys = [
        'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
        'a','A','d','D','w','W','s','S',
        'r','R','f','F','[',']','+','=','-','Escape'
      ]
      if (this.selected && movementKeys.includes(e.key)) {
        e.stopImmediatePropagation()
        e.preventDefault()
      }

      // Deselect
      if (e.key === 'Escape') { this._deselect(); return }
      if (!this.selected)     return

      const step = this._nudgeStep
      switch (e.key) {
        // ── X / Z  (NO Y bleed)
        case 'ArrowLeft':  case 'a': case 'A': this._nudge(-step, 0, 0);  break
        case 'ArrowRight': case 'd': case 'D': this._nudge( step, 0, 0);  break
        case 'ArrowUp':    case 'w': case 'W': this._nudge(0, 0, -step);  break
        case 'ArrowDown':  case 's': case 'S': this._nudge(0, 0,  step);  break
        // ── Y only
        case 'r': case 'R': this._nudge(0,  step, 0); break
        case 'f': case 'F': this._nudge(0, -step, 0); break
        // ── Rotate Y
        case '[': this._rotateY(-ROTATE_STEP); break
        case ']': this._rotateY( ROTATE_STEP); break
        // ── Scale
        case '+': case '=': this._scaleItem( SCALE_STEP); break
        case '-':            this._scaleItem(-SCALE_STEP); break
      }
    }, /* capture: */ true)   // ← capture phase so we beat camera.js bubble listeners

    // ── CLICK — item select + mesh name copy ──────────────────────────────
    window.addEventListener('click', (e) => {
      if (!this.isActive)                 return
      if (this._panel.contains(e.target)) return   // ignore panel-internal clicks

      this._updateMouse(e)
      this._ray.setFromCamera(this._mouse, this.camera)

      // 1. Try to pick a spawned item first
      const itemMeshes = []
      this.inspectSystem.activeItems.forEach(root =>
        root.traverse(c => { if (c.isMesh) itemMeshes.push(c) })
      )
      const itemHits = this._ray.intersectObjects(itemMeshes, false)

      if (itemHits.length > 0) {
        let obj = itemHits[0].object
        // Walk up to item root
        while (obj.parent && !obj.userData.isItem) obj = obj.parent
        if (obj.userData.isItem) {
          this._select(obj)
          e.stopImmediatePropagation()  // prevent inspect.js panel from opening
          return
        }
      }

      // 2. Mesh-name picker — click logs + copies the hovered mesh name
      if (this.meshPickMode && this._hoveredMesh) {
        const name = this._hoveredMesh.name
          || this._hoveredMesh.parent?.name
          || '(unnamed)'
        console.log(
          '%c[DevMode] Mesh clicked:',
          'color:#fa0;font-weight:bold',
          name,
          '\nObject:', this._hoveredMesh
        )
        navigator.clipboard?.writeText(name).catch(() => {})
        this._toast(`📋 "${name}"`)
      }
    }, true)

    // ── MOUSEMOVE — mesh-name picker hover ────────────────────────────────
    window.addEventListener('mousemove', (e) => {
      if (!this.isActive || !this.meshPickMode) return

      this._updateMouse(e)
      this._ray.setFromCamera(this._mouse, this.camera)

      // Collect every mesh currently in the scene
      const allMeshes = []
      this.scene.traverse(c => { if (c.isMesh) allMeshes.push(c) })

      const hits = this._ray.intersectObjects(allMeshes, false)
      if (hits.length > 0) {
        this._hoveredMesh            = hits[0].object
        this._meshNameEl.textContent = this._hoveredMesh.name || '(unnamed)'
      } else {
        this._hoveredMesh            = null
        this._meshNameEl.textContent = ''
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTIL
  // ─────────────────────────────────────────────────────────────────────────────

  _updateMouse(e) {
    this._mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Round to 4 decimal places — keeps config.js clean */
function round4(v) { return Math.round(v * 10000) / 10000 }
