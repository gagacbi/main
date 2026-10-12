import { mobGold, type Tier } from './game';
import type { BossDef } from './world';

/**
 * Boss anahtarı ve Kut Sandığı (Metin2 sandık/anahtar esinli): saha ve zindan bossları öldüğünde ödül hakkı olan herkese bossun sınıfında bir anahtar düşer.
 * Her bossun inini işaretleyen bir sandık vardır; sandık, kendi sınıfındaki ya da DAHA YÜKSEK sınıf bir anahtarla açılır (en düşük yeterli anahtar harcanır).
 * Sandık: akçe, katmanı yüksek eşya, Kut Taşı, kitap/tılsım/parça. Anahtarlar pazarda takas EDİLMEZ (ilk sürüm). Sandık sürekli durur; sınır anahtardır (boss yeniden doğuşu).
 */
export const CHEST_GRADES = ['bronz', 'gumus', 'altin'] as const;
export type ChestGrade = 0 | 1 | 2;
export const CHEST = {
  interact: 6, offset: { x: 7, z: 3 }, gradeMaxLv: [19, 39] as [number, number], colors: ['#c9803a', '#cfd6e0', '#ffd24a'],
  gold: [6, 10, 16] as number[],   // × mobGold(boss seviyesi)
  items: [1, 1, 2] as number[], minTier: [1, 2, 3] as Tier[], stone: [0.35, 0.55, 0.85] as number[], stoneG1: [0, 0.3, 0.5] as number[],
  books: [[1, 1], [1, 2], [2, 3]] as [number, number][], charm: [0.1, 0.25, 0.5] as number[], frag: [[1, 1], [1, 2], [2, 3]] as [number, number][],
  goldAmount: (grade: number, bossLevel: number) => Math.round(mobGold(bossLevel) * CHEST.gold[grade]),
};
export const gradeOfLevel = (lvl: number): ChestGrade => (lvl <= CHEST.gradeMaxLv[0] ? 0 : lvl <= CHEST.gradeMaxLv[1] ? 1 : 2);
export const chestPos = (b: Pick<BossDef, 'x' | 'z'>) => ({ x: b.x + CHEST.offset.x, z: b.z + CHEST.offset.z });
export type KeyCounts = [number, number, number];
export const normKeys = (k?: number[]): KeyCounts => [Math.max(0, k?.[0] ?? 0), Math.max(0, k?.[1] ?? 0), Math.max(0, k?.[2] ?? 0)];
/** sandığı açacak en düşük yeterli anahtar sınıfı; yoksa -1 */
export const keyFor = (keys: KeyCounts, chestGrade: number): number => { for (let g = chestGrade; g < 3; g++) if (keys[g] > 0) return g; return -1; };
