import { makeRig, PlayBot } from './rig';
const hours = Number(process.env.H ?? 1);
const rig = makeRig(3);
const p = rig.add('gok', 'admin');
const b = new PlayBot(rig, p, { spec: 'kilic' });
const t0 = Date.now();
const n = Math.round(hours * 3600 / 0.1);
for (let i = 0; i < n; i++) { b.step(); rig.tick(); }
console.log('wall s', (Date.now() - t0) / 1000, 'level', p.d.level, 'kills', b.st.kills, p.d.counters.kills, 'deaths', b.st.deaths, 'gold', p.d.gold, JSON.stringify(b.st.levelAt), JSON.stringify(b.st.upgrades));
