import { HUB_R, WORLD_R, levelDist } from './game';
import { mulberry32 } from './rng';
import { WORLD_SEED, roadDist, worldObstacles } from './world';

/**
 * Kut Yıllığı: sunucunun ortak hafızası. Hikâye yazılı değil, yaşanır:
 *  - "yazılı" katman: Çağlar (sabit 0–5) ve ardından sonsuz, prosedürel "Gelen Tehdit" çağları
 *  - "ortaya çıkan" katman: bosslar, çatlaklar, zindanlar, ilkler ve yazıtlar Yıllık'a oyuncu adıyla işlenir
 * Çağ, sunucunun toplam Yıllık puanından türer; hiçbir çağ "son" değildir.
 */
export type ChronKind = 'boss' | 'rift' | 'dungeon' | 'level' | 'insc' | 'ruin' | 'era' | 'outlaw';
export interface ChronEntry { t: number; k: ChronKind; who: string; a: number; b: number }
export const CHRON_MAX = 200;
export const CHRON_PTS: Record<ChronKind, number> = { boss: 10, rift: 6, dungeon: 4, level: 0, insc: 25, ruin: 2, era: 0, outlaw: 0 };
/** İlk-ünvan seviyeleri: sunucuda bu seviyeye ilk ulaşan Yıllık'a geçer */
export const FIRST_LEVELS = [10, 20, 30, 40, 50];

export const ERA_AT = [0, 80, 240, 560, 1100, 2000];
export const ERA_STEP = 1500; // 5. çağdan sonra her ERA_STEP puanda yeni bir "Gelen Tehdit" çağı
export const THREAT_A = ['Kızıl', 'Kara', 'Demir', 'Sessiz', 'Çürük', 'Gümüş', 'Kor', 'Soluk'];
export const THREAT_B = ['Rüzgâr', 'Sürü', 'Gölge', 'Yıldız', 'Toprak', 'Kurt', 'Su', 'Kapı'];

/** Puandan çağ numarası: 0..5 sabit, 6+ sonsuz */
export function eraOf(pts: number): number {
  let e = 0; while (e + 1 < ERA_AT.length && pts >= ERA_AT[e + 1]) e++;
  if (e === ERA_AT.length - 1) e += Math.floor((pts - ERA_AT[e]) / ERA_STEP);
  return e;
}
/** Çağ n için sonraki eşik */
export function eraStartPts(n: number): number { return n < ERA_AT.length ? ERA_AT[n] : ERA_AT[ERA_AT.length - 1] + (n - (ERA_AT.length - 1)) * ERA_STEP; }
/** Sonsuz çağların adı: n≥6 için deterministik iki sözcük (Kızıl Sürü Çağı gibi) */
export function threatName(n: number): [number, number] { const r = mulberry32(WORLD_SEED ^ (0x7ea1 + n * 977)); return [Math.floor(r() * THREAT_A.length), Math.floor(r() * THREAT_B.length)]; }

export interface RuinDef { n: number; x: number; z: number }
export const RUIN_LEVELS = [3, 8, 14, 20, 26, 32, 38, 43, 47];
let cachedRuins: RuinDef[] | null = null;
/** Bozkıra dağılmış 9 destan kalıntısı; seviye kuşağına göre uzaklaşır (taşlardan ve yollardan ayrık). */
export function genRuins(): RuinDef[] {
  if (cachedRuins) return cachedRuins;
  const r = mulberry32(WORLD_SEED ^ 0x7a115); const obs = worldObstacles(); const out: RuinDef[] = [];
  RUIN_LEVELS.forEach((lv, i) => {
    for (let t = 0; t < 500; t++) {
      const a = r() * Math.PI * 2; const d = Math.min(WORLD_R - 30, Math.max(HUB_R + 24, levelDist(lv) + (r() - 0.5) * 20)); const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (roadDist(x, z) < 12 || obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 5) ** 2) || out.some((q) => (q.x - x) ** 2 + (q.z - z) ** 2 < 60 * 60)) continue;
      out.push({ n: i + 1, x, z }); break;
    }
  });
  return (cachedRuins = out);
}
