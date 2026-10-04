import { duel, killsToLevel, mobAvg } from './analytic';
console.log('L  atk  def   hp   | TTK(s) dmg%/kill  pack4 dieSec | +5 mob TTK dmg% | kills/lvl');
for (const L of [1, 3, 5, 8, 10, 15, 20, 25, 30, 40, 50]) {
  const a = duel(L); const b = duel(L, L + 5);
  console.log(String(L).padStart(2), String(a.s.atk).padStart(4), String(a.s.def).padStart(4), String(a.s.maxHp).padStart(5), '|', a.ttk.toFixed(1).padStart(5), a.takenPct.toFixed(1).padStart(6) + '%', a.dieSecVs(4).toFixed(0).padStart(6), '|', b.ttk.toFixed(1).padStart(5), b.takenPct.toFixed(1).padStart(6) + '%', '|', killsToLevel(L));
}
