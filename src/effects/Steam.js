import * as THREE from 'three';
import { LAYERS } from '../config/SceneConfig.js';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';

const PUFFS_PER_SOURCE = 18;

const VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aSeed;
  uniform float uTime;
  uniform float uScale;
  varying float vAlpha;
  void main() {
    float life = fract(uTime * 0.32 + aPhase);
    vec3 drift = vec3(sin(life * 3.0 + aSeed * 6.0) * 0.06, life * 0.6, cos(life * 2.2 + aSeed * 5.0) * 0.05) * life;
    vec4 mvPosition = modelViewMatrix * vec4(position + drift, 1.0);
    gl_PointSize = (0.05 + life * 0.2) * uScale / -mvPosition.z;
    vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - life);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.95), smoothstep(0.5, 0.0, d) * vAlpha * 0.32);
  }
`;

/** Soft rising steam puffs (oden pot, coffee machine). */
export class Steam {
  /**
   * @param {THREE.Object3D} parent
   * @param {THREE.Vector3[]} origins
   */
  constructor(parent, origins) {
    const count = origins.length * PUFFS_PER_SOURCE;
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const seeds = new Float32Array(count);
    origins.forEach((origin, sourceIndex) => {
      for (let i = 0; i < PUFFS_PER_SOURCE; i++) {
        const index = sourceIndex * PUFFS_PER_SOURCE + i;
        positions.set([origin.x + (Math.random() - 0.5) * 0.12, origin.y, origin.z + (Math.random() - 0.5) * 0.1], index * 3);
        phases[index] = i / PUFFS_PER_SOURCE;
        seeds[index] = Math.random();
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uTime: SHARED_UNIFORMS.uTime, uScale: { value: 800 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, this.material);
    points.frustumCulled = false;
    points.layers.set(LAYERS.FX);
    points.renderOrder = 3;
    parent.add(points);
  }

  /** Converts world-space puff size to pixels for the current viewport. */
  SetViewport(viewportHeightPixels, fovDegrees) {
    this.material.uniforms.uScale.value = viewportHeightPixels / (2 * Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2));
  }
}
