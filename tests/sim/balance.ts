/**
 * KUT hızlandırılmış denge simülasyonu.  Çalıştır:  npm run sim            (tam, ~20 dk)
 *                                                    SIM_QUICK=1 npm run sim (hızlı, ~2 dk; testlerde kullanılır)
 * Çıktı: docs/balans/sonuc.json  (BALANS_RAPORU bu veriden üretilir: scripts/make-balance-report.ts)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeRig, PlayBot, type Rig } from './rig';
import { duel, killsToLevel, mobAvg, refGear, refStats, refUp, upgradeEV } from './analytic';
import {
  BOY_BONUS, MOBS, POISON_DOT, PVP_COEF, RIFT, SKILLS, SPEC_MODS, UPGRADE_RATE, MAX_LEVEL, computeStats, hitDamage, itemStats, kutBonusPct, mobGold, mobXp, restedCap, skillRankMult, upgradeCost, xpToNext, defReduction, makeItem,
  type Boy, type Spec,
} from '../../shared/game';
import { INSCRIPTIONS } from '../../shared/game';
import type { Player } from '../../server/world';
import { genBosses } from '../../shared/world';
import { BUILDS, matrix } from './pvp';

const QUICK = process.env.SIM_QUICK === '1';
const OUT = 'docs/balans'; mkdirSync(OUT, { recursive: true });
const R: Record<string, unknown> = { quick: QUICK, at: new Date().toISOString() };
const log = (s: string) => console.log(s);
const f1 = (x: number) => Math.round(x * 10) / 10;

// ───────── A. Çözümsel ─────────
const LV = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
R.duel = LV.map((L) => { const a = duel(L); const b = duel(L, L + 5); const c = duel(L, L - 5 < 1 ? 1 : L - 5); return { L, atk: a.s.atk, def: a.s.def, hp: a.s.maxHp, ttk: f1(a.ttk), takenPct: f1(a.takenPct), pack4DieSec: f1(a.dieSecVs(4)), plus5Ttk: f1(b.ttk), plus5TakenPct: f1(b.takenPct), minus5TakenPct: f1(c.takenPct), killsToLevel: killsToLevel(L), xpNext: xpToNext(L) }; });

// güç eğrisi: çıplak / referans / +9 efsanevi (aynı seviyede)
R.power = LV.map((L) => {
  const naked = computeStats({ level: L, boy: 'gok', spec: 'none', equip: {}, kut: 0 });
  const ref = refStats(L); const top = refStats(L, 'gok', 'none', 3, 9);
  const dps = (s: typeof naked) => { const m = mobAvg(L); return (hitDamage(s.atk, 1, m.def, false, false) * (1 + (s.crit / 100) * (s.critMult - 1))) / s.atkInterval; };
  return { L, nakedDps: Math.round(dps(naked)), refDps: Math.round(dps(ref)), topDps: Math.round(dps(top)), nakedHp: naked.maxHp, refHp: ref.maxHp, topHp: top.maxHp, topOverRef: f1(dps(top) / dps(ref)), refOverNaked: f1(dps(ref) / dps(naked)) };
});

// boy / uzmanlık: aynı referans yapı, DPS ve dayanıklılık (EHP = can / (1-azalma)/dmgTaken)
R.boySpec = (['gok', 'yer', 'ay'] as Boy[]).flatMap((boy) => (['none', 'kalkan', 'kilic'] as Spec[]).map((spec) => {
  const L = 30; const s = refStats(L, boy, spec); const m = mobAvg(L);
  const dps = (hitDamage(s.atk, 1, m.def, false, false) * (1 + (s.crit / 100) * (s.critMult - 1))) / s.atkInterval;
  const mobHit = hitDamage(m.atk, 1, s.def, false, false) * s.dmgTaken; const ehp = s.maxHp / (mobHit / Math.max(1, m.atk));
  return { boy, spec, dps: Math.round(dps), hp: s.maxHp, def: s.def, ehp: Math.round(ehp), moveSpeed: f1(s.moveSpeed), heal: s.heal, spell: s.spell, aoe: s.aoe, shield: s.shieldMult };
}));

// yetenek verimliliği: 5'li sürüye karşı (aynı seviye), 30 sn'lik rotasyon
R.skills = [10, 20, 30, 40].map((L) => {
  const s = refStats(L, 'gok', 'kilic'); const m = mobAvg(L); const per = (mult: number) => hitDamage(s.atk, mult, m.def, false, false) * (1 + (s.crit / 100) * (s.critMult - 1));
  const basic = per(1) / s.atkInterval; const rank = skillRankMult(Math.min(6, 1 + Math.floor(L / 8)));
  const rows = SKILLS.filter((k) => k.lvl <= L).map((k) => {
    const dot = k.status?.poison ? s.atk * POISON_DOT * rank * s.spell * k.status.poison : 0; // zehir savunmayı yok sayar
    const dmg = (per(k.mult * s.spell * rank) + dot) * (k.mult > 0 || dot > 0 ? 5 : 0); // 5 hedefi vurduğu varsayımı
    return { id: k.id, cd: k.cd, mult: k.mult, aoeDmgPer30s: Math.round(dmg * (30 / k.cd)), vsBasic: f1((dmg * (30 / k.cd)) / (basic * 30)) };
  });
  return { L, basicDps: Math.round(basic), rows, rotation5: Math.round(rows.reduce((a, r) => a + r.aoeDmgPer30s, 0) / 30 + basic) };
});

// PvP: 12 yapı × 12 yapı düello matrisi (tests/sim/pvp.ts); hızlı kipte tek seviye
log('[0] PvP eşleşme matrisi…');
R.pvpMatrix = { builds: BUILDS.map((b) => b.name), runs: (QUICK ? [[30, 4]] : [[20, 3], [30, 4], [40, 5], [50, 6]]).map(([L, u]) => matrix(L, u, QUICK ? 2 : 3)) };

// artı basma beklenen maliyeti (Markov), ilvl 20 ve 40
R.upgradeEV = [20, 40].flatMap((il) => [['düz', {}], ['kitap', { book: true }], ['tılsım', { charm: true }], ['kitap+tılsım', { book: true, charm: true }]].flatMap(([name, pol]) => [4, 7, 9].map((stop) => { const e = upgradeEV(il, { ...(pol as object), stopAt: stop }); return { ilvl: il, policy: name, stopAt: stop, tries: f1(e.tries), gold: Math.round(e.gold), ore: Math.round(e.ore), books: f1(e.books), charms: f1(e.charms), lostItems: f1(e.items) }; })));
R.upgradeRates = UPGRADE_RATE;

// ───────── B. Bot simülasyonları ─────────
function prog(boy: Boy, spec: Spec, hours: number, o: { offset?: number; seed?: number; stopAtLevel?: number; safeUp?: number } = {}) {
  const rig = makeRig(o.seed ?? 11); const p = rig.add(boy, 'admin'); const b = new PlayBot(rig, p, { spec, offset: o.offset ?? 0, safeUp: o.safeUp });
  const n = Math.round((hours * 3600) / 0.1); let i = 0; const t0 = Date.now();
  for (; i < n; i++) { b.step(); rig.tick(); if (o.stopAtLevel && p.d.level >= o.stopAtLevel) break; }
  const simH = (i * 0.1) / 3600; const c = p.d.counters;
  return { boy, spec, offset: o.offset ?? 0, simHours: f1(simH * 100) / 100, wallS: f1((Date.now() - t0) / 1000), level: p.d.level, kills: c.kills, deaths: c.deaths, killsPerH: Math.round(c.kills / simH), deathsPerH: f1(c.deaths / simH), gold: p.d.gold, levelAt: b.st.levelAt, killsAt: b.st.killsAt, goldAt: b.st.goldAt, dmgAt: b.st.dmgAt, dmgTaken: Math.round(b.st.dmgTaken), upgrades: b.st.upgrades, destroyed: c.destroyed, trips: b.st.trips, hpPerKillPct: f1((b.st.dmgTaken / Math.max(1, c.kills)) / Math.max(1, p.stats.maxHp) * 100) };
}

const fullH = QUICK ? 3 : Number(process.env.SIM_HOURS ?? 140);
log(`[1/5] ilerleme eğrisi (Gök, Kılıç; ${fullH} sa'e kadar ya da Sv50)…`);
R.progression = prog('gok', 'kilic', fullH, { stopAtLevel: MAX_LEVEL });
log(`   Sv${(R.progression as { level: number }).level}, ${(R.progression as { wallS: number }).wallS} sn`);

const varH = QUICK ? 1.5 : 5;
log(`[2/5] boy × uzmanlık (${varH} sa)…`);
R.variants = (['gok', 'yer', 'ay'] as Boy[]).flatMap((b) => (['kalkan', 'kilic'] as Spec[]).map((s) => { const r = prog(b, s, varH, { seed: 21 }); return { boy: b, spec: s, level: r.level, killsPerH: r.killsPerH, deathsPerH: r.deathsPerH, hpPerKillPct: r.hpPerKillPct, t10: r.levelAt[10] ?? null, t15: r.levelAt[15] ?? null }; }));

function addRef(rig: Rig, boy: Boy, L: number, spec: Spec, tier = 1 as 0 | 1 | 2 | 3, up = refUp(L)): Player {
  return rig.add(boy, 'player', (d) => { d.level = L; d.equip = refGear(L, tier, up); d.spec = L >= 10 ? spec : 'none'; d.skillRanks = SKILLS.map((k) => (L >= k.lvl ? Math.min(6, 1 + Math.floor(L / 8)) : 1)); });
}
log('[3/5] risk/ödül: hedef kamp seviyesi ofseti (Sv20, referans yapı)…');
const totalXp = (p: Player) => { let x = p.d.xp; for (let l = 1; l < p.d.level; l++) x += xpToNext(l); return x; };
R.offsets = [-3, -1, 0, 1, 2, 4].map((off) => {
  const rig = makeRig(31); const L = 20; const p = addRef(rig, 'gok', L, 'kilic'); const b = new PlayBot(rig, p, { spec: 'kilic', offset: off, safeUp: 0, riskUp: 0 });
  const h = QUICK ? 0.5 : 1.5; const x0 = totalXp(p); const n = Math.round((h * 3600) / 0.1);
  for (let i = 0; i < n; i++) { b.step(); rig.tick(); }
  const c = p.d.counters; return { offset: off, killsPerH: Math.round(c.kills / h), deathsPerH: f1(c.deaths / h), hpPerKillPct: f1((b.st.dmgTaken / Math.max(1, c.kills)) / p.stats.maxHp * 100), xpPerH: Math.round((totalXp(p) - x0) / h), xpPerHPctOfLevel: f1(((totalXp(p) - x0) / h / xpToNext(L)) * 100) };
});

// çatlak: parti büyüklüğüne göre temizleme süresi (referans yapı, Sv20 ve Sv40)
function riftRun(n: number, L: number, seed: number) {
  const rig = makeRig(seed, { spawnCamps: false }); const ps: Player[] = []; const specs: Spec[] = ['kalkan', 'kilic', 'kilic', 'kalkan', 'kilic', 'kilic'];
  const boys: Boy[] = ['gok', 'gok', 'gok', 'gok', 'gok', 'gok']; // aynı boy: karşı boyun AoE'si zaten dost ateşi (PvP) olur
  const r = rig.world.openRift()!; r.openedAt = rig.clock.now();
  for (let i = 0; i < n; i++) { const p = addRef(rig, boys[i], L, specs[i]); p.x = r.x + (i - n / 2) * 2; p.z = r.z + 3; ps.push(p); }
  const bots = ps.map((p) => new PlayBot(rig, p, { spec: p.d.spec, anchor: { x: r.x, z: r.z } }));
  let t = 0; let state = 'zaman aşımı'; let minHp = 1;
  for (; t < RIFT.lifeSec * 10; t++) { for (const b of bots) b.step(); rig.tick(); for (const p of ps) if (p.deadUntil === 0) minHp = Math.min(minHp, p.hp / p.stats.maxHp); if (r.state === 3) { state = 'kapandı'; break; } if (!rig.world.rifts.has(r.id)) { state = 'başarısız'; break; } }
  return { players: n, L, state, clearSec: f1(t / 10), deaths: ps.reduce((a, p) => a + p.d.counters.deaths, 0), minHpPct: Math.round(minHp * 100), rewardXpPct: f1((mobXp(r.lvl) * RIFT.rewardXpMult) / xpToNext(L) * 100) };
}
log('[4/5] Erlik çatlağı: parti büyüklüğü…');
R.rift = [20, 40].flatMap((L) => [1, 2, 3, 4, 6].map((n) => riftRun(n, L, 40 + n)));

// saha bosları: referans yapı, boss seviyesinde, 1/2/4 kişi
function bossRun(idx: number, n: number, seed: number) {
  const rig = makeRig(seed, { spawnCamps: false }); const def = genBosses()[idx]; const boss = rig.world.spawnBoss(def); const L = def.level;
  const ps: Player[] = []; for (let i = 0; i < n; i++) { const p = addRef(rig, 'gok', L, i % 2 ? 'kalkan' : 'kilic'); p.x = boss.x - 6; p.z = boss.z + i * 1.5; ps.push(p); }
  const bots = ps.map((p) => new PlayBot(rig, p, { spec: p.d.spec, anchor: { x: boss.x, z: boss.z } }));
  let t = 0; let minHp = 1;
  for (; t < 3000 * 10; t++) { for (const b of bots) b.step(); rig.tick(); for (const p of ps) if (p.deadUntil === 0) minHp = Math.min(minHp, p.hp / p.stats.maxHp); if (boss.dead) break; }
  return { boss: def.id, level: L, players: n, killed: boss.dead, sec: f1(t / 10), deaths: ps.reduce((a, p) => a + p.d.counters.deaths, 0), minHpPct: Math.round(minHp * 100) };
}
log('[4b] saha bosları…');
R.bosses = [0, 1, 2, 3, 4].flatMap((i) => [1, 2, 4].map((n) => bossRun(i, n, 70 + i * 5 + n)));

// yönetici hesabıyla uç durum: Sv50 + efsanevi +9 (gm kit) 1 saat kamp-48, ve çıplak Sv50
log('[5/5] yönetici hesabıyla uç durumlar…');
function adminRun(kit: boolean, L: number, hours: number) {
  const rig = makeRig(51); const p = rig.add('gok', 'admin'); rig.gm(p, `level ${L}`); if (kit) rig.gm(p, 'kit +9'); rig.gm(p, 'maxskills'); rig.world.rpcRun(p, 'spec', { choice: 'kilic' }); rig.gm(p, 'heal');
  const b = new PlayBot(rig, p, { spec: 'kilic', offset: 0 }); const n = Math.round((hours * 3600) / 0.1);
  for (let i = 0; i < n; i++) { b.step(); rig.tick(); }
  const c = p.d.counters; return { L, kit, hours, kills: c.kills, killsPerH: Math.round(c.kills / hours), deaths: c.deaths, hpPerKillPct: f1((b.st.dmgTaken / Math.max(1, c.kills)) / p.stats.maxHp * 100), atk: p.stats.atk, hp: p.stats.maxHp };
}
R.admin = [adminRun(false, 50, QUICK ? 0.5 : 1), adminRun(true, 50, QUICK ? 0.5 : 1), adminRun(true, 30, QUICK ? 0.5 : 1)];

// ekonomi: seviye başına altın/saat ve +9 (tılsımlı) maliyetinin kaç saatlik kazanç olduğu
const prg = R.progression as ReturnType<typeof prog>;
R.economy = [10, 20, 30, 40, 48].filter((L) => prg.levelAt[L] && prg.levelAt[L + 1]).map((L) => {
  const dt = (prg.levelAt[L + 1] - prg.levelAt[L]) / 3600; const goldH = Math.round(((prg.goldAt[L + 1] - prg.goldAt[L]) / dt));
  const ev = upgradeEV(L, { charm: true, stopAt: 9 }); return { L, goldPerH: goldH, killsPerH: Math.round((prg.killsAt[L + 1] - prg.killsAt[L]) / dt), plus9CharmGold: Math.round(ev.gold), plus9Hours: f1(ev.gold / Math.max(1, goldH)) };
});
R.constants = { PVP_COEF, RIFT, SPEC_MODS, BOY_BONUS, KUT: { x25: kutBonusPct(50) }, INSCRIPTIONS, restedCap10: restedCap(10) };
void MOBS; void itemStats; void mobGold; void upgradeCost; void defReduction; void makeItem;

writeFileSync(`${OUT}/sonuc${QUICK ? '.hizli' : ''}.json`, JSON.stringify(R, null, 1));
log(`yazıldı: ${OUT}/sonuc${QUICK ? '.hizli' : ''}.json`);
