// ═══════════════════════════════════════════════════════════
// inspect.js — Project object inspection system
//   - Spawns item GLBs when entering a cabin
//   - Hover → glow pulse + point light ramp
//   - Click object → if link: open tab, if description: show panel
//   - Arrow keys rotate inspected object
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { applyItemGlow } from './materials.js'
import { isDevModeActive } from './devmode.js'

const CABIN_GLOW_COLORS = {
  'digital-projects':  '#F4A7B9',
  'physical-projects': '#F9C8A0',
  'events':            '#F7E4A0',
  'about-me':          '#A8D5B5',
  'hobby-work':        '#CDB4DB',
  'more-stuff':           '#B3B8E8',
}

export class InspectSystem {
  constructor({ camera, scene }) {
    this.camera      = camera
    this.scene       = scene

    // ── YOUR ORIGINAL INSPECT STATE ──────────────────────────
    this._target     = null
    this._rotateX    = 0
    this._rotateY    = 0
    this._keys       = { left: false, right: false, up: false, down: false }
    this._active     = false

    this._panel      = document.getElementById('project-panel')
    this._panelTitle = document.getElementById('panel-title')
    this._panelDesc  = document.getElementById('panel-description')
    this._panelImage = document.getElementById('panel-image')
    this._closeBtn   = document.getElementById('panel-close')
    this._closeBtn.addEventListener('click', () => this.close())
    this._bindKeys()

    // ── NEW: ITEM SPAWNING STATE ──────────────────────────────
    this.loader      = new GLTFLoader()
    this.activeItems = []
    this._lights     = []
    this._pulseT     = 0
    this.hoveredItem = null
    this.raycaster   = new THREE.Raycaster()
    this.mouse       = new THREE.Vector2()

    window.addEventListener('mousemove', this._onMouseMove.bind(this))
    window.addEventListener('click',     this._onItemClick.bind(this))
  }

  // ══════════════════════════════════════════════════════════
  // YOUR ORIGINAL METHODS — unchanged
  // ══════════════════════════════════════════════════════════

  inspect(object3D, projectConfig) {
    console.log("THIS IS BEING CALLED")
    const hasDescription = projectConfig.description != null && projectConfig.description !== '';

    if (projectConfig.link && !hasDescription) {
      window.open(projectConfig.link, '_blank')
      console.log("This works ig")
      return
    }else if (projectConfig.link){
      this._showPanel(projectConfig)
      window.open(projectConfig.link, '_blank')
      console.log("This also works")
      return true
    }
    this._target   = object3D
    this._rotateX  = object3D.rotation.x
    this._rotateY  = object3D.rotation.y
    this._active   = true
    this._showPanel(projectConfig)
    return true
  }

  _showPanel(config) {
    this._panelTitle.textContent = config.label || ''
    this._panelDesc.textContent  = config.description || ''
    this._panelImage.innerHTML   = ''
    const imageSrc = config.image || (Array.isArray(config.images) && config.images.length ? config.images[0].src : null)

    if (imageSrc) {
      const img = document.createElement('img')
      img.src   = imageSrc
      img.alt   = config.label
      img.style.width          = '100%'
      img.style.height         = '100%'
      img.style.objectFit      = 'cover'
      img.style.objectPosition = config.imageOffset || '50% 50%'
      this._panelImage.appendChild(img)
      this._panelImage.classList.remove('panel-image--stars')
    }
    this._panel.classList.remove('panel--hidden')
  }

