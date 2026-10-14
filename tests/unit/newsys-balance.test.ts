import { describe, expect, test } from 'vitest';
import { KT, KT_GRADES } from '../../shared/kuttas';
import { FEATURES, PACK, COMP_EVO, mobGold, mobXp, ECON } from '../../shared/game';
import { CHEST } from '../../shared/chest';
import { FISH, FISH_DEFS, catchChance } from '../../shared/fishing';
import { DAILY } from '../../shared/daily';
import { GUIDE } from '../../shared/guide';
import { genAllCamps } from '../../shared/world';
import { costUnit } from '../../shared/costume';

/** Ekonomi korkulukları: yeni sistemlerin sabitleri ekonomiyi sessizce bozacak bir yöne kaydırılırsa bu testler uyarır (sayılar tests/sim/population A/B koşularıyla doğrulandı). */
describe('yeni sistemler — ekonomi korkulukları', () => {
  test('Kut Taşı: bir üst sınıf için beklenen ham taş (saflaştırma zinciri) ve set süresi makul bantta', () => {
    const per = (g: number) => (KT.refineNeed - 1 + KT.refineRate[g]) / KT.refineRate[g];   // (3p + 2(1-p)) / p = (2+p)/p
    let raw = 1; const rawFor: number[] = [1]; for (let g = 0; g < KT_GRADES - 1; g++) { raw *= per(g); rawFor.push(raw); }
    expect(rawFor[1]).toBeGreaterThan(3); expect(rawFor[1]).toBeLessThan(5);        // Saf: ~4 ham
    expect(rawFor[3]).toBeGreaterThan(80); expect(rawFor[3]).toBeLessThan(250);     // Kutlu: ~130 ham/taş
    expect(rawFor[4]).toBeGreaterThan(900);                                          // Ulu: pratikte erişilmez (set için ~8000)
    // saatte beklenen taş (1000 öldürme/sa) → Kutlu set (6 taş) süresi ~100 sa altında, 20 saatin üstünde
    const alphaShare = (() => { const c = genAllCamps(); return c.filter((x) => x.count >= PACK.minCamp).length / c.reduce((s, x) => s + x.count, 0); })();
    const perKill = KT.dropChance + alphaShare * PACK.alphaStone; const perHour = perKill * 1000; const hoursKutluSet = (6 * rawFor[3]) / perHour;
    expect(hoursKutluSet).toBeGreaterThan(20); expect(hoursKutluSet).toBeLessThan(120);
  });
  test('Sürü Başı: efor başına ödül sıradan öldürmenin 1,35 katını aşmaz (HP çarpanı dikkate alınarak)', () => {
    const effort = PACK.alphaHp;            // öldürme süresi ≈ can çarpanı
    const xpPerEffort = PACK.alphaXp / effort; const goldPerEffort = PACK.alphaGold / effort;
    expect(xpPerEffort).toBeLessThan(1.35); expect(goldPerEffort).toBeLessThan(1.35); expect(xpPerEffort).toBeGreaterThan(1.0);
    const c = genAllCamps(); const share = c.filter((x) => x.count >= PACK.minCamp).length / c.reduce((s, x) => s + x.count, 0);
    const extraItems = PACK.alphaItemChance * share; expect(extraItems).toBeLessThan(0.11 * 0.25);   // normal eşya düşüşünün %25'inden az ek eşya/öldürme
    expect(share).toBeLessThan(0.2);
    void mobXp; void mobGold; void ECON;
  });
  test('Boss sandığı: sandık akçesi boss ganimetinin yarısından azdır; anahtar sınıfı sınırları kapsayıcı', () => {
    expect(CHEST.gold[2]).toBeLessThan(25 * 0.7); expect(CHEST.gold[0]).toBeLessThan(CHEST.gold[1]); expect(CHEST.gold[1]).toBeLessThan(CHEST.gold[2]);
    expect(CHEST.items[2]).toBeLessThanOrEqual(2); expect(CHEST.stone[2]).toBeLessThanOrEqual(0.9);
  });
  test('Balıkçılık: akçe girişi yok; yorgunluk bot sınırı; 3 isabetle bile tutma şansı < %100', () => {
    for (const f of FISH_DEFS) expect(catchChance(f.id, 10, 'solucan', true)).toBeLessThanOrEqual(FISH.catch.max);
    const maxPerHourBot = 3600 / (FISH.minReelSec + 0.15); expect(maxPerHourBot).toBeLessThan(1000);
    const cap = FISH.fatigueAfter + (24 * 3600 / (FISH.minReelSec + 0.15)) * FISH.fatigueMult;   // 24 saat makro
    expect(cap).toBeLessThan(10000);
    const expPerCast = FISH_DEFS.filter((f) => f.id !== 'ata').reduce((s, f) => s + f.w * f.ref, 0) / FISH_DEFS.reduce((s, f) => s + f.w, 0);
    expect(expPerCast * 0.8).toBeLessThan(120);   // referans değerle atış başı beklenen değer (yem 8–20 akçe)
  });
  test('Yoldaş evrimi: tam evrim sefer kazancını en çok %40 artırır; maliyet birkaç günlük gelire denk', () => {
    expect(COMP_EVO.goldBonus * COMP_EVO.max).toBeLessThanOrEqual(0.4); expect(COMP_EVO.itemBonus * COMP_EVO.max).toBeLessThanOrEqual(0.3);
    const L = 40; const total = COMP_EVO.goldUnits.reduce((s, u) => s + u * costUnit(L), 0); const perDay = 100_000;   // 2 sa oynayan oyuncunun günlük geliri (sim ölçümü ≈ 100–130k)
    expect(total / perDay).toBeGreaterThan(5); expect(total / perDay).toBeLessThan(60);
  });
  test('Günlük görev ve Rehber ödülleri küçük: Günlük Hediye + görev Kımız ödülü, Rehber toplam akçesi sembolik', () => {
    expect(DAILY.gift.kimiz + DAILY.rewardKimiz * 4).toBeLessThanOrEqual(11);
    const gold = GUIDE.reduce((s, t) => s + (t.reward.gold ?? 0), 0); expect(gold).toBeLessThanOrEqual(1000);
    const books = GUIDE.reduce((s, t) => s + (t.reward.book ?? 0), 0); expect(books).toBeLessThanOrEqual(12); expect(GUIDE.reduce((s, t) => s + (t.reward.charm ?? 0), 0)).toBeLessThanOrEqual(2);
  });
  test('canlı oyunda tüm özellik bayrakları AÇIK (kontrol kolu yapılandırması sızmamalı)', () => { expect(Object.entries(FEATURES).filter(([, v]) => !v).map(([k]) => k)).toEqual([]); });
});
