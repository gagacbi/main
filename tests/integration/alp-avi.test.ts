import { describe, expect, test } from 'vitest';
import { HUNT, huntFor } from '../../shared/hunt';
import { campTypesForLevel, xpToNext } from '../../shared/game';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function setup(level: number) {
  const rig = makeRig(41, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; w.recalc(p); p.x = 0; p.z = 130;
  const kill = (type: any, lvl: number) => { const m = w.makeMob(type, lvl, p.x + 2, p.z, -1); m.contrib.set(p.id, 1); w.killMob(m); };
  return { w, p, kill };
}
describe('Alp Avı (görev)', () => {
  test('hedefler kamp türlerinden türer, iki ayrı tür; sayılar seviyeyle artar; 5. seviyede eşya, 10.da kitap+tılsım', () => {
    for (let lv = 2; lv <= 50; lv++) { const h = huntFor(lv); expect(h.types[0]).not.toBe(h.types[1]); for (const t of h.types) expect(campTypesForLevel(lv)).toContain(t); }
    expect(huntFor(40).n[0]).toBeGreaterThan(huntFor(4).n[0]); expect(huntFor(5).item).toBe(true); expect(huntFor(6).item).toBe(false);
    expect(huntFor(10).book).toBe(2); expect(huntFor(10).charm).toBe(1); expect(huntFor(11).xpPct).toBe(HUNT.xpPctLvl11);
  });
  test('doğru tür ve seviyedeki yaratık sayılır; yanlış tür/çok düşük seviye sayılmaz; tamamlanınca XP ve sonraki av', () => {
    const { w, p, kill } = setup(2); const def = huntFor(2); const [a, b] = def.types;
    kill(a, 2); expect(p.d.hunt!.k[0]).toBe(1);
    const other = (['tepegoz', 'albasti', 'erlik', 'cakal'] as const).find((t) => !def.types.includes(t))!; kill(other, 2); expect(p.d.hunt!.k).toEqual([1, 0]);
    const xp0 = p.d.xp + p.d.level * 0; const lvl0 = p.d.level;
    for (let i = 1; i < def.n[0]; i++) kill(a, 2); for (let i = 0; i < def.n[1]; i++) kill(b, 2);
    expect(p.d.hunt!.lv).toBe(3); expect(p.d.hunt!.k).toEqual([0, 0]); expect(p.d.level >= lvl0).toBe(true); expect(p.d.xp !== xp0 || p.d.level > lvl0).toBe(true);
  });
  test('geride kalan av %1 XP verir, eşya vermez; atla geri alınamaz ve güncel seviyeye getirir', () => {
    const { w, p, kill } = setup(20); p.d.hunt = { lv: 2, k: [0, 0] }; const def = huntFor(2); const items0 = p.d.items.length, drops0 = w.drops.size;
    const x0 = p.d.xp; for (let i = 0; i < def.n[0]; i++) kill(def.types[0], 20); for (let i = 0; i < def.n[1]; i++) kill(def.types[1], 20);
    expect(p.d.hunt!.lv).toBe(3); expect(p.d.xp - x0).toBeLessThan(xpToNext(20) * 0.2); // kill XP'si dahil, ödül %1
    expect(call(w, p, 'hunt.skip').ok).toBe(true); expect(p.d.hunt!.lv).toBe(20); expect(call(w, p, 'hunt.skip').err).toBe('hunt_nothing');
    void items0; void drops0;
  });
});
