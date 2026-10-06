import { describe, expect, test } from 'vitest';
import { COMBO, SKILLS, comboFollows } from '../../shared/game';
import { makeRig } from '../sim/rig';

const slot = (id: string) => SKILLS.findIndex((s) => s.id === id);
function setup() {
  const rig = makeRig(21, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 20; w.recalc(p); p.hp = p.stats.maxHp; p.x = 0; p.z = 130;
  const mob = () => { const m = w.makeMob('tepegoz', 5, p.x + 2, p.z, -1); m.dummy = true; m.maxHp = m.hp = 1e9; m.nextAtk = Infinity; return m; };
  return { rig, w, p, mob };
}
describe('skill zinciri (combo)', () => {
  test('zincir kuralları: Nara→Sarsıntı→Savurma→Zehir→Hiddet geçerli; Hiddet zinciri bitirir; rastgele sıra bonus vermez', () => {
    const o = ['nara', 'sarsinti', 'savurma', 'zehir', 'hiddet'].map(slot);
    for (let i = 0; i < o.length - 1; i++) expect(comboFollows(o[i], o[i + 1])).toBe(true);
    expect(comboFollows(slot('hiddet'), slot('savurma'))).toBe(false); expect(comboFollows(slot('savurma'), slot('nara'))).toBe(false); expect(comboFollows(-1, slot('savurma'))).toBe(false);
  });
  test('devam eden skill daha çok hasar verir ve beklemesi iade edilir; pencere dolunca zincir kopar', () => {
    const { rig, w, p, mob } = setup(); const m = mob();
    const dmgOf = (id: string) => { w.dummyLog.length = 0; w.onSkill(p, slot(id)); return w.dummyLog.reduce((a, x) => a + x.v, 0); };   // antrenman mankeni canını kaybetmez; hasar günlüğe yazılır
    const base = dmgOf('savurma'); // zincirsiz referans
    p.cds.fill(0); p.comboSlot = -1; p.comboUntil = 0;
    w.onSkill(p, slot('sarsinti')); expect(p.comboLinks).toBe(0); // ilk skill halka sayılmaz
    const t0 = w.now; const chained = dmgOf('savurma');
    expect(p.comboLinks).toBe(1); expect(chained).toBeGreaterThan(base * (1 + COMBO.bonusPerLink) * 0.85);
    expect(p.cds[slot('savurma')] - t0).toBeLessThanOrEqual(SKILLS[slot('savurma')].cd * 1000 * (1 - COMBO.cdRefund) + 5);
    rig.seconds(COMBO.windowSec + 1); p.cds.fill(0); w.onSkill(p, slot('zehir')); expect(p.comboLinks).toBe(0);   // pencere doldu → zincir yok
  });
  test('uzun zincir sınırlıdır ve Tengri Hiddeti zinciri sıfırlar; Me durumunda görünür', () => {
    const { w, p, mob } = setup(); mob(); p.d.level = 50; w.recalc(p);
    for (const id of ['nara', 'sarsinti', 'savurma', 'zehir']) { p.cds.fill(0); w.onSkill(p, slot(id)); }
    expect(p.comboLinks).toBe(3); expect(p.comboLinks).toBeLessThanOrEqual(COMBO.maxLinks);
    p.cds.fill(0); w.onSkill(p, slot('hiddet')); expect(p.comboSlot).toBe(-1); expect(p.comboLinks).toBe(0);
  });
});
