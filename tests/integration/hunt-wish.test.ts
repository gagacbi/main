import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { HUNT_LATE_PCT, HUNT_XP_PCT, activeHunt, huntQuest, huntXp } from '../../shared/hunt';
import { xpToNext } from '../../shared/game';

describe('av dilekleri (Metin2 av görevleri uyarlaması)', () => {
  test('sayılar seviyeyle artar; ödül %15, çok ilerideysen %1', () => {
    expect(huntQuest(2).goals.map((g) => g.n)).toEqual([10, 5]);
    expect(huntQuest(50).goals[0].n).toBeGreaterThan(huntQuest(25).goals[0].n);
    expect(huntXp(10, 10)).toBe(Math.round(xpToNext(10) * HUNT_XP_PCT));
    expect(huntXp(10, 30)).toBe(Math.round(xpToNext(10) * HUNT_LATE_PCT));
    expect(activeHunt(1, [])).toBeNull(); expect(activeHunt(4, [2])).toBe(3); expect(activeHunt(4, [2, 3, 4])).toBeNull();
  });
  test('av dileği ilerler, tamamlanınca ödül verir; atlanan geri gelmez; çok düşük seviye yaratık sayılmaz', () => {
    const rig = makeRig(3, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok');
    p.d.level = 2; w.recalc(p);
    const q = huntQuest(2);
    const weak = w.makeMob(q.goals[0].type, 1, 0, 0, -1); (weak as any).lvl = -10; w.huntKill(p, weak);
    expect(p.d.hunt?.prog ?? []).not.toContain(1);
    for (const g of q.goals) for (let i = 0; i < g.n; i++) w.huntKill(p, w.makeMob(g.type, 2, 0, 0, -1));
    expect(p.d.hunt!.done).toContain(2); expect(activeHunt(2, p.d.hunt!.done)).toBeNull();
    p.d.level = 3; w.rpcRun(p, 'hunt.skip', {}); expect(p.d.hunt!.done).toEqual([2, 3]);
    expect(() => w.rpcRun(p, 'hunt.skip', {})).toThrow();
  });
});
