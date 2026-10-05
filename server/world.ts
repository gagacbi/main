import {
  AOI_R, BAG_SIZE, BOOK_BONUS, COMBAT_FLAG_SEC, DEATH_XP_LOSS, RESPAWN_PROTECT_MS, deathXpLoss, HUB, KUT_PER_POINT, MAX_LEVEL, MOBS, MOB_RESPAWN, RANK_RECOVER_KILLS,
  RESPAWN_SEC, RESTED_XP_MULT, RIFT, SKILLS, SKILL_MAX_RANK, SPEC_LEVEL, SPEC_MODS, TICK_HZ, TIER_MULT, TUTORIAL_REWARD, TUTORIAL_STEPS, TUTORIAL_TARGET,
  UPGRADE_DESTROYS_FROM, UPGRADE_RATE, INSCRIPTIONS, BOY_ID, BAD_WORDS, RATE,
  CRAFT, POISON_DOT, lvlDiffIn, lvlDiffOut, applyDefense, rerollCost, BASE_ENCH_POOL, ENCH_KEYS, campRespawnMult, pvpGapMult, vendorPrice, SHIELD_ABSORB, RANGED_MIN_RANGE, FIELD_BOSS, MILESTONE_LEVELS, milestoneGift, DEF_ENCH, ENCH_TABLE, campTypes, computeStats, hitDamage, makeItem, mobAtk, mobDef, mobGold, mobHp, mobXp, randomSlot, restedCap, restedGain, rollTier,
  skillRankGold, skillRankMult, upgradeCost, xpToNext, zoneAt,
  type Boy, type DmgKind, type EnchKey, type Item, type MatKey, type MobType, type Slot, type Spec, type Stats, type StatusKey, } from '../shared/game';
import { F, STATUS_FLAG, type ChatMsg, type GameEvent, type Me, type RpcOp, type RpcRes, type SnapDrop, type Snapshot } from '../shared/protocol';
import { GATE_LINKS, PVP_FLAG, gatePos } from '../shared/game';
import { MAPS, type MapId, regionAt, regionById, isDungeonRegion } from '../shared/maps';
import { dist, dist2, genBosses, genAllCamps, genStones, stepMove, type BossDef, type Camp } from '../shared/world';
import { CLUE_GOLD, DREAM_MIN_HOURS, ELDER_LEVELS, SHARD_AT, STONE_LAST_NEEDS, STONE_REWARD_GOLD, THREAD_SIZE, titlesOf, truthUnlocked } from '../shared/lore';
import { runGm } from './gm';
import { cosOf, costumeRpc, tickCostumes } from './costume';
import { costumeCode, costumeLines } from '../shared/costume';
import { cancelLobby, dungeonBossDown, dungeonRpc, dunInfo, updateDungeons, type DungeonRun, type Lobby } from './dungeon';
import { claimMail, marketRpc } from './market';
import { irange, range } from '../shared/rng';
import * as oba from './oba';
import { GameError, type Ctx, type PlayerData } from './types';
import type { PlayerRow } from './db';

type StatusMap = Partial<Record<StatusKey, { until: number; dps?: number; by?: number; absorb?: number }>>;

export class Player {
  kind = 'player' as const;
  x = 0; z = 0; rot = 0; dirx = 0; dirz = 0; lastInput = 0; atk = false; focus = 0; nextAtk = 0;
  cds = [0, 0, 0, 0, 0, 0]; status: StatusMap = {}; stats!: Stats; hp = 1; deadUntil = 0;
  cosWarnAt = 0; lastCombat = 0; lastAggro = 0; lastPvpAgg = 0; lastPvp = 0; aggressorUntil = 0; protectUntil = 0; lastDamager = 0; tauntUntil = 0;
  duelWith = 0; duelInvite: { from: number; at: number } | null = null;
  meDirty = true; lastMeAt = 0; lastAck = 0; poisonAcc = 0; regenAcc = 0; goldFromMobs = 0;
  rate = { msgs: 0, rpcs: 0, chat: 0, win: 0 }; dropped = 0; lastRegenAt = 0;
  role: 'player' | 'admin' = 'player'; god = false;
  constructor(
    public id: number, public dbId: number, public name: string, public boy: Boy, public d: PlayerData, public oymakId: number, public points: number,
    public send: (type: string, payload: unknown) => void, public kick: (reason: string) => void,
  ) {}
  get level() { return this.d.level; }
}

export interface Mob {
  kind: 'mob'; id: number; type: MobType; lvl: number; x: number; z: number; rot: number; hp: number; maxHp: number; atk: number; def: number;
  hx: number; hz: number; campId: number; riftId: number; target: number; nextAtk: number; wanderAt: number; wx: number; wz: number;
  status: StatusMap; contrib: Map<number, number>; dead: boolean; respawnAt: number; leash: number; poisonAcc: number; tauntUntil: number; tauntBy: number;
  lastSwing: number; dummy?: boolean;
  /** saha bossu kimliği (1–5); 0 = değil */
  bossId: number; slamAt: number; slamHitAt: number; baseHp?: number;
  /** bulunduğu bölge kimliği (boş bölgelerde yaratık güncellenmez) */
  reg: string;
  /** zindan örneği kimliği (0 = değil) */
  dun: number;
}
interface Rift {
  id: number; x: number; z: number; state: 0 | 1 | 2 | 3; wave: number; mobs: Set<number>; openedAt: number; lvl: number;
  contrib: Map<number, number>; totalHp: number; scale: number; closedAt: number; gapUntil: number;
}
interface Drop { id: number; owner: number; k: SnapDrop['k']; x: number; z: number; t: number; m?: string; born: number; amount: number; item?: Item }

export class World {
  players = new Map<number, Player>();
  mobs = new Map<number, Mob>();
  rifts = new Map<number, Rift>();
  dungeons = new Map<number, DungeonRun>(); lobbies = new Map<string, Lobby>();
  drops = new Map<number, Drop>();
  camps: Camp[] = genAllCamps();
  events: { ev: GameEvent; x: number; z: number }[] = [];
  seq = 1; layer: number; tickCount = 0; startedAt: number;
  nextRiftAt = 0; lastSave = 0; tickMsSum = 0; tickMsMax = 0; tickMsN = 0;
  roomId = ''; dummyLog: { t: number; v: number }[] = []; lastMarketExpire = 0;

  constructor(public ctx: Ctx, layer: number) {
    this.layer = layer;
    this.startedAt = ctx.clock.now();
    if (ctx.cfg.spawnCamps) { for (const c of this.camps) for (let i = 0; i < c.count; i++) this.spawnCampMob(c); for (const b of genBosses()) this.spawnBoss(b); }
    this.nextRiftAt = ctx.clock.now() + range(ctx.rng, ctx.cfg.riftEvery[0], ctx.cfg.riftEvery[1]) * 1000;
    ctx.worlds.add(this);
  }

  // ───────────── yardımcılar ─────────────
  get now() { return this.ctx.clock.now(); }
  nid() { return this.seq++; }
  emit(ev: GameEvent, x: number, z: number) { this.events.push({ ev, x, z }); }
  sys(p: Player, key: string, params?: Record<string, string | number>) {
    p.send('chat', { ch: 'sys', from: '', text: '', key, p: params } satisfies ChatMsg);
  }
  ledger(p: Player, kind: string, detail: unknown) { this.ctx.db.ledger(this.now, p.dbId, kind, detail); }

  // ───────────── yaratık doğurma ─────────────
  makeMob(type: MobType, lvl: number, x: number, z: number, campId: number, riftId = -1, hpScale = 1): Mob {
    const def = MOBS[type];
    const hp = Math.round(mobHp(lvl) * def.hp * hpScale * this.ctx.cfg.mobScale);
    const m: Mob = {
      kind: 'mob', id: this.nid(), type, lvl, x, z, rot: this.ctx.rng() * 6.28, hp, maxHp: hp, atk: mobAtk(lvl) * def.atk, def: mobDef(lvl) * def.def,
      hx: x, hz: z, campId, riftId, target: 0, nextAtk: 0, wanderAt: 0, wx: x, wz: z, status: {}, contrib: new Map(), dead: false, respawnAt: 0,
      leash: type === 'bekci' ? 60 : 32, poisonAcc: 0, tauntUntil: 0, tauntBy: 0, lastSwing: 0, bossId: 0, slamAt: 0, slamHitAt: 0, reg: regionAt(x, z)?.id ?? 'bozkir', dun: 0,
    };
    this.mobs.set(m.id, m);
    return m;
  }
  spawnCampMob(c: Camp) {
    const a = this.ctx.rng() * Math.PI * 2; const d = 2 + this.ctx.rng() * 6;
    const type = c.types[Math.floor(this.ctx.rng() * c.types.length)];
    const lvl = Math.max(1, c.level + irange(this.ctx.rng, -1, 1));
    return this.makeMob(type, lvl, c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, c.id);
  }
  respawnMob(m: Mob) {
    const c = this.camps[m.campId];
    const a = this.ctx.rng() * Math.PI * 2; const d = 2 + this.ctx.rng() * 6;
    m.x = m.hx = c.x + Math.cos(a) * d; m.z = m.hz = c.z + Math.sin(a) * d;
    m.hp = m.maxHp; m.dead = false; m.target = 0; m.status = {}; m.contrib.clear(); m.nextAtk = 0;
    this.emit({ k: 'spawn', id: m.id }, m.x, m.z);
  }

