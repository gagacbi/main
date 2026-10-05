import { DEF_ENCH, ENCH_TABLE, FIELD_BOSS, GATE_DUNGEONS, HUB, makeItem, mobGold, mobXp, randomSlot, rollTier, gatePos, type MobType } from '../shared/game';
import { DUNGEONS, DUNGEON_EXIT_SEC, dungeonDay, type DungeonDef } from '../shared/dungeon';
import { DUNGEON_SLOTS, MAPS, regionAt, regionById, type MapId, type Region } from '../shared/maps';
import { irange } from '../shared/rng';
import { dist } from '../shared/world';
import { GameError } from './types';
import type { Player, World } from './world';

/** Parti toplama odası: ilk giren pencereyi açar, pencere bitince ya da parti dolunca başlar. */
export interface Lobby { d: MapId; ids: number[]; at: number }
export interface DungeonRun {
  id: number; d: MapId; def: DungeonDef; region: Region; startedAt: number; endAt: number; wave: number; state: 'gap' | 'wave' | 'boss' | 'won' | 'lost';
  gapUntil: number; mobs: Set<number>; members: number[]; n: number; exitAt: number; rewarded: boolean;
}
export interface DunState { day: number; n: Record<string, number>; clears: Record<string, number> }

export const dunState = (p: Player, now: number): DunState => {
  const day = dungeonDay(now); let s = p.d.dun; if (!s || s.day !== day) s = p.d.dun = { day, n: {}, clears: s?.clears ?? {} };
  return s;
};
export const dunLeft = (p: Player, def: DungeonDef, now: number) => Math.max(0, def.daily - (dunState(p, now).n[def.id] ?? 0));
const lobbyKey = (d: MapId) => d;

/** Erlik kampı kapısının yakınında mı */
const atGate = (p: Player) => { const g = regionAt(p.x, p.z); return !!g && g.id === 'erlik' && dist(p, gatePos('erlik')) <= HUB.interactGate + 2; };

export function dungeonRpc(w: World, p: Player, op: 'dungeon.enter' | 'dungeon.leave', a: Record<string, unknown>) {
  const now = w.now; const g = regionAt(p.x, p.z);
  if (op === 'dungeon.leave') {
    if (!g || MAPS[g.map].kind !== 'dungeon') { cancelLobby(w, p); return null; }
    w.alive(p); w.teleport(p, 'erlik'); return null;
  }
  w.alive(p);
  const id = String(a.d) as MapId; const def = DUNGEONS[id]; if (!def || !(GATE_DUNGEONS[g?.id ?? ''] ?? []).includes(id)) throw new GameError('bad_travel');
  const adm = p.role === 'admin';
  if (!atGate(p)) throw new GameError('too_far');
  if (!adm && p.d.level < def.minLv) throw new GameError('level_low', { lvl: def.minLv });
  if (now - p.lastCombat < 8000 && !adm) throw new GameError('in_combat');
  for (const l of w.lobbies.values()) if (l.ids.includes(p.id)) throw new GameError('dun_in_lobby');
  if (!adm && dunLeft(p, def, now) <= 0) throw new GameError('dun_daily');
  if (p.d.gold < def.fee) throw new GameError('no_gold');
  const solo = !!a.solo; if (w.lobbies.get(lobbyKey(id))?.ids.length! >= def.partyMax) throw new GameError('dun_party_full');
  let lobby = w.lobbies.get(lobbyKey(id));
  if (solo && lobby) throw new GameError('dun_lobby_open');
  p.d.gold -= def.fee; w.ledger(p, 'dungeon.fee', { d: id, fee: def.fee }); p.meDirty = true;
  if (!lobby) { lobby = { d: id, ids: [], at: now + (solo ? 0 : def.lobbySec * 1000) }; w.lobbies.set(lobbyKey(id), lobby); }
  lobby.ids.push(p.id);
  for (const q of w.players.values()) if (lobby.ids.includes(q.id)) q.meDirty = true;
  if (lobby.ids.length >= def.partyMax) lobby.at = now;
  return null;
}

