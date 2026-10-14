import * as THREE from 'three';

/**
 * Fake volumetric beam for an open cone mesh (local Y from 0 = ground to
 * `height` = lamp). Bright near the lamp, soft at the silhouette edges.
 * @param {string|number} color
 * @param {number} intensity
 * @param {number} height
 * @returns {THREE.ShaderMaterial}
 */
export function CreateLightConeMaterial(color, intensity, height) {
  return new THREE.ShaderMaterial({
    name: 'LightCone',
    uniforms: {
      color: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      height: { value: height },
    },
    vertexShader: /* glsl */ `
      varying float vHeight;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vHeight = position.y;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float intensity;
      uniform float height;
      varying float vHeight;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        float along = clamp(vHeight / height, 0.0, 1.0);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float facing = abs(dot(normalize(vWorldNormal), viewDirection));
        float strength = pow(facing, 2.2) * (0.12 + 0.88 * along * along) * intensity;
        gl_FragColor = vec4(color * strength, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
