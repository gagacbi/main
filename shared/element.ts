import { upgradeCost, type MobType } from './game';

/**
 * Element yazısı (Metin2 "Element Yazısı" esinli): +7 ve üstü silaha 6 elementten biri eklenir; güç 1–8 ile başlar, +24'e kadar yükseltilir.
 * Yaratığın zayıf olduğu elementte hasar artar, diğerlerinde çok az. PvP'ye etkisi YOKTUR. Risk: başarısız yükseltmede yalnızca akçe gider (eşya kaybı yok).
 * Amaç: yüksek akçe sink'i (Demirci +9 maliyetinin %60'ı ekleme, 2× değiştirme, güce bağlı yükseltme).
 */
export type ElKey = 'ates' | 'buz' | 'simsek' | 'toprak' | 'ruzgar' | 'karanlik';
export const EL_KEYS: ElKey[] = ['ates', 'buz', 'simsek', 'toprak', 'ruzgar', 'karanlik'];
export interface ItemEl { k: ElKey; p: number }
export const EL = {
  minUp: 7, maxPower: 24, addMax: 8, weakPerPower: 0.005, neutralPerPower: 0.0015,
  colors: { ates: '#ff7a3a', buz: '#8fe0ff', simsek: '#ffe84a', toprak: '#b98a4a', ruzgar: '#a8f0c8', karanlik: '#9a5ae0' } as Record<ElKey, string>,
  /** yaratık türü → zayıf olduğu iki element (bekçi hepsine eşit dayanıklı) */
  weak: { tepegoz: ['ruzgar', 'simsek'], albasti: ['ates', 'buz'], erlik: ['simsek', 'toprak'], cakal: ['toprak', 'karanlik'], bekci: [] } as Record<MobType, ElKey[]>,
  addCost: (ilvl: number) => Math.round(upgradeCost(9, ilvl).gold * 0.6), swapCost: (ilvl: number) => Math.round(upgradeCost(9, ilvl).gold * 1.2),
  raiseCost: (ilvl: number, power: number) => Math.round(upgradeCost(9, ilvl).gold * 0.6 * 0.4 * (1 + power / 8)), raiseRate: (power: number) => (power < 8 ? 0.75 : power < 16 ? 0.55 : 0.35),
};
/** PvE hasar çarpanı: zayıf elementte güç başına +%0,5 (en çok +%12), diğerinde +%0,15 */
export const elMult = (el: ItemEl | undefined, mob: MobType): number => (el ? 1 + el.p * (EL.weak[mob]?.includes(el.k) ? EL.weakPerPower : EL.neutralPerPower) : 1);
