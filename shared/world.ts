import { mulberry32 } from './rng';
import { CAMP_D0, CAMP_D1, FIELD_BOSS, HUB, HUB_GATE_HALF, HUB_PLAZA_R, HUB_R, HUB_WALL_R, MAX_CAMP_LEVEL, WORLD_R, campLevel, campTypes, campTypesForLevel, levelDist, type MobType } from './game';
import { MAPS, REGIONS, regionAt, regionById, type MapId, type Region } from './maps';

export interface Obstacle { x: number; z: number; r: number; kind: 'tree' | 'rock' | 'building'; s: number; v: number }
export interface Camp { id: number; x: number; z: number; types: MobType[]; level: number; count: number; map: MapId }

export const WORLD_SEED = 20261004;

/** Tüm istemci ve sunucuda aynı çıkan engeller (ağaç, kaya, bina): Bozkır + diğer bölgeler. */
export function genObstacles(): Obstacle[] { return [...genHubObstacles(), ...REGIONS.filter((g) => g.id !== 'bozkir').flatMap(genRegionObstacles)]; }

/** Bozkır dışındaki bölgelerin engelleri (bölge merkezine kaydırılmış). Zindan: kenarda sütun halkası + iç sütunlar. */
export function genRegionObstacles(g: Region): Obstacle[] {
  const def = MAPS[g.map]; const r = mulberry32(def.seed ^ (g.slot * 7919)); const out: Obstacle[] = [];
  const ok = (x: number, z: number, rad: number, gap: number) => !out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + rad + gap) ** 2);
  if (def.kind === 'dungeon') {
    const n = Math.round((g.r - 3) * Math.PI * 2 / 4.6);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push({ x: g.cx + Math.cos(a) * (g.r - 2.5), z: g.cz + Math.sin(a) * (g.r - 2.5), r: 1.7, kind: 'rock', s: 1.6, v: i % 3 }); }
    for (let t = 0, k = 0; k < 22 && t < 800; t++) {
      const a = r() * 6.283; const d = 12 + Math.sqrt(r()) * (g.r - 24); const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (!ok(g.cx + x, g.cz + z, 1.3, 7)) continue; out.push({ x: g.cx + x, z: g.cz + z, r: 1.3, kind: 'rock', s: 1.3 + r() * 0.8, v: k % 3 }); k++;
    }
    return out;
  }
  const trees = g.map === 'otlak' ? 420 : 520; const rocks = g.map === 'otlak' ? 130 : 380;
  for (let t = 0, k = 0; k < trees && t < 24000; t++) {
    const a = r() * 6.283; const d = g.safeR + 3 + Math.sqrt(r()) * (g.r - g.safeR - 8); const x = g.cx + Math.cos(a) * d, z = g.cz + Math.sin(a) * d;
    if (!ok(x, z, 0.9, 2.6)) continue; out.push({ x, z, r: 0.9, kind: 'tree', s: 0.8 + r() * 0.9, v: Math.floor(r() * 3) }); k++;
  }
  for (let t = 0, k = 0; k < rocks && t < 16000; t++) {
    const a = r() * 6.283; const d = g.safeR + 3 + Math.sqrt(r()) * (g.r - g.safeR - 8); const x = g.cx + Math.cos(a) * d, z = g.cz + Math.sin(a) * d;
    if (!ok(x, z, 1.1, 2.2)) continue; out.push({ x, z, r: 1.1, kind: 'rock', s: 0.7 + r() * 1.2, v: Math.floor(r() * 3) }); k++;
  }
  return out;
}