  // ───────────── oyuncu giriş / çıkış ─────────────
  join(row: PlayerRow, send: Player['send'], kick: Player['kick']): Player {
    const d: PlayerData = JSON.parse(row.data);
    d.pvp ??= false; d.clues ??= []; d.dreams ??= 0; d.shards ??= 0; d.pendingDream ??= 0; // eski kayıtlar için
    const p = new Player(this.nid(), row.id, row.name, row.boy, d, row.oymak_id, row.points, send, kick);
    p.role = row.role ?? 'player';
    const now = this.now;
    // Çevrimdışı dinlenmiş deneyim
    if (d.loggedOutAt > 0) {
      const hours = Math.max(0, (now - d.loggedOutAt) / 3600000);
      d.rested = Math.min(restedCap(d.level), d.rested + restedGain(d.level, hours, d.outInHub));
      // Kurdun rüyası: uzun süre sonra dönen oyuncu sıradaki rüyayı görür
      if (hours >= DREAM_MIN_HOURS && d.dreams < THREAD_SIZE.dream && !d.pendingDream) { d.dreams++; d.pendingDream = d.dreams; }
    }
    p.stats = computeStats({ level: d.level, boy: p.boy, spec: d.spec, equip: d.equip, kut: d.kut, costume: costumeLines(d.cos?.worn, this.now) });
    p.x = d.x; p.z = d.z;
    p.hp = d.hp > 0 ? Math.min(d.hp, p.stats.maxHp) : p.stats.maxHp;
    p.lastCombat = 0;
    if (isDungeonRegion(regionAt(p.x, p.z))) { const g = gatePos('erlik'); p.x = g.x; p.z = g.z + 3.5; }
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) || !regionAt(p.x, p.z)) { p.x = HUB.spawn[p.boy].x; p.z = HUB.spawn[p.boy].z; }
    const o = oba.loadOymak(this.ctx, p.oymakId);
    oba.ensureCompanions(this.ctx, p, o.lv.otag);
    this.players.set(p.id, p);
    tickCostumes(this, p);
    claimMail(this, p);
    this.sendMe(p);
    return p;
  }
  leave(p: Player) {
    if (!this.players.has(p.id)) return;
    cancelLobby(this, p);
    if (isDungeonRegion(regionAt(p.x, p.z))) { const g = gatePos('erlik'); p.x = g.x; p.z = g.z + 3.5; }
    p.d.loggedOutAt = this.now; p.d.outInHub = zoneAt(p.x, p.z) === 'safe';
    p.d.x = p.x; p.d.z = p.z; p.d.hp = p.deadUntil ? 0 : p.hp;
    this.flushGold(p);
    this.save(p);
    this.players.delete(p.id);
    for (const m of this.mobs.values()) { if (m.target === p.id) m.target = 0; m.contrib.delete(p.id); }
    for (const q of this.players.values()) { if (q.duelWith === p.id) q.duelWith = 0; if (q.focus === p.id) q.focus = 0; }
    for (const [id, dr] of this.drops) if (dr.owner === p.id) this.drops.delete(id);
  }
  save(p: Player) {
    this.ctx.db.savePlayer(p.dbId, JSON.stringify(p.d), p.points, p.oymakId, this.now);
  }
  flushGold(p: Player) {
    if (p.goldFromMobs > 0) { this.ledger(p, 'mob.gold', { gold: p.goldFromMobs }); p.goldFromMobs = 0; }
  }
  dispose() {
    for (const p of [...this.players.values()]) { p.d.x = p.x; p.d.z = p.z; p.d.hp = p.hp; this.flushGold(p); this.save(p); }
    this.ctx.worlds.delete(this);
  }

  recalc(p: Player) {
    const frac = p.stats ? p.hp / p.stats.maxHp : 1;
    p.stats = computeStats({ level: p.d.level, boy: p.boy, spec: p.d.spec, equip: p.d.equip, kut: p.d.kut, costume: costumeLines(p.d.cos?.worn, this.now) });
    p.hp = Math.max(1, Math.round(p.stats.maxHp * Math.min(1, frac)));
    p.meDirty = true;
  }

  // ───────────── ilerleme ─────────────
  addXp(p: Player, base: number, creature: boolean) {
    let xp = base * (1 + p.stats.xpPct / 100);
    if (creature && p.d.rested > 0) {
      const bonus = Math.min(p.d.rested, xp * (RESTED_XP_MULT - 1));
      xp += bonus; p.d.rested -= bonus;
    }
    xp = Math.round(xp);
    if (p.d.level >= MAX_LEVEL) {
      p.d.kutXp += xp;
      while (p.d.kutXp >= KUT_PER_POINT) { p.d.kutXp -= KUT_PER_POINT; p.d.kut++; this.recalc(p); }
      p.meDirty = true; return xp;
    }
    p.d.xp += xp;
    while (p.d.level < MAX_LEVEL && p.d.xp >= xpToNext(p.d.level)) {
      p.d.xp -= xpToNext(p.d.level); p.d.level++; p.d.skillPts++;
      this.recalc(p); p.hp = p.stats.maxHp;
      this.emit({ k: 'lvl', id: p.id, lvl: p.d.level }, p.x, p.z);
      this.sys(p, 'sys.levelup', { lvl: p.d.level });
      if (p.d.level === SPEC_LEVEL) this.sys(p, 'sys.spec_ready');
      if (MILESTONE_LEVELS.includes(p.d.level)) this.milestone(p);
    }
    p.meDirty = true;
    return xp;
  }
  /** Yeni ipucu keşfeder; ödül akçe, unvan ve "Mühürün Dışı" kontrolü. Yeniyse true. */
  discoverClue(p: Player, id: string, gold = CLUE_GOLD): boolean {
    const d = p.d; if (d.clues.includes(id)) return false;
    const before = titlesOf(d.clues).length;
    d.clues.push(id); d.gold += gold; p.meDirty = true; this.ledger(p, 'clue', { id, gold });
    this.sys(p, 'sys.clue', { id });
    const fr = this.ctx.db.worldGet('frags', 0); const insc = INSCRIPTIONS.filter((t) => fr >= t).length;
    if (!d.clues.includes('truth.1') && truthUnlocked(d.clues, insc)) { d.clues.push('truth.1'); this.sys(p, 'sys.truth'); this.ledger(p, 'clue', { id: 'truth.1', gold: 0 }); }
    if (titlesOf(d.clues).length > before) this.sys(p, 'sys.title');
    return true;
  }
  tutorial(p: Player, kind: (typeof TUTORIAL_STEPS)[number], n = 1) {
    const t = p.d.tut;
    if (TUTORIAL_STEPS[t.step] !== kind) return;
    t.prog += n;
    if (t.prog >= TUTORIAL_TARGET[kind]) {
      const rw = TUTORIAL_REWARD[kind] as { gold?: number; charm?: number };
      p.d.gold += rw.gold ?? 0; p.d.bag.charm += rw.charm ?? 0;
      this.ledger(p, 'tutorial', { kind, ...rw });
      t.step++; t.prog = 0;
      this.sys(p, 'sys.tut_done', { step: t.step });
    }
    p.meDirty = true;
  }

  // ───────────── hasar ─────────────
  hasStatus(t: Player | Mob, s: StatusKey) { const x = t.status[s]; return !!x && x.until > this.now; }
  applyStatus(t: Player | Mob, s: StatusKey, dur: number, extra?: { dps?: number; by?: number; absorb?: number }) {
    t.status[s] = { until: this.now + dur * 1000, ...extra };
    this.emit({ k: 'status', id: t.id, s, dur }, t.x, t.z);
  }
  flags(t: Player | Mob): number {
    let f = 0;
    for (const s of Object.keys(t.status) as StatusKey[]) if (this.hasStatus(t, s)) f |= STATUS_FLAG[s];
    return f;
  }

  /** Tek hasar giriş noktası. */
  damage(src: Player | Mob | null, tgt: Player | Mob, amount: number, o: { crit?: boolean; dot?: boolean } = {}) {
    if (tgt.kind === 'mob' ? tgt.dead : tgt.deadUntil > 0) return 0;
    if (tgt.kind === 'player' && (tgt.god || tgt.protectUntil > this.now)) return 0;   // yeniden doğuş koruması: muhafız/yaratık döngüsüyle öldürülemez
    let dmg = Math.max(1, Math.round(amount));
    if (tgt.kind === 'player') {
      dmg = Math.max(1, Math.round(dmg * tgt.stats.dmgTaken));
      const sh = tgt.status.shield;
      if (sh && sh.until > this.now && (sh.absorb ?? 0) > 0) {
        const a = Math.min(sh.absorb!, dmg); sh.absorb! -= a; dmg -= a;
        if (sh.absorb! <= 0) delete tgt.status.shield;
      }
      if (!o.dot) tgt.lastCombat = this.now;
      if (src?.kind === 'player') tgt.lastDamager = src.id;
      tgt.hp -= dmg;
      if (tgt.duelWith && tgt.hp <= 1) { tgt.hp = 1; this.endDuel(tgt, src?.kind === 'player' ? src : null); }
      this.emit({ k: 'dmg', id: tgt.id, v: dmg, crit: o.crit, src: src?.id, pl: true }, tgt.x, tgt.z);
      if (tgt.hp <= 0) this.killPlayer(tgt, src);
    } else {
      if (tgt.dummy) { this.dummyLog.push({ t: this.now, v: dmg }); if (this.dummyLog.length > 4000) this.dummyLog.splice(0, 2000); tgt.hp = tgt.maxHp; this.emit({ k: 'dmg', id: tgt.id, v: dmg, crit: o.crit, src: src?.id }, tgt.x, tgt.z); return dmg; }
      tgt.hp -= dmg;
      if (src?.kind === 'player') {
        if (tgt.bossId && !tgt.contrib.has(src.id) && tgt.baseHp) {   // boss, kendisine vuran oyuncu sayısıyla büyür: kalabalık boss'u etkisizleştirmesin
          const extra = Math.min(FIELD_BOSS.maxScale, tgt.contrib.size); const nm = Math.round(tgt.baseHp * (1 + FIELD_BOSS.hpPerExtra * extra));
          if (nm > tgt.maxHp) { tgt.hp += nm - tgt.maxHp; tgt.maxHp = nm; }
        }
        tgt.contrib.set(src.id, (tgt.contrib.get(src.id) ?? 0) + dmg);
        if (!o.dot) { src.lastCombat = this.now; src.lastAggro = this.now; }
        if (!tgt.target) tgt.target = src.id;
        if (tgt.riftId >= 0) { const r = this.rifts.get(tgt.riftId); if (r) r.contrib.set(src.id, (r.contrib.get(src.id) ?? 0) + dmg); }
      }
      this.emit({ k: 'dmg', id: tgt.id, v: dmg, crit: o.crit, src: src?.id }, tgt.x, tgt.z);
      if (tgt.hp <= 0) this.killMob(tgt);
    }
    if (src?.kind === 'player' && !o.dot && src.stats.leech > 0 && dmg > 0) {
      const h = Math.round(dmg * src.stats.leech);
      if (h > 0 && src.hp > 0) src.hp = Math.min(src.stats.maxHp, src.hp + h);
    }
    return dmg;
  }

  /** Güvenli bölgedeki oyuncu yaratığa vuramaz (yaratık karşılık veremediği için menzilli silahla bedava öldürme olurdu). Kukla ve yönetici hariç. */
  canHitMob(p: Player, m: Mob) { return m.dummy === true || p.role === 'admin' || zoneAt(p.x, p.z) !== 'safe'; }
  playerHit(p: Player, tgt: Player | Mob, mult: number, extra = 1, o: { skill?: boolean; dk?: DmgKind } = {}) {
    p.protectUntil = 0;                              // saldıran koruma kalkanını kaybeder
    const pvp = tgt.kind === 'player';
    const crit = this.ctx.rng() * 100 < p.stats.crit;
    const roll = 0.92 + this.ctx.rng() * 0.16;
    const lv = tgt.kind === 'mob' && !tgt.dummy ? lvlDiffOut(tgt.lvl - p.d.level) : 1;
    let dmg = hitDamage(p.stats.atk, mult * extra * lv * (crit ? p.stats.critMult : 1), tgt.kind === 'player' ? tgt.stats.def : tgt.def, pvp, this.hasStatus(p, 'curse'), roll);
    if (extra !== 1) dmg = Math.round(dmg); // beceri çarpanı zaten ekte
    if (tgt.kind === 'player') {
      // ilk saldıran: karşı taraf son 15 sn'de kimseye saldırmamışsa ve düello değilse, 30 sn 'saldırgan' bayrağı alır (karşılık veren sorumlu sayılmaz)
      if (this.now - tgt.lastPvpAgg > COMBAT_FLAG_SEC * 1000 && p.duelWith !== tgt.id) p.aggressorUntil = this.now + 30000;
      p.lastPvpAgg = this.now; p.lastPvp = this.now; tgt.lastPvp = this.now;
      const df = applyDefense(tgt.stats, o.dk ?? p.stats.weaponKind, !!o.skill, p.stats.pierce, this.ctx.rng(), this.ctx.rng());
      if (tgt.deadUntil === 0 && !tgt.god && df.blocked) { tgt.lastCombat = this.now; this.emit({ k: 'dmg', id: tgt.id, v: 0, blk: true, src: p.id, pl: true }, tgt.x, tgt.z); return 0; }
      // düşük seviye koruması: düello ya da hedefin az önce sana saldırmış olması (karşılık) dışında, çok aşağıdaki oyuncuya hasar azalır
      const retaliation = p.lastDamager === tgt.id && this.now - p.lastCombat < 10000; const gapM = p.duelWith === tgt.id || retaliation ? 1 : pvpGapMult(p.d.level, tgt.d.level);
      dmg = gapM === 0 ? 0 : Math.max(1, Math.round(dmg * df.mult * (1 + SPEC_MODS[tgt.d.spec].pvpTaken) * gapM));
      if (dmg === 0) { this.emit({ k: 'dmg', id: tgt.id, v: 0, blk: true, src: p.id, pl: true }, tgt.x, tgt.z); return 0; }
    }
    return this.damage(p, tgt, dmg, { crit });
  }

  /** PvP bilinçli başlar: alan becerisi yalnızca hedef seçtiğin, sana saldırmış ya da düello yaptığın oyuncuya işler (kalabalık kampta yan hasarla toplu savaş çıkmasın). */
  pvpEngaged(att: Player, q: Player) {
    if (att.duelWith === q.id || att.focus === q.id) return true;
    const now = this.now; return (q.lastDamager === att.id && now - q.lastCombat < 10000) || (att.lastDamager === q.id && now - att.lastCombat < 10000);
  }
  /** Bayrak açık ve bulunulan harita PvP'ye izin veriyor mu */
  pvpActive(p: Player) { const g = regionAt(p.x, p.z); return !!p.d.pvp && !!g && MAPS[g.map].pvp === 'optional'; }
  canHitPlayer(att: Player, tgt: Player, explicit: boolean) {
    if (tgt === att || tgt.deadUntil > 0) return false;
    if (att.duelWith === tgt.id) return true;
    if (zoneAt(att.x, att.z) === 'safe' || zoneAt(tgt.x, tgt.z) === 'safe') return false;
    if (!this.pvpActive(att) || !this.pvpActive(tgt)) return false;   // isteğe bağlı PvP: iki taraf da bayraklı olmalı
    return explicit || tgt.boy !== att.boy;
  }

  // ───────────── ölüm ─────────────
  // ───────────── saha bosları ─────────────
  spawnBoss(b: BossDef) {
    const m = this.makeMob('bekci', b.level, b.x, b.z, -1, -1, FIELD_BOSS.hpMult);
    m.bossId = b.id; m.baseHp = m.maxHp; m.hx = b.x; m.hz = b.z; m.leash = 45; m.slamAt = this.now + FIELD_BOSS.slamEverySec * 1000;
    return m;
  }
  respawnBoss(m: Mob) {
    if (m.baseHp) m.maxHp = m.baseHp; m.x = m.hx; m.z = m.hz; m.hp = m.maxHp; m.dead = false; m.target = 0; m.status = {}; m.contrib.clear(); m.nextAtk = 0; m.slamAt = this.now + FIELD_BOSS.slamEverySec * 1000; m.slamHitAt = 0;
    this.emit({ k: 'spawn', id: m.id }, m.x, m.z);
    this.ctx.broadcastSys('sys.boss_up.' + m.bossId);
  }
  /** Boss'un özel hamlesi: işaretli alan darbesi (önce uyarı halkası, sonra hasar; beceri bloğu işler). */
  bossSpecial(m: Mob, tgt: Player | undefined, now: number) {
    if (m.slamHitAt === 0 && tgt && now >= m.slamAt) {
      m.slamHitAt = now + FIELD_BOSS.slamTelegraphSec * 1000; m.slamAt = now + FIELD_BOSS.slamEverySec * 1000;
      this.emit({ k: 'fx', fx: 'wrath', x: m.x, z: m.z, r: FIELD_BOSS.slamRadius, o: m.id }, m.x, m.z);
    } else if (m.slamHitAt !== 0 && now >= m.slamHitAt) {
      m.slamHitAt = 0; const kind = FIELD_BOSS.list[m.bossId - 1][1];
      for (const p of this.players.values()) {
        if (p.deadUntil > 0 || zoneAt(p.x, p.z) === 'safe' || dist(p, m) > FIELD_BOSS.slamRadius) continue;
        const df = applyDefense(p.stats, kind, true, 0, 1, this.ctx.rng());
        if (df.blocked && !p.god) { p.lastCombat = now; this.emit({ k: 'dmg', id: p.id, v: 0, blk: true, src: m.id, pl: true }, p.x, p.z); continue; }
        const dmg = Math.max(1, Math.round(hitDamage(m.atk * FIELD_BOSS.slamMult * lvlDiffIn(m.lvl - p.d.level), 1, p.stats.def, false, false) * df.mult));
        this.damage(m, p, dmg); if (p.deadUntil === 0) this.applyStatus(p, 'stun', 1);
      }
    }
  }
  fieldBossDown(m: Mob) {
    const total = [...m.contrib.values()].reduce((a, b) => a + b, 0) || 1;
    m.respawnAt = this.now + FIELD_BOSS.respawnSec * 1000; m.slamHitAt = 0;
    const kind = FIELD_BOSS.list[m.bossId - 1][1]; let top: Player | undefined; let topD = 0;
    for (const [pid, dmg] of m.contrib) {
      const p = this.players.get(pid); if (!p) continue; if (dmg > topD) { topD = dmg; top = p; }
      if (p.deadUntil > 0 || dmg / total < 0.05 || dist(p, m) > 60) continue;
      const rng = this.ctx.rng;
      this.addXp(p, mobXp(m.lvl) * FIELD_BOSS.xpMult, false);
      const gold = Math.round(mobGold(m.lvl) * FIELD_BOSS.goldMult); for (let i = 0; i < 4; i++) this.spawnDrop(p, 'gold', m.x, m.z, { amount: Math.round(gold / 4) });
      // garanti destansı+ parça; boss'un hasar türüne karşı savunma efsunuyla (build avcılığı)
      const it = makeItem(rng, randomSlot(rng), m.lvl, rollTier(rng, 2, 0.6));
      const dk = DEF_ENCH[kind]; const [lo, hi] = ENCH_TABLE[dk]; if (!it.ench.some((e) => e.k === dk) && it.base?.k !== dk) { if (it.ench.length >= 3) it.ench.pop(); it.ench.push({ k: dk, v: Math.round((lo + (hi - lo) * (0.7 + rng() * 0.3)) * 10) / 10 }); }
      this.spawnDrop(p, 'item', m.x, m.z, { item: it, t: it.tier, m: it.slot });
      if (rng() < 0.4) { const it2 = makeItem(rng, randomSlot(rng), m.lvl, rollTier(rng, 1)); this.spawnDrop(p, 'item', m.x, m.z, { item: it2, t: it2.tier, m: it2.slot }); }
      for (let i = 0; i < 2 + (rng() < 0.5 ? 1 : 0); i++) this.spawnDrop(p, 'book', m.x, m.z);
      if (rng() < 0.45) this.spawnDrop(p, 'charm', m.x, m.z);
      for (let i = 0; i < 3; i++) this.spawnDrop(p, 'frag', m.x, m.z);
      this.spawnDrop(p, 'mat', m.x, m.z, { m: 'ore', amount: irange(rng, 6, 12) });
      this.ledger(p, 'boss.reward', { boss: m.bossId, tier: it.tier, gold });
      this.sys(p, 'sys.boss_reward', {});
    }
    m.contrib.clear();
    this.ctx.broadcastSys('sys.boss_down.' + m.bossId, { who: top?.name ?? '?' });
  }

  /** Zindan ödülüne eklenen kostüm malzemeleri (kostüm sistemi) */
  dungeonLoot(p: Player, d: string) {
    const s = cosOf(p); const rng = this.ctx.rng; const golge = d === 'golge'; const got: string[] = [];
    const a = irange(rng, 8, 12); s.mats.lif += a; got.push(`lif ${a}`);
    const b = irange(rng, 1, 2); s.mats.boya += b; got.push(`boya ${b}`);
    if (rng() < 0.5) { s.mats.ipek++; got.push('ipek 1'); }
    if (rng() < (golge ? 0.45 : 0.25)) { s.mats.nakis++; got.push('nakis 1'); }
    if (rng() < 0.4) { s.luck.boncuk++; got.push('boncuk'); } if (rng() < 0.2) { s.luck.nazar++; got.push('nazar'); } if (rng() < 0.15) { s.luck.dugum++; got.push('dugum'); } { const k = irange(rng, 1, 3); s.luck.kagit += k; got.push('kagit ' + k); }
    this.ledger(p, 'cos.loot', { d, got }); this.sys(p, 'sys.cos_loot'); p.meDirty = true;
  }

  /** Kilometre taşı armağanı (Kut Armağanı) */
  milestone(p: Player) {
    const g = milestoneGift(p.d.level); const d = p.d; const rng = this.ctx.rng;
    d.gold += g.gold; d.bag.book += g.books; d.bag.charm += g.charms; this.addFrag(p, g.frags);
    const it = makeItem(rng, randomSlot(rng), p.d.level, g.itemTier); if (!this.giveItem(p, it)) this.spawnDrop(p, 'item', p.x, p.z, { item: it, t: it.tier, m: it.slot });
    this.ledger(p, 'milestone', { level: d.level, gold: g.gold, books: g.books, charms: g.charms, tier: g.itemTier });
    this.sys(p, 'sys.milestone', { lvl: d.level }); p.meDirty = true;
  }

  killMob(m: Mob) {
    m.dead = true; m.hp = 0; m.target = 0;
    this.emit({ k: 'die', id: m.id }, m.x, m.z);
    const boss = m.type === 'bekci';
    if (m.bossId && m.dun) { dungeonBossDown(this, m); return; }
    if (m.bossId) { this.fieldBossDown(m); return; }
    const total = [...m.contrib.values()].reduce((a, b) => a + b, 0) || 1;
    for (const [pid, dmg] of m.contrib) {
      const p = this.players.get(pid); if (!p || p.deadUntil > 0) continue;
      const share = Math.max(0.15, dmg / total);
      const diff = p.d.level - m.lvl;
      const f = diff > 3 ? Math.max(0.1, 1 - 0.12 * (diff - 3)) : Math.min(1.25, 1 + 0.05 * -diff);
      if (!boss) {
        this.addXp(p, mobXp(m.lvl) * f * (m.riftId >= 0 ? 1.3 : 1) * (this.pvpActive(p) ? 1 + PVP_FLAG.bonus : 1), true);
        p.d.counters.kills++;
        if (p.d.rank < 0 && ++p.d.rankKills >= RANK_RECOVER_KILLS) { p.d.rank++; p.d.rankKills = 0; this.sys(p, 'sys.rank_up'); p.meDirty = true; }
        this.tutorial(p, 'kill');
        this.rollDrops(p, m, share);
      }
    }
    if (m.riftId >= 0) {
      const r = this.rifts.get(m.riftId);
      if (r) r.mobs.delete(m.id);
      this.mobs.delete(m.id);
    } else if (m.dun) {
      this.dungeons.get(m.dun)?.mobs.delete(m.id); this.mobs.delete(m.id);
    } else {
      let near = 0; if (m.campId >= 0) { const c = this.camps[m.campId]; for (const q of this.players.values()) if (q.deadUntil === 0 && (q.x - c.x) ** 2 + (q.z - c.z) ** 2 < 35 * 35) near++; }
      m.respawnAt = this.now + range(this.ctx.rng, MOB_RESPAWN[0], MOB_RESPAWN[1]) * 1000 * campRespawnMult(near);
    }
  }

  killPlayer(p: Player, src: Player | Mob | null) {
    p.hp = 0; p.deadUntil = this.now + RESPAWN_SEC * 1000; p.atk = false; p.dirx = p.dirz = 0; p.status = {};
    p.d.counters.deaths++;
    const by = src?.kind === 'mob' ? (src.bossId ? 'boss.' + src.bossId : src.type) : src?.kind === 'player' ? 'pl' : 'dot';
    const kd = src?.kind === 'mob' ? (src.bossId ? FIELD_BOSS.list[src.bossId - 1][1] : MOBS[src.type].kind) : src?.kind === 'player' ? src.stats.weaponKind : undefined;
    this.emit({ k: 'die', id: p.id, by, kd }, p.x, p.z);
    p.meDirty = true;
    const killer = src?.kind === 'player' ? src : (p.lastDamager && this.now - p.lastCombat < 6000 ? this.players.get(p.lastDamager) : undefined);
    if (killer && killer !== p) {
      // ceza: kendi boyunu ya da SALDIRGAN OLMAYAN birini, ilk saldıran olarak öldüren derece kaybeder; karşılık veren kurban saldırganı aklamaz
      const nonCombat = !(p.aggressorUntil > this.now) && killer.aggressorUntil > this.now;
      const sameBoy = killer.boy === p.boy;
      const victimRed = p.d.rank < 0;
      killer.d.counters.pvpKills++;
      if (!victimRed && (sameBoy || (nonCombat && killer.d.level - p.d.level >= 6))) {   // bayraklı alp rızaen savaşır; cezası yalnızca aynı boydan ya da çok aşağıdan öldürene
        killer.d.rank -= killer.d.level - p.d.level >= 8 ? 2 : 1; killer.d.rankKills = 0;       // çok aşağıdaki oyuncuyu avlamak çift ceza
        this.sys(killer, 'sys.rank_down', { rank: killer.d.rank }); killer.meDirty = true;
      }
      if (victimRed && p.d.items.length && this.ctx.rng() < 0.3) {
        const it = p.d.items.splice(Math.floor(this.ctx.rng() * p.d.items.length), 1)[0];
        this.spawnDrop(killer, 'item', p.x, p.z, { item: it, t: it.tier, m: it.slot });
        this.sys(p, 'sys.item_lost'); this.ledger(p, 'pvp.item_drop', { item: it.id, to: killer.dbId });
      }
    } else if (zoneAt(p.x, p.z) === 'risky' && !isDungeonRegion(regionAt(p.x, p.z))) {   // zindanda (günlük hak + ücret zaten var) deneyim kaybı yok
      const loss = Math.min(p.d.xp, Math.round(xpToNext(p.d.level) * deathXpLoss(p.d.level)));
      p.d.xp -= loss; if (loss > 0) this.sys(p, 'sys.xp_lost', { xp: loss });
    }
    p.lastDamager = 0;
  }

  /** Oyuncuyu bir haritanın kapı taşına ışınlar (hedefler, dövüşü ve yaratık hedeflemesini sıfırlar). */
  teleport(p: Player, to: string) {
    const g = gatePos(to); const reg = regionById(to);
    p.x = g.x + (to === 'bozkir' ? -2.5 : 0); p.z = g.z + (to === 'bozkir' ? 0 : 3.5); p.focus = 0; p.atk = false; p.dirx = 0; p.dirz = 0;
    for (const m of this.mobs.values()) if (m.target === p.id) m.target = 0;
    p.protectUntil = this.now + 3000; p.meDirty = true;
    this.ledger(p, 'travel', { to: reg.id });
  }

  respawn(p: Player) {
    if (!p.deadUntil) return;
    if (this.now < p.deadUntil) throw new GameError('too_soon');
    p.deadUntil = 0; p.status = {}; this.recalc(p); p.hp = p.stats.maxHp; p.protectUntil = this.now + RESPAWN_PROTECT_MS;
    const s = this.respawnPoint(p); p.x = s.x; p.z = s.z; p.meDirty = true;
  }
  /** Yeni oyuncu bölgesinde ve Erlik Diyarı'nda kendi güvenli kampında doğar; zindanda yurda döner */
  respawnPoint(p: Player): { x: number; z: number } {
    const g = regionAt(p.x, p.z);
    if (isDungeonRegion(g)) return { x: gatePos('erlik').x, z: gatePos('erlik').z + 3.5 };
    if (g && g.id !== 'bozkir') return { x: g.cx + (this.ctx.rng() - 0.5) * 4, z: g.cz + 3 + this.ctx.rng() * 2 };
    return HUB.spawn[p.boy];
  }

  // ───────────── ganimet ─────────────
  spawnDrop(p: Player, k: SnapDrop['k'], x: number, z: number, o: { m?: string; t?: number; amount?: number; item?: Item } = {}) {
    const a = this.ctx.rng() * 6.283; const d = 1 + this.ctx.rng() * 2.2;
    const dr: Drop = { id: this.nid(), owner: p.id, k, x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, t: o.t ?? 0, m: o.m, born: this.now, amount: o.amount ?? 1, item: o.item };
    this.drops.set(dr.id, dr);
  }
  rollDrops(p: Player, m: Mob, share: number) {
    const r = this.ctx.rng;
    const gold = Math.round(mobGold(m.lvl) * (0.7 + r() * 0.6) * (1 + (share - 0.15) * 0.0) * (this.pvpActive(p) ? 1 + PVP_FLAG.bonus : 1));
    this.spawnDrop(p, 'gold', m.x, m.z, { amount: gold });
    if (r() < 0.12) this.spawnDrop(p, 'gold', m.x, m.z, { amount: Math.round(gold * 0.6) });
    if (r() < 0.45) { const k = (['ore', 'hide', 'wood'] as MatKey[])[Math.floor(r() * 3)]; this.spawnDrop(p, 'mat', m.x, m.z, { m: k, amount: irange(r, 1, 3) }); }
    if (r() < 0.11) {
      const it = makeItem(r, randomSlot(r), m.lvl, rollTier(r));
      this.spawnDrop(p, 'item', m.x, m.z, { item: it, t: it.tier, m: it.slot });
    }
    if (r() < 0.012) this.spawnDrop(p, 'book', m.x, m.z);
    if (r() < 0.006) this.spawnDrop(p, 'charm', m.x, m.z);
    if (r() < 0.006) this.spawnDrop(p, 'frag', m.x, m.z);
  }
  giveItem(p: Player, it: Item) {
    if (p.d.items.length >= BAG_SIZE) return false;
    p.d.items.push(it); p.meDirty = true; return true;
  }
  addFrag(p: Player, n: number) {
    p.d.bag.frag += n;
    const before = this.ctx.db.worldGet('frags', 0);
    const after = before + n;
    this.ctx.db.worldSet('frags', after);
    const crossed = INSCRIPTIONS.findIndex((th) => before < th && after >= th);
    if (crossed >= 0) this.ctx.broadcastSys('sys.inscription', { n: crossed + 1 });
    this.ledger(p, 'frag', { n, total: after });
  }
  collectDrop(p: Player, dr: Drop): boolean {
    switch (dr.k) {
      case 'gold': p.d.gold += dr.amount; p.goldFromMobs += dr.amount; break;
      case 'mat': p.d.bag[dr.m as MatKey] += dr.amount; break;
      case 'book': p.d.bag.book += 1; break;
      case 'charm': p.d.bag.charm += 1; break;
      case 'frag': this.addFrag(p, 1); break;
      case 'item': if (!this.giveItem(p, dr.item!)) { this.sys(p, 'sys.bag_full'); return false; } break;
    }
    p.meDirty = true; return true;
  }

  // ───────────── girdiler ─────────────
  onInput(p: Player, m: { x: number; z: number; ack?: number }) {
    let x = Number(m.x), z = Number(m.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    p.dirx = x; p.dirz = z; p.lastInput = this.now;
    if (Number.isFinite(m.ack)) p.lastAck = m.ack!;
  }
  onAttack(p: Player, m: { on: boolean; focus?: number }) {
    p.atk = !!m.on;
    if (m.focus !== undefined) p.focus = Number(m.focus) || 0;
  }
  onSkill(p: Player, slot: number) {
    slot = Math.floor(slot);
    if (!(slot >= 0 && slot < 6)) return;
    if (p.deadUntil > 0 || this.hasStatus(p, 'stun')) return;
    const sk = SKILLS[slot];
    if (p.d.level < sk.lvl) return;
    if (this.now < p.cds[slot]) return;
    p.cds[slot] = this.now + sk.cd * 1000;
    p.lastAggro = this.now;
    const rank = skillRankMult(p.d.skillRanks[slot]);
    const sp = p.stats.spell * rank;
    const r = sk.r * p.stats.aoe;
    let hit = 0;
    this.emit({ k: 'fx', fx: sk.fx, x: p.x, z: p.z, r: Math.max(r, 2), o: p.id }, p.x, p.z);
    if (sk.kind === 'shield') {
      const absorb = Math.round(p.stats.maxHp * SHIELD_ABSORB * p.stats.shieldMult * rank);
      this.applyStatus(p, 'shield', sk.status!.shield!, { absorb });
      p.meDirty = true; return;
    }
    const taunt = SPEC_MODS[p.d.spec].taunt;
    for (const m of this.mobs.values()) {
      if (m.dead || !this.canHitMob(p, m)) continue;
      const d = Math.sqrt(dist2(p, m)); if (d > r + 0.6) continue;
      if (sk.kind === 'pull') {
        const f = Math.max(0, d - 2.2); const k = d > 0.001 ? f / d : 0;
        m.x += (p.x - m.x) * k; m.z += (p.z - m.z) * k;
        if (taunt || sk.kind === 'pull') { m.target = p.id; m.tauntUntil = this.now + 5000; m.tauntBy = p.id; }
      } else if (taunt && sk.id === 'sarsinti') { m.target = p.id; m.tauntUntil = this.now + 4000; m.tauntBy = p.id; }
      if (sk.mult > 0) { this.playerHit(p, m, sk.mult * sp); hit++; }
      for (const [s, dur] of Object.entries(sk.status ?? {}) as [StatusKey, number][]) {
        if (m.dead) break;
        if (s === 'poison') this.applyStatus(m, s, dur, { dps: p.stats.atk * POISON_DOT * rank * p.stats.spell, by: p.id });
        else this.applyStatus(m, s, dur);
      }
    }
    for (const q of this.players.values()) {
      if (!this.canHitPlayer(p, q, false) || !this.pvpEngaged(p, q) || Math.sqrt(dist2(p, q)) > r + 0.6) continue;
      const dealtQ = sk.mult > 0 ? this.playerHit(p, q, sk.mult * sp, 1, { skill: true, dk: sk.dk }) : 1;
      if (dealtQ === 0) continue; // bloklanan beceri durum etkisi de uygulamaz
      for (const [s, dur] of Object.entries(sk.status ?? {}) as [StatusKey, number][]) {
        if (s === 'poison') this.applyStatus(q, s, dur, { dps: p.stats.atk * POISON_DOT * rank * p.stats.spell * 0.35, by: p.id });
        else this.applyStatus(q, s, dur);
      }
    }
    void hit;
    p.meDirty = true;
  }

  // ───────────── RPC ─────────────
  rpc(p: Player, id: number, op: RpcOp, a: any): RpcRes {
    try {
      const data = this.rpcRun(p, op, a ?? {});
      if (p.meDirty) this.sendMe(p);
      return { id, ok: true, data };
    } catch (e) {
      if (e instanceof GameError) return { id, ok: false, err: e.code, p: e.p };
      console.error('rpc error', op, e);
      return { id, ok: false, err: 'internal' };
    }
  }
  near(p: Player, t: { x: number; z: number }, r: number) { if (Math.sqrt(dist2(p, t)) > r) throw new GameError('too_far'); }
  alive(p: Player) { if (p.deadUntil > 0) throw new GameError('dead'); }
  findItem(p: Player, id: string): { it: Item; where: 'bag' | 'equip' } | null {
    const it = p.d.items.find((x) => x.id === id); if (it) return { it, where: 'bag' };
    for (const s of Object.keys(p.d.equip) as Slot[]) if (p.d.equip[s]?.id === id) return { it: p.d.equip[s]!, where: 'equip' };
    return null;
  }

  rpcRun(p: Player, op: RpcOp, a: any): unknown {
    const d = p.d;
    switch (op) {
      case 'equip': {
        this.alive(p);
        const i = d.items.findIndex((x) => x.id === a.id); if (i < 0) throw new GameError('no_item');
        const it = d.items[i]; if (it.lvlReq > d.level) throw new GameError('level_low', { lvl: it.lvlReq });
        const old = d.equip[it.slot]; d.items.splice(i, 1); if (old) d.items.push(old);
        d.equip[it.slot] = it; this.recalc(p); return null;
      }
      case 'unequip': {
        const s = a.slot as Slot; const it = d.equip[s]; if (!it) throw new GameError('no_item');
        if (d.items.length >= BAG_SIZE) throw new GameError('bag_full');
        delete d.equip[s]; d.items.push(it); this.recalc(p); return null;
      }
      case 'sell': {
        this.alive(p); this.near(p, HUB.demirci, HUB.interactDemirci + 4);
        const i = d.items.findIndex((x) => x.id === a.id); if (i < 0) throw new GameError('no_item');
        const it = d.items[i]; const price = vendorPrice(it);
        d.items.splice(i, 1); d.gold += price; this.ledger(p, 'sell', { item: it.id, tier: it.tier, up: it.up, price }); p.meDirty = true;
        return { price };
      }
      case 'upgrade': return this.upgrade(p, a);
      case 'craft': return this.craft(p, a);
      case 'spec': {
        if (d.level < SPEC_LEVEL) throw new GameError('level_low', { lvl: SPEC_LEVEL });
        if (d.spec !== 'none') throw new GameError('spec_set');
        if (a.choice !== 'kalkan' && a.choice !== 'kilic') throw new GameError('bad_spec');
        d.spec = a.choice as Spec; this.recalc(p); p.hp = p.stats.maxHp; return null;
      }
      case 'rankSkill': {
        const s = Math.floor(a.slot); if (!(s >= 0 && s < 6)) throw new GameError('bad_slot');
        const rk = d.skillRanks[s];
        if (d.level < SKILLS[s].lvl) throw new GameError('level_low', { lvl: SKILLS[s].lvl });
        if (rk >= SKILL_MAX_RANK) throw new GameError('max_rank');
        if (d.skillPts < 1) throw new GameError('no_skill_points');
        const g = skillRankGold(rk); if (d.gold < g) throw new GameError('no_gold');
        d.skillPts--; d.gold -= g; d.skillRanks[s]++; this.ledger(p, 'skill.rank', { slot: s, to: d.skillRanks[s], gold: g }); p.meDirty = true;
        return null;
      }
      case 'respawn': this.respawn(p); return null;
      case 'dungeon.enter': case 'dungeon.leave': return dungeonRpc(this, p, op, a as Record<string, unknown>);
      case 'cos': return costumeRpc(this, p, a as Record<string, unknown>);
      case 'pvp': {
        this.alive(p); const on = !!a.on; if (on === !!d.pvp) return null;
        const g = regionAt(p.x, p.z);
        if (on) { if (!g || MAPS[g.map].pvp !== 'optional') throw new GameError('pvp_off_zone'); d.pvp = true; this.sys(p, 'sys.pvp_on'); }
        else { if (this.now - p.lastPvp < PVP_FLAG.offAfterSec * 1000) throw new GameError('pvp_busy', { s: Math.ceil((PVP_FLAG.offAfterSec * 1000 - (this.now - p.lastPvp)) / 1000) }); d.pvp = false; this.sys(p, 'sys.pvp_off'); }
        p.meDirty = true; return null;
      }
      case 'travel': {
        this.alive(p); const to = String(a.to) as MapId; const from = regionAt(p.x, p.z);
        if (!from || !(GATE_LINKS[from.id] ?? []).includes(to)) throw new GameError('bad_travel');
        this.near(p, gatePos(from.id), HUB.interactGate);
        const def = MAPS[to]; const adm = p.role === 'admin';
        if (!adm && d.level < def.minLv) throw new GameError('level_low', { lvl: def.minLv });
        if (!adm && d.level > def.maxLv) throw new GameError('level_high', { lvl: def.maxLv });
        if (!adm && to === 'otlak' && d.rank < 0) throw new GameError('travel_red');
        if (this.now - p.lastCombat < 8000 && !adm) throw new GameError('in_combat');
        this.teleport(p, to);
        return null;
      }
      case 'duel': {
        this.alive(p);
        const q = [...this.players.values()].find((x) => x.name.toLowerCase() === String(a.name).toLowerCase());
        if (!q || q === p) throw new GameError('no_player');
        if (zoneAt(p.x, p.z) !== 'safe' || zoneAt(q.x, q.z) !== 'safe') throw new GameError('duel_safe_only');
        if (Math.sqrt(dist2(p, q)) > 25) throw new GameError('too_far');
        q.duelInvite = { from: p.id, at: this.now };
        this.sys(q, 'sys.duel_invite', { name: p.name }); q.send('duelInvite', { from: p.name });
        return null;
      }
      case 'duelAccept': {
        const inv = p.duelInvite; if (!inv || this.now - inv.at > 30000) throw new GameError('no_invite');
        const q = this.players.get(inv.from); if (!q) throw new GameError('no_player');
        p.duelWith = q.id; q.duelWith = p.id; p.duelInvite = null;
        this.sys(p, 'sys.duel_start', { name: q.name }); this.sys(q, 'sys.duel_start', { name: p.name });
        return null;
      }
      case 'oba.state': { const n = d.companions.length; const info = oba.obaInfo(this.ctx, p); if (d.companions.length !== n) p.meDirty = true; return info; }
      case 'oba.donate': {
        this.near(p, HUB.otag, HUB.interactOtag);
        const n = oba.donate(this.ctx, p, a); this.tutorial(p, 'donate', n); p.meDirty = true; return oba.obaInfo(this.ctx, p);
      }
      case 'oba.claim': {
        this.near(p, HUB.otag, HUB.interactOtag);
        const r = oba.claim(this.ctx, p); p.meDirty = true; return { claimed: r, info: oba.obaInfo(this.ctx, p) };
      }
      case 'oba.build': {
        this.near(p, HUB.otag, HUB.interactOtag);
        oba.build(this.ctx, p, a.b); this.tutorial(p, 'build'); p.meDirty = true; return oba.obaInfo(this.ctx, p);
      }
      case 'oba.dispatch': {
        this.near(p, HUB.otag, HUB.interactOtag);
        oba.dispatch(this.ctx, p, a.compId, a.hours); this.tutorial(p, 'expedition'); p.meDirty = true; return oba.obaInfo(this.ctx, p);
      }
      case 'oba.collect': {
        this.near(p, HUB.otag, HUB.interactOtag);
        const free = BAG_SIZE - d.items.length;
        const exp = d.expeditions.find((e) => e.id === a.expId);
        if (exp && this.now >= exp.endAt) {
          const c = d.companions.find((x) => x.id === exp.compId)!;
          const preview = oba.rollExpedition(exp, c, d.level);
          if (preview.items.length > free) throw new GameError('bag_full');
        }
        const res = oba.collect(this.ctx, p, a.expId);
        for (const it of res.items) this.giveItem(p, it);
        if (res.frag > 0) { d.bag.frag -= res.frag; this.addFrag(p, res.frag); }
        p.meDirty = true; return { result: res, info: oba.obaInfo(this.ctx, p) };
      }
      case 'inscription': return { frags: this.ctx.db.worldGet('frags', 0), thresholds: INSCRIPTIONS };
      case 'lang': d.lang = a.lang === 'en' ? 'en' : 'tr'; return null;
      case 'reroll': {
        this.alive(p); this.near(p, HUB.demirci, HUB.interactDemirci);
        const f = this.findItem(p, a.id); if (!f) throw new GameError('no_item'); const it = f.it;
        const isBase = a.line === 'base'; const li = isBase ? -1 : Math.floor(Number(a.line));
        if (isBase ? !it.base : !(li >= 0 && li < it.ench.length)) throw new GameError('bad_line');
        const targeted = typeof a.key === 'string' && a.key.length > 0; const cost = rerollCost(it, isBase, targeted);
        if (d.gold < cost) throw new GameError('no_gold');
        const taken = new Set<string>([...(it.base && !isBase ? [it.base.k] : []), ...it.ench.filter((_, i) => i !== li).map((e) => e.k)]);
        const pool = (isBase ? BASE_ENCH_POOL[it.slot] : ENCH_KEYS).filter((k) => !taken.has(k) && (isBase ? k !== it.base!.k : k !== it.ench[li].k));
        let key: EnchKey; if (targeted) { if (!pool.includes(a.key)) throw new GameError('bad_key'); key = a.key; } else { if (!pool.length) throw new GameError('bad_line'); key = pool[Math.floor(this.ctx.rng() * pool.length)]; }
        const [lo, hi] = ENCH_TABLE[key]; const line = { k: key, v: Math.round((lo + (hi - lo) * this.ctx.rng()) * 10) / 10 };
        d.gold -= cost; if (isBase) it.base = line; else it.ench[li] = line; it.rr = (it.rr ?? 0) + 1;
        this.ledger(p, 'reroll', { item: it.id, line: a.line, key, v: line.v, gold: cost, targeted, n: it.rr });
        this.recalc(p); p.meDirty = true; this.save(p); return { line, cost, rr: it.rr };
      }
      case 'market.browse': case 'market.mine': case 'market.claim': case 'market.list': case 'market.cancel': case 'market.buy': return marketRpc(this, p, op, a);
      case 'gm': { if (p.role !== 'admin') throw new GameError('forbidden'); const out = runGm(this, p, String(a.line ?? '')); this.ledger(p, 'gm', { line: String(a.line ?? '').slice(0, 200) }); p.meDirty = true; return out; }
      case 'stone': {
        const n = Math.floor(a.n); const st = genStones().find((s) => s.n === n); if (!st) throw new GameError('bad_stone');
        this.alive(p); this.near(p, st, 6);
        if (n === 8 && d.clues.filter((c) => c.startsWith('stone.') && c !== 'stone.8').length < STONE_LAST_NEEDS) throw new GameError('stone_locked', { n: STONE_LAST_NEEDS });
        const isNew = this.discoverClue(p, `stone.${n}`, STONE_REWARD_GOLD);
        return { isNew };
      }
      case 'elder': {
        this.alive(p); this.near(p, HUB.akSakal, HUB.interactAkSakal + 3);
        const got: string[] = []; ELDER_LEVELS.forEach((lv, i) => { if (d.level >= lv && this.discoverClue(p, `elder.${i + 1}`)) got.push(`elder.${i + 1}`); });
        return { got };
      }
      case 'dreamSeen': {
        const n = d.pendingDream; if (!n) return null; d.pendingDream = 0; this.discoverClue(p, `dream.${n}`); return null;
      }
      default: throw new GameError('bad_op');
    }
  }

  upgrade(p: Player, a: { id: string; book?: boolean; charm?: boolean }) {
    this.alive(p); this.near(p, HUB.demirci, HUB.interactDemirci);
    const f = this.findItem(p, a.id); if (!f) throw new GameError('no_item');
    const it = f.it;
    if (it.up >= 9) throw new GameError('max_up');
    const target = it.up + 1;
    const cost = upgradeCost(target, it.ilvl);
    const d = p.d;
    if (d.gold < cost.gold) throw new GameError('no_gold');
    if (d.bag.ore < cost.ore) throw new GameError('no_ore');
    if (a.book && d.bag.book < 1) throw new GameError('no_book');
    if (a.charm) { if (d.bag.charm < 1) throw new GameError('no_charm'); if (target < UPGRADE_DESTROYS_FROM) throw new GameError('charm_useless'); }
    const rate = Math.min(100, UPGRADE_RATE[target] + (a.book ? BOOK_BONUS : 0));
    d.gold -= cost.gold; d.bag.ore -= cost.ore;
    if (a.book) d.bag.book--; if (a.charm) d.bag.charm--;
    const roll = this.ctx.rng() * 100;
    const success = roll < rate;
    let destroyed = false;
    if (success) { it.up = target; d.counters.upgrades++; this.tutorial(p, 'upgrade'); }
    else if (target >= UPGRADE_DESTROYS_FROM && !a.charm) {
      destroyed = true; d.counters.destroyed++;
      if (f.where === 'bag') d.items.splice(d.items.indexOf(it), 1); else delete d.equip[it.slot];
    }
    this.ledger(p, 'upgrade', { item: it.id, target, rate, success, destroyed, gold: cost.gold, ore: cost.ore, book: !!a.book, charm: !!a.charm });
    this.recalc(p);
    this.save(p); // kritik ekonomi işlemi: hemen yaz
    return { success, destroyed, rate, target, protectedByCharm: !success && !destroyed && target >= UPGRADE_DESTROYS_FROM };
  }

  craft(p: Player, a: { kind: string; slot?: Slot }) {
    this.alive(p); this.near(p, HUB.demirci, HUB.interactDemirci);
    const d = p.d; const o = oba.loadOymak(this.ctx, p.oymakId);
    switch (a.kind) {
      case 'book': {
        const B = CRAFT.book; if (d.bag.ore < B.ore || d.gold < B.gold) throw new GameError('no_materials');
        d.bag.ore -= B.ore; d.gold -= B.gold; d.bag.book++; this.ledger(p, 'craft', { kind: 'book', gold: B.gold, ore: B.ore }); break;
      }
      case 'charm': {
        if (o.lv.demir < 2) throw new GameError('demir_low', { lvl: 2 });
        const C = CRAFT.charm; if (d.bag.ore < C.ore || d.bag.hide < C.hide || d.gold < C.gold) throw new GameError('no_materials');
        d.bag.ore -= C.ore; d.bag.hide -= C.hide; d.gold -= C.gold; d.bag.charm++; this.ledger(p, 'craft', { kind: 'charm', gold: C.gold, ore: C.ore, hide: C.hide }); break;
      }
      case 'gear': {
        const slot = a.slot; if (!slot || !['weapon', 'armor', 'helmet', 'amulet'].includes(slot)) throw new GameError('bad_slot');
        const G = CRAFT.gear; const gold = G.goldBase + G.goldPerLevel * d.level;
        if (d.bag.ore < G.ore || d.bag.hide < G.hide || d.bag.wood < G.wood || d.gold < gold) throw new GameError('no_materials');
        if (d.items.length >= BAG_SIZE) throw new GameError('bag_full');
        d.bag.ore -= G.ore; d.bag.hide -= G.hide; d.bag.wood -= G.wood; d.gold -= gold;
        const it = makeItem(this.ctx.rng, slot, d.level, this.ctx.rng() < 0.1 ? 2 : 1); d.items.push(it);
        this.ledger(p, 'craft', { kind: 'gear', slot, gold, tier: it.tier }); break;
      }
      default: throw new GameError('bad_craft');
    }
    p.meDirty = true; return null;
  }

  // ───────────── sohbet ─────────────
  chat(p: Player, m: { ch: string; text: string; to?: string }) {
    let text = String(m.text ?? '').trim().slice(0, 140); if (!text) return;
    for (const w of BAD_WORDS) text = text.replace(new RegExp(w, 'gi'), '*'.repeat(w.length));
    const msg: ChatMsg = { ch: m.ch as ChatMsg['ch'], from: p.name, boy: p.boy, text };
    if (m.ch === 'near') { for (const q of this.players.values()) if (dist(p, q) <= 45) q.send('chat', msg); }
    else if (m.ch === 'boy') { for (const w of this.ctx.worlds) for (const q of w.players.values()) if (q.boy === p.boy) q.send('chat', msg); }
    else if (m.ch === 'oymak') { for (const w of this.ctx.worlds) for (const q of w.players.values()) if (q.oymakId === p.oymakId) q.send('chat', msg); }
    else if (m.ch === 'whisper') {
      for (const w of this.ctx.worlds) for (const q of w.players.values()) if (q.name.toLowerCase() === String(m.to).toLowerCase()) { q.send('chat', msg); p.send('chat', { ...msg, from: '→ ' + q.name }); return; }
      this.sys(p, 'sys.no_player');
    }
  }

  endDuel(a: Player, winner: Player | null) {
    const b = this.players.get(a.duelWith); a.duelWith = 0; if (b) b.duelWith = 0;
    if (winner) { this.sys(winner, 'sys.duel_won'); this.sys(a, 'sys.duel_lost'); }
  }

  // ───────────── ana döngü ─────────────
  tick(dtReal: number) {
    const t0 = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, dtReal));
    const now = this.now;
    this.tickCount++;
    this.updatePlayers(dt, now);
    this.updateMobs(dt, now);
    this.updateRifts(now); updateDungeons(this, now);
    if (this.tickCount % 100 === 0) for (const q of this.players.values()) tickCostumes(this, q);
    this.updateDrops(now);
    this.updateGuards(now);
    this.marketTick(now);
    if (!this.ctx.cfg.headless && this.tickCount % (TICK_HZ * 5) === 0) this.broadcastCampOcc();
    if (this.ctx.cfg.headless) this.events = []; else this.sendSnapshots(now);
    if (now - this.lastSave > 10000) { this.lastSave = now; for (const p of this.players.values()) { p.d.x = p.x; p.d.z = p.z; p.d.hp = p.hp; this.flushGold(p); this.save(p); } }
    const ms = performance.now() - t0;
    this.tickMsSum += ms; this.tickMsN++; if (ms > this.tickMsMax) this.tickMsMax = ms;
  }

  /** pazar: satışı olan çevrimiçi satıcıya postayı hemen teslim et; süresi dolan ilanları kapat (dakikada bir) */
  marketTick(now: number) {
    if (this.ctx.mailFlag.size) for (const p of this.players.values()) if (this.ctx.mailFlag.delete(p.dbId)) { const r = claimMail(this, p); if (r.gold) this.sys(p, 'sys.market_sold', { gold: r.gold }); }
    if (now - this.lastMarketExpire > 60000) { this.lastMarketExpire = now; for (const e of this.ctx.db.marketExpire(now)) this.ctx.mailFlag.add(e.sellerId); }
  }

  /** kamp başına oyuncu sayısı (yalnızca ≥1 olanlar); istemci mini haritada gösterir: kalabalık bilgisi oyuncunun baktığı yerde */
  campOccupancy(): number[] {
    const occ = this.camps.map(() => 0);
    for (const p of this.players.values()) { if (p.deadUntil > 0) continue; for (const c of this.camps) if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 < 20 * 20) { occ[c.id]++; break; } }
    return occ;
  }
  broadcastCampOcc() { const occ = this.campOccupancy(); for (const p of this.players.values()) p.send('camps', occ); }

  updatePlayers(dt: number, now: number) {
    for (const p of this.players.values()) {
      // hız sınırı penceresi
      p.rate.win += dt; if (p.rate.win >= 1) { p.rate.win = 0; p.rate.msgs = 0; p.rate.rpcs = 0; p.rate.chat = 0; }
      if (p.duelInvite && now - p.duelInvite.at > 30000) p.duelInvite = null;
      if (p.deadUntil > 0) { if (now - p.deadUntil > 7000) { try { this.respawn(p); } catch { /* */ } } continue; }
      // durumlar
      this.tickStatus(p, dt, now);
      if (p.deadUntil > 0) continue;
      const stunned = this.hasStatus(p, 'stun');
      if (now - p.lastInput > 450) { p.dirx = 0; p.dirz = 0; }
      if (!stunned && (p.dirx !== 0 || p.dirz !== 0)) {
        const sp = p.stats.moveSpeed * (this.hasStatus(p, 'slow') ? 0.5 : 1);
        stepMove(p, p.dirx, p.dirz, sp, dt);
        p.rot = Math.atan2(p.dirx, p.dirz);
      }
      // otomatik saldırı
      const moving = p.dirx !== 0 || p.dirz !== 0;
      if (p.atk && !stunned && now >= p.nextAtk && !(moving && p.stats.range > RANGED_MIN_RANGE)) this.autoAttack(p, now);
      // yenilenme
      const ooc = now - p.lastCombat > 5000;
      if (ooc && p.hp < p.stats.maxHp) {
        const inHub = zoneAt(p.x, p.z) === 'safe';
        const pct = (inHub ? 0.08 : 0.02) * p.stats.heal;
        p.regenAcc += p.stats.maxHp * pct * dt;
        if (p.regenAcc >= 1) { const h = Math.floor(p.regenAcc); p.regenAcc -= h; p.hp = Math.min(p.stats.maxHp, p.hp + h); }
      }
      if (p.duelWith) { const q = this.players.get(p.duelWith); if (!q || dist(p, q) > 45) this.endDuel(p, null); }
    }
  }

  tickStatus(t: Player | Mob, dt: number, now: number) {
    const po = t.status.poison;
    if (po) {
      if (po.until <= now) delete t.status.poison;
      else {
        t.poisonAcc += dt;
        if (t.poisonAcc >= 1) {
          t.poisonAcc -= 1;
          const src = po.by ? this.players.get(po.by) ?? null : null;
          this.damage(src, t, po.dps ?? 5, { dot: true });
        }
      }
    }
    for (const s of ['stun', 'slow', 'curse', 'shield'] as StatusKey[]) { const x = t.status[s]; if (x && x.until <= now) delete t.status[s]; }
  }

  autoAttack(p: Player, now: number) {
    const range = p.stats.range;
    let best: Player | Mob | null = null; let bd = range * range;
    if (p.focus) {
      const f = this.mobs.get(p.focus) ?? this.players.get(p.focus);
      if (f && f.kind === 'mob' && !f.dead && this.canHitMob(p, f) && dist2(p, f) <= (range + 1) ** 2) best = f;
      else if (f && f.kind === 'player' && this.canHitPlayer(p, f, true) && dist2(p, f) <= (range + 1) ** 2) best = f;
    }
    if (!best) {
      for (const m of this.mobs.values()) { if (m.dead || !this.canHitMob(p, m)) continue; const d = dist2(p, m); if (d < bd) { bd = d; best = m; } }
    }
    if (!best && p.duelWith) { const q = this.players.get(p.duelWith); if (q && dist2(p, q) <= range * range) best = q; }
    if (!best) return;
    p.nextAtk = now + p.stats.atkInterval * 1000;
    p.rot = Math.atan2(best.x - p.x, best.z - p.z);
    this.emit({ k: 'swing', id: p.id, tx: best.x, tz: best.z }, p.x, p.z);
    this.playerHit(p, best, 1);
  }

  updateMobs(dt: number, now: number) {
    const active = new Set<string>(); for (const p of this.players.values()) { const g = regionAt(p.x, p.z); if (g) active.add(g.id); }
    for (const m of this.mobs.values()) {
      if (m.dummy) continue;
      if (m.dead) { if (m.campId >= 0 && now >= m.respawnAt) this.respawnMob(m); else if (m.bossId && now >= m.respawnAt) this.respawnBoss(m); continue; }
      if (!active.has(m.reg)) { // boş bölge: yaratıklar bekler, yaralılar eve döner ve iyileşir
        if (m.target || m.hp < m.maxHp || m.x !== m.hx || m.z !== m.hz) { m.target = 0; m.hp = m.maxHp; m.x = m.hx; m.z = m.hz; m.status = {}; m.contrib.clear(); }
        continue;
      }
      const def = MOBS[m.type];
      this.tickStatus(m, dt, now);
      if (m.dead) continue;
      if (this.hasStatus(m, 'stun')) continue;
      // hedef
      let tgt = m.target ? this.players.get(m.target) : undefined;
      if (tgt && (tgt.deadUntil > 0 || zoneAt(tgt.x, tgt.z) === 'safe' || dist(tgt, { x: m.hx, z: m.hz }) > m.leash + 8)) { tgt = undefined; m.target = 0; }
      if (!tgt) {
        const aggro = m.dun ? 120 : m.bossId ? FIELD_BOSS.aggro : def.aggro; let bd = aggro * aggro; let b: Player | undefined;
        for (const p of this.players.values()) {
          if (p.deadUntil > 0 || zoneAt(p.x, p.z) === 'safe') continue;
          const d = dist2(p, m); if (d < bd) { bd = d; b = p; }
        }
        if (b) { tgt = b; m.target = b.id; }
      }
      let speed = def.speed * (this.hasStatus(m, 'slow') ? 0.5 : 1);
      if (m.bossId) this.bossSpecial(m, tgt, now);
      if (tgt) {
        const d = dist(m, tgt);
        m.rot = Math.atan2(tgt.x - m.x, tgt.z - m.z);
        if (d > def.range * 0.85) {
          const dx = (tgt.x - m.x) / d, dz = (tgt.z - m.z) / d;
          stepMove(m, dx, dz, speed, dt, 0.5, true);
        }
        if (d <= def.range + 0.3 && now >= m.nextAtk) {
          m.nextAtk = now + (def.atkInterval / (m.bossId && m.hp < m.maxHp * FIELD_BOSS.enrageBelow ? FIELD_BOSS.enrageAtkSpeed : 1)) * 1000;
          this.emit({ k: 'swing', id: m.id, tx: tgt.x, tz: tgt.z }, m.x, m.z);
          let dmg = hitDamage(m.atk * lvlDiffIn(m.lvl - tgt.d.level), 1, tgt.stats.def, false, this.hasStatus(m, 'curse'), 0.92 + this.ctx.rng() * 0.16);
          const df = applyDefense(tgt.stats, m.bossId ? FIELD_BOSS.list[m.bossId - 1][1] : def.kind, false, 0, 1, this.ctx.rng());
          let dealt = 0;
          if (df.blocked && !tgt.god) { tgt.lastCombat = now; this.emit({ k: 'dmg', id: tgt.id, v: 0, blk: true, src: m.id, pl: true }, tgt.x, tgt.z); }
          else { dmg = Math.max(1, Math.round(dmg * df.mult)); dealt = this.damage(m, tgt, dmg); }
          if (def.onHit && dealt > 0 && tgt.deadUntil === 0 && this.ctx.rng() < def.onHit.chance) this.applyStatus(tgt, def.onHit.status, def.onHit.dur, def.onHit.status === 'poison' ? { dps: m.atk * 0.18, by: 0 } : undefined);
        }
        if (dist(m, { x: m.hx, z: m.hz }) > m.leash) { m.target = 0; }
      } else {
        // eve dön / gezin
        const dh = dist(m, { x: m.hx, z: m.hz });
        if (dh > 3) {
          const dx = (m.hx - m.x) / dh, dz = (m.hz - m.z) / dh;
          stepMove(m, dx, dz, speed * 1.3, dt, 0.5, true); m.rot = Math.atan2(dx, dz);
          if (m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.1 * dt);
        } else if (now > m.wanderAt) {
          m.wanderAt = now + 2500 + this.ctx.rng() * 4000;
          const a = this.ctx.rng() * 6.283; m.wx = m.hx + Math.cos(a) * 2.5; m.wz = m.hz + Math.sin(a) * 2.5;
        } else {
          const dw = dist(m, { x: m.wx, z: m.wz });
          if (dw > 0.4) { const dx = (m.wx - m.x) / dw, dz = (m.wz - m.z) / dw; stepMove(m, dx, dz, speed * 0.35, dt, 0.5, true); m.rot = Math.atan2(dx, dz); }
        }
      }
    }
  }

  // ───────────── Erlik çatlakları ─────────────
  riftPlayers(r: Rift, radius: number) {
    const out: Player[] = [];
    for (const p of this.players.values()) if (p.deadUntil === 0 && dist(p, r) <= radius) out.push(p);
    return out;
  }
  openRift() {
    // çatlak, içinde oyuncu olan çatlaklı bölgelerden birinde açılır (Bozkır/Erlik Diyarı)
    const regs = new Set<string>(); for (const p of this.players.values()) { const g = regionAt(p.x, p.z); if (g && MAPS[g.map].rifts) regs.add(g.id); }
    const pool = regs.size ? [...regs] : ['bozkir']; const g = regionById(pool[Math.floor(this.ctx.rng() * pool.length)]);
    for (let i = 0; i < 40; i++) {
      const a = this.ctx.rng() * 6.283; const d = g.id === 'bozkir' ? range(this.ctx.rng, RIFT.minDist, RIFT.maxDist) : range(this.ctx.rng, g.safeR + 30, g.r - 20);
      const x = g.cx + Math.cos(a) * d, z = g.cz + Math.sin(a) * d;
      let ok = true; for (const r of this.rifts.values()) if (dist(r, { x, z }) < 50) ok = false;
      if (!ok) continue;
      const r: Rift = { id: this.nid(), x, z, state: 0, wave: 0, mobs: new Set(), openedAt: this.now, lvl: 1, contrib: new Map(), totalHp: 1, scale: 1, closedAt: 0, gapUntil: 0 };
      this.rifts.set(r.id, r);
      this.emit({ k: 'rift', st: 'open', x, z }, x, z);
      for (const p of this.players.values()) if (regionAt(p.x, p.z)?.id === g.id) this.sys(p, 'sys.rift_open', { d: Math.round(d) });
      return r;
    }
    return null;
  }
  spawnWave(r: Rift, boss: boolean) {
    const near = this.riftPlayers(r, 45);
    const n = Math.max(1, near.length);
    r.lvl = Math.max(3, Math.min(45, Math.round(near.length ? near.reduce((s, p) => s + p.d.level, 0) / near.length : r.lvl)));
    r.scale = 1 + RIFT.hpPerExtra * (n - 1);
    const dd = Math.hypot(r.x, r.z); const types = campTypes(dd);
    if (boss) {
      const m = this.makeMob('bekci', r.lvl, r.x + 4, r.z, -1, r.id, r.scale * RIFT.guardianHpMult);
      m.hx = r.x; m.hz = r.z; r.mobs.add(m.id);
    } else {
      const count = RIFT.waveBase + RIFT.wavePerPlayer * (n - 1) + r.wave;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 6.283 + this.ctx.rng(); const d = 6 + this.ctx.rng() * 6;
        const m = this.makeMob(types[Math.floor(this.ctx.rng() * types.length)], r.lvl, r.x + Math.cos(a) * d, r.z + Math.sin(a) * d, -1, r.id, r.scale);
        m.hx = r.x; m.hz = r.z; m.leash = 45; r.mobs.add(m.id);
        // çatlak yaratıkları otomatik katılımcıya saldırır
        const t = near[i % near.length]; if (t) m.target = t.id;
      }
    }
    r.state = boss ? 2 : 1;
    this.emit({ k: 'rift', st: boss ? 'boss' : 'wave', x: r.x, z: r.z, wave: r.wave }, r.x, r.z);
  }
  closeRift(r: Rift) {
    r.state = 3; r.closedAt = this.now;
    this.emit({ k: 'rift', st: 'closed', x: r.x, z: r.z }, r.x, r.z);
    const rng = this.ctx.rng;
    for (const [pid, dmg] of r.contrib) {
      const p = this.players.get(pid); if (!p || dmg <= 0 || dist(p, r) > 70) continue;
      const tier = rollTier(rng, 1, 1.2);
      const it = makeItem(rng, randomSlot(rng), r.lvl, tier);
      this.spawnDrop(p, 'item', r.x, r.z, { item: it, t: it.tier, m: it.slot });
      const gold = Math.round(mobGold(r.lvl) * RIFT.rewardGoldMult * (0.8 + rng() * 0.4));
      for (let i = 0; i < 4; i++) this.spawnDrop(p, 'gold', r.x, r.z, { amount: Math.round(gold / 4) });
      this.spawnDrop(p, 'mat', r.x, r.z, { m: 'ore', amount: irange(rng, 4, 8) });
      this.spawnDrop(p, 'mat', r.x, r.z, { m: 'hide', amount: irange(rng, 2, 5) });
      if (rng() < 0.45) this.spawnDrop(p, 'book', r.x, r.z);
      if (rng() < 0.25) this.spawnDrop(p, 'charm', r.x, r.z);
      if (rng() < 0.35) this.spawnDrop(p, 'frag', r.x, r.z);
      this.addXp(p, mobXp(r.lvl) * RIFT.rewardXpMult, false);
      p.d.shards++; SHARD_AT.forEach((at, i) => { if (p.d.shards >= at) this.discoverClue(p, `shard.${i + 1}`); });
      this.ledger(p, 'rift.reward', { rift: r.id, lvl: r.lvl, tier, gold });
      this.sys(p, 'sys.rift_closed', {});
    }
  }
  updateRifts(now: number) {
    if (now >= this.nextRiftAt && this.rifts.size < RIFT.maxActive && this.players.size > 0) {
      this.openRift();
      this.nextRiftAt = now + range(this.ctx.rng, this.ctx.cfg.riftEvery[0], this.ctx.cfg.riftEvery[1]) * 1000;
    } else if (now >= this.nextRiftAt) {
      this.nextRiftAt = now + 15000;
    }
    for (const r of [...this.rifts.values()]) {
      if (r.state === 3) { if (now - r.closedAt > 12000) this.rifts.delete(r.id); continue; }
      if (now - r.openedAt > RIFT.lifeSec * 1000) {
        for (const id of r.mobs) this.mobs.delete(id);
        this.emit({ k: 'rift', st: 'fail', x: r.x, z: r.z }, r.x, r.z); this.rifts.delete(r.id); continue;
      }
      if (r.state === 0) {
        if (this.riftPlayers(r, RIFT.activateR).length) { r.wave = 1; this.spawnWave(r, false); }
      } else if (r.mobs.size === 0) {
        if (r.state === 2) { this.closeRift(r); continue; }
        // dalgalar arası nefes: katılımcılar can yüzdesi kazanır, sonra bir sonraki dalga gelir
        if (!r.gapUntil) {
          r.gapUntil = now + RIFT.waveGapSec * 1000;
          for (const p of this.riftPlayers(r, RIFT.rewardR)) { if (p.deadUntil > 0) continue; p.hp = Math.min(p.stats.maxHp, p.hp + Math.round(p.stats.maxHp * RIFT.gapHealPct)); p.meDirty = true; }
        } else if (now >= r.gapUntil) {
          r.gapUntil = 0;
          if (r.wave >= RIFT.waves) this.spawnWave(r, true); else { r.wave++; this.spawnWave(r, false); }
        }
      }
    }
  }

  updateDrops(now: number) {
    const dt = 1 / TICK_HZ;
    for (const [id, dr] of this.drops) {
      const p = this.players.get(dr.owner);
      if (!p) { this.drops.delete(id); continue; }
      const age = now - dr.born;
      if (p.deadUntil === 0 && age > 700) {
        const d = Math.sqrt(dist2(p, dr));
        if (d < 1.6) { if (this.collectDrop(p, dr)) this.drops.delete(id); continue; }
        if (d < 10) { // ganimet mıknatısı: yakındaki ganimet oyuncuya akar
          const sp = Math.min(d, 8 + (10 - d) * 2.2) * dt * 2.2; dr.x += ((p.x - dr.x) / d) * sp; dr.z += ((p.z - dr.z) / d) * sp;
        }
      }
      if (age > 45000) {
        if (dr.k !== 'item' || p.d.items.length < BAG_SIZE) this.collectDrop(p, dr);
        this.drops.delete(id);
      }
    }
  }

  updateGuards(now: number) {
    if (this.tickCount % TICK_HZ !== 0) return;
    for (const p of this.players.values()) {
      if (p.deadUntil > 0 || p.d.rank >= 0 || zoneAt(p.x, p.z) !== 'safe') continue;
      for (const g of HUB.guards) {
        if (dist(p, g) < 34) {
          this.emit({ k: 'guard', x: g.x, z: g.z, tx: p.x, tz: p.z }, g.x, g.z);
          this.damage(null, p, p.stats.maxHp * 0.3);
          break;
        }
      }
    }
    void now;
  }

  // ───────────── ağ ─────────────
  buildMe(p: Player): Me {
    const d = p.d; const now = this.now;
    const o = oba.loadOymak(this.ctx, p.oymakId);
    const frags = this.ctx.db.worldGet('frags', 0);
    return {
      name: p.name, boy: p.boy, level: d.level, xp: d.xp, xpNext: d.level >= MAX_LEVEL ? KUT_PER_POINT : xpToNext(d.level), kut: d.kut, gold: d.gold, spec: d.spec,
      hp: Math.round(p.hp), stats: p.stats, skillRanks: d.skillRanks, skillPts: d.skillPts, bag: d.bag, items: d.items, equip: d.equip,
      rested: Math.round(d.rested), restedCap: restedCap(d.level), pvp: !!d.pvp, dun: dunInfo(this, p), cos: cosOf(p), rank: d.rank, points: p.points, oymakId: p.oymakId, oymakName: o.name,
      companions: d.companions, expeditions: d.expeditions, tut: d.tut, lang: d.lang,
      cds: p.cds.map((c) => Math.max(0, (c - now) / 1000)), dead: p.deadUntil > 0 ? Math.max(0, (p.deadUntil - now) / 1000) : 0,
      inscr: { frags, unlocked: INSCRIPTIONS.filter((t) => frags >= t).length, thresholds: INSCRIPTIONS },
      role: p.role, clues: d.clues, shards: d.shards, pendingDream: d.pendingDream, god: p.god,
    };
  }
  sendMe(p: Player) { p.send('me', this.buildMe(p)); p.meDirty = false; p.lastMeAt = this.now; }

  sendSnapshots(now: number) {
    const evs = this.events; this.events = [];
    for (const p of this.players.values()) {
      if ((p.meDirty && now - p.lastMeAt > 200) || now - p.lastMeAt > 4000) this.sendMe(p);
      const players: Snapshot['players'] = [];
      for (const q of this.players.values()) {
        if (q === p || dist2(p, q) > AOI_R * AOI_R) continue;
        let f = this.flags(q); if (q.deadUntil > 0) f |= F.DEAD; if (q.atk) f |= F.ATK; if (q.d.rank < 0) f |= F.RED; if (q.duelWith) f |= F.DUEL; if (this.pvpActive(q)) f |= F.PVP;
        players.push({ cs: costumeCode(q.d.cos?.worn && this.now < q.d.cos.worn.expiresAt ? q.d.cos.worn : null), i: q.id, n: q.name, b: BOY_ID[q.boy], l: q.d.level, x: r2(q.x), z: r2(q.z), r: r2(q.rot), h: Math.round(q.hp), H: q.stats.maxHp, f, sp: q.d.spec === 'kalkan' ? 1 : q.d.spec === 'kilic' ? 2 : 0, oy: '' });
      }
      const mobs: Snapshot['mobs'] = [];
      for (const m of this.mobs.values()) {
        if (m.dead || dist2(p, m) > AOI_R * AOI_R) continue;
        mobs.push({ i: m.id, t: m.type, l: m.lvl, x: r2(m.x), z: r2(m.z), r: r2(m.rot), h: Math.round(m.hp), H: m.maxHp, f: this.flags(m), ...(m.bossId ? { b: m.bossId } : {}) });
      }
      const rifts: Snapshot['rifts'] = [];
      for (const r of this.rifts.values()) {
        if (dist2(p, r) > 170 * 170) continue;
        let h = 0, H = 0; for (const id of r.mobs) { const m = this.mobs.get(id); if (m) { h += m.hp; H += m.maxHp; } }
        rifts.push({ i: r.id, x: r2(r.x), z: r2(r.z), w: r.wave, st: r.state, h: Math.round(h), H: Math.round(H) });
      }
      const drops: Snapshot['drops'] = [];
      for (const dr of this.drops.values()) if (dr.owner === p.id) drops.push({ i: dr.id, k: dr.k, x: r2(dr.x), z: r2(dr.z), t: dr.t, a: now - dr.born, m: dr.m, o: 1 });
      const ev: GameEvent[] = [];
      for (const e of evs) if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 < (AOI_R + 10) ** 2) ev.push(e.ev);
      let yf = this.flags(p); if (p.deadUntil > 0) yf |= F.DEAD; if (p.atk) yf |= F.ATK;
      p.send('snap', {
        t: now, ack: p.lastAck, you: { x: r2(p.x), z: r2(p.z), r: r2(p.rot), hp: Math.round(p.hp), f: yf },
        players, mobs, rifts, drops, ev, pop: this.players.size,
      } satisfies Snapshot);
    }
  }

  // Hız sınırlayıcı (oda tarafından çağrılır)
  allow(p: Player, kind: 'msgs' | 'rpcs' | 'chat'): boolean {
    if (!this.ctx.cfg.rateLimit) return true;
    const limit = kind === 'msgs' ? RATE.msgPerSec : kind === 'rpcs' ? RATE.rpcPerSec : RATE.chatPerSec;
    p.rate[kind]++;
    if (p.rate[kind] > limit) { p.dropped++; return false; }
    return true;
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
