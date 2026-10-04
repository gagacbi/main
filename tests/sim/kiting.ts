import { makeRig, PlayBot, DT } from './rig';
import { refGear, refUp } from './analytic';
import { SKILLS, makeItem, type DmgKind } from '../../shared/game';
import { dist2 } from '../../shared/world';
const L = 20;
function run(wk: DmgKind, kite: boolean) {
  const rig = makeRig(3, { spawnCamps: true }); const p = rig.add('gok', 'player', (d) => { d.level = L; d.equip = refGear(L, 1, refUp(L)); d.equip.weapon = (() => { const it = makeItem(() => 0.5, 'weapon', L, 1, wk); delete it.base; it.ench = []; it.up = refUp(L); return it; })(); d.spec = 'kilic'; d.skillRanks = SKILLS.map((k) => (L >= k.lvl ? 3 : 1)); });
  rig.world.recalc(p);
  const b = new PlayBot(rig, p, { spec: 'kilic', safeUp: 0, riskUp: 0 });
  const w = rig.world;
  const step0 = b.step.bind(b);
  if (kite) b.step = function () {
    step0();
    // kaçma: en yakın yaratık 4 birimden yakınsa ondan uzaklaş (vurmaya devam eder)
    let near = null as null | { x: number; z: number }; let bd = 16; for (const m of w.mobs.values()) { if (m.dead) continue; const d = dist2(p, m); if (d < bd) { bd = d; near = m; } }
    if (near && p.stats.range > 6) { const dx = p.x - near.x, dz = p.z - near.z; const l = Math.hypot(dx, dz) || 1; w.onInput(p, { x: dx / l, z: dz / l }); }
  };
  const h = 1; for (let i = 0; i < h * 36000; i++) { b.step(); rig.tick(); }
  const c = p.d.counters; return `${wk.padEnd(5)} kite=${kite} kills/h=${c.kills} deaths=${c.deaths} dmgTaken/kill=${(b.st.dmgTaken / Math.max(1, c.kills)).toFixed(1)}`;
}
for (const wk of ['kilic', 'cift', 'bicak', 'yay', 'buyu'] as DmgKind[]) for (const kite of [false, true]) console.log(run(wk, kite));
