import * as THREE from 'three';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddTube } from '../../utils/MeshKit.js';

const WHEEL = Object.freeze({ RADIUS: 0.31, TUBE: 0.024, BASE: 0.55 });
const TIRE_GEOMETRY = new THREE.TorusGeometry(WHEEL.RADIUS, WHEEL.TUBE, 6, 28);
const FENDER_GEOMETRY = new THREE.TorusGeometry(WHEEL.RADIUS + 0.04, 0.018, 4, 16, Math.PI * 0.85);
const HOOK_GEOMETRY = new THREE.TorusGeometry(0.05, 0.012, 6, 10, Math.PI);

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

/**
 * Japanese "mamachari" city bike. Local +X is forward; the frame lies in XY.
 * @param {THREE.Object3D} parent
 * @param {{position: number[], rotationY: number, frameColor: string, umbrellaColor?: string}} spec
 */
export function BuildBicycle(parent, spec) {
  const bike = AddGroup(parent, spec.position, spec.rotationY);
  const frame = ToonMaterials.Get(spec.frameColor, { selfLit: 0.1 });
  const rubber = ToonMaterials.Get('#22252c');
  const chrome = ToonMaterials.Get('#c9ced6', { selfLit: 0.1 });
  const shadowOpts = { castShadow: true, segments: 6 };

  for (const x of [-WHEEL.BASE, WHEEL.BASE]) {
    AddMesh(bike, TIRE_GEOMETRY, rubber, [x, WHEEL.RADIUS + WHEEL.TUBE, 0], { castShadow: true });
    AddCylinder(bike, chrome, 0.035, 0.035, 0.1, [x, WHEEL.RADIUS + WHEEL.TUBE, -0.05], { rotation: [Math.PI / 2, 0, 0], segments: 8 });
    AddMesh(bike, FENDER_GEOMETRY, chrome, [x, WHEEL.RADIUS + WHEEL.TUBE, 0], { rotation: [0, 0, Math.PI * 0.08] });
  }

  const hubY = WHEEL.RADIUS + WHEEL.TUBE;
  const bottomBracket = V(-0.02, 0.3);
  const seatTop = V(-0.16, 0.86);
  const headBottom = V(0.4, 0.62);
  const headTop = V(0.44, 0.86);
  AddTube(bike, frame, headBottom, V(0.1, 0.36), 0.022, shadowOpts);
  AddTube(bike, frame, V(0.1, 0.36), bottomBracket, 0.022, shadowOpts);
  AddTube(bike, frame, bottomBracket, seatTop, 0.02, shadowOpts);
  AddTube(bike, frame, bottomBracket, V(-WHEEL.BASE, hubY, 0.03), 0.014, shadowOpts);
  AddTube(bike, frame, V(-0.12, 0.72), V(-WHEEL.BASE, hubY, 0.03), 0.013, shadowOpts);
  AddTube(bike, frame, headBottom, headTop, 0.026, shadowOpts);
  AddTube(bike, chrome, headBottom, V(WHEEL.BASE, hubY, 0.03), 0.014, shadowOpts);
  AddTube(bike, chrome, headTop, V(0.4, 1.02), 0.014, shadowOpts);
  AddTube(bike, chrome, V(0.36, 1.02, -0.3), V(0.36, 1.02, 0.3), 0.013, shadowOpts);
  for (const side of [-1, 1]) {
    AddTube(bike, rubber, V(0.36, 1.02, side * 0.3), V(0.22, 1.0, side * 0.34), 0.02, { segments: 6 });
  }

  AddBoxFromBounds(bike, ToonMaterials.Get('#5a3a2a'), seatTop.x - 0.14, seatTop.y, -0.08, seatTop.x + 0.1, seatTop.y + 0.06, 0.08, { castShadow: true });
  AddBoxFromBounds(bike, chrome, -0.72, 0.74, -0.12, -0.28, 0.76, 0.12);
  AddTube(bike, chrome, V(-0.3, 0.75, 0.1), V(-0.2, 0.62, 0.05), 0.01, { segments: 4 });
  AddBoxFromBounds(bike, frame, -0.5, 0.26, 0.03, -0.02, 0.36, 0.07);

  // Front wire basket.
  const basket = ToonMaterials.Get('#2a2f3a');
  AddBoxFromBounds(bike, basket, 0.5, 0.74, -0.17, 0.86, 0.76, 0.17);
  for (const [x0, z0, x1, z1] of [[0.5, -0.17, 0.86, -0.16], [0.5, 0.16, 0.86, 0.17], [0.85, -0.17, 0.86, 0.17], [0.5, -0.17, 0.51, 0.17]]) {
    AddBoxFromBounds(bike, basket, x0, 0.74, z0, x1, 0.98, z1);
  }
  AddBoxFromBounds(bike, basket, 0.5, 0.97, -0.17, 0.86, 0.985, 0.17);

  // Centre kickstand.
  AddTube(bike, chrome, V(-0.4, 0.3, 0), V(-0.46, 0, 0.12), 0.012, { segments: 4 });
  AddTube(bike, chrome, V(-0.4, 0.3, 0), V(-0.46, 0, -0.12), 0.012, { segments: 4 });

  if (spec.umbrellaColor) AddHookedUmbrella(bike, spec.umbrellaColor);
  return bike;
}

/** Folded umbrella hanging from the handlebar. */
function AddHookedUmbrella(bike, color) {
  const canopy = ToonMaterials.Get(color, { selfLit: 0.1 });
  const tip = V(0.05, 0.12, 0.36);
  const top = V(0.3, 0.98, 0.32);
  const direction = new THREE.Vector3().subVectors(top, tip);
  const length = direction.length();
  const mesh = AddCylinder(bike, canopy, 0.012, 0.05, length * 0.82, [0, 0, 0], { segments: 8 });
  mesh.position.copy(tip);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  AddTube(bike, ToonMaterials.Get('#3a2a20'), tip.clone().addScaledVector(direction, length * 0.8), top, 0.009, { segments: 4 });
  AddMesh(bike, HOOK_GEOMETRY, ToonMaterials.Get('#3a2a20'), [top.x + 0.05, top.y, top.z], { rotation: [0, 0, Math.PI] });
}
