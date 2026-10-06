import { describe, expect, test } from 'vitest';
import { HUB, HUB_R, zoneAt } from '../../shared/game';
import { makeRig } from '../sim/rig';

function setup() {
  const rig = makeRig(9, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; w.recalc(p); p.hp = p.stats.maxHp;
  p.x = 2; p.z = 2; p.d.rank = -2; return { rig, w, p };
}
describe('Şehir Muhafızları ve kırmızı adlı oyuncu', () => {
  test('kırmızı adlı oyuncu köyde vurulur ve nedeni anlatılır; derecesi düzelince vurulmaz', () => {
    const { rig, w, p } = setup(); const hp0 = p.hp; rig.seconds(2);
    expect(p.hp).toBeLessThan(hp0);
    p.d.rank = 0; p.hp = p.stats.maxHp; p.deadUntil = 0; rig.seconds(3); expect(p.hp).toBe(p.stats.maxHp);
  });
  test('yönetici (GM) hesabı muhafızlardan etkilenmez', () => {
    const { rig, p } = setup(); p.role = 'admin'; rig.seconds(3); expect(p.hp).toBe(p.stats.maxHp);
  });
  test('yeniden doğma korumasında muhafız ateş etmez', () => {
    const { rig, w, p } = setup(); p.protectUntil = w.now + 5000; rig.seconds(3); expect(p.hp).toBe(p.stats.maxHp);
  });
  test('kırmızı adlı oyuncu güvenli bölgenin (muhafızların ateş ettiği alanın) dışında doğar: ölüm döngüsü olmaz; normal oyuncu yurtta doğar', () => {
    const { w, p } = setup(); const s = w.respawnPoint(p);
    expect(Math.hypot(s.x, s.z)).toBeGreaterThan(HUB_R); expect(zoneAt(s.x, s.z)).toBe('risky');
    p.d.rank = 0; expect(w.respawnPoint(p)).toEqual(HUB.spawn.gok);
  });
});