export function cancelLobby(w: World, p: Player, refund = true) {
  for (const [k, l] of w.lobbies) {
    const i = l.ids.indexOf(p.id); if (i < 0) continue;
    l.ids.splice(i, 1); const def = DUNGEONS[l.d]!; if (refund) { p.d.gold += def.fee; w.ledger(p, 'dungeon.refund', { d: l.d }); }
    p.meDirty = true; if (!l.ids.length) w.lobbies.delete(k);
  }
}

export function updateDungeons(w: World, now: number) {
  // 1) lobiler: süre doldu ya da parti doldu → başlat
  for (const [k, l] of [...w.lobbies]) {
    if (now < l.at) continue; w.lobbies.delete(k); startRun(w, l);
  }
  // 2) çalışan zindanlar
  for (const r of [...w.dungeons.values()]) stepRun(w, r, now);
}

function playersIn(w: World, r: Region) { const out: Player[] = []; for (const p of w.players.values()) if (regionAt(p.x, p.z)?.id === r.id) out.push(p); return out; }

function startRun(w: World, l: Lobby) {
  const def = DUNGEONS[l.d]!; const now = w.now;
  const members: Player[] = []; const gate = gatePos('erlik');
  for (const id of l.ids) {
    const p = w.players.get(id); if (!p) continue;
    if (p.deadUntil > 0 || dist(p, gate) > 30 || regionAt(p.x, p.z)?.id !== 'erlik') { p.d.gold += def.fee; w.ledger(p, 'dungeon.refund', { d: l.d, why: 'absent' }); w.sys(p, 'sys.dun_cancel'); p.meDirty = true; continue; }
    members.push(p);
  }
  if (!members.length) return;
  let slot = -1; for (let s = 0; s < DUNGEON_SLOTS; s++) { if (![...w.dungeons.values()].some((r) => r.d === l.d && r.region.slot === s)) { slot = s; break; } }
  if (slot < 0) { for (const p of members) { p.d.gold += def.fee; w.ledger(p, 'dungeon.refund', { d: l.d, why: 'full' }); w.sys(p, 'sys.dun_full'); p.meDirty = true; } return; }
  const region = regionById(`${l.d}#${slot}`); const run: DungeonRun = { id: w.nid(), d: l.d, def, region, startedAt: now, endAt: now + def.limitSec * 1000, wave: -1, state: 'gap', gapUntil: now + 6000, mobs: new Set(), members: members.map((p) => p.id), n: members.length, exitAt: 0, rewarded: false };
  w.dungeons.set(run.id, run);
  members.forEach((p, i) => {
    const s = dunState(p, now); s.n[l.d] = (s.n[l.d] ?? 0) + 1;
    const a = (i / members.length) * Math.PI * 2; p.x = region.cx + Math.cos(a) * 4; p.z = region.cz + Math.sin(a) * 4; p.focus = 0; p.atk = false; p.dirx = p.dirz = 0; p.protectUntil = now + 6000; p.meDirty = true;
    w.ledger(p, 'dungeon.start', { d: l.d, n: members.length }); w.sys(p, 'sys.dun_start', { n: members.length });
  });
}

