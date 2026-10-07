/**
 * PvP eşleşme matrisi (sokak lambası avı): her yapı her yapıyla, iki yönde, birkaç tohumla düello eder.
 * Baskın (>%65) veya hiç kazanamayan (<%35) yapı, ya da "karşısı olmayan" yapı dengesizlik işaretidir.
 * Çıktı: docs/balans/pvp.json ve konsol özeti.   Çalıştır: npx tsx tests/sim/pvp.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeRig, type Rig } from './rig';
import { SKILLS, makeItem, type Boy, type DmgKind, type Ench, type Item, type Slot, type Spec } from '../../shared/game';
import { dist2 } from '../../shared/world';
import type { Player } from '../../server/world';

export interface Build { name: string; boy: Boy; spec: Spec; wk: DmgKind; ench: Partial<Record<Slot, Ench[]>> }
const E = (k: Ench['k'], v: number): Ench => ({ k, v });
/** Her yapı aynı bütçeyi harcar: parça başına en çok 3 efsun, temel efsun yok sayılır (yerine aşağıdaki kümeler konur). */
export const BUILDS: Build[] = [
  { name: 'Dengeli Kılıç', boy: 'gok', spec: 'kilic', wk: 'kilic', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('hpPct', 10), E('defPct', 10)], helmet: [E('hpPct', 10)], amulet: [E('atkPct', 9)] } },
  { name: 'Ağır Çift El', boy: 'gok', spec: 'kilic', wk: 'cift', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('pierce', 9)], armor: [E('hpPct', 10), E('defPct', 10)], helmet: [E('hpPct', 10)], amulet: [E('atkPct', 9)] } },
  { name: 'Hızlı Bıçak', boy: 'gok', spec: 'kilic', wk: 'bicak', ench: { weapon: [E('aspd', 8), E('crit', 5), E('atkPct', 9)], armor: [E('hpPct', 10), E('leech', 5)], helmet: [E('defPct', 10)], amulet: [E('crit', 5)] } },
  { name: 'Yay (Ay)', boy: 'ay', spec: 'kilic', wk: 'yay', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('hpPct', 10), E('defPct', 10)], helmet: [E('blockSkill', 9)], amulet: [E('atkPct', 9)] } },
  { name: 'Büyü Çanı (Ay)', boy: 'ay', spec: 'kilic', wk: 'buyu', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('pierce', 9)], armor: [E('hpPct', 10), E('defBuyu', 9)], helmet: [E('defBuyu', 9)], amulet: [E('atkPct', 9)] } },
  { name: 'Kalkan Alp (Yer)', boy: 'yer', spec: 'kalkan', wk: 'kilic', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('hpPct', 10), E('defPct', 10)], helmet: [E('hpPct', 10)], amulet: [E('leech', 5)] } },
  { name: 'Blok Kalesi (Yer)', boy: 'yer', spec: 'kalkan', wk: 'kilic', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('blockHit', 9), E('blockSkill', 9)], helmet: [E('blockHit', 9)], amulet: [E('blockHit', 9)] } },
  { name: 'Kılıç Savunmalı Kalkan', boy: 'yer', spec: 'kalkan', wk: 'kilic', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('defKilic', 9), E('defKilic', 9)], helmet: [E('defKilic', 9)], amulet: [E('leech', 5)] } },
  { name: 'Delici Kılıç (Gök)', boy: 'gok', spec: 'kilic', wk: 'kilic', ench: { weapon: [E('pierce', 9), E('pierce', 9), E('atkPct', 9)], armor: [E('hpPct', 10), E('defPct', 10)], helmet: [E('hpPct', 10)], amulet: [E('pierce', 9)] } },
  { name: 'Büyü Savunmalı (Ay)', boy: 'ay', spec: 'kalkan', wk: 'kilic', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('defBuyu', 9), E('defBuyu', 9)], helmet: [E('defBuyu', 9)], amulet: [E('leech', 5)] } },
  { name: 'Cam Top: Saf Saldırı', boy: 'gok', spec: 'kilic', wk: 'cift', ench: { weapon: [E('atkPct', 9), E('crit', 5), E('aspd', 8)], armor: [E('atkPct', 9), E('hpPct', 10)], helmet: [E('crit', 5)], amulet: [E('atkPct', 9)] } },
  { name: 'Emici: Can Çalma', boy: 'yer', spec: 'kilic', wk: 'kilic', ench: { weapon: [E('leech', 5), E('atkPct', 9), E('crit', 5)], armor: [E('leech', 5), E('hpPct', 10)], helmet: [E('leech', 5)], amulet: [E('leech', 5)] } },
];