  close() {
    this._active = false
    this._target = null
    this._panel.classList.add('panel--hidden')
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this._active) return
      switch (e.key) {
        case 'ArrowLeft':
          this._keys.left = true
          e.stopImmediatePropagation()
          break
        case 'ArrowRight':
          this._keys.right = true
          e.stopImmediatePropagation()
          break
        case 'ArrowUp':    this._keys.up    = true; break
        case 'ArrowDown':  this._keys.down  = true; break
      }
    }, true)   // capture phase — fires before camera controller
    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':  this._keys.left  = false; break
        case 'ArrowRight': this._keys.right = false; break
        case 'ArrowUp':    this._keys.up    = false; break
        case 'ArrowDown':  this._keys.down  = false; break
      }
    })
  }

  get isActive() { return this._active }

  // ══════════════════════════════════════════════════════════
  // NEW: ITEM SPAWNING + GLOW
  // ══════════════════════════════════════════════════════════

  async spawnItems(cabin) {
    this.clearItems()

    const config    = cabin.config
    const glowColor = CABIN_GLOW_COLORS[config.id] || '#FFD700'

    for (const itemConfig of config.items) {
      const seatKey   = itemConfig.seat === 'left'
        ? 'cabin_chair_left_seat'
        : 'cabin_chair_right_seat'
      const seatEmpty = cabin.seatEmpties?.[seatKey]

      if (!seatEmpty) {
        console.warn(`[Inspect] No seat empty "${seatKey}" for cabin "${config.id}"`)
        continue
      }

      const seatWorld = new THREE.Vector3()
      seatEmpty.getWorldPosition(seatWorld)

      const [ox, oy, oz] = itemConfig.positionOffset || [0, 0, 0]
      seatWorld.x += ox
      seatWorld.y += oy
      seatWorld.z += oz

      try {
        const gltf = await this._loadGLB(itemConfig.glb)
        const root = gltf.scene

        applyItemGlow(root, glowColor)

        root.position.copy(seatWorld)
        root.scale.setScalar(itemConfig.scale ?? 1.0)
        root.rotation.y = itemConfig.rotationY ?? 0   // ← add this
        root.userData.itemConfig = itemConfig
        root.userData.glowColor  = glowColor
        root.userData.isItem     = true

        this.scene.add(root)
        this.activeItems.push(root)

        const light = new THREE.PointLight(glowColor, 0.4, 15)
        light.position.copy(seatWorld)
        this.scene.add(light)
        this._lights.push(light)

      } catch (err) {
        console.error(`[Inspect] Failed to load ${itemConfig.glb}:`, err)
      }
    }
  }

  clearItems() {
    this.activeItems.forEach(item => this.scene.remove(item))
    this._lights.forEach(light => this.scene.remove(light))
    this.activeItems = []
    this._lights     = []
    this.hoveredItem = null
  }

  // ══════════════════════════════════════════════════════════
  // UPDATE — merged: your rotation + new pulse/bob
  // ══════════════════════════════════════════════════════════

  update(delta) {
    this._pulseT += delta

    // ── YOUR ORIGINAL: arrow key rotation ─────────────────
    if (this._active && this._target) {
      const speed = 1.5 * delta
      if (this._keys.left)  this._rotateY -= speed
      if (this._keys.right) this._rotateY += speed
      if (this._keys.up)    this._rotateX -= speed
      if (this._keys.down)  this._rotateX += speed
      this._target.rotation.y = this._rotateY
      this._target.rotation.x = this._rotateX
    }

    // ── NEW: bob + rotate spawned items ───────────────────
    this.activeItems.forEach((item, i) => {
      const offset = i * 1.3
      // Only bob/rotate if not currently being arrow-key inspected
      if (item !== this._target) {
        item.position.y += Math.sin(this._pulseT * 1.1 + offset) * 0.0008
      }
    })

    // ── NEW: pulse point lights ────────────────────────────
    this._lights.forEach((light, i) => {
      const offset = i * 0.9
      const pulse  = 0.5
        + Math.sin(this._pulseT * 1.8 + offset) * 0.28
        + Math.sin(this._pulseT * 0.7 + offset * 0.5) * 0.14
      light.intensity = this.hoveredItem && this.activeItems[i] === this.hoveredItem
        ? 1.8 + pulse * 1.2
        : 0.4 + pulse * 0.25
    })

    // ── NEW: pulse emissive on hovered item ────────────────
    if (this.hoveredItem) {
      const pulse = 0.5 + Math.sin(this._pulseT * 2.2) * 0.35
      this.hoveredItem.traverse((child) => {
        if (!child.isMesh || !child.material) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if (mat.userData.isGlow)   mat.emissiveIntensity = pulse * 2.5
          if (mat.userData.isSubtle) mat.emissiveIntensity = pulse * 0.8
        })
      })
    }
  }

  // ══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════

  _onMouseMove(e) {
    this.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = []
    this.activeItems.forEach(item =>
      item.traverse(c => { if (c.isMesh) meshes.push(c) })
    )
    const hits = this.raycaster.intersectObjects(meshes, false)

    const prev = this.hoveredItem

    if (hits.length > 0) {
      let obj = hits[0].object
      while (obj.parent && !obj.userData.isItem) obj = obj.parent
      this.hoveredItem = obj.userData.isItem ? obj : null
    } else {
      this.hoveredItem = null
    }

    // Reset emissive when leaving hover
    if (prev && prev !== this.hoveredItem) {
      prev.traverse((child) => {
        if (!child.isMesh || !child.material) return
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((mat) => {
          if (mat.userData.isGlow)   mat.emissiveIntensity = 0.8
          if (mat.userData.isSubtle) mat.emissiveIntensity = 0.15
        })
      })
    }

    document.body.style.cursor = this.hoveredItem ? 'pointer' : ''
  }

  _onItemClick(e) {
    if (isDevModeActive()) return   // ← add this line
    if (!this.hoveredItem) return
    const config = this.hoveredItem.userData.itemConfig
    if (!config) return
    this.inspect(this.hoveredItem, config)  // let inspect() decide what to do
  } 

  _loadGLB(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject)
    })
  }
}