/** Yol koridoru: köy kapılarından dışarı uzanan dört ana yol (D/B/K/G). Ağaç, kaya, kamp ve boss bu şeritten uzak tutulur. */
export const ROAD_HALF = 6; export const ROAD_LEN = 250;
export function roadDist(x: number, z: number): number {
  const d = Math.hypot(x, z); if (d > ROAD_LEN) return 1e9;
  return Math.min(Math.abs(x), Math.abs(z));   // eksenlere uzaklık (yollar x ve z eksenleri boyunca)
}
export function genHubObstacles(): Obstacle[] {
  const r = mulberry32(WORLD_SEED);
  const out: Obstacle[] = [
    { x: HUB.otag.x, z: HUB.otag.z, r: HUB.otag.r, kind: 'building', s: 1, v: 0 },
    { x: HUB.demirhane.x, z: HUB.demirhane.z, r: HUB.demirhane.r, kind: 'building', s: 1, v: 1 },
  ];
  // Mahalle yurtları ve pazar tezgâhları (çarpışmalı)
  for (const [x, z] of HUB.yurts) out.push({ x, z, r: 3.4, kind: 'building', s: 0.8, v: 2 });
  for (const [x, z] of HUB.stalls) out.push({ x, z, r: 1.7, kind: 'building', s: 0.6, v: 3 });
  out.push({ x: HUB.pond.x, z: HUB.pond.z, r: HUB.pond.r, kind: 'rock', s: 0, v: 9 });   // gölet (görünmez çarpışma; zemin gölgesinde su)
  // Sur: kapılar dışında kesintisiz halka; kapı yanlarında kuleler
  const wallStep = 3.2; const n = Math.round((Math.PI * 2 * HUB_WALL_R) / wallStep);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2; const x = Math.cos(a) * HUB_WALL_R, z = Math.sin(a) * HUB_WALL_R;
    if (Math.min(Math.abs(x), Math.abs(z)) < HUB_GATE_HALF + 1.2) continue;   // kapı açıklığı
    out.push({ x, z, r: 1.7, kind: 'building', s: 0.5, v: 4 });
  }
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const sg of [-1, 1]) {
    const x = sx ? sx * HUB_WALL_R : sg * (HUB_GATE_HALF + 3.4); const z = sz ? sz * HUB_WALL_R : sg * (HUB_GATE_HALF + 3.4);
    out.push({ x: sx ? x : x, z: sz ? z : z, r: 2.9, kind: 'building', s: 1, v: 5 });
  }
  // Köy içi ağaçlar (sakura bahçeleri): meydandan ve yollardan uzak, yapılara değmez
  let tries = 0; let inTown = 0;
  while (inTown < 44 && tries++ < 4000) {
    const a = r() * Math.PI * 2; const d = HUB_PLAZA_R + 8 + Math.sqrt(r()) * (HUB_WALL_R - HUB_PLAZA_R - 16);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.min(Math.abs(x), Math.abs(z)) < 10) continue;
    if (Math.hypot(x - HUB.spawn.yer.x, z - HUB.spawn.yer.z) < 14 || Math.hypot(x - HUB.gate.x, z - HUB.gate.z) < 12) continue;
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3.4) ** 2)) continue;
    out.push({ x, z, r: 0.9, kind: 'tree', s: 0.9 + r() * 0.6, v: Math.floor(r() * 3) }); inTown++;
  }
  // Açık alan: ağaç ve kaya (yol koridoru ve sur kuşağı boş)
  // koru merkezleri: ağaçların %70'i kümelenir (doğal görünüm, boş çayırlar kamplar için), %30'u serpilir
  const groves: { x: number; z: number; rad: number }[] = [];
  for (let g = 0, t = 0; g < 70 && t < 2000; t++) { const a = r() * Math.PI * 2; const d = HUB_R + 24 + Math.sqrt(r()) * (WORLD_R - HUB_R - 60); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (roadDist(x, z) < ROAD_HALF + 14) continue; groves.push({ x, z, rad: 18 + r() * 26 }); g++; }
  tries = 0; let nt = 0;
  while (nt < 1150 && tries++ < 40000) {
    let x: number, z: number;
    if (r() < 0.7) { const g = groves[Math.floor(r() * groves.length)]; const a = r() * Math.PI * 2; const d = Math.sqrt(r()) * g.rad; x = g.x + Math.cos(a) * d; z = g.z + Math.sin(a) * d; if (Math.hypot(x, z) > WORLD_R - 8) continue; }
    else { const a = r() * Math.PI * 2; const d = HUB_R + 6 + Math.sqrt(r()) * (WORLD_R - HUB_R - 20); x = Math.cos(a) * d; z = Math.sin(a) * d; }
    if (Math.hypot(x, z) < HUB_R + 6) continue;
    if (roadDist(x, z) < ROAD_HALF + 3) continue;
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 2.6) ** 2)) continue;
    out.push({ x, z, r: 0.9, kind: 'tree', s: 0.8 + r() * 0.9, v: Math.floor(r() * 3) }); nt++;
  }
  tries = 0; let rocks = 0;
  while (rocks < 340 && tries++ < 12000) {
    const a = r() * Math.PI * 2; const d = HUB_R + 6 + Math.sqrt(r()) * (WORLD_R - HUB_R - 20);
    const x = Math.cos(a) * d; const z = Math.sin(a) * d;
    if (roadDist(x, z) < ROAD_HALF + 2) continue;
    if (out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 2.2) ** 2)) continue;
    out.push({ x, z, r: 1.1, kind: 'rock', s: 0.7 + r() * 1.2, v: Math.floor(r() * 3) }); rocks++;
  }
  return out;
}

