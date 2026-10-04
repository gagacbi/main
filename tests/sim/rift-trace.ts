import { makeRig, PlayBot } from './rig';
import { refGear, refUp } from './analytic';
import { SKILLS, RIFT, type Boy, type Spec } from '../../shared/game';
const n = Number(process.env.N ?? 3), L = 20;
const rig = makeRig(40 + n, { spawnCamps: false });
const specs: Spec[] = ['kalkan', 'kilic', 'kilic', 'kalkan', 'kilic', 'kilic']; const boys: Boy[] = ['gok','gok','gok','gok','gok','gok'];
const r = rig.world.openRift()!;
const ps = [...Array(n)].map((_, i) => { const p = rig.add(boys[i], 'player', (d) => { d.level = L; d.equip = refGear(L, 1, refUp(L)); d.spec = specs[i]; d.skillRanks = SKILLS.map((k) => (L >= k.lvl ? Math.min(6, 1 + Math.floor(L / 8)) : 1)); }); p.x = r.x + i * 2; p.z = r.z + 3; return p; });
const bots = ps.map((p) => new PlayBot(rig, p, { spec: p.d.spec, anchor: { x: r.x, z: r.z } }));
let lastD = 0; let minHp = 1; const kp = rig.world.killPlayer.bind(rig.world); let tt = 0; rig.world.killPlayer = (pl, src) => { console.log(`  death t=${tt / 10} ${pl.name} by ${src && src.kind === 'mob' ? src.type : '?'} wave=${r.wave} state=${r.state}`); kp(pl, src); };
for (let t = 0; t < 3000; t++) { tt = t;
  for (const b of bots) b.step(); rig.tick();
  for (const p of ps) if (p.deadUntil === 0) minHp = Math.min(minHp, p.hp / p.stats.maxHp);
  const d = ps.reduce((a, p) => a + p.d.counters.deaths, 0);
  if (d !== lastD) { lastD = d; const alive = [...rig.world.mobs.values()].filter((m) => !m.dead); console.log(`t=${t / 10}s deaths=${d} rift state=${r.state} wave=${r.wave} mobsAlive=${alive.length} types=${[...new Set(alive.map((m) => m.type))]} hp=${ps.map((p) => Math.round(p.hp / p.stats.maxHp * 100))}`); }
  if (r.state === 3) { console.log('closed at', t / 10, 'minHp%', Math.round(minHp * 100)); break; }
}
