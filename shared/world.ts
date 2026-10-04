import { mulberry32 } from './rng';
import { HUB, HUB_R, WORLD_R, campLevel, campTypes, type MobType } from './game';

export interface Obstacle { x: number; z: number; r: number; kind: 'tree' | 'rock' | 'building'; s: number; v: number }
export interface Camp { id: number; x: number; z: number; types: MobType[]; level: number; count: number }

export const WORLD_SEED = 20261004;

/** Tüm istemci ve sunucuda aynı çıkan engeller (ağaç, kaya, bina). */
export function genObstacles(): Obstacle[] {
  const r = mulberry32(WORLD_SEED);
  const out: Obstacle[] = [
    { x: HUB.otag.x, z: HUB.otag.z, r: HUB.otag.r, kind: 'building', s: 1, v: 0 },
    { x: HUB.demirhane.x, z: HUB.demirhane.z, r: HUB.demirhane.r, kind: 'building', s: 1, v: 1 },
  ];
  // Boy yurdu süs çadırları (çarpışmalı)
  const yurts = [[-24, 10], [24, 8], [-27, -4], [27, -14], [-6, -26], [22, 22], [-22, 24]];
  for (const [x, z] of yurts) out.push({ x, z, r: 3.4, kind: 'building', s: 0.8, v: 2 });
  // Hub çevresi: sadece kenarlara ağaç
  let tries = 0;
  while (out.filter((o) => o.kind === 'tree').length < 260 && tries++ < 6000) {
    const a = r() * Math.PI * 2;
    const d = 12 + Math.sqrt(r()) * (WORLD_R - 14);
    const x = Math.cos(a) * d; const z = Math.sin(a) * d;
    const inHub = d < HUB_R + 4;
    if (inHub && d < HUB_R - 4 && r() > 0.12) continue; // plaza açık kalsın
    if (inHub && d < 30) continue;
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 2.6) ** 2)) continue;
    out.push({ x, z, r: 0.9, kind: 'tree', s: 0.8 + r() * 0.9, v: Math.floor(r() * 3) });
  }
  tries = 0;
  while (out.filter((o) => o.kind === 'rock').length < 120 && tries++ < 4000) {
    const a = r() * Math.PI * 2;
    const d = 16 + Math.sqrt(r()) * (WORLD_R - 20);
    const x = Math.cos(a) * d; const z = Math.sin(a) * d;
    if (d < HUB_R - 2) continue;
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 2.2) ** 2)) continue;
    out.push({ x, z, r: 1.1, kind: 'rock', s: 0.7 + r() * 1.2, v: Math.floor(r() * 3) });
  }
  return out;
}

export interface StoneDef { n: number; x: number; z: number }
/** Bozkıra dağılmış 8 balbal taşı; uzaklığa göre sıralı (1 en yakın, 8 Erlik'in en dibinde). */
export function genStones(): StoneDef[] {
  const r = mulberry32(WORLD_SEED ^ 0x51ed270b); const obs = genObstacles(); const out: StoneDef[] = [];
  for (let i = 0; i < 8; i++) {
    const dMin = 46 + i * 13; const dMax = dMin + 10;
    for (let t = 0; t < 400; t++) {
      const a = (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.7; const d = dMin + r() * (dMax - dMin); const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3.5) ** 2)) continue;
      out.push({ n: i + 1, x, z }); break;
    }
  }
  return out;
}

/** Yaratık kampları (sunucu doğurur). */
export function genCamps(): Camp[] {
  const r = mulberry32(WORLD_SEED ^ 0x9e3779b9);
  const obs = genObstacles();
  const camps: Camp[] = [];
  let tries = 0;
  while (camps.length < 42 && tries++ < 3000) {
    const a = r() * Math.PI * 2;
    const d = HUB_R + 7 + Math.sqrt(r()) * (WORLD_R - HUB_R - 19);
    const x = Math.cos(a) * d; const z = Math.sin(a) * d;
    if (camps.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 26 * 26)) continue;
    if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3) ** 2)) continue;
    camps.push({ id: camps.length, x, z, types: campTypes(d), level: campLevel(d), count: 5 + Math.floor(r() * 4) });
  }
  return camps;
}

// ─── Çarpışma / hareket (istemci tahmini ve sunucu aynı fonksiyonu kullanır) ───
class Grid {
  cells = new Map<number, Obstacle[]>();
  size = 16;
  key(cx: number, cz: number) { return (cx + 100) * 1000 + (cz + 100); }
  constructor(obs: Obstacle[]) {
    for (const o of obs) {
      const x0 = Math.floor((o.x - o.r) / this.size), x1 = Math.floor((o.x + o.r) / this.size);
      const z0 = Math.floor((o.z - o.r) / this.size), z1 = Math.floor((o.z + o.r) / this.size);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = this.key(cx, cz);
        const l = this.cells.get(k); if (l) l.push(o); else this.cells.set(k, [o]);
      }
    }
  }
  near(x: number, z: number): Obstacle[] {
    return this.cells.get(this.key(Math.floor(x / this.size), Math.floor(z / this.size))) ?? [];
  }
}
let grid: Grid | null = null;
let cachedObs: Obstacle[] | null = null;
export function worldObstacles(): Obstacle[] { return (cachedObs ??= genObstacles()); }
function getGrid() { return (grid ??= new Grid(worldObstacles())); }

export interface Pos { x: number; z: number }
/** Konumu hareket yönüne göre ilerletir, engellerden ve dünya sınırından geri iter. */
export function stepMove(p: Pos, dx: number, dz: number, speed: number, dt: number, radius = 0.5, keepOut = false) {
  p.x += dx * speed * dt; p.z += dz * speed * dt;
  for (const o of getGrid().near(p.x, p.z)) {
    const ex = p.x - o.x, ez = p.z - o.z; const rr = o.r + radius; const d2 = ex * ex + ez * ez;
    if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.0001; p.x = o.x + (ex / d) * rr; p.z = o.z + (ez / d) * rr; }
  }
  const d = Math.hypot(p.x, p.z); const lim = WORLD_R - 1.5;
  if (d > lim) { p.x = (p.x / d) * lim; p.z = (p.z / d) * lim; }
  if (keepOut) { // yaratıklar güvenli bölgeye giremez
    const hd = Math.hypot(p.x, p.z);
    if (hd < HUB_R + 1) { p.x = (p.x / (hd || 1)) * (HUB_R + 1); p.z = (p.z / (hd || 1)) * (HUB_R + 1); }
  }
}
export const dist2 = (a: Pos, b: Pos) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
export const dist = (a: Pos, b: Pos) => Math.sqrt(dist2(a, b));
