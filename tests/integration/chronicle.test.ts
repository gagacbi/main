import { describe, expect, test } from 'vitest';
import { ERA_AT, ERA_STEP, RUIN_LEVELS, eraOf, eraStartPts, genRuins, threatName } from '../../shared/chronicle';
import { chronOf } from '../../server/chronicle';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };

describe('Kut Yıllığı ve çağlar', () => {
  test('çağ puandan türer ve sonsuzdur: sabit eşikler, sonra her ERA_STEP puanda yeni çağ', () => {
    expect(eraOf(0)).toBe(0); expect(eraOf(ERA_AT[1] - 1)).toBe(0); expect(eraOf(ERA_AT[1])).toBe(1);
    const last = ERA_AT.length - 1; expect(eraOf(ERA_AT[last])).toBe(last); expect(eraOf(ERA_AT[last] + ERA_STEP)).toBe(last + 1); expect(eraOf(ERA_AT[last] + ERA_STEP * 40)).toBe(last + 40);
    for (let n = 1; n < 20; n++) expect(eraOf(eraStartPts(n))).toBe(n);
    expect(threatName(7)).toEqual(threatName(7)); // deterministik
  });
  test('kalıntılar: dokuz tane, yollardan ve birbirinden ayrık, seviyeye göre uzaklaşır', () => {
    const r = genRuins(); expect(r.length).toBe(RUIN_LEVELS.length);
    for (let i = 1; i < r.length; i++) expect(Math.hypot(r[i].x, r[i].z)).toBeGreaterThan(Math.hypot(r[i - 1].x, r[i - 1].z) - 30);
  });
  test('olaylar kalıcı yazılır, ilkler bir kez; çağ geçişi Yıllık\'a ve duyuruya düşer', () => {
    const rig = makeRig(31, { spawnCamps: false }); const w = rig.world; const c = chronOf(w.ctx.db);
    w.chron('boss', 'Ayça', 1, 1, 'boss.first.1'); w.chron('boss', 'Börü', 1, 0, 'boss.first.1');
    expect(c.entries.filter((e) => e.k === 'boss').length).toBe(1);
    const seen: string[] = []; const orig = w.ctx.broadcastSys; w.ctx.broadcastSys = (k, p) => { seen.push(k + ':' + (p?.n ?? '')); orig(k, p); };
    for (let i = 0; i < 9; i++) w.chron('insc', 'X' + i, i, 0); // 9×25 = 225 → çağ 1 (80) geçildi
    expect(c.era).toBe(1); expect(seen).toContain('sys.era:1'); expect(c.entries.some((e) => e.k === 'era' && e.a === 1)).toBe(true);
    // kalıcılık: aynı veritabanından yeniden yüklenince korunur
    const again = new (c.constructor as any)(w.ctx.db); expect(again.pts).toBe(c.pts); expect(again.entries.length).toBe(c.entries.length);
  });
  test('kalıntı okuma: yakınlık ve seviye şartı, bir kez ödül, Yıllık\'a işlenir', () => {
    const rig = makeRig(32, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); const ru = genRuins()[0];
    p.x = ru.x + 2; p.z = ru.z; p.d.level = 1; w.recalc(p);
    expect(call(w, p, 'ruin', { n: 1 }).ok).toBe(true); // Sv 3-2=1 yeter
    const g = p.d.gold; expect(call(w, p, 'ruin', { n: 1 }).data.isNew).toBe(false); expect(p.d.gold).toBe(g);
    expect(p.d.clues).toContain('ruin.1'); expect(chronOf(w.ctx.db).entries.some((e) => e.k === 'ruin' && e.who === p.name)).toBe(true);
    const far = genRuins()[5]; p.x = ru.x; p.z = ru.z; expect(call(w, p, 'ruin', { n: 6 }).ok).toBe(false);
    p.x = far.x + 2; p.z = far.z; expect(call(w, p, 'ruin', { n: 6 }).err).toBe('ruin_locked');
    p.d.level = 40; w.recalc(p); expect(call(w, p, 'ruin', { n: 6 }).data.isNew).toBe(true);
    const v = call(w, p, 'chron').data; expect(v.ruins).toBe(2); expect(v.entries.length).toBeGreaterThan(0);
  });
});
