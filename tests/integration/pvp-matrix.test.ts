import { describe, expect, test } from 'vitest';
import { BUILDS, duel, matrix } from '../sim/pvp';

/** PvP değişmezleri (docs/TEST_FELSEFESI.md): tek bir baskın yapı, hiç av/rakibi olmayan yapı, uzmanlık tekeli olmamalı. */
describe('PvP eşleşme matrisi', () => {
  const m = matrix(30, 4, 3);
  test('hiçbir yapı genel kazanma oranında %80’i aşmaz ya da %10’un altına inmez (niş karşı-yapı hariç)', () => {
    for (const r of m.rows) { if (/Büyü Savunmalı/.test(r.name)) continue; expect(r.winRate, r.name).toBeGreaterThan(25); expect(r.winRate, r.name).toBeLessThan(80); }
  });
  test('her ana yapının en az bir avı (≥%60) ve en az bir rakibi (≤%40) vardır: taş-kağıt-makas dokusu', () => {
    BUILDS.forEach((b, i) => {
      if (/Büyü Savunmalı/.test(b.name)) return;
      const row = m.rate[i].filter((x): x is number => x !== null);
      expect(Math.max(...row), b.name + ' avı yok').toBeGreaterThanOrEqual(60); expect(Math.min(...row), b.name + ' rakibi yok').toBeLessThanOrEqual(40);
    });
  });
  test('uzmanlık aynalı düello: aynı boy, aynı donanım — Kalkan ve Kılıç Alp birbirini en çok %75 yener (her ikisi de seçilmeye değer)', () => {
    const base = BUILDS[0]; let kw = 0, n = 0;
    for (const [L, up] of [[20, 3], [30, 4], [40, 5]] as const) for (let s = 0; s < 4; s++) for (const f of [false, true]) {
      const K = { ...base, name: 'K', spec: 'kalkan' as const }, S = { ...base, name: 'S', spec: 'kilic' as const };
      const r = f ? duel(S, K, L, up, 300 + s) : duel(K, S, L, up, 300 + s); n++; if ((r.winner === 1 && !f) || (r.winner === 2 && f)) kw++;
    }
    expect(kw / n).toBeGreaterThan(0.25); expect(kw / n).toBeLessThan(0.75);
  });
  test('düello süresi makul: ortalama 12–60 sn (anlık ölüm ya da ölümsüzlük yok)', () => { expect(m.avgSec).toBeGreaterThan(12); expect(m.avgSec).toBeLessThan(60); });
  test('savunma karşı-yapıları işler: kılıç savunması yalnızca kılıç türünü keser; çift el/bıçak/yay vuranlar onu yenebilir', () => {
    const idx = (n: string) => BUILDS.findIndex((b) => b.name === n); const ks = idx('Kılıç Savunmalı Kalkan');
    const vsKilicLike = m.rate[ks][idx('Dengeli Kılıç')] ?? 0; const vsBicak = m.rate[ks][idx('Hızlı Bıçak')] ?? 0; const vsCift = m.rate[ks][idx('Ağır Çift El')] ?? 0;
    expect(vsKilicLike).toBeGreaterThan(Math.min(vsBicak, vsCift) + 20);
  });
});
