import { describe, expect, test } from 'vitest';
import { PIERCE_BONUS, BASE_ENCH_POOL, DMG_KINDS, SLOTS, STAT_CAP, WEAPON_MODS, applyDefense, computeStats, makeItem, mulberry32Compat, type Item } from './defense-helpers';

describe('savunma sistemi: hesap kuralları', () => {
  const sd = (o: Partial<Parameters<typeof applyDefense>[0]> = {}) => ({ defKind: { kilic: 0.3, cift: 0, bicak: 0, yay: 0, buyu: 0 }, blockHit: 0.2, blockSkill: 0.1, ...o });
  test('tür savunması yalnızca o türü azaltır; diğer türler etkilenmez', () => {
    expect(applyDefense(sd(), 'kilic', false, 0, 1, 0.99).mult).toBeCloseTo(0.7);
    expect(applyDefense(sd(), 'cift', false, 0, 1, 0.99).mult).toBe(1);
  });
  test('vuruş bloğu ile beceri bloğu ayrı şanstır', () => {
    expect(applyDefense(sd(), 'kilic', false, 0, 1, 0.19).blocked).toBe(true);   // %20 vuruş bloğu
    expect(applyDefense(sd(), 'kilic', true, 0, 1, 0.19).blocked).toBe(false);   // beceri bloğu %10
    expect(applyDefense(sd(), 'kilic', true, 0, 1, 0.09).blocked).toBe(true);
  });
  test('delme: şansı tutarsa hem bloğu hem tür savunmasını yok sayar', () => {
    const r = applyDefense(sd(), 'kilic', false, 0.3, 0.29, 0.0);
    expect(r).toEqual({ mult: PIERCE_BONUS, blocked: false, pierced: true });
    expect(applyDefense(sd(), 'kilic', false, 0.3, 0.31, 0.99).pierced).toBe(false);
  });
});

