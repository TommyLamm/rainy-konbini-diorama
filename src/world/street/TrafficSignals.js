import * as THREE from 'three';
import { LEVELS, LIGHT_COLORS } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateLabelTexture } from '../../textures/StoreSignTextures.js';
import { CreatePedestrianIconTexture } from '../../textures/StreetSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddPlane, AddTube, MarkDynamic } from '../../utils/MeshKit.js';
import { AddGlowSprite } from '../../utils/GlowSprite.js';

/** T-junction timing (seconds): road A green/yellow, all-red, road B green/yellow, all-red. */
const CYCLE = Object.freeze({ LENGTH: 28, A_GREEN: 12, A_YELLOW: 15, B_START: 16, B_GREEN: 23, B_YELLOW: 26 });
const LAMP = Object.freeze({ ON: 3.2, OFF: 0.05, FADE_RATE: 16 });

const Phase = {
  RoadA(t) {
    const local = t % CYCLE.LENGTH;
    if (local < CYCLE.A_GREEN) return 'green';
    return local < CYCLE.A_YELLOW ? 'yellow' : 'red';
  },
  RoadB(t) {
    const local = t % CYCLE.LENGTH;
    if (local < CYCLE.B_START || local >= CYCLE.B_YELLOW) return 'red';
    return local < CYCLE.B_GREEN ? 'green' : 'yellow';
  },
  /** Pedestrians crossing road A walk while road B traffic has green. */
  CrossA(t) {
    const local = t % CYCLE.LENGTH;
    if (local >= CYCLE.B_START && local < CYCLE.B_GREEN - 2) return 'walk';
    return local >= CYCLE.B_GREEN - 2 && local < CYCLE.B_GREEN ? 'blink' : 'stop';
  },
  CrossB(t) {
    const local = t % CYCLE.LENGTH;
    if (local < CYCLE.A_GREEN - 3) return 'walk';
    return local < CYCLE.A_GREEN ? 'blink' : 'stop';
  },
};

/** Smoothly approaches the target brightness of a lamp + its halo. */
class Lamp {
  constructor(material, sprite) {
    this.material = material;
    this.sprite = sprite;
    this.level = 0;
  }

  Update(isOn, delta) {
    const target = isOn ? 1 : 0;
    this.level += (target - this.level) * Math.min(1, delta * LAMP.FADE_RATE);
    const intensity = LAMP.OFF + (LAMP.ON - LAMP.OFF) * this.level;
    this.material.color.copy(this.material.userData.baseColor).multiplyScalar(intensity);
    this.sprite.material.color.copy(this.sprite.material.userData.baseColor).multiplyScalar(this.level * 0.9);
  }
}

/** Horizontal three-lamp head with visors; faces local +Z, lamps along local X. */
class VehicleSignalHead {
  constructor(parent, position, rotationY, phaseFn) {
    this.phaseFn = phaseFn;
    const head = MarkDynamic(AddGroup(parent, position, rotationY));
    const housing = ToonMaterials.Get('#c9ced6');
    AddBoxFromBounds(head, housing, -0.54, -0.19, -0.12, 0.54, 0.19, 0.1, { castShadow: true });
    AddBoxFromBounds(head, ToonMaterials.Get('#1b1f27'), -0.5, -0.16, 0.1, 0.5, 0.16, 0.105);
    const visor = new THREE.CylinderGeometry(0.15, 0.15, 0.17, 12, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(0, 0, 0.085);
    const colors = [LIGHT_COLORS.signalBlue, LIGHT_COLORS.signalYellow, LIGHT_COLORS.signalRed];
    this.lamps = colors.map((color, index) => {
      const x = (index - 1) * 0.34;
      const material = ToonMaterials.CreateGlow(color, LAMP.OFF);
      AddMesh(head, new THREE.CircleGeometry(0.12, 20), material, [x, 0, 0.108]);
      AddMesh(head, visor, ToonMaterials.Get('#aab0b9', { side: THREE.DoubleSide }), [x, 0, 0.1]);
      return new Lamp(material, AddGlowSprite(head, color, 0.85, [x, 0, 0.2], 0));
    });
  }

  Update(elapsed, delta) {
    const phase = this.phaseFn(elapsed);
    this.lamps[0].Update(phase === 'green', delta);
    this.lamps[1].Update(phase === 'yellow', delta);
    this.lamps[2].Update(phase === 'red', delta);
  }
}

/** Two-aspect pedestrian head (stop figure over walk figure). */
class PedestrianSignalHead {
  static #icons = null;

