import * as THREE from 'three';
import { BASE, LEVELS, STORE } from '../../config/SceneConfig.js';
import { ToonMaterials } from '../../materials/ToonMaterials.js';
import { CreateAddressPlateTexture, CreateHazardStripeTexture, CreateSpeedSignTexture } from '../../textures/StreetSignTextures.js';
import { AddBoxFromBounds, AddCylinder, AddGroup, AddMesh, AddPlane, AddTube } from '../../utils/MeshKit.js';
import { AddGlowSprite } from '../../utils/GlowSprite.js';
import { LIGHT_RIG } from '../Lighting.js';

/** armAngle orients the crossarm perpendicular to the spans it carries. */
const POLES = Object.freeze({
  corner: { x: 7.1, z: 5.2, height: 8.0, armAngle: -Math.PI / 4 },
  south: { x: -3.6, z: 11.35, height: 8.0, armAngle: Math.PI / 2 },
  east: { x: 11.5, z: -5.5, height: 8.0, armAngle: 0 },
});
const CONDUCTOR_OFFSETS = Object.freeze([-0.62, 0, 0.62]);
const ARM_DROP = 0.35;
const TELECOM_DROP = 2.3;
const WIRE_RADIUS = Object.freeze({ POWER: 0.014, TELECOM: 0.03, SERVICE: 0.012 });

function ArmDirection(pole) {
  return new THREE.Vector3(Math.cos(pole.armAngle), 0, -Math.sin(pole.armAngle));
}

/** World position of a conductor's insulator tip on a pole. */
function ConductorPoint(pole, offset) {
  return new THREE.Vector3(pole.x, LEVELS.CURB + pole.height - ARM_DROP + 0.2, pole.z).addScaledVector(ArmDirection(pole), offset);
}

function TelecomPoint(pole) {
  return new THREE.Vector3(pole.x, LEVELS.CURB + pole.height - TELECOM_DROP, pole.z);
}

/**
 * Sagging cable between two points (parabolic approximation of a catenary).
 * @param {THREE.Object3D} parent
 * @param {THREE.Material} material
 */
function AddWire(parent, material, from, to, radius, sagPerMeter = 0.035) {
  const sag = from.distanceTo(to) * sagPerMeter;
  const control = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  control.y -= sag * 2;
  const curve = new THREE.QuadraticBezierCurve3(from, control, to);
  AddMesh(parent, new THREE.TubeGeometry(curve, 24, radius, 4, false), material);
}

/**
 * Concrete poles, crossarms, transformer, signs and every overhead cable.
 * @param {THREE.Object3D} parent
 */
export function BuildUtilityPoles(parent) {
  const concrete = ToonMaterials.Get('#a9a9a3');
  Object.values(POLES).forEach((pole) => BuildPole(parent, pole, concrete));
  DecorateCornerPole(parent, POLES.corner, concrete);
  BuildWires(parent);
}

function BuildPole(parent, pole, concrete) {
  const base = LEVELS.CURB;
  AddCylinder(parent, concrete, 0.15, 0.11, pole.height, [pole.x, base, pole.z], { segments: 14, castShadow: true });
  AddCylinder(parent, ToonMaterials.Get('#8b8b86'), 0.115, 0.06, 0.12, [pole.x, base + pole.height, pole.z], { segments: 12 });

  const arm = AddGroup(parent, [pole.x, base + pole.height - ARM_DROP, pole.z], pole.armAngle);
  const steel = ToonMaterials.Get('#7a7f88');
  AddBoxFromBounds(arm, steel, -0.78, -0.045, -0.05, 0.78, 0.045, 0.05, { castShadow: true });
  AddTube(arm, steel, new THREE.Vector3(-0.5, 0, 0), new THREE.Vector3(0, -0.45, 0), 0.014);
  AddTube(arm, steel, new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(0, -0.45, 0), 0.014);
  const porcelain = ToonMaterials.Get('#eef0f2');
  for (const offset of CONDUCTOR_OFFSETS) AddCylinder(arm, porcelain, 0.045, 0.035, 0.15, [offset, 0.045, 0], { segments: 8 });

  AddBoxFromBounds(parent, steel, pole.x - 0.2, base + pole.height - TELECOM_DROP - 0.04, pole.z - 0.04, pole.x + 0.2, base + pole.height - TELECOM_DROP + 0.04, pole.z + 0.04);
  for (let i = 0, y = 2.4; y < pole.height - 1.0; i++, y += 0.42) {
    const angle = pole.armAngle + (i % 2 === 0 ? 0 : Math.PI);
    const dx = Math.cos(angle) * 0.17;
    const dz = -Math.sin(angle) * 0.17;
    AddBoxFromBounds(parent, steel, pole.x + dx - 0.04, base + y, pole.z + dz - 0.012, pole.x + dx + 0.04, base + y + 0.025, pole.z + dz + 0.012);
  }
}

