import { describe, expect, test } from 'vitest';
import {
  BOY_BONUS, KUT_PER_POINT, MAX_LEVEL, PVE_COEF, PVP_COEF, RESTED_CAP_LEVELS, SKILLS, SKILL_RANK_LABEL, TIER_MULT, UPGRADE_DESTROYS_FROM, UPGRADE_RATE, UP_PCT,
  computeStats, ENCH_TABLE, hitDamage, makeItem, mobXp, restedCap, restedGain, rollTier, skillRankMult, upMult, xpToNext, itemStats, type Item,
} from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { genCamps, genObstacles, stepMove } from '../../shared/world';
import { makeCompanion, rollExpedition } from '../../server/oba';

describe('D1 seviye ve deneyim eğrisi', () => {
  test('50 seviye; her 10 seviyede belirgin duvar', () => {
    expect(MAX_LEVEL).toBe(50);
    for (const wall of [9, 19, 29, 39, 49]) {
      const ratioWall = xpToNext(wall) / xpToNext(wall - 1);
      const ratioNormal = xpToNext(wall - 1) / xpToNext(wall - 2);
      expect(ratioWall).toBeGreaterThan(2.2);
      expect(ratioWall).toBeGreaterThan(ratioNormal * 2);
    }
  });
  test('kut puanı: seviye sınırından sonra deneyim kalıcı puana döner', () => { expect(KUT_PER_POINT).toBeGreaterThan(0); });
  test('yaratık başına gereken sayı seviyeyle büyür (grind hissi)', () => {
    const need = (l: number) => xpToNext(l) / mobXp(l);
    expect(need(1)).toBeLessThan(5); expect(need(10)).toBeGreaterThan(15); expect(need(29)).toBeGreaterThan(100);
  });
});

describe('D2 dinlenmiş deneyim', () => {
  test('üst sınır ≈ 1,5 seviye', () => { expect(restedCap(10)).toBe(Math.round(xpToNext(10) * RESTED_CAP_LEVELS)); });
  test('obada (otağ yakını) daha hızlı birikir', () => {
    expect(restedGain(10, 4, true)).toBeGreaterThan(restedGain(10, 4, false));
    expect(restedGain(10, 4, true) / restedGain(10, 4, false)).toBeCloseTo(1.5, 1);
  });
});

describe('D3/D4 artı basma tablosu (PRD §7)', () => {
  test('oranlar PRD taslağıyla uyumlu: +1…+4 %100–%80, +5/+6 %65/%50, +7/+8 %35/%20, +9 %10', () => {
    expect(UPGRADE_RATE.slice(1, 5)).toEqual([100, 90, 85, 80]);
    expect(UPGRADE_RATE.slice(5, 7)).toEqual([65, 50]);
    expect(UPGRADE_RATE.slice(7, 9)).toEqual([35, 20]);
    expect(UPGRADE_RATE[9]).toBe(10);
    expect(UPGRADE_DESTROYS_FROM).toBe(5);
  });
  test('+9 temel değeri belirgin biçimde artırır, değerler monoton', () => {
    for (let i = 1; i < UP_PCT.length; i++) expect(UP_PCT[i]).toBeGreaterThan(UP_PCT[i - 1]);
    expect(upMult(9)).toBeGreaterThan(2.4);
  });
});

describe('D5 ganimet kademeleri ve efsunlar', () => {
  test('kademe dağılımı yaklaşık beklenen oranlarda, efsun sayısı kademeye eşit', () => {
    const r = mulberry32(1); const c = [0, 0, 0, 0]; const N = 20000;
    for (let i = 0; i < N; i++) c[rollTier(r)]++;
    expect(c[0] / N).toBeGreaterThan(0.64); expect(c[0] / N).toBeLessThan(0.76);
    expect(c[1] / N).toBeGreaterThan(0.18); expect(c[1] / N).toBeLessThan(0.26);
    expect(c[2] / N).toBeGreaterThan(0.035); expect(c[2] / N).toBeLessThan(0.085);
    expect(c[3] / N).toBeGreaterThan(0.01); expect(c[3] / N).toBeLessThan(0.03);
    for (const t of [0, 1, 2, 3] as const) {
      const it = makeItem(r, 'weapon', 10, t);
      expect(it.ench.length).toBe(t);
      for (const e of it.ench) { const [lo, hi] = ENCH_TABLE[e.k]; expect(e.v).toBeGreaterThanOrEqual(lo); expect(e.v).toBeLessThanOrEqual(hi); }
    }
  });
  test('üst kademe aynı seviyede daha güçlü', () => {
    const r = mulberry32(2);
    const a = itemStats(makeItem(r, 'weapon', 12, 0)).atk; const b = itemStats(makeItem(r, 'weapon', 12, 3)).atk;
    expect(b / a).toBeCloseTo(TIER_MULT[3], 0);
  });
});

