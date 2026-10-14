import * as THREE from 'three';

/**
 * Primitive helpers used by every builder. Geometries are cached unit shapes
 * with a bottom-centre pivot, so callers place objects by "where it stands".
 */

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const CYLINDER_CACHE = new Map();
const PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

/**
 * @typedef {Object} PlacementOptions
 * @property {number[]} [rotation] - Euler XYZ in radians.
 * @property {boolean} [castShadow]
 * @property {boolean} [receiveShadow]
 * @property {number} [layer] - Render layer (see LAYERS).
 * @property {string} [name]
 */

/**
 * Applies transform / shadow / layer options to an object and parents it.
 * @param {THREE.Object3D} parent
 * @param {THREE.Object3D} object
 * @param {number[]} position
 * @param {PlacementOptions} options
 * @returns {THREE.Object3D}
 */
function Place(parent, object, position, options = {}) {
  object.position.set(position[0], position[1], position[2]);
  if (options.rotation) object.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2]);
  object.castShadow = options.castShadow ?? false;
  object.receiveShadow = options.receiveShadow ?? true;
  if (options.layer !== undefined) object.layers.set(options.layer);
  if (options.name) object.name = options.name;
  if (parent) parent.add(object);
  return object;
}

/**
 * Adds a box standing on `position` (bottom-centre pivot).
 * @param {THREE.Object3D} parent
 * @param {THREE.Material} material
 * @param {number[]} size - [width (x), height (y), depth (z)].
 * @param {number[]} position - Bottom-centre position.
 * @param {PlacementOptions} [options]
 * @returns {THREE.Mesh}
 */
export function AddBox(parent, material, size, position, options) {
  const mesh = new THREE.Mesh(UNIT_BOX, material);
  mesh.scale.set(size[0], size[1], size[2]);
  return Place(parent, mesh, position, options);
}

/**
 * Adds a box described by min/max corners — convenient for layout rectangles.
 * @returns {THREE.Mesh}
 */
export function AddBoxFromBounds(parent, material, minX, minY, minZ, maxX, maxY, maxZ, options) {
  return AddBox(
    parent,
    material,
    [maxX - minX, maxY - minY, maxZ - minZ],
    [(minX + maxX) / 2, minY, (minZ + maxZ) / 2],
    options,
  );
}

/**
 * Returns a cached unit cylinder (radius 1, height 1, bottom pivot).
 * @param {number} topRatio - radiusTop / radiusBottom.
 * @param {number} segments
 * @param {boolean} openEnded
 */
function GetUnitCylinder(topRatio, segments, openEnded) {
  const key = `${topRatio.toFixed(3)}|${segments}|${openEnded}`;
  if (!CYLINDER_CACHE.has(key)) {
    const geometry = new THREE.CylinderGeometry(topRatio, 1, 1, segments, 1, openEnded).translate(0, 0.5, 0);
    CYLINDER_CACHE.set(key, geometry);
  }
  return CYLINDER_CACHE.get(key);
}

/**
 * Adds a (possibly tapered) cylinder standing on `position`.
 * @param {THREE.Object3D} parent
 * @param {THREE.Material} material
 * @param {number} radiusBottom
 * @param {number} radiusTop
 * @param {number} height
 * @param {number[]} position
 * @param {PlacementOptions & {segments?: number, openEnded?: boolean}} [options]
 * @returns {THREE.Mesh}
 */
export function AddCylinder(parent, material, radiusBottom, radiusTop, height, position, options = {}) {
  const geometry = GetUnitCylinder(radiusTop / radiusBottom, options.segments ?? 16, options.openEnded ?? false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(radiusBottom, height, radiusBottom);
  return Place(parent, mesh, position, options);
}

/**
 * Adds a cylinder spanning two points (pipes, frame tubes, rails).
 * @param {THREE.Object3D} parent
 * @param {THREE.Material} material
 * @param {THREE.Vector3} from
 * @param {THREE.Vector3} to
 * @param {number} radius
 * @param {PlacementOptions & {segments?: number}} [options]
 * @returns {THREE.Mesh}
 */
export function AddTube(parent, material, from, to, radius, options = {}) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mesh = new THREE.Mesh(GetUnitCylinder(1, options.segments ?? 8, false), material);
  mesh.scale.set(radius, length, radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.position.copy(from);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.layer !== undefined) mesh.layers.set(options.layer);
  parent.add(mesh);
  return mesh;
}

