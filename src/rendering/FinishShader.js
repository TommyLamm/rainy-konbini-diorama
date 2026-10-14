import * as THREE from 'three';

/**
 * Display-space finishing touches after tone mapping: a soft vignette that
 * frames the diorama like a display case, and 1-LSB dithering to keep the
 * dark night gradients free of banding.
 */
export const FinishShader = {
  name: 'FinishShader',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    vignette: { value: 0.32 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float vignette;
    uniform float time;
    varying vec2 vUv;

    float Hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - 0.5;
      centered.x *= resolution.x / resolution.y;
      float falloff = smoothstep(1.05, 0.28, length(centered));
      color.rgb *= mix(1.0 - vignette, 1.0, falloff);
      color.rgb += (Hash(gl_FragCoord.xy + fract(time) * 61.0) - 0.5) / 255.0;
      gl_FragColor = color;
    }`,
};
