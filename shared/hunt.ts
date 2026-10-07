import { MAX_LEVEL, campTypesForLevel, mobGold, xpToNext, type MobType } from './game';

/**
 * Av Dilekleri (Metin2 "Av Görevleri"nin KUT karşılığı): Ak Sakal her seviyede yurda bir av dileği bırakır.
 *  - Her seviye atlayışta (Sv 2'den) kendiliğinden verilir; biriken dilekler en eskiden başlayarak sırayla görünür.
 *  - Kendi seviyendeki bozkır yaratıklarından belli sayıda avlarsın; bitince ödül kendiliğinden gelir.
 *  - Atlayabilirsin ama atlanan dilek geri gelmez (kasıtlı: ışık her zaman şimdiki avlakta).
 *  - Ödül: o seviyenin deneyim gereksinimi × %15; oyuncu dilekten çok ilerideyse %1'e düşer (ödül yaşlanır).
 */
export const HUNT_MIN_LEVEL = 2;
export const HUNT_XP_PCT = 0.15;
export const HUNT_LATE_PCT = 0.01;
/** oyuncu seviyesi dilek seviyesini bu kadar geçtiyse ödül yaşlanmıştır */
export const HUNT_LATE_GAP = 5;
/** yaratık, dilek seviyesinden bu kadar aşağıdaysa sayılmaz (düşük seviye kasma dileği doldurmasın) */
export const HUNT_MOB_SLACK = 5;
export interface HuntGoal { type: MobType; n: number }
export interface HuntQuest { lv: number; goals: HuntGoal[]; gold: number; charm: number; book: number }

export function huntQuest(lv: number): HuntQuest {
  const types = campTypesForLevel(lv);
  const n1 = Math.round(10 + (lv - HUNT_MIN_LEVEL) * 1.5);
  const goals: HuntGoal[] = [{ type: types[0], n: n1 }, { type: types[1], n: Math.max(5, Math.round(n1 / 2)) }];
  const gold = lv < 10 ? 0 : Math.round(mobGold(lv) * (goals[0].n + goals[1].n) * 0.5);
  const tenth = lv % 10 === 0;
  return { lv, goals, gold, charm: tenth ? 1 : 0, book: tenth ? 1 : 0 };
}
/** dilek ödülü deneyimi (kaynak seviye üzerinden; oyuncu çok ilerideyse yaşlanmış oran) */
export const huntXp = (questLv: number, playerLv: number) =>
  Math.round(xpToNext(questLv) * (playerLv - questLv > HUNT_LATE_GAP ? HUNT_LATE_PCT : HUNT_XP_PCT));
/** Etkin dilek: seviyeye ulaşılmış, tamamlanmamış/atlanmamış en eski dilek (yoksa null) */
export function activeHunt(level: number, done: readonly number[]): number | null {
  for (let lv = HUNT_MIN_LEVEL; lv <= Math.min(level, MAX_LEVEL); lv++) if (!done.includes(lv)) return lv;
  return null;
}
export const huntCounts = (level: number, done: readonly number[]) => {
  let n = 0; for (let lv = HUNT_MIN_LEVEL; lv <= Math.min(level, MAX_LEVEL); lv++) if (!done.includes(lv)) n++; return n;
};