export interface StoneDef { n: number; x: number; z: number }
/** Bozkıra dağılmış 8 balbal taşı; uzaklığa göre sıralı (1 en yakın, 8 Erlik'in en dibinde). */
export function genStones(): StoneDef[] {
  const r = mulberry32(WORLD_SEED ^ 0x51ed270b); const obs = worldObstacles(); const out: StoneDef[] = [];
  for (let i = 0; i < 8; i++) {
    const dMin = HUB_R + 26 + i * ((WORLD_R - HUB_R - 70) / 8); const dMax = dMin + 18;
    for (let t = 0; t < 400; t++) {
      const a = (i / 8) * Math.PI * 2 + (r() - 0.5) * 0.7; const d = dMin + r() * (dMax - dMin); const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (roadDist(x, z) < 9 || obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3.5) ** 2)) continue;
      out.push({ n: i + 1, x, z }); break;
    }
  }
  return out;
}

export interface BossDef { id: number; level: number; kind: string; nameKey: string; x: number; z: number; map: MapId }
let cachedBosses: BossDef[] | null = null;
/** Saha bosları: seviye grubuna uygun uzaklıkta, sabit konum (kamplardan ve engellerden uzak). */
export function genBosses(): BossDef[] { return (cachedBosses ??= buildBosses()); }
function buildBosses(): BossDef[] {
  const r = mulberry32(WORLD_SEED ^ 0xb055); const obs = worldObstacles(); const camps = genAllCamps(); const out: BossDef[] = [];
  FIELD_BOSS.list.forEach(([level, kind, nameKey], i) => {
    const map = FIELD_BOSS.maps[i]; if (MAPS[map].kind === 'dungeon') return; /* zindan bossları örnek açılınca doğar */ const g = regionById(map); const def = MAPS[map];
    for (let t = 0; t < 600; t++) {
      let d: number, a: number;
      if (map === 'bozkir') { const dist0 = levelDist(level); a = t < 300 ? (i / 5) * Math.PI * 2 + 0.4 + (r() - 0.5) * 0.8 : r() * Math.PI * 2; d = Math.min(WORLD_R - 30, dist0 + r() * (t < 300 ? 14 : 26)); }
      else { const f = (level - def.lv[0]) / Math.max(1, def.lv[1] - def.lv[0]); a = r() * Math.PI * 2; d = Math.min(g.r - 12, g.safeR + 26 + f * (g.r - g.safeR - 50) + r() * 8); }
      const x = g.cx + Math.cos(a) * d, z = g.cz + Math.sin(a) * d;
      if (map === 'bozkir' && roadDist(x, z) < 12) continue;
      if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 5) ** 2)) continue;
      if (t < 590 && camps.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 40 * 40)) continue; // kampların üstüne doğup yoldan geçeni çekmesin
      out.push({ id: i + 1, level, kind, nameKey, x, z, map }); break;
    }
  });
  return out;
}

