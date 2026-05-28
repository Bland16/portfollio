// ═══════════════════════════════════════════════════════════
// main.js — Entry point and orchestrator
//   Initializes everything, runs the animation loop
//   This is the file that wires all systems together
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { GLTFLoader }         from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader }        from 'three/addons/loaders/DRACOLoader.js'

import { CABINS, SKILLS, WHEEL, MODEL_SCALE, CAMERA } from './config.js'
import { applyMaterials }     from './materials.js'
import { FerrisWheel }        from './wheel.js'
import { CameraController, CameraMode } from './camera.js'
import { LabelSystem }        from './labels.js'
import { FogSystem }          from './fog.js'
import { InspectSystem }      from './inspect.js'
import { setupLighting, addAttachPointLights } from './lighting.js'
import { setupPostProcessing, enableBloom } from './postprocessing.js'
import { ClockworkRig, ClockworkAnimations, showWelcome } from './welcome.js'
import { SirMatcher }         from './sir-matcher.js'
import { SirChat }            from './sir-chat.js'
import { initButtons } from './buttons.js'
import { AutoExplore } from './autoExplore.js'
import { detectPerformanceTier, initVibes, applyVibe, updateVibes, getComposer, getActiveVibe, setEmissionScale, INITIAL_VIBE, setAuroraActive } from './vibes.js'
import { initPortfolioSheet, openPortfolioSheet } from './PortfolioSheet.js'
import { initSkillsGallery, openSkillsGallery }   from './SkillsGallery.js'
import { DevMode } from './devmode.js'


// ── DOM REFERENCES ─────────────────────────────────────────
const container      = document.getElementById('canvas-container')
const labelContainer = document.getElementById('label-container')
const loadingScreen  = document.getElementById('loading-screen')
const loadingFill    = document.querySelector('.loading-fill')
const hudOrbit       = document.getElementById('hud-orbit')
const hudInterior    = document.getElementById('hud-interior')
const hudInspect     = document.getElementById('hud-inspect')

// ── SCENE SETUP ────────────────────────────────────────────
const scene    = new THREE.Scene()
scene.background = new THREE.Color('#0d0221')

let robotSceneRoot = null   // set after robot.glb loads

// ── PERSISTENT ROBOT ANIMATION STATE ──────────────────────
// Owned here, driven in the main animation loop.
// Passed into showWelcome so welcome.js doesn't create a second pair.
let robotRig  = null   // ClockworkRig  — built after robot.glb loads
let robotAnim = null   // ClockworkAnimations — same

const camera   = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
)
camera.position.set(...CAMERA.startPosition)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type    = THREE.PCFSoftShadowMap
renderer.toneMapping       = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.outputColorSpace  = THREE.SRGBColorSpace
container.appendChild(renderer.domElement)

// ── WINDOW RESIZE ──────────────────────────────────────────
// getComposer() is called lazily — returns null until vibes initialise,
// so this is safe to register before initVibes() runs.
window.addEventListener('resize', () => {
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  getComposer()?.setSize(w, h)
})

// ── GLTF LOADER ────────────────────────────────────────────
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/')

const loader = new GLTFLoader()
loader.setDRACOLoader(dracoLoader)

function loadGLB(path, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => resolve(gltf),
      (xhr) => onProgress && onProgress(xhr.loaded / xhr.total),
      (err) => reject(err)
    )
  })
}

function loadGLBOptional(path, onProgress) {
  return loadGLB(path, onProgress).catch(() => {
    console.warn(`[loader] Optional GLB not found, skipping: ${path}`)
    return null
  })
}

// ── LOADING PROGRESS ───────────────────────────────────────
let loadProgress = { wheel: 0, stand: 0, cabin: 0, robot: 0 }

function updateLoadBar() {
  const avg = (loadProgress.wheel + loadProgress.stand + loadProgress.cabin + loadProgress.robot) / 4
  loadingFill.style.width = `${avg * 100}%`
}

// ── ROBOT ANCHOR ───────────────────────────────────────────
const ROBOT_OFFSET = { x: 0, y: .07, z: -.05 }

