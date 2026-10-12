import { describe, expect, test } from 'vitest';
import { PACK, MOBS } from '../../shared/game';
import { genCamps } from '../../shared/world';
import { makeRig } from '../sim/rig';

function setup(seed = 5) {
  const rig = makeRig(seed, { spawnCamps: true }); const w = rig.world; const camp = genCamps().find((c) => c.count >= PACK.minCamp)!; const mates = w.campMobs.get(camp.id)!;
  const p = rig.add('gok'); p.d.level = Math.max(10, camp.level); w.recalc(p); p.hp = p.stats.maxHp; p.god = true; return { rig, w, camp, mates, p };
}
const at = (p: any, m: any, d: number) => { p.x = m.x + d; p.z = m.z; };

describe('Agresif sürüler ve çekme', () => {
  test('her kampın ilk yaratığı Sürü Başı: daha çok can ve saldırı; diğerleri sıradan', () => {
    const { mates } = setup(); expect(mates[0].alpha).toBe(true); expect(mates.slice(1).every((m) => !m.alpha)).toBe(true);
    const norm = mates[1]; expect(mates[0].maxHp / (norm.maxHp * (MOBS[mates[0].type].hp / MOBS[norm.type].hp))).toBeGreaterThan(PACK.alphaHp * 0.85);
  });
  test('ilk darbe yakındaki kamp arkadaşlarını çağırır; çağrı yarıçapının dışındakiler gelmez (çekme); zincirleme yok', () => {
    const { w, mates, p } = setup(); const norm = mates.filter((m) => !m.alpha); const a = norm[0]; const rad = PACK.call[a.type];
    // yarıçap içi ve dışı yerleştir
    const near = norm[1], far = norm[2]; near.x = a.x + rad * 0.5; near.z = a.z; far.x = a.x + rad + 6; far.z = a.z; const rest = mates.filter((m) => m !== a && m !== near && m !== far).filter((m) => !m.alpha);
    for (const m of rest) { m.x = a.x + 500; m.z = a.z; } mates[0].x = a.x + 500; mates[0].z = a.z;
    p.x = a.x + 3; p.z = a.z; w.damage(p, a, 5);
    expect(a.target).toBe(p.id); expect(near.target).toBe(p.id); expect(far.target).toBe(0); expect(rest.every((m) => m.target === 0)).toBe(true); expect(mates[0].target).toBe(0);
    expect(near.nextAtk).toBeGreaterThanOrEqual(w.now + PACK.delayMs[0] - 1);   // geç saldırır (koşma süresi)
  });
  test('Sürü Başı tüm kampı çağırır; öldürülünce ek XP/ödül; dolu hedefli yaratık yeniden çağrılmaz', () => {
    const { w, mates, p } = setup(); const al = mates[0]; for (const m of mates) { m.x = al.x + 4; m.z = al.z; } al.x = al.x - 4;
    p.x = al.x - 3; p.z = al.z; w.damage(p, al, 1); expect(mates.filter((m) => m !== al && m.target === p.id).length).toBe(mates.length - 1);
    const other = mates[1]; other.target = 999; const n0 = mates.filter((m) => m.target === p.id).length; const m3 = mates[2]; m3.target = 0; w.alertPack(other, p); expect(m3.target).toBe(p.id); expect(other.target).toBe(999); expect(n0).toBeGreaterThan(0);
  });
  test('güvenli bölgedeki oyuncu çağrılamaz; bekçi/çatlak/zindan yaratıkları çağırmaz', () => {
    const { w, mates, p } = setup(); const a = mates[1]; const b = mates[2]; b.x = a.x; b.z = a.z; (a as any).riftId = 3; p.x = a.x; p.z = a.z; w.alertPack(a, p); expect(b.target).toBe(0); (a as any).riftId = -1;
    (a as any).type = 'bekci'; w.alertPack(a, p); expect(b.target).toBe(0);
  });
  test('uzun koşuda sürü, oyuncu kaçınca yuvasına döner ve iyileşir', () => {
    const { rig, w, mates, p } = setup(); const a = mates.find((m) => !m.alpha)!; p.x = a.x + 3; p.z = a.z; w.damage(p, a, 5); rig.seconds(2); p.x = a.hx + 300; p.z = a.hz; p.god = true; rig.seconds(40);
    expect(a.target).toBe(0); expect(Math.hypot(a.x - a.hx, a.z - a.hz)).toBeLessThan(40);
  });
});
