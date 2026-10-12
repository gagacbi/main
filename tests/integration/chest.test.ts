import { describe, expect, test } from 'vitest';
import { CHEST, chestPos, gradeOfLevel, keyFor, normKeys } from '../../shared/chest';
import { genBosses } from '../../shared/world';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function setup() { const rig = makeRig(33, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 40; w.recalc(p); const b = genBosses()[0]; const c = chestPos(b); p.x = c.x + 1; p.z = c.z; return { rig, w, p, b }; }

describe('Boss anahtarı ve sandık', () => {
  test('saf mantık: sınıf, en düşük yeterli anahtar, normalize', () => {
    expect([gradeOfLevel(9), gradeOfLevel(19), gradeOfLevel(20), gradeOfLevel(39), gradeOfLevel(40), gradeOfLevel(55)]).toEqual([0, 0, 1, 1, 2, 2]);
    expect(keyFor([0, 2, 1], 0)).toBe(1); expect(keyFor([1, 2, 1], 0)).toBe(0); expect(keyFor([3, 0, 0], 1)).toBe(-1); expect(keyFor([0, 0, 1], 2)).toBe(2); expect(normKeys(undefined)).toEqual([0, 0, 0]); expect(normKeys([-3, 1] as any)).toEqual([0, 1, 0]);
  });
  test('anahtarsız/uzaktan açılamaz; açınca anahtar harcanır, akçe+eşya+kitap+parça gelir; düşük anahtar yüksek sandığı açmaz', () => {
    const { w, p, b } = setup(); const grade = gradeOfLevel(b.level); expect(call(w, p, 'chest.open', { n: b.id }).err).toBe('no_key');
    p.d.keys = [0, 0, 0]; p.d.keys[grade] = 2; const g0 = p.d.gold, bk0 = p.d.bag.book, fr0 = p.d.bag.frag;
    p.x += 60; expect(call(w, p, 'chest.open', { n: b.id }).ok).toBe(false); p.x -= 60;
    const r = call(w, p, 'chest.open', { n: b.id }); expect(r.ok).toBe(true); expect(p.d.keys[grade]).toBe(1); expect(r.data.gold).toBeGreaterThan(0); expect(p.d.gold - g0).toBe(r.data.gold); expect(r.data.items.length).toBe(CHEST.items[grade]);
    expect(r.data.items.every((i: any) => i.tier >= CHEST.minTier[grade])).toBe(true); expect(p.d.bag.book).toBeGreaterThan(bk0); expect(p.d.bag.frag).toBeGreaterThan(fr0);
    expect(call(w, p, 'chest.open', { n: 999 }).err).toBe('bad_args');
    if (grade > 0) { p.d.keys = [5, 0, 0]; expect(call(w, p, 'chest.open', { n: b.id }).err).toBe('no_key'); }
  });
  test('daha yüksek sınıf anahtar düşük sandığı açar ve önce en düşük yeterli anahtar harcanır', () => {
    const { w, p } = setup(); const low = genBosses().find((x) => gradeOfLevel(x.level) === 0)!; const c = chestPos(low); p.x = c.x; p.z = c.z; p.d.keys = [0, 1, 1];
    expect(call(w, p, 'chest.open', { n: low.id }).ok).toBe(true); expect(p.d.keys).toEqual([0, 0, 1]);
  });
  test('boss ölünce ödül hakkı olan oyuncuya bossun sınıfında anahtar düşer', () => {
    const rig = makeRig(34, { spawnCamps: true }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; w.recalc(p); p.hp = p.stats.maxHp; p.god = true;
    const m = [...w.mobs.values()].find((x) => x.bossId === 3 && !x.dun)!; p.x = m.x + 2; p.z = m.z; m.contrib.set(p.id, 100); m.hp = 1; w.damage(p, m, 99999);
    expect(p.d.keys![gradeOfLevel(m.lvl)]).toBe(1);
  });
});
