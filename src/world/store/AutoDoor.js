import * as THREE from 'three';
import { LAYERS, PALETTE, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateRainGlassMaterial } from '../../materials/RainGlassMaterial.js';
import { CreateLabelTexture } from '../../textures/StoreSignTextures.js';
import { AddBoxFromBounds, AddGroup, AddPlane, MarkDynamic } from '../../utils/MeshKit.js';
import { Random } from '../../utils/Random.js';

const DOOR_TIMING = Object.freeze({ OPEN_SECONDS: 1.0, CLOSE_SECONDS: 1.3, HOLD_MIN: 2.2, HOLD_MAX: 3.6, WAIT_MIN: 6, WAIT_MAX: 15 });
const STATE = Object.freeze({ CLOSED: 0, OPENING: 1, OPEN: 2, CLOSING: 3 });
const FRAME = 0.05;

function EaseInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Bi-parting sliding door that opens now and then as if someone walked up.
 */
export class AutoDoor {
  #random = new Random(77);
  #state = STATE.CLOSED;
  #timer = 3.5;
  #progress = 0;

  /** @param {THREE.Object3D} parent */
  constructor(parent) {
    const { door, doorFixedPanels, floorY, maxZ } = STORE;
    this.frame = ToonMaterials.Get(PALETTE.frameDark);
    this.glass = CreateRainGlassMaterial({ width: 0.85, height: door.height - floorY, seed: 9.1, rainAmount: 0.7 });
    this.slideDistance = (door.maxX - door.minX) / 2;
    this.panelZ = maxZ - 0.03;

    for (const panel of doorFixedPanels) this.#BuildPanel(parent, panel.minX, panel.maxX, maxZ - 0.09);
    const middle = (door.minX + door.maxX) / 2;
    this.leftLeaf = MarkDynamic(AddGroup(parent));
    this.rightLeaf = MarkDynamic(AddGroup(parent));
    this.#BuildPanel(this.leftLeaf, door.minX, middle, this.panelZ, true);
    this.#BuildPanel(this.rightLeaf, middle, door.maxX, this.panelZ, true);
    this.#BuildTransom(parent);
  }

  /** 0 = closed, 1 = fully open (drives the doorway light spill). */
  get OpenAmount() {
    return EaseInOutCubic(this.#progress);
  }

  /** @param {number} elapsed @param {number} delta */
  Update(elapsed, delta) {
    this.#timer -= delta;
    switch (this.#state) {
      case STATE.CLOSED:
        if (this.#timer <= 0) this.#state = STATE.OPENING;
        break;
      case STATE.OPENING:
        this.#progress = Math.min(1, this.#progress + delta / DOOR_TIMING.OPEN_SECONDS);
        if (this.#progress >= 1) {
          this.#state = STATE.OPEN;
          this.#timer = this.#random.Range(DOOR_TIMING.HOLD_MIN, DOOR_TIMING.HOLD_MAX);
        }
        break;
      case STATE.OPEN:
        if (this.#timer <= 0) this.#state = STATE.CLOSING;
        break;
      case STATE.CLOSING:
        this.#progress = Math.max(0, this.#progress - delta / DOOR_TIMING.CLOSE_SECONDS);
        if (this.#progress <= 0) {
          this.#state = STATE.CLOSED;
          this.#timer = this.#random.Range(DOOR_TIMING.WAIT_MIN, DOOR_TIMING.WAIT_MAX);
        }
        break;
      default:
        break;
    }
    const offset = this.slideDistance * this.OpenAmount;
    this.leftLeaf.position.x = -offset;
    this.rightLeaf.position.x = offset;
  }

  /** Framed glass leaf; moving leaves carry the mint safety band and sticker. */
  #BuildPanel(parent, minX, maxX, z, isLeaf = false) {
    const { floorY, door } = STORE;
    const top = door.height;
    const depth = 0.05;
    AddBoxFromBounds(parent, this.frame, minX, floorY, z - depth, minX + FRAME, top, z);
    AddBoxFromBounds(parent, this.frame, maxX - FRAME, floorY, z - depth, maxX, top, z);
    AddBoxFromBounds(parent, this.frame, minX, top - FRAME, z - depth, maxX, top, z);
    AddBoxFromBounds(parent, this.frame, minX, floorY, z - depth, maxX, floorY + FRAME * 1.6, z);
    const glass = AddPlane(parent, this.glass, maxX - minX - FRAME * 2, top - floorY - FRAME * 2.6,
      [(minX + maxX) / 2, (floorY + FRAME * 1.6 + top - FRAME) / 2, z - depth / 2], { layer: LAYERS.FX });
    glass.renderOrder = 4;
    if (!isLeaf) return;
    const band = ToonMaterials.Get(PALETTE.storeMint, { selfLit: 0.3 });
    AddBoxFromBounds(parent, band, minX + FRAME, 1.12, z - 0.005, maxX - FRAME, 1.17, z + 0.004);
    const sticker = ToonMaterials.Get('#ffffff', { map: AutoDoor.#StickerTexture(), selfLit: 0.4 });
    AddPlane(parent, sticker, 0.36, 0.12, [(minX + maxX) / 2, 1.32, z + 0.006]);
  }

  /** Header with the motion sensor and its tiny red LED. */
  #BuildTransom(parent) {
    const { door, doorFixedPanels, windowY, maxZ } = STORE;
    AddBoxFromBounds(parent, this.frame, doorFixedPanels[0].minX, door.height, maxZ - 0.1, doorFixedPanels[1].maxX, windowY.max, maxZ + 0.02);
    const middle = (door.minX + door.maxX) / 2;
    AddBoxFromBounds(parent, ToonMaterials.Get('#20242c'), middle - 0.18, door.height - 0.1, maxZ + 0.02, middle + 0.18, door.height + 0.02, maxZ + 0.12);
    AddBoxFromBounds(parent, ToonMaterials.Glow('#ff3344', 3), middle + 0.1, door.height - 0.07, maxZ + 0.12, middle + 0.13, door.height - 0.04, maxZ + 0.125);
  }

  static #sticker = null;
  static #StickerTexture() {
    AutoDoor.#sticker ??= CreateLabelTexture('自動ドア', { background: '#ffffff', color: '#17675c', width: 256, height: 86, accent: '#2fbfa2' });
    return AutoDoor.#sticker;
  }
}
