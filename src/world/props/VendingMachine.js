import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateVendingDisplayTexture, CreateVendingLowerTexture } from '../../textures/StreetSignTextures.js';
import { AddBoxFromBounds, AddGroup, AddPlane } from '../../utils/MeshKit.js';

const SIZE = Object.freeze({ WIDTH: 0.96, DEPTH: 0.74, HEIGHT: 1.83 });

/**
 * Drink vending machine facing local +Z, standing on `position`.
 * @param {THREE.Object3D} parent
 * @param {{position: number[], rotationY?: number, bodyColor: string, seed: number, banner: string}} spec
 */
export function BuildVendingMachine(parent, spec) {
  const group = AddGroup(parent, spec.position, spec.rotationY ?? 0);
  const halfW = SIZE.WIDTH / 2;
  const halfD = SIZE.DEPTH / 2;
  const body = ToonMaterials.Get(spec.bodyColor, { selfLit: 0.12 });
  const trim = ToonMaterials.Get('#2a2f3a');
  AddBoxFromBounds(group, body, -halfW, 0, -halfD, halfW, SIZE.HEIGHT, halfD, { castShadow: true });
  AddBoxFromBounds(group, trim, -halfW - 0.01, 0, -halfD, halfW + 0.01, 0.06, halfD + 0.01);
  AddBoxFromBounds(group, body, -halfW - 0.02, SIZE.HEIGHT - 0.06, -halfD, halfW + 0.02, SIZE.HEIGHT, halfD + 0.06);

  const display = ToonMaterials.Glow('#ffffff', 1.35, { map: CreateVendingDisplayTexture(spec.seed) });
  AddPlane(group, display, SIZE.WIDTH - 0.1, 0.84, [0, 1.3, halfD + 0.004]);
  const lower = ToonMaterials.Get('#ffffff', { map: CreateVendingLowerTexture(spec.bodyColor, spec.banner), selfLit: 0.15 });
  AddPlane(group, lower, SIZE.WIDTH - 0.1, 0.8, [0, 0.47, halfD + 0.004]);
  AddBoxFromBounds(group, trim, -halfW + 0.03, 0.86, halfD, halfW - 0.03, 0.89, halfD + 0.03);
  AddBoxFromBounds(group, ToonMaterials.Get('#20252f'), -halfW + 0.08, 0.1, halfD, halfW - 0.08, 0.3, halfD + 0.05);
  return group;
}
