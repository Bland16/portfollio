// ═══════════════════════════════════════════════════════════════════════════
// PortfolioSheet.js — Tabbed file-holder portfolio overlay
//
// USAGE (from main.js):
//   import { initPortfolioSheet, openPortfolioSheet } from './PortfolioSheet.js'
//
//   initPortfolioSheet({ CABINS, getActiveVibe })
//
//   Then pass openPortfolioSheet as the callback wherever needed:
//   initButtons({ onPortfolioOpen: openPortfolioSheet, ... })
//
// DEPENDENCIES:
//   • Three.js (already in project — accessed via window.THREE or import)
//   • GLTFLoader (already in project)
//   • jsPDF + html2canvas (loaded lazily on first PDF export)
// ═══════════════════════════════════════════════════════════════════════════

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { getVibeInfo } from './vibes.js'
import { SKILLS as _CONFIG_SKILLS, COVER as _CONFIG_COVER, ABOUT_ME as _CONFIG_ABOUT_ME } from './config.js'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BAND_HEIGHT      = 400   // px — strict fixed height per project band
const CONTACT_HEIGHT   = 72    // px — compact height for link-only items
const PDF_LIBS = {
  jsPDF:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
}

// Hue offsets applied per tab index to generate a colour family from the vibe primary
const TAB_HUE_SHIFTS = [0, 28, 55, 82, 110, 138]

// ─── MODULE STATE ─────────────────────────────────────────────────────────────

let _cfg = {
  CABINS:        [],
  SKILLS:        _CONFIG_SKILLS,
  COVER:         _CONFIG_COVER   ?? {},
  ABOUT_ME:      _CONFIG_ABOUT_ME ?? {},
  getActiveVibe: () => 'suave',
}

let _overlay         = null   // root DOM node
let _activeTabIndex  = 0
let _glbScenes       = []     // { scene, camera, _model, displayCanvas, w, h }[] — current tab only
let _glbScenesByTab  = {}     // { [tabIndex]: entry[] } — persists across tab switches for PDF use
let _fullscreenState = null   // { animId, renderer, keyDown, keyUp, bandIndex }
let _imgFullscreenEl = null   // <div> for image lightbox, or null
let _pdfLibsLoaded   = false

// ── Shared WebGL renderer state ───────────────────────────────────────────────
// One renderer serves ALL mini-viewers to stay well under the browser's
// WebGL context limit (~8–16). Fullscreen gets its own temporary context.
let _sharedRenderer  = null   // single THREE.WebGLRenderer for all bands
let _sharedAnimId    = null   // rAF id for the shared render loop
let _activeHoverIdx  = -1     // which band is hovered (gets every-frame renders)
let _frameCount      = 0      // used to stagger idle renders across bands

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Call once from main.js after config is ready.
 * @param {{ CABINS: object[], getActiveVibe: () => string }} opts
 */
export function initPortfolioSheet(opts) {
  Object.assign(_cfg, opts)
  _injectStyles()
}

/**
 * Open the portfolio sheet overlay.
 * Safe to call multiple times — rebuilds if vibe has changed.
 */
export function openPortfolioSheet() {
  if (_overlay) {
    _destroyOverlay()
  }
  _buildOverlay()
  document.body.appendChild(_overlay)
  _renderPage(_activeTabIndex)   // must be after appendChild so getElementById finds ps-page
  requestAnimationFrame(() => _overlay.classList.add('ps-visible'))
}

// ─── COLOUR HELPERS ───────────────────────────────────────────────────────────

function _hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

/**
 * Derive a muted tab colour for a given cabin index from the active vibe.
 * Returns a CSS hsl() string.
 */
function _tabColor(index, lightness = 72, saturation = 38) {
  const vibeKey  = _cfg.getActiveVibe()
  const vibeInfo = getVibeInfo(vibeKey)
  const base     = vibeInfo?.atmosphere?.moonColor ?? '#8b7536'
  const [h]      = _hexToHsl(base)
  const hue      = (h + TAB_HUE_SHIFTS[index % TAB_HUE_SHIFTS.length]) % 360
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function _tabColorDark(index)  { return _tabColor(index, 38, 42) }
function _tabColorMid(index)   { return _tabColor(index, 60, 36) }
function _tabColorLight(index) { return _tabColor(index, 84, 30) }

/** Band background: graduates slightly lighter as index increases */
function _bandColor(tabIndex, bandIndex, total) {
  const vibeKey  = _cfg.getActiveVibe()
  const vibeInfo = getVibeInfo(vibeKey)
  const base     = vibeInfo?.atmosphere?.moonColor ?? '#8b7536'
  const [h]      = _hexToHsl(base)
  const hue      = (h + TAB_HUE_SHIFTS[tabIndex % TAB_HUE_SHIFTS.length]) % 360
  const l        = 92 + (bandIndex / Math.max(total - 1, 1)) * 5
  return `hsl(${hue}, 22%, ${l}%)`
}

// ─── ITEM TYPE HELPERS ────────────────────────────────────────────────────────

/**
 * Items with only a link (no description, no images) render as a compact
 * contact card rather than a full 400px project band.
 */
function _isContactItem(item) {
  return !!(
    item.link &&
    !item.description &&
    (!item.images || item.images.length === 0)
  )
}

// ─── DOM BUILDERS ─────────────────────────────────────────────────────────────

function _buildOverlay() {
  _glbScenes = []
  _fullscreenState = null

  const overlay = document.createElement('div')
  overlay.className = 'ps-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Portfolio Sheet')

  // ── Holder (the "file folder" chrome) ────────────────────────────────────
  const holder = document.createElement('div')
  holder.className = 'ps-holder'

  // ── Top bar with tabs ─────────────────────────────────────────────────────
  const tabBar = document.createElement('div')
  tabBar.className = 'ps-tab-bar'

  const tabs = _cfg.CABINS.map((cabin, i) => {
    const tab = document.createElement('button')
    tab.className = 'ps-tab' + (i === _activeTabIndex ? ' ps-tab--active' : '')
    tab.textContent = cabin.label
    tab.style.setProperty('--tab-color',       _tabColor(i))
    tab.style.setProperty('--tab-color-dark',  _tabColorDark(i))
    tab.style.setProperty('--tab-color-mid',   _tabColorMid(i))
    tab.setAttribute('aria-selected', i === _activeTabIndex ? 'true' : 'false')
    tab.addEventListener('click', () => _switchTab(i))
    return tab
  })
  tabs.forEach(t => tabBar.appendChild(t))

  // ── Skills tab (synthetic — not from CABINS) ──────────────────────────────
  const skillsTabIndex = _cfg.CABINS.length
  const skillsTab = document.createElement('button')
  skillsTab.className = 'ps-tab' + (skillsTabIndex === _activeTabIndex ? ' ps-tab--active' : '')
  skillsTab.textContent = 'Skills'
  skillsTab.style.setProperty('--tab-color',      _tabColor(skillsTabIndex))
  skillsTab.style.setProperty('--tab-color-dark', _tabColorDark(skillsTabIndex))
  skillsTab.style.setProperty('--tab-color-mid',  _tabColorMid(skillsTabIndex))
  skillsTab.setAttribute('aria-selected', skillsTabIndex === _activeTabIndex ? 'true' : 'false')
  skillsTab.addEventListener('click', () => _switchTab(skillsTabIndex))
  tabBar.appendChild(skillsTab)

  // ── Controls row ──────────────────────────────────────────────────────────
  const controls = document.createElement('div')
  controls.className = 'ps-controls'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'ps-btn-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.setAttribute('aria-label', 'Close portfolio')
  closeBtn.addEventListener('click', _closeOverlay)

  const exportBtn = document.createElement('button')
  exportBtn.className = 'ps-btn-export'
  exportBtn.innerHTML = '<span class="ps-btn-icon">&#8659;</span> Export PDF'
  // Opens section-picker modal rather than exporting immediately
  exportBtn.addEventListener('click', _showPdfSectionPicker)

  controls.appendChild(exportBtn)
  controls.appendChild(closeBtn)

  // ── Page area ─────────────────────────────────────────────────────────────
  const page = document.createElement('div')
  page.className = 'ps-page'
  page.id = 'ps-page'

  // ── Assemble ──────────────────────────────────────────────────────────────
  holder.appendChild(tabBar)
  holder.appendChild(controls)
  holder.appendChild(page)
  overlay.appendChild(holder)

  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeOverlay() })

  // Keyboard
  document.addEventListener('keydown', _handleKeyDown)

  _overlay = overlay
}

// ── Page renderer ─────────────────────────────────────────────────────────────

function _renderPage(tabIndex) {
  const page = document.getElementById('ps-page')
  if (!page) return

  // Tear down previous GLB renderers
  _destroyGlbScenes()

  // Skills is a synthetic tab beyond the CABINS array
  if (tabIndex === _cfg.CABINS.length) {
    _renderSkillsPage(page)
    return
  }

  page.innerHTML = ''
  page.style.setProperty('--page-color',      _tabColor(tabIndex))
  page.style.setProperty('--page-color-dark', _tabColorDark(tabIndex))

  const cabin = _cfg.CABINS[tabIndex]
  if (!cabin) return

  // ── Tab label header ──────────────────────────────────────────────────────
  const header = document.createElement('div')
  header.className = 'ps-page-header'
  header.style.borderBottomColor = _tabColorDark(tabIndex)

  const title = document.createElement('h2')
  title.className = 'ps-page-title'
  title.textContent = cabin.label
  title.style.color = _tabColorDark(tabIndex)
  header.appendChild(title)
  page.appendChild(header)

  // ── Filter: skip items with no label (structural / decorative GLBs)
  //    e.g. wheel-stand.glb which intentionally has label: null
  const visibleItems = (cabin.items || []).filter(
    item => item.label !== null && item.label !== undefined
  )

  if (!visibleItems.length) {
    const empty = document.createElement('div')
    empty.className = 'ps-empty'
    empty.innerHTML = '<span>Nothing here yet — check back soon.</span>'
    page.appendChild(empty)
    return
  }

  // Count only full-band items for background gradient purposes
  const fullBandItems = visibleItems.filter(item => !_isContactItem(item))

  // ── Render contact items as a compact row at the top if any exist ─────────
  const contactItems = visibleItems.filter(_isContactItem)
  if (contactItems.length) {
    const contactRow = document.createElement('div')
    contactRow.className = 'ps-contact-row'
    contactItems.forEach(item => {
      contactRow.appendChild(_buildContactCard(item, tabIndex))
    })
    page.appendChild(contactRow)
  }

  // ── Render full-band project items ────────────────────────────────────────
  let bandIndex = 0
  visibleItems.forEach(item => {
    if (_isContactItem(item)) return  // already rendered above
    const band = _buildBand(item, bandIndex, fullBandItems.length, tabIndex)
    page.appendChild(band)
    bandIndex++
  })
}

