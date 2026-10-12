import { describe, expect, test } from 'vitest';
import { COMP_EVO, HUB, compEvo } from '../../shared/game';
import { rollExpedition } from '../../server/oba';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function setup() { const rig = makeRig(91, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; p.x = HUB.otag.x + 3; p.z = HUB.otag.z; p.d.gold = 50_000_000; p.d.bag.frag = 100;
  p.d.companions = [{ id: 'c1', name: 'Börte', cls: 'alp', level: 20, xp: 0, traits: ['tuccar', 'cevik'] }]; return { rig, w, p }; }

describe('Yoldaş evrimi', () => {
  test('aşama aşama evrilir: akçe + parça harcar; seviye eşiği; son aşamada durur; 1. ve 3. aşamada yeni özellik', () => {
    const { w, p } = setup(); const c = p.d.companions[0]; c.level = 5; expect(call(w, p, 'oba.evolve', { compId: 'c1' }).err).toBe('comp_level'); c.level = 20;
    const g0 = p.d.gold, f0 = p.d.bag.frag; const r1 = call(w, p, 'oba.evolve', { compId: 'c1' }); expect(r1.ok).toBe(true); expect(compEvo(c)).toBe(1); expect(c.traits.length).toBe(3); expect(r1.data.trait).toBeTruthy();
    expect(g0 - p.d.gold).toBe(COMP_EVO.gold(0, 30)); expect(f0 - p.d.bag.frag).toBe(COMP_EVO.frag[0]);
    expect(call(w, p, 'oba.evolve', { compId: 'c1' }).ok).toBe(true); expect(c.traits.length).toBe(3); expect(call(w, p, 'oba.evolve', { compId: 'c1' }).ok).toBe(true); expect(compEvo(c)).toBe(3); expect(c.traits.length).toBe(4);
    expect(call(w, p, 'oba.evolve', { compId: 'c1' }).err).toBe('max_rank'); expect(call(w, p, 'oba.evolve', { compId: 'yok' }).err).toBe('no_companion');
  });
  test('yetersiz akçe/parça, sefer sırasında ve Otağ uzağındayken reddedilir', () => {
    const { w, p } = setup(); p.d.gold = 10; expect(call(w, p, 'oba.evolve', { compId: 'c1' }).err).toBe('no_gold'); p.d.gold = 50_000_000; p.d.bag.frag = 0; expect(call(w, p, 'oba.evolve', { compId: 'c1' }).err).toBe('no_frag');
    p.d.bag.frag = 100; p.d.expeditions = [{ id: 'e1', compId: 'c1', hours: 1, startAt: 0, endAt: 9e15, seed: 1 }]; expect(call(w, p, 'oba.evolve', { compId: 'c1' }).err).toBe('comp_busy'); p.d.expeditions = [];
    p.x += 80; expect(call(w, p, 'oba.evolve', { compId: 'c1' }).ok).toBe(false);
  });
  test('sefer getirisi evrimle artar (aynı tohum)', () => {
    const base = { id: 'c', name: 'x', cls: 'alp' as const, level: 10, xp: 0, traits: [] as any[] }; const e = { seed: 12345, hours: 4 };
    const g = (evo: number) => rollExpedition(e, { ...base, evo }, 30).gold; expect(g(1)).toBeGreaterThan(g(0)); expect(g(3)).toBeGreaterThan(g(2)); expect(g(3) / g(0)).toBeCloseTo(1 + COMP_EVO.goldBonus * 3, 1);
  });
});
