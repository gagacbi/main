import { Color3, Mesh, TransformNode, type Scene, type ShaderMaterial } from '@babylonjs/core';
import { BOY_COLORS, type Boy, type MobType, type Spec } from '@shared/game';
import { build, type PartSpec, type V3 } from './meshkit';
import { addOutline, setFlash, toonMaterial } from './toon';

export interface AnimState {
  /** yatay hız (birim/sn) */ speed: number;
  /** saldırı ilerlemesi 0..1, hareketsizse -1 */ attack: number;
  /** vurulma flaşı 0..1 */ hit: number;
  /** ölüm ilerlemesi 0..1, canlıysa -1 */ dead: number;
  stunned: boolean; t: number; dt: number; casting: number;
}
export const IDLE: AnimState = { speed: 0, attack: -1, hit: 0, dead: -1, stunned: false, t: 0, dt: 0.016, casting: -1 };

export class Rig {
  root: TransformNode; mat: ShaderMaterial; pivots: Record<string, TransformNode> = {}; meshes: Mesh[] = [];
  height = 2.6; scale = 1; baseY = 0; flashColor = Color3.White();
  extra: ((s: AnimState, rig: Rig) => void) | null = null;
  constructor(public scene: Scene, name: string) {
    this.root = new TransformNode(name, scene);
    this.mat = toonMaterial(scene, { vertexColors: true });
  }
  /** Parçaları pivot'a bağlı tek mesh olarak ekler. */
  part(name: string, specs: PartSpec[], at: V3 = [0, 0, 0], parent?: string, outline = true): TransformNode {
    const piv = new TransformNode(name, this.scene);
    piv.parent = parent ? this.pivots[parent] : this.root; piv.position.set(...at);
    const m = build(this.scene, name + '_m', specs); m.material = this.mat; m.parent = piv; this.meshes.push(m);
    if (outline) { const o = addOutline(m, this.scene); this.meshes.push(o); }
    this.pivots[name] = piv; return piv;
  }
  flash(a: number) { setFlash(this.mat, a, this.flashColor); }
  setScale(s: number) { this.scale = s; this.root.scaling.setAll(s); }
  update(s: AnimState) { this.extra?.(s, this); }
  setEnabled(v: boolean) { this.root.setEnabled(v); }
  dispose() { this.root.dispose(false, false); this.mat.dispose(); }
}

const SKIN = '#f4c79c'; const SKIN_D = '#e0a97f'; const HAIR = '#1d1620'; const STEEL = '#cfd9e6'; const LEATHER = '#6b4326'; const GOLD = '#f2c14e';
const sw = (a: number, f: number, t: number, ph = 0) => Math.sin(t * f + ph) * a;

// ─────────────────────────── İNSANSI ───────────────────────────
export interface HumanOpts { boy: Boy; spec?: Spec; kind?: 'player' | 'aksakal' | 'demirci' | 'guard'; red?: boolean }