// ── Contact card (compact, link-only items) ────────────────────────────────────

function _buildContactCard(item, tabIndex) {
  const card = document.createElement('a')
  card.className = 'ps-contact-card'
  card.href = item.link
  card.target = '_blank'
  card.rel = 'noopener noreferrer'
  card.style.background   = _tabColorLight(tabIndex)
  card.style.borderColor  = _tabColorMid(tabIndex)

  // Detect link type for icon hint
  const link = item.link || ''
  let icon = '🔗'
  if (link.includes('linkedin'))   icon = '💼'
  else if (link.includes('mailto')) icon = '✉️'
  else if (link.includes('github')) icon = '⌥'
  else if (link.includes('instagram')) icon = '📸'

  card.innerHTML = `
    <span class="ps-contact-icon">${icon}</span>
    <span class="ps-contact-label">${item.label || 'Link'}</span>
    <span class="ps-contact-arrow" style="color:${_tabColorDark(tabIndex)}">→</span>
  `
  return card
}

// ── Band builder ──────────────────────────────────────────────────────────────

function _buildBand(item, bandIndex, total, tabIndex) {
  const band = document.createElement('div')
  band.className = 'ps-band'
  band.dataset.bandIndex = bandIndex
  band.style.height       = BAND_HEIGHT + 'px'
  band.style.background   = _bandColor(tabIndex, bandIndex, total)
  band.style.borderColor  = _tabColorMid(tabIndex)

  // ── Band label strip (left edge) ──────────────────────────────────────────
  const labelStrip = document.createElement('div')
  labelStrip.className = 'ps-band-label'
  labelStrip.style.background = _tabColorMid(tabIndex)
  labelStrip.textContent = item.label || 'Untitled'
  band.appendChild(labelStrip)

  // ── Column: GLB viewer ────────────────────────────────────────────────────
  const colGlb = document.createElement('div')
  colGlb.className = 'ps-col ps-col--glb'
  const glbWrap = _buildGlbViewer(item, bandIndex, tabIndex)
  colGlb.appendChild(glbWrap)
  band.appendChild(colGlb)

  // ── Column: Description / Link ────────────────────────────────────────────
  const isPortfolioTab = _cfg.CABINS[tabIndex]?.id === 'hobby-work'
  const colDesc = document.createElement('div')
  colDesc.className = 'ps-col ps-col--desc' + (isPortfolioTab ? ' ps-col--desc-wide' : '')
  colDesc.appendChild(_buildDescColumn(item, tabIndex))
  band.appendChild(colDesc)

  // ── Column: Photo carousel (skipped for The Portfolio tab) ────────────────
  if (!isPortfolioTab) {
    const colPhoto = document.createElement('div')
    colPhoto.className = 'ps-col ps-col--photo'
    colPhoto.appendChild(_buildCarousel(item, tabIndex))
    band.appendChild(colPhoto)
  }

  return band
}

// ── GLB viewer ────────────────────────────────────────────────────────────────
// Uses a SINGLE shared WebGLRenderer for all bands.
// Each band gets a <canvas> (2D context) that receives blitted frames.
// This keeps the total WebGL context count to 1 (+ 1 temporary for fullscreen),
// preventing the browser from evicting the main scene's context.

function _buildGlbViewer(item, bandIndex, tabIndex) {
  const wrap = document.createElement('div')
  wrap.className = 'ps-glb-wrap'

  const displayCanvas = document.createElement('canvas')
  displayCanvas.className = 'ps-glb-canvas'
  wrap.appendChild(displayCanvas)

  if (!item.glb) {
    wrap.classList.add('ps-glb-wrap--empty')
    wrap.innerHTML += '<span class="ps-glb-placeholder">No 3D model</span>'
    return wrap
  }

  // Initialise entry slot so fullscreen can reference it before model loads
  const entry = {
    displayCanvas,
    scene:   null,
    camera:  null,
    _model:  null,
    w:       260,
    h:       BAND_HEIGHT - 40,
    // Compat getter used by fullscreen code
    model:   function() { return this._model },
    // animId not used by shared loop; kept so _destroyGlbScenes can skip safely
    animId:  null,
  }
  _glbScenes[bandIndex] = entry
  // Only store tab-keyed scenes for The Portfolio tab (hobby-work) — the only
  // tab that uses GLB screenshots in the PDF. Digital Projects and all others
  // must never be written here.
  if (_cfg.CABINS[tabIndex]?.id === 'hobby-work') {
    if (!_glbScenesByTab[tabIndex]) _glbScenesByTab[tabIndex] = []
    _glbScenesByTab[tabIndex][bandIndex] = entry
  }

  // Defer layout read until after the flex container has been measured.
  // setTimeout(100) is more reliable than a single rAF for flex children.
  setTimeout(() => {
    const rect = wrap.getBoundingClientRect()
    const w    = rect.width  > 0 ? rect.width  : 260
    const h    = rect.height > 0 ? rect.height : BAND_HEIGHT - 40
    entry.w = w
    entry.h = h

    displayCanvas.width  = w
    displayCanvas.height = h

    const renderer = _ensureSharedRenderer()

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000)
    camera.position.set(0, 0, 4)

    scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const dir = new THREE.DirectionalLight(0xffffff, 1.5)
    dir.position.set(3, 5, 5)
    scene.add(dir)

    entry.scene  = scene
    entry.camera = camera

    const loader = new GLTFLoader()
    loader.load(item.glb, (gltf) => {
      const model = gltf.scene
      const box   = new THREE.Box3().setFromObject(model)
      const size  = box.getSize(new THREE.Vector3())

      // ── Viewer-local normalisation ────────────────────────────────────
      // item.scale is calibrated for the 3D world scene and must NOT be
      // applied here — it would make physical-project items (scale: 1–3)
      // invisible and others (scale: 20) huge.
      // Instead, normalise every model to fill ~80 % of the viewer box.
      const maxDim = Math.max(size.x, size.y, size.z)
      const sc     = maxDim > 0 ? 1.6 / maxDim : 1

      model.scale.setScalar(sc)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center.multiplyScalar(sc))

      scene.add(model)
      entry._model = model

      // Render a static first frame immediately so there's no blank flash
      _blit(entry)

      // Kick off the shared loop if it isn't running yet
      _startSharedLoop()
    }, undefined, (err) => {
      console.warn('[PortfolioSheet] GLB load error:', item.glb, err)
    })
  }, 100)

  wrap.addEventListener('mouseenter', () => {
    _activeHoverIdx = bandIndex
  })
  wrap.addEventListener('mouseleave', () => {
    if (_activeHoverIdx === bandIndex) _activeHoverIdx = -1
  })
  wrap.addEventListener('click', () => _openFullscreen(bandIndex))
  wrap.setAttribute('title', 'Click to expand 3D view')
  wrap.style.cursor = 'pointer'

  return wrap
}

// ─── SHARED RENDERER HELPERS ──────────────────────────────────────────────────

function _ensureSharedRenderer() {
  if (_sharedRenderer) return _sharedRenderer

  const offscreen = document.createElement('canvas')
  // Start at a reasonable size; resized per-blit as needed
  offscreen.width  = 260
  offscreen.height = 360

  _sharedRenderer = new THREE.WebGLRenderer({
    canvas:               offscreen,
    antialias:            true,
    alpha:                true,
    // preserveDrawingBuffer lets us call toDataURL for PDF snapshots
    preserveDrawingBuffer: true,
  })
  _sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  _sharedRenderer.outputColorSpace = THREE.SRGBColorSpace

  return _sharedRenderer
}

/**
 * Render one entry's scene to the shared renderer then blit onto its
 * display canvas (2D context). Safe to call at any time.
 */
function _blit(entry) {
  if (!entry || !entry.scene || !entry.camera) return
  const renderer = _sharedRenderer
  if (!renderer) return

  renderer.setSize(entry.w, entry.h, false)
  renderer.render(entry.scene, entry.camera)

  const ctx = entry.displayCanvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, entry.w, entry.h)
    ctx.drawImage(renderer.domElement, 0, 0, entry.w, entry.h)
  }
}

/**
 * Start the single shared render loop.
 * - Hovered band: rendered every frame with faster spin.
 * - Idle bands: rendered every 8 frames, staggered so they don't all
 *   fire on the same tick.
 */
function _startSharedLoop() {
  if (_sharedAnimId) return   // already running

  let last = performance.now()

  function tick(now) {
    _sharedAnimId = requestAnimationFrame(tick)
    const delta = Math.min((now - last) / 1000, 0.1)   // cap at 100 ms
    last = now
    _frameCount++

    _glbScenes.forEach((entry, i) => {
      if (!entry || !entry._model) return

      const isHover = (i === _activeHoverIdx)

      if (isHover) {
        entry._model.rotation.x += (Math.PI / 2.2 - entry._model.rotation.x) * 0.12
        entry._model.rotation.y += delta * 1.2
        _blit(entry)
      } else if (_frameCount % 8 === i % 8) {
        // Stagger idle updates: band i fires on frame multiples of (i % 8)
        entry._model.rotation.y += 0.4 / 8   // ~0.05 rad per update
        entry._model.rotation.x += (0 - entry._model.rotation.x) * 0.08
        _blit(entry)
      }
    })
  }

  requestAnimationFrame(tick)
}

