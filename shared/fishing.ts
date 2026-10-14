import { HUB, type EnchKey } from './game';

/**
 * Göl Avı (balıkçılık): Yurt gölünün kenarında olta atılır; 12 sn'lik zamanlama oyununda 3 doğru vuruş balığı kazandırır.
 * Balık kesin sonucu atış anında SUNUCUDA belirlenir (istemci yalnızca vuruş sayısı bildirir). Balıklar pazarda takas edilir,
 * Yurt'ta pişirilince kısa süreli güç verir (iyileştirme DEĞİL: Kımız ile çakışmasın). Akçe girişi yoktur; olta, yem ve olta geliştirme akçe sink'idir.
 */
export const FISH = {
  minLevel: 5, pond: HUB.pond, shoreReach: 4.5, castCdSec: 1.5, gameSec: 12, hitsNeeded: 3, minReelSec: 4, missPenaltySec: 1.5,
  rodPrice: 300, bait: { hamur: 8, solucan: 20 }, baitRareMult: { hamur: 1, solucan: 2 }, luckCasts: 10, luckMult: 3, ptsChance: 0.35,
  /** olta geliştirme: L → L+1 */ rodMax: 10, rodNeed: (l: number) => 20 * l, rodCost: (l: number) => 400 * l, rodRate: (l: number) => (l <= 2 ? 0.8 : 0.5), rodFailLose: 0.1,
  /** vuruş bölgesi genişliği (0–1): olta seviyesiyle genişler */ zone: (l: number) => Math.min(0.34, 0.18 + 0.015 * l),
  ancestorBuffSec: 600, ancestorXpPct: 10,
  /** Metin2'de 3 isabet yalnızca "yakalama şansı" verir: balık kaçabilir. Şans balığın nadirliğine, oltaya ve yeme bağlıdır; sonuç atışta sunucuda çekilir. */
  catch: { common: 0.82, rare: 0.55, ata: 0.3, rodBonus: 0.015, rodBonusMax: 0.15, solucan: 0.05, luck: 0.1, max: 0.95, escapePtsChance: 0.15 },
  /** balık ayıklama (Metin2 "öldürme" sonuçları): olasılıklar */
  /** Yorgunluk (bot/makro sınırı): günde bu kadar yakalamadan sonra balıklar ürker, tutma şansı çarpanla düşer. İnsan oyuncu gününde nadiren 200'e varır. */
  fatigueAfter: 200, fatigueMult: 0.4,
  clean: { solucan: 0.4, kilcik: 0.4 /* kalan: balık suya kaçar */ },
};
export type FishId = 'sazan' | 'otsazani' | 'zargana' | 'hamsi' | 'levrek' | 'kadife' | 'kralyengeci' | 'altinsudak' | 'ata';
export interface FishDef { id: FishId; w: number; rare: boolean; buff?: { k: EnchKey; v: number; sec: number }; cleanse?: boolean; ref: number }
export const FISH_DEFS: FishDef[] = [
  { id: 'sazan', w: 20, rare: false, buff: { k: 'mspd', v: 10, sec: 600 }, ref: 40 }, { id: 'otsazani', w: 18, rare: false, buff: { k: 'aspd', v: 8, sec: 600 }, ref: 40 },
  { id: 'zargana', w: 16, rare: false, buff: { k: 'atkPct', v: 6, sec: 600 }, ref: 45 }, { id: 'hamsi', w: 16, rare: false, buff: { k: 'crit', v: 4, sec: 600 }, ref: 45 },
  { id: 'levrek', w: 12, rare: false, cleanse: true, ref: 60 },
  { id: 'kadife', w: 2.5, rare: true, buff: { k: 'atkPct', v: 4, sec: 600 }, ref: 450 }, { id: 'kralyengeci', w: 2, rare: true, buff: { k: 'leech', v: 3, sec: 600 }, ref: 500 },
  { id: 'altinsudak', w: 2.2, rare: true, buff: { k: 'xpPct', v: 15, sec: 1800 }, ref: 600 },
  { id: 'ata', w: 0.3, rare: true, ref: 0 },   // "Gölün Atası": yiyecek değil, seçim sunar (serbest bırak / kes / yem yap)
];
export const FISH_IDS = FISH_DEFS.map((f) => f.id);
export const EDIBLE: FishId[] = FISH_DEFS.filter((f) => f.id !== 'ata').map((f) => f.id);
export const fishKey = (id: FishId) => `fish_${id}`;
export const isFishKey = (k: string): k is `fish_${FishId}` => k.startsWith('fish_') && (EDIBLE as string[]).includes(k.slice(5));
export const fishOf = (id: string) => FISH_DEFS.find((f) => f.id === id);
export const nearShore = (x: number, z: number) => { const d = Math.hypot(x - FISH.pond.x, z - FISH.pond.z); return d <= FISH.pond.r + FISH.shoreReach; };

/** Atışta hangi balık gelir: ağırlıklar; nadirler yem (solucan ×2), olta seviyesi (+%6/seviye) ve şans yemi (×3) ile artar */
export function rollFish(r: () => number, rod: number, bait: 'hamur' | 'solucan', luck: boolean): FishId {
  const m = FISH.baitRareMult[bait] * (1 + 0.06 * rod) * (luck ? FISH.luckMult : 1);
  const ws = FISH_DEFS.map((f) => f.w * (f.rare ? m : 1)); let x = r() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return FISH_DEFS[i].id; }
  return 'sazan';
}
/** Bu atışta balığın tutunma olasılığı (zamanlama oyununu tamamlayınca) */
export function catchChance(id: FishId, rod: number, bait: 'hamur' | 'solucan', luck: boolean): number {
  const d = FISH_DEFS.find((f) => f.id === id)!; const base = id === 'ata' ? FISH.catch.ata : d.rare ? FISH.catch.rare : FISH.catch.common;
  return Math.min(FISH.catch.max, base + Math.min(FISH.catch.rodBonusMax, FISH.catch.rodBonus * rod) + (bait === 'solucan' ? FISH.catch.solucan : 0) + (luck ? FISH.catch.luck : 0));
}
/** Arayüzde göstermek için: yaygın ve nadir balık yakalama şansı (balığın ne olduğu atıştan önce bilinmez) */
export const catchRange = (rod: number, bait: 'hamur' | 'solucan', luck: boolean) => ({ common: catchChance('sazan', rod, bait, luck), rare: catchChance('altinsudak', rod, bait, luck) });
export interface FishState { rod: number; pts: number; hamur: number; solucan: number; luck: number; stock: Partial<Record<FishId, number>>; caught: number; ancestor: boolean; /** gün numarası ve o günkü yakalama sayısı (yorgunluk) */ day?: number; today?: number }
export const newFishState = (): FishState => ({ rod: 0, pts: 0, hamur: 0, solucan: 0, luck: 0, stock: {}, caught: 0, ancestor: false });
export interface Buff { id: string; k: EnchKey; v: number; until: number }
