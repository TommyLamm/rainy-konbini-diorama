import * as THREE from 'three';
import { LAYERS } from '../config/SceneConfig.js';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { SHADER_NOISE } from '../materials/ShaderNoise.js';
import { Random } from '../utils/Random.js';

const VERTEX = /* glsl */ `
  attribute vec4 aZone;      // centre x/z, half extents (or radii) x/z
  attribute float aShape;    // 0 = rectangle, 1 = ellipse
  attribute float aRotation;
  attribute float aY;
  attribute float aPeriod;
  attribute float aPhase;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime;
  varying float vAlpha;
  ${SHADER_NOISE}

  void main() {
    float cycleTime = uTime / aPeriod + aPhase;
    float cycle = floor(cycleTime);
    float age = fract(cycleTime);
    // A fresh random spot every cycle, so impacts wander across the surface.
    vec2 random = Hash22(vec2(aSeed, cycle));
    vec2 local = aShape > 0.5
      ? vec2(cos(random.y * 6.2831853), sin(random.y * 6.2831853)) * sqrt(random.x) * 0.85 * aZone.zw
      : (random - 0.5) * 2.0 * aZone.zw;
    float c = cos(aRotation);
    float s = sin(aRotation);
    vec2 offset = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
    vec3 center = vec3(aZone.x + offset.x, aY + 0.013, aZone.y + offset.y);
    float radius = mix(0.012, aSize, sqrt(age));
    vAlpha = (1.0 - age) * (1.0 - age);
    gl_Position = projectionMatrix * viewMatrix * vec4(center + position * radius, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(uColor * vAlpha, 1.0);
  }
`;

/**
 * GPU impact rings: slow ripples inside puddles and quick splashes on open ground.
 */
export class RippleRings {
  /**
   * @param {THREE.Object3D} parent
   * @param {readonly {x:number, z:number, rx:number, rz:number, rot:number, y:number}[]} puddles
   * @param {{minX:number, maxX:number, minZ:number, maxZ:number, y:number}[]} splashZones
   */
  constructor(parent, puddles, splashZones) {
    const random = new Random(1301);
    const puddleZones = puddles.map((p) => ({ x: p.x, z: p.z, hx: p.rx, hz: p.rz, rotation: p.rot, y: p.y, shape: 1, area: Math.PI * p.rx * p.rz }));
    const openZones = splashZones.map((zone) => ({
      x: (zone.minX + zone.maxX) / 2,
      z: (zone.minZ + zone.maxZ) / 2,
      hx: (zone.maxX - zone.minX) / 2,
      hz: (zone.maxZ - zone.minZ) / 2,
      rotation: 0,
      y: zone.y,
      shape: 0,
      area: (zone.maxX - zone.minX) * (zone.maxZ - zone.minZ),
    }));
    RippleRings.#AddLayer(parent, random, puddleZones, { count: 260, period: [0.8, 1.4], size: [0.1, 0.22], color: new THREE.Color(0.26, 0.32, 0.46) });
    RippleRings.#AddLayer(parent, random, openZones, { count: 380, period: [0.2, 0.3], size: [0.03, 0.055], color: new THREE.Color(0.2, 0.25, 0.34) });
  }

  static #AddLayer(parent, random, zones, spec) {
    const totalArea = zones.reduce((sum, zone) => sum + zone.area, 0);
    const base = new THREE.RingGeometry(0.8, 1, 20).rotateX(-Math.PI / 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute('position', base.attributes.position);

    const zone = new Float32Array(spec.count * 4);
    const scalars = { aShape: [], aRotation: [], aY: [], aPeriod: [], aPhase: [], aSeed: [], aSize: [] };
    for (let i = 0; i < spec.count; i++) {
      const pick = RippleRings.#PickWeighted(zones, totalArea, random.Next());
      zone.set([pick.x, pick.z, pick.hx, pick.hz], i * 4);
      scalars.aShape.push(pick.shape);
      scalars.aRotation.push(pick.rotation);
      scalars.aY.push(pick.y);
      scalars.aPeriod.push(random.Range(spec.period[0], spec.period[1]));
      scalars.aPhase.push(random.Next());
      scalars.aSeed.push(i * 7.31 + random.Next());
      scalars.aSize.push(random.Range(spec.size[0], spec.size[1]));
    }
    geometry.setAttribute('aZone', new THREE.InstancedBufferAttribute(zone, 4));
    for (const [name, values] of Object.entries(scalars)) {
      geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(values), 1));
    }
    geometry.instanceCount = spec.count;

    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: SHARED_UNIFORMS.uTime, uColor: { value: spec.color } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.layers.set(LAYERS.FX);
    mesh.renderOrder = 3;
    parent.add(mesh);
  }

  static #PickWeighted(zones, totalArea, sample) {
    let threshold = sample * totalArea;
    for (const zone of zones) {
      threshold -= zone.area;
      if (threshold <= 0) return zone;
    }
    return zones[zones.length - 1];
  }
}