/** Transformer, guard sleeve, address plate, speed sign and security light. */
function DecorateCornerPole(parent, pole, concrete) {
  const base = LEVELS.CURB;
  const sleeve = ToonMaterials.Get('#ffffff', { map: CreateHazardStripeTexture() });
  AddCylinder(parent, sleeve, 0.165, 0.16, 1.8, [pole.x, base, pole.z], { segments: 14 });

  const transformer = ToonMaterials.Get('#b9bec6');
  const tx = pole.x - 0.28;
  const tz = pole.z - 0.22;
  AddCylinder(parent, transformer, 0.21, 0.21, 0.58, [tx, base + 5.9, tz], { segments: 14, castShadow: true });
  AddCylinder(parent, ToonMaterials.Get('#eef0f2'), 0.03, 0.025, 0.12, [tx + 0.08, base + 6.48, tz], { segments: 6 });
  AddCylinder(parent, ToonMaterials.Get('#eef0f2'), 0.03, 0.025, 0.12, [tx - 0.08, base + 6.48, tz], { segments: 6 });
  AddBoxFromBounds(parent, ToonMaterials.Get('#7a7f88'), tx - 0.05, base + 5.95, tz, pole.x, base + 6.05, pole.z);

  const plate = ToonMaterials.Get('#ffffff', { map: CreateAddressPlateTexture(), selfLit: 0.15 });
  AddPlane(parent, plate, 0.17, 0.62, [pole.x, base + 2.55, pole.z + 0.145]);
  const speed = ToonMaterials.Get('#ffffff', { map: CreateSpeedSignTexture(30), selfLit: 0.15 });
  AddMesh(parent, new THREE.CircleGeometry(0.3, 28), speed, [pole.x + 0.2, base + 3.35, pole.z], { rotation: [0, Math.PI / 2, 0] });
  AddBoxFromBounds(parent, ToonMaterials.Get('#7a7f88'), pole.x + 0.1, base + 3.3, pole.z - 0.03, pole.x + 0.19, base + 3.4, pole.z + 0.03);
  AddMesh(parent, new THREE.CircleGeometry(0.3, 28), concrete, [pole.x + 0.195, base + 3.35, pole.z], { rotation: [0, -Math.PI / 2, 0] });

  const lamp = new THREE.Vector3(...LIGHT_RIG.cornerLamp.position);
  const housing = ToonMaterials.Get('#d7dade');
  AddTube(parent, ToonMaterials.Get('#7a7f88'), new THREE.Vector3(pole.x, lamp.y + 0.22, pole.z), new THREE.Vector3(lamp.x, lamp.y + 0.06, lamp.z), 0.02);
  AddBoxFromBounds(parent, housing, lamp.x - 0.16, lamp.y, lamp.z - 0.08, lamp.x + 0.16, lamp.y + 0.08, lamp.z + 0.08, { castShadow: true });
  AddPlane(parent, ToonMaterials.Glow('#e6f3ff', 3.4), 0.26, 0.12, [lamp.x, lamp.y - 0.002, lamp.z], { rotation: [Math.PI / 2, 0, 0] });
  AddGlowSprite(parent, '#cfe6ff', 1.1, [lamp.x, lamp.y - 0.05, lamp.z], 0.9);
}

/** Pole-to-pole spans, spans leaving the model edge, and the shop's service drop. */
function BuildWires(parent) {
  const power = ToonMaterials.Get('#20242c');
  const telecom = ToonMaterials.Get('#15181d');
  const { corner, south, east } = POLES;
  const edge = BASE.HALF;

  // `mirrored` pairs the outer conductors so they stay on the same side of the span and never cross.
  for (const { from, to, mirrored } of [{ from: south, to: corner, mirrored: true }, { from: corner, to: east, mirrored: false }]) {
    for (const offset of CONDUCTOR_OFFSETS) {
      AddWire(parent, power, ConductorPoint(from, offset), ConductorPoint(to, mirrored ? -offset : offset), WIRE_RADIUS.POWER);
    }
    AddWire(parent, telecom, TelecomPoint(from), TelecomPoint(to), WIRE_RADIUS.TELECOM, 0.045);
  }

  for (const offset of CONDUCTOR_OFFSETS) {
    const start = ConductorPoint(south, offset);
    AddWire(parent, power, start, new THREE.Vector3(-edge, start.y - 0.25, start.z), WIRE_RADIUS.POWER, 0.02);
    const northStart = ConductorPoint(east, offset);
    AddWire(parent, power, northStart, new THREE.Vector3(northStart.x, northStart.y - 0.25, -edge), WIRE_RADIUS.POWER, 0.02);
  }
  const southTelecom = TelecomPoint(south);
  AddWire(parent, telecom, southTelecom, new THREE.Vector3(-edge, southTelecom.y - 0.3, southTelecom.z), WIRE_RADIUS.TELECOM, 0.03);
  const eastTelecom = TelecomPoint(east);
  AddWire(parent, telecom, eastTelecom, new THREE.Vector3(eastTelecom.x, eastTelecom.y - 0.3, -edge), WIRE_RADIUS.TELECOM, 0.03);

  const roofHook = new THREE.Vector3(STORE.maxX + 0.05, STORE.parapetY + 0.05, -0.9);
  AddWire(parent, power, new THREE.Vector3(corner.x, LEVELS.CURB + 5.7, corner.z), roofHook, WIRE_RADIUS.SERVICE, 0.03);
  AddCylinder(parent, ToonMaterials.Get('#eef0f2'), 0.03, 0.03, 0.1, [roofHook.x, roofHook.y - 0.1, roofHook.z], { segments: 6 });
}