function _stopSharedLoop() {
  if (_sharedAnimId) {
    cancelAnimationFrame(_sharedAnimId)
    _sharedAnimId = null
  }
}

// ── Description column ────────────────────────────────────────────────────────

function _buildDescColumn(item, tabIndex) {
  const wrap = document.createElement('div')
  wrap.className = 'ps-desc-wrap'

  const label = document.createElement('h3')
  label.className = 'ps-desc-label'
  label.textContent = item.label || 'Untitled'
  label.style.color = _tabColorDark(tabIndex)
  wrap.appendChild(label)

  if (item.description) {
    const text = document.createElement('p')
    text.className = 'ps-desc-text'
    text.textContent = item.description
    wrap.appendChild(text)
  } else if (item.link) {
    const btn = document.createElement('a')
    btn.className = 'ps-link-btn'
    btn.href = item.link
    btn.target = '_blank'
    btn.rel = 'noopener noreferrer'
    btn.textContent = 'View Project →'
    btn.style.background  = _tabColorDark(tabIndex)
    btn.style.borderColor = _tabColorDark(tabIndex)
    wrap.appendChild(btn)
  } else {
    const empty = document.createElement('span')
    empty.className = 'ps-desc-empty'
    empty.textContent = '—'
    wrap.appendChild(empty)
  }

  // If there's both description AND link, add a smaller link at bottom
  if (item.description && item.link) {
    const linkRow = document.createElement('div')
    linkRow.className = 'ps-desc-link-row'
    const a = document.createElement('a')
    a.href = item.link
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.className = 'ps-desc-link'
    a.textContent = 'Open Project →'
    a.style.color = _tabColorDark(tabIndex)
    linkRow.appendChild(a)
    wrap.appendChild(linkRow)
  }

  return wrap
}

// ── Photo carousel ────────────────────────────────────────────────────────────

function _buildCarousel(item, tabIndex) {
  const wrap = document.createElement('div')
  wrap.className = 'ps-carousel-wrap'

  // Resolve images — support both old `image` string and new `images` array
  let images = []
  if (Array.isArray(item.images) && item.images.length) {
    images = item.images  // [{ src, date }]
  } else if (typeof item.image === 'string') {
    images = [{ src: item.image, date: null }]
  }

  if (!images.length) {
    wrap.classList.add('ps-carousel-wrap--empty')
    const stars = document.createElement('div')
    stars.className = 'ps-carousel-stars'
    stars.innerHTML = _genStars()
    wrap.appendChild(stars)
    return wrap
  }

  let current = 0

  // Frame
  const frame = document.createElement('div')
  frame.className = 'ps-carousel-frame'

  const img = document.createElement('img')
  img.className = 'ps-carousel-img'
  img.src = images[0].src
  img.alt = item.label || ''
  img.style.objectPosition = item.imageOffset || '50% 50%'

  // Error handling — show stars fallback if image fails to load
  img.onerror = () => {
    frame.classList.add('ps-carousel-frame--error')
    img.style.display = 'none'
    if (!frame.querySelector('.ps-carousel-stars')) {
      const stars = document.createElement('div')
      stars.className = 'ps-carousel-stars'
      stars.innerHTML = _genStars()
      frame.appendChild(stars)
    }
  }

  frame.appendChild(img)

  // Tap image to open fullscreen lightbox
  frame.style.cursor = 'zoom-in'
  frame.setAttribute('title', 'Click to enlarge')
  frame.addEventListener('click', (e) => {
    if (e.target.classList.contains('ps-carousel-arrow')) return
    _openCarouselFullscreen(images, current, item)
  })

  // Arrows (only if multiple images)
  if (images.length > 1) {
    const prevBtn = document.createElement('button')
    prevBtn.className = 'ps-carousel-arrow ps-carousel-arrow--prev'
    prevBtn.innerHTML = '&#8592;'
    prevBtn.setAttribute('aria-label', 'Previous image')

    const nextBtn = document.createElement('button')
    nextBtn.className = 'ps-carousel-arrow ps-carousel-arrow--next'
    nextBtn.innerHTML = '&#8594;'
    nextBtn.setAttribute('aria-label', 'Next image')

    const update = (idx) => {
      current = (idx + images.length) % images.length
      img.style.opacity = '0'
      img.style.display = ''
      frame.classList.remove('ps-carousel-frame--error')
      setTimeout(() => {
        img.src = images[current].src
        img.style.objectPosition = item.imageOffset || '50% 50%'
        img.style.opacity = '1'
        dateEl.textContent = images[current].date || ''
      }, 150)
    }

    prevBtn.addEventListener('click', () => update(current - 1))
    nextBtn.addEventListener('click', () => update(current + 1))
    frame.appendChild(prevBtn)
    frame.appendChild(nextBtn)
  }

  wrap.appendChild(frame)

  // Date display
  const dateEl = document.createElement('div')
  dateEl.className = 'ps-carousel-date'
  dateEl.textContent = images[0].date || ''
  dateEl.style.color = _tabColorDark(tabIndex)
  wrap.appendChild(dateEl)

  return wrap
}

// ── GLB Screenshot Placeholder ────────────────────────────────────────────────
// Digital Projects only. Replace this entire function body when you have the
// GLB capture code — the returned element drops straight into ps-col--photo.
// TODO: call your screenshot utility here and render the resulting <img>.

function _buildGlbScreenshotTodo(item, tabIndex) {
  const wrap = document.createElement('div')
  wrap.className = 'ps-carousel-wrap ps-glb-screenshot-todo'

  const inner = document.createElement('div')
  inner.className = 'ps-glb-todo-inner'
  inner.innerHTML = `
    <span class="ps-glb-todo-icon">📷</span>
    <span class="ps-glb-todo-label">GLB Screenshot</span>
    <span class="ps-glb-todo-sub">TODO: integrate capture</span>
  `
  wrap.appendChild(inner)
  return wrap
}

function _genStars() {
  let s = ''
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 100
    const y = Math.random() * 85
    const r = 0.5 + Math.random() * 1.5
    const o = 0.2 + Math.random() * 0.6
    s += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="white" opacity="${o.toFixed(2)}"/>`
  }
  return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${s}</svg>`
}

// ─── SKILLS PAGE ──────────────────────────────────────────────────────────────

function _renderSkillsPage(page) {
  page.innerHTML = ''

  const tabIdx = _cfg.CABINS.length
  page.style.setProperty('--page-color',      _tabColor(tabIdx))
  page.style.setProperty('--page-color-dark', _tabColorDark(tabIdx))

  const header = document.createElement('div')
  header.className = 'ps-page-header'
  header.style.borderBottomColor = _tabColorDark(tabIdx)
  const title = document.createElement('h2')
  title.className = 'ps-page-title'
  title.textContent = 'Skills'
  title.style.color = _tabColorDark(tabIdx)
  header.appendChild(title)
  page.appendChild(header)

  const skills = _cfg.SKILLS || {}

  const CATEGORIES = [
    { keys: ['hardware'],              label: 'Hardware & Electronics' },
    { keys: ['coding'],                label: 'Software & Code'        },
    { keys: ['design', 'fabrication'], label: 'Design & Making'        },
    { keys: ['soft'],                  label: 'Soft Skills'            },
  ]

  CATEGORIES.forEach(cat => {
    const catSkills = Object.entries(skills).filter(([, s]) => cat.keys.includes(s.category))
    if (!catSkills.length) return

    catSkills.sort((a, b) => b[1].level - a[1].level)

    const section = document.createElement('div')
    section.className = 'ps-skills-section'

    const catTitle = document.createElement('div')
    catTitle.className = 'ps-skills-cat-title'
    catTitle.textContent = cat.label
    catTitle.style.color       = _tabColorDark(tabIdx)
    catTitle.style.borderColor = _tabColorMid(tabIdx)
    section.appendChild(catTitle)

    const grid = document.createElement('div')
    grid.className = 'ps-skills-grid'

    catSkills.forEach(([slug, skill]) => {
      grid.appendChild(_buildSkillCard(slug, skill, tabIdx))
    })

    section.appendChild(grid)
    page.appendChild(section)
  })
}

function _buildSkillCard(slug, skill, tabIdx) {
  const card = document.createElement('div')
  card.className = 'ps-skill-card'
  card.style.borderColor = _tabColorMid(tabIdx)
  card.style.background  = _tabColorLight(tabIdx)

  const label = document.createElement('span')
  label.className = 'ps-skill-card-label'
  label.textContent = skill.label

  const levelWrap = document.createElement('div')
  levelWrap.className = 'ps-skill-level'
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement('span')
    dot.className = 'ps-skill-dot'
    dot.style.background = i <= skill.level ? _tabColorDark(tabIdx) : 'rgba(0,0,0,0.12)'
    levelWrap.appendChild(dot)
  }

  card.appendChild(label)
  card.appendChild(levelWrap)
  card.addEventListener('click', () => _showSkillModal(slug, skill, tabIdx))
  card.setAttribute('title', `Tap to see projects using ${skill.label}`)
  return card
}

