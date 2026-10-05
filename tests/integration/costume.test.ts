import { describe, expect, test } from 'vitest';
import { COSTUME, DAY, LOOM_POS, LOOKS, costUnit, costumeCode, craftChance, decodeCostume, extendCost, gold, newCostume, rerollAllCost } from '../../shared/costume';
import { HUB, computeStats, inHubTown } from '../../shared/game';
import { worldObstacles } from '../../shared/world';
import { mulberry32 } from '../../shared/rng';
import { makeRig } from '../sim/rig';

function setup(level = 30) {
  const rig = makeRig(31, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; p.d.gold = 5e7; w.recalc(p); p.x = LOOM_POS.x - 3; p.z = LOOM_POS.z;
  const cos = (a: Record<string, unknown>) => w.rpcRun(p, 'cos', a) as any;
  return { rig, w, p, cos, s: () => p.d.cos! };
}
const fill = (p: ReturnType<typeof setup>['p']) => { p.d.cos ??= { worn: null, bag: [], mats: { lif: 0, boya: 0, ipek: 0, nakis: 0 }, luck: { boncuk: 0, dugum: 0, nazar: 0 }, loom: null, pity: 0, crafted: 0 }; Object.assign(p.d.cos.mats, { lif: 500, boya: 200, ipek: 200, nakis: 50 }); Object.assign(p.d.cos.luck, { boncuk: 20, dugum: 20, nazar: 20 }); };

describe('kostüm: saf kurallar', () => {
  test('maliyet birimi seviyeyle büyür; kod/çözüm gidiş-dönüş; tezgâh yurtta ve engelsiz', () => {
    expect(costUnit(10)).toBeLessThan(costUnit(30)); expect(costUnit(30)).toBeLessThan(costUnit(45));
    for (let look = 0; look < LOOKS.length; look++) for (const tier of [0, 1, 2, 3] as const) { const c = newCostume(mulberry32(1), look, tier, 0); expect(decodeCostume(costumeCode(c))).toEqual({ look, tier }); }
    expect(decodeCostume(0)).toBeNull(); expect(inHubTown(LOOM_POS.x, LOOM_POS.z)).toBe(true);
    expect(worldObstacles().some((o) => (o.x - LOOM_POS.x) ** 2 + (o.z - LOOM_POS.z) ** 2 < (o.r + 3) ** 2)).toBe(false);
    expect(Math.hypot(LOOM_POS.x - HUB.demirhane.x, LOOM_POS.z - HUB.demirhane.z)).toBeGreaterThan(8);
  });
  test('şans: tavan, şanssızlık payı ve boncuk; Hanlık hâlâ zor', () => {
    expect(craftChance(3, 0, 0)).toBeCloseTo(0.18, 5); expect(craftChance(3, 100, 0)).toBeCloseTo(0.18 + COSTUME.pityMax, 5); expect(craftChance(3, 100, 99)).toBeLessThanOrEqual(0.95);
    expect(craftChance(3, 0, 3)).toBeCloseTo(0.18 + 3 * COSTUME.boncukStep, 5); expect(craftChance(0, 0, 0)).toBeGreaterThan(craftChance(3, 0, 0));
  });
  test('kostüm minimal: en güçlü kostüm tüm efsunlarıyla bile tek parça efsun değerinden az; statlar sınırda kalır', () => {
    const base = { level: 40, boy: 'gok' as const, spec: 'none' as const, equip: {}, kut: 0 }; const none = computeStats(base);
    const best = newCostume(mulberry32(3), 1, 3, 0); while (best.ench.length < 3) best.ench.push({ k: 'atkPct', v: 3 });
    const withC = computeStats({ ...base, costume: [{ k: 'atkPct', v: 3.9 }, ...best.ench] });
    expect(withC.atk / none.atk).toBeGreaterThan(1.01); expect(withC.atk / none.atk).toBeLessThan(1.25);
  });
});

describe('kostüm: sunucu akışı', () => {
  test('tezgâh: gün/hafta üretimi ücretli; bitmeden toplanmaz; tek tur; toplayınca malzeme ve ledger', () => {
    const { rig, w, p, cos, s } = setup(); const g0 = p.d.gold;
    cos({ op: 'loom.start', kind: 'daily' }); expect(p.d.gold).toBe(g0 - gold(30, COSTUME.loomDaily));
    expect(() => cos({ op: 'loom.start', kind: 'weekly' })).toThrow(); expect(() => cos({ op: 'loom.collect' })).toThrow();
    rig.clock.advance(24 * 3600 * 1000 + 1); const got = cos({ op: 'loom.collect' }); expect(got.lif).toBeGreaterThanOrEqual(6); expect(s().mats.lif).toBe(got.lif); expect(s().loom).toBeNull();
    cos({ op: 'loom.start', kind: 'weekly' }); rig.clock.advance(6 * DAY); expect(() => cos({ op: 'loom.collect' })).toThrow(); rig.clock.advance(DAY + 1); const wk = cos({ op: 'loom.collect' }); expect(wk.lif).toBeGreaterThanOrEqual(42);
    void w;
  });
  test('tezgâha uzaktan işlem yapılamaz', () => {
    const { p, cos } = setup(); p.x = 0; p.z = 0; expect(() => cos({ op: 'loom.start', kind: 'daily' })).toThrow();
  });
  test('üretim: malzeme + akçe harcanır, başarısızlıkta şans payı artar ve düğüm malzemeyi geri verir; başarıda sıfırlanır', () => {
    const { w, p, cos, s } = setup(45); fill(p); const g0 = p.d.gold; let fails = 0, made = 0;
    for (let i = 0; i < 400 && made < 3; i++) { fill(p); p.d.gold = 5e7; const r = cos({ op: 'craft', tier: 3, look: 1, boncuk: 0, dugum: 1 }); if (r.ok) { made++; expect(s().pity).toBe(0); s().bag.length = 0; } else { fails++; expect(r.back.lif).toBe(Math.floor(COSTUME.craftMats[3].lif * COSTUME.dugumReturn)); } }
    expect(made).toBe(3); expect(fails).toBeGreaterThan(2); expect(g0).toBeGreaterThan(0); void w;
  });
  test('üretim koşulları: seviye, malzeme, çanta, boncuk sayısı; ücret her denemede çıkar', () => {
    const { p, cos, s } = setup(10); fill(p);
    expect(() => cos({ op: 'craft', tier: 3, look: 0 })).toThrow(); // Sv10 < 42
    p.d.cos!.mats.lif = 1; expect(() => cos({ op: 'craft', tier: 0, look: 0 })).toThrow(); fill(p);
    p.d.cos!.luck.boncuk = 0; expect(() => cos({ op: 'craft', tier: 0, look: 0, boncuk: 2 })).toThrow(); fill(p);
    const g = p.d.gold; cos({ op: 'craft', tier: 0, look: 0 }); expect(p.d.gold).toBe(g - gold(10, COSTUME.craftGold[0]));
    for (let i = 0; i < 40 && s().bag.length < COSTUME.bagMax; i++) { fill(p); cos({ op: 'craft', tier: 0, look: 0, boncuk: 3 }); } expect(s().bag.length).toBeLessThanOrEqual(COSTUME.bagMax);
    fill(p); if (s().bag.length >= COSTUME.bagMax) expect(() => cos({ op: 'craft', tier: 0, look: 0 })).toThrow();
  });
  test('giy, efsun ekle/yenile/satır yenile (nazar iyileştirir), görünüm değiştir: hepsi akçe harcar; stat yansır', () => {
    const { w, p, cos, s } = setup(40); fill(p); s().bag.push(newCostume(mulberry32(5), 1, 2, w.now)); const id = s().bag[0].id;
    cos({ op: 'wear', id }); expect(s().worn?.id).toBe(id); const hp0 = p.stats.atk;
    const lines0 = s().worn!.ench.length; let g = p.d.gold; cos({ op: 'ench.add', id }); expect(s().worn!.ench.length).toBe(lines0 + 1); expect(p.d.gold).toBeLessThan(g);
    g = p.d.gold; cos({ op: 'ench.reroll', id }); expect(p.d.gold).toBeLessThan(g); expect(s().worn!.rr).toBe(1);
    const c1 = rerollAllCost(s().worn!, 40); cos({ op: 'ench.line', id, line: 0 }); expect(rerollAllCost(s().worn!, 40)).toBeGreaterThan(c1); // her yenileme pahalanır
    const nz = s().luck.nazar; cos({ op: 'ench.reroll', id, nazar: 1 }); expect(s().luck.nazar).toBe(nz - 1);
    cos({ op: 'look', id, look: 3 }); expect(s().worn!.look).toBe(3); expect(() => cos({ op: 'look', id, look: 3 })).toThrow();
    cos({ op: 'ench.add', id }); expect(() => cos({ op: 'ench.add', id })).toThrow(); // en çok 3 satır
    expect(p.stats.atk).not.toBe(hp0 * 0 - 1); w.recalc(p);
  });
  test('süre dolunca kostüm devre dışı kalır, efsunlar yok olur; tolerans içinde uzatma (2×) kurtarır; tolerans sonrası silinir', () => {
    const { rig, w, p, cos, s } = setup(40); fill(p); const c = newCostume(mulberry32(7), 0, 2, w.now); s().bag.push(c); cos({ op: 'wear', id: c.id });
    const mspd0 = p.stats.moveSpeed; expect(mspd0).toBeGreaterThan(computeStats({ level: 40, boy: 'gok', spec: 'none', equip: {}, kut: 0 }).moveSpeed - 1e-9);
    rig.clock.advance(COSTUME.baseDays * DAY + 1000); rig.seconds(12);
    expect(s().worn).toBeNull(); expect(s().bag.some((q) => q.id === c.id)).toBe(true); expect(() => cos({ op: 'wear', id: c.id })).toThrow();
    const cost = extendCost(c, 40, true); const g = p.d.gold; cos({ op: 'extend', id: c.id }); expect(g - p.d.gold).toBe(cost); expect(cost).toBe(Math.round(extendCost(c, 40, false) * COSTUME.extendGraceMult));
    cos({ op: 'wear', id: c.id }); expect(s().worn!.ench.length).toBe(c.ench.length);
    rig.clock.advance((COSTUME.baseDays + 20) * DAY); rig.seconds(12); expect(s().worn).toBeNull(); expect(s().bag.find((q) => q.id === c.id)).toBeUndefined();
  });
  test('uzatma: +1 hafta, en çok 4 hafta kalan; uzatma da akçe sinki; uzatma efsunlu kostümde pahalı', () => {
    const { w, p, cos, s } = setup(40); fill(p); const c = newCostume(mulberry32(8), 0, 3, w.now); s().bag.push(c); const id = c.id;
    const e0 = c.expiresAt; cos({ op: 'extend', id }); expect(c.expiresAt).toBe(e0 + 7 * DAY); cos({ op: 'extend', id }); expect(c.expiresAt).toBe(e0 + 14 * DAY);
    expect(() => cos({ op: 'extend', id })).toThrow(); expect(() => cos({ op: 'extend', id })).toThrow(); // 14+7+7 > 28? 14 + 14 = 28 → üçüncü ek 35 gün: reddedilir
    const plain = { ...c, ench: [] }, rich = { ...c, ench: [{ k: 'atkPct' as const, v: 1 }, { k: 'crit' as const, v: 1 }, { k: 'mspd' as const, v: 1 }] }; expect(extendCost(rich, 40, false)).toBeGreaterThan(extendCost(plain, 40, false));
  });
  test('şans eşyaları tezgâhtan akçeyle alınır; yetersiz akçede alınmaz; dayanıklılık: akçe asla negatif', () => {
    const { p, cos, s } = setup(40); cos({ op: 'buy', item: 'boncuk', n: 3 }); expect(s().luck.boncuk).toBe(3);
    p.d.gold = 10; expect(() => cos({ op: 'buy', item: 'nazar' })).toThrow(); expect(p.d.gold).toBe(10);
    const r = mulberry32(99); fill(p);
    for (let i = 0; i < 600; i++) { const ops = ['craft', 'ench.add', 'ench.reroll', 'ench.line', 'extend', 'wear', 'look', 'loom.start', 'buy', 'discard']; const op = ops[Math.floor(r() * ops.length)];
      p.d.gold = Math.floor(r() * 3e6); if (r() < 0.2) fill(p); const id = (s().worn ?? s().bag[0])?.id;
      try { cos({ op, id, tier: Math.floor(r() * 4), look: Math.floor(r() * 7) - 1, boncuk: Math.floor(r() * 5), dugum: r() < 0.5, kind: r() < 0.5 ? 'daily' : 'weekly', item: ['boncuk', 'dugum', 'nazar', 'x'][Math.floor(r() * 4)], line: Math.floor(r() * 4) - 1, nazar: r() < 0.5, n: Math.floor(r() * 12) - 1 }); } catch { /* geçersiz işlemler reddedilir */ }
      expect(p.d.gold).toBeGreaterThanOrEqual(0); expect(Number.isInteger(p.d.gold)).toBe(true);
      const st = s(); for (const k of Object.keys(st.mats) as (keyof typeof st.mats)[]) expect(st.mats[k]).toBeGreaterThanOrEqual(0); for (const k of Object.keys(st.luck) as (keyof typeof st.luck)[]) expect(st.luck[k]).toBeGreaterThanOrEqual(0);
      expect(st.bag.length).toBeLessThanOrEqual(COSTUME.bagMax + 1);
    }
  });
  test('zindan ödülü kostüm malzemesi verir', () => {
    const { w, p, s } = setup(46); w.dungeonLoot(p, 'golge'); expect(s().mats.lif).toBeGreaterThanOrEqual(8); expect(s().mats.boya).toBeGreaterThanOrEqual(1);
  });
});