function spawnWave(w: World, r: DungeonRun, alive: Player[]) {
  const def = r.def; const rng = w.ctx.rng; const scale = (1 + def.hpPerExtra * (r.n - 1)) * def.hpMult;
  const cfg = def.waves[r.wave]; const c = r.region;
  for (let i = 0; i < cfg.n; i++) {
    const a = (i / cfg.n) * Math.PI * 2 + rng(); const d = 16 + rng() * 12; const type = cfg.types[Math.floor(rng() * cfg.types.length)] as MobType;
    const m = w.makeMob(type, def.lvl + irange(rng, -1, 1), c.cx + Math.cos(a) * d, c.cz + Math.sin(a) * d, -1, -1, scale);
    m.atk *= def.atkMult; m.hx = c.cx; m.hz = c.cz; m.leash = 80; m.dun = r.id; r.mobs.add(m.id); const t = alive[i % alive.length]; if (t) m.target = t.id;
  }
  r.state = 'wave'; for (const p of alive) { w.sys(p, 'sys.dun_wave', { n: r.wave + 1, of: def.waves.length }); p.meDirty = true; }
}
function spawnBoss(w: World, r: DungeonRun, alive: Player[]) {
  const c = r.region; const [lvl, , ] = FIELD_BOSS.list[r.def.bossId - 1];
  const m = w.spawnBoss({ id: r.def.bossId, level: lvl, kind: FIELD_BOSS.list[r.def.bossId - 1][1], nameKey: FIELD_BOSS.list[r.def.bossId - 1][2], x: c.cx, z: c.cz - 18, map: r.d });
  m.hx = c.cx; m.hz = c.cz; m.leash = 90; m.dun = r.id; r.mobs.add(m.id); r.state = 'boss';
  const base = m.baseHp ?? m.maxHp; m.baseHp = base; const sc = (1 + r.def.hpPerExtra * (r.n - 1)) * r.def.bossHpMult; m.atk *= r.def.atkMult; m.maxHp = Math.round(base * sc); m.hp = m.maxHp; m.baseHp = m.maxHp;
  const t = alive[0]; if (t) m.target = t.id;
  for (const p of alive) { w.sys(p, 'sys.dun_boss'); p.meDirty = true; }
}

function stepRun(w: World, r: DungeonRun, now: number) {
  const here = playersIn(w, r.region); const alive = here.filter((p) => p.deadUntil === 0);
  if (r.state === 'won' || r.state === 'lost') {
    if (now >= r.exitAt || !here.length) endRun(w, r, here);
    return;
  }
  if (now >= r.endAt) { for (const p of here) w.sys(p, 'sys.dun_timeout'); lose(w, r, now); return; }
  if (!alive.length) { if (!r.exitAt) r.exitAt = now + 4000; if (now >= r.exitAt) lose(w, r, now); return; } r.exitAt = 0;
  if (r.state === 'gap') {
    if (now < r.gapUntil) return;
    r.wave++; if (r.wave >= r.def.waves.length) spawnBoss(w, r, alive); else spawnWave(w, r, alive); return;
  }
  if (r.mobs.size === 0 && r.state === 'wave') {
    r.state = 'gap'; r.gapUntil = now + r.def.gapSec * 1000;
    for (const p of alive) { p.hp = Math.min(p.stats.maxHp, p.hp + Math.round(p.stats.maxHp * 0.25)); p.meDirty = true; }
  }
}
function lose(w: World, r: DungeonRun, now: number) {
  r.state = 'lost'; r.exitAt = now + 3000;
  for (const id of [...r.mobs]) { w.mobs.delete(id); } r.mobs.clear();
  for (const id of r.members) { const p = w.players.get(id); if (p) { w.sys(p, 'sys.dun_lost'); w.ledger(p, 'dungeon.lost', { d: r.d }); p.meDirty = true; } }
}
function endRun(w: World, r: DungeonRun, here: Player[]) {
  for (const id of [...r.mobs]) w.mobs.delete(id); r.mobs.clear();
  for (const p of here) { if (p.deadUntil > 0) continue; w.teleport(p, 'erlik'); }
  w.dungeons.delete(r.id);
}