function _showSkillModal(slug, skill, tabIdx) {
  // Collect all projects referencing this skill, deduplicated by label
  const seen = new Set()
  const projects = []
  ;(_cfg.CABINS || []).forEach(cabin => {
    ;(cabin.items || []).forEach(item => {
      if (
        item.label &&
        !seen.has(item.label) &&
        Array.isArray(item.skills) &&
        item.skills.includes(slug)
      ) {
        seen.add(item.label)
        projects.push({ label: item.label, cabin: cabin.label, description: item.description || '' })
      }
    })
  })

  const overlay = document.createElement('div')
  overlay.className = 'ps-skill-modal-overlay'
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })

  const modal = document.createElement('div')
  modal.className = 'ps-skill-modal'

  // Header
  const hdr = document.createElement('div')
  hdr.className = 'ps-skill-modal-hdr'

  const modalTitle = document.createElement('h4')
  modalTitle.className = 'ps-skill-modal-title'
  modalTitle.textContent = skill.label
  modalTitle.style.color = _tabColorDark(tabIdx)

  const levelWrap = document.createElement('div')
  levelWrap.className = 'ps-skill-level ps-skill-level--lg'
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement('span')
    dot.className = 'ps-skill-dot'
    dot.style.background = i <= skill.level ? _tabColorDark(tabIdx) : 'rgba(0,0,0,0.12)'
    levelWrap.appendChild(dot)
  }

  const closeBtn = document.createElement('button')
  closeBtn.className = 'ps-skill-modal-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.addEventListener('click', () => overlay.remove())

  hdr.appendChild(modalTitle)
  hdr.appendChild(levelWrap)
  hdr.appendChild(closeBtn)
  modal.appendChild(hdr)

  // Project count
  if (projects.length) {
    const sub = document.createElement('p')
    sub.className = 'ps-skill-modal-sub'
    sub.textContent = `Used in ${projects.length} project${projects.length !== 1 ? 's' : ''}`
    modal.appendChild(sub)
  }

  // List
  const list = document.createElement('div')
  list.className = 'ps-skill-modal-list'

  if (!projects.length) {
    const empty = document.createElement('p')
    empty.className = 'ps-skill-modal-empty'
    empty.textContent = 'No projects found using this skill.'
    list.appendChild(empty)
  } else {
    projects.forEach(p => {
      const row = document.createElement('div')
      row.className = 'ps-skill-modal-row'

      const rowTop = document.createElement('div')
      rowTop.className = 'ps-skill-modal-row-top'

      const rowLabel = document.createElement('span')
      rowLabel.className = 'ps-skill-modal-row-label'
      rowLabel.textContent = p.label

      const rowCabin = document.createElement('span')
      rowCabin.className = 'ps-skill-modal-row-cabin'
      rowCabin.textContent = p.cabin
      rowCabin.style.background = _tabColor(tabIdx)
      rowCabin.style.color      = _tabColorDark(tabIdx)

      rowTop.appendChild(rowLabel)
      rowTop.appendChild(rowCabin)
      row.appendChild(rowTop)

      if (p.description) {
        const rowDesc = document.createElement('p')
        rowDesc.className = 'ps-skill-modal-row-desc'
        rowDesc.textContent = p.description.length > 130
          ? p.description.slice(0, 130).trim() + '…'
          : p.description
        row.appendChild(rowDesc)
      }

      list.appendChild(row)
    })
  }

  modal.appendChild(list)
  overlay.appendChild(modal)
  _overlay.querySelector('.ps-holder').appendChild(overlay)
}

// ─── FULLSCREEN GLB ───────────────────────────────────────────────────────────

function _openFullscreen(bandIndex) {
  const entry = _glbScenes[bandIndex]
  if (!entry) return

  // Pause the shared loop while fullscreen is active — prevents context
  // contention and ensures fullscreen gets a clean renderer.
  _stopSharedLoop()

  const fs = document.createElement('div')
  fs.className = 'ps-fullscreen'
  fs.id = 'ps-fullscreen'

  const canvas = document.createElement('canvas')
  canvas.className = 'ps-fullscreen-canvas'
  fs.appendChild(canvas)

  const hint = document.createElement('div')
  hint.className = 'ps-fullscreen-hint'
  hint.textContent = 'Arrow keys to rotate  •  ESC to close'
  fs.appendChild(hint)

  const closeBtn = document.createElement('button')
  closeBtn.className = 'ps-fullscreen-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.setAttribute('aria-label', 'Close fullscreen')
  closeBtn.addEventListener('click', () => _closeFullscreen(bandIndex))
  fs.appendChild(closeBtn)

  _overlay.appendChild(fs)
  requestAnimationFrame(() => fs.classList.add('ps-fullscreen--visible'))

  const w = window.innerWidth
  const h = window.innerHeight

  // Fullscreen gets its own temporary renderer (only 1 active at a time)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene  = entry.scene
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000)
  camera.position.set(0, 0, 4)

  const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false }
  const keyDown = e => { if (e.key in keys) keys[e.key] = true }
  const keyUp   = e => { if (e.key in keys) keys[e.key] = false }
  document.addEventListener('keydown', keyDown)
  document.addEventListener('keyup',   keyUp)

  let animId = null
  const clock = new THREE.Clock()
  const model = entry.model()

  function animate() {
    animId = requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (model) {
      if (keys.ArrowLeft)  model.rotation.y -= delta * 1.8
      if (keys.ArrowRight) model.rotation.y += delta * 1.8
      if (keys.ArrowUp)    model.rotation.x -= delta * 1.8
      if (keys.ArrowDown)  model.rotation.x += delta * 1.8
    }
    renderer.render(scene, camera)
  }
  animate()

  _fullscreenState = { animId, renderer, keyDown, keyUp, bandIndex }
}

function _closeFullscreen(bandIndex) {
  if (!_fullscreenState) return

  cancelAnimationFrame(_fullscreenState.animId)
  document.removeEventListener('keydown', _fullscreenState.keyDown)
  document.removeEventListener('keyup',   _fullscreenState.keyUp)
  _fullscreenState.renderer.dispose()
  _fullscreenState = null

  const fs = document.getElementById('ps-fullscreen')
  if (fs) fs.remove()

  // Resume the shared loop now that fullscreen is gone
  _startSharedLoop()
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────

function _switchTab(index) {
  if (index === _activeTabIndex) return
  _activeTabIndex = index

  const tabBar = _overlay.querySelector('.ps-tab-bar')
  tabBar.querySelectorAll('.ps-tab').forEach((t, i) => {
    t.classList.toggle('ps-tab--active', i === index)
    t.setAttribute('aria-selected', i === index ? 'true' : 'false')
  })

  const page = document.getElementById('ps-page')
  page.style.opacity   = '0'
  page.style.transform = 'translateY(8px)'
  setTimeout(() => {
    _renderPage(index)
    page.style.opacity   = '1'
    page.style.transform = 'translateY(0)'
  }, 160)
}

// ─── IMAGE CAROUSEL FULLSCREEN ────────────────────────────────────────────────

function _openCarouselFullscreen(images, startIdx, item) {
  if (_imgFullscreenEl) _closeCarouselFullscreen()

  let current = startIdx

  const el = document.createElement('div')
  el.className = 'ps-img-fullscreen'

  const img = document.createElement('img')
  img.className = 'ps-img-fullscreen-img'
  img.src = images[current].src
  img.alt = item.label || ''

  const dateEl = document.createElement('div')
  dateEl.className = 'ps-img-fullscreen-date'
  dateEl.textContent = images[current].date || ''

  const navigate = (delta) => {
    if (images.length < 2) return
    current = (current + delta + images.length) % images.length
    img.style.opacity = '0'
    setTimeout(() => {
      img.src = images[current].src
      dateEl.textContent = images[current].date || ''
      img.style.opacity = '1'
    }, 130)
  }
  // Expose navigate so _handleKeyDown can call it
  el._navigate = navigate

  const closeBtn = document.createElement('button')
  closeBtn.className = 'ps-img-fullscreen-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.setAttribute('aria-label', 'Close image')
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); _closeCarouselFullscreen() })

  const hint = document.createElement('div')
  hint.className = 'ps-img-fullscreen-hint'
  hint.textContent = images.length > 1
    ? '← → to navigate  •  ESC to close'
    : 'ESC to close'

  el.appendChild(img)
  el.appendChild(closeBtn)
  el.appendChild(dateEl)
  el.appendChild(hint)

  if (images.length > 1) {
    const prevBtn = document.createElement('button')
    prevBtn.className = 'ps-img-fullscreen-arrow ps-img-fullscreen-arrow--prev'
    prevBtn.innerHTML = '&#8592;'
    prevBtn.setAttribute('aria-label', 'Previous image')
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1) })

    const nextBtn = document.createElement('button')
    nextBtn.className = 'ps-img-fullscreen-arrow ps-img-fullscreen-arrow--next'
    nextBtn.innerHTML = '&#8594;'
    nextBtn.setAttribute('aria-label', 'Next image')
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigate(1) })

    el.appendChild(prevBtn)
    el.appendChild(nextBtn)
  }

  // Backdrop click to close
  el.addEventListener('click', (e) => { if (e.target === el) _closeCarouselFullscreen() })

  _imgFullscreenEl = el
  _overlay.querySelector('.ps-holder').appendChild(el)
  requestAnimationFrame(() => el.classList.add('ps-img-fullscreen--visible'))
}

function _closeCarouselFullscreen() {
  if (!_imgFullscreenEl) return
  _imgFullscreenEl.classList.remove('ps-img-fullscreen--visible')
  const el = _imgFullscreenEl
  _imgFullscreenEl = null
  setTimeout(() => el.remove(), 220)
}

// ─── KEYBOARD ────────────────────────────────────────────────────────────────

function _handleKeyDown(e) {
  if (!_overlay) return
  if (e.key === 'Escape') {
    if (_imgFullscreenEl) {
      _closeCarouselFullscreen()
    } else if (_fullscreenState) {
      _closeFullscreen(_fullscreenState.bandIndex)
    } else {
      _closeOverlay()
    }
  }
  if (_imgFullscreenEl) {
    if (e.key === 'ArrowLeft')  _imgFullscreenEl._navigate(-1)
    if (e.key === 'ArrowRight') _imgFullscreenEl._navigate(1)
  }
}

// ─── OVERLAY LIFECYCLE ────────────────────────────────────────────────────────

function _closeOverlay() {
  if (!_overlay) return
  _overlay.classList.remove('ps-visible')
  setTimeout(() => {
    _destroyOverlay()
  }, 300)
}

