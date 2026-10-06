import { KIMIZ, MARKET, type Bag } from './game';
import { COS_MATS, LUCK_KEYS, costUnit, newCostumeState, type CosMat, type CostumeState, type LuckKey } from './costume';

/**
 * Pazarda takas edilen yığın mallar: ham malzeme, kitap, tılsım, yazıt parçası, kostüm malzemeleri ve şans eşyaları (kâğıt dahil).
 * "Pazar yalnızca ekipman taşımasın": tüm kaynak döngüleri (zindan, tezgâh, çatlak) piyasaya bağlanır.
 */
export type BagGood = 'ore' | 'hide' | 'wood' | 'book' | 'charm' | 'frag';
export type GoodKey = BagGood | CosMat | LuckKey | 'kimiz';
export const BAG_GOODS: BagGood[] = ['ore', 'hide', 'wood', 'book', 'charm', 'frag'];
export const GOOD_KEYS: GoodKey[] = [...BAG_GOODS, 'kimiz', ...COS_MATS, ...LUCK_KEYS];
/** birim başına referans değer (orta seviye ekonomisi); fiyat sınırı ve "fırsat" göstergesi buna dayanır */
export const GOOD_REF: Record<GoodKey, number> = {
  ore: 12, hide: 16, wood: 14, book: 180, charm: 2200, frag: 260,
  kimiz: 4500, lif: 40, boya: 160, ipek: 400, nakis: 2500, boncuk: 9000, dugum: 22000, nazar: 15000, kagit: 6000,
};
export const isGood = (k: unknown): k is GoodKey => typeof k === 'string' && (GOOD_KEYS as string[]).includes(k);
export const goodRef = (k: GoodKey, qty: number) => Math.round(GOOD_REF[k] * qty);
/** Fiyat tabanı (ref × 0,15) ve tavanı (ref × 12): seviye ekonomisi farklarına izin verir, tuzak/aktarma fiyatlarını keser */
export const goodBounds = (k: GoodKey, qty: number) => ({ min: Math.max(1, Math.round(goodRef(k, qty) * 0.15)), max: Math.min(MARKET.absoluteMax, Math.round(goodRef(k, qty) * 12) + 200) });

export interface GoodHolder { bag: Bag; cos?: CostumeState; kimiz?: number }
/** Kımız NPC fiyatı (birim): seviyeye ölçekli, kostüm maliyet birimiyle aynı ölçek */
export const kimizPrice = (level: number) => Math.max(8, Math.round(costUnit(level) * KIMIZ.priceUnits));
export function goodGet(d: GoodHolder, k: GoodKey): number {
  if (k === 'kimiz') return d.kimiz ?? 0;
  if ((BAG_GOODS as string[]).includes(k)) return d.bag[k as BagGood];
  if ((COS_MATS as string[]).includes(k)) return d.cos?.mats[k as CosMat] ?? 0;
  return d.cos?.luck[k as LuckKey] ?? 0;
}
export function goodAdd(d: GoodHolder, k: GoodKey, n: number) {
  if (k === 'kimiz') { d.kimiz = (d.kimiz ?? 0) + n; return; }
  if ((BAG_GOODS as string[]).includes(k)) { d.bag[k as BagGood] += n; return; }
  d.cos ??= newCostumeState();
  if ((COS_MATS as string[]).includes(k)) d.cos.mats[k as CosMat] += n; else d.cos.luck[k as LuckKey] += n;
}
