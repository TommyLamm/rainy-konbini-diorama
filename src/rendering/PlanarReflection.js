import * as THREE from 'three';
import { LAYERS } from '../config/SceneConfig.js';

/**
 * Renders the scene mirrored about a horizontal plane into a texture that any
 * number of wet-surface materials can sample projectively. One shared render
 * replaces a Reflector per puddle. Based on three's Reflector (oblique clipping).
 */
export class PlanarReflection {
  #normal = new THREE.Vector3(0, 1, 0);
  #planePoint = new THREE.Vector3();
  #cameraPosition = new THREE.Vector3();
  #rotation = new THREE.Matrix4();
  #lookAt = new THREE.Vector3();
  #target = new THREE.Vector3();
  #view = new THREE.Vector3();
  #plane = new THREE.Plane();
  #clipPlane = new THREE.Vector4();
  #q = new THREE.Vector4();

  /**
   * @param {{planeY?: number, resolutionScale?: number, clipBias?: number}} [options]
   */
  constructor(options = {}) {
    this.planeY = options.planeY ?? 0;
    this.resolutionScale = options.resolutionScale ?? 0.5;
    this.clipBias = options.clipBias ?? 0.002;

    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.renderTarget.texture.generateMipmaps = false;
    /** World -> reflection texture projection; shared by reference with materials. */
    this.textureMatrix = new THREE.Matrix4();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.layers.set(LAYERS.SOLID);
    this.camera.layers.enable(LAYERS.GLOW);
  }

  /** @returns {THREE.Texture} */
  get Texture() {
    return this.renderTarget.texture;
  }

  /**
   * @param {number} width - Drawing-buffer width in pixels.
   * @param {number} height - Drawing-buffer height in pixels.
   */
  SetSize(width, height) {
    this.renderTarget.setSize(
      Math.max(1, Math.round(width * this.resolutionScale)),
      Math.max(1, Math.round(height * this.resolutionScale)),
    );
  }

  /**
   * Re-renders the mirrored view for the current camera.
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   */
  Update(renderer, scene, camera) {
    const normal = this.#normal;
    const planePoint = this.#planePoint;
    const virtualCamera = this.camera;

    this.#cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    if (this.#cameraPosition.y <= this.planeY) return;
    planePoint.set(this.#cameraPosition.x, this.planeY, this.#cameraPosition.z);

    this.#view.subVectors(planePoint, this.#cameraPosition).reflect(normal).negate().add(planePoint);
    this.#rotation.extractRotation(camera.matrixWorld);
    this.#lookAt.set(0, 0, -1).applyMatrix4(this.#rotation).add(this.#cameraPosition);
    this.#target.subVectors(planePoint, this.#lookAt).reflect(normal).negate().add(planePoint);

    virtualCamera.position.copy(this.#view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(this.#rotation).reflect(normal);
    virtualCamera.lookAt(this.#target);
    virtualCamera.far = camera.far;
    virtualCamera.updateMatrixWorld();
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(virtualCamera.projectionMatrix).multiply(virtualCamera.matrixWorldInverse);

    this.#ApplyObliqueClip(virtualCamera, planePoint);

    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, virtualCamera);
    renderer.setRenderTarget(previousTarget);
  }

  /** Replaces the near plane with the mirror plane so nothing below it leaks in. */
  #ApplyObliqueClip(virtualCamera, planePoint) {
    this.#plane.setFromNormalAndCoplanarPoint(this.#normal, planePoint).applyMatrix4(virtualCamera.matrixWorldInverse);
    const clip = this.#clipPlane.set(this.#plane.normal.x, this.#plane.normal.y, this.#plane.normal.z, this.#plane.constant);
    const elements = virtualCamera.projectionMatrix.elements;
    const q = this.#q;
    q.x = (Math.sign(clip.x) + elements[8]) / elements[0];
    q.y = (Math.sign(clip.y) + elements[9]) / elements[5];
    q.z = -1;
    q.w = (1 + elements[10]) / elements[14];
    clip.multiplyScalar(2 / clip.dot(q));
    elements[2] = clip.x;
    elements[6] = clip.y;
    elements[10] = clip.z + 1 - this.clipBias;
    elements[14] = clip.w;
  }

  dispose() {
    this.renderTarget.dispose();
  }
}
