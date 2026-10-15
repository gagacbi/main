import { describe, expect, test } from 'vitest';
import { dropLevelMult } from '../../shared/game';
import { makeRig } from '../sim/rig';

describe('drop seviye farkı eğrisi', () => {
  test('eğri: +5 en çok (×1,5), ötesinde azalır, alt yaratıkta hızla düşer, tabanlar', () => {
    expect(dropLevelMult(0)).toBe(1); expect(dropLevelMult(5)).toBeCloseTo(1.5, 5); expect(dropLevelMult(3)).toBeGreaterThan(dropLevelMult(1));
    expect(dropLevelMult(8)).toBeLessThan(dropLevelMult(5)); expect(dropLevelMult(40)).toBe(0.6); expect(dropLevelMult(-5)).toBeCloseTo(0.25, 5); expect(dropLevelMult(-30)).toBe(0.1);
  });
  test('sunucuda: +5 yaratık eşit seviyeden ~%50 fazla, −5 yaratık ~%75 az eşya düşürür', () => {
    const rig = makeRig(41, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30;
    const items = (mobLvl: number) => { w.drops.clear(); let n = 0; for (let i = 0; i < 6000; i++) { const m = w.makeMob('cakal', mobLvl, p.x, p.z, -1); w.mobs.delete(m.id); w.rollDrops(p, m, 1); for (const d of w.drops.values()) if (d.k === 'item') n++; w.drops.clear(); } return n; };
    const base = items(30), up = items(35), down = items(25);
    expect(up / base).toBeGreaterThan(1.3); expect(up / base).toBeLessThan(1.7); expect(down / base).toBeGreaterThan(0.15); expect(down / base).toBeLessThan(0.38);
  });
});