export function buildHuman(scene: Scene, o: HumanOpts): Rig {
  const kind = o.kind ?? 'player';
  const rig = new Rig(scene, 'human');
  const bc = BOY_COLORS[o.boy];
  const robe = kind === 'aksakal';
  const main = kind === 'demirci' ? '#8a5a3a' : kind === 'guard' ? '#7d8a9c' : robe ? '#e9edf7' : bc.main;
  const accent = kind === 'demirci' ? '#d9a441' : kind === 'guard' ? '#c8352f' : robe ? '#4aa8ff' : bc.accent;
  const dark = kind === 'guard' ? '#4a5568' : kind === 'demirci' ? '#4a3020' : robe ? '#8fb8ff' : bc.dark;
  const stocky = kind === 'demirci' ? 1.18 : 1;

  // bacaklar
  const legSpec = (side: number): PartSpec[] => [
    { k: 'cyl', d: 0.26, h: 0.62, p: [0, -0.33, 0], c: robe ? main : '#4b3a55', c2: robe ? main : '#5a4766' },
    { k: 'sphere', d: 0.38, s: [1, 0.72, 1.35], p: [0, -0.64, 0.07], c: LEATHER },
    { k: 'torus', d: 0.28, th: 0.07, p: [0, -0.5, 0], c: accent },
  ];
  rig.part('legL', legSpec(-1), [-0.2, 0.8, 0]); rig.part('legR', legSpec(1), [0.2, 0.8, 0]);

  // gövde
  const body: PartSpec[] = [
    { k: 'sphere', d: 0.84 * stocky, s: [1, 0.95, 0.82], p: [0, 1.1, 0], c: main, c2: main },
    { k: 'cone', db: robe ? 1.25 : 0.98, dt: 0.78, h: robe ? 0.95 : 0.4, p: [0, robe ? 0.38 : 0.7, 0], c: main, c2: dark },
    { k: 'cyl', d: 0.86 * stocky, h: 0.13, p: [0, 0.88, 0], c: kind === 'demirci' ? '#3a2616' : accent },
    { k: 'sphere', d: 0.16, p: [0, 0.88, 0.42 * stocky], s: [1, 1, 0.5], c: GOLD, gloss: 0.6 },
    { k: 'torus', d: 0.96, th: 0.07, p: [0, robe ? 0.0 : 0.52, 0], c: accent },
    { k: 'torus', d: 0.7, th: 0.09, p: [0, 1.33, 0], s: [1, 1, 1], c: dark },
  ];
  if (kind === 'player' || kind === 'guard') body.push({ k: 'box', w: 0.78, h: 0.85, dp: 0.07, p: [0, 1.05, -0.42], r: [0.12, 0, 0], c: dark }, { k: 'disc', d: 0.34, p: [0, 1.1, -0.465], r: [0, Math.PI, 0], c: accent });
  if (kind === 'demirci') body.push({ k: 'box', w: 0.62, h: 0.78, dp: 0.06, p: [0, 1.02, 0.4], c: '#5a3a24' });
  if (robe) body.push({ k: 'cone', db: 0.5, dt: 0.0, h: 0.9, p: [0, 0.75, 0.52], c: '#ffffff', c2: '#dfe8f8' }, { k: 'sphere', d: 0.42, p: [0, 1.0, 0.4], s: [1, 1.5, 0.7], c: '#ffffff' });
  rig.part('body', body, [0, 0, 0]);

  // baş + yüz + saç
  const head: PartSpec[] = [
    { k: 'sphere', d: 0.98, s: [1, 0.96, 0.98], p: [0, 0, 0], c: SKIN, c2: SKIN },
    // gözler
    { k: 'sphere', d: 0.22, s: [1, 1.25, 0.55], p: [-0.18, 0.03, 0.42], c: '#ffffff', gloss: 0.4 }, { k: 'sphere', d: 0.22, s: [1, 1.25, 0.55], p: [0.18, 0.03, 0.42], c: '#ffffff', gloss: 0.4 },
    { k: 'sphere', d: 0.12, p: [-0.18, 0.02, 0.475], c: '#2a1b12' }, { k: 'sphere', d: 0.12, p: [0.18, 0.02, 0.475], c: '#2a1b12' },
    { k: 'sphere', d: 0.045, p: [-0.15, 0.06, 0.52], c: '#ffffff' }, { k: 'sphere', d: 0.045, p: [0.21, 0.06, 0.52], c: '#ffffff' },
    // kaşlar
    { k: 'box', w: 0.17, h: 0.04, dp: 0.04, p: [-0.19, 0.19, 0.45], r: [0, 0, 0.22], c: HAIR }, { k: 'box', w: 0.17, h: 0.04, dp: 0.04, p: [0.19, 0.19, 0.45], r: [0, 0, -0.22], c: HAIR },
    // burun, yanak
    { k: 'sphere', d: 0.15, p: [0, -0.07, 0.5], s: [1, 1.1, 0.9], c: SKIN_D },
    { k: 'disc', d: 0.16, p: [-0.3, -0.12, 0.38], r: [0, -0.7, 0], c: '#ff9a8a' }, { k: 'disc', d: 0.16, p: [0.3, -0.12, 0.38], r: [0, 0.7, 0], c: '#ff9a8a' },
    // ağız (gülümseme)
    { k: 'torus', d: 0.2, th: 0.035, p: [0, -0.2, 0.44], r: [Math.PI / 2 - 0.4, 0, 0], s: [1, 1, 0.5], c: '#8a3a2a' },
  ];
  if (kind === 'player' || kind === 'guard' || kind === 'demirci') {
    head.push({ k: 'cap', d: 0.07, h: 0.3, p: [-0.1, -0.16, 0.45], r: [0, 0, Math.PI / 2 - 0.35], c: HAIR }, { k: 'cap', d: 0.07, h: 0.3, p: [0.1, -0.16, 0.45], r: [0, 0, -(Math.PI / 2 - 0.35)], c: HAIR });
  }
  if (robe) head.push({ k: 'cone', db: 0.82, dt: 0.1, h: 0.95, p: [0, -0.6, 0.18], r: [0.18, 0, 0], c: '#ffffff', c2: '#e9eefc' }, { k: 'sphere', d: 0.5, p: [0, -0.2, 0.3], s: [1.15, 0.9, 0.9], c: '#ffffff' });
  if (kind === 'player' || kind === 'guard') {
    // saç örgüleri
    for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) head.push({ k: 'sphere', d: 0.2 - i * 0.012, p: [sd * (0.5 + i * 0.03), -0.18 - i * 0.2, -0.08 - i * 0.02], s: [1, 1.15, 1], c: HAIR });
    head.push({ k: 'sphere', d: 1.02, s: [1, 0.74, 1], p: [0, 0.12, -0.1], c: HAIR });
  }
  rig.part('head', head, [0, 1.74, 0]);

  // başlık
  const hat: PartSpec[] = [];
  if (kind === 'guard') {
    hat.push({ k: 'sphere', d: 1.08, s: [1, 0.8, 1.05], p: [0, 0.1, -0.02], c: '#9aa7b8', gloss: 0.6 }, { k: 'cone', db: 0.4, dt: 0, h: 0.4, p: [0, 0.6, 0], c: '#9aa7b8', gloss: 0.6 }, { k: 'cone', db: 0.18, dt: 0.0, h: 0.8, p: [0, 0.75, -0.25], r: [-0.5, 0, 0], c: '#c8352f' });
  } else if (kind === 'demirci') {
    hat.push({ k: 'cyl', d: 0.95, h: 0.1, p: [0, 0.1, 0], c: '#3b2a1c' });
  } else if (robe) {
    hat.push({ k: 'cyl', dt: 0.62, db: 0.92, h: 0.45, p: [0, 0.34, 0], c: '#ffffff', c2: '#e6ecfa' }, { k: 'torus', d: 0.92, th: 0.12, p: [0, 0.1, 0], c: '#cfd8ea' }, { k: 'sphere', d: 0.2, p: [0, 0.62, 0], c: GOLD, gloss: 0.5 });
  } else if (o.boy === 'gok') {
    hat.push({ k: 'cyl', dt: 0.7, db: 0.98, h: 0.42, p: [0, 0.32, 0], c: bc.main, c2: '#7fc0ff' }, { k: 'torus', d: 0.98, th: 0.14, p: [0, 0.1, 0], c: '#ffffff' }, { k: 'sphere', d: 0.72, s: [1, 0.55, 1], p: [0, 0.56, 0], c: '#9ed0ff' });
    for (const [x, rz, h] of [[-0.18, 0.5, 0.95], [0, 0.0, 1.2], [0.18, -0.5, 0.95]] as [number, number, number][]) hat.push({ k: 'cone', db: 0.14, dt: 0.02, h, p: [x * 1.5, 0.95 + h * 0.25 - Math.abs(x) * 0.6, -0.12], r: [-0.35, 0, rz], c: '#ffffff', c2: '#4aa8ff' });
  } else if (o.boy === 'yer') {
    hat.push({ k: 'sphere', d: 1.12, s: [1, 0.62, 1.05], p: [0, 0.2, 0], c: '#7a5a3a', c2: '#a0794d' }, { k: 'torus', d: 1.0, th: 0.2, p: [0, 0.08, 0], c: '#a0794d' }, { k: 'sphere', d: 0.7, s: [1, 0.55, 1], p: [0, 0.5, 0], c: '#4fae5a' });
    for (const sd of [-1, 1]) hat.push({ k: 'cone', db: 0.34, dt: 0.0, h: 0.62, p: [sd * 0.34, 0.66, 0.0], r: [0, 0, -sd * 0.28], c: '#6b4a2c', c2: '#4fae5a' });
  } else {
    hat.push({ k: 'cyl', dt: 0.74, db: 0.98, h: 0.38, p: [0, 0.3, 0], c: '#d9cdf5', c2: '#b9a8e8' }, { k: 'torus', d: 0.98, th: 0.13, p: [0, 0.1, 0], c: '#f4f1ff', gloss: 0.5 }, { k: 'sphere', d: 0.18, p: [0, 0.56, 0.0], c: '#6a4fa8', gloss: 0.6 });
    for (const sd of [-1, 1]) {
      hat.push({ k: 'cyl', dt: 0.05, db: 0.08, h: 0.8, p: [sd * 0.34, 0.8, 0], r: [0, 0, -sd * 0.42], c: '#fff4d8' });
      hat.push({ k: 'cyl', dt: 0.03, db: 0.05, h: 0.42, p: [sd * 0.58, 1.02, 0], r: [0, 0, -sd * 0.05], c: '#fff4d8' });
      hat.push({ k: 'cyl', dt: 0.03, db: 0.05, h: 0.36, p: [sd * 0.42, 1.0, 0.0], r: [0, 0, sd * 0.5], c: '#fff4d8' });
      hat.push({ k: 'sphere', d: 0.07, p: [sd * 0.62, 1.24, 0], c: '#fff4d8' });
    }
  }
  rig.part('hat', hat, [0, 0.27, 0], 'head');

  // kollar + eller
  const sleeve = (side: number): PartSpec[] => [
    { k: 'cyl', d: 0.24 * stocky, h: 0.52, p: [0, -0.26, 0], c: kind === 'demirci' ? SKIN : main, c2: kind === 'demirci' ? SKIN : dark },
    { k: 'torus', d: 0.3, th: 0.07, p: [0, -0.48, 0], c: kind === 'demirci' ? '#3a2616' : accent },
    { k: 'sphere', d: 0.3 * stocky, p: [0, -0.58, 0.02], c: SKIN },
    { k: 'sphere', d: 0.3, p: [0, 0, 0], c: main },
  ];
  rig.part('armL', sleeve(-1), [-0.52 * stocky, 1.38, 0]); rig.part('armR', sleeve(1), [0.52 * stocky, 1.38, 0]);

  // silah / kalkan
  const spec = o.spec ?? 'none';
  if (kind === 'player' || kind === 'guard') {
    const sword: PartSpec[] = [];
    if (kind === 'guard') {
      sword.push({ k: 'cyl', d: 0.07, h: 2.2, p: [0, 0.4, 0], c: '#8a5a32' }, { k: 'cone', db: 0.2, dt: 0, h: 0.55, p: [0, 1.7, 0], c: STEEL, gloss: 0.8 });
      rig.part('weapon', sword, [0, -0.58, 0.08], 'armR');
    } else if (spec === 'kilic') {
      sword.push({ k: 'cyl', d: 0.08, h: 0.34, p: [0, 0.0, 0], c: LEATHER }, { k: 'box', w: 0.42, h: 0.07, dp: 0.1, p: [0, 0.2, 0], c: GOLD, gloss: 0.6 },
        { k: 'box', w: 0.16, h: 0.8, dp: 0.045, p: [0, 0.65, 0], c: STEEL, gloss: 0.85 }, { k: 'box', w: 0.19, h: 0.7, dp: 0.045, p: [0.03, 1.3, 0.01], r: [0, 0, -0.14], c: STEEL, gloss: 0.85 },
        { k: 'cone', db: 0.19, dt: 0, h: 0.34, p: [0.1, 1.82, 0.02], r: [0, 0, -0.36], c: '#ffffff', gloss: 0.9 }, { k: 'sphere', d: 0.14, p: [0, -0.2, 0], c: GOLD });
      rig.part('weapon', sword, [0, -0.58, 0.08], 'armR');
    } else {
      sword.push({ k: 'cyl', d: 0.08, h: 0.3, p: [0, 0.0, 0], c: LEATHER }, { k: 'box', w: 0.36, h: 0.07, dp: 0.1, p: [0, 0.18, 0], c: GOLD, gloss: 0.6 },
        { k: 'box', w: 0.14, h: 1.0, dp: 0.045, p: [0, 0.72, 0], c: STEEL, gloss: 0.85 }, { k: 'cone', db: 0.14, dt: 0, h: 0.28, p: [0, 1.36, 0], c: STEEL, gloss: 0.85 }, { k: 'sphere', d: 0.13, p: [0, -0.2, 0], c: GOLD });
      rig.part('weapon', sword, [0, -0.58, 0.08], 'armR');
    }
    if (kind === 'player' && spec !== 'kilic') {
      const big = spec === 'kalkan'; const D = big ? 1.15 : 0.78;
      rig.part('shield', [
        { k: 'cyl', d: D, h: 0.09, p: [0, 0, 0], r: [Math.PI / 2, 0, 0], c: bc.main, c2: bc.main },
        { k: 'torus', d: D * 0.98, th: 0.09, p: [0, 0, 0.05], r: [Math.PI / 2, 0, 0], c: GOLD, gloss: 0.6 },
        { k: 'torus', d: D * 0.62, th: 0.06, p: [0, 0, 0.06], r: [Math.PI / 2, 0, 0], c: bc.accent },
        { k: 'sphere', d: D * 0.26, s: [1, 1, 0.55], p: [0, 0, 0.09], c: GOLD, gloss: 0.7 },
        ...[0, 1, 2, 3, 4, 5].map((i): PartSpec => ({ k: 'sphere', d: 0.07, p: [Math.cos(i * 1.047) * D * 0.4, Math.sin(i * 1.047) * D * 0.4, 0.07], c: bc.dark })),
      ], [-0.1, -0.5, 0.28], 'armL');
    }
  }
  if (kind === 'demirci') rig.part('weapon', [{ k: 'cyl', d: 0.09, h: 0.8, p: [0, 0.25, 0], c: '#6b4326' }, { k: 'box', w: 0.5, h: 0.3, dp: 0.28, p: [0, 0.7, 0], c: '#7b8794', gloss: 0.6 }], [0, -0.58, 0.08], 'armR');
  if (robe) rig.part('weapon', [{ k: 'cyl', d: 0.07, h: 2.3, p: [0, 0.55, 0], c: '#8a5a32' }, { k: 'torus', d: 0.34, th: 0.06, p: [0, 1.75, 0], r: [0, Math.PI / 2, 0], c: GOLD, gloss: 0.6 }, { k: 'sphere', d: 0.2, p: [0, 1.75, 0], c: '#7fc0ff', gloss: 0.5 }], [0, -0.58, 0.1], 'armL');

  // duruş: silah eli
  if (rig.pivots.weapon) rig.pivots.weapon.rotation.x = kind === 'guard' ? 0 : -0.35;
  if (kind === 'demirci' && rig.pivots.weapon) rig.pivots.weapon.rotation.x = -1.1;
  rig.height = 2.9;

  // ─ animasyon ─
  const L = rig.pivots.legL, R = rig.pivots.legR, aL = rig.pivots.armL, aR = rig.pivots.armR, B = rig.pivots.body, H = rig.pivots.head;
  rig.extra = (s, r) => {
    const moving = Math.min(1, s.speed / 3.2); const ph = s.t * (7 + Math.min(s.speed, 9) * 0.9);
    const swing = Math.sin(ph) * 0.85 * moving;
    L.rotation.x = swing; R.rotation.x = -swing;
    const bob = Math.abs(Math.sin(ph)) * 0.09 * moving + Math.sin(s.t * 2.2) * 0.012 * (1 - moving);
    B.position.y = bob; H.position.y = 1.74 + bob * 1.1 + Math.sin(s.t * 2.2) * 0.012;
    const baseRot = kind === 'guard' ? -0.08 : 0;
    aL.rotation.x = -swing * 0.8; aL.rotation.z = 0.12;
    const idleArm = Math.sin(s.t * 2.2) * 0.04;
    if (kind === 'demirci') {
      const hh = (Math.sin(s.t * 4.2) * 0.5 + 0.5);
      aR.rotation.x = -1.9 + hh * 1.5; aR.rotation.z = -0.25; B.rotation.x = 0.05 + hh * 0.1;
    } else if (s.attack >= 0 && kind === 'player') {
      const a = s.attack; const e = a < 0.28 ? -2.5 * (a / 0.28) : -2.5 + 4.2 * Math.min(1, (a - 0.28) / 0.32) - (a > 0.6 ? 1.2 * ((a - 0.6) / 0.4) : 0);
      aR.rotation.x = e; aR.rotation.z = -0.25 - (a > 0.28 ? 0.2 : 0); B.rotation.y = (a < 0.28 ? -0.35 * (a / 0.28) : -0.35 + 0.85 * Math.min(1, (a - 0.28) / 0.3)) * (a > 0.75 ? (1 - (a - 0.75) / 0.25) : 1);
      B.rotation.x = 0.12;
    } else {
      aR.rotation.x = swing * 0.8 + baseRot + idleArm - (kind === 'player' ? 0.25 : 0); aR.rotation.z = -0.12; B.rotation.y *= 0.8; B.rotation.x = moving * 0.1;
    }
    if (s.casting >= 0 && kind === 'player') { const c = Math.sin(Math.min(1, s.casting) * Math.PI); aL.rotation.x = -2.3 * c; aR.rotation.x = -2.3 * c; B.rotation.x = -0.12 * c; }
    if (s.stunned) { H.rotation.z = Math.sin(s.t * 14) * 0.18; } else H.rotation.z *= 0.85;
    if (s.dead >= 0) { const d = Math.min(1, s.dead * 2.2); r.root.rotation.x = -d * 1.5; r.root.position.y = r.baseY + 0.1 * d; }
    else { r.root.rotation.x = 0; }
  };
  return rig;
}

