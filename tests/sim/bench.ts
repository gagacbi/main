import { makeRig, PlayBot } from './rig';
const N = Number(process.env.N ?? 150);
const rig = makeRig(1);
const bots = Array.from({ length: N }, (_, i) => { const p = rig.add((['gok', 'yer', 'ay'] as const)[i % 3]); p.d.level = 1 + (i % 30); rig.world.recalc(p); return new PlayBot(rig, p, { spec: 'kilic' }); });
const t0 = performance.now(); const T = Number(process.env.T ?? 300);
for (let i = 0; i < T; i++) { for (const b of bots) b.step(); rig.tick(); }
const dt = (performance.now() - t0) / T; console.log(`N=${N}: tick+bot ${dt.toFixed(2)} ms; world tick avg ${(rig.world.tickMsSum / rig.world.tickMsN).toFixed(2)} ms`);
