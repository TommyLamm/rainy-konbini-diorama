import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEPT_ATTRIBUTES = new Set(['position', 'normal', 'uv']);

/**
 * True if the object or any ancestor (up to `root`) is flagged as animated.
 * @param {THREE.Object3D} object
 * @param {THREE.Object3D} root
 */
function IsDynamic(object, root) {
  for (let node = object; node && node !== root.parent; node = node.parent) {
    if (node.userData.dynamic) return true;
  }
  return false;
}

/**
 * Normalises a geometry so heterogeneous primitives can be concatenated.
 * @param {THREE.Mesh} mesh
 * @param {THREE.Matrix4} relativeMatrix - Mesh world matrix expressed in root space.
 */
function PrepareGeometry(mesh, relativeMatrix) {
  const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const name of Object.keys(geometry.attributes)) {
    if (!KEPT_ATTRIBUTES.has(name)) geometry.deleteAttribute(name);
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  if (!geometry.attributes.uv) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
  }
  geometry.morphAttributes = {};
  geometry.clearGroups();
  geometry.applyMatrix4(relativeMatrix);
  return geometry;
}

/**
 * Collapses every static single-material mesh under `root` into one mesh per
 * (material, layer, shadow flags) bucket. The diorama is built from hundreds
 * of primitives and is drawn in four passes, so this keeps draw calls sane.
 * @param {THREE.Object3D} root
 * @returns {{before: number, after: number}} Mesh counts for diagnostics.
 */
export function MergeStaticMeshes(root) {
  root.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();

  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || Array.isArray(object.material)) return;
    if (object.geometry.isInstancedBufferGeometry || IsDynamic(object, root)) return;
    const key = [object.material.uuid, object.layers.mask, object.castShadow, object.receiveShadow, object.renderOrder].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(object);
  });

  let before = 0;
  let after = 0;
  for (const meshes of buckets.values()) {
    before += meshes.length;
    if (meshes.length < 2) {
      after += 1;
      continue;
    }
    const geometries = meshes.map((mesh) => {
      const relative = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
      return PrepareGeometry(mesh, relative);
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;

    const template = meshes[0];
    const combined = new THREE.Mesh(merged, template.material);
    combined.layers.mask = template.layers.mask;
    combined.castShadow = template.castShadow;
    combined.receiveShadow = template.receiveShadow;
    combined.renderOrder = template.renderOrder;
    combined.name = `merged:${template.material.name || template.material.type}`;
    meshes.forEach((mesh) => mesh.parent.remove(mesh));
    root.add(combined);
    after += 1;
  }
  return { before, after };
}
