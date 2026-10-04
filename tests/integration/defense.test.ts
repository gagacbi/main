import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { SKILLS, makeItem, type Item } from '../../shared/game';

const ench = (slot: 'armor' | 'helmet' | 'weapon', ...e: Item['ench']): Item => { const it = makeItem(() => 0.5, slot, 20, 3, 'kilic'); it.base = { k: 'crit', v: 1 }; it.ench = e; return it; };
function duelRig() {
  const rig = makeRig(9, { spawnCamps: false });
  const a = rig.add('gok'); const b = rig.add('yer');
  for (const p of [a, b]) { p.d.level = 20; p.x = 80; p.z = 0; }
  b.x = 82; rig.world.recalc(a); rig.world.recalc(b); a.hp = a.stats.maxHp; b.hp = b.stats.maxHp;
  return { rig, a, b, w: rig.world };
}
const meanDmg = (w: ReturnType<typeof duelRig>['w'], a: Parameters<typeof w.playerHit>[0], b: Parameters<typeof w.playerHit>[1], n: number, o = {}) => {
  let sum = 0, blocked = 0;
  for (let i = 0; i < n; i++) { (b as { hp: number; stats: { maxHp: number } }).hp = (b as { stats: { maxHp: number } }).stats.maxHp; const d = w.playerHit(a, b, 1, 1, o); sum += d; if (d === 0) blocked++; }
  return { mean: sum / n, blocked: blocked / n };
};

describe('savunma sistemi: sunucuda PvP', () => {
  test('açık bölgede farklı boylar birbirine vurabilir (çatlak dahil açık PvP)', () => {
    const { w, a, b } = duelRig(); expect(w.canHitPlayer(a, b, false)).toBe(true);
  });
  test('vuruş bloğu: ~%30 vuruş tamamen engellenir ve blok olayı gönderilir', () => {
    const { w, a, b } = duelRig(); b.d.equip.helmet = ench('helmet', { k: 'blockHit', v: 9 }, { k: 'blockHit', v: 9 }, { k: 'blockHit', v: 9 }); w.recalc(b);
    expect(b.stats.blockHit).toBeCloseTo(0.27, 2);
    w.events.length = 0; const r = meanDmg(w, a, b, 3000);
    expect(r.blocked).toBeGreaterThan(0.22); expect(r.blocked).toBeLessThan(0.32);
    expect(w.events.some((e) => e.ev.k === 'dmg' && e.ev.blk && e.ev.v === 0)).toBe(true);
  });
  test('beceri bloğu yalnızca becerilere, vuruş bloğu yalnızca normal vuruşa uygulanır', () => {
    const { w, a, b } = duelRig(); b.d.equip.helmet = ench('helmet', { k: 'blockSkill', v: 9 }, { k: 'blockSkill', v: 9 }, { k: 'blockSkill', v: 9 }); w.recalc(b);
    const basic = meanDmg(w, a, b, 2000); const skill = meanDmg(w, a, b, 2000, { skill: true });
    expect(basic.blocked).toBe(0); expect(skill.blocked).toBeGreaterThan(0.2);
  });
  test('kılıç savunması kılıç vuruşunu azaltır ama çift el vuruşunu azaltmaz; delme ikisini de aşar', () => {
    const { w, a, b } = duelRig();
    b.d.equip.armor = ench('armor'); w.recalc(b);   // aynı zırh, efsunsuz: düz savunma karşılaştırmayı bozmasın
    const base = meanDmg(w, a, b, 800).mean;
    b.d.equip.armor = ench('armor', { k: 'defKilic', v: 12 }, { k: 'defKilic', v: 12 }, { k: 'defKilic', v: 12 }); w.recalc(b);
    const sword = meanDmg(w, a, b, 800).mean; const two = meanDmg(w, a, b, 800, { dk: 'cift' }).mean;
    expect(sword / base).toBeLessThan(0.75); expect(sword / base).toBeGreaterThan(0.58);
    expect(two / base).toBeGreaterThan(0.93);
    a.d.equip.weapon = ench('weapon', { k: 'pierce', v: 6 }, { k: 'pierce', v: 6 }, { k: 'pierce', v: 6 }, { k: 'pierce', v: 6 }); w.recalc(a);
    expect(a.stats.pierce).toBeGreaterThan(0.2); const pierced = meanDmg(w, a, b, 3000).mean; // ortalama delmeyle kısmen geri döner
    expect(pierced / base).toBeGreaterThan(sword / base + 0.02);
  });
  test('bloklanan beceri sersemletme gibi durum etkisini de uygulamaz', () => {
    const { w, a, b } = duelRig(); a.d.level = 20; a.d.skillRanks = [1, 1, 1, 1, 1, 1];
    b.d.equip.helmet = ench('helmet', { k: 'blockSkill', v: 9 }); w.recalc(b); b.stats.blockSkill = 1; // zorla %100
    let stunned = 0; const si = SKILLS.findIndex((s) => s.id === 'sarsinti');
    for (let i = 0; i < 20; i++) { a.cds[si] = 0; b.status = {}; b.hp = b.stats.maxHp; w.onSkill(a, si); if (b.status.stun) stunned++; }
    expect(stunned).toBe(0);
  });
  test('yaratık vuruşu da bloklanabilir ve bloklanınca durum etkisi bindirmez', () => {
    const rig = makeRig(3, { spawnCamps: false }); const p = rig.add('gok'); p.d.level = 10; p.x = 70; p.z = 0; rig.world.recalc(p); p.stats.blockHit = 1; p.hp = p.stats.maxHp;
    const m = rig.world.makeMob('albasti', 10, 71, 0, -1); m.hx = m.x; m.hz = m.z; m.target = p.id;
    for (let i = 0; i < 200; i++) rig.tick();
    expect(p.hp).toBe(p.stats.maxHp); expect(p.status.curse).toBeUndefined();
  });
  test('ölümsüz (god) hesap bloklanmaz ama hasar da almaz; ölü hedefe blok olayı yok', () => {
    const { w, a, b } = duelRig(); b.stats.blockHit = 1; b.god = true; const hp = b.hp; w.playerHit(a, b, 1); expect(b.hp).toBe(hp);
  });
});
