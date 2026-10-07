import { describe, expect, test } from 'vitest';
import { duel, killsToLevel, mobAvg, refStats, upgradeEV } from '../sim/analytic';
import { CRAFT, STAT_CAP, lvlDiffIn, lvlDiffOut, SLOTS, computeStats, hitDamage, makeItem, xpToNext, type Boy, type Spec } from '../../shared/game';

/** Denge değişmezleri (docs/BALANS_RAPORU.md). Bir sayıyı elle oynayıp dengeyi bozarsan burası kırılır. */
describe('denge: savaş temposu (referans yapı)', () => {
  const Ls = [1, 3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  test('aynı seviye yaratığı öldürme süresi 2,5–6 sn (hiçbir seviyede anlık ölüm ya da sünme yok)', () => {
    for (const L of Ls) { const t = duel(L).ttk; expect(t, `Sv${L}`).toBeGreaterThan(2.5); expect(t, `Sv${L}`).toBeLessThan(6); }
  });
  test('öldürme başına can kaybı %3,5–7 (savaş her seviyede küçük bir bedel ister)', () => {
    for (const L of Ls) { const p = duel(L).takenPct; expect(p, `Sv${L}`).toBeGreaterThan(3.5); expect(p, `Sv${L}`).toBeLessThan(7); }
  });
  test('4’lü sürü yeteneksiz 12 sn’den kısa sürede öldürmez ama 45 sn’yi de aşmaz: yetenek gerekli, ölümcül değil', () => {
    for (const L of Ls) { const s = duel(L).dieSecVs(4); expect(s, `Sv${L}`).toBeGreaterThan(12); expect(s, `Sv${L}`).toBeLessThan(45); }
  });
  test('+5 seviye yaratık bedeli artırır (≥1,3×; Sv30’a kadar ≥1,8×)', () => {
    for (const L of Ls) { if (L < 3) continue; const r = duel(L, L + 5).takenPct / duel(L).takenPct; expect(r, `Sv${L}`).toBeGreaterThan(L <= 30 ? 1.8 : 1.3); }
  });
  test('düşük seviye yaratık (-5) cezalıdır: can kaybı en fazla yarısı', () => {
    for (const L of [10, 20, 30, 40]) expect(duel(L, L - 5).takenPct).toBeLessThan(duel(L).takenPct * 0.5);
  });
});

describe('denge: seviye farkı eğrileri', () => {
  test('yüksek seviye yaratığa hasar azalır (alt sınır 0,35), düşüğe hafifçe artar (üst 1,1); yaratığın vuruşu +5’te 1,25×, en çok 2×', () => {
    expect(lvlDiffOut(0)).toBe(1); expect(lvlDiffOut(5)).toBeCloseTo(0.75); expect(lvlDiffOut(99)).toBe(0.35); expect(lvlDiffOut(-99)).toBe(1.1);
    expect(lvlDiffIn(0)).toBe(1); expect(lvlDiffIn(5)).toBeCloseTo(1.25); expect(lvlDiffIn(99)).toBe(2); expect(lvlDiffIn(-99)).toBe(0.5);
  });
});

describe('denge: seviye ilerlemesi', () => {
  test('seviye başına öldürme sayısı seviyeyle artar; her 10. seviye öncesi duvar belirgin', () => {
    for (let L = 2; L < 49; L++) if (L % 10 !== 9) expect(killsToLevel(L + 1)).toBeGreaterThan(killsToLevel(L));
    for (const w of [9, 19, 29, 39]) expect(xpToNext(w) / xpToNext(w - 1)).toBeGreaterThan(2.5);
  });
  test('çözümsel süre tahmini (saatte ~1200 öldürme) hedef bantlarda: Sv10≈1, Sv20≈6, Sv30≈20, Sv50≈100+ saat', () => {
    const T = (to: number) => { let k = 0; for (let L = 1; L < to; L++) k += killsToLevel(L); return k / 1200; };
    expect(T(10)).toBeGreaterThan(0.4); expect(T(10)).toBeLessThan(1.6);
    expect(T(20)).toBeGreaterThan(3); expect(T(20)).toBeLessThan(10);
    expect(T(30)).toBeGreaterThan(12); expect(T(30)).toBeLessThan(32);
    expect(T(50)).toBeGreaterThan(90); expect(T(50)).toBeLessThan(220);
  });
});

describe('denge: boy ve uzmanlık', () => {
  const dpsOf = (boy: Boy, spec: Spec, L = 30) => { const s = refStats(L, boy, spec); const m = mobAvg(L); return (hitDamage(s.atk, 1, m.def, false, false) * (1 + (s.crit / 100) * (s.critMult - 1))) / s.atkInterval; };
  const ehpOf = (boy: Boy, spec: Spec, L = 30) => { const s = refStats(L, boy, spec); const m = mobAvg(L); const hit = hitDamage(m.atk, 1, s.def, false, false) * s.dmgTaken; return s.maxHp / (hit / m.atk); };
  test('boylar birbirinden %12’den fazla DPS ayrışmaz (baskın boy yok)', () => {
    const d = (['gok', 'yer', 'ay'] as Boy[]).map((b) => dpsOf(b, 'none')); expect(Math.max(...d) / Math.min(...d)).toBeLessThan(1.12);
  });
  test('Yer boyu dayanıklılık, Gök boyu hız/vuruş kazandırır', () => {
    expect(ehpOf('yer', 'none')).toBeGreaterThan(ehpOf('gok', 'none') * 1.02);
    expect(refStats(30, 'gok').moveSpeed).toBeGreaterThan(refStats(30, 'yer').moveSpeed * 1.05);
  });
  test('Kılıç Alp ≥%12 daha çok DPS, Kalkan Alp ≥%20 daha çok etkin can (PvE kimliği); PvP’de ayrı çarpanla dengelenir', () => {
    expect(dpsOf('gok', 'kilic')).toBeGreaterThan(dpsOf('gok', 'kalkan') * 1.12);
    expect(ehpOf('gok', 'kalkan')).toBeGreaterThan(ehpOf('gok', 'kilic') * 1.2);
  });
});

describe('denge: artı basma ve tılsım', () => {
  test('korumasız +7 yaklaşık 8 parça yakar; tılsımla hiç parça yok olmaz', () => {
    expect(upgradeEV(20, { stopAt: 7 }).items).toBeGreaterThan(5);
    expect(upgradeEV(20, { charm: true, stopAt: 9 }).items).toBe(0);
  });
  test('tılsımla +9 makul sayıda deneme ister (≤30); korumasız +9 imkânsıza yakındır (>1000 deneme)', () => {
    expect(upgradeEV(20, { charm: true, stopAt: 9 }).tries).toBeLessThan(30);
    expect(upgradeEV(20, { stopAt: 9 }).tries).toBeGreaterThan(1000);
  });
  test('tılsım maliyeti ucuz değil ama artı akçesini de ezmez (+9 akçesinin %2–15’i)', () => {
    const e = upgradeEV(20, { charm: true, stopAt: 9 }); const share = (CRAFT.charm.gold * e.charms) / e.gold;
    expect(share).toBeGreaterThan(0.02); expect(share).toBeLessThan(0.15);
  });
});

describe('denge: bonus hesapları ve üst sınırlar', () => {
  test('en uç yığılma (4 efsanevi +9 + tüm efsunlar) kritik/vuruş hızı/çalma üst sınırını aşmaz', () => {
    const equip: Parameters<typeof computeStats>[0]['equip'] = {};
    for (const s of SLOTS) { const it = makeItem(() => 0.99, s, 50, 3); it.up = 9; it.ench = [{ k: 'crit', v: 5 }, { k: 'aspd', v: 8 }, { k: 'leech', v: 3 }]; equip[s] = it; }
    const st = computeStats({ level: 50, boy: 'gok', spec: 'kilic', equip, kut: 50 });
    expect(st.crit).toBeLessThanOrEqual(STAT_CAP.crit); expect(st.leech).toBeLessThanOrEqual(STAT_CAP.leech);
    expect(st.atkInterval).toBeGreaterThanOrEqual(0.55 / (1 + STAT_CAP.aspd) - 1e-9);
  });
  test('Kut bonusu en fazla %25; savunma azaltımı 100/(100+savunma)', () => {
    const base = computeStats({ level: 50, boy: 'gok', spec: 'none', equip: {}, kut: 0 }).atk; const big = computeStats({ level: 50, boy: 'gok', spec: 'none', equip: {}, kut: 999 }).atk;
    expect(big / base).toBeLessThanOrEqual(1.26);
    expect(hitDamage(1000, 1, 100, false, false)).toBe(500);
  });
  test('PvP katsayısı: aynı vuruş PvP’de PvE’nin %35’i', () => { expect(hitDamage(1000, 1, 0, true, false)).toBe(350); });
});
