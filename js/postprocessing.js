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

// Bloom layer — only objects on this layer get bloom
export const BLOOM_LAYER = 1
export const bloomLayer  = new THREE.Layers()
bloomLayer.set(BLOOM_LAYER)

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
  finalComposer.addPass(new OutputPass())

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
    scene.traverse(darkenNonBloomed)
    bloomComposer.render()
    scene.traverse(restoreMaterials)
    finalComposer.render()
  }

  // ── RESIZE ────────────────────────────────────────────────
  function onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    bloomComposer.setSize(w, h)
    finalComposer.setSize(w, h)
  }

  window.addEventListener('resize', onResize)

return { render, bloomComposer, finalComposer, bloomLayer, bloomPass, mixPass }
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