/**
 * Adds a centred plane (used for signs, posters and decals).
 * @param {THREE.Object3D} parent
 * @param {THREE.Material} material
 * @param {number} width
 * @param {number} height
 * @param {number[]} position - Plane centre.
 * @param {PlacementOptions} [options]
 * @returns {THREE.Mesh}
 */
export function AddPlane(parent, material, width, height, position, options) {
  const mesh = new THREE.Mesh(PLANE_GEOMETRY, material);
  mesh.scale.set(width, height, 1);
  return Place(parent, mesh, position, { receiveShadow: false, ...options });
}

/**
 * Adds an arbitrary geometry with placement options.
 * @returns {THREE.Mesh}
 */
export function AddMesh(parent, geometry, material, position = [0, 0, 0], options) {
  return Place(parent, new THREE.Mesh(geometry, material), position, options);
}

/**
 * Creates a child group with an optional Y rotation.
 * @param {THREE.Object3D} parent
 * @param {number[]} position
 * @param {number} [rotationY]
 * @returns {THREE.Group}
 */
export function AddGroup(parent, position = [0, 0, 0], rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = rotationY;
  parent.add(group);
  return group;
}

/**
 * Moves an object and all descendants onto a single render layer.
 * @param {THREE.Object3D} root
 * @param {number} layer
 */
export function SetLayerRecursive(root, layer) {
  root.traverse((child) => child.layers.set(layer));
}

/**
 * Flags an object tree as animated so the static merger leaves it alone.
 * @param {THREE.Object3D} root
 * @returns {THREE.Object3D}
 */
export function MarkDynamic(root) {
  root.userData.dynamic = true;
  return root;
}

/**
 * Rewrites UVs from world-space XZ so painted ground textures line up with the
 * layout. Convention: u = (x - minX) / width, v = (z - minZ) / depth with
 * texture.flipY = false (canvas row 0 == minZ).
 * @param {THREE.BufferGeometry} geometry - Already in world orientation.
 * @param {{minX:number, maxX:number, minZ:number, maxZ:number}} bounds
 */
export function ApplyPlanarUV(geometry, bounds) {
  const position = geometry.attributes.position;
  const uv = new Float32Array(position.count * 2);
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - bounds.minX) / width;
    uv[i * 2 + 1] = (position.getZ(i) - bounds.minZ) / depth;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Builds a rounded-corner rectangle shape in the XZ plane. Shape Y maps to -Z
 * once rotated by -PI/2 around X, so corners are given in world X/Z.
 * @param {{minX:number, maxX:number, minZ:number, maxZ:number}} rect
 * @param {{corner: 'SE'|'SW'|'NE'|'NW', radius: number}[]} roundedCorners
 * @returns {THREE.Shape}
 */
export function CreateRoundedRectShape(rect, roundedCorners = []) {
  const radiusOf = (corner) => roundedCorners.find((entry) => entry.corner === corner)?.radius ?? 0;
  const shape = new THREE.Shape();
  // Shape space: sx = x, sy = -z. Walk counter-clockwise in shape space.
  const left = rect.minX;
  const right = rect.maxX;
  const bottom = -rect.maxZ; // south edge
  const top = -rect.minZ; // north edge
  const sw = radiusOf('SW');
  const se = radiusOf('SE');
  const ne = radiusOf('NE');
  const nw = radiusOf('NW');

  shape.moveTo(left + sw, bottom);
  shape.lineTo(right - se, bottom);
  if (se > 0) shape.absarc(right - se, bottom + se, se, -Math.PI / 2, 0, false);
  shape.lineTo(right, top - ne);
  if (ne > 0) shape.absarc(right - ne, top - ne, ne, 0, Math.PI / 2, false);
  shape.lineTo(left + nw, top);
  if (nw > 0) shape.absarc(left + nw, top - nw, nw, Math.PI / 2, Math.PI, false);
  shape.lineTo(left, bottom + sw);
  if (sw > 0) shape.absarc(left + sw, bottom + sw, sw, Math.PI, Math.PI * 1.5, false);
  return shape;
}