export function makePlayer(rig: Rig, b: Build, L: number, up: number): Player {
  const p = rig.add(b.boy, 'player', (d) => { d.level = L; d.spec = b.spec; d.skillRanks = SKILLS.map((k) => (L >= k.lvl ? Math.min(6, 1 + Math.floor(L / 8)) : 1)); });
  for (const s of ['weapon', 'armor', 'helmet', 'amulet'] as Slot[]) {
    const it: Item = makeItem(() => 0.5, s, L, 2, s === 'weapon' ? b.wk : undefined); delete it.base; it.ench = [...(b.ench[s] ?? [])]; it.up = up; p.d.equip[s] = it;
  }
  rig.world.recalc(p); p.hp = p.stats.maxHp; return p;
}

/** Düello yapay zekâsı: menzile gir, dur, vur; alan becerilerini rakip menzildeyken kullan. */
function duelStep(rig: Rig, p: Player, q: Player) {
  const w = rig.world; const d = Math.sqrt(dist2(p, q)); const r = p.stats.range;
  if (d > r * 0.85) { const dx = q.x - p.x, dz = q.z - p.z; w.onInput(p, { x: dx / d, z: dz / d }); } else w.onInput(p, { x: 0, z: 0 });
  w.onAttack(p, { on: true, focus: q.id });
  const hpPct = p.hp / p.stats.maxHp;
  for (const i of [5, 1, 0, 4, 3]) {
    const sk = SKILLS[i]; if (p.d.level < sk.lvl || w.now < p.cds[i]) continue;
    const reach = sk.r * p.stats.aoe; if (sk.id === 'kalkan' ? hpPct < 0.6 : d <= reach) w.onSkill(p, i);
  }
}

export function duel(a: Build, b: Build, L: number, up: number, seed: number): { winner: 0 | 1 | 2; sec: number; hpLeft: number } {
  const rig = makeRig(seed, { spawnCamps: false }); const w = rig.world;
  const p = makePlayer(rig, a, L, up); const q = makePlayer(rig, b, L, up);
  p.x = 80; p.z = 0; q.x = 80 + 9; q.z = 0; p.duelWith = q.id; q.duelWith = p.id; // açık dünya: aynı boy da düello edebilsin
  let winner: 0 | 1 | 2 = 0;
  const end0 = w.endDuel.bind(w); w.endDuel = (x, win) => { if (win === p) winner = 1; else if (win === q) winner = 2; end0(x, win); };
  let t = 0; for (; t < 2400 && winner === 0; t++) { duelStep(rig, p, q); duelStep(rig, q, p); rig.tick(); if (p.deadUntil > 0 || q.deadUntil > 0) { winner = p.deadUntil > 0 ? 2 : 1; } }
  return { winner, sec: t / 10, hpLeft: winner === 1 ? p.hp / p.stats.maxHp : winner === 2 ? q.hp / q.stats.maxHp : 0 };
}

export function matrix(L: number, up: number, seeds = 3) {
  const n = BUILDS.length; const wins = Array.from({ length: n }, () => Array(n).fill(0)); const games = Array.from({ length: n }, () => Array(n).fill(0)); const secs: number[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let s = 0; s < seeds; s++) for (const flip of [false, true]) {
    const a = flip ? j : i, b = flip ? i : j; const r = duel(BUILDS[a], BUILDS[b], L, up, 100 + s * 7 + i * 13 + j);
    games[i][j]++; games[j][i]++; secs.push(r.sec);
    if (r.winner === 1) wins[a][b]++; else if (r.winner === 2) wins[b][a]++; else { wins[a][b] += 0.5; wins[b][a] += 0.5; }
  }
  const rows = BUILDS.map((b, i) => { let w = 0, g = 0; for (let j = 0; j < n; j++) if (j !== i) { w += wins[i][j]; g += games[i][j]; } return { name: b.name, winRate: Math.round((w / g) * 100) }; });
  const rate = BUILDS.map((_, i) => BUILDS.map((__, j) => (i === j ? null : Math.round((wins[i][j] / games[i][j]) * 100))));
  const hardCounter = BUILDS.map((b, i) => { const best = Math.max(...rate[i].map((x) => x ?? -1)); const worst = Math.min(...rate[i].map((x) => x ?? 101)); void best; return { name: b.name, worstMatchup: worst }; });
  return { L, up, rows, rate, avgSec: Math.round((secs.reduce((a, b) => a + b, 0) / secs.length) * 10) / 10, hardCounter };
}

if (process.argv[1]?.endsWith('pvp.ts')) {
  const out = { l20: matrix(20, 3), l40: matrix(40, 5) };
  mkdirSync('docs/balans', { recursive: true }); writeFileSync('docs/balans/pvp.json', JSON.stringify({ builds: BUILDS.map((b) => b.name), ...out }, null, 1));
  for (const m of [out.l20, out.l40]) { console.log(`\nSv${m.L} (+${m.up}) — ortalama düello ${m.avgSec} sn`); for (const r of [...m.rows].sort((a, b) => b.winRate - a.winRate)) console.log(`  ${r.name.padEnd(26)} %${r.winRate}`); }
}
