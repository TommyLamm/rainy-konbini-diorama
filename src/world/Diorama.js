import * as THREE from 'three';
import { CAMERA, PUDDLES } from '../config/SceneConfig.js';
import { EaveDrips } from '../effects/EaveDrips.js';
import { Rain } from '../effects/Rain.js';
import { RippleRings } from '../effects/RippleRings.js';
import { Steam } from '../effects/Steam.js';
import { CreateBackdropTexture } from '../textures/GroundTextures.js';
import { MergeStaticMeshes } from '../utils/StaticMerge.js';
import { BuildBasePlinth } from './BasePlinth.js';
import { BuildGround } from './Ground.js';
import { BuildLightDecals } from './LightDecals.js';
import { BuildLighting, GetRainGlintSources } from './Lighting.js';
import { BuildNeighborhood } from './Neighborhood.js';
import { GetDripEdges, GetRainColliders, GetSplashZones, GroundHeightAt } from './RainColliders.js';
import { BuildStoreFrontProps } from './props/StoreFrontProps.js';
import { AutoDoor } from './store/AutoDoor.js';
import { BuildStoreInterior } from './store/StoreInterior.js';
import { BuildStoreShell } from './store/StoreShell.js';
import { BuildStreetFixtures } from './street/StreetFixtures.js';
import { BuildTrafficSignals } from './street/TrafficSignals.js';
import { BuildUtilityPoles } from './street/UtilityPoles.js';

/**
 * Assembles the rainy-night konbini corner on its plinth and wires every
 * animated part into the app loop.
 */
export class Diorama {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    app.scene.background = CreateBackdropTexture();

    const root = new THREE.Group();
    root.name = 'Diorama';
    app.scene.add(root);
    const staticRoot = new THREE.Group();
    const effectsRoot = new THREE.Group();
    root.add(staticRoot, effectsRoot);

    const animated = [BuildLighting(root)];
    BuildBasePlinth(staticRoot);
    BuildGround(staticRoot, app.reflection);
    animated.push(BuildStoreShell(staticRoot));
    const door = new AutoDoor(staticRoot);
    animated.push(door);
    const { steamOrigins } = BuildStoreInterior(staticRoot);
    animated.push(BuildStoreFrontProps(staticRoot));
    BuildUtilityPoles(staticRoot);
    animated.push(BuildTrafficSignals(staticRoot));
    animated.push(BuildStreetFixtures(staticRoot));
    animated.push(BuildNeighborhood(staticRoot));
    animated.push(BuildLightDecals(effectsRoot, door));

    const stats = MergeStaticMeshes(staticRoot);
    console.info(`[Diorama] static meshes merged: ${stats.before} -> ${stats.after}`);

    const rain = new Rain(effectsRoot, GetRainColliders(), GetRainGlintSources());
    new EaveDrips(effectsRoot, GetDripEdges(), GroundHeightAt);
    new RippleRings(effectsRoot, PUDDLES, GetSplashZones());
    const steam = new Steam(effectsRoot, steamOrigins);
    app.AddResizeListener((_, heightPixels) => {
      rain.SetViewport(heightPixels, CAMERA.FOV);
      steam.SetViewport(heightPixels, CAMERA.FOV);
    });

    animated.forEach((item) => app.animationHub.Add(item));
    app.RefreshShadows();
  }
}
