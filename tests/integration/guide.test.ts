import { describe, expect, test } from 'vitest';
import { GUIDE, GUIDE_ACKS, guideActive, guideNorm, guideOpen } from '../../shared/guide';
import { FISH } from '../../shared/fishing';
import { HUB, makeItem, TUTORIAL_STEPS } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function setup(level = 20, coreDone = true) { const rig = makeRig(61, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; if (coreDone) p.d.tut = { step: TUTORIAL_STEPS.length, prog: 0 }; w.recalc(p); return { rig, w, p }; }

describe('Alp Rehberi', () => {
  test('veri bütünlüğü: kimlikler tekil, önkoşullar var, ödüller küçük (akçe ≤ 500, kitap ≤ 3)', () => {
    const ids = GUIDE.map((t) => t.id); expect(new Set(ids).size).toBe(ids.length);
    for (const t of GUIDE) { if (t.after) expect(ids).toContain(t.after); expect((t.reward.gold ?? 0)).toBeLessThanOrEqual(500); expect((t.reward.book ?? 0)).toBeLessThanOrEqual(3); expect(t.need).toBeGreaterThan(0); }
    expect(GUIDE_ACKS.every((a) => GUIDE.some((t) => t.ev === a))).toBe(true);
  });
  test('çekirdek öğretici bitmeden olaylar sayılmaz; bitince sayılır ve ödül TEK sefer verilir', () => {
    const { w, p } = setup(20, false); const it = makeItem(mulberry32(1), 'weapon', 5, 1); it.lvlReq = 1; p.d.items.push(it);
    expect(call(w, p, 'equip', { id: it.id }).ok).toBe(true); expect(p.d.guide?.done ?? []).not.toContain('equip');
    p.d.tut = { step: TUTORIAL_STEPS.length, prog: 0 }; const g0 = p.d.gold; const it2 = makeItem(mulberry32(2), 'armor', 5, 1); it2.lvlReq = 1; p.d.items.push(it2);
    expect(call(w, p, 'equip', { id: it2.id }).ok).toBe(true); expect(p.d.guide!.done).toContain('equip'); expect(p.d.gold - g0).toBe(60);
    const it3 = makeItem(mulberry32(3), 'helmet', 5, 1); it3.lvlReq = 1; p.d.items.push(it3); call(w, p, 'equip', { id: it3.id }); expect(p.d.gold - g0).toBe(60);   // ikinci kez ödül yok
  });
  test('önkoşul: balık yakalama olta alınmadan açık değildir; olta alınca açılır; yem ödülü gelir', () => {
    const { w, p } = setup(12); const g = guideNorm(p.d.guide); const fish = GUIDE.find((t) => t.id === 'fish')!; expect(guideOpen(g, fish, 12)).toBe(false);
    p.d.gold = 1000; p.x = FISH.pond.x; p.z = FISH.pond.z + FISH.pond.r + 1; expect(call(w, p, 'fish.buy', { what: 'rod' }).ok).toBe(true); expect(p.d.guide!.done).toContain('fishrod'); expect(p.d.fish!.hamur).toBe(10);
    expect(guideOpen(guideNorm(p.d.guide), fish, 12)).toBe(true); expect(guideActive(guideNorm(p.d.guide), 12, 9).map((t) => t.id)).toContain('fish');
  });
  test('seviye kilidi: Sv 15 altında Kut Taşı görevi sayılmaz; taş ödülü (Kut Taşı görevi) taşı verir ve kendini tetiklemez', () => {
    const { w, p } = setup(15); w.giveStone(p, 0); expect(p.d.guide!.done).toContain('ktfound'); expect((p.d.kt!.s.flat() as number[]).reduce((a, b) => a + b, 0)).toBe(2);   // 1 düşen + 1 ödül
    const q = setup(12); q.w.giveStone(q.p, 0); expect(q.p.d.guide?.done ?? []).not.toContain('ktfound');
  });
  test('tut.ack yalnızca wiki/pazar; başka olay bildirilemez; ödül bir kez', () => {
    const { w, p } = setup(12); expect(call(w, p, 'tut.ack', { k: 'skill' }).err).toBe('bad_args'); expect(call(w, p, 'tut.ack', { k: 'chest' }).err).toBe('bad_args'); const g0 = p.d.gold;
    expect(call(w, p, 'tut.ack', { k: 'wiki' }).ok).toBe(true); expect(p.d.gold - g0).toBe(50); call(w, p, 'tut.ack', { k: 'wiki' }); expect(p.d.gold - g0).toBe(50);
  });
  test('eski kayıt eşitlemesi: koşulu sağlanmış görevler ÖDÜLSÜZ tamamlanır (olta, takılı taş, evrim)', () => {
    const { w, p } = setup(30); p.d.fish = { rod: 2, pts: 0, hamur: 0, solucan: 0, luck: 0, stock: {}, caught: 5, ancestor: false }; p.d.kt = { s: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], eq: [1, -1, -1, -1, -1, -1] }; p.d.companions = [{ id: 'c', name: 'x', cls: 'alp', level: 9, xp: 0, traits: ['tuccar', 'cevik'], evo: 1 }];
    const g0 = p.d.gold, h0 = p.d.fish.hamur; w.guideSync(p); const done = p.d.guide!.done; for (const id of ['fishrod', 'fish', 'ktfound', 'ktset', 'evolve']) expect(done).toContain(id);
    expect(p.d.gold).toBe(g0); expect(p.d.fish.hamur).toBe(h0);
  });
  test('olay bağları: yetenek, Kımız, kayıp günlük görev, sandık, anahtar ve yoldaş evrimi görevleri ilerler', () => {
    const { w, p } = setup(30); p.d.skillRanks = [1, 1, 1, 1, 1, 1]; p.hp = 1; p.d.kimiz = 3; p.d.gold = 1e6;
    w.onSkill(p, 0); expect(p.d.guide!.prog.skill).toBe(1); call(w, p, 'kimiz.use'); expect(p.d.guide!.done).toContain('kimiz'); expect(p.d.kimiz).toBe(2 + 2);   // içilen 1 + ödül 2
    p.d.companions = [{ id: 'c1', name: 'x', cls: 'alp', level: 20, xp: 0, traits: ['tuccar', 'cevik'] }]; p.d.bag.frag = 50; p.x = HUB.otag.x + 3; p.z = HUB.otag.z; call(w, p, 'oba.evolve', { compId: 'c1' }); expect(p.d.guide!.done).toContain('evolve');
  });
});