function _destroyOverlay() {
  _destroyGlbScenes()
  _glbScenesByTab = {}
  if (_imgFullscreenEl) { _imgFullscreenEl.remove(); _imgFullscreenEl = null }
  document.removeEventListener('keydown', _handleKeyDown)
  if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay)
  _overlay = null
}

function _destroyGlbScenes() {
  // Stop the shared render loop first
  _stopSharedLoop()
  _activeHoverIdx = -1
  _frameCount     = 0

  // Clear scene references (geometries/materials are GC-eligible after this)
  _glbScenes.forEach(entry => {
    if (!entry) return
    // entry.animId is null for shared-renderer bands; fullscreen has its own cleanup
  })
  _glbScenes = []

  // Dispose the shared renderer — frees the single WebGL context
  if (_sharedRenderer) {
    _sharedRenderer.dispose()
    _sharedRenderer = null
  }
}

// ─── PDF SECTION PICKER ───────────────────────────────────────────────────────

function _showPdfSectionPicker() {
  const existing = _overlay.querySelector('.ps-pdf-picker')
  if (existing) existing.remove()

  const selectedSkills   = new Set()
  const selectedSections = new Set()

  // ── Which sections have content given current skill filter ────────────────
  // Always excludes the 'events' cabin.
  function _matchingSections() {
    return _cfg.CABINS
      .map((cabin, i) => {
        if (cabin.id === 'events') return null
        const projectItems = (cabin.items || []).filter(
          item => item.label !== null && item.label !== undefined && !_isContactItem(item)
        )
        // Contact-only sections (About Me) always pass through
        if (!projectItems.length) {
          const hasContact = (cabin.items || []).some(_isContactItem)
          return hasContact ? { cabinIndex: i, cabin, count: 0 } : null
        }
        if (selectedSkills.size === 0) return { cabinIndex: i, cabin, count: projectItems.length }
        const matchCount = projectItems.filter(item =>
          Array.isArray(item.skills) && item.skills.some(s => selectedSkills.has(s))
        ).length
        return matchCount > 0 ? { cabinIndex: i, cabin, count: matchCount } : null
      })
      .filter(Boolean)
  }

  // ── DOM scaffold ──────────────────────────────────────────────────────────
  const picker = document.createElement('div')
  picker.className = 'ps-pdf-picker'
  picker.addEventListener('click', e => { if (e.target === picker) picker.remove() })

  const inner = document.createElement('div')
  inner.className = 'ps-pdf-picker-inner'
  picker.appendChild(inner)

  // ── Header ────────────────────────────────────────────────────────────────
  const hdr = document.createElement('div')
  hdr.className = 'ps-pdf-picker-hdr'

  const title = document.createElement('h4')
  title.className   = 'ps-pdf-picker-title'
  title.textContent = 'Export to PDF'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'ps-pdf-picker-close'
  closeBtn.innerHTML = '&#10005;'
  closeBtn.addEventListener('click', () => picker.remove())

  hdr.appendChild(title)
  hdr.appendChild(closeBtn)
  inner.appendChild(hdr)

  // ── Skills filter (optional context) ──────────────────────────────────────
  const skillSub = document.createElement('p')
  skillSub.className   = 'ps-pdf-picker-sub'
  skillSub.textContent = 'Filter by role (optional):'
  inner.appendChild(skillSub)

  const skillsWrap = document.createElement('div')
  skillsWrap.className = 'ps-pdf-skill-grid ps-pdf-skill-grid--picker'
  inner.appendChild(skillsWrap)

  const allSkills = _cfg.SKILLS || {}
  Object.entries(allSkills)
    .sort((a, b) => b[1].level - a[1].level)
    .forEach(([slug, skill]) => {
      const chip = document.createElement('label')
      chip.className = 'ps-pdf-skill-chip'

      const chk = document.createElement('input')
      chk.type    = 'checkbox'
      chk.checked = false
      chk.addEventListener('change', () => {
        if (chk.checked) selectedSkills.add(slug)
        else             selectedSkills.delete(slug)
        chip.classList.toggle('ps-pdf-skill-chip--on', chk.checked)
        _refreshSections()
      })

      chip.appendChild(chk)
      chip.appendChild(document.createTextNode(skill.label))
      skillsWrap.appendChild(chip)
    })

  // ── Section list (live-updated by skill filter) ───────────────────────────
  const sectionSub = document.createElement('p')
  sectionSub.className   = 'ps-pdf-picker-sub'
  sectionSub.textContent = 'Sections:'
  inner.appendChild(sectionSub)

  const checksWrap = document.createElement('div')
  checksWrap.className = 'ps-pdf-picker-checks'
  inner.appendChild(checksWrap)

  function _refreshSections() {
    checksWrap.innerHTML = ''
    selectedSections.clear()

    const matched = _matchingSections()

    _cfg.CABINS.forEach((cabin, i) => {
      if (cabin.id === 'events') return
      const match = matched.find(m => m.cabinIndex === i)

      const label = document.createElement('label')
      label.className = 'ps-pdf-check-label'

      const check = document.createElement('input')
      check.type     = 'checkbox'
      check.value    = String(i)
      check.checked  = !!match
      check.disabled = !match
      if (match) selectedSections.add(i)

      check.addEventListener('change', () => {
        if (check.checked) selectedSections.add(i)
        else               selectedSections.delete(i)
      })

      const span = document.createElement('span')
      span.textContent = match
        ? `${cabin.label}${match.count > 0 ? ` (${match.count})` : ''}`
        : `${cabin.label} — no matches`
      if (!match) span.style.opacity = '0.38'

      label.appendChild(check)
      label.appendChild(span)
      checksWrap.appendChild(label)
    })
  }

  _refreshSections()

  // ── Export button ─────────────────────────────────────────────────────────
  const actions = document.createElement('div')
  actions.className = 'ps-pdf-picker-actions'

  const exportBtn = document.createElement('button')
  exportBtn.className = 'ps-btn-export'
  exportBtn.innerHTML = '<span class="ps-btn-icon">&#8659;</span> Export'
  exportBtn.addEventListener('click', () => {
    const indices = Array.from(selectedSections).sort((a, b) => a - b)
    if (!indices.length) return
    picker.remove()
    _exportPDFSections({ indices, selectedSkills })
  })

  actions.appendChild(exportBtn)
  inner.appendChild(actions)

  _overlay.querySelector('.ps-holder').appendChild(picker)
}

// ─── GLB PRE-LOADER ───────────────────────────────────────────────────────────
// Ensures the hobby-work tab's GLB models are fully loaded before PDF export
// reads them. Without this, _glbScenesByTab is empty whenever the user hasn't
// visited that tab first, so all snapshots are silently skipped.