// ─────────────────────────── YARATIKLAR ───────────────────────────
function eye(x: number, y: number, z: number, d: number, iris = '#3a2210'): PartSpec[] {
  return [
    { k: 'sphere', d, s: [1, 1.1, 0.6], p: [x, y, z], c: '#ffffff', gloss: 0.5 },
    { k: 'sphere', d: d * 0.55, p: [x, y, z + d * 0.18], s: [1, 1, 0.6], c: iris },
    { k: 'sphere', d: d * 0.28, p: [x, y, z + d * 0.28], c: '#0c0810' },
    { k: 'sphere', d: d * 0.14, p: [x + d * 0.1, y + d * 0.13, z + d * 0.36], c: '#ffffff' },
  ];
}

export function buildMob(scene: Scene, type: MobType): Rig {
  const rig = new Rig(scene, 'mob_' + type);
  switch (type) {
    case 'tepegoz': {
      // sevimli tek gözlü irikıyım
      rig.part('legL', [{ k: 'cyl', d: 0.34, h: 0.42, p: [0, -0.2, 0], c: '#d99a58' }, { k: 'sphere', d: 0.44, s: [1, 0.6, 1.3], p: [0, -0.42, 0.06], c: '#7b4a2a' }], [-0.28, 0.5, 0]);
      rig.part('legR', [{ k: 'cyl', d: 0.34, h: 0.42, p: [0, -0.2, 0], c: '#d99a58' }, { k: 'sphere', d: 0.44, s: [1, 0.6, 1.3], p: [0, -0.42, 0.06], c: '#7b4a2a' }], [0.28, 0.5, 0]);
      rig.part('body', [
        { k: 'sphere', d: 1.5, s: [1, 1.0, 0.92], p: [0, 0.4, 0], c: '#e7a867', c2: '#f3c188' },
        { k: 'sphere', d: 0.9, s: [1, 0.8, 0.5], p: [0, 0.25, 0.46], c: '#f6d6aa' },
        // dev tek göz
        { k: 'sphere', d: 0.8, s: [1, 1.02, 0.55], p: [0, 0.62, 0.62], c: '#ffffff', gloss: 0.5 },
        { k: 'sphere', d: 0.46, s: [1, 1, 0.6], p: [0, 0.6, 0.86], c: '#58a8ff' },
        { k: 'sphere', d: 0.24, s: [1, 1, 0.6], p: [0, 0.6, 0.98], c: '#0c0810' },
        { k: 'sphere', d: 0.1, p: [0.08, 0.7, 1.05], c: '#ffffff' },
        // üst göz kapağı + boynuz
        { k: 'cone', db: 0.2, dt: 0, h: 0.42, p: [0, 1.28, 0.1], c: '#fff1cf' },
        { k: 'cone', db: 0.14, dt: 0, h: 0.3, p: [-0.3, 1.16, 0.0], r: [0, 0, 0.5], c: '#fff1cf' }, { k: 'cone', db: 0.14, dt: 0, h: 0.3, p: [0.3, 1.16, 0.0], r: [0, 0, -0.5], c: '#fff1cf' },
        // ağız ve dişler
        { k: 'torus', d: 0.5, th: 0.07, p: [0, 0.0, 0.7], r: [Math.PI / 2 - 0.15, 0, 0], s: [1, 1, 0.55], c: '#6a2a1a' },
        ...[-0.14, 0, 0.14].map((x): PartSpec => ({ k: 'cone', db: 0.09, dt: 0, h: 0.14, p: [x, 0.08, 0.76], r: [Math.PI, 0, 0], c: '#ffffff' })),
        // tüyler / kürk şeridi
        { k: 'torus', d: 1.3, th: 0.14, p: [0, 0.0, 0], c: '#9b5a34' },
        { k: 'cone', db: 0.34, dt: 0, h: 0.6, p: [0, 0.5, -0.7], r: [-0.9, 0, 0], c: '#c47a42' },
      ], [0, 0.55, 0]);
      rig.part('armL', [{ k: 'cyl', d: 0.3, h: 0.5, p: [0, -0.25, 0], c: '#e7a867' }, { k: 'sphere', d: 0.4, p: [0, -0.55, 0], c: '#f3c188' }], [-0.78, 1.0, 0]);
      rig.part('armR', [{ k: 'cyl', d: 0.3, h: 0.5, p: [0, -0.25, 0], c: '#e7a867' }, { k: 'sphere', d: 0.4, p: [0, -0.55, 0], c: '#f3c188' }], [0.78, 1.0, 0]);
      rig.part('club', [{ k: 'cyl', dt: 0.5, db: 0.14, h: 1.3, p: [0, 0.55, 0], c: '#8a5a32', c2: '#b07a48' }, ...[0, 1, 2, 3, 4].map((i): PartSpec => ({ k: 'cone', db: 0.1, dt: 0, h: 0.2, p: [Math.cos(i * 1.256) * 0.26, 0.95, Math.sin(i * 1.256) * 0.26], r: [Math.sin(i * 1.256) * 1.3, 0, -Math.cos(i * 1.256) * 1.3], c: '#d8d2c0' }))], [0, -0.55, 0.1], 'armR');
      rig.pivots.club.rotation.x = -0.4;
      rig.height = 2.4;
      const { legL, legR, body, armL, armR } = rig.pivots;
      rig.extra = (s) => {
        const mv = Math.min(1, s.speed / 3); const ph = s.t * 6; const sg = Math.sin(ph) * 0.7 * mv;
        legL.rotation.x = sg; legR.rotation.x = -sg;
        body.position.y = 0.55 + Math.abs(Math.sin(ph)) * 0.12 * mv + Math.sin(s.t * 2) * 0.02; body.rotation.z = Math.sin(ph) * 0.1 * mv; body.scaling.set(1 + Math.sin(s.t * 2) * 0.012, 1 - Math.sin(s.t * 2) * 0.012, 1);
        if (s.attack >= 0) { const a = s.attack; armR.rotation.x = a < 0.4 ? -2.6 * (a / 0.4) : -2.6 + 4 * Math.min(1, (a - 0.4) / 0.2) - 1.4 * Math.max(0, (a - 0.6) / 0.4); armL.rotation.x = -1.2 * Math.sin(a * 3); body.rotation.x = a > 0.4 ? 0.3 : -0.15; }
        else { armR.rotation.x = -sg * 0.6 - 0.2; armL.rotation.x = sg * 0.6; body.rotation.x *= 0.85; }
        if (s.dead >= 0) { rig.root.rotation.z = s.dead * 1.4; }
      };
      break;
    }
    case 'albasti': {
      const SK = '#f2b6c6';
      rig.part('body', [
        // kabarık etek
        { k: 'cone', db: 1.25, dt: 0.5, h: 1.3, p: [0, 0.25, 0], c: '#b45bd1', c2: '#e09cf0' },
        { k: 'torus', d: 1.1, th: 0.1, p: [0, -0.35, 0], c: '#ffd166' },
        { k: 'cone', db: 0.34, dt: 0, h: 0.5, p: [0.5, -0.5, 0.2], r: [0, 0, 0.5], c: '#b45bd1' }, { k: 'cone', db: 0.34, dt: 0, h: 0.5, p: [-0.5, -0.5, -0.1], r: [0, 0, -0.5], c: '#b45bd1' },
        { k: 'sphere', d: 0.8, s: [1, 1, 0.85], p: [0, 1.0, 0], c: '#d86be0', c2: '#f0a0f8' },
        // baş
        { k: 'sphere', d: 0.92, p: [0, 1.55, 0], s: [1, 0.98, 0.95], c: SK, c2: '#ffd2dc' },
        ...eye(-0.18, 1.6, 0.38, 0.26, '#e23b5a'), ...eye(0.18, 1.6, 0.38, 0.26, '#e23b5a'),
        { k: 'box', w: 0.26, h: 0.05, dp: 0.05, p: [-0.19, 1.8, 0.4], r: [0, 0, -0.35], c: '#5a1a3a' }, { k: 'box', w: 0.26, h: 0.05, dp: 0.05, p: [0.19, 1.8, 0.4], r: [0, 0, 0.35], c: '#5a1a3a' },
        { k: 'torus', d: 0.34, th: 0.045, p: [0, 1.36, 0.4], r: [Math.PI / 2 - 0.3, 0, 0], s: [1, 1, 0.5], c: '#7a1a3a' },
        ...[-0.08, 0.08].map((x): PartSpec => ({ k: 'cone', db: 0.06, dt: 0, h: 0.09, p: [x, 1.35, 0.46], r: [Math.PI, 0, 0], c: '#fff' })),
        // sivri kulaklar
        { k: 'cone', db: 0.22, dt: 0, h: 0.6, p: [-0.58, 1.62, 0], r: [0, 0, Math.PI / 2 + 0.3], c: SK }, { k: 'cone', db: 0.22, dt: 0, h: 0.6, p: [0.58, 1.62, 0], r: [0, 0, -(Math.PI / 2 + 0.3)], c: SK },
        // ateş kızılı saç
        ...Array.from({ length: 9 }, (_, i): PartSpec => { const a = (i / 9) * Math.PI * 2; return { k: 'cone', db: 0.34, dt: 0, h: 1.2 + (i % 3) * 0.3, p: [Math.sin(a) * 0.52, 1.7 + Math.cos(a) * 0.3 - 0.1, -0.2 + Math.cos(a) * 0.3 - 0.2], r: [-0.6 + Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.9], c: '#ff5a2a', c2: '#ffb02e' }; }),
        { k: 'sphere', d: 1.0, s: [1, 0.6, 1], p: [0, 1.95, -0.1], c: '#e23a1c' },
      ], [0, 0.4, 0]);
      for (const sd of [-1, 1]) rig.part(sd < 0 ? 'armL' : 'armR', [
        { k: 'cyl', dt: 0.1, db: 0.16, h: 0.85, p: [0, -0.4, 0], c: SK }, { k: 'sphere', d: 0.26, p: [0, -0.88, 0], c: SK },
        ...[-1, 0, 1].map((i): PartSpec => ({ k: 'cone', db: 0.07, dt: 0, h: 0.28, p: [i * 0.07, -1.08, 0.02], r: [0.1, 0, i * 0.2], c: '#ffffff' })),
      ], [sd * 0.55, 1.75, 0]);
      rig.part('comb', [{ k: 'box', w: 0.5, h: 0.12, dp: 0.06, p: [0, 0, 0], c: '#ffe0a0' }, ...Array.from({ length: 6 }, (_, i): PartSpec => ({ k: 'box', w: 0.04, h: 0.2, dp: 0.04, p: [-0.22 + i * 0.088, -0.15, 0], c: '#ffe0a0' }))], [0, -0.95, 0.1], 'armR');
      rig.height = 3.4;
      const { body, armL, armR } = rig.pivots;
      rig.extra = (s) => {
        const fl = Math.sin(s.t * 2.6); body.position.y = 0.4 + 0.35 + fl * 0.14; body.rotation.z = Math.sin(s.t * 1.3) * 0.06 + Math.min(1, s.speed / 4) * 0.0;
        body.rotation.x = Math.min(1, s.speed / 4) * 0.28;
        armL.rotation.z = 0.3 + fl * 0.1; armR.rotation.z = -0.3 - fl * 0.1; armL.rotation.x = -0.3; armR.rotation.x = -0.3;
        if (s.attack >= 0) { const a = Math.sin(Math.min(1, s.attack) * Math.PI); armR.rotation.x = -2.2 * a; armL.rotation.x = -2.2 * a; body.rotation.x = 0.4 * a; }
        if (s.dead >= 0) { rig.root.rotation.z = s.dead * 1.2; }
      };
      break;
    }
    case 'erlik': {
      const P = '#7a3fc4'; const P2 = '#a56bff';
      rig.part('legL', [{ k: 'cyl', d: 0.22, h: 0.5, p: [0, -0.25, 0], c: P }, { k: 'cone', db: 0.34, dt: 0.15, h: 0.18, p: [0, -0.54, 0.08], r: [Math.PI / 2, 0, 0], c: '#2a1840' }], [-0.22, 0.6, 0]);
      rig.part('legR', [{ k: 'cyl', d: 0.22, h: 0.5, p: [0, -0.25, 0], c: P }, { k: 'cone', db: 0.34, dt: 0.15, h: 0.18, p: [0, -0.54, 0.08], r: [Math.PI / 2, 0, 0], c: '#2a1840' }], [0.22, 0.6, 0]);
      rig.part('body', [
        { k: 'sphere', d: 0.86, s: [1, 1.05, 0.85], p: [0, 0.35, 0], c: P, c2: P2 },
        { k: 'sphere', d: 0.26, s: [1, 1, 0.4], p: [0, 0.4, 0.34], c: '#ff3a5c', gloss: 0.6 },
        { k: 'torus', d: 0.34, th: 0.04, p: [0, 0.4, 0.37], r: [Math.PI / 2, 0, 0], c: '#ffd166' },
        // baş
        { k: 'sphere', d: 0.98, s: [1.05, 0.95, 0.95], p: [0, 1.15, 0], c: P2, c2: '#c49bff' },
        { k: 'sphere', d: 0.24, s: [1, 1.1, 0.5], p: [-0.2, 1.2, 0.4], c: '#ffee66' }, { k: 'sphere', d: 0.24, s: [1, 1.1, 0.5], p: [0.2, 1.2, 0.4], c: '#ffee66' },
        { k: 'sphere', d: 0.1, p: [-0.2, 1.2, 0.5], c: '#ff1a3a' }, { k: 'sphere', d: 0.1, p: [0.2, 1.2, 0.5], c: '#ff1a3a' },
        { k: 'box', w: 0.3, h: 0.06, dp: 0.05, p: [-0.2, 1.42, 0.42], r: [0, 0, -0.55], c: '#1a0f2a' }, { k: 'box', w: 0.3, h: 0.06, dp: 0.05, p: [0.2, 1.42, 0.42], r: [0, 0, 0.55], c: '#1a0f2a' },
        { k: 'torus', d: 0.42, th: 0.05, p: [0, 0.93, 0.4], r: [Math.PI / 2 - 0.2, 0, 0], s: [1, 1, 0.5], c: '#2a0f2a' },
        ...[-0.12, 0, 0.12].map((x): PartSpec => ({ k: 'cone', db: 0.08, dt: 0, h: 0.12, p: [x, 0.96, 0.44], r: [Math.PI, 0, 0], c: '#fff' })),
        // boynuzlar + kulaklar
        { k: 'cone', db: 0.24, dt: 0, h: 0.68, p: [-0.34, 1.78, 0], r: [0, 0, 0.45], c: '#fff0c8', c2: '#f4e2a8' }, { k: 'cone', db: 0.24, dt: 0, h: 0.68, p: [0.34, 1.78, 0], r: [0, 0, -0.45], c: '#fff0c8', c2: '#f4e2a8' },
        { k: 'cone', db: 0.24, dt: 0, h: 0.55, p: [-0.62, 1.2, 0], r: [0, 0, Math.PI / 2 + 0.2], c: P2 }, { k: 'cone', db: 0.24, dt: 0, h: 0.55, p: [0.62, 1.2, 0], r: [0, 0, -(Math.PI / 2 + 0.2)], c: P2 },
        // kuyruk
        { k: 'cyl', d: 0.1, h: 0.9, p: [0, 0.1, -0.7], r: [1.1, 0, 0], c: P },
        { k: 'cone', db: 0.3, dt: 0, h: 0.34, p: [0, 0.48, -1.12], r: [1.1 + Math.PI, 0, 0], c: '#ff3a5c' },
      ], [0, 0.45, 0]);
      for (const sd of [-1, 1]) rig.part(sd < 0 ? 'wingL' : 'wingR', [
        { k: 'cone', db: 0.12, dt: 0.0, h: 1.0, p: [sd * 0.5, 0.1, 0], r: [0, 0, -sd * 1.2], c: '#3a1f66' },
        { k: 'cone', db: 0.1, dt: 0.0, h: 0.9, p: [sd * 0.4, -0.15, 0], r: [0, 0, -sd * 1.9], c: '#3a1f66' },
        { k: 'box', w: 0.9, h: 0.7, dp: 0.03, p: [sd * 0.55, -0.1, 0], r: [0, 0, -sd * 0.2], c: '#5a2fa0', c2: '#8c58e8' },
      ], [sd * 0.3, 1.1, -0.35]);
      for (const sd of [-1, 1]) rig.part(sd < 0 ? 'armL' : 'armR', [{ k: 'cyl', d: 0.18, h: 0.5, p: [0, -0.25, 0], c: P }, { k: 'sphere', d: 0.26, p: [0, -0.54, 0], c: '#c49bff' }], [sd * 0.5, 1.15, 0]);
      rig.part('fork', [{ k: 'cyl', d: 0.06, h: 1.2, p: [0, 0.4, 0], c: '#3a2a4a' }, { k: 'cone', db: 0.1, dt: 0, h: 0.4, p: [0, 1.2, 0], c: '#d9d2f0', gloss: 0.8 }, { k: 'cone', db: 0.08, dt: 0, h: 0.3, p: [-0.16, 1.1, 0], c: '#d9d2f0', gloss: 0.8 }, { k: 'cone', db: 0.08, dt: 0, h: 0.3, p: [0.16, 1.1, 0], c: '#d9d2f0', gloss: 0.8 }], [0, -0.55, 0.1], 'armR');
      rig.pivots.fork.rotation.x = -0.5;
      rig.height = 2.6;
      const { legL, legR, body, wingL, wingR, armL, armR } = rig.pivots;
      rig.extra = (s) => {
        const mv = Math.min(1, s.speed / 3.5); const ph = s.t * 9; const sg = Math.sin(ph) * 0.8 * mv;
        legL.rotation.x = sg; legR.rotation.x = -sg; body.position.y = 0.45 + Math.abs(Math.sin(ph)) * 0.1 * mv;
        const fl = Math.sin(s.t * (mv > 0.3 ? 14 : 5)) * 0.5; wingL.rotation.z = fl; wingR.rotation.z = -fl;
        armL.rotation.x = -sg * 0.6; armR.rotation.x = sg * 0.6 - 0.3;
        if (s.attack >= 0) { const a = s.attack; armR.rotation.x = a < 0.35 ? -2.4 * (a / 0.35) : -2.4 + 3.6 * Math.min(1, (a - 0.35) / 0.2); body.rotation.x = a > 0.35 ? 0.3 : -0.1; } else body.rotation.x *= 0.85;
        if (s.dead >= 0) { rig.root.rotation.z = s.dead * 1.3; }
      };
      break;
    }
    case 'cakal': {
      const FUR = '#59506b'; const FUR2 = '#8a7fa6'; const BELLY = '#d8cfe8';
      const leg = (x: number, z: number) => [{ k: 'cyl', dt: 0.12, db: 0.18, h: 0.55, p: [0, -0.27, 0], c: FUR }, { k: 'sphere', d: 0.24, s: [1, 0.7, 1.4], p: [0, -0.55, 0.05], c: '#2a2236' }] as PartSpec[];
      rig.part('legFL', leg(0, 0), [-0.22, 0.62, 0.5]); rig.part('legFR', leg(0, 0), [0.22, 0.62, 0.5]);
      rig.part('legBL', leg(0, 0), [-0.22, 0.62, -0.45]); rig.part('legBR', leg(0, 0), [0.22, 0.62, -0.45]);
      rig.part('body', [
        { k: 'sphere', d: 0.8, s: [0.95, 0.9, 1.7], p: [0, 0.72, 0], c: FUR, c2: FUR2 },
        { k: 'sphere', d: 0.6, s: [1, 0.7, 1.6], p: [0, 0.52, 0.05], c: BELLY },
        // kafa
        { k: 'sphere', d: 0.7, p: [0, 1.0, 0.85], c: FUR2, c2: '#a89bc4' },
        { k: 'cone', db: 0.34, dt: 0.1, h: 0.55, p: [0, 0.9, 1.3], r: [Math.PI / 2, 0, 0], c: '#b4a8cc' },
        { k: 'sphere', d: 0.14, p: [0, 0.92, 1.58], c: '#1a1220' },
        { k: 'sphere', d: 0.2, s: [1, 1.2, 0.5], p: [-0.2, 1.14, 1.12], c: '#ffe36a' }, { k: 'sphere', d: 0.2, s: [1, 1.2, 0.5], p: [0.2, 1.14, 1.12], c: '#ffe36a' },
        { k: 'sphere', d: 0.07, p: [-0.2, 1.14, 1.2], c: '#1a1220' }, { k: 'sphere', d: 0.07, p: [0.2, 1.14, 1.2], c: '#1a1220' },
        { k: 'box', w: 0.2, h: 0.04, dp: 0.04, p: [-0.2, 1.3, 1.14], r: [0, 0, -0.4], c: '#1a1220' }, { k: 'box', w: 0.2, h: 0.04, dp: 0.04, p: [0.2, 1.3, 1.14], r: [0, 0, 0.4], c: '#1a1220' },
        // kulaklar
        { k: 'cone', db: 0.3, dt: 0, h: 0.62, p: [-0.28, 1.5, 0.78], r: [-0.1, 0, 0.25], c: FUR }, { k: 'cone', db: 0.3, dt: 0, h: 0.62, p: [0.28, 1.5, 0.78], r: [-0.1, 0, -0.25], c: FUR },
        { k: 'cone', db: 0.16, dt: 0, h: 0.4, p: [-0.28, 1.46, 0.82], r: [-0.1, 0, 0.25], c: '#ffb0c0' }, { k: 'cone', db: 0.16, dt: 0, h: 0.4, p: [0.28, 1.46, 0.82], r: [-0.1, 0, -0.25], c: '#ffb0c0' },
        // dişler
        { k: 'cone', db: 0.05, dt: 0, h: 0.1, p: [-0.09, 0.8, 1.52], r: [Math.PI, 0, 0], c: '#fff' }, { k: 'cone', db: 0.05, dt: 0, h: 0.1, p: [0.09, 0.8, 1.52], r: [Math.PI, 0, 0], c: '#fff' },
        // yele tüyleri
        ...[0, 1, 2, 3, 4].map((i): PartSpec => ({ k: 'cone', db: 0.2, dt: 0, h: 0.4, p: [0, 1.2 - i * 0.08, 0.5 - i * 0.28], r: [-0.8, 0, 0], c: '#3b3350' })),
      ], [0, 0, 0]);
      rig.part('tail', [{ k: 'cone', db: 0.34, dt: 0.0, h: 1.1, p: [0, 0, -0.55], r: [-1.2, 0, 0], c: FUR, c2: '#d8cfe8' }], [0, 0.95, -0.9]);
      rig.height = 1.9;
      const { legFL, legFR, legBL, legBR, body, tail } = rig.pivots;
      rig.extra = (s) => {
        const mv = Math.min(1, s.speed / 4); const ph = s.t * 13; const sg = Math.sin(ph) * 0.9 * mv;
        legFL.rotation.x = sg; legBR.rotation.x = sg; legFR.rotation.x = -sg; legBL.rotation.x = -sg;
        body.position.y = Math.abs(Math.sin(ph)) * 0.12 * mv; body.rotation.x = Math.sin(ph * 2) * 0.04 * mv;
        tail.rotation.y = Math.sin(s.t * (mv > 0.3 ? 9 : 4)) * 0.5; tail.rotation.x = -0.2 + mv * 0.3;
        if (s.attack >= 0) { const a = Math.sin(Math.min(1, s.attack) * Math.PI); body.position.z = a * 0.7; body.rotation.x = -0.3 * a; } else body.position.z *= 0.8;
        if (s.dead >= 0) { rig.root.rotation.z = s.dead * 1.5; }
      };
      break;
    }
    case 'bekci': {
      const ROCK = '#4a4668'; const ROCK2 = '#6c6890'; const CR = '#ff3d6e';
      rig.part('legL', [{ k: 'icos', d: 1.0, s: [0.9, 1.3, 0.95], p: [0, -0.45, 0], c: ROCK, c2: ROCK2, sub: 1 }], [-0.55, 1.05, 0]);
      rig.part('legR', [{ k: 'icos', d: 1.0, s: [0.9, 1.3, 0.95], p: [0, -0.45, 0], c: ROCK, c2: ROCK2, sub: 1 }], [0.55, 1.05, 0]);
      rig.part('body', [
        { k: 'icos', d: 1.9, s: [1.15, 1.05, 0.95], p: [0, 0.9, 0], c: ROCK, c2: ROCK2, sub: 1 },
        { k: 'icos', d: 1.1, s: [1, 0.9, 0.8], p: [0, 1.0, 0.55], c: '#58547a', sub: 1 },
        // parlayan çatlaklar
        { k: 'box', w: 0.1, h: 1.3, dp: 0.1, p: [0.1, 0.95, 0.88], r: [0, 0, 0.35], c: CR, gloss: 0 },
        { k: 'box', w: 0.1, h: 0.8, dp: 0.1, p: [-0.4, 1.3, 0.78], r: [0, 0, -0.5], c: CR },
        { k: 'box', w: 0.1, h: 0.7, dp: 0.1, p: [0.5, 0.6, 0.78], r: [0, 0, -0.6], c: CR },
        { k: 'sphere', d: 0.5, s: [1, 1, 0.4], p: [0, 1.0, 0.86], c: '#ffd166', gloss: 0.5 },
        // baş
        { k: 'icos', d: 1.15, s: [1.1, 0.9, 1], p: [0, 2.15, 0.1], c: '#5e5a82', c2: '#7d78a6', sub: 1 },
        { k: 'sphere', d: 0.32, s: [1, 0.8, 0.5], p: [-0.28, 2.2, 0.55], c: '#fff0a0' }, { k: 'sphere', d: 0.32, s: [1, 0.8, 0.5], p: [0.28, 2.2, 0.55], c: '#fff0a0' },
        { k: 'sphere', d: 0.14, p: [-0.28, 2.2, 0.66], c: '#ff1a3a' }, { k: 'sphere', d: 0.14, p: [0.28, 2.2, 0.66], c: '#ff1a3a' },
        { k: 'box', w: 0.5, h: 0.09, dp: 0.06, p: [-0.28, 2.45, 0.58], r: [0, 0, -0.45], c: '#1a0f2a' }, { k: 'box', w: 0.5, h: 0.09, dp: 0.06, p: [0.28, 2.45, 0.58], r: [0, 0, 0.45], c: '#1a0f2a' },
        { k: 'box', w: 0.6, h: 0.14, dp: 0.06, p: [0, 1.85, 0.56], c: '#1a0f2a' },
        ...[-0.2, -0.07, 0.07, 0.2].map((x): PartSpec => ({ k: 'cone', db: 0.09, dt: 0, h: 0.2, p: [x, 1.9, 0.58], r: [Math.PI, 0, 0], c: '#fff' })),
        // boynuz
        { k: 'cone', db: 0.34, dt: 0, h: 1.2, p: [-0.5, 2.95, 0], r: [0, 0, 0.35], c: '#fff0c8', c2: '#f0d890' }, { k: 'cone', db: 0.34, dt: 0, h: 1.2, p: [0.5, 2.95, 0], r: [0, 0, -0.35], c: '#fff0c8', c2: '#f0d890' },
        // sırttan çıkan mor kristaller
        ...[-0.7, -0.25, 0.25, 0.7].map((x, i): PartSpec => ({ k: 'cone', db: 0.34, dt: 0, h: 1.0 + (i % 2) * 0.5, p: [x, 1.7, -0.7], r: [-0.5, 0, -x * 0.6], c: '#b46bff', c2: '#e6c4ff', gloss: 0.5 })),
      ], [0, 0.0, 0]);
      for (const sd of [-1, 1]) rig.part(sd < 0 ? 'armL' : 'armR', [
        { k: 'icos', d: 0.8, s: [0.9, 1.4, 0.9], p: [0, -0.6, 0], c: ROCK, c2: ROCK2, sub: 1 }, { k: 'icos', d: 1.1, p: [0, -1.5, 0], c: '#5e5a82', c2: '#7d78a6', sub: 1 },
        { k: 'box', w: 0.08, h: 0.6, dp: 0.08, p: [0, -1.5, 0.52], c: CR },
      ], [sd * 1.35, 2.0, 0]);
      rig.height = 4.6;
      const { legL, legR, body, armL, armR } = rig.pivots;
      rig.extra = (s) => {
        const mv = Math.min(1, s.speed / 3); const ph = s.t * 3.4; const sg = Math.sin(ph) * 0.5 * mv;
        legL.rotation.x = sg; legR.rotation.x = -sg; body.position.y = Math.abs(Math.sin(ph)) * 0.15 * mv + Math.sin(s.t * 1.5) * 0.04;
        armL.rotation.x = -sg * 0.7; armR.rotation.x = sg * 0.7; armL.rotation.z = 0.15; armR.rotation.z = -0.15;
        if (s.attack >= 0) { const a = s.attack; const up = a < 0.45 ? -2.9 * (a / 0.45) : -2.9 + 3.9 * Math.min(1, (a - 0.45) / 0.15); armL.rotation.x = up; armR.rotation.x = up; body.rotation.x = a > 0.45 ? 0.25 : -0.12; }
        else body.rotation.x *= 0.85;
        if (s.dead >= 0) { rig.root.rotation.x = -s.dead * 0.6; rig.root.position.y = rig.baseY - s.dead * 1.2; }
      };
      break;
    }
  }
  rig.flashColor = new Color3(1, 1, 1);
  return rig;
}
