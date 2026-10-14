/**
 * Uniform objects shared by reference across shader materials. The app loop
 * writes them once per frame; every material sees the same value.
 */
export const SHARED_UNIFORMS = Object.freeze({
  uTime: { value: 0 },
});
