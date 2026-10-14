import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LAYERS } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';

/** Rescales a geometry into a unit box with its pivot at the bottom centre. */
function NormalizeToUnit(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z);
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  return geometry;
}

const BOTTLE_PROFILE = [[0, 0], [0.5, 0], [0.5, 0.6], [0.44, 0.7], [0.22, 0.83], [0.18, 0.86], [0.18, 1], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y));

const GEOMETRY_FACTORIES = Object.freeze({
  box: () => new THREE.BoxGeometry(1, 1, 1),
  bag: () => new RoundedBoxGeometry(1, 1, 1, 2, 0.3),
  can: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cup: () => new THREE.CylinderGeometry(0.5, 0.38, 1, 12),
  bottle: () => new THREE.LatheGeometry(BOTTLE_PROFILE, 12),
  cap: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  triangle: () => new THREE.CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2),
  sphere: () => new THREE.SphereGeometry(0.5, 12, 8),
});

/**
 * Collects product instances by shape and emits one InstancedMesh per shape.
 */
export class ProductBatcher {
  #items = new Map();
  #position = new THREE.Vector3();
  #quaternion = new THREE.Quaternion();
  #scale = new THREE.Vector3();
  #euler = new THREE.Euler();

  /**
   * @param {keyof GEOMETRY_FACTORIES} type
   * @param {number[]} position - Bottom-centre.
   * @param {number[]} size - [width, height, depth] in local axes.
   * @param {string|number|THREE.Color} color
   * @param {number} [rotationY] - Local +Z (front) is rotated to face this heading.
   * @param {number} [rotationX] - Tilt, e.g. ice cream lying in a freezer.
   */
  Add(type, position, size, color, rotationY = 0, rotationX = 0) {
    if (!this.#items.has(type)) this.#items.set(type, []);
    this.#position.set(position[0], position[1], position[2]);
    this.#quaternion.setFromEuler(this.#euler.set(rotationX, rotationY, 0, 'YXZ'));
    this.#scale.set(size[0], size[1], size[2]);
    this.#items.get(type).push({
      matrix: new THREE.Matrix4().compose(this.#position, this.#quaternion, this.#scale),
      color: new THREE.Color(color),
    });
  }

