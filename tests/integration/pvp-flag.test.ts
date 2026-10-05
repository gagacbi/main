import { describe, expect, test } from 'vitest';
import { HUB, PVP_FLAG } from '../../shared/game';
import { F } from '../../shared/protocol';
import { makeRig } from '../sim/rig';

function pair() {
  const rig = makeRig(5, { spawnCamps: false }); const w = rig.world; const a = rig.add('gok'); const b = rig.add('yer');
  for (const p of [a, b]) { p.d.level = 20; p.x = 80; p.z = 0; } b.x = 82; w.recalc(a); w.recalc(b);
  return { rig, w, a, b, rpc: (p: typeof a, on: boolean) => w.rpcRun(p, 'pvp', { on }) };
}
describe('isteğe bağlı PvP bayrağı', () => {
  test('varsayılan kapalı: kimse kimseye vuramaz; ikisi bayraklıysa vurulur; biri kapalıysa yine vurulmaz', () => {
    const { w, a, b, rpc } = pair(); expect(a.d.pvp).toBeFalsy();
    expect(w.canHitPlayer(a, b, true)).toBe(false);
    rpc(a, true); expect(w.canHitPlayer(a, b, false)).toBe(false); expect(w.canHitPlayer(b, a, false)).toBe(false);
    rpc(b, true); expect(w.canHitPlayer(a, b, false)).toBe(true); expect(w.canHitPlayer(b, a, false)).toBe(true);
  });
  test('bayrak kapanışı PvP’den 30 sn sonra; PvP’siz hemen kapanır', () => {
    const { rig, w, a, b, rpc } = pair(); rpc(a, true); rpc(b, true);
    w.playerHit(a, b, 1, 1); expect(() => rpc(a, false)).toThrow(); expect(() => rpc(b, false)).toThrow();
    rig.seconds(PVP_FLAG.offAfterSec + 1); rpc(a, false); expect(a.d.pvp).toBe(false);
    const c = rig.add('ay'); rpc(c, true); rpc(c, false); expect(c.d.pvp).toBe(false);
  });
  test('Otlak ve zindan PvP’ye kapalı: bayrak açılamaz, açıksa da etkisiz', () => {
    const { w, a, b, rpc } = pair(); rpc(a, true); rpc(b, true);
    w.teleport(a, 'otlak'); w.teleport(b, 'otlak'); a.x = 900; a.z = 40; b.x = 902; b.z = 40; // güvenli kampın dışı
    expect(w.pvpActive(a)).toBe(false); expect(w.canHitPlayer(a, b, true)).toBe(false);
    rpc(a, false); expect(() => rpc(a, true)).toThrow();
  });
  test('güvenli bölgede PvP yok (bayraklı olsa da); bayrak snapshot bayrağında görünür', () => {
    const { w, a, b, rpc } = pair(); rpc(a, true); rpc(b, true);
    a.x = HUB.fire.x; a.z = HUB.fire.z; b.x = a.x + 1; b.z = a.z; expect(w.canHitPlayer(a, b, true)).toBe(false);
    a.x = 80; a.z = 0; b.x = 82; b.z = 0; expect(w.pvpActive(a)).toBe(true);
  });
  test('bayraklı alp yaratıklardan %10 fazla XP alır; Otlak’ta bonus yok', () => {
    const { w, a, b, rpc } = pair(); rpc(a, true);
    const xp = (p: typeof a) => { p.d.xp = 0; const m = w.makeMob('cakal', 20, p.x + 2, p.z, -1); m.contrib.set(p.id, 100); w.damage(p, m, 1e9); return p.d.xp; };
    const flagged = xp(a), plain = xp(b); expect(flagged / plain).toBeGreaterThan(1.05); expect(flagged / plain).toBeLessThan(1.16);
    void F;
  });
});
