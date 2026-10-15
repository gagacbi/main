/** Hızlı tempo ölçümü: Sv10'a kaç saatte varılır, ölüm/sa. Kullanım: npx tsx tests/sim/pace.ts */
import { makeRig, PlayBot } from './rig';
const out: string[] = [];
for (const seed of [11, 12, 13]) {
  const rig = makeRig(seed); const p = rig.add('gok', 'admin'); const b = new PlayBot(rig, p, { spec: 'kilic' });
  let i = 0; for (; i < 36000 * 4 && p.d.level < 10; i++) { b.step(); rig.tick(); }
  out.push(`seed${seed}: Sv${p.d.level} ${(i * 0.1 / 3600).toFixed(2)}sa ölüm=${p.d.counters.deaths}`);
}
console.log(out.join(' | '));
