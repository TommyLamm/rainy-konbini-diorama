import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { LAYERS } from '../config/SceneConfig.js';

const DETAIL_LINE_WEIGHT = 0.3;

/**
 * Edge detection on a normal + depth pre-pass. Depth edges use the Laplacian of
 * 1/viewZ, which is exactly zero on planar surfaces at any viewing angle, so
 * grazing floors never get false lines; normal edges catch creases.
 */
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 100 },
    thickness: { value: 1 },
    depthThreshold: { value: 0.012 },
    normalThreshold: { value: 0.3 },
    lineDarken: { value: 0.22 },
    lineTint: { value: new THREE.Color(0.012, 0.014, 0.035) },
    lineStrength: { value: 0.92 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float thickness;
    uniform float depthThreshold;
    uniform float normalThreshold;
    uniform float lineDarken;
    uniform vec3 lineTint;
    uniform float lineStrength;
    varying vec2 vUv;

    float InverseViewZ(vec2 uv) {
      float viewZ = perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
      return 1.0 / max(-viewZ, 1e-4);
    }

    vec3 NormalAt(vec2 uv) {
      return texture2D(tNormal, uv).xyz * 2.0 - 1.0;
    }

    void main() {
      vec2 texel = thickness / resolution;
      vec2 offsets[4] = vec2[4](vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0));
      float center = InverseViewZ(vUv);
      vec3 centerNormal = NormalAt(vUv);
      float laplacian = -4.0 * center;
      float normalDelta = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 sampleUv = vUv + offsets[i] * texel;
        laplacian += InverseViewZ(sampleUv);
        normalDelta = max(normalDelta, 1.0 - dot(centerNormal, NormalAt(sampleUv)));
      }
      float depthEdge = smoothstep(depthThreshold, depthThreshold * 2.5, abs(laplacian) / center);
      float normalEdge = smoothstep(normalThreshold, normalThreshold + 0.2, normalDelta);
      // Alpha of the pre-pass carries a per-layer line weight (faint for small details).
      float weight = texture2D(tNormal, vUv).a;
      for (int i = 0; i < 4; i++) weight = min(weight, texture2D(tNormal, vUv + offsets[i] * texel).a);
      float edge = max(depthEdge, normalEdge) * lineStrength * weight;

      vec4 color = texture2D(tDiffuse, vUv);
      vec3 inked = color.rgb * lineDarken + lineTint;
      gl_FragColor = vec4(mix(color.rgb, inked, edge), color.a);
    }`,
};

export class ToonOutlinePass extends Pass {
  #savedClearColor = new THREE.Color();

  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    // NoBlending disables the OPAQUE define, so `opacity` lands in alpha as the line weight.
    this.normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, blending: THREE.NoBlending });
    this.detailNormalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, blending: THREE.NoBlending, opacity: DETAIL_LINE_WEIGHT });
    this.normalTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(1, 1),
    });
    this.uniforms = THREE.UniformsUtils.clone(OutlineShader.uniforms);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: OutlineShader.vertexShader,
      fragmentShader: OutlineShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  /** Line width in drawing-buffer pixels (scale with devicePixelRatio). */
  SetThickness(pixels) {
    this.uniforms.thickness.value = pixels;
  }

  setSize(width, height) {
    this.normalTarget.setSize(width, height);
    this.uniforms.resolution.value.set(width, height);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.#RenderNormalPrepass(renderer);
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.tNormal.value = this.normalTarget.texture;
    this.uniforms.tDepth.value = this.normalTarget.depthTexture;
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  /** Renders view-space normals + depth of SOLID, then DETAIL geometry (lighter weight). */
  #RenderNormalPrepass(renderer) {
    const { scene, camera } = this;
    const savedMask = camera.layers.mask;
    const savedBackground = scene.background;
    const savedOverride = scene.overrideMaterial;
    const savedAutoClear = renderer.autoClear;
    const savedAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.#savedClearColor);

    scene.background = null;
    renderer.autoClear = false;
    renderer.setRenderTarget(this.normalTarget);
    renderer.setClearColor(0x7f7fff, 1);
    renderer.clear(true, true, false);

    camera.layers.set(LAYERS.SOLID);
    scene.overrideMaterial = this.normalMaterial;
    renderer.render(scene, camera);
    camera.layers.set(LAYERS.DETAIL);
    scene.overrideMaterial = this.detailNormalMaterial;
    renderer.render(scene, camera);

    camera.layers.mask = savedMask;
    scene.background = savedBackground;
    scene.overrideMaterial = savedOverride;
    renderer.autoClear = savedAutoClear;
    renderer.setClearColor(this.#savedClearColor, savedAlpha);
  }

  dispose() {
    this.normalTarget.dispose();
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
