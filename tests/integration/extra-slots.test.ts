import { describe, expect, test } from 'vitest';
import { ALL_SLOTS, BASE_ENCH_POOL, EXTRA_SLOTS, SLOTS, computeStats, itemBase, makeItem } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { decodeEq, eqCode } from '../../shared/appearance';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
describe('ek kuşanma yuvaları', () => {
  test('çekirdek yuvalar değişmedi; ek yuvalar yarım güçte (aynı seviye/kademede çekirdek parçadan zayıf) ve kendi temel efsun havuzuna sahip', () => {
    expect(SLOTS).toEqual(['weapon', 'armor', 'helmet', 'amulet']); expect(ALL_SLOTS.length).toBe(8);
    const power = (s: any) => { const b = itemBase({ slot: s, ilvl: 30, tier: 2 }); return b.atk * 3 + b.def * 4 + b.hp / 4 + b.critPct * 20 + b.atkPct * 10; };
    const core = Math.min(...SLOTS.map(power)); for (const s of EXTRA_SLOTS) { expect(power(s)).toBeGreaterThan(0); expect(power(s)).toBeLessThan(core * 1.05); expect(BASE_ENCH_POOL[s].length).toBeGreaterThan(0); }
  });
  test('ek yuva eşyası kuşanılır, istatistiğe yansır, çıkarılır; kalkan görünüm koduna girer', () => {
    const rig = makeRig(51, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; w.recalc(p); const hp0 = p.stats.maxHp;
    const r = mulberry32(5); const sh = makeItem(r, 'shield', 20, 2); sh.lvlReq = 1; const bo = makeItem(r, 'boots', 20, 2); bo.lvlReq = 1; p.d.items.push(sh, bo);
    expect(call(w, p, 'equip', { id: sh.id }).ok).toBe(true); expect(call(w, p, 'equip', { id: bo.id }).ok).toBe(true);
    expect(p.d.equip.shield?.id).toBe(sh.id); expect(p.stats.maxHp).toBeGreaterThan(hp0);
    expect(decodeEq(eqCode(p.d.equip)).shield).toEqual({ band: sh.band, tier: sh.tier });
    expect(call(w, p, 'unequip', { slot: 'boots' }).ok).toBe(true); expect(p.d.equip.boots).toBeUndefined(); expect(p.d.items.some((i) => i.id === bo.id)).toBe(true);
  });
  test('ek yuva eşyaları yaratık düşüşünde çıkar (bağımsız ek şans)', () => {
    const rig = makeRig(52, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 20; w.recalc(p); p.x = 0; p.z = 130; let extra = 0;
    for (let i = 0; i < 1500; i++) { const m = w.makeMob('cakal', 20, p.x + 2, p.z, -1); m.contrib.set(p.id, 1); w.killMob(m); }
    for (const dr of w.drops.values()) if (dr.k === 'item' && (EXTRA_SLOTS as string[]).includes((dr as any).item?.slot)) extra++;
    expect(extra).toBeGreaterThan(5); void computeStats;
  });
});
