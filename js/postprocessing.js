// ═══════════════════════════════════════════════════════════
// postprocessing.js — EffectComposer pipeline
//   Passes: RenderPass → UnrealBloom → OutputPass
//   Selective bloom: only emissive materials glow
// ═══════════════════════════════════════════════════════════

import * as THREE from 'three'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js'
import { OutlinePass }     from 'three/addons/postprocessing/OutlinePass.js'

// Bloom layer — only objects on this layer get bloom
export const BLOOM_LAYER = 1
export const bloomLayer  = new THREE.Layers()
bloomLayer.set(BLOOM_LAYER)

// ── Scanline / CRT shader (Midnight Arcade) ──────────────────
// Moved here from vibes.js so it lives on the composer that actually
// renders. Scrolling scanlines + soft vignette + subtle RGB fringe.
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
      float line = sin(vUv.y * 600.0 - time * 3.0) * 0.035;
      col.rgb    = max(vec3(0.0), col.rgb - line);
      float d    = distance(vUv, vec2(0.5));
      col.rgb   *= 1.0 - d * 0.45;
      col.r      = texture2D(tDiffuse, vUv + vec2(0.0015, 0.0)).r;
      col.b      = texture2D(tDiffuse, vUv - vec2(0.0015, 0.0)).b;
      gl_FragColor = col;
    }
  `,
}

export function setupPostProcessing({ renderer, scene, camera }) {
  const w = window.innerWidth
  const h = window.innerHeight

  // ── BLOOM COMPOSER (renders only bloomed objects) ─────────
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    0.8,   // strength
    0.4,   // radius
    0.2    // threshold — low so emissive materials bloom easily
  )

  const bloomRenderTarget = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType
  })

  const bloomComposer = new EffectComposer(renderer, bloomRenderTarget)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new RenderPass(scene, camera))
  bloomComposer.addPass(bloomPass)

  // ── FINAL COMPOSER (mix bloom + base) ────────────────────
  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture:  { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
        bloomStrength:{ value: 0.8 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        uniform float bloomStrength;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(baseTexture, vUv)
            + texture2D(bloomTexture, vUv) * bloomStrength;
        }
      `,
      defines: {}
    }),
    'baseTexture'
  )
  mixPass.needsSwap = true

  const finalRenderTarget = new THREE.WebGLRenderTarget(w, h, {
    type:    THREE.HalfFloatType,
    samples: 4  // MSAA
  })

  const finalComposer = new EffectComposer(renderer, finalRenderTarget)
  finalComposer.addPass(new RenderPass(scene, camera))
  finalComposer.addPass(mixPass)

  // ── VIBE FX PASSES (off by default; vibes.js enables per theme) ──
  // Outline (Blueprint / Pop-Art). Before OutputPass so the edge lines
  // are tone-mapped with the rest of the frame.
  const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera)
  outlinePass.edgeStrength  = 3.5
  outlinePass.edgeThickness = 1.5
  outlinePass.visibleEdgeColor.set('#4488ff')
  outlinePass.hiddenEdgeColor.set('#224488')
  outlinePass.enabled = false
  finalComposer.addPass(outlinePass)

  finalComposer.addPass(new OutputPass())

  // Scanline / CRT (Midnight Arcade). After OutputPass so the CRT look
  // sits in display space. EffectComposer auto-renders the last ENABLED
  // pass to screen, so toggling this on/off needs no loop changes.
  const scanPass = new ShaderPass(ScanlineShader)
  scanPass.enabled = false
  finalComposer.addPass(scanPass)

  // ── DARK MATERIAL for non-bloomed objects ─────────────────
  const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' })
  const materialStore = {}

  function darkenNonBloomed(obj) {
    if (obj.isMesh && !bloomLayer.test(obj.layers)) {
      materialStore[obj.uuid] = obj.material
      obj.material = darkMaterial
    }
  }

  function restoreMaterials(obj) {
    if (materialStore[obj.uuid]) {
      obj.material = materialStore[obj.uuid]
      delete materialStore[obj.uuid]
    }
  }

  // ── RENDER FUNCTION ───────────────────────────────────────
  function render() {
    // Swap non-bloomed objects to black for the bloom pass, then ALWAYS
    // swap them back — even if the bloom render throws. If this restore is
    // ever skipped, the stored "original" material becomes the black one on
    // the next frame and the object is stuck invisible forever.
    scene.traverse(darkenNonBloomed)
    try {
      bloomComposer.render()
    } finally {
      scene.traverse(restoreMaterials)
    }
    // Guard the final pass too — an OutlinePass/ShaderPass error must not
    // kill the animation loop or leave scene state half-applied.
    try {
      finalComposer.render()
    } catch (err) {
      console.error('[postprocessing] finalComposer.render() threw:', err)
    }
  }

  // ── RESIZE ────────────────────────────────────────────────
  function onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    bloomComposer.setSize(w, h)
    finalComposer.setSize(w, h)
  }

  window.addEventListener('resize', onResize)

return { render, bloomComposer, finalComposer, bloomLayer, bloomPass, mixPass, outlinePass, scanPass }
}

// ── ENABLE BLOOM ON A MESH ────────────────────────────────
// Call this on emissive meshes after materials are applied
export function enableBloom(object3D) {
  object3D.traverse((child) => {
    if (child.isMesh && child.material && child.material.emissiveIntensity > 0) {
      child.layers.enable(BLOOM_LAYER)
    }
  })
}