/** Yaratık kampları (sunucu doğurur). */
/** Kamp sayısı: nüfus simülasyonu zirve seviyede (41–50) çok az kamp olduğunu ve 2 kampın farm zamanının %43'ünü aldığını gösterdi */
export const MAX_CAMPS = 112; export const CAMP_SPACING = 44;
let cachedCamps: Camp[] | null = null;
/** Yalnızca Bozkır kampları (eski çağrılar için); sunucu `genAllCamps` kullanır. Kamp kimliği = dizin. */
export function genCamps(): Camp[] { return genAllCamps().filter((c) => c.map === 'bozkir'); }
export function genAllCamps(): Camp[] { return (cachedCamps ??= buildCamps()); }
function buildCamps(): Camp[] {
  const r = mulberry32(WORLD_SEED ^ 0x9e3779b9);
  const obs = worldObstacles();
  const camps: Camp[] = [];
  let tries = 0;
  while (camps.length < MAX_CAMPS && tries++ < 30000) {
    const a = r() * Math.PI * 2;
    const d = HUB_R + 12 + Math.sqrt(r()) * (WORLD_R - HUB_R - 36);
    const x = Math.cos(a) * d; const z = Math.sin(a) * d;
    if (roadDist(x, z) < 14) continue;
    if (camps.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < CAMP_SPACING * CAMP_SPACING)) continue;
    if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3) ** 2)) continue;
    camps.push({ id: camps.length, x, z, types: campTypes(d), level: campLevel(d), count: 5 + Math.floor(r() * 4), map: 'bozkir' });
  }
  // Diğer alanlar: seviye, merkezden uzaklıkla artar
  for (const [map, n, spacing] of [['otlak', 38, 26], ['erlik', 84, 30]] as [MapId, number, number][]) {
    const g = regionById(map); const def = MAPS[map]; const rr = mulberry32(def.seed ^ 0xca17); const start = camps.length; tries = 0;
    while (camps.length - start < n && tries++ < 20000) {
      const a = rr() * Math.PI * 2; const d = g.safeR + 8 + Math.sqrt(rr()) * (g.r - g.safeR - 22);
      const x = g.cx + Math.cos(a) * d; const z = g.cz + Math.sin(a) * d;
      if (camps.some((c) => c.map === map && (c.x - x) ** 2 + (c.z - z) ** 2 < spacing * spacing)) continue;
      if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 3) ** 2)) continue;
      const f = (d - g.safeR - 8) / (g.r - g.safeR - 22);
      const level = Math.round(def.lv[0] + f * (def.lv[1] - def.lv[0]));
      camps.push({ id: camps.length, x, z, types: campTypesForLevel(level), level, count: 5 + Math.floor(rr() * 4), map });
    }
  }
  return camps;
}

// ─── Çarpışma / hareket (istemci tahmini ve sunucu aynı fonksiyonu kullanır) ───
class Grid {
  cells = new Map<number, Obstacle[]>();
  size = 16;
  key(cx: number, cz: number) { return (cx + 1000) * 10000 + (cz + 1000); }
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
  const g = regionAt(p.x, p.z) ?? REGIONS[0]; const gx = p.x - g.cx, gz = p.z - g.cz;
  const d = Math.hypot(gx, gz); const lim = g.r - 1.5;
  if (d > lim) { p.x = g.cx + (gx / d) * lim; p.z = g.cz + (gz / d) * lim; }
  if (keepOut && g.safeR > 0) { // yaratıklar güvenli bölgeye giremez
    const hx = p.x - g.cx, hz = p.z - g.cz; const hd = Math.hypot(hx, hz);
    if (hd < g.safeR + 1) { p.x = g.cx + (hx / (hd || 1)) * (g.safeR + 1); p.z = g.cz + (hz / (hd || 1)) * (g.safeR + 1); }
  }
}
export const dist2 = (a: Pos, b: Pos) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
export const dist = (a: Pos, b: Pos) => Math.sqrt(dist2(a, b));
