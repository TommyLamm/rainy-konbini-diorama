import { Random } from '../../utils/Random.js';
import { BuildCounterArea } from './CounterArea.js';
import { BuildInteriorDecor } from './InteriorDecor.js';
import { ProductBatcher } from './ProductKit.js';
import { BuildShelving } from './Shelving.js';

/**
 * Fills the shop: fixtures first, then every product in a handful of instanced draws.
 * @param {THREE.Object3D} parent
 * @returns {{steamOrigins: THREE.Vector3[]}}
 */
export function BuildStoreInterior(parent) {
  const random = new Random(808);
  const batcher = new ProductBatcher();
  BuildInteriorDecor(parent);
  BuildShelving(parent, batcher, random);
  const counter = BuildCounterArea(parent, batcher, random);
  batcher.Build(parent);
  return counter;
}
