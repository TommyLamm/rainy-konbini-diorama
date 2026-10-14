import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { ToonOutlinePass } from './ToonOutlinePass.js';
import { FinishShader } from './FinishShader.js';

const BLOOM = Object.freeze({ STRENGTH: 0.5, RADIUS: 0.5, THRESHOLD: 1.0 });

/**
 * Pass chain: beauty -> ink outlines -> bloom (HDR) -> tone map / sRGB ->
 * vignette + dither -> FXAA (needs display-referred input, so it goes last).
 */
export class PostFxPipeline {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);

    this.outlinePass = new ToonOutlinePass(scene, camera);
    this.bloomPass = new UnrealBloomPass(size, BLOOM.STRENGTH, BLOOM.RADIUS, BLOOM.THRESHOLD);
    this.finishPass = new ShaderPass(FinishShader);

    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.finishPass);
    this.composer.addPass(new FXAAPass());
  }

  /**
   * @param {number} width - CSS pixels.
   * @param {number} height - CSS pixels.
   * @param {number} pixelRatio
   */
  SetSize(width, height, pixelRatio) {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.outlinePass.SetThickness(Math.max(1, pixelRatio * 0.8));
    this.finishPass.uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  /** @param {number} elapsed @param {number} delta */
  Render(elapsed, delta) {
    this.finishPass.uniforms.time.value = elapsed;
    this.composer.render(delta);
  }
}
