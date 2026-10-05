import { ENCH_KEYS, ENCH_TABLE, newId, type Ench, type EnchKey } from './game';
import type { Rng } from './rng';

/**
 * Kostüm: süreli, minimal özellikli, görünümü değiştiren giysi. Amaç sürekli ve isteyerek ödenen bir akçe akışı:
 * tezgâhta üretilen malzeme → şansa bağlı üretim → efsunlama/değiştirme → süre dolmadan uzatma (efsunlar yalnızca uzatılırsa kalır).
 * Tüm maliyetler `costUnit(seviye)` ile ölçeklenir: maliyet, oyuncunun o seviyedeki gelirine oranla sabit kalır.
 */
export type CostumeTier = 0 | 1 | 2 | 3;
export const TIER_NAMES = ['sade', 'susulu', 'sahane', 'hanlik'] as const;
export type CosMat = 'lif' | 'boya' | 'ipek' | 'nakis';
export const COS_MATS: CosMat[] = ['lif', 'boya', 'ipek', 'nakis'];
/** şans eşyaları + Efsun Değiştirme Kağıdı (kagit): her efsun değiştirmede 1 kağıt harcanır (Metin2 efsun kâğıdı gibi) */
export type LuckKey = 'boncuk' | 'dugum' | 'nazar' | 'kagit';
export const LUCK_KEYS: LuckKey[] = ['boncuk', 'dugum', 'nazar', 'kagit'];
export type LoomKind = 'daily' | 'weekly';

export interface Costume { id: string; look: number; tier: CostumeTier; expiresAt: number; ench: Ench[]; rr: number }
export interface CostumeState {
  worn: Costume | null; bag: Costume[];
  mats: Record<CosMat, number>; luck: Record<LuckKey, number>;
  loom: { kind: LoomKind; endAt: number } | null;
  /** üst üste başarısız üretim sayısı (şans payı) */
  pity: number; crafted: number;
}
export const newCostumeState = (): CostumeState => ({ worn: null, bag: [], mats: { lif: 0, boya: 0, ipek: 0, nakis: 0 }, luck: { boncuk: 0, dugum: 0, nazar: 0, kagit: 0 }, loom: null, pity: 0, crafted: 0 });

export const DAY = 86400000;
export const COSTUME = {
  baseDays: 7, extendDays: 7, maxDays: 14, graceDays: 0, bagMax: 5, maxLines: 3,
  /** kostüm basamağı için en düşük seviye */
  tierLevel: [1, 12, 28, 42] as number[],
  /** başlangıç efsun satırı */
  startLines: [0, 1, 1, 2] as number[],
  /** temel özellik çarpanı ve efsun aralığı ölçeği (minimal!) */
  baseMult: [0.5, 0.75, 1.0, 1.3] as number[], enchScale: [0.4, 0.45, 0.5, 0.6] as number[],
  /** maliyet çarpanları (× birim) */
  loomDaily: 1.0, loomWeekly: 5.0, loomDailyHours: 24, loomWeeklyDays: 7,
  craftGold: [4, 12, 35, 90] as number[],
  craftMats: [{ lif: 12, boya: 2, ipek: 0, nakis: 0 }, { lif: 20, boya: 6, ipek: 3, nakis: 0 }, { lif: 30, boya: 10, ipek: 8, nakis: 1 }, { lif: 45, boya: 16, ipek: 14, nakis: 2 }] as Record<CosMat, number>[],
  craftChance: [0.85, 0.6, 0.38, 0.18] as number[], pityStep: 0.04, pityMax: 0.25, boncukStep: 0.08, boncukMax: 3, dugumReturn: 0.6,
  addLine: 4, rerollAll: 2, rerollAllPerLine: 2, rerollLine: 3, rerollGrow: 0.15, lookChange: 3,
  extend: [14, 36, 85, 190] as number[], extendPerLine: 0.25, extendGraceMult: 2,
  /** efsun değiştirme: kağıt + akçe (kağıt tezgâh dükkânından ya da zindan/tezgâh düşüşünden) */
  shop: { boncuk: 6, dugum: 14, nazar: 10, kagit: 3 } as Record<LuckKey, number>,
};
/** Maliyet birimi: seviye 10 ≈ 1.6 bin, 30 ≈ 9 bin, 45 ≈ 18 bin akçe */
export const costUnit = (level: number) => Math.max(60, Math.round(40 * Math.pow(Math.max(1, level), 1.6) / 10) * 10);
export const gold = (level: number, mult: number) => Math.round(costUnit(level) * mult);