async function _ensureHobbyWorkScenesLoaded(tabIndex, cabin) {
  const itemsNeedingGlb = (cabin.items || []).filter(
    item => item.label != null && !_isContactItem(item) && item.glb
  )
  if (!itemsNeedingGlb.length) return

  // Already fully loaded — nothing to do
  const existing = _glbScenesByTab[tabIndex] || []
  if (itemsNeedingGlb.every((_, i) => existing[i]?._model != null)) return

  // Render the tab to trigger GLB loading (reuses the existing ps-page element)
  _renderPage(tabIndex)

  // Poll every 250 ms until all _model refs are populated, or 20 s elapses
  await new Promise(resolve => {
    const deadline = Date.now() + 20_000
    function poll() {
      const scenes = _glbScenesByTab[tabIndex] || []
      const done   = itemsNeedingGlb.every((_, i) => scenes[i]?._model != null)
      if (done || Date.now() > deadline) return resolve()
      setTimeout(poll, 250)
    }
    setTimeout(poll, 500)   // give GLTFLoader a head-start before first check
  })
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────

/**
 * Export one combined PDF covering the requested cabin indices.
 * @param {{ indices: number[], selectedSkills: Set<string> }} opts
 */
async function _exportPDFSections({ indices, selectedSkills }) {
  const exportBtn = _overlay.querySelector('.ps-btn-export')
  if (exportBtn) {
    exportBtn.textContent = 'Generating…'
    exportBtn.disabled    = true
  }

  await _loadPdfLibs()

  // ── Pre-load hobby-work GLB scenes before any PDF page is written ─────────
  // Must run after _loadPdfLibs so the shared renderer is available.
  const _hwIdx = _cfg.CABINS.findIndex(c => c.id === 'hobby-work')
  if (_hwIdx !== -1 && indices.includes(_hwIdx)) {
    await _ensureHobbyWorkScenesLoaded(_hwIdx, _cfg.CABINS[_hwIdx])
  }

  const { jsPDF } = window.jspdf

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW     = 210
  const PH     = 297
  const MARGIN = 20
  const CW     = PW - MARGIN * 2
  const TC     = [184, 92, 69]   // terracotta rgb

  let pageNum = 0

  // ── Shared helpers ────────────────────────────────────────────────────────
  const _bg = () => { doc.setFillColor(250, 248, 244); doc.rect(0, 0, PW, PH, 'F') }

  const _pageNum = () => {
    const label = `— ${pageNum} —`
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...TC)
    doc.text(label, (PW - doc.getTextWidth(label)) / 2, PH - 8)
  }

  const _sectionHeader = (label, y) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(26, 26, 26)
    doc.text(label, MARGIN, y + 10)
    doc.setDrawColor(...TC)
    doc.setLineWidth(0.8)
    doc.line(MARGIN, y + 14, PW - MARGIN, y + 14)
    return y + 24
  }

  const _cleanText = str => String(str || '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\xFF\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // ── Cover page ────────────────────────────────────────────────────────────
  pageNum++
  _bg()

  let y = 72

  // Name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.setTextColor(26, 26, 26)
  const nameText = _cfg.COVER?.name || 'Portfolio'
  doc.text(nameText, (PW - doc.getTextWidth(nameText)) / 2, y)
  y += 14   // was 10 — 34pt cap-height needs more breathing room before next element

  // Tagline
  const tagText = _cfg.COVER?.tagline || ''
  if (tagText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(120, 120, 120)
    doc.text(tagText, (PW - doc.getTextWidth(tagText)) / 2, y)
    y += 10   // was 8
  }

  // Terracotta rule
  doc.setDrawColor(...TC)
  doc.setLineWidth(0.8)
  doc.line(MARGIN + 24, y + 2, PW - MARGIN - 24, y + 2)
  y += 12

  // Contact links
  const aboutCabin = _cfg.CABINS.find(c => c.id === 'about-me')
  if (aboutCabin) {
    ;(aboutCabin.items || []).filter(_isContactItem).forEach(item => {
      const icon    = item.link?.includes('linkedin') ? 'LinkedIn'
                    : item.link?.includes('mailto')   ? 'Email'
                    : item.link?.includes('github')   ? 'GitHub'
                    : 'Link'
      const display = (item.link || '').replace('mailto:', '')
      const sep     = '  '

      // Measure each segment with its own font weight so centering is accurate.
      // The old code measured the full string in bold, causing the normal-weight
      // display text to land on top of the terracotta label.
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TC)
      const iconW = doc.getTextWidth(icon + sep)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const displayW = doc.getTextWidth(display)

      const startX = (PW - iconW - displayW) / 2

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TC)
      doc.text(icon + sep, startX, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(display, startX + iconW, y)
      y += 7
    })
  }
  y += 6

  // Skills
  const skillsToShow = (() => {
    const all = _cfg.SKILLS || {}
    if (selectedSkills.size > 0)
      return [...selectedSkills].map(s => all[s]?.label).filter(Boolean)
    return Object.entries(all)
      .sort((a, b) => b[1].level - a[1].level)
      .slice(0, 10)
      .map(([, s]) => s.label)
  })()

  if (skillsToShow.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...TC)
    const hdrLabel = selectedSkills.size > 0 ? 'HIGHLIGHTED SKILLS' : 'SKILLS'
    doc.text(hdrLabel, (PW - doc.getTextWidth(hdrLabel)) / 2, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const chipPadX = 5, chipPadY = 2.5, chipH = 7, chipGap = 5, rowGap = 5
    const chipWidths = skillsToShow.map(l => doc.getTextWidth(l) + chipPadX * 2)
    const maxRowW = CW - 20
    const rows = []
    let row = [], rowW = 0
    chipWidths.forEach((w, idx) => {
      if (rowW + w + (row.length ? chipGap : 0) > maxRowW && row.length) {
        rows.push(row); row = []; rowW = 0
      }
      row.push({ label: skillsToShow[idx], w })
      rowW += w + (row.length > 1 ? chipGap : 0)
    })
    if (row.length) rows.push(row)

    rows.forEach(rowItems => {
      if (y + chipH > PH - 30) return   // stop before overrunning date / page-number area
      const totalW = rowItems.reduce((s, c, i) => s + c.w + (i ? chipGap : 0), 0)
      let chipX = (PW - totalW) / 2
      rowItems.forEach(({ label, w }) => {
        doc.setDrawColor(...TC)
        doc.setLineWidth(0.5)
        doc.roundedRect(chipX, y - chipPadY, w, chipH, 2, 2, 'S')
        doc.setTextColor(...TC)
        doc.text(label, chipX + chipPadX, y + chipPadY - 0.5)
        chipX += w + chipGap
      })
      y += chipH + rowGap
    })
  }

  // Date bottom-right
  const dateText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...TC)
  doc.text(dateText, PW - MARGIN - doc.getTextWidth(dateText), PH - 18)
  _pageNum()

  // ── About Me page ─────────────────────────────────────────────────────────
  doc.addPage(); pageNum++; _bg()
  let ay = MARGIN
  ay = _sectionHeader('About Me', ay)

  // Photo
  const photoSrc  = _cfg.ABOUT_ME?.photo
  const photoW    = 58
  const photoH    = 72
  const photoX    = MARGIN
  const textX     = MARGIN + photoW + 10
  const textW     = CW - photoW - 10

  if (photoSrc) {
    try {
      const photoData = await _loadImageBase64(photoSrc)
      if (photoData) doc.addImage(photoData, 'JPEG', photoX, ay, photoW, photoH, undefined, 'FAST')
    } catch (_) {
      // Draw placeholder box if photo fails
      doc.setFillColor(42, 46, 53)
      doc.roundedRect(photoX, ay, photoW, photoH, 2, 2, 'F')
    }
  } else {
    doc.setFillColor(42, 46, 53)
    doc.roundedRect(photoX, ay, photoW, photoH, 2, 2, 'F')
  }

  // Name + school
  let ty = ay
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(26, 26, 26)
  doc.text(_cfg.COVER?.name || '', textX, ty + 7)
  ty += 12

  if (_cfg.ABOUT_ME?.education) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...TC)
    doc.text(_cfg.ABOUT_ME.education.toUpperCase(), textX, ty)
    ty += 9
  }

  // Bio paragraphs — auto-wrapped
  const bioParagraphs = Array.isArray(_cfg.ABOUT_ME?.bio) ? _cfg.ABOUT_ME.bio : []
  bioParagraphs.forEach(para => {
    if (!para) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(55, 55, 55)
    const lines = doc.splitTextToSize(_cleanText(para), textW)
    doc.text(lines, textX, ty, { lineHeightFactor: 1.55 })
    ty += lines.length * 5.5 + 6
  })

  _pageNum()

  // ── Per-section pages ─────────────────────────────────────────────────────
  for (const tabIndex of indices) {
    const cabin = _cfg.CABINS[tabIndex]
    if (!cabin) continue

    const allProjectItems = (cabin.items || []).filter(
      item => item.label !== null && item.label !== undefined && !_isContactItem(item)
    )
    const visibleItems = selectedSkills.size === 0
      ? allProjectItems
      : allProjectItems.filter(item =>
          Array.isArray(item.skills) && item.skills.some(s => selectedSkills.has(s))
        )

    const contactItems = (cabin.items || []).filter(
      item => item.label !== null && item.label !== undefined && _isContactItem(item)
    )

    doc.addPage(); pageNum++; _bg()
    let cursorY = MARGIN
    cursorY = _sectionHeader(cabin.label, cursorY)

    if (contactItems.length) {
      contactItems.forEach(item => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(80, 80, 80)
        doc.text(`${item.label}: ${item.link || ''}`, MARGIN + 4, cursorY)
        cursorY += 7
      })
      cursorY += 4
    }

    if (!visibleItems.length && !contactItems.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(120, 120, 120)
      doc.text('No projects in this section yet.', MARGIN, cursorY)
      _pageNum()
      continue
    }

    for (const item of visibleItems) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      const titleLines = doc.splitTextToSize(item.label || 'Untitled', CW * 0.58)
      const titleH = titleLines.length * 6

      const cleanDesc = _cleanText(item.description || (item.link ?? ''))
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const descLines = cleanDesc ? doc.splitTextToSize(cleanDesc, CW * 0.58) : []

      const hasDocImage = Array.isArray(item.images) && item.images.length >= 2
      const bandH = Math.max(45, Math.min(hasDocImage ? 240 : 160, titleH + 8 + descLines.length * 5.2 + 10))

      if (cursorY + bandH > PH - 18) {
        _pageNum()
        doc.addPage(); pageNum++; _bg()
        cursorY = MARGIN
      }

      // Card background — #f2f0eb
      doc.setFillColor(242, 240, 235)
      doc.roundedRect(MARGIN, cursorY, CW, bandH - 2, 2, 2, 'F')

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(26, 26, 26)
      doc.text(titleLines, MARGIN + 5, cursorY + 8)

      // Description
      if (cleanDesc) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(70, 70, 70)
        doc.text(descLines, MARGIN + 5, cursorY + 8 + titleH, { lineHeightFactor: 1.55 })
      }

      // Images — renders up to 2 stacked in right column (build photo + schematic/doc).
      // Add a `label` field to an image entry in config.js for a custom caption,
      // e.g. {"src": "photos/rfid-schematic.jpg", "date": "...", "label": "MOSFET switching circuit"}
      // Images without a label fall back to "schematic / technical documentation".
      const images = Array.isArray(item.images) && item.images.length
        ? item.images
        : item.image ? [{ src: item.image, date: null }] : []

      if (images.length) {
        const imgX = MARGIN + CW * 0.62
        const imgW = CW * 0.36
        let imgCursorY = cursorY + 4
        const maxToRender = Math.min(images.length, 2)

        for (let i = 0; i < maxToRender; i++) {
          try {
            const { dataUrl: imgData, w: iw, h: ih } = await _loadImageWithInfo(images[i].src)
            const availH = bandH - (imgCursorY - cursorY) - 10
            const maxH   = maxToRender === 2 && i === 0 ? (bandH - 10) * 0.52 : availH
            const imgH   = Math.min(maxH, imgW * (ih / iw))

            if (i === 1) {
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(7)
              doc.setTextColor(...TC)
              //doc.text(images[i].label || 'schematic / technical documentation', imgX, imgCursorY + 2)
              imgCursorY += 6
            }

            doc.addImage(imgData, 'JPEG', imgX, imgCursorY, imgW, imgH, undefined, 'FAST')

            if (images[i].date) {
              doc.setFont('helvetica', 'italic')
              doc.setFontSize(8)
              doc.setTextColor(...TC)
              doc.text(images[i].date, imgX, imgCursorY + imgH + 4)
              imgCursorY += imgH + 10
            } else {
              imgCursorY += imgH + 6
            }
          } catch (_) { /* skip */ }
        }
      }

      // GLB screenshot — The Portfolio tab only
      if (cabin.id === 'hobby-work') {
        const visBandIdx = visibleItems.indexOf(item)
        const glbEntry   = (_glbScenesByTab[tabIndex] || [])[visBandIdx]
        if (glbEntry && glbEntry.scene && glbEntry.camera) {
          try {
            const renderer = _ensureSharedRenderer()
            // rotationY in config is calibrated for the in-cabin 3D scene view, not the
            // PDF mini-viewer (camera at z=4). Use pdfRotationY if set; default to 0 so
            // models face their native forward direction toward the viewer.
            const pdfRotY = item.pdfRotationY ?? 0
            let savedRotX, savedRotY
            if (glbEntry._model) {
              savedRotX = glbEntry._model.rotation.x
              savedRotY = glbEntry._model.rotation.y
              glbEntry._model.rotation.x = 0
              glbEntry._model.rotation.y = pdfRotY
            }
            renderer.setSize(glbEntry.w, glbEntry.h, false)
            renderer.render(glbEntry.scene, glbEntry.camera)
            const glbData = renderer.domElement.toDataURL('image/png')
            if (glbEntry._model) {
              glbEntry._model.rotation.x = savedRotX
              glbEntry._model.rotation.y = savedRotY
            }
            const imgX  = MARGIN + CW * 0.62
            const imgW  = CW * 0.36
            const imgH  = Math.min(bandH - 10, imgW / (glbEntry.h > 0 ? glbEntry.w / glbEntry.h : 1))
            doc.addImage(glbData, 'PNG', imgX, cursorY + 4, imgW, imgH, undefined, 'FAST')
          } catch (_) { /* skip */ }
        }
      }

      cursorY += bandH
    }

    _pageNum()
  }

  // ── Skills page ───────────────────────────────────────────────────────────
  doc.addPage(); pageNum++; _bg()
  let skillsY = MARGIN
  skillsY = _sectionHeader('Skills', skillsY)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(140, 135, 128)
  doc.text('Skills are followed by the number of listed projects in which they were used.', MARGIN, skillsY)
  skillsY += 10

  const SKILL_CATEGORIES = [
    { keys: ['hardware'],              label: 'Hardware & Electronics' },
    { keys: ['coding'],                label: 'Software & Code'        },
    { keys: ['design', 'fabrication'], label: 'Design & Making'        },
    { keys: ['soft'],                  label: 'Soft Skills'            },
  ]
  const allSkills = _cfg.SKILLS || {}

  const skillProjectCount = {}
  const seenLabels = new Set()
  ;(_cfg.CABINS || []).forEach(cabin => {
    ;(cabin.items || []).forEach(item => {
      if (!Array.isArray(item.skills) || !item.label) return
      if (seenLabels.has(item.label)) return
      seenLabels.add(item.label)
      item.skills.forEach(slug => {
        skillProjectCount[slug] = (skillProjectCount[slug] || 0) + 1
      })
    })
  })

  SKILL_CATEGORIES.forEach(cat => {
    const catSkills = Object.entries(allSkills)
      .filter(([, s]) => cat.keys.includes(s.category))
      .sort((a, b) => b[1].level - a[1].level)
    if (!catSkills.length) return

    // Category label — terracotta uppercase
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...TC)
    doc.text(cat.label.toUpperCase(), MARGIN, skillsY)
    skillsY += 6

    let tagX = MARGIN
    doc.setFontSize(8.5)

    catSkills.forEach(([slug, skill]) => {
      const count    = skillProjectCount[slug] || 0
      const tagLabel = `${skill.label}  (${count})`
      doc.setFont('helvetica', 'bold')
      const nameW = doc.getTextWidth(skill.label)
      doc.setFont('helvetica', 'normal')
      const countW = doc.getTextWidth(`  (${count})`)
      const tagW   = nameW + countW + 10
      const tagH   = 7

      if (tagX + tagW > PW - MARGIN) { tagX = MARGIN; skillsY += tagH + 3 }

      // Chip — outlined terracotta
      doc.setDrawColor(...TC)
      doc.setLineWidth(0.4)
      doc.roundedRect(tagX, skillsY - 5, tagW, tagH, 1.5, 1.5, 'S')

      // Skill name bold, count normal
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(26, 26, 26)
      doc.text(skill.label, tagX + 5, skillsY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(140, 135, 128)
      doc.text(`  (${count})`, tagX + 5 + nameW, skillsY)

      tagX += tagW + 5
    })

    skillsY += 16
  })

  _pageNum()

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save('Bland_Sarah_portfolio.pdf')

  if (exportBtn) {
    exportBtn.innerHTML = '<span class="ps-btn-icon">&#8659;</span> Export'
    exportBtn.disabled  = false
  }
}

