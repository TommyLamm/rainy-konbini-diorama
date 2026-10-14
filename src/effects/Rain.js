import * as THREE from 'three';
import { BASE, LAYERS, RAIN } from '../config/SceneConfig.js';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { Random } from '../utils/Random.js';

const MAX_GLINTS = 6;

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute float aTravel;
  attribute float aSpeed;
  attribute float aPhase;
  uniform float uTime;
  uniform vec3 uDirection;
  uniform float uLength;
  uniform float uWidth;
  uniform float uPixelWorld;
  uniform vec4 uGlintPositions[${MAX_GLINTS}];
  uniform vec3 uGlintColors[${MAX_GLINTS}];
  varying float vAlpha;
  varying float vAcross;
  varying vec3 vColor;

  void main() {
    float progress = fract(uTime * aSpeed / aTravel + aPhase);
    float travelled = progress * aTravel;
    vec3 head = aStart + uDirection * travelled;
    float streak = min(uLength, travelled);
    vec3 point = head - uDirection * (streak * position.y);

    vec3 toCamera = cameraPosition - point;
    float distanceToCamera = length(toCamera);
    vec3 side = normalize(cross(uDirection, toCamera / distanceToCamera));
    // Keep streaks at least ~1px wide; fade them to conserve their visual weight.
    float width = max(uWidth, uPixelWorld * distanceToCamera * 1.1);
    point += side * position.x * width;

    vec3 glint = vec3(0.0);
    for (int i = 0; i < ${MAX_GLINTS}; i++) {
      float falloff = 1.0 - smoothstep(0.0, uGlintPositions[i].w, distance(point, uGlintPositions[i].xyz));
      glint += uGlintColors[i] * falloff * falloff;
    }
    vColor = vec3(0.3, 0.36, 0.5) + glint * 1.5;
    vAlpha = (1.0 - position.y) * smoothstep(0.0, 0.06, progress) * mix(0.45, 1.0, uWidth / width);
    vAcross = position.x * 2.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(point, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uIntensity;
  varying float vAlpha;
  varying float vAcross;
  varying vec3 vColor;
  void main() {
    float core = 1.0 - abs(vAcross);
    gl_FragColor = vec4(vColor * vAlpha * core * uIntensity, 1.0);
  }
`;

/**
 * Instanced rain streaks animated entirely on the GPU. Each drop's path is
 * raycast once against the colliders so rain stops on roofs and canopies.
 */
export class Rain {
  /**
   * @param {THREE.Object3D} parent
   * @param {THREE.Box3[]} colliders
   * @param {{positions: THREE.Vector4[], colors: THREE.Color[]}} glints
   */
  constructor(parent, colliders, glints) {
    this.direction = new THREE.Vector3(RAIN.WIND.x, -1, RAIN.WIND.z).normalize();
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: SHARED_UNIFORMS.uTime,
        uDirection: { value: this.direction },
        uLength: { value: RAIN.STREAK_LENGTH },
        uWidth: { value: RAIN.WIDTH },
        uPixelWorld: { value: 0.001 },
        uIntensity: { value: 0.36 },
        uGlintPositions: { value: Rain.#PadArray(glints.positions, () => new THREE.Vector4(0, -100, 0, 0.001)) },
        uGlintColors: { value: Rain.#PadArray(glints.colors, () => new THREE.Color(0, 0, 0)) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.#CreateGeometry(colliders), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(LAYERS.FX);
    this.mesh.renderOrder = 10;
    parent.add(this.mesh);
  }

  /**
   * Updates the world size of one pixel at unit distance (for minimum streak width).
   * @param {number} viewportHeightPixels
   * @param {number} fovDegrees
   */
  SetViewport(viewportHeightPixels, fovDegrees) {
    this.material.uniforms.uPixelWorld.value = (2 * Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2)) / viewportHeightPixels;
  }

  #CreateGeometry(colliders) {
    const random = new Random(909);
    const quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, -0.5, 1, 0, 0.5, 1, 0]), 3));
    quad.setIndex([0, 2, 1, 2, 3, 1]);

    const starts = new Float32Array(RAIN.COUNT * 3);
    const travels = new Float32Array(RAIN.COUNT);
    const speeds = new Float32Array(RAIN.COUNT);
    const phases = new Float32Array(RAIN.COUNT);
    const ray = new THREE.Ray(new THREE.Vector3(), this.direction);
    const hit = new THREE.Vector3();
    const fallHeight = RAIN.TOP_Y;
    for (let i = 0; i < RAIN.COUNT; i++) {
      // Pick the landing column first so slanted drops never leave the base.
      const landX = random.Range(-BASE.HALF + 0.05, BASE.HALF - 0.05);
      const landZ = random.Range(-BASE.HALF + 0.05, BASE.HALF - 0.05);
      const top = fallHeight + random.Range(0, 1.5);
      ray.origin.set(landX - this.direction.x * (top / -this.direction.y), top, landZ - this.direction.z * (top / -this.direction.y));
      let travel = top / -this.direction.y;
      for (const box of colliders) {
        if (ray.intersectBox(box, hit)) travel = Math.min(travel, hit.distanceTo(ray.origin));
      }
      starts.set([ray.origin.x, ray.origin.y, ray.origin.z], i * 3);
      travels[i] = Math.max(travel, 0.05);
      speeds[i] = random.Range(RAIN.SPEED_MIN, RAIN.SPEED_MAX);
      phases[i] = random.Next();
    }
    quad.setAttribute('aStart', new THREE.InstancedBufferAttribute(starts, 3));
    quad.setAttribute('aTravel', new THREE.InstancedBufferAttribute(travels, 1));
    quad.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));
    quad.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    quad.instanceCount = RAIN.COUNT;
    return quad;
  }

  static #PadArray(items, factory) {
    const padded = items.slice(0, MAX_GLINTS);
    while (padded.length < MAX_GLINTS) padded.push(factory());
    return padded;
  }
}