  /**
   * @param {THREE.Object3D} parent
   * @param {{layer?: number, material?: THREE.Material}} [options]
   */
  Build(parent, options = {}) {
    const material = options.material ?? ToonMaterials.Interior('#ffffff');
    for (const [type, items] of this.#items) {
      const mesh = new THREE.InstancedMesh(NormalizeToUnit(GEOMETRY_FACTORIES[type]()), material, items.length);
      items.forEach((item, index) => {
        mesh.setMatrixAt(index, item.matrix);
        mesh.setColorAt(index, item.color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.layers.set(options.layer ?? LAYERS.DETAIL);
      mesh.receiveShadow = false;
      parent.add(mesh);
    }
    this.#items.clear();
  }
}

/**
 * @typedef {Object} ProductKind
 * @property {string} type
 * @property {number[]} width - [min, max] along the shelf.
 * @property {number[]} height
 * @property {number[]} depth
 * @property {string[]} colors
 * @property {number} [maxFacings]
 * @property {number} [gap]
 * @property {'cap'|'nori'|'label'} [extra]
 */

/**
 * Lines a shelf with product facings (runs of identical items) along a front edge.
 * @param {ProductBatcher} batcher
 * @param {import('../../utils/Random.js').Random} random
 * @param {{from: number[], to: number[], y: number, depth: number, maxHeight: number, outward: number[]}} shelf
 *        `from`/`to` are [x, z] on the shelf front edge; `outward` is the facing direction.
 * @param {ProductKind[]} assortment
 */
export function StockShelf(batcher, random, shelf, assortment) {
  const dx = shelf.to[0] - shelf.from[0];
  const dz = shelf.to[1] - shelf.from[1];
  const length = Math.hypot(dx, dz);
  const dirX = dx / length;
  const dirZ = dz / length;
  const heading = Math.atan2(shelf.outward[0], shelf.outward[1]);
  let cursor = 0.025;
  while (cursor < length - 0.06) {
    const kind = random.Pick(assortment);
    const width = random.Range(kind.width[0], kind.width[1]);
    const height = Math.min(random.Range(kind.height[0], kind.height[1]), shelf.maxHeight);
    const depth = Math.min(random.Range(kind.depth[0], kind.depth[1]), shelf.depth);
    const color = random.Pick(kind.colors);
    const facings = random.Int(1, kind.maxFacings ?? 3);
    for (let i = 0; i < facings && cursor + width < length - 0.02; i++) {
      const along = cursor + width / 2;
      const x = shelf.from[0] + dirX * along - shelf.outward[0] * (depth / 2 + 0.02);
      const z = shelf.from[1] + dirZ * along - shelf.outward[1] * (depth / 2 + 0.02);
      batcher.Add(kind.type, [x, shelf.y, z], [width, height, depth], color, heading);
      AddExtra(batcher, kind, [x, shelf.y, z], [width, height, depth], heading, shelf.outward);
      cursor += width + (kind.gap ?? 0.012);
    }
    cursor += 0.02;
  }
}

/** Secondary pieces: bottle caps, onigiri nori wraps, label bands. */
function AddExtra(batcher, kind, position, size, heading, outward) {
  const [width, height, depth] = size;
  if (kind.extra === 'cap') {
    batcher.Add('cap', [position[0], position[1] + height * 0.86, position[2]], [width * 0.36, height * 0.15, width * 0.36], '#f4f4f4', heading);
  } else if (kind.extra === 'nori') {
    const front = depth * 0.02;
    batcher.Add('box', [position[0] + outward[0] * front, position[1], position[2] + outward[1] * front], [width * 0.4, height * 0.52, depth * 1.02], '#1f2a24', heading);
  } else if (kind.extra === 'label') {
    batcher.Add('box', [position[0], position[1] + height * 0.35, position[2]], [width * 1.02, height * 0.3, depth * 1.02], '#ffffff', heading);
  }
}

const VIVID = ['#ff5d73', '#ffcf3f', '#4d7cff', '#2fbfa2', '#ff9a3c', '#b15dff', '#5ed1ff', '#ff7fb3', '#7ed957', '#f4f4f4'];

/** Shared assortments keep merchandising consistent between fixtures. */
export const ASSORTMENTS = Object.freeze({
  snacks: [
    { type: 'bag', width: [0.14, 0.2], height: [0.2, 0.27], depth: [0.06, 0.09], colors: VIVID, maxFacings: 3 },
    { type: 'box', width: [0.1, 0.16], height: [0.12, 0.22], depth: [0.05, 0.08], colors: VIVID, maxFacings: 4 },
  ],
  noodles: [
    { type: 'cup', width: [0.11, 0.13], height: [0.11, 0.14], depth: [0.11, 0.13], colors: ['#ff5d5d', '#ffcf3f', '#f4f4f4', '#ff9a3c', '#2f7bff'], maxFacings: 4, extra: 'label' },
    { type: 'bag', width: [0.12, 0.16], height: [0.16, 0.2], depth: [0.05, 0.07], colors: ['#ffe9b0', '#ffd0a0', '#f8f0e0'], maxFacings: 3 },
  ],
  daily: [
    { type: 'bottle', width: [0.08, 0.11], height: [0.2, 0.26], depth: [0.08, 0.11], colors: ['#5ed1ff', '#f4f4f4', '#ff7fb3', '#7ed957'], maxFacings: 3, extra: 'cap' },
    { type: 'box', width: [0.14, 0.22], height: [0.08, 0.14], depth: [0.1, 0.14], colors: ['#f4f4f4', '#cfe8ff', '#ffe3ec', '#e0f5e9'], maxFacings: 2 },
  ],
  drinks: [
    { type: 'bottle', width: [0.075, 0.085], height: [0.22, 0.25], depth: [0.075, 0.085], colors: ['#ff5d5d', '#2f7bff', '#ffcf3f', '#3fd08a', '#ff9a3c', '#d8f3ff', '#7b4bb5', '#e85d9c'], maxFacings: 4, gap: 0.01, extra: 'cap' },
    { type: 'can', width: [0.065, 0.07], height: [0.12, 0.13], depth: [0.065, 0.07], colors: ['#c0c6d0', '#1d2b4a', '#ff5d5d', '#3fd08a', '#ffcf3f'], maxFacings: 5, gap: 0.008 },
  ],
  bento: [
    { type: 'bag', width: [0.2, 0.24], height: [0.06, 0.08], depth: [0.16, 0.2], colors: ['#ff9a3c', '#d94040', '#7ed957', '#ffcf3f', '#8b5a2b'], maxFacings: 2, gap: 0.02 },
  ],
  onigiri: [
    { type: 'triangle', width: [0.09, 0.1], height: [0.085, 0.095], depth: [0.035, 0.04], colors: ['#fbf7ee'], maxFacings: 4, gap: 0.016, extra: 'nori' },
  ],
  sandwiches: [
    { type: 'triangle', width: [0.11, 0.12], height: [0.1, 0.11], depth: [0.05, 0.06], colors: ['#f6e3b4', '#ffe7a8', '#fff1c9'], maxFacings: 3, gap: 0.016 },
    { type: 'cup', width: [0.11, 0.13], height: [0.07, 0.09], depth: [0.11, 0.13], colors: ['#9be15d', '#ffcf3f', '#ff9a9a'], maxFacings: 2 },
  ],
});
