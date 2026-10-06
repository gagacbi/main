/**
 * Nüfus simülasyonunu koşturur ve ham veriyi yazar.
 *   POP_N=150 POP_DAYS=14 POP_W=10 POP_SEED=7 npx tsx tests/sim/population/run.ts
 * Ardından raporlar için: npx tsx tests/sim/population/report.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Engine } from './engine';
import { ECON, KIMIZ, PVP_FLAG } from '../../../shared/game';
if (process.env.POP_BONUS) PVP_FLAG.bonus = Number(process.env.POP_BONUS);   // A/B: bayrak bonusu
if (process.env.POP_NPC_SELL) ECON.npcSell = Number(process.env.POP_NPC_SELL);   // kaynak tarafı deneyleri
if (process.env.POP_MOB_GOLD) ECON.mobGold = Number(process.env.POP_MOB_GOLD);
if (process.env.POP_KIMIZ_PRICE) KIMIZ.priceUnits = Number(process.env.POP_KIMIZ_PRICE);   // kımız fiyatı (seviye birimi katı)

const N = Number(process.env.POP_N ?? 150), DAYS = Number(process.env.POP_DAYS ?? 14), W = Number(process.env.POP_W ?? 10), SEED = Number(process.env.POP_SEED ?? 7);
const OUT = process.env.POP_OUT ?? 'docs/balans/populasyon'; mkdirSync(OUT, { recursive: true });
const eng = new Engine(SEED, N, W); const t0 = Date.now();
console.log(`nüfus=${N} gün=${DAYS} dilim=${W}dk tohum=${SEED}`);
for (let d = 1; d <= DAYS; d++) {
  const t = Date.now(); eng.runDay();
  const lv = eng.agents.map((a) => a.days[a.days.length - 1].level); const e = eng.econ[eng.econ.length - 1];
  console.log(`gün ${d}: ${((Date.now() - t) / 1000).toFixed(0)} sn · ort. seviye ${(lv.reduce((s, x) => s + x, 0) / lv.length).toFixed(1)} · akçe arzı ${Math.round(e.supply / 1000)}k · pazar satış ${e.mkt.sales} (${Math.round(e.mkt.volume / 1000)}k)`);
}
const agents = eng.agents.map((a) => ({
  name: a.name, idx: a.idx, arch: a.arch.key, archName: a.arch.name, boy: a.boy, par: a.par, seedLevel: a.seedLevel, days: a.days, events: a.events, tot: a.tot, dmgByKind: a.dmgByKind, deathBy: a.deathBy,
  actTicks: a.actTicks, ext: a.ext, mapTicks: a.mapTicks, maxFailStreak: a.maxFailStreak, frustration: a.frustration, farmMin: a.farmMin, def: Object.fromEntries(Object.entries(JSON.parse(eng.rig.db.playerById(a.dbId)!.data).equip ?? {}).map(([s, it]: [string, any]) => [s, it])),
  final: (() => { const d = JSON.parse(eng.rig.db.playerById(a.dbId)!.data); return { pvp: !!d.pvp, cos: d.cos ? { crafted: d.cos.crafted, worn: d.cos.worn ? { tier: d.cos.worn.tier, look: d.cos.worn.look, lines: d.cos.worn.ench.length, exp: d.cos.worn.expiresAt } : null, bag: d.cos.bag.length, mats: d.cos.mats, luck: d.cos.luck } : null, dun: d.dun?.clears ?? {}, level: d.level, gold: d.gold, spec: d.spec, rank: d.rank, kut: d.kut, clues: d.clues?.length ?? 0, dreams: d.dreams, items: d.items.length, bag: d.bag, counters: d.counters, skillRanks: d.skillRanks }; })(),
}));
writeFileSync(`${OUT}/ham.json`, JSON.stringify({ meta: { N, DAYS, W, SEED, wallSec: Math.round((Date.now() - t0) / 1000) }, agents, econ: eng.econ, slices: eng.sliceLogs, bossFights: eng.bossFights, dunLog: eng.dunLog, dunDeaths: eng.dunDeaths, pvpLog: eng.pvpLog, stats: eng.stats }));
console.log(`bitti: ${Math.round((Date.now() - t0) / 1000)} sn → ${OUT}/ham.json`);