describe('B3/B4/B8 yetenek, uzmanlık, PvP katsayısı', () => {
  test('6 aktif yetenek; kademe etiketleri M1…G1, P', () => {
    expect(SKILLS.length).toBe(6); expect(SKILL_RANK_LABEL).toEqual(['M1', 'M2', 'M3', 'M4', 'G1', 'P']);
    expect(skillRankMult(6)).toBeGreaterThan(skillRankMult(1) * 1.5);
  });
  const base = { level: 20, boy: 'gok' as const, equip: {}, kut: 0 };
  test('Kalkan Alp daha dayanıklı, Kılıç Alp daha çok hasar verir ve daha hızlı vurur', () => {
    const k = computeStats({ ...base, spec: 'kalkan' }); const s = computeStats({ ...base, spec: 'kilic' });
    expect(k.maxHp).toBeGreaterThan(s.maxHp * 1.1); expect(k.def).toBeGreaterThan(s.def * 1.05);
    expect(s.atk).toBeGreaterThan(k.atk * 1.15); expect(s.atkInterval).toBeLessThan(k.atkInterval);
    expect(s.aoe).toBeGreaterThan(k.aoe); expect(k.shieldMult).toBeGreaterThan(s.shieldMult); expect(k.dmgTaken).toBeLessThan(s.dmgTaken);
  });
  test('PvP ayrı katsayı kullanır', () => {
    expect(PVP_COEF).toBeLessThan(PVE_COEF);
    const pve = hitDamage(100, 1, 30, false, false); const pvp = hitDamage(100, 1, 30, true, false);
    expect(pvp).toBeLessThan(pve); expect(pvp / pve).toBeCloseTo(PVP_COEF / PVE_COEF, 1);
  });
  test('lanet verilen hasarı azaltır', () => { expect(hitDamage(100, 1, 0, false, true)).toBeLessThan(hitDamage(100, 1, 0, false, false)); });
});

describe('C1 boy bonusları', () => {
  const b = { level: 10, spec: 'none' as const, equip: {}, kut: 0 };
  test('Gök hız, Yer can+savunma, Ay büyü gücü+şifa', () => {
    const g = computeStats({ ...b, boy: 'gok' }), y = computeStats({ ...b, boy: 'yer' }), a = computeStats({ ...b, boy: 'ay' });
    expect(g.moveSpeed).toBeGreaterThan(y.moveSpeed); expect(g.atkInterval).toBeLessThan(y.atkInterval);
    expect(y.maxHp).toBeGreaterThan(g.maxHp); expect(y.def).toBeGreaterThan(g.def);
    expect(a.spell).toBeGreaterThan(g.spell); expect(a.heal).toBeGreaterThan(g.heal);
    expect(BOY_BONUS.gok.mspd).toBeLessThan(0.1); // küçük, pasif
  });
});

describe('E4 yoldaş seferleri', () => {
  test('sonuç tohuma bağlı deterministik; tüccar ruhlu daha çok akçe verir', () => {
    const r = mulberry32(5); const c = makeCompanion(r, 3); c.traits = ['gozupek', 'cevik'];
    const e = { seed: 123, hours: 4 };
    const strip = (r: ReturnType<typeof rollExpedition>) => ({ ...r, items: r.items.map((i) => ({ ...i, id: '' })) });
    expect(strip(rollExpedition(e, c, 10))).toEqual(strip(rollExpedition(e, c, 10)));
    const t = { ...c, traits: ['tuccar', 'cevik'] as typeof c.traits };
    expect(rollExpedition(e, t, 10).gold).toBeGreaterThan(rollExpedition(e, c, 10).gold);
  });
  test('uzun sefer daha çok ödül verir', () => {
    const c = makeCompanion(mulberry32(1), 3);
    expect(rollExpedition({ seed: 9, hours: 12 }, c, 10).gold).toBeGreaterThan(rollExpedition({ seed: 9, hours: 1 }, c, 10).gold * 8);
  });
});

describe('Dünya üretimi ve çarpışma', () => {
  test('engeller ve kamplar deterministik', () => {
    expect(genObstacles()).toEqual(genObstacles()); expect(genCamps()).toEqual(genCamps());
    expect(genCamps().length).toBeGreaterThan(30);
  });
  test('hareket dünya sınırını ve engelleri aşamaz', () => {
    const p = { x: 150, z: 0 }; stepMove(p, 1, 0, 50, 1);
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(160);
    const o = genObstacles().find((x) => x.kind === 'tree')!;
    const q = { x: o.x - 5, z: o.z }; for (let i = 0; i < 40; i++) stepMove(q, 1, 0, 7, 0.05);
    expect(Math.hypot(q.x - o.x, q.z - o.z)).toBeGreaterThanOrEqual(o.r + 0.5 - 0.01);
  });
});
void (null as unknown as Item);
