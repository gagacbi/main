import { type Ench } from './game';
import { costUnit } from './costume';

/**
 * Kut Taşları (Metin2 "Ejderha Taşı Simyası" esinli): 6 türde taş; 5 sınıf (Ham → Saf → Parlak → Kutlu → Ulu).
 * Düşer (yaratık/boss), Demirci'de saflaştırılır (3 aynı taş → 1 üst sınıf, şansa bağlı, akçe ister), kuşak yuvalarına takılır; her yuva kalıcı bir istatistik verir.
 * Sink: saflaştırma akçesi + başarısızlıkta taş kaybı + çıkarırken kırılma riski. Sette bonus: 6 yuva dolu ve hepsi aynı sınıf eşiğinde.
 * PvP'ye etki eder (istatistik), ama yalnızca küçük yüzdelerle; en çok Ulu set ≈ +%8 saldırı tek parça başına.
 */
export type KtType = 'alp' | 'kalkan' | 'can' | 'kesin' | 'cevik' | 'emen';
export const KT_TYPES: KtType[] = ['alp', 'kalkan', 'can', 'kesin', 'cevik', 'emen'];
export const KT_GRADES = 5;
export const KT = {
  minLevel: 15, dropChance: 0.009, bossGrade1: 0.3, refineNeed: 3, refineRate: [0.7, 0.5, 0.35, 0.22], failLose: 2, unsetKeep: 0.7,
  stat: { alp: 'atkPct', kalkan: 'defPct', can: 'hpPct', kesin: 'crit', cevik: 'aspd', emen: 'leech' } as Record<KtType, Ench['k']>,
  val: {
    alp: [1, 2, 3.5, 5.5, 8], kalkan: [1.5, 3, 5, 7.5, 11], can: [2, 4, 6.5, 10, 14], kesin: [0.5, 1, 1.8, 2.8, 4], cevik: [1, 2, 3.5, 5, 7], emen: [0.5, 1, 1.8, 2.8, 4],
  } as Record<KtType, number[]>,
  colors: { alp: '#e05a3a', kalkan: '#4a8ae0', can: '#5ac86a', kesin: '#f0c14a', cevik: '#b07ae0', emen: '#e07aa8' } as Record<KtType, string>,
  /** saflaştırma akçesi: seviye ekonomisine bağlı birim × sınıf çarpanı */
  refineCost: (grade: number, level: number) => Math.round(costUnit(Math.max(KT.minLevel, level)) * [2, 6, 16, 40][grade]),
  set: [{ min: 0, bonus: [{ k: 'atkPct', v: 2 }, { k: 'defPct', v: 2 }] }, { min: 3, bonus: [{ k: 'xpPct', v: 3 }, { k: 'hpPct', v: 4 }] }] as { min: number; bonus: Ench[] }[],
};
export interface KtState { s: number[][]; eq: number[] }   // s[tür][sınıf] = adet; eq[tür] = takılı sınıf (-1 yok)
export const newKt = (): KtState => ({ s: KT_TYPES.map(() => new Array(KT_GRADES).fill(0)), eq: KT_TYPES.map(() => -1) });
export const ktNorm = (k?: KtState): KtState => { const n = k ?? newKt(); if (!Array.isArray(n.s) || n.s.length !== KT_TYPES.length) return newKt(); return n; };
/** takılı taşlardan gelen istatistik satırları (set bonuslarıyla) */
export function ktLines(k: KtState | undefined): Ench[] {
  if (!k) return []; const out: Ench[] = [];
  KT_TYPES.forEach((t, i) => { const g = k.eq[i]; if (g >= 0) out.push({ k: KT.stat[t], v: KT.val[t][g] }); });
  if (k.eq.every((g) => g >= 0)) { const lo = Math.min(...k.eq); for (const st of KT.set) if (lo >= st.min) out.push(...st.bonus); }
  return out;
}
export const ktCount = (k: KtState | undefined) => (k ? k.s.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0) : 0);