async function _loadPdfLibs() {
  if (_pdfLibsLoaded) return
  await Promise.all([
    _loadScript(PDF_LIBS.jsPDF),
    _loadScript(PDF_LIBS.html2canvas),
  ])
  _pdfLibsLoaded = true
}

function _loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src     = src
    s.onload  = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function _loadImageAsDataUrl(src) {
  return _loadImageWithInfo(src).then(r => r.dataUrl)
}

function _loadImageWithInfo(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width  = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85), w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = reject
    img.src = src
  })
}

// Simpler variant — returns base64 data URL or null on failure (used for headshot)
function _loadImageBase64(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width  = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      resolve(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// ─── STYLE INJECTION ──────────────────────────────────────────────────────────

function _injectStyles() {
  if (document.getElementById('ps-styles')) return
  const style = document.createElement('style')
  style.id          = 'ps-styles'
  style.textContent = _CSS
  document.head.appendChild(style)
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const _CSS = /* css */`

/* ── Google Font ──────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

/* ── Overlay ─────────────────────────────────────────────────────────────── */
.ps-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 20, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity 0.28s ease;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.ps-overlay.ps-visible {
  opacity: 1;
}

/* ── Holder ──────────────────────────────────────────────────────────────── */
.ps-holder {
  width: min(1120px, 96vw);
  height: min(760px, 92vh);
  background: #faf8f3;
  border-radius: 4px 12px 12px 12px;
  box-shadow:
    0 32px 80px rgba(0,0,0,0.45),
    0 0 0 1px rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transform: translateY(18px) scale(0.97);
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
}
.ps-overlay.ps-visible .ps-holder {
  transform: translateY(0) scale(1);
}

/* ── Tab bar ─────────────────────────────────────────────────────────────── */
.ps-tab-bar {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  padding: 0 20px;
  background: transparent;
  position: relative;
  z-index: 2;
  margin-bottom: -1px;
}

.ps-tab {
  padding: 7px 18px 9px;
  border: none;
  border-radius: 8px 8px 0 0;
  background: var(--tab-color);
  color: rgba(0,0,0,0.55);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, transform 0.18s;
  transform-origin: bottom center;
  transform: translateY(3px);
  text-transform: uppercase;
  position: relative;
  white-space: nowrap;
}
.ps-tab:hover {
  background: var(--tab-color-mid);
  color: rgba(0,0,0,0.75);
  transform: translateY(0);
}
.ps-tab--active {
  background: #faf8f3;
  color: rgba(0,0,0,0.85);
  font-weight: 600;
  transform: translateY(0);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}
.ps-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #faf8f3;
}

/* ── Controls row ────────────────────────────────────────────────────────── */
.ps-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 20px 8px;
  background: #faf8f3;
  border-bottom: 1.5px solid #ece8df;
  flex-shrink: 0;
}
.ps-btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: background 0.15s, opacity 0.15s;
}
.ps-btn-export:hover  { background: #333; }
.ps-btn-export:disabled { opacity: 0.5; cursor: default; }
.ps-btn-icon { font-size: 14px; }

.ps-btn-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px solid #d6d0c6;
  border-radius: 50%;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ps-btn-close:hover {
  background: #1a1a1a;
  color: #fff;
  border-color: #1a1a1a;
}

/* ── Page ────────────────────────────────────────────────────────────────── */
.ps-page {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  transition: opacity 0.16s ease, transform 0.16s ease;
  scrollbar-width: thin;
  scrollbar-color: var(--page-color-dark, #aaa) transparent;
}
.ps-page::-webkit-scrollbar       { width: 6px; }
.ps-page::-webkit-scrollbar-track { background: transparent; }
.ps-page::-webkit-scrollbar-thumb {
  background: var(--page-color-dark, #aaa);
  border-radius: 3px;
}

.ps-page-header {
  padding: 20px 28px 14px;
  border-bottom: 2px solid;
  margin-bottom: 2px;
}
.ps-page-title {
  margin: 0;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.ps-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  color: #aaa;
  font-size: 14px;
  font-style: italic;
}

/* ── Contact items row ───────────────────────────────────────────────────── */
.ps-contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 28px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.ps-contact-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: 1.5px solid;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  cursor: pointer;
  min-width: 160px;
}
.ps-contact-card:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
}
.ps-contact-icon {
  font-size: 18px;
  line-height: 1;
}
.ps-contact-label {
  flex: 1;
  color: rgba(0,0,0,0.75);
}
.ps-contact-arrow {
  font-size: 15px;
  font-weight: 700;
}

/* ── Band ────────────────────────────────────────────────────────────────── */
.ps-band {
  display: flex;
  align-items: stretch;
  border-top: 1px solid;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.18s;
}
.ps-band:hover {
  box-shadow: inset 0 0 0 1.5px rgba(0,0,0,0.07);
}

/* Rotated label strip on left edge */
.ps-band-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.85);
  padding: 10px 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  white-space: nowrap;
  overflow: hidden;
}

/* ── Columns ─────────────────────────────────────────────────────────────── */
.ps-col {
  flex: 1;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  padding: 16px 12px;
  box-sizing: border-box;
}

.ps-col + .ps-col {
  border-left: 1px solid rgba(0,0,0,0.06);
}

/* ── GLB column ──────────────────────────────────────────────────────────── */
.ps-col--glb {
  padding: 8px;
  align-items: stretch;
}
.ps-glb-wrap {
  position: relative;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1020 0%, #0c0818 100%);
  border: 1px solid rgba(255,255,255,0.06);
  transition: box-shadow 0.2s;
}
.ps-glb-wrap:hover {
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.ps-glb-wrap::after {
  content: '⤢';
  position: absolute;
  bottom: 8px;
  right: 10px;
  color: rgba(255,255,255,0.35);
  font-size: 16px;
  pointer-events: none;
  transition: opacity 0.2s;
}
.ps-glb-wrap:hover::after { color: rgba(255,255,255,0.7); }

.ps-glb-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.ps-glb-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.2);
  font-size: 12px;
}

/* ── Description column ──────────────────────────────────────────────────── */
.ps-col--desc {
  padding: 20px 18px;
  align-items: flex-start;
}
.ps-col--desc-wide {
  flex: 2;
}
.ps-desc-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.ps-desc-label {
  margin: 0;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 17px;
  font-weight: 400;
  line-height: 1.25;
}
.ps-desc-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.65;
  color: #444;
  overflow-y: auto;
  flex: 1;
}
.ps-desc-empty {
  color: #ccc;
  font-size: 20px;
}
.ps-link-btn {
  display: inline-block;
  padding: 10px 22px;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: opacity 0.15s, transform 0.15s;
  align-self: flex-start;
  margin-top: 24px;
}
.ps-link-btn:hover { opacity: 0.82; transform: translateY(-1px); }
.ps-desc-link-row {
  margin-top: auto;
  padding-top: 8px;
}
.ps-desc-link {
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
  letter-spacing: 0.02em;
  transition: opacity 0.15s;
}
.ps-desc-link:hover { opacity: 0.7; }

/* ── Carousel column ─────────────────────────────────────────────────────── */
.ps-col--photo {
  padding: 14px 12px 10px;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}
.ps-carousel-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ps-carousel-frame {
  flex: 1;
  position: relative;
  overflow: hidden;
  border-radius: 5px;
  background: #111;
  border: 2px solid rgba(255,255,255,0.12);
}
.ps-carousel-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  transition: opacity 0.15s ease;
}
.ps-carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.88);
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  color: #222;
  z-index: 2;
  transition: background 0.15s, transform 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}
.ps-carousel-arrow:hover {
  background: #fff;
  transform: translateY(-50%) scale(1.08);
}
.ps-carousel-arrow--prev { left:  7px; }
.ps-carousel-arrow--next { right: 7px; }
.ps-carousel-date {
  height: 22px;
  display: flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  flex-shrink: 0;
  padding-top: 4px;
}
.ps-carousel-wrap--empty {
  align-items: center;
  justify-content: center;
}
.ps-carousel-stars {
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #0e0820, #1a1030);
  border-radius: 5px;
  overflow: hidden;
}
.ps-carousel-frame--error {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Fullscreen GLB ──────────────────────────────────────────────────────── */
.ps-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(8, 4, 18, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.22s ease;
}
.ps-fullscreen--visible { opacity: 1; }
.ps-fullscreen-canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.ps-fullscreen-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.1);
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  color: rgba(255,255,255,0.8);
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ps-fullscreen-close:hover { background: rgba(255,255,255,0.2); }
.ps-fullscreen-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.35);
  font-family: 'DM Sans', sans-serif;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  pointer-events: none;
}

/* ── PDF Section Picker ──────────────────────────────────────────────────── */
.ps-pdf-picker {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: rgba(10, 6, 20, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
}
.ps-pdf-picker-inner {
  background: #faf8f3;
  border-radius: 12px;
  padding: 24px 28px 22px;
  min-width: 320px;
  max-width: 440px;
  width: 90vw;
  box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  display: flex;
  flex-direction: column;
}
/* ── PDF Picker: header ──────────────────────────────────────────────────── */
.ps-pdf-picker-hdr {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
  position: relative;
}
.ps-pdf-picker-close {
  position: absolute;
  top: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1.5px solid #d6d0c6;
  border-radius: 50%;
  color: #888;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.ps-pdf-picker-close:hover { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
/* ── Skills filter ───────────────────────────────────────────────────────── */
.ps-pdf-skill-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.ps-pdf-skill-grid--picker { margin-bottom: 4px; }
.ps-pdf-skill-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px 4px 8px; border: 1.5px solid #d6d0c6;
  border-radius: 20px; background: #faf8f3;
  font-size: 11.5px; cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  color: #555; user-select: none;
}
.ps-pdf-skill-chip input[type=checkbox] { display: none; }
.ps-pdf-skill-chip--on { background: #2a2a2a; border-color: #2a2a2a; color: #fff; }
.ps-pdf-skill-chip:hover:not(.ps-pdf-skill-chip--on) { border-color: #999; background: rgba(0,0,0,0.05); }
/* ── Picker sub ──────────────────────────────────────────────────────────── */
.ps-pdf-picker-title {
  margin: 0;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 18px;
  font-weight: 400;
  color: #1a1a1a;
  padding-right: 28px;
}
.ps-pdf-picker-sub {
  margin: 0;
  font-size: 12.5px;
  color: #777;
}
.ps-pdf-picker-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ps-pdf-check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  user-select: none;
}
.ps-pdf-check-label input[type=checkbox] {
  width: 16px;
  height: 16px;
  accent-color: #1a1a1a;
  cursor: pointer;
  flex-shrink: 0;
}
.ps-pdf-picker-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-top: 4px;
}
.ps-pdf-cancel {
  background: transparent;
  border: 1.5px solid #d6d0c6;
  border-radius: 6px;
  padding: 6px 16px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ps-pdf-cancel:hover {
  background: #f0ece4;
  color: #444;
}

/* ── Image carousel fullscreen lightbox ──────────────────────────────────── */
.ps-img-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  transition: background 0.22s ease;
}
.ps-img-fullscreen--visible {
  background: rgba(0, 0, 0, 0.92);
}
.ps-img-fullscreen-img {
  max-width: 88%;
  max-height: 82%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55);
  transition: opacity 0.13s ease;
  cursor: default;
  opacity: 1;
}
.ps-img-fullscreen-close {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.12);
  border: 1.5px solid rgba(255,255,255,0.28);
  border-radius: 50%;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  z-index: 1;
}
.ps-img-fullscreen-close:hover { background: rgba(255,255,255,0.28); }
.ps-img-fullscreen-date {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.5);
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  letter-spacing: 0.07em;
  pointer-events: none;
  white-space: nowrap;
}
.ps-img-fullscreen-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255,255,255,0.3);
  font-family: 'DM Sans', sans-serif;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  pointer-events: none;
  white-space: nowrap;
}
.ps-img-fullscreen-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  background: rgba(255,255,255,0.10);
  border: 1.5px solid rgba(255,255,255,0.22);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  z-index: 1;
}
.ps-img-fullscreen-arrow:hover { background: rgba(255,255,255,0.25); }
.ps-img-fullscreen-arrow--prev { left: 18px; }
.ps-img-fullscreen-arrow--next { right: 18px; }

/* ── GLB Screenshot TODO placeholder (Digital Projects right column) ─────── */
.ps-glb-screenshot-todo {
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    -45deg,
    rgba(0,0,0,0.025) 0px,
    rgba(0,0,0,0.025) 6px,
    transparent 6px,
    transparent 14px
  ) !important;
  border: 2px dashed rgba(0,0,0,0.18) !important;
  border-radius: 6px;
  margin: 12px 8px;
}
.ps-glb-todo-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  opacity: 0.45;
  user-select: none;
}
.ps-glb-todo-icon { font-size: 30px; line-height: 1; }
.ps-glb-todo-label {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.03em;
}
.ps-glb-todo-sub {
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  color: #888;
  font-style: italic;
}

/* ── Print / PDF overrides ───────────────────────────────────────────────── */
@media print {
  .ps-overlay   { position: static; background: white; }
  .ps-holder    { box-shadow: none; width: 100%; height: auto; }
  .ps-tab-bar, .ps-controls, .ps-fullscreen { display: none !important; }
  .ps-band      { background: #f8f8f8 !important; page-break-inside: avoid; break-inside: avoid; }
  .ps-band-label { display: none; }
  .ps-carousel-arrow { display: none; }
  .ps-glb-wrap::after { display: none; }
}

/* ── Skills page ─────────────────────────────────────────────────────────── */
.ps-skills-section {
  padding: 22px 28px 4px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.ps-skills-section:last-child { border-bottom: none; }
.ps-skills-cat-title {
  margin: 0 0 14px;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 18px;
  font-weight: 400;
  letter-spacing: -0.01em;
  padding-bottom: 8px;
  border-bottom: 1.5px solid;
}
.ps-skills-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 18px;
}
.ps-skill-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border: 1.5px solid;
  border-radius: 8px;
  cursor: pointer;
  min-width: 110px;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
}
.ps-skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.10);
}
.ps-skill-card-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.01em;
}
.ps-skill-level {
  display: flex;
  gap: 4px;
  align-items: center;
}
.ps-skill-level--lg { gap: 5px; }
.ps-skill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ps-skill-level--lg .ps-skill-dot { width: 10px; height: 10px; }

/* ── Skill tap modal ─────────────────────────────────────────────────────── */
.ps-skill-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 150;
  background: rgba(10, 6, 20, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}
.ps-skill-modal {
  background: #faf8f3;
  border-radius: 12px;
  padding: 22px 26px 20px;
  min-width: 300px;
  max-width: 460px;
  max-height: 68vh;
  overflow-y: auto;
  box-shadow: 0 16px 48px rgba(0,0,0,0.28);
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
}
.ps-skill-modal-hdr {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ps-skill-modal-title {
  margin: 0;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 21px;
  font-weight: 400;
  flex: 1;
}
.ps-skill-modal-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px solid #d6d0c6;
  border-radius: 50%;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.ps-skill-modal-close:hover { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.ps-skill-modal-sub {
  margin: 0;
  font-size: 10.5px;
  color: #aaa;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.ps-skill-modal-empty {
  margin: 0;
  color: #bbb;
  font-size: 13px;
  font-style: italic;
}
.ps-skill-modal-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ps-skill-modal-row {
  background: rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.07);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ps-skill-modal-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ps-skill-modal-row-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
}
.ps-skill-modal-row-cabin {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.ps-skill-modal-row-desc {
  margin: 0;
  font-size: 11px;
  color: #888;
  line-height: 1.55;
}
`