function attachRobotToBooth(robotScene, boothScene) {
  boothScene.updateWorldMatrix(true, true)

  let anchor = null
  boothScene.traverse(obj => {
    if (obj.name === 'robot_anchor') anchor = obj
  })

  if (!anchor) {
    console.log('[robot] no robot_anchor empty found — parenting to booth root')
    anchor = boothScene
  } else {
    console.log('[robot] robot_anchor empty found ✓')
  }

  anchor.add(robotScene)
  robotScene.position.set(ROBOT_OFFSET.x, ROBOT_OFFSET.y, ROBOT_OFFSET.z)
  robotScene.rotation.set(0, -Math.PI / 2, 0)
  robotScene.scale.setScalar(1)

  const worldPos = new THREE.Vector3()
  anchor.getWorldPosition(worldPos)
}

// ── BOOTH CAMERA CONSTANTS ─────────────────────────────────
// Camera position when talking to Sir: booth XY + lifted, booth Z + offset in front.
// ⚙️  Tune BOOTH_CAMERA_Z_OFFSET if too close / too far.
const BOOTH_POS            = new THREE.Vector3(90, -95, 40)   // matches boothGLTF.scene.position
const BOOTH_CAMERA_Z_OFFSET = 350                              // ← tune this
const BOOTH_CAMERA_Y_LIFT   = 7                                // ← tune this
const BOOTH_CAMERA_POS     = new THREE.Vector3(
  BOOTH_POS.x,
  BOOTH_POS.y + BOOTH_CAMERA_Y_LIFT,
  BOOTH_POS.z + BOOTH_CAMERA_Z_OFFSET
)
const BOOTH_CAMERA_TARGET  = new THREE.Vector3(
  BOOTH_POS.x,
  BOOTH_POS.y + BOOTH_CAMERA_Y_LIFT * 0.4,
  BOOTH_POS.z
)
const BOOTH_CAMERA_DURATION = 1.4   // seconds

// ── SIR CHAT CAMERA CONSTANTS (runtime-computed, see init()) ──
const SIR_CHAT_CAMERA_DIST   = 15   // ← units along +X in front of robot face
const SIR_CHAT_CAMERA_Y_LIFT =  8   // ← units above robot world root

let _sirChatCamPos    = null   // computed after GLB loads
let _sirChatCamTarget = null

// ── SIR CHAT STATE ─────────────────────────────────────────
let sirChatOpen   = false
let sirChatInst   = null   // SirChat instance (mounted when active)
const sirMatcher  = new SirMatcher()

// ── ROBOT LOOK-AT (mousemove) ──────────────────────────────
// Only active when orbit mode (ferris wheel view or booth view).
let _lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const _lookRay     = new THREE.Raycaster()
const _lookMouse   = new THREE.Vector2()
const _lookHit     = new THREE.Vector3()

renderer.domElement.addEventListener('mousemove', (e) => {
  if (!robotAnim) return
  if (!sirChatOpen) return
  const rect = renderer.domElement.getBoundingClientRect()
  _lookMouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
  _lookMouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
  _lookRay.setFromCamera(_lookMouse, camera)
  if (_lookRay.ray.intersectPlane(_lookPlane, _lookHit)) {
    robotAnim.setLookTarget(_lookHit)
  }
})

// ── BOOTH CAMERA ANIMATION ─────────────────────────────────
function animateCameraToBoothFront(onComplete) {
  const fromPos    = camera.position.clone()
  const fromDir    = new THREE.Vector3()
  camera.getWorldDirection(fromDir)
  const fromTarget = fromDir.multiplyScalar(10).add(fromPos)

  const duration = BOOTH_CAMERA_DURATION
  let   elapsed  = 0
  let   last     = performance.now()

  function tick() {
    const now = performance.now()
    elapsed  += (now - last) / 1000
    last      = now
    const t   = Math.min(elapsed / duration, 1)
    const e   = t < 0.5 ? 2*t*t : -1+(4-2*t)*t

    camera.position.lerpVectors(fromPos, BOOTH_CAMERA_POS, e)
    const lookNow = new THREE.Vector3().lerpVectors(fromTarget, BOOTH_CAMERA_TARGET, e)
    camera.lookAt(lookNow)

    if (t < 1) requestAnimationFrame(tick)
    else onComplete?.()
  }
  requestAnimationFrame(tick)
}

function animateCameraFromBooth(toPos, toTarget, onComplete) {
  const fromPos    = camera.position.clone()
  const fromDir    = new THREE.Vector3()
  camera.getWorldDirection(fromDir)
  const fromTarget = fromDir.multiplyScalar(10).add(fromPos)

  const duration = BOOTH_CAMERA_DURATION
  let   elapsed  = 0
  let   last     = performance.now()

  function tick() {
    const now = performance.now()
    elapsed  += (now - last) / 1000
    last      = now
    const t   = Math.min(elapsed / duration, 1)
    const e   = t < 0.5 ? 2*t*t : -1+(4-2*t)*t

    camera.position.lerpVectors(fromPos, toPos, e)
    const lookNow = new THREE.Vector3().lerpVectors(fromTarget, toTarget, e)
    camera.lookAt(lookNow)

    if (t < 1) requestAnimationFrame(tick)
    else onComplete?.()
  }
  requestAnimationFrame(tick)
}
function animateCameraToSirChat(onComplete) {
  console.log('[SirChat] animateCameraToSirChat called — pos:', _sirChatCamPos, '| target:', _sirChatCamTarget)

  if (!_sirChatCamPos) {
    console.warn('[SirChat] World pos not ready — falling back to booth front')
    animateCameraToBoothFront(onComplete)
    return
  }
  const fromPos    = camera.position.clone()
  const fromDir    = new THREE.Vector3()
  camera.getWorldDirection(fromDir)
  const fromTarget = fromDir.multiplyScalar(10).add(fromPos)

  const duration = BOOTH_CAMERA_DURATION
  let elapsed = 0, last = performance.now()

  function tick() {
    const now = performance.now()
    elapsed  += (now - last) / 1000
    last      = now
    const t   = Math.min(elapsed / duration, 1)
    const e   = t < 0.5 ? 2*t*t : -1+(4-2*t)*t

    camera.position.lerpVectors(fromPos, _sirChatCamPos, e)
    const lookNow = new THREE.Vector3().lerpVectors(fromTarget, _sirChatCamTarget, e)
    camera.lookAt(lookNow)

    if (t < 1) requestAnimationFrame(tick)
    else onComplete?.()
  }
  requestAnimationFrame(tick)
}

function animateCameraFromSirChat(toPos, toTarget, onComplete) {
  // Identical shape to animateCameraFromBooth — kept separate so
  // future per-chat tweaks (different duration, easing) are isolated.
  animateCameraFromBooth(toPos, toTarget, onComplete)
}

// ── OPEN / CLOSE SIR CHAT ──────────────────────────────────
// Returns camera to last known orbit position
let _orbitCameraPos    = null
let _orbitCameraTarget = null

function openSirChat(cameraController) {
  if (sirChatOpen) return
  sirChatOpen = true

  _orbitCameraPos    = camera.position.clone()
  _orbitCameraTarget = cameraController.controls.target.clone()  // ← save real target

  cameraController.controls.target.copy(_sirChatCamTarget)       // ← set before disable
  cameraController.controls.enabled = false

  robotAnim.expression_greeting()
  animateCameraToSirChat(() => {
    sirChatInst = new SirChat({ matcher: sirMatcher, anim: robotAnim })
    sirChatInst.mount()
    window.addEventListener('keydown', onChatEscape)
  })
}

function closeSirChat(cameraController) {
  if (!sirChatOpen) return
  sirChatOpen = false

  console.log('[SirChat] Closing')
  window.removeEventListener('keydown', onChatEscape)

  // Dramatic farewell
  robotAnim.expression_dramatic({
    onComplete: () => {
      sirChatInst?.unmount()
      sirChatInst = null

      // Return camera to where it was
      const toPos    = _orbitCameraPos    ?? new THREE.Vector3(...CAMERA.startPosition)
      const toTarget = _orbitCameraTarget ?? new THREE.Vector3(0.47, 0.07, 0)

      animateCameraFromSirChat(toPos, toTarget, () => {
        cameraController.controls.target.copy(_orbitCameraTarget)      // ← restore
        cameraController.controls.enabled = true
        console.log('[SirChat] Camera returned to orbit')
      })
    }
  })
  // Fallback in case dramatic expression stalls
  setTimeout(() => {
    if (!sirChatOpen && sirChatInst) {
      sirChatInst?.unmount()
      sirChatInst = null
    }
  }, 1200)
}

