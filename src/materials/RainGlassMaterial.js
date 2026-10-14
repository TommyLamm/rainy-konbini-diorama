import * as THREE from 'three';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { SHADER_NOISE } from './ShaderNoise.js';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec2 paneSize;
  uniform float seed;
  uniform vec3 tint;
  uniform float baseAlpha;
  uniform float rainAmount;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  ${SHADER_NOISE}

  // Small static beads that fade in and evaporate on a slow cycle.
  float Beads(vec2 p, float time) {
    vec2 grid = p / 0.05;
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    vec2 random = Hash22(cell + seed);
    float life = fract(time * 0.05 + random.y * 7.0);
    float radius = mix(0.1, 0.3, random.y) * smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.8, 1.0, life));
    vec2 offset = (Hash22(cell + seed + 3.7) - 0.5) * 0.4;
    return step(0.62, random.x) * (1.0 - smoothstep(radius * 0.6, radius, length(local - offset)));
  }

  // Columns of drops sliding down with a stick-slip motion, leaving a trail.
  vec2 SlidingDrops(vec2 p, float time, float layerSeed) {
    float columnWidth = 0.19;
    float column = floor(p.x / columnWidth);
    float random = Hash12(vec2(column, seed + layerSeed));
    float random2 = Hash12(vec2(column * 1.7, seed + layerSeed + 4.1));
    if (random < 0.45) return vec2(0.0);
    float localX = (fract(p.x / columnWidth) - 0.5) * columnWidth;
    float period = mix(5.0, 11.0, random2);
    float progress = fract(time / period + random * 3.0);
    float slip = progress + 0.035 * sin(progress * 38.0 + random * 6.28);
    float dropY = paneSize.y * (1.08 - slip * 1.2);
    float wobble = sin(p.y * 7.0 + random * 10.0) * 0.014 * (random2 - 0.5);
    float dx = localX - wobble;
    float drop = 1.0 - smoothstep(0.011, 0.02, length(vec2(dx, (p.y - dropY) * 0.62)));
    float above = p.y - dropY;
    float trailLength = 0.35 + random2 * 0.7;
    float trail = step(0.0, above) * (1.0 - smoothstep(0.0, trailLength, above))
                * (1.0 - smoothstep(0.0025, 0.006, abs(dx)));
    float trailBeads = step(0.0, above) * step(above, trailLength * 1.3)
                * (1.0 - smoothstep(0.004, 0.008, length(vec2(dx, fract(above * 14.0 + random) / 14.0 - 0.035))));
    return vec2(drop, max(trail, trailBeads * 0.7));
  }

  void main() {
    vec2 p = vUv * paneSize;
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(viewDirection, normalize(vWorldNormal)));
    float fresnel = pow(1.0 - facing, 3.0);

    float beads = Beads(p, uTime);
    vec2 slide = SlidingDrops(p, uTime, 0.0);
    vec2 slide2 = SlidingDrops(p + vec2(0.09, 0.0), uTime * 0.8 + 11.0, 9.0);
    float water = clamp(beads * 0.7 + slide.x + slide2.x + (slide.y + slide2.y) * 0.45, 0.0, 1.0) * rainAmount;

    // Anime glass glare: a broad + thin diagonal band pair sweeping across panes.
    float band = fract(((vWorldPosition.x - vWorldPosition.z) * 0.42 + vWorldPosition.y * 0.5) / 2.6);
    float glare = (1.0 - smoothstep(0.0, 0.07, abs(band - 0.18))) * 0.8
                + (1.0 - smoothstep(0.0, 0.02, abs(band - 0.3))) * 0.6;

    vec3 color = tint * (0.05 + fresnel * 0.45) + water * vec3(0.78, 0.88, 1.0) * 0.5 + glare * vec3(0.62, 0.76, 1.0) * 0.14;
    float alpha = clamp(baseAlpha + fresnel * 0.32 + water * 0.38 + glare * 0.1, 0.0, 0.85);
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Transparent window glass with animated rain beads and sliding drops.
 * @param {{width: number, height: number, seed?: number, baseAlpha?: number, rainAmount?: number}} pane
 * @returns {THREE.ShaderMaterial}
 */
export function CreateRainGlassMaterial(pane) {
  return new THREE.ShaderMaterial({
    name: 'RainGlass',
    uniforms: {
      uTime: SHARED_UNIFORMS.uTime,
      paneSize: { value: new THREE.Vector2(pane.width, pane.height) },
      seed: { value: pane.seed ?? 0 },
      tint: { value: new THREE.Color(0.55, 0.7, 0.9) },
      baseAlpha: { value: pane.baseAlpha ?? 0.06 },
      rainAmount: { value: pane.rainAmount ?? 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
