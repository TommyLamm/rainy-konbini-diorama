import * as THREE from 'three';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { SHADER_NOISE } from './ShaderNoise.js';

const VERTEX = /* glsl */ `
  uniform mat4 reflectionMatrix;
  varying vec4 vReflectionCoord;
  varying vec3 vWorldPosition;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vReflectionCoord = reflectionMatrix * world;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D tReflection;
  uniform sampler2D tWetMask;
  uniform vec4 maskBounds;
  uniform float uTime;
  uniform float dampReflectivity;
  uniform float puddleReflectivity;
  uniform float blurAmount;
  uniform vec3 waterTint;
  varying vec4 vReflectionCoord;
  varying vec3 vWorldPosition;

  ${SHADER_NOISE}

  // One expanding ring per grid cell, kept inside its cell so a single lookup suffices.
  // Returns (radial distortion xy, ring intensity).
  vec3 RippleLayer(vec2 p, float time, float cellSize, float rate) {
    vec2 cell = floor(p / cellSize);
    vec2 random = Hash22(cell);
    float age = fract(time * rate + random.x * 13.0);
    vec2 center = (cell + 0.5 + (random - 0.5) * 0.36) * cellSize;
    vec2 delta = p - center;
    float distanceToCenter = length(delta);
    float radius = age * cellSize * 0.32;
    float width = cellSize * 0.035;
    float ring = (1.0 - smoothstep(0.0, width, abs(distanceToCenter - radius))) * (1.0 - age) * (1.0 - age);
    vec2 direction = distanceToCenter > 1e-4 ? delta / distanceToCenter : vec2(0.0);
    return vec3(direction * ring, ring);
  }

  void main() {
    vec2 maskUv = (vWorldPosition.xz - maskBounds.xy) / maskBounds.zw;
    float mask = texture2D(tWetMask, maskUv).r;
    float grain = ValueNoise(vWorldPosition.xz * 1.6) * 0.6 + ValueNoise(vWorldPosition.xz * 5.1) * 0.4;
    float puddle = smoothstep(0.6, 0.635, mask + (grain - 0.5) * 0.18);
    float damp = smoothstep(0.1, 0.42, mask);

    vec3 ripple = RippleLayer(vWorldPosition.xz, uTime, 0.42, 1.05)
                + RippleLayer(vWorldPosition.xz + 17.3, uTime, 0.3, 1.4) * 0.8;

    vec2 roughness = vec2(grain, ValueNoise(vWorldPosition.zx * 3.3)) - 0.5;
    vec2 distortion = ripple.xy * mix(0.003, 0.01, puddle) + roughness * mix(0.018, 0.0025, puddle);
    vec2 uv = vReflectionCoord.xy / vReflectionCoord.w + distortion;

    // Vertical smear: wet streets stretch light sources into long streaks.
    float blur = mix(blurAmount, blurAmount * 0.18, puddle);
    vec3 reflection = texture2D(tReflection, uv).rgb * 0.32;
    reflection += texture2D(tReflection, uv + vec2(0.0, blur)).rgb * 0.2;
    reflection += texture2D(tReflection, uv - vec2(0.0, blur)).rgb * 0.2;
    reflection += texture2D(tReflection, uv + vec2(0.0, blur * 2.3)).rgb * 0.14;
    reflection += texture2D(tReflection, uv - vec2(0.0, blur * 2.3)).rgb * 0.14;

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = 0.55 + 0.45 * pow(1.0 - clamp(viewDirection.y, 0.0, 1.0), 2.0);
    float reflectivity = mix(dampReflectivity * damp, puddleReflectivity, puddle) * fresnel;

    vec3 color = reflection * waterTint * reflectivity;
    float luminance = dot(reflection, vec3(0.2126, 0.7152, 0.0722));
    color += ripple.z * damp * mix(0.03, 0.12, puddle) * (0.4 + luminance * 1.6) * vec3(0.7, 0.8, 1.0);

    float darken = mix(damp * 0.34, 0.6, puddle);
    gl_FragColor = vec4(color, darken);
  }
`;

/**
 * Premultiplied overlay drawn just above ground surfaces: darkens wet ground
 * (alpha) and adds the shared planar reflection (colour).
 * @param {import('../rendering/PlanarReflection.js').PlanarReflection} reflection
 * @param {{texture: THREE.Texture, bounds: {minX:number, maxX:number, minZ:number, maxZ:number}}} wetMask
 * @param {{dampReflectivity?: number, puddleReflectivity?: number, blurAmount?: number}} [options]
 * @returns {THREE.ShaderMaterial}
 */
export function CreateWetSurfaceMaterial(reflection, wetMask, options = {}) {
  const { bounds } = wetMask;
  return new THREE.ShaderMaterial({
    name: 'WetSurface',
    uniforms: {
      tReflection: { value: reflection.Texture },
      reflectionMatrix: { value: reflection.textureMatrix },
      tWetMask: { value: wetMask.texture },
      maskBounds: { value: new THREE.Vector4(bounds.minX, bounds.minZ, bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) },
      uTime: SHARED_UNIFORMS.uTime,
      dampReflectivity: { value: options.dampReflectivity ?? 0.52 },
      puddleReflectivity: { value: options.puddleReflectivity ?? 1.0 },
      blurAmount: { value: options.blurAmount ?? 0.012 },
      waterTint: { value: new THREE.Color(0.86, 0.92, 1.0) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}
