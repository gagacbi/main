/**
 * Oyuncu arketipleri. Her biri farklı niyet, bilgi ve beceri düzeyine sahip gerçekçi bir oyuncu tipidir.
 * "Lamba etkisi": oyuncular bilginin ve ödülün göründüğü yere gider; arketipler bu davranış biçimlerini taklit eder
 * (en iyi kampı arayan, kalabalığı izleyen, rastgele giden, riskten kaçan, zorlayan...).
 */
import type { DmgKind, Spec } from '../../../shared/game';

export type CampMode = 'best' | 'crowd' | 'random' | 'safe' | 'push';
export interface Arch {
  key: string; name: string; weight: number;
  /** günlük oyun süresi (dk) */ minutes: [number, number];
  /** 4 zaman diliminde (gece, sabah-öğle, ikindi, akşam) bulunma olasılığı */ slices: [number, number, number, number];
  camp: CampMode; offset: [number, number];
  /** beceri kullanma doğruluğu (0–1) */ skill: [number, number];
  /** can bu orana inince yurda çekilir */ retreat: [number, number];
  /** dilim içi etkinlik ağırlıkları */ act: { farm: number; boss: number; rift: number; pvp: number };
  upgrade: { safeUp: number; riskUp: number; charm: boolean; book: boolean };
  /** savunma türünü tehdide göre seçme olasılığı */ defAware: number;
  /** akıllı silah seçimi (yürürken vuramayan menzilliyi ayıklar) */ smartWeapon: number;
  market: { sell: number; buy: number; flip: boolean; craft: boolean };
  pvp: { fightBack: number; lowbies: boolean; flee: number };
  /** oba özeni (bağış, bina, sefer) */ oba: number;
  spec: 'kilic' | 'kalkan' | 'random';
  /** başlangıç seviyesi aralığı (nüfusun yaşı karışık) */ start: [number, number];
}
const A = (a: Arch) => a;
export const ARCHS: Arch[] = [
  A({ key: 'cekirdek', name: 'Çekirdek farmcı', weight: 14, minutes: [240, 420], slices: [0.2, 0.7, 0.8, 0.9], camp: 'best', offset: [0, 1], skill: [0.85, 1], retreat: [0.25, 0.35], act: { farm: 0.8, boss: 0.1, rift: 0.1, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 6, charm: true, book: true }, defAware: 0.6, smartWeapon: 1, market: { sell: 0.5, buy: 0.4, flip: false, craft: true }, pvp: { fightBack: 0.5, lowbies: false, flee: 0.3 }, oba: 0.8, spec: 'kilic', start: [8, 40] }),
  A({ key: 'gundelik', name: 'Gündelik oyuncu', weight: 24, minutes: [45, 120], slices: [0.05, 0.3, 0.5, 0.8], camp: 'random', offset: [-3, 1], skill: [0.5, 0.85], retreat: [0.2, 0.35], act: { farm: 0.9, boss: 0.03, rift: 0.07, pvp: 0 }, upgrade: { safeUp: 3, riskUp: 4, charm: false, book: false }, defAware: 0.1, smartWeapon: 0.7, market: { sell: 0.3, buy: 0.1, flip: false, craft: false }, pvp: { fightBack: 0.3, lowbies: false, flee: 0.4 }, oba: 0.3, spec: 'random', start: [1, 25] }),
  A({ key: 'boss', name: 'Boss avcısı', weight: 9, minutes: [120, 300], slices: [0.1, 0.5, 0.7, 0.9], camp: 'best', offset: [0, 2], skill: [0.8, 1], retreat: [0.2, 0.3], act: { farm: 0.3, boss: 0.6, rift: 0.1, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 6, charm: true, book: true }, defAware: 0.9, smartWeapon: 1, market: { sell: 0.4, buy: 0.5, flip: false, craft: false }, pvp: { fightBack: 0.6, lowbies: false, flee: 0.3 }, oba: 0.4, spec: 'kalkan', start: [15, 48] }),
  A({ key: 'catlak', name: 'Çatlak avcısı', weight: 9, minutes: [120, 300], slices: [0.1, 0.6, 0.7, 0.9], camp: 'best', offset: [0, 1], skill: [0.75, 1], retreat: [0.2, 0.3], act: { farm: 0.3, boss: 0.1, rift: 0.6, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 5, charm: true, book: true }, defAware: 0.5, smartWeapon: 0.9, market: { sell: 0.4, buy: 0.3, flip: false, craft: false }, pvp: { fightBack: 0.5, lowbies: false, flee: 0.3 }, oba: 0.4, spec: 'kilic', start: [10, 45] }),
  A({ key: 'pvp', name: 'PvP avcısı', weight: 8, minutes: [90, 240], slices: [0.2, 0.4, 0.7, 0.95], camp: 'push', offset: [0, 2], skill: [0.85, 1], retreat: [0.2, 0.3], act: { farm: 0.35, boss: 0, rift: 0.05, pvp: 0.6 }, upgrade: { safeUp: 4, riskUp: 6, charm: true, book: true }, defAware: 0.9, smartWeapon: 1, market: { sell: 0.3, buy: 0.6, flip: false, craft: false }, pvp: { fightBack: 1, lowbies: true, flee: 0.15 }, oba: 0.2, spec: 'kilic', start: [12, 46] }),
  A({ key: 'tuccar', name: 'Tüccar / zanaatkâr', weight: 10, minutes: [90, 200], slices: [0.2, 0.6, 0.6, 0.8], camp: 'safe', offset: [-3, -1], skill: [0.7, 0.95], retreat: [0.3, 0.4], act: { farm: 0.95, boss: 0, rift: 0.05, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 4, charm: true, book: true }, defAware: 0.3, smartWeapon: 1, market: { sell: 1, buy: 0.9, flip: true, craft: true }, pvp: { fightBack: 0.1, lowbies: false, flee: 0.5 }, oba: 0.7, spec: 'kalkan', start: [10, 40] }),
  A({ key: 'teorisyen', name: 'Savunma teorisyeni', weight: 6, minutes: [120, 260], slices: [0.1, 0.5, 0.7, 0.9], camp: 'best', offset: [0, 2], skill: [0.9, 1], retreat: [0.2, 0.3], act: { farm: 0.55, boss: 0.3, rift: 0.1, pvp: 0.05 }, upgrade: { safeUp: 5, riskUp: 7, charm: true, book: true }, defAware: 1, smartWeapon: 1, market: { sell: 0.5, buy: 0.8, flip: false, craft: true }, pvp: { fightBack: 0.7, lowbies: false, flee: 0.25 }, oba: 0.6, spec: 'random', start: [15, 48] }),
  A({ key: 'yeni', name: 'Yeni başlayan', weight: 12, minutes: [30, 100], slices: [0.05, 0.3, 0.5, 0.8], camp: 'random', offset: [-1, 4], skill: [0.15, 0.55], retreat: [0.05, 0.2], act: { farm: 0.9, boss: 0.05, rift: 0.05, pvp: 0 }, upgrade: { safeUp: 6, riskUp: 8, charm: false, book: false }, defAware: 0, smartWeapon: 0.15, market: { sell: 0.1, buy: 0, flip: false, craft: false }, pvp: { fightBack: 0.2, lowbies: false, flee: 0.1 }, oba: 0.1, spec: 'random', start: [1, 6] }),
  A({ key: 'sosyal', name: 'Oba / sosyal', weight: 5, minutes: [60, 150], slices: [0.1, 0.4, 0.6, 0.9], camp: 'crowd', offset: [-2, 0], skill: [0.6, 0.9], retreat: [0.25, 0.35], act: { farm: 0.85, boss: 0.05, rift: 0.1, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 5, charm: true, book: false }, defAware: 0.3, smartWeapon: 0.8, market: { sell: 0.5, buy: 0.3, flip: false, craft: false }, pvp: { fightBack: 0.4, lowbies: false, flee: 0.35 }, oba: 1, spec: 'random', start: [3, 30] }),
  A({ key: 'surucu', name: 'Sürü izleyen', weight: 3, minutes: [60, 160], slices: [0.1, 0.4, 0.7, 0.95], camp: 'crowd', offset: [-1, 1], skill: [0.55, 0.9], retreat: [0.2, 0.3], act: { farm: 0.95, boss: 0.02, rift: 0.03, pvp: 0 }, upgrade: { safeUp: 4, riskUp: 5, charm: false, book: false }, defAware: 0.2, smartWeapon: 0.8, market: { sell: 0.3, buy: 0.2, flip: false, craft: false }, pvp: { fightBack: 0.3, lowbies: false, flee: 0.35 }, oba: 0.3, spec: 'kilic', start: [5, 35] }),
];
export const KINDS: DmgKind[] = ['kilic', 'cift', 'bicak', 'yay', 'buyu'];
export const specOf = (a: Arch, r: () => number): Spec => (a.spec === 'random' ? (r() < 0.5 ? 'kalkan' : 'kilic') : a.spec);
