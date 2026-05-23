// ═══════════════════════════════════════════════════════════
// guestbook.js — Portfolio Guestbook Overlay
//
// Replaces the Skills Gallery slot. Called via onSkillsOpen
// callback from buttonFunctions.js / buttons.js.
//
// Attempts to load a GLB book model first; falls back to a
// pure-CSS animated book if the asset is unavailable.
//
// Submits to Google Forms via hidden iframe (no redirect).
// Doodle canvas is opt-in and encodes as base64 into a
// hidden field — recruiters never see the raw data.
// ═══════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// GOOGLE FORM CONFIGURATION
// ─────────────────────────────────────────────────────────────

const FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSdCOkvvdI013Pdh56oz6m4GvqOIMPDNCDKG53Kpxc-l2AqLqA/formResponse'

const FORM_FIELDS = {
  name:    'entry.174259173',
  email:   'entry.764995165',
  message: 'entry.391741938',
  doodle:  'entry.1638654934',
}

// ─────────────────────────────────────────────────────────────
// GLB PATH — update this to match your asset pipeline
// e.g. '/assets/models/guestbook.glb' or './models/book.glb'
// If the file 404s, the CSS fallback fires automatically.
// ─────────────────────────────────────────────────────────────

const GLB_PATH = '/assets/models/guestbook.glb'   // TODO: set your actual path


// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const GUESTBOOK_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400&display=swap');

  /* ── Overlay backdrop ── */
  #guestbook-overlay {
    position: fixed;
    inset: 0;
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 8, 6, 0.82);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    opacity: 0;
    animation: gb-fade-in 0.35s ease forwards;
  }
  @keyframes gb-fade-in {
    to { opacity: 1; }
  }

  /* ── CSS Book (fallback) ── */
  .gb-book-wrap {
    perspective: 1200px;
    width: 560px;
    height: 380px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    opacity: 0.18;
  }
  .gb-book {
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transform: rotateX(18deg) rotateY(-22deg);
    animation: gb-float 6s ease-in-out infinite;
  }
  @keyframes gb-float {
    0%, 100% { transform: rotateX(18deg) rotateY(-22deg) translateY(0); }
    50%       { transform: rotateX(18deg) rotateY(-18deg) translateY(-10px); }
  }
  .gb-book-face {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 3px 16px 16px 3px;
    background: linear-gradient(135deg, #2a1f12 0%, #3d2c18 40%, #2e2010 100%);
    box-shadow:
      inset -8px 0 20px rgba(0,0,0,0.5),
      inset 8px 0 10px rgba(255,220,160,0.08),
      0 30px 60px rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gb-book-face::before {
    content: '';
    position: absolute;
    left: 18px;
    top: 10%;
    width: 4px;
    height: 80%;
    background: linear-gradient(to bottom, #5c3d1e, #2a1f12, #5c3d1e);
    border-radius: 2px;
    box-shadow: 2px 0 8px rgba(0,0,0,0.4);
  }
  .gb-book-spine {
    position: absolute;
    left: -30px;
    top: 0;
    width: 30px;
    height: 100%;
    background: linear-gradient(to right, #1a1208, #2a1f12);
    border-radius: 3px 0 0 3px;
    transform: rotateY(-90deg);
    transform-origin: right center;
    box-shadow: inset 4px 0 10px rgba(0,0,0,0.5);
  }
  .gb-book-title {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 22px;
    color: rgba(210, 170, 100, 0.7);
    letter-spacing: 0.08em;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    user-select: none;
  }

  /* ── GLB canvas container ── */
  #gb-glb-container {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
  }
  #gb-glb-container canvas {
    width: 100% !important;
    height: 100% !important;
  }

  /* ── Panel ── */
  #guestbook-panel {
    position: relative;
    z-index: 1;
    width: min(480px, 92vw);
    background: #0f0c08;
    border: 1px solid rgba(180, 140, 70, 0.25);
    border-radius: 18px;
    box-shadow:
      0 0 0 1px rgba(255,220,140,0.06),
      0 40px 80px rgba(0,0,0,0.8),
      0 0 60px rgba(180,120,40,0.08);
    overflow: hidden;
    animation: gb-panel-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    transform: translateY(30px);
    opacity: 0;
  }
  @keyframes gb-panel-rise {
    to { transform: translateY(0); opacity: 1; }
  }

  /* ── Panel header ── */
  .gb-header {
    padding: 28px 30px 20px;
    border-bottom: 1px solid rgba(180, 140, 70, 0.12);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .gb-header-text h2 {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 26px;
    color: #d4aa60;
    margin: 0 0 4px;
    letter-spacing: 0.02em;
  }
  .gb-header-text p {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: rgba(210, 190, 150, 0.45);
    margin: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .gb-close {
    background: none;
    border: none;
    color: rgba(210, 190, 150, 0.35);
    font-size: 20px;
    cursor: pointer;
    padding: 4px 6px;
    line-height: 1;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .gb-close:hover {
    color: #d4aa60;
    background: rgba(180, 140, 70, 0.08);
  }

  /* ── Form body ── */
  .gb-form-body {
    padding: 24px 30px 28px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gb-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .gb-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .gb-field label {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(210, 180, 110, 0.55);
  }
  .gb-field label span.gb-optional {
    color: rgba(210, 180, 110, 0.28);
    font-size: 9px;
    margin-left: 5px;
  }
  .gb-field input,
  .gb-field textarea {
    background: rgba(255, 240, 200, 0.04);
    border: 1px solid rgba(180, 140, 70, 0.18);
    border-radius: 8px;
    color: #e8d9b8;
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    padding: 10px 13px;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    resize: none;
    width: 100%;
    box-sizing: border-box;
  }
  .gb-field input::placeholder,
  .gb-field textarea::placeholder {
    color: rgba(200, 170, 100, 0.22);
  }
  .gb-field input:focus,
  .gb-field textarea:focus {
    border-color: rgba(180, 140, 70, 0.55);
    background: rgba(255, 240, 200, 0.07);
    box-shadow: 0 0 0 3px rgba(180, 120, 40, 0.1);
  }
  .gb-field input.gb-invalid,
  .gb-field textarea.gb-invalid {
    border-color: rgba(220, 80, 60, 0.5);
    box-shadow: 0 0 0 3px rgba(220, 80, 60, 0.1);
  }

  /* ── Doodle toggle ── */
  .gb-doodle-toggle {
    background: none;
    border: 1px dashed rgba(180, 140, 70, 0.22);
    border-radius: 8px;
    color: rgba(210, 180, 110, 0.45);
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    padding: 9px 14px;
    cursor: pointer;
    text-align: left;
    transition: color 0.2s, border-color 0.2s, background 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gb-doodle-toggle:hover {
    color: #d4aa60;
    border-color: rgba(180, 140, 70, 0.45);
    background: rgba(180, 140, 70, 0.04);
  }
  .gb-doodle-toggle .gb-toggle-arrow {
    margin-left: auto;
    transition: transform 0.25s ease;
  }
  .gb-doodle-toggle.open .gb-toggle-arrow {
    transform: rotate(180deg);
  }

  /* ── Doodle canvas area ── */
  .gb-doodle-area {
    display: none;
    flex-direction: column;
    gap: 8px;
    animation: gb-doodle-open 0.25s ease forwards;
  }
  .gb-doodle-area.visible {
    display: flex;
  }
  @keyframes gb-doodle-open {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  #gb-doodle-canvas {
    width: 100%;
    height: 130px;
    border-radius: 8px;
    background: rgba(255, 248, 230, 0.96);
    cursor: crosshair;
    touch-action: none;
    border: 1px solid rgba(180, 140, 70, 0.25);
    display: block;
  }
  .gb-doodle-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .gb-color-swatch {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.15s;
  }
  .gb-color-swatch:hover { transform: scale(1.15); }
  .gb-color-swatch.active { border-color: rgba(210, 180, 110, 0.8); }
  .gb-doodle-clear {
    margin-left: auto;
    background: none;
    border: 1px solid rgba(180, 140, 70, 0.18);
    border-radius: 6px;
    color: rgba(210, 180, 110, 0.4);
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 4px 10px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .gb-doodle-clear:hover {
    color: #d4aa60;
    border-color: rgba(180, 140, 70, 0.45);
  }

  /* ── Submit row ── */
  .gb-submit-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }
  .gb-submit-hint {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    color: rgba(200, 170, 100, 0.25);
    letter-spacing: 0.05em;
  }
  .gb-submit {
    background: linear-gradient(135deg, #c8973a 0%, #a8762a 100%);
    border: none;
    border-radius: 9px;
    color: #0f0c08;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 11px 24px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(180, 120, 40, 0.3);
    transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.2s;
    position: relative;
    overflow: hidden;
  }
  .gb-submit:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba(180, 120, 40, 0.45);
  }
  .gb-submit:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(180, 120, 40, 0.25);
  }
  .gb-submit:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  /* ── Success state ── */
  .gb-success {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 30px 40px;
    gap: 12px;
    text-align: center;
  }
  .gb-success.visible { display: flex; }
  .gb-success-icon {
    font-size: 42px;
    animation: gb-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes gb-pop {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .gb-success h3 {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 22px;
    color: #d4aa60;
    margin: 0;
  }
  .gb-success p {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    color: rgba(210, 180, 110, 0.4);
    margin: 0;
    letter-spacing: 0.06em;
  }
`


// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('guestbook-styles')) return
  const el = document.createElement('style')
  el.id = 'guestbook-styles'
  el.textContent = GUESTBOOK_STYLES
  document.head.appendChild(el)
}

function removeOverlay() {
  const el = document.getElementById('guestbook-overlay')
  if (!el) return
  el.style.transition = 'opacity 0.25s ease'
  el.style.opacity = '0'
  setTimeout(() => el.remove(), 280)
}


// ─────────────────────────────────────────────────────────────
// GLB LOADER — attempts to spin up a minimal Three.js scene
// with the book model. Resolves true on success, false on fail.
// ─────────────────────────────────────────────────────────────

async function tryLoadGLB(containerEl) {
  try {
    // Dynamic imports so this file doesn't hard-fail if Three isn't bundled
    const [THREE, { GLTFLoader }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
    ])

    // Quick HEAD check — avoids a noisy 404 console error from GLTFLoader
    const probe = await fetch(GLB_PATH, { method: 'HEAD' })
    if (!probe.ok) return false

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(containerEl.clientWidth, containerEl.clientHeight)
    renderer.setClearColor(0x000000, 0)
    containerEl.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.1, 100)
    camera.position.set(0, 1.2, 3.5)

    scene.add(new THREE.AmbientLight(0xd4aa60, 0.6))
    const dir = new THREE.DirectionalLight(0xfff0d0, 1.2)
    dir.position.set(3, 5, 3)
    scene.add(dir)

    const loader = new GLTFLoader()
    const gltf   = await loader.loadAsync(GLB_PATH)
    const model  = gltf.scene
    scene.add(model)

    // Centre the model
    const box    = new THREE.Box3().setFromObject(model)
    const centre = box.getCenter(new THREE.Vector3())
    model.position.sub(centre)

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      model.rotation.y += 0.004
      renderer.render(scene, camera)
    }
    animate()

    // Clean up when overlay closes
    const observer = new MutationObserver(() => {
      if (!document.contains(containerEl)) {
        cancelAnimationFrame(animId)
        renderer.dispose()
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return true
  } catch {
    return false
  }
}


// ─────────────────────────────────────────────────────────────
// CSS BOOK FALLBACK
// ─────────────────────────────────────────────────────────────

function renderCSSBook(containerEl) {
  containerEl.innerHTML = `
    <div class="gb-book-wrap">
      <div class="gb-book">
        <div class="gb-book-spine"></div>
        <div class="gb-book-face">
          <span class="gb-book-title">Guest Book</span>
        </div>
      </div>
    </div>
  `
}


// ─────────────────────────────────────────────────────────────
// DOODLE CANVAS SETUP
// ─────────────────────────────────────────────────────────────

function initDoodleCanvas(canvas) {
  const ctx       = canvas.getContext('2d')
  let drawing     = false
  let lastX       = 0
  let lastY       = 0
  let strokeColor = '#1a1208'

  // Scale canvas to its CSS size for crisp rendering
  function resize() {
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width  = width  * window.devicePixelRatio
    canvas.height = height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.fillStyle = 'rgba(255, 248, 230, 0)'
    ctx.fillRect(0, 0, width, height)
  }
  resize()

  function getPos(e) {
    const rect = canvas.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return [src.clientX - rect.left, src.clientY - rect.top]
  }

  function startDraw(e) {
    e.preventDefault()
    drawing = true;
    [lastX, lastY] = getPos(e)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const [x, y] = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(x, y)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastX = x
    lastY = y
  }

  function stopDraw() { drawing = false }

  canvas.addEventListener('mousedown',  startDraw)
  canvas.addEventListener('mousemove',  draw)
  canvas.addEventListener('mouseup',    stopDraw)
  canvas.addEventListener('mouseleave', stopDraw)
  canvas.addEventListener('touchstart', startDraw, { passive: false })
  canvas.addEventListener('touchmove',  draw,      { passive: false })
  canvas.addEventListener('touchend',   stopDraw)

  // Returns the colour setter so swatches can update it
  return {
    setColor: (c) => { strokeColor = c },
    clear:    () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)
    },
    toDataURL: () => canvas.toDataURL('image/png'),
    isEmpty: () => {
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      return !d.some((v, i) => i % 4 === 3 && v > 0) // check alpha channel
    },
  }
}


// ─────────────────────────────────────────────────────────────
// FORM SUBMISSION — hidden iframe trick, no page redirect
// ─────────────────────────────────────────────────────────────

function submitToGoogleForms({ name, email, message, doodle }) {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.name  = 'gb-submit-target'
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = FORM_ACTION
    form.target = 'gb-submit-target'
    form.style.display = 'none'

    const fields = {
      [FORM_FIELDS.name]:    name,
      [FORM_FIELDS.email]:   email,
      [FORM_FIELDS.message]: message,
      [FORM_FIELDS.doodle]:  doodle || '',
    }

    Object.entries(fields).forEach(([key, val]) => {
      const input = document.createElement('input')
      input.type  = 'hidden'
      input.name  = key
      input.value = val
      form.appendChild(input)
    })

    document.body.appendChild(form)
    iframe.onload = () => {
      setTimeout(() => {
        iframe.remove()
        form.remove()
        resolve(true)
      }, 200)
    }
    form.submit()

    // Fallback resolve in case onload doesn't fire (CORS policy on Google's end)
    setTimeout(() => resolve(true), 2500)
  })
}


// ─────────────────────────────────────────────────────────────
// OPEN GUESTBOOK — PUBLIC EXPORT
// Wire this to onSkillsOpen in main.js / buttonFunctions.js
// ─────────────────────────────────────────────────────────────

export async function openGuestbook() {
  injectStyles()

  // Prevent duplicate overlays
  if (document.getElementById('guestbook-overlay')) return

  // ── Build overlay DOM ───────────────────────────────────────
  const overlay = document.createElement('div')
  overlay.id = 'guestbook-overlay'

  overlay.innerHTML = `
    <!-- Background book (GLB container or CSS fallback) -->
    <div id="gb-glb-container"></div>

    <!-- Foreground form panel -->
    <div id="guestbook-panel">

      <div class="gb-header">
        <div class="gb-header-text">
          <h2>Sign the Guestbook</h2>
          <p>Leave a note &mdash; I read every one</p>
        </div>
        <button class="gb-close" id="gb-close-btn" aria-label="Close">✕</button>
      </div>

      <div class="gb-form-body" id="gb-form-body">
        <div class="gb-row">
          <div class="gb-field">
            <label>Name</label>
            <input type="text" id="gb-name" placeholder="Ada Lovelace" autocomplete="name" />
          </div>
          <div class="gb-field">
            <label>Email <span class="gb-optional">optional</span></label>
            <input type="email" id="gb-email" placeholder="hi@example.com" autocomplete="email" />
          </div>
        </div>

        <div class="gb-field">
          <label>Message</label>
          <textarea id="gb-message" rows="3" placeholder="Love what you've built here…"></textarea>
        </div>

        <button class="gb-doodle-toggle" id="gb-doodle-toggle">
          ✏️ Add a doodle <span class="gb-optional" style="margin-left:0">(totally optional)</span>
          <span class="gb-toggle-arrow">▾</span>
        </button>

        <div class="gb-doodle-area" id="gb-doodle-area">
          <canvas id="gb-doodle-canvas"></canvas>
          <div class="gb-doodle-controls">
            <div class="gb-color-swatch active" data-color="#1a1208" style="background:#1a1208;" title="Ink"></div>
            <div class="gb-color-swatch" data-color="#c8450a" style="background:#c8450a;" title="Red"></div>
            <div class="gb-color-swatch" data-color="#2255aa" style="background:#2255aa;" title="Blue"></div>
            <div class="gb-color-swatch" data-color="#228844" style="background:#228844;" title="Green"></div>
            <div class="gb-color-swatch" data-color="#c9a84c" style="background:#c9a84c;" title="Gold"></div>
            <button class="gb-doodle-clear" id="gb-doodle-clear">Clear</button>
          </div>
        </div>

        <div class="gb-submit-row">
          <span class="gb-submit-hint">No account needed</span>
          <button class="gb-submit" id="gb-submit-btn">Leave a note →</button>
        </div>
      </div>

      <!-- Success state (hidden until submission) -->
      <div class="gb-success" id="gb-success">
        <div class="gb-success-icon">📖</div>
        <h3>Thanks for signing!</h3>
        <p>Your note is in the book</p>
      </div>

    </div>
  `

  document.body.appendChild(overlay)

  // ── ESC to close ────────────────────────────────────────────
  const onKeyDown = (e) => { if (e.key === 'Escape') removeOverlay() }
  document.addEventListener('keydown', onKeyDown)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeOverlay()
  })
  document.getElementById('gb-close-btn').addEventListener('click', removeOverlay)

  // ── Book visual ─────────────────────────────────────────────
  const glbContainer = document.getElementById('gb-glb-container')
  const glbLoaded    = await tryLoadGLB(glbContainer)
  if (!glbLoaded) renderCSSBook(glbContainer)

  // ── Doodle toggle ────────────────────────────────────────────
  let doodleController = null
  const doodleToggle   = document.getElementById('gb-doodle-toggle')
  const doodleArea     = document.getElementById('gb-doodle-area')

  doodleToggle.addEventListener('click', () => {
    const isOpen = doodleArea.classList.toggle('visible')
    doodleToggle.classList.toggle('open', isOpen)

    if (isOpen && !doodleController) {
      // Init canvas only once it's visible (getBoundingClientRect needs layout)
      requestAnimationFrame(() => {
        doodleController = initDoodleCanvas(document.getElementById('gb-doodle-canvas'))
      })
    }
  })

  // ── Colour swatches ──────────────────────────────────────────
  doodleArea.addEventListener('click', (e) => {
    const swatch = e.target.closest('.gb-color-swatch')
    if (!swatch || !doodleController) return
    doodleArea.querySelectorAll('.gb-color-swatch').forEach(s => s.classList.remove('active'))
    swatch.classList.add('active')
    doodleController.setColor(swatch.dataset.color)
  })

  document.getElementById('gb-doodle-clear').addEventListener('click', () => {
    doodleController?.clear()
  })

  // ── Submission ───────────────────────────────────────────────
  document.getElementById('gb-submit-btn').addEventListener('click', async () => {
    const nameEl    = document.getElementById('gb-name')
    const messageEl = document.getElementById('gb-message')
    const emailEl   = document.getElementById('gb-email')
    const submitBtn = document.getElementById('gb-submit-btn')

    // Validate required fields
    let valid = true
    ;[nameEl, messageEl].forEach(el => {
      el.classList.remove('gb-invalid')
      if (!el.value.trim()) {
        el.classList.add('gb-invalid')
        valid = false
      }
    })
    if (!valid) return

    submitBtn.disabled    = true
    submitBtn.textContent = 'Sending…'

    // Encode doodle only if something was drawn
    let doodleData = ''
    if (doodleController && !doodleController.isEmpty()) {
      doodleData = doodleController.toDataURL()
    }

    await submitToGoogleForms({
      name:    nameEl.value.trim(),
      email:   emailEl.value.trim(),
      message: messageEl.value.trim(),
      doodle:  doodleData,
    })

    // Show success
    document.getElementById('gb-form-body').style.display = 'none'
    document.getElementById('gb-success').classList.add('visible')

    // Auto-close after a beat
    setTimeout(removeOverlay, 3200)
  })
}