function onChatEscape(e) {
  // Will be called with the cameraController in scope via closure — see init()
}

// ═══════════════════════════════════════════════════════════
// MAIN INIT
// ═══════════════════════════════════════════════════════════
async function init() {
  try {
    // ── PERFORMANCE BENCHMARK ────────────────────────────────
    // Warm up the WebGL context with a single blank frame so rAF timing
    // reflects real GPU scheduling, then run the 30-frame benchmark
    // concurrently with GLB loading (GLBs take far longer than 30 rAFs).
    renderer.render(scene, camera)
    const perfTierPromise = detectPerformanceTier()

    const [wheelGLTF, standGLTF, cabinGLTF, robotGLTF] = await Promise.all([
      loadGLB('models/wheel-rails.glb', p => { loadProgress.wheel = p; updateLoadBar() }),
      loadGLB('models/wheel-stand.glb', p => { loadProgress.stand = p; updateLoadBar() }),
      loadGLB('models/cabin.glb',       p => { loadProgress.cabin = p; updateLoadBar() }),
      loadGLB('models/robot.glb',       p => { loadProgress.robot = p; updateLoadBar() }),
    ])

    const boothGLTF = await loadGLBOptional('models/booth.glb')

    // Benchmark is definitely done by now — resolve to lock in the tier
    // before initVibes() reads it.
    await perfTierPromise

    // ── PERSISTENT RIG + ANIMATIONS ──────────────────────────
    // Created once here, driven in the main render loop.
    // Passed into showWelcome so it reuses rather than duplicates.
    robotSceneRoot = robotGLTF.scene
    robotRig       = new ClockworkRig(robotSceneRoot)
    robotAnim      = new ClockworkAnimations(robotRig)

    // Start idles immediately so he's alive from first frame
    robotAnim.idle_blink()
    robotAnim.idle_clock()
    robotAnim.idle_wait()
    console.log('[Robot] Rig + animations initialised ✓')

    // ── BOOTH + ROBOT ─────────────────────────────────────────
    if (boothGLTF) {
      applyMaterials(boothGLTF.scene)
      scene.add(boothGLTF.scene)
      boothGLTF.scene.position.set(75, -95, 40)
      boothGLTF.scene.scale.setScalar(100)
      attachRobotToBooth(robotSceneRoot, boothGLTF.scene)
    } else {
      console.log('[booth] booth.glb not found — robot added to scene root')
      scene.add(robotSceneRoot)
    }
    // ── COMPUTE SIR CHAT CAMERA FROM ROBOT WORLD POS ─────────
    // Must happen after parenting so world matrix is correct.
    {
      robotSceneRoot.updateWorldMatrix(true, true) 
      const rwp = new THREE.Vector3()
      robotSceneRoot.getWorldPosition(rwp)

      _sirChatCamPos    = new THREE.Vector3(
        rwp.x,
        rwp.y + SIR_CHAT_CAMERA_Y_LIFT,
        rwp.z+SIR_CHAT_CAMERA_DIST,
      )
      _sirChatCamTarget = new THREE.Vector3(
        rwp.x,
        rwp.y + SIR_CHAT_CAMERA_Y_LIFT * 0.4,
        rwp.z,
      )
      // Robot faces +X — look-at plane is the YZ plane at his face X
      _lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -rwp.z)
    }
    // ── APPLY SCALE ──────────────────────────────────────────
    wheelGLTF.scene.scale.setScalar(20 * MODEL_SCALE)
    standGLTF.scene.scale.setScalar(20 * MODEL_SCALE)
    cabinGLTF.scene.scale.setScalar(0.8)

    // ── APPLY MATERIALS ──────────────────────────────────────
    applyMaterials(wheelGLTF.scene)
    applyMaterials(standGLTF.scene)
    applyMaterials(cabinGLTF.scene)

    // ── BLOOM ─────────────────────────────────────────────────
    enableBloom(wheelGLTF.scene)
    enableBloom(cabinGLTF.scene)

    // ── LIGHTING ─────────────────────────────────────────────
    // Capture refs — passed into initVibes so it can animate lights on
    // vibe transitions (flicker, colour shifts, intensity changes).
    const {
      ambient:  ambientLight,
      moon:     moonLight,
      warmFill: warmFillLight,
    } = setupLighting(scene)

    // ── POST PROCESSING ──────────────────────────────────────
    // Keep postRender as a guaranteed fallback.
    // If vibes.js initialises its own composer, getComposer() will return
    // it and postRender is never called.  If vibes.js errors or the perf
    // tier is too low to build a composer, postRender keeps the scene
    // looking correct (bloom, tone-mapping, etc.) exactly as it did before
    // vibes.js was added.
    const { render: postRender, bloomPass: ppBloomPass, mixPass: ppMixPass } = setupPostProcessing({ renderer, scene, camera })

    // ── BUILD FERRIS WHEEL ───────────────────────────────────
    const ferrisWheel = new FerrisWheel({
      wheelScene:    wheelGLTF.scene,
      standScene:    standGLTF.scene,
      cabinTemplate: cabinGLTF.scene,
      scene,
    })

    // ── ATTACH POINT LIGHTS ──────────────────────────────────
    // Capture the array — vibes.js animates each light individually
    // during the spoke-flicker step of a vibe transition.
    const attachLights = addAttachPointLights(scene, ferrisWheel.attachPoints.slice(0, 12))

    // ── LABELS ───────────────────────────────────────────────
    const labelSystem = new LabelSystem({ scene, camera, container: labelContainer })

    ferrisWheel.cabins.forEach((cabin, i) => {
      labelSystem.createLabel(cabin.config, cabin.pivot, () => {
        handleCabinSelect(i)
      })
    })

    // ── FOG ──────────────────────────────────────────────────
    const fogSystem = new FogSystem({ scene })
    // fogSystem already satisfies the { setColor, setOpacity } interface
    // that vibes.js expects — the methods were added in fog.js.

    // ── VIBES ─────────────────────────────────────────────────
    // initVibes must come after lighting, fogSystem, and ferrisWheel are
    // all ready — it stores refs and sets up the EffectComposer.
    // Isolated try/catch so a vibes error never kills the whole scene.
    try {
      initVibes({
        scene,
        camera,
        renderer,
        // One Group per cabin — vibes.js traverses them for gondola blink
        cabinGroups:       ferrisWheel.cabins.map(c => c.cabinClone),
        wheelScene:        wheelGLTF.scene,
        standScene:        standGLTF.scene,
        boothScene:        boothGLTF?.scene ?? null,
        robotScene:        robotSceneRoot,
        // Lights captured from setupLighting above
        ambientLight,
        moonLight,
        warmFillLight,
        // Spoke lights captured from addAttachPointLights above
        attachLights,
        // FogSystem now exposes setColor / setOpacity
        fogParticleSystem: fogSystem,

        bloomPass: ppBloomPass,
        mixPass:   ppMixPass,
      })

      // Apply opening theme immediately, no transition animation
      applyVibe(INITIAL_VIBE)
      labelSystem.setVibe(INITIAL_VIBE)
      console.log('[vibes] ✓ Initialized — suave applied. Composer:', getComposer() ? 'vibes' : 'postRender fallback')

      // ── PORTFOLIO SHEET ──────────────────────────────────
      // initPortfolioSheet must come after initVibes so getActiveVibe()
      // and VIBES are fully populated before the sheet can open.
      initPortfolioSheet({ CABINS, getActiveVibe })

      // ── SKILLS GALLERY ───────────────────────────────────
      // Reads CABINS[].items[].skills arrays + the SKILLS registry
      // from config.js. Safe to call even before skills arrays are
      // added — gallery will warn + no-op until they exist.
      initSkillsGallery({ CABINS, SKILLS, getActiveVibe })
    } catch (vibesErr) {
      console.error('[vibes] ✗ initVibes or applyVibe threw — falling back to postRender for rendering:', vibesErr)
      // Scene is still fully lit and functional; postRender handles bloom.
    }

    // ── CAMERA CONTROLLER ────────────────────────────────────
    const cameraController = new CameraController({
      camera,
      renderer,
      domElement: renderer.domElement,
    })
    cameraController.controls.target.set(0.47, 0.07, 0)
    camera.position.set(0.47, 100.07, 200)

    // ── AUTO EXPLORE ─────────────────────────────────────────
    const autoExplore = new AutoExplore({ camera, cameraController })

    // ── BUTTONS ──────────────────────────────────────────────
    // Signature changed: options object that includes scene/camera/renderer
    // /domElement plus all action callbacks. buttons.js forwards the
    // callbacks to buttonFunctions.js via initButtonCallbacks().
    const buttons = initButtons({
      scene,
      camera,
      renderer,
      domElement:     renderer.domElement,
      onRobotNav:     () => openSirChat(cameraController),
      onSkillsOpen:   openSkillsGallery,
      onEmissionChange: (v) => setEmissionScale(v),
      onPortfolioOpen: openPortfolioSheet,
      onVibeChange: (name) => labelSystem.setVibe(name),
    })
    scene.add(camera)
    scene.remove(buttons.buttonGroup)
    camera.add(buttons.buttonGroup)
    buttons.buttonGroup.position.set(-1, -0.85, -2.5)
    buttons.buttonGroup.scale.setScalar(0.10)

    // ── INSPECT SYSTEM ───────────────────────────────────────
    const inspectSystem = new InspectSystem({ camera, scene })
    autoExplore.setInspectSystem(inspectSystem)

    // ── ROBOT CLICK HANDLER ──────────────────────────────────
    // Collect robot meshes lazily (after GLB loaded)
    function getRobotMeshes() {
      const meshes = []
      if (robotSceneRoot) {
        robotSceneRoot.traverse(obj => { if (obj.isMesh) meshes.push(obj) })
      }
      return meshes
    }

    // ── RAYCASTER (cabin + robot click) ─────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2()

    renderer.domElement.addEventListener('click', (e) => {
      // Don't handle clicks while inside a cabin
      if (cameraController.mode !== CameraMode.ORBIT) return

      mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      // ── Check robot first ─────────────────────────────────
      if (!sirChatOpen) {
        const robotHits = raycaster.intersectObjects(getRobotMeshes(), true)
        if (robotHits.length > 0) {
          console.log('[Robot] Clicked — opening SirChat')
          openSirChat(cameraController)
          return
        }
      }

      // ── Check cabins ──────────────────────────────────────
      const cabinMeshes = ferrisWheel.getCabinMeshes()
      const hits        = raycaster.intersectObjects(cabinMeshes, true)

      if (hits.length > 0) {
        const hitObj = hits[0].object
        ferrisWheel.cabins.forEach((cabin, i) => {
          if (cabin.cabinClone.getObjectById(hitObj.id)) {
            handleCabinSelect(i)
          }
        })
      }
    })

    // Wire up ESC to close chat — needs cameraController in scope
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sirChatOpen) {
        closeSirChat(cameraController)
      }
    })

    // ── DEV MODE ─────────────────────────────────────────────
    const devMode = new DevMode({ scene, camera, inspectSystem })

    // ── HIDE LOADING SCREEN + LAUNCH WELCOME ─────────────────
    loadingFill.style.width = '100%'
    setTimeout(() => {
      loadingScreen.classList.add('hidden')

      setTimeout(() => {
        if (cameraController) cameraController.controls.enabled = false

        showWelcome({
          name:         'Sarah',
          mainCamera:   camera,
          mainRenderer: renderer,
          robotScene:   robotSceneRoot,
          rig:          robotRig,    // ← pass persistent rig
          anim:         robotAnim,   // ← pass persistent anim
          onPortfolioOpen: openPortfolioSheet,
          onDismiss: () => {
            // Camera has returned to ferris wheel overview.
            if (cameraController) cameraController.controls.enabled = true
            // Anim is already running idles (started in greeting onComplete)
            console.log('[Welcome] Dismissed — orbit controls re-enabled')
          }
        })
      }, 400)

    }, 500)

    // ── CABIN SELECT FLOW ─────────────────────────────────────
    let selectedCabinIndex = null
    let savedSpeed = ferrisWheel.spinSpeed

    async function handleCabinSelect(index) {
      if (cameraController.mode !== CameraMode.ORBIT) return
      if (sirChatOpen) return   // don't enter cabin while chatting

      selectedCabinIndex = index
      labelSystem.setVisible(false)

      await ferrisWheel.selectCabin(index)

      ferrisWheel.openDoor(index)
      await delay(1600)

      const cabin = ferrisWheel.cabins[index]
      cameraController.transitToCabin(cabin, () => {
        setAuroraActive(false)
        hudOrbit.classList.add('hud--hidden')
        hudInterior.classList.remove('hud--hidden')
        autoExplore.onCabinEnter()   // start beat delay + intro pan
        ferrisWheel.closeDoor(index)
      })
      inspectSystem.spawnItems(cabin)
      ferrisWheel.spinSpeed = 0

      const keyListener = () => {
        // Don't hide the HUD or deregister while auto-explore is running —
        // let autoExplore handle those keypresses first.
        if (autoExplore.isConsumingInput()) return
        if (cameraController.keysEverPressed) {
          hudInterior.classList.add('hud--hidden')
          window.removeEventListener('keydown', keyListener)
        }
      }
      window.addEventListener('keydown', keyListener)
    }

    // ── EXIT CABIN FLOW ───────────────────────────────────────
    cameraController.onExitCabin(() => {
      autoExplore.onCabinExit()
      inspectSystem.clearItems()
      const exitingIndex = selectedCabinIndex   // capture before it gets nulled
      if (exitingIndex !== null) {
        ferrisWheel.openDoor(exitingIndex)      // ← reopen so camera exits through it
      }
      if (selectedCabinIndex !== null) {
        ferrisWheel.closeDoor(selectedCabinIndex)
      }

      hudInterior.classList.add('hud--hidden')
      hudInspect.classList.add('hud--hidden')

      cameraController.transitOutOfCabin(
        new THREE.Vector3(...CAMERA.exitPosition),
        () => {
          setAuroraActive(true)
          hudOrbit.classList.remove('hud--hidden')
          labelSystem.setVisible(true)
          if (exitingIndex !== null) ferrisWheel.closeDoor(exitingIndex)  // ← close after exit
          selectedCabinIndex = null
        }
      )
      ferrisWheel.spinSpeed = savedSpeed
    })

    // ── ANIMATION LOOP ────────────────────────────────────────
    const clock = new THREE.Clock()

    renderer.setAnimationLoop(() => {
      const delta = Math.min(clock.getDelta(), 0.05)

      ferrisWheel.update(delta)
      autoExplore.update(delta)    // must run BEFORE cameraController so AE values are ready
      cameraController.update(delta)
      fogSystem.update(delta)
      inspectSystem.update(delta)
      labelSystem.update()
      buttons.update()
      devMode.update()

      // Drive robot animations every frame
      // This is the ONLY place anim.update() is called.
      // welcome.js skips it when we pass rig/anim externally.
      if (robotAnim) robotAnim.update(delta)

      // Vibes per-frame tick — rain particles + scanline time uniform
      updateVibes(delta)

      // Render — vibes composer if available (adds vibe-specific post fx),
      // otherwise postRender (setupPostProcessing's bloom composer).
      // Raw renderer.render() is never used: one of the two composers
      // always runs, so the scene looks correct in all cases.
      postRender()
    })

  } catch (err) {
    console.error('[main] Failed to initialize:', err)
    document.querySelector('.loading-text').textContent = 'Failed to load. Check console.'
  }
}

// ── HELPERS ───────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── START ─────────────────────────────────────────────────
init()