  constructor(parent, position, rotationY, phaseFn) {
    this.phaseFn = phaseFn;
    PedestrianSignalHead.#icons ??= { stop: CreatePedestrianIconTexture('stop'), walk: CreatePedestrianIconTexture('walk') };
    const head = MarkDynamic(AddGroup(parent, position, rotationY));
    AddBoxFromBounds(head, ToonMaterials.Get('#3a404c'), -0.18, -0.38, -0.1, 0.18, 0.38, 0.1, { castShadow: true });
    const specs = [
      { color: LIGHT_COLORS.signalRed, icon: PedestrianSignalHead.#icons.stop, y: 0.18 },
      { color: LIGHT_COLORS.signalBlue, icon: PedestrianSignalHead.#icons.walk, y: -0.18 },
    ];
    this.lamps = specs.map((spec) => {
      const material = ToonMaterials.CreateGlow(spec.color, LAMP.OFF, { map: spec.icon });
      AddPlane(head, material, 0.27, 0.27, [0, spec.y, 0.102]);
      AddBoxFromBounds(head, ToonMaterials.Get('#2a2f3a'), -0.17, spec.y + 0.14, 0.1, 0.17, spec.y + 0.16, 0.2);
      return new Lamp(material, AddGlowSprite(head, spec.color, 0.6, [0, spec.y, 0.16], 0));
    });
  }

  Update(elapsed, delta) {
    const phase = this.phaseFn(elapsed);
    const blinkOn = Math.floor(elapsed * 4) % 2 === 0;
    this.lamps[0].Update(phase === 'stop', delta);
    this.lamps[1].Update(phase === 'walk' || (phase === 'blink' && blinkOn), delta * (phase === 'blink' ? 3 : 1));
  }
}

/** Signal post with an optional overhanging arm. */
function BuildPost(parent, x, z, armTo = null) {
  const steel = ToonMaterials.Get('#b8bdc5');
  AddCylinder(parent, steel, 0.085, 0.075, 5.3, [x, LEVELS.CURB, z], { segments: 12, castShadow: true });
  if (!armTo) return;
  AddTube(parent, steel, new THREE.Vector3(x, LEVELS.CURB + 5.15, z), new THREE.Vector3(armTo[0], LEVELS.CURB + 5.15, armTo[1]), 0.05, { castShadow: true });
  AddTube(parent, steel, new THREE.Vector3(x, LEVELS.CURB + 4.6, z), new THREE.Vector3((x * 2 + armTo[0]) / 3, LEVELS.CURB + 5.15, (z * 2 + armTo[1]) / 3), 0.025);
}

/**
 * Builds every signal at the T-junction plus a distant one at the far end of road A.
 * @param {THREE.Object3D} parent
 * @returns {{Update: (elapsed: number, delta: number) => void}}
 */
export function BuildTrafficSignals(parent) {
  const y = LEVELS.CURB;
  const distantPhase = (t) => Phase.RoadA(t + 9.5);
  BuildPost(parent, 3.0, 11.3, [3.0, 9.45]);
  BuildPost(parent, 11.45, 5.45, [11.45, 7.2]);
  BuildPost(parent, 6.3, 5.72);
  BuildPost(parent, -11.3, 11.3, [-11.3, 9.5]);
  AddTube(parent, ToonMaterials.Get('#b8bdc5'), new THREE.Vector3(11.45, y + 4.3, 5.45), new THREE.Vector3(10.2, y + 4.3, 5.45), 0.04);

  const heads = [
    new VehicleSignalHead(parent, [3.0, y + 4.92, 9.45], Math.PI / 2, Phase.RoadA),
    new VehicleSignalHead(parent, [11.45, y + 4.92, 7.15], -Math.PI / 2, Phase.RoadA),
    new VehicleSignalHead(parent, [10.25, y + 4.08, 5.45], Math.PI, Phase.RoadB),
    new VehicleSignalHead(parent, [-11.3, y + 4.92, 9.5], Math.PI / 2, distantPhase),
    new PedestrianSignalHead(parent, [6.3, y + 2.75, 5.84], 0, Phase.CrossA),
    new PedestrianSignalHead(parent, [3.0, y + 2.75, 11.18], Math.PI, Phase.CrossA),
    new PedestrianSignalHead(parent, [11.33, y + 2.75, 5.45], -Math.PI / 2, Phase.CrossB),
  ];

  const pushButton = ToonMaterials.Get('#ffffff', { map: CreateLabelTexture('おしてください', { background: '#f2c230', color: '#1d1f24', width: 256, height: 96 }), selfLit: 0.2 });
  AddBoxFromBounds(parent, ToonMaterials.Get('#f2c230', { selfLit: 0.15 }), 6.18, y + 1.0, 5.8, 6.42, y + 1.32, 5.92);
  AddPlane(parent, pushButton, 0.22, 0.08, [6.3, y + 1.24, 5.922]);
  AddCylinder(parent, ToonMaterials.Glow('#ff6a3c', 1.5), 0.035, 0.035, 0.02, [6.3, y + 1.1, 5.92], { rotation: [Math.PI / 2, 0, 0], segments: 10 });

  return {
    Update(elapsed, delta) {
      for (const head of heads) head.Update(elapsed, delta);
    },
  };
}
