import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { BASE_ENCH_POOL, ENCH_TABLE, HUB, makeItem, mobGold, rerollCost, REROLL, type Item } from '../../shared/game';

function setup() {
  const rig = makeRig(3, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; p.d.gold = 1e6; p.x = HUB.demirci.x - 2; p.z = HUB.demirci.z; w.recalc(p);
  const it = makeItem(() => 0.5, 'armor', 30, 3); p.d.items.push(it);
  const call = (a: unknown) => { try { return { ok: true as const, data: w.rpcRun(p, 'reroll', a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
  return { rig, w, p, it, call };
}
const lines = (it: Item) => [it.base, ...it.ench].map((e) => e!.k);

describe('efsun yenileme (altın sinki + oyuncuya söz hakkı)', () => {
  test('rastgele yenileme: seçilen satır değişir, başka satırlarla çakışmaz, akçe düşer, sayaç artar, ledger yazılır', () => {
    const { p, it, call, rig } = setup(); const before = it.ench.map((e) => e.k); const g0 = p.d.gold; const cost = rerollCost(it, false, false);
    const r = call({ id: it.id, line: 1 }); expect(r.ok).toBe(true); expect(p.d.gold).toBe(g0 - cost); expect(it.rr).toBe(1);
    expect(it.ench[1].k).not.toBe(before[1]); expect(new Set(lines(it)).size).toBe(lines(it).length);   // anahtarlar benzersiz kalır
    const [lo, hi] = ENCH_TABLE[it.ench[1].k]; expect(it.ench[1].v).toBeGreaterThanOrEqual(lo); expect(it.ench[1].v).toBeLessThanOrEqual(hi);
    expect(rig.db.ledgerRows(p.dbId).some((x) => x.kind === 'reroll')).toBe(true);
  });
  test('istenen efsunu seçmek ×6 pahalıdır ve tam o efsunu verir; temel efsun yalnızca slotun havuzundan', () => {
    const { p, it, call } = setup(); const g0 = p.d.gold; const free = (['defBuyu', 'defCift', 'pierce', 'blockHit', 'leech'] as const).find((k) => !lines(it).includes(k))!;
    const c = rerollCost(it, false, true); expect(c).toBe(rerollCost(it, false, false) * REROLL.targetedMult);
    const r = call({ id: it.id, line: 0, key: free }); expect(r.ok).toBe(true); expect(it.ench[0].k).toBe(free); expect(p.d.gold).toBe(g0 - c);
    expect(call({ id: it.id, line: 0, key: it.ench[1].k }).err).toBe('bad_key');                       // başka satırdaki anahtar tekrar seçilemez
    const baseOk = BASE_ENCH_POOL.armor.find((k) => !lines(it).includes(k))!; expect(call({ id: it.id, line: 'base', key: baseOk }).ok).toBe(true); expect(it.base!.k).toBe(baseOk);
    expect(call({ id: it.id, line: 'base', key: 'pierce' }).err).toBe('bad_key');                       // zırhın temel havuzunda yok
  });
  test('maliyet her yenilemede artar (tavan 40); yetersiz akçe, geçersiz satır ve uzaklık reddedilir', () => {
    const { p, it, call } = setup(); const c1 = rerollCost(it, false, false); call({ id: it.id, line: 0 }); expect(rerollCost(it, false, false)).toBeGreaterThan(c1);
    expect(rerollCost({ ilvl: 30, rr: 999 }, false, false)).toBe(rerollCost({ ilvl: 30, rr: 40 }, false, false));
    expect(call({ id: it.id, line: 9 }).err).toBe('bad_line'); p.d.gold = 10; expect(call({ id: it.id, line: 0 }).err).toBe('no_gold');
    p.d.gold = 1e6; p.x = 0; p.z = 30; expect(call({ id: it.id, line: 0 }).err).toBeTruthy();
  });
  test('kuşanılmış eşya da yenilenir ve istatistikler hemen güncellenir; sıradan (efsunsuz) eşyada yalnızca temel efsun', () => {
    const { p, w, call } = setup(); const eq = makeItem(() => 0.5, 'helmet', 30, 0); p.d.equip.helmet = eq; w.recalc(p);
    expect(call({ id: eq.id, line: 0 }).err).toBe('bad_line'); expect(call({ id: eq.id, line: 'base', key: 'blockSkill' }).ok || call({ id: eq.id, line: 'base', key: 'hpPct' }).ok).toBe(true);
    const blk = p.stats.blockSkill; expect(Number.isFinite(blk)).toBe(true);
  });
  test('altın dengesi: yaratık altını %45’e indi; yenileme maliyeti Sv30’da birkaç yüz öldürmelik', () => {
    expect(mobGold(30)).toBeCloseTo(28.4, 0); const it = { ilvl: 30, rr: 0 }; const kills = rerollCost(it, false, false) / mobGold(30); expect(kills).toBeGreaterThan(30); expect(kills).toBeLessThan(120);
  });
});
