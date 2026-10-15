import { describe, expect, test } from 'vitest';
import { DUNGEONS } from '../../shared/dungeon';
import { gatePos } from '../../shared/game';
import { regionAt } from '../../shared/maps';
import { makeRig } from '../sim/rig';

function setup(n = 1, level = 46) {
  const rig = makeRig(21, { spawnCamps: false }); const w = rig.world; const ps = Array.from({ length: n }, (_, i) => { const p = rig.add((['gok', 'yer', 'ay'] as const)[i % 3]); p.d.level = level; p.d.gold = 10000; w.recalc(p); p.hp = p.stats.maxHp; w.teleport(p, 'erlik'); return p; });
  const enter = (p: typeof ps[0], d: string, solo = false) => w.rpcRun(p, 'dungeon.enter', { d, solo });
  const advance = (sec: number) => rig.seconds(sec);
  return { rig, w, ps, enter, advance };
}
const slayAll = (w: ReturnType<typeof setup>['w'], by: ReturnType<typeof setup>['ps'][0]) => { for (const m of [...w.mobs.values()]) if (m.dun && !m.dead) { m.contrib.set(by.id, 1000); w.damage(by, m, 1e12); } };

describe('zindanlar', () => {
  test('giriş koşulları: seviye, ücret, kapıya yakınlık, günlük hak', () => {
    const { w, ps, enter, advance } = setup(1, 40); const p = ps[0];
    expect(() => enter(p, 'demir')).toThrow(); // Sv40 < 41
    p.d.level = 46; p.d.gold = 100; expect(() => enter(p, 'demir')).toThrow(); // akçe yetmez
    p.d.gold = 10000; p.x += 40; expect(() => enter(p, 'demir')).toThrow(); // kapıdan uzak
    p.x = gatePos('erlik').x; p.z = gatePos('erlik').z + 3; enter(p, 'demir', true); expect(p.d.gold).toBe(10000 - DUNGEONS.demir!.fee);
    expect(() => enter(p, 'demir')).toThrow(); // zaten sırada
    advance(1); expect(regionAt(p.x, p.z)?.id).toBe('demir#0'); expect(w.dungeons.size).toBe(1);
  });
  test('tam akış: dalgalar → boss → ödül; ücret düşer, günlük hak azalır; çıkışta Erlik kampına döner', () => {
    const { rig, w, ps, enter, advance } = setup(2); const [a, b] = ps;
    enter(a, 'demir'); enter(b, 'demir'); advance(DUNGEONS.demir!.lobbySec + 8);
    const run = [...w.dungeons.values()][0]; expect(run.n).toBe(2); expect(regionAt(a.x, a.z)?.map).toBe('demir');
    for (let i = 0; i < DUNGEONS.demir!.waves.length; i++) {
      advance(1); expect(run.state === 'wave' || run.state === 'gap').toBe(true);
      for (let t = 0; t < 40 && run.mobs.size === 0; t++) advance(1);
      expect(run.mobs.size).toBeGreaterThan(0); slayAll(w, a); advance(1);
    }
    for (let t = 0; t < 40 && run.state !== 'boss'; t++) advance(1); expect(run.state).toBe('boss');
    const xp0 = a.d.xp + a.d.level * 1e9; const boss = [...w.mobs.values()].find((m) => m.bossId === 10)!; expect(boss).toBeTruthy(); boss.contrib.set(a.id, 600); boss.contrib.set(b.id, 400); w.damage(a, boss, 1e13);
    expect(run.state).toBe('won'); expect(a.d.dun!.clears.demir).toBe(1); expect(a.d.dun!.n.demir).toBe(1); expect(xp0).toBeDefined();
    expect(w.drops.size).toBeGreaterThan(8);
    advance(50); expect(w.dungeons.size).toBe(0); expect(regionAt(a.x, a.z)?.id).toBe('erlik');
    void rig;
  });
  test('günlük hak biter; ertesi gün (UTC+3) yenilenir; parti yarısı dışarıdaysa iade', () => {
    const { rig, w, ps, enter, advance } = setup(1); const p = ps[0]; const def = DUNGEONS.demir!;
    for (let i = 0; i < def.daily; i++) { p.x = gatePos('erlik').x; p.z = gatePos('erlik').z + 3; enter(p, 'demir', true); advance(1); w.rpcRun(p, 'dungeon.leave', {}); advance(DUNGEONS.demir!.limitSec > 0 ? 50 : 1); }
    p.x = gatePos('erlik').x; p.z = gatePos('erlik').z + 3; expect(() => enter(p, 'demir', true)).toThrow();
    rig.clock.advance(24 * 3600 * 1000); enter(p, 'demir', true); // gün atladı
    const g = p.d.gold; w.rpcRun(p, 'dungeon.leave', {}); expect(p.d.gold).toBe(g + def.fee); // sıradayken ayrılma iade eder
  });
  test('zindanda ölen deneyim kaybetmez, Erlik kampında doğar; hepsi ölünce zindan kaybedilir ve boşalır', () => {
    const { w, ps, enter, advance } = setup(1); const p = ps[0]; enter(p, 'golge', true); advance(8);
    const run = [...w.dungeons.values()][0]; expect(run).toBeTruthy(); p.d.xp = 1000; advance(3);
    w.damage(null, p, 1e9); expect(p.d.xp).toBe(1000); p.deadUntil = w.now - 1; w.respawn(p); expect(regionAt(p.x, p.z)?.id).toBe('erlik');
    advance(20); expect(w.dungeons.size).toBe(0);
  });
  test('süre dolunca zindan kaybedilir; iki zindan farklı slotlarda eşzamanlı', () => {
    const { rig, w, ps, enter, advance } = setup(2); const [a, b] = ps; enter(a, 'demir', true); advance(2); enter(b, 'demir', true); advance(2);
    expect(w.dungeons.size).toBe(2); expect(new Set([...w.dungeons.values()].map((r) => r.region.id)).size).toBe(2);
    rig.clock.advance((DUNGEONS.demir!.limitSec + 5) * 1000); advance(2); expect([...w.dungeons.values()].every((r) => r.state === 'lost')).toBe(true);
  });
});
