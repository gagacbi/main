import { FISH } from './fishing';
import type { Rng } from './rng';

/**
 * Obanın Günlüğü: Sv 10'dan itibaren her gün 4 görev (öldür, topla, balık tut, av/çatlak/zindan). Gün sınırı zindan günüyle aynıdır (dungeonDay).
 * Ödül her görev için rastgele: XP · Kımız · Demirci kitabı · kostüm lifi. Dördü bitince Günlük Hediye (Kımız ×3 + kitap ×2). Akçe ve tılsım VERİLMEZ (ekonomi kilitli).
 */
export const DAILY = { minLevel: 10, count: 4, xpPct: 0.12, rewardKimiz: 2, rewardBook: 1, rewardLif: 3, gift: { kimiz: 3, book: 2 } };
export type DailyKind = 'kill' | 'mat' | 'fish' | 'hunt' | 'rift' | 'dungeon';
export type DailyReward = 'xp' | 'kimiz' | 'book' | 'lif';
export interface DailyTask { k: DailyKind; need: number; done: number; claimed: boolean; reward: DailyReward }
export interface DailyState { day: number; tasks: DailyTask[]; gift: boolean }
export type DailyView = DailyState;

const need = (k: DailyKind, level: number): number => k === 'kill' ? 25 + Math.round(level * 0.8) : k === 'mat' ? 12 + Math.round(level / 2) : k === 'fish' ? 3 : 1;
/** O güne ait 4 görev: kill her zaman var; diğerleri seviyeye uygun havuzdan, yinelenmeden */
export function dailyRoll(r: Rng, level: number, day: number): DailyState {
  const pool: DailyKind[] = ['mat', 'hunt', 'rift']; if (level >= FISH.minLevel) pool.push('fish', 'fish'); if (level >= 41) pool.push('dungeon', 'dungeon');
  const kinds: DailyKind[] = ['kill']; while (kinds.length < DAILY.count && pool.length) { const k = pool.splice(Math.floor(r() * pool.length), 1)[0]; if (!kinds.includes(k)) kinds.push(k); }
  const rw = (): DailyReward => { const x = r(); return x < 0.4 ? 'xp' : x < 0.7 ? 'kimiz' : x < 0.85 ? 'book' : 'lif'; };
  return { day, gift: false, tasks: kinds.map((k) => ({ k, need: need(k, level), done: 0, claimed: false, reward: rw() })) };
}
