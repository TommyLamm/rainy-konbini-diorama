import * as THREE from 'three';
import { SHARED_UNIFORMS } from '../core/SharedUniforms.js';
import { SHADER_NOISE } from './ShaderNoise.js';

/**
 * Grated drain channel with water streaming underneath: dark slots between
 * steel bars, lit by moving glints. UV.x runs along the flow direction.
 * @param {{length: number, width: number, speed?: number}} channel
 * @returns {THREE.ShaderMaterial}
 */
export function CreateDrainGrateMaterial(channel) {
  return new THREE.ShaderMaterial({
    name: 'DrainGrate',
    uniforms: {
      uTime: SHARED_UNIFORMS.uTime,
      channelSize: { value: new THREE.Vector2(channel.length, channel.width) },
      speed: { value: channel.speed ?? 0.6 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 channelSize;
      uniform float speed;
      varying vec2 vUv;
      ${SHADER_NOISE}
      void main() {
        vec2 p = vUv * channelSize;
        float bars = step(0.5, fract(p.x / 0.05));
        float frame = step(channelSize.y * 0.5 - 0.025, abs(p.y - channelSize.y * 0.5));
        vec2 flow = vec2(p.x * 3.0 - uTime * speed * 3.0, p.y * 9.0);
        float glint = smoothstep(0.62, 0.9, ValueNoise(flow) * 0.7 + ValueNoise(flow * 2.3) * 0.3);
        vec3 water = mix(vec3(0.02, 0.03, 0.05), vec3(0.45, 0.58, 0.8), glint);
        vec3 steel = vec3(0.12, 0.13, 0.15);
        vec3 color = mix(water, steel, max(bars, frame));
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
}
