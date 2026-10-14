import * as THREE from 'three';
import { LAYERS } from '../config/SceneConfig.js';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { Random } from '../utils/Random.js';

const GRAVITY = 9.8;
const DROP_SIZE = 0.026;
const RING = Object.freeze({ DURATION: 0.55, SIZE: 0.2 });

const TIMING = /* glsl */ `
  attribute vec3 aOrigin;
  attribute float aGround;
  attribute float aPeriod;
  attribute float aHang;
  attribute float aPhase;
  uniform float uTime;
  float CycleTime() { return mod(uTime + aPhase * aPeriod, aPeriod); }
`;

const DROP_VERTEX = /* glsl */ `
  ${TIMING}
  uniform float uSize;
  uniform float uGravity;
  varying float vShade;
  void main() {
    float t = CycleTime();
    float scale = 1.0;
    float stretch = 1.0;
    vec3 offset = vec3(0.0);
    if (t < aHang) {
      float grow = t / max(aHang, 1e-3);
      scale = mix(0.3, 1.0, grow);
      offset.y = -0.02 * grow;
    } else {
      float fall = t - aHang;
      offset.y = -0.02 - 0.5 * uGravity * fall * fall;
      stretch = 1.0 + min(uGravity * fall * 0.14, 1.8);
    }
    vec3 local = position * uSize * scale;
    local.y *= stretch;
    vec3 world = aOrigin + offset + local;
    world.y = max(world.y, aGround);
    vShade = normal.y * 0.5 + 0.5;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const DROP_FRAGMENT = /* glsl */ `
  varying float vShade;
  void main() {
    vec3 color = mix(vec3(0.42, 0.55, 0.82), vec3(0.95, 0.98, 1.0), smoothstep(0.55, 0.9, vShade));
    gl_FragColor = vec4(color, 0.85);
  }
`;

const RING_VERTEX = /* glsl */ `
  ${TIMING}
  uniform float uRingDuration;
  uniform float uRingSize;
  varying float vAlpha;
  void main() {
    // The impact happens at the period boundary, so ring age == time into the cycle.
    float age = CycleTime() / uRingDuration;
    float radius = mix(0.03, uRingSize, sqrt(clamp(age, 0.0, 1.0)));
    vec3 world = vec3(aOrigin.x, aGround + 0.014, aOrigin.z) + position * radius;
    vAlpha = step(age, 1.0) * (1.0 - age) * (1.0 - age);
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vec3(0.62, 0.72, 0.92) * vAlpha * 0.75, 1.0);
  }
`;

/**
 * Water drops forming on eave edges, falling with gravity, splashing on landing.
 */
export class EaveDrips {
  /**
   * @param {THREE.Object3D} parent
   * @param {ReturnType<import('../world/RainColliders.js').GetDripEdges>} edges
   * @param {(x: number, z: number) => number} groundHeightAt
   */
  constructor(parent, edges, groundHeightAt) {
    const attributes = EaveDrips.#CreateAttributes(edges.flat(), groundHeightAt);
    const uniforms = {
      uTime: SHARED_UNIFORMS.uTime,
      uGravity: { value: GRAVITY },
      uSize: { value: DROP_SIZE },
      uRingDuration: { value: RING.DURATION },
      uRingSize: { value: RING.SIZE },
    };

    const drops = new THREE.Mesh(
      EaveDrips.#Instanced(new THREE.SphereGeometry(1, 8, 6), attributes),
      new THREE.ShaderMaterial({ uniforms, vertexShader: DROP_VERTEX, fragmentShader: DROP_FRAGMENT, transparent: true, depthWrite: false }),
    );
    const rings = new THREE.Mesh(
      EaveDrips.#Instanced(new THREE.RingGeometry(0.75, 1, 24).rotateX(-Math.PI / 2), attributes),
      new THREE.ShaderMaterial({ uniforms, vertexShader: RING_VERTEX, fragmentShader: RING_FRAGMENT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    for (const mesh of [drops, rings]) {
      mesh.frustumCulled = false;
      mesh.layers.set(LAYERS.FX);
      mesh.renderOrder = 9;
      parent.add(mesh);
    }
  }

  static #CreateAttributes(points, groundHeightAt) {
    const random = new Random(1201);
    const count = points.length;
    const origin = new Float32Array(count * 3);
    const ground = new Float32Array(count);
    const period = new Float32Array(count);
    const hang = new Float32Array(count);
    const phase = new Float32Array(count);
    points.forEach((point, index) => {
      const isStream = point.maxPeriod < 0.5;
      const jitter = isStream ? 0 : 0.08;
      const x = point.x + random.Range(-jitter, jitter);
      const z = point.z + random.Range(-jitter * 0.3, jitter * 0.3);
      const floor = groundHeightAt(x, z);
      const fallTime = Math.sqrt((2 * Math.max(point.y - floor, 0.01)) / GRAVITY);
      const hangTime = isStream ? 0.01 : random.Range(point.minPeriod, point.maxPeriod);
      origin.set([x, point.y, z], index * 3);
      ground[index] = floor;
      hang[index] = hangTime;
      period[index] = isStream ? random.Range(point.minPeriod, point.maxPeriod) : hangTime + fallTime;
      phase[index] = isStream ? index / 8 : random.Next();
    });
    return {
      aOrigin: new THREE.InstancedBufferAttribute(origin, 3),
      aGround: new THREE.InstancedBufferAttribute(ground, 1),
      aPeriod: new THREE.InstancedBufferAttribute(period, 1),
      aHang: new THREE.InstancedBufferAttribute(hang, 1),
      aPhase: new THREE.InstancedBufferAttribute(phase, 1),
      count,
    };
  }

  static #Instanced(baseGeometry, attributes) {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = baseGeometry.index;
    geometry.setAttribute('position', baseGeometry.attributes.position);
    geometry.setAttribute('normal', baseGeometry.attributes.normal);
    for (const name of ['aOrigin', 'aGround', 'aPeriod', 'aHang', 'aPhase']) geometry.setAttribute(name, attributes[name]);
    geometry.instanceCount = attributes.count;
    return geometry;
  }
}
