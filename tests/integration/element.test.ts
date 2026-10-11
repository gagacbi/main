import { describe, expect, test } from 'vitest';
import { EL, elMult } from '../../shared/element';
import { HUB, makeItem } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function smith(up = 7) { const rig = makeRig(71, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; w.recalc(p); p.x = HUB.demirci.x + 2; p.z = HUB.demirci.z; p.d.gold = 5_000_000;
  const it = makeItem(mulberry32(3), 'weapon', 25, 2, 'kilic'); it.lvlReq = 1; it.up = up; p.d.items.push(it); return { rig, w, p, it }; }

describe('Element yazısı', () => {
  test('+7 altı silaha ve silah dışına eklenmez; ekleme güç 1–8 verir, akçe harcar; ikinci kez eklenmez', () => {
    const lo = smith(6); expect(call(lo.w, lo.p, 'element', { id: lo.it.id, op: 'add', el: 'ates' }).err).toBe('el_need_up');
    const { w, p, it } = smith(7); const g0 = p.d.gold; const r = call(w, p, 'element', { id: it.id, op: 'add', el: 'ates' }); expect(r.ok).toBe(true);
    expect(it.el!.k).toBe('ates'); expect(it.el!.p).toBeGreaterThanOrEqual(1); expect(it.el!.p).toBeLessThanOrEqual(EL.addMax); expect(g0 - p.d.gold).toBe(EL.addCost(it.ilvl));
    expect(call(w, p, 'element', { id: it.id, op: 'add', el: 'buz' }).err).toBe('el_has');
    const armor = makeItem(mulberry32(4), 'armor', 20, 1); armor.up = 8; p.d.items.push(armor); expect(call(w, p, 'element', { id: armor.id, op: 'add', el: 'ates' }).err).toBe('el_need_up');
  });
  test('değiştirme gücü korur ve iki kat öder; yükseltme başarısızken eşya kaybolmaz, yalnızca akçe gider; en çok +24', () => {
    const { w, p, it } = smith(); call(w, p, 'element', { id: it.id, op: 'add', el: 'ates' }); const pw = it.el!.p; let g = p.d.gold;
    expect(call(w, p, 'element', { id: it.id, op: 'swap', el: 'buz' }).ok).toBe(true); expect(it.el).toEqual({ k: 'buz', p: pw }); expect(g - p.d.gold).toBe(EL.swapCost(it.ilvl)); expect(call(w, p, 'element', { id: it.id, op: 'swap', el: 'buz' }).ok).toBe(false);
    let fails = 0, wins = 0; for (let i = 0; i < 80 && it.el!.p < EL.maxPower; i++) { g = p.d.gold; const before = it.el!.p; const r = call(w, p, 'element', { id: it.id, op: 'raise' }); expect(r.ok).toBe(true); expect(g - p.d.gold).toBe(EL.raiseCost(it.ilvl, before)); if (r.data.ok) wins++; else { fails++; expect(it.el!.p).toBe(before); } }
    expect(fails).toBeGreaterThan(0); expect(wins).toBeGreaterThan(5); expect(p.d.items.some((x) => x.id === it.id)).toBe(true);
    it.el!.p = EL.maxPower; expect(call(w, p, 'element', { id: it.id, op: 'raise' }).ok).toBe(false);
  });
  test('hasar çarpanı: zayıf elementte güç başına +%0,5 (en çok +%12), tarafsızda az, elementsizde 1; bekçi tarafsız; PvP\'de uygulanmaz', () => {
    expect(elMult(undefined, 'albasti')).toBe(1); expect(elMult({ k: 'ates', p: 24 }, 'albasti')).toBeCloseTo(1.12, 5); expect(elMult({ k: 'karanlik', p: 24 }, 'albasti')).toBeCloseTo(1.036, 5); expect(elMult({ k: 'ates', p: 24 }, 'bekci')).toBeCloseTo(1.036, 5);
    const { rig, w, p, it } = smith(); p.x = 0; p.z = 130; it.el = { k: 'ates', p: 24 }; p.d.equip.weapon = it; w.recalc(p); const m = w.makeMob('albasti', 25, p.x + 2, p.z, -1); m.dummy = true; m.maxHp = m.hp = 1e9; m.nextAtk = Infinity;
    const avg = (n: number) => { w.dummyLog.length = 0; for (let i = 0; i < n; i++) w.playerHit(p, m, 1, 1); return w.dummyLog.reduce((a, x) => a + x.v, 0) / w.dummyLog.length; };
    const withEl = avg(600); it.el = { k: 'ruzgar', p: 24 }; const other = avg(600); expect(withEl / other).toBeGreaterThan(1.05); expect(withEl / other).toBeLessThan(1.12);   // 1,12 / 1,036 ≈ 1,081
    void rig;
  });
});
