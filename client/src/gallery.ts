import { Vector3, type Scene } from '@babylonjs/core';
import type { MobType } from '@shared/game';
import { GameScene } from './game/scene';
import { World3D } from './game/world';
import { IDLE, buildHuman, buildMob, type Rig } from './game/models';

/** Geliştirme galerisi: tüm modelleri yan yana gösterir (?gallery=1). */
export function startGallery(canvas: HTMLCanvasElement) {
  const gs = new GameScene(canvas, 'high'); const w = new World3D(gs.scene);
  const rigs: { rig: Rig; speed: number; attack: number; t: number }[] = [];
  const put = (rig: Rig, x: number, z: number, o: { speed?: number; attack?: number } = {}) => { rig.root.position.set(x, 0, z); rig.root.rotation.y = Math.PI; rigs.push({ rig, speed: o.speed ?? 0, attack: o.attack ?? -1, t: 0 }); };
  const bs = ['gok', 'yer', 'ay'] as const;
  bs.forEach((b, i) => put(buildHuman(gs.scene, { boy: b }), -9 + i * 3.2, 0, { speed: i === 1 ? 4 : 0, attack: i === 2 ? 0.45 : -1 }));
  put(buildHuman(gs.scene, { boy: 'gok', spec: 'kalkan' }), 1, 0); put(buildHuman(gs.scene, { boy: 'yer', spec: 'kilic' }), 4, 0);
  put(buildHuman(gs.scene, { boy: 'ay', kind: 'aksakal' }), 7, 0); put(buildHuman(gs.scene, { boy: 'yer', kind: 'demirci' }), 10, 0); put(buildHuman(gs.scene, { boy: 'gok', kind: 'guard' }), 13, 0);
  (['tepegoz', 'albasti', 'erlik', 'cakal'] as MobType[]).forEach((m, i) => put(buildMob(gs.scene, m), -6 + i * 4.5, 8, { speed: i % 2 ? 3 : 0, attack: i === 2 ? 0.5 : -1 }));
  put(buildMob(gs.scene, 'bekci'), 12, 9);
  const q = new URLSearchParams(location.search);
  const view = q.get('view') ?? 'close';
  const cam = gs.camera;
  if (view === 'close') { cam.setTarget(new Vector3(1, 1.6, 2)); cam.alpha = -Math.PI / 2 - 0.15; cam.beta = 1.25; cam.radius = 17; cam.upperRadiusLimit = 80; }
  else if (view === 'hub') { cam.setTarget(new Vector3(0, 2, 0)); cam.alpha = -Math.PI / 2 + 0.5; cam.beta = 1.0; cam.radius = 46; cam.upperRadiusLimit = 100; for (const r of rigs) r.rig.root.setEnabled(false); }
  else if (view === 'mobs') { cam.setTarget(new Vector3(3, 1.6, 8)); cam.alpha = -Math.PI / 2; cam.beta = 1.2; cam.radius = 20; }
  else if (view === 'humans') { cam.setTarget(new Vector3(-3, 1.7, 0)); cam.alpha = -Math.PI / 2; cam.beta = 1.3; cam.radius = 9; cam.lowerRadiusLimit = 4; }
  else if (view === 'humans2') { cam.setTarget(new Vector3(7, 1.7, 0)); cam.alpha = -Math.PI / 2; cam.beta = 1.3; cam.radius = 12; cam.lowerRadiusLimit = 4; }
  gs.scene.onBeforeRenderObservable.add(() => {
    const dt = gs.engine.getDeltaTime() / 1000; w.update(dt);
    for (const r of rigs) { r.t += dt; const att = r.attack >= 0 ? (r.attack + r.t * 0.0) : -1; r.rig.update({ ...IDLE, speed: r.speed, attack: att, t: r.t, dt }); }
  });
  (window as unknown as { __gs: GameScene }).__gs = gs;
  gs.engine.runRenderLoop(() => gs.scene.render());
  (window as unknown as { __ready: boolean }).__ready = true;
  return gs as unknown as { scene: Scene };
}