describe('savunma sistemi: eşyalar ve istatistikler', () => {
  const r = mulberry32Compat(5);
  test('her parçada slotun havuzundan bir temel efsun vardır; silahta tür vardır', () => {
    for (let i = 0; i < 200; i++) for (const s of SLOTS) {
      const it = makeItem(r, s, 10 + (i % 30), (i % 4) as 0 | 1 | 2 | 3);
      expect(it.base, s).toBeTruthy(); expect(BASE_ENCH_POOL[s]).toContain(it.base!.k);
      expect(it.ench.some((e) => e.k === it.base!.k), 'temel efsun rastgele efsunla çakışmaz').toBe(false);
      expect(it.ench.length).toBe(it.tier);
      if (s === 'weapon') expect(DMG_KINDS).toContain(it.wk!); else expect(it.wk).toBeUndefined();
    }
  });
  test('silah türü dağılımı kabaca %40/20/15/15/10', () => {
    const c: Record<string, number> = {}; for (let i = 0; i < 4000; i++) { const k = makeItem(r, 'weapon', 20, 0).wk!; c[k] = (c[k] ?? 0) + 1; }
    expect(c.kilic / 4000).toBeGreaterThan(0.35); expect(c.kilic / 4000).toBeLessThan(0.45); expect(c.buyu / 4000).toBeGreaterThan(0.07); expect(c.buyu / 4000).toBeLessThan(0.13);
  });
  const withEnch = (slot: 'armor' | 'helmet' | 'weapon', base: Item['base'], extra: Item['ench'] = [], wk?: Item['wk']): Item => { const it = makeItem(() => 0.5, slot, 20, 0, wk); it.base = base; it.ench = extra; return it; };
  test('tür savunmaları ve bloklar eşyadan toplanır; uzmanlık eklenir; üst sınır aşılmaz', () => {
    const armor = withEnch('armor', { k: 'defKilic', v: 12 }, [{ k: 'defKilic', v: 12 }, { k: 'blockHit', v: 9 }]);
    const helm = withEnch('helmet', { k: 'defKilic', v: 12 }, [{ k: 'defKilic', v: 12 }, { k: 'blockHit', v: 9 }]);
    const st = computeStats({ level: 30, boy: 'gok', spec: 'kalkan', equip: { armor, helmet: helm }, kut: 0 });
    expect(st.defKind.kilic).toBeCloseTo(0.4);          // 2 parça × (12+12) = 0,48 → sınır 0,4
    const over = computeStats({ level: 30, boy: 'gok', spec: 'none', equip: { armor, helmet: withEnch('helmet', { k: 'defKilic', v: 12 }, [{ k: 'defKilic', v: 12 }, { k: 'defKilic', v: 12 }]) }, kut: 0 });
    expect(over.defKind.kilic).toBe(STAT_CAP.defKind);  // yığılma sınırda kesilir
    expect(st.blockHit).toBeCloseTo(0.18 + 0.06);
    const big = computeStats({ level: 30, boy: 'gok', spec: 'kalkan', equip: { armor: withEnch('armor', { k: 'defKilic', v: 12 }, [{ k: 'defKilic', v: 12 }, { k: 'blockHit', v: 9 }, { k: 'blockSkill', v: 9 }]), helmet: withEnch('helmet', { k: 'blockHit', v: 12 }, [{ k: 'blockHit', v: 12 }, { k: 'blockSkill', v: 12 }]) }, kut: 0 });
    expect(big.blockHit).toBeLessThanOrEqual(STAT_CAP.blockHit); expect(big.blockSkill).toBeLessThanOrEqual(STAT_CAP.blockSkill);
  });
  test('Kılıç Alp delme, Kalkan Alp blok kazanır', () => {
    const k = computeStats({ level: 30, boy: 'gok', spec: 'kilic', equip: {}, kut: 0 }); const q = computeStats({ level: 30, boy: 'gok', spec: 'kalkan', equip: {}, kut: 0 });
    expect(k.pierce).toBeGreaterThan(0); expect(q.pierce).toBe(0); expect(q.blockHit).toBeGreaterThan(k.blockHit);
  });
  test('silah türü menzili ve saldırı/hız etkisi', () => {
    const base = computeStats({ level: 30, boy: 'gok', spec: 'none', equip: { weapon: withEnch('weapon', { k: 'crit', v: 1 }, [], 'kilic') }, kut: 0 });
    for (const k of DMG_KINDS) {
      const st = computeStats({ level: 30, boy: 'gok', spec: 'none', equip: { weapon: withEnch('weapon', { k: 'crit', v: 1 }, [], k) }, kut: 0 });
      expect(st.weaponKind).toBe(k); expect(st.range).toBe(WEAPON_MODS[k].range);
    }
    const cift = computeStats({ level: 30, boy: 'gok', spec: 'none', equip: { weapon: withEnch('weapon', { k: 'crit', v: 1 }, [], 'cift') }, kut: 0 });
    const bicak = computeStats({ level: 30, boy: 'gok', spec: 'none', equip: { weapon: withEnch('weapon', { k: 'crit', v: 1 }, [], 'bicak') }, kut: 0 });
    expect(cift.atk).toBeGreaterThan(base.atk); expect(cift.atkInterval).toBeGreaterThan(base.atkInterval);
    expect(bicak.atkInterval).toBeLessThan(base.atkInterval); expect(bicak.crit).toBeGreaterThan(base.crit);
  });
  test('eski kayıt (temel efsun/tür yok) sorunsuz hesaplanır: kılıç sayılır', () => {
    const old = makeItem(() => 0.5, 'weapon', 10, 0); delete old.base; delete old.wk;
    const st = computeStats({ level: 10, boy: 'gok', spec: 'none', equip: { weapon: old }, kut: 0 }); expect(st.weaponKind).toBe('kilic'); expect(st.range).toBe(3.6);
  });
});
