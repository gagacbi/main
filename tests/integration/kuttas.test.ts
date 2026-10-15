import { describe, expect, test } from 'vitest';
import { KT, KT_GRADES, KT_TYPES, ktLines, newKt } from '../../shared/kuttas';
import { HUB } from '../../shared/game';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function smith(level = 30) { const rig = makeRig(81, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; w.recalc(p); p.x = HUB.demirci.x + 2; p.z = HUB.demirci.z; p.d.gold = 50_000_000; return { rig, w, p }; }
const give = (p: any, ti: number, g: number, n: number) => { p.d.kt ??= newKt(); p.d.kt.s[ti][g] += n; };

describe('Kut Taşları', () => {
  test('saf modül: set bonusu yalnızca altı yuva doluyken; değerler sınıfla artar', () => {
    const k = newKt(); expect(ktLines(k)).toEqual([]); k.eq = [0, 0, 0, 0, 0, -1]; expect(ktLines(k).length).toBe(5);
    k.eq = [0, 0, 0, 0, 0, 0]; const base = ktLines(k).length; expect(base).toBe(6 + 2); k.eq = [3, 3, 3, 3, 3, 3]; expect(ktLines(k).length).toBe(6 + 2 + 2);
    for (const t of KT_TYPES) for (let g = 1; g < KT_GRADES; g++) expect(KT.val[t][g]).toBeGreaterThan(KT.val[t][g - 1]);
  });
  test('takma/çıkarma: stok düşer, istatistik gelir, çıkarmada kırılma riski; seviye ve yakınlık şartı', () => {
    const { w, p } = smith(); give(p, 0, 0, 5); const atk0 = p.stats.atk;
    expect(call(w, p, 'kt.set', { type: 'alp', grade: 4 }).err).toBe('no_item');
    expect(call(w, p, 'kt.set', { type: 'alp', grade: 0 }).ok).toBe(true); expect(p.d.kt!.eq[0]).toBe(0); expect(p.d.kt!.s[0][0]).toBe(4); expect(p.stats.atk).toBeGreaterThan(atk0 - 1);
    let kept = 0, broke = 0; for (let i = 0; i < 40; i++) { give(p, 0, 0, 1); const r = call(w, p, 'kt.set', { type: 'alp', grade: 0 }); expect(r.ok).toBe(true); if (r.data.kept) kept++; else broke++; }
    expect(kept).toBeGreaterThan(15); expect(broke).toBeGreaterThan(3);
    const u = call(w, p, 'kt.unset', { type: 'alp' }); expect(u.ok).toBe(true); expect(p.d.kt!.eq[0]).toBe(-1); expect(call(w, p, 'kt.unset', { type: 'alp' }).err).toBe('no_item');
    p.x += 50; expect(call(w, p, 'kt.set', { type: 'alp', grade: 0 }).ok).toBe(false); p.x -= 50; p.d.level = 10; expect(call(w, p, 'kt.set', { type: 'alp', grade: 0 }).err).toBe('kt_level');
  });
  test('saflaştırma: 3 taş + akçe; başarıda +1 üst sınıf, başarısızlıkta 2 taş yanar; son sınıf yükselmez; eksik taş/akçe reddedilir', () => {
    const { w, p } = smith(); give(p, 1, 0, 2); expect(call(w, p, 'kt.refine', { type: 'kalkan', grade: 0 }).err).toBe('kt_few');
    give(p, 1, 0, 3000); let ok = 0, fail = 0; const g0 = p.d.gold;
    for (let i = 0; i < 400; i++) { const r = call(w, p, 'kt.refine', { type: 'kalkan', grade: 0 }); expect(r.ok).toBe(true); if (r.data.ok) ok++; else fail++; }
    expect(ok / 400).toBeGreaterThan(0.6); expect(ok / 400).toBeLessThan(0.8); expect(p.d.kt!.s[1][1]).toBe(ok); expect(p.d.kt!.s[1][0]).toBe(2 + 3000 - ok * 3 - fail * 2);
    expect(g0 - p.d.gold).toBe(400 * KT.refineCost(0, p.d.level)); give(p, 1, 4, 9); expect(call(w, p, 'kt.refine', { type: 'kalkan', grade: 4 }).err).toBe('max_rank');
    p.d.gold = 1; expect(call(w, p, 'kt.refine', { type: 'kalkan', grade: 0 }).err).toBe('no_gold');
    expect(call(w, p, 'kt.refine', { type: 'xx', grade: 0 }).err).toBe('bad_args'); expect(call(w, p, 'kt.refine', { type: 'alp', grade: 99 }).err).toBe('bad_args');
  });
  test('düşüş: giveStone envantere ekler; Sv 15 altı oyuncuya düşmez (rollDrops yolu)', () => {
    const { w, p } = smith(); w.giveStone(p, 1); expect(p.d.kt!.s.flat().reduce((a: number, b: number) => a + b, 0)).toBe(1);
    let n = 0; const orig = w.giveStone.bind(w); w.giveStone = (...a: any[]) => { n++; return (orig as any)(...a); };
    const mob: any = { x: p.x, z: p.z, lvl: 30, type: 'cakal' }; for (let i = 0; i < 6000; i++) w.rollDrops(p, mob, 0.15); expect(n).toBeGreaterThan(10); expect(n).toBeLessThan(120);
    n = 0; p.d.level = 10; for (let i = 0; i < 3000; i++) w.rollDrops(p, mob, 0.15); expect(n).toBe(0);
  });
});