/** Görünüm tablosu: palet + temel özellik */
export interface LookDef { key: string; base: EnchKey; pal: { main: string; accent: string; dark: string } }
export const LOOKS: LookDef[] = [
  { key: 'kurt', base: 'mspd', pal: { main: '#9aa6b8', accent: '#e8eef8', dark: '#4a5668' } },
  { key: 'ates', base: 'atkPct', pal: { main: '#e0603a', accent: '#ffd166', dark: '#8a2a14' } },
  { key: 'ay', base: 'leech', pal: { main: '#c9c6ee', accent: '#fff8d8', dark: '#6a64a8' } },
  { key: 'orman', base: 'hpPct', pal: { main: '#3f9a5a', accent: '#d6f0a0', dark: '#1f5a34' } },
  { key: 'kar', base: 'defPct', pal: { main: '#eaf4ff', accent: '#7fc0ff', dark: '#7a98c0' } },
  { key: 'altin', base: 'xpPct', pal: { main: '#e8b838', accent: '#fff0a0', dark: '#9a6a14' } },
];
/** Anlık görüntü kodu: 0 = yok; aksi hâlde look*4 + basamak + 1 */
export const costumeCode = (c: Costume | null | undefined) => (c ? c.look * 4 + c.tier + 1 : 0);
export const decodeCostume = (code: number) => (code > 0 ? { look: Math.floor((code - 1) / 4), tier: ((code - 1) % 4) as CostumeTier } : null);

export const isExpired = (c: Costume, now: number) => now >= c.expiresAt;
export const inGrace = (c: Costume, now: number) => isExpired(c, now) && now < c.expiresAt + COSTUME.graceDays * DAY;
/** Etkin (süresi dolmamış) giyili kostümün satırları */
export function costumeLines(c: Costume | null | undefined, now: number): Ench[] {
  if (!c || isExpired(c, now)) return [];
  return [baseLine(c), ...c.ench];
}
export function baseLine(c: { look: number; tier: CostumeTier }): Ench {
  const k = LOOKS[c.look].base; const v = Math.round(ENCH_TABLE[k][0] * COSTUME.baseMult[c.tier] * 10) / 10; return { k, v };
}
export function rollLine(rng: Rng, tier: CostumeTier, exclude: EnchKey[], lucky = false): Ench {
  const pool = ENCH_KEYS.filter((k) => !exclude.includes(k)); const k = pool[Math.floor(rng() * pool.length)];
  const [lo, hi] = ENCH_TABLE[k]; const s = COSTUME.enchScale[tier]; const roll = () => lo * s + (hi * s - lo * s) * rng();
  const v = lucky ? Math.max(roll(), roll()) : roll();   // nazar: iki zarın iyisi
  return { k, v: Math.max(0.5, Math.round(v * 10) / 10) };
}

export function craftChance(tier: CostumeTier, pity: number, boncuk: number) {
  return Math.min(0.95, COSTUME.craftChance[tier] + Math.min(COSTUME.pityMax, pity * COSTUME.pityStep) + Math.min(COSTUME.boncukMax, boncuk) * COSTUME.boncukStep);
}
export const extendCost = (c: Costume, level: number, expired: boolean) => Math.round(gold(level, COSTUME.extend[c.tier] * (1 + COSTUME.extendPerLine * c.ench.length)) * (expired ? COSTUME.extendGraceMult : 1));
export const addLineCost = (c: Costume, level: number) => gold(level, COSTUME.addLine * (1 + c.ench.length));
export const rerollAllCost = (c: Costume, level: number) => gold(level, (COSTUME.rerollAll + COSTUME.rerollAllPerLine * c.ench.length) * (1 + COSTUME.rerollGrow * c.rr));
export const rerollLineCost = (c: Costume, level: number) => gold(level, COSTUME.rerollLine * (1 + COSTUME.rerollGrow * c.rr));

/** Tezgâh üretim tablosu (bir günlük tur) */
export function loomRoll(rng: Rng): { mats: Partial<Record<CosMat, number>>; luck: Partial<Record<LuckKey, number>> } {
  const mats: Partial<Record<CosMat, number>> = { lif: 6 + Math.floor(rng() * 5) };
  const boya = Math.floor(rng() * 3); if (boya) mats.boya = boya;
  if (rng() < 0.4) mats.ipek = 1; if (rng() < 0.12) mats.nakis = 1;
  const luck: Partial<Record<LuckKey, number>> = {}; const r = rng(); if (r < 0.02) luck.boncuk = 1; else if (r < 0.03) luck.nazar = 1; else if (r < 0.035) luck.dugum = 1; else if (r < 0.085) luck.kagit = 1;
  return { mats, luck };
}
export function newCostume(rng: Rng, look: number, tier: CostumeTier, now: number): Costume {
  const c: Costume = { id: newId('c'), look, tier, expiresAt: now + COSTUME.baseDays * DAY, ench: [], rr: 0 };
  for (let i = 0; i < COSTUME.startLines[tier]; i++) c.ench.push(rollLine(rng, tier, [LOOKS[look].base, ...c.ench.map((e) => e.k)]));
  return c;
}
/** Kostüm kapıdaki Dokuma Tezgâhı */
export const LOOM_POS = { x: 20, z: -25, interact: 9 };