/** Zindan bossu öldü: ödüller */
export function dungeonBossDown(w: World, m: { id: number; lvl: number; bossId: number; dun: number; contrib: Map<number, number>; x: number; z: number }) {
  const r = w.dungeons.get(m.dun); if (!r || r.rewarded) return; r.rewarded = true; r.state = 'won'; const now = w.now; r.exitAt = now + DUNGEON_EXIT_SEC * 1000;
  const def = r.def; const rng = w.ctx.rng; const kind = FIELD_BOSS.list[m.bossId - 1][1]; const total = [...m.contrib.values()].reduce((a, b) => a + b, 0) || 1;
  r.mobs.delete(m.id); w.mobs.delete(m.id);
  for (const id of r.members) {
    const p = w.players.get(id); if (!p || regionAt(p.x, p.z)?.id !== r.region.id) continue;
    const share = (m.contrib.get(id) ?? 0) / total; if (share < 0.05 && p.deadUntil > 0) continue;
    w.addXp(p, mobXp(m.lvl) * def.xpMult, false);
    const gold = Math.round(mobGold(m.lvl) * def.goldMult); for (let i = 0; i < 4; i++) w.spawnDrop(p, 'gold', m.x, m.z, { amount: Math.round(gold / 4) });
    const it = makeItem(rng, randomSlot(rng), m.lvl, rollTier(rng, 2, 1.0));
    const dk = DEF_ENCH[kind]; const [lo, hi] = ENCH_TABLE[dk]; if (!it.ench.some((e) => e.k === dk) && it.base?.k !== dk) { if (it.ench.length >= 3) it.ench.pop(); it.ench.push({ k: dk, v: Math.round((lo + (hi - lo) * (0.7 + rng() * 0.3)) * 10) / 10 }); }
    w.spawnDrop(p, 'item', m.x, m.z, { item: it, t: it.tier, m: it.slot });
    if (rng() < 0.5) { const it2 = makeItem(rng, randomSlot(rng), m.lvl, rollTier(rng, 1, 0.8)); w.spawnDrop(p, 'item', m.x, m.z, { item: it2, t: it2.tier, m: it2.slot }); }
    for (let i = 0; i < def.books; i++) w.spawnDrop(p, 'book', m.x, m.z);
    for (let i = 0; i < def.charms; i++) w.spawnDrop(p, 'charm', m.x, m.z);
    for (let i = 0; i < Math.min(8, def.frags); i++) w.spawnDrop(p, 'frag', m.x, m.z, { amount: Math.ceil(def.frags / 8) });
    w.spawnDrop(p, 'mat', m.x, m.z, { m: 'ore', amount: def.ore });
    const s = dunState(p, now); s.clears[def.id] = (s.clears[def.id] ?? 0) + 1;
    w.dungeonLoot(p, def.id);
    w.ledger(p, 'dungeon.reward', { d: def.id, tier: it.tier, gold }); w.sys(p, 'sys.dun_won', { s: DUNGEON_EXIT_SEC }); p.meDirty = true;
  }
}

/** Me için zindan bilgisi */
export function dunInfo(w: World, p: Player) {
  const now = w.now; const left: Record<string, number> = {}; for (const id of Object.keys(DUNGEONS) as MapId[]) left[id] = dunLeft(p, DUNGEONS[id]!, now);
  let lobby: { d: string; at: number; n: number } | null = null;
  for (const l of w.lobbies.values()) if (l.ids.includes(p.id)) lobby = { d: l.d, at: l.at, n: l.ids.length };
  let open: Record<string, { n: number; at: number }> | undefined;
  for (const l of w.lobbies.values()) { (open ??= {})[l.d] = { n: l.ids.length, at: l.at }; }
  let run: { d: string; wave: number; waves: number; state: string; endAt: number; exitAt: number } | null = null;
  const g = regionAt(p.x, p.z);
  if (g && MAPS[g.map].kind === 'dungeon') { const r = [...w.dungeons.values()].find((q) => q.region.id === g.id); if (r) run = { d: r.d, wave: Math.max(0, r.wave + 1), waves: r.def.waves.length, state: r.state, endAt: r.endAt, exitAt: r.exitAt }; }
  return { left, clears: dunState(p, now).clears, lobby, open: open ?? {}, run };
}
