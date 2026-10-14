import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BASE, CAMERA, LAYERS } from '../config/SceneConfig.js';
import { PlanarReflection } from '../rendering/PlanarReflection.js';
import { PostFxPipeline } from '../rendering/PostFxPipeline.js';
import { AnimationHub } from './AnimationHub.js';
import { SHARED_UNIFORMS } from './SharedUniforms.js';

const MAX_PIXEL_RATIO = 2;
const MAX_FRAME_DELTA = 1 / 20;
/** Radius of a sphere enclosing the plinth and the tallest poles. */
const SCENE_RADIUS = 18.5;
const TARGET_LIMIT = Object.freeze({ HALF: BASE.HALF - 2, MIN_Y: 0, MAX_Y: 6 });

/**
 * Owns the renderer, camera, controls and frame loop. World content is added
 * from outside through `scene` and `animationHub`.
 */
export class App {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this.renderer = App.#CreateRenderer();
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.FOV, 1, CAMERA.NEAR, CAMERA.FAR);
    this.camera.layers.enable(LAYERS.FX);
    this.camera.layers.enable(LAYERS.GLOW);
    this.camera.layers.enable(LAYERS.DETAIL);

    this.controls = this.#CreateControls();
    this.animationHub = new AnimationHub();
    this.reflection = new PlanarReflection({ planeY: 0, resolutionScale: 0.5 });
    this.pipeline = new PostFxPipeline(this.renderer, this.scene, this.camera);
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    /** @type {((widthPixels: number, heightPixels: number) => void)[]} */
    this.resizeListeners = [];

    window.addEventListener('resize', () => this.Resize());
  }

  /**
   * Registers a callback receiving the drawing-buffer size on every resize.
   * @param {(widthPixels: number, heightPixels: number) => void} listener
   */
  AddResizeListener(listener) {
    this.resizeListeners.push(listener);
  }

  /** Frames the diorama and starts the render loop. */
  Start() {
    this.Resize();
    this.#FrameInitialView();
    this.renderer.setAnimationLoop((timestamp) => this.#Tick(timestamp));
  }

  /** Requests a one-off shadow map refresh (shadow casters are static). */
  RefreshShadows() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  Resize() {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.pipeline.SetSize(width, height, pixelRatio);
    this.reflection.SetSize(width * pixelRatio, height * pixelRatio);
    for (const listener of this.resizeListeners) listener(width * pixelRatio, height * pixelRatio);
  }

  static #CreateRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.tabIndex = 0;
    return renderer;
  }

  #CreateControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.7;
    controls.screenSpacePanning = true;
    controls.minDistance = CAMERA.MIN_DISTANCE;
    controls.maxDistance = CAMERA.MAX_DISTANCE;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(CAMERA.TARGET.x, CAMERA.TARGET.y, CAMERA.TARGET.z);
    // Keep panning on the model so it can never be dragged out of view.
    controls.addEventListener('change', () => {
      const target = controls.target;
      target.x = THREE.MathUtils.clamp(target.x, -TARGET_LIMIT.HALF, TARGET_LIMIT.HALF);
      target.z = THREE.MathUtils.clamp(target.z, -TARGET_LIMIT.HALF, TARGET_LIMIT.HALF);
      target.y = THREE.MathUtils.clamp(target.y, TARGET_LIMIT.MIN_Y, TARGET_LIMIT.MAX_Y);
    });
    return controls;
  }

  /** Places the camera so the whole plinth fits regardless of aspect ratio. */
  #FrameInitialView() {
    const halfVertical = THREE.MathUtils.degToRad(CAMERA.FOV / 2);
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * this.camera.aspect);
    const distance = (SCENE_RADIUS / Math.sin(Math.min(halfVertical, halfHorizontal))) * 0.76;
    const azimuth = THREE.MathUtils.degToRad(CAMERA.AZIMUTH_DEG);
    const elevation = THREE.MathUtils.degToRad(CAMERA.ELEVATION_DEG);
    const target = this.controls.target;
    this.camera.position.set(
      target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(elevation) * Math.cos(azimuth),
    );
    this.controls.maxDistance = Math.max(CAMERA.MAX_DISTANCE, distance * 1.6);
    this.controls.update();
  }

  #Tick(timestamp) {
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), MAX_FRAME_DELTA);
    const elapsed = this.timer.getElapsed();
    SHARED_UNIFORMS.uTime.value = elapsed;

    this.controls.update(delta);
    this.animationHub.Update(elapsed, delta);
    this.reflection.Update(this.renderer, this.scene, this.camera);
    this.pipeline.Render(elapsed, delta);
  }
}
