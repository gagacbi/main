import { MAX_LEVEL, campTypesForLevel, type MobType } from './game';

/**
 * Alp Avı: her seviyede otomatik verilen av görevi (Metin2 "Av Görevleri" esinli).
 * Hedefler kamp türlerinden türetilir (elle liste yok); ödül %XP + (5. seviyelerde) eşya + (10. seviyelerde) kitap/tılsım. Akçe ödülü YOK (ekonomi kilitli).
 * Geride kalan görev (seviye < oyuncu seviyesi) yalnızca %1 XP verir ve eşya vermez; "atla" geri alınamaz.
 */
export const HUNT = { first: 2, xpPct: 0.15, xpPctLvl11: 0.3, latePct: 0.01, minMobLvlGap: 3 };
export interface HuntDef { lv: number; types: [MobType, MobType]; n: [number, number]; xpPct: number; item: boolean; book: number; charm: number }
export function huntFor(lv: number): HuntDef {
  const pool = campTypesForLevel(lv); const a = pool[lv % pool.length]; let b = pool[(lv + 1) % pool.length]; if (b === a) b = pool[(lv + 2) % pool.length];
  return { lv, types: [a, b], n: [8 + Math.floor(lv * 0.7), 5 + Math.floor(lv * 0.5)], xpPct: lv === 11 ? HUNT.xpPctLvl11 : HUNT.xpPct, item: lv % 5 === 0, book: lv % 10 === 0 ? 2 : 0, charm: lv % 10 === 0 ? 1 : 0 };
}
export interface HuntState { lv: number; k: [number, number] }
export const HUNT_LAST = MAX_LEVEL;
