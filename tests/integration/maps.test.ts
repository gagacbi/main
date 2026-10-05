import { describe, expect, test } from 'vitest';
import { MAPS, REGIONS, regionAt } from '../../shared/maps';
import { HUB, gatePos, zoneAt, inHubTown } from '../../shared/game';
import { genAllCamps, genBosses, genCamps, stepMove, worldObstacles } from '../../shared/world';
import { makeRig } from '../sim/rig';

describe('çoklu harita altyapısı', () => {
  test('bölgeler birbirinden ayrık; regionAt merkezde doğru bölgeyi bulur', () => {
    for (const a of REGIONS) { expect(regionAt(a.cx, a.cz)?.id).toBe(a.id); for (const b of REGIONS) if (a !== b) expect(Math.hypot(a.cx - b.cx, a.cz - b.cz)).toBeGreaterThan(a.r + b.r + 20); }
    expect(regionAt(5000, 5000)).toBeNull();
  });
  test('Bozkır kampları eskisi gibi (64) ve kimlik = dizin; yeni alanların kampları seviye aralığında', () => {
    const all = genAllCamps(); expect(genCamps().length).toBe(64); all.forEach((c, i) => expect(c.id).toBe(i));
    for (const m of ['otlak', 'erlik'] as const) { const cs = all.filter((c) => c.map === m); expect(cs.length).toBeGreaterThan(20); for (const c of cs) { expect(c.level).toBeGreaterThanOrEqual(MAPS[m].lv[0]); expect(c.level).toBeLessThanOrEqual(MAPS[m].lv[1]); expect(regionAt(c.x, c.z)?.map).toBe(m); } }
  });
  test('her boss kendi haritasında, engelsiz yerde', () => {
    const obs = worldObstacles();
    for (const b of genBosses()) { expect(regionAt(b.x, b.z)?.map).toBe(b.map); expect(obs.some((o) => (o.x - b.x) ** 2 + (o.z - b.z) ** 2 < o.r ** 2)).toBe(false); }
  });
  test('stepMove: bölge sınırı kendi merkezine göre; bölge güvenli alanı zoneAt ile güvenli', () => {
    for (const r of REGIONS) { const p = { x: r.cx, z: r.cz }; for (let i = 0; i < 400; i++) stepMove(p, 1, 0, 20, 0.05); expect(Math.hypot(p.x - r.cx, p.z - r.cz)).toBeLessThanOrEqual(r.r); expect(regionAt(p.x, p.z)?.id).toBe(r.id); }
    expect(zoneAt(900, 0)).toBe('safe'); expect(zoneAt(900 + 40, 0)).toBe('risky'); expect(zoneAt(-900, 0)).toBe('safe'); expect(zoneAt(0, 0)).toBe('safe');
  });
  test('kapı taşı yurdun içinde ve engel dışında', () => {
    const g = HUB.gate; expect(inHubTown(g.x, g.z)).toBe(true); expect(worldObstacles().some((o) => (o.x - g.x) ** 2 + (o.z - g.z) ** 2 < (o.r + 2) ** 2)).toBe(false);
    expect(gatePos('otlak')).toEqual({ x: 900, z: -4 });
  });
  test('travel: yurttan Otlak’a, geri; seviye sınırları; dövüşte yasak; başka bölgeden kapı yok', () => {
    const rig = makeRig(3, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); const call = (to: string) => w.rpcRun(p, 'travel', { to });
    expect(() => call('otlak')).toThrow(); // kapıdan uzak
    p.x = HUB.gate.x; p.z = HUB.gate.z; expect(() => call('erlik')).toThrow(); // Sv1 < 38
    call('otlak'); expect(regionAt(p.x, p.z)?.id).toBe('otlak'); expect(zoneAt(p.x, p.z)).toBe('safe');
    expect(() => call('erlik')).toThrow(); // otlak kapısından erlik yok
    call('bozkir'); expect(regionAt(p.x, p.z)?.id).toBe('bozkir');
    p.d.level = 25; p.x = HUB.gate.x; p.z = HUB.gate.z; expect(() => call('otlak')).toThrow(); // Sv25 > 20
    p.d.level = 40; w.recalc(p); call('erlik'); expect(regionAt(p.x, p.z)?.id).toBe('erlik');
    p.lastCombat = w.now; expect(() => call('bozkir')).toThrow();
  });
  test('boş bölgelerde yaratık güncellenmez; ölüm ve doğuş bölgenin kampında', () => {
    const rig = makeRig(4); const w = rig.world; const p = rig.add('gok'); w.teleport(p, 'erlik');
    p.d.level = 40; p.hp = 0; w.damage(null, p, 1e9); p.deadUntil = w.now - 1; w.respawn(p);
    expect(regionAt(p.x, p.z)?.id).toBe('erlik'); expect(zoneAt(p.x, p.z)).toBe('safe');
  });
});
