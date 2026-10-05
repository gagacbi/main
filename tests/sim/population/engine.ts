/**
 * Nüfus simülasyonu motoru. Gerçek World/DB/RPC kodu çalışır; zaman şu yollarla hızlandırılır (gerçekliği korumak için dürüstçe):
 *  1) Günde 4 gerçek-zamanlı DİLİM (gece/sabah/ikindi/akşam) çalıştırılır: o dilimde çevrimiçi olan herkes AYNI dünyada gerçek tick'lerle oynar
 *     (kalabalık, boss, çatlak, PvP, pazar gerçektir). Dilimler arası çevrimdışı süre gerçek saat sıçramasıyla geçer (dinlenmiş XP, rüya, oba).
 *  2) Her oyuncunun günlük süresinin dilim dışında kalan kısmı, ölçülen farm hızıyla (öldürme/dk, ölüm/dk) ölçeklenir ve GERÇEK ödül
 *     tablolarıyla (rollDrops, addXp) işlenir. Boss/çatlak/PvP ölçeklenmez: yalnızca gerçek dilimlerde yaşanır.
 */
import { DEATH_XP_LOSS, MAX_LEVEL, MOBS, SKILLS, mobXp, newId, xpToNext, type Item, type Slot } from '../../../shared/game';
import { makeItem } from '../../../shared/game';
import { mulberry32 } from '../../../shared/rng';
import { genBosses, type Camp } from '../../../shared/world';
import type { Mob, Player } from '../../../server/world';
import { makeRig, type Rig } from '../rig';
import { Agent, DEFAULT_ORDER, type DayRec, type Params } from './agent';
import { ARCHS, specOf, type Arch } from './archetypes';
import { MarketModel } from './market-model';

export const SLICES = [{ hour: 4, gapH: 7 }, { hour: 11, gapH: 6 }, { hour: 17, gapH: 4 }, { hour: 21, gapH: 7 }];
export interface SliceLog { day: number; slice: number; online: number; riftsOpened: number; riftsClosed: number; riftsFailed: number; bossKills: number; occBuckets: Record<string, { n: number; rate: number }>; campUse: Record<number, number>; tickMs: number }

export class Engine {
  rig: Rig; rng: () => number; day = 0; agents: Agent[] = []; occupancy = new Map<number, number>(); market: MarketModel;
  byPid = new Map<number, Agent>(); byDb = new Map<number, Agent>(); sliceLogs: SliceLog[] = []; ledgerMark = 0;
  stats = { crafted: 0, craftGold: 0, lostBagFull: 0, rerolls: 0, rerollGold: 0 }; bossFights: { day: number; boss: number; sec: number; deaths: number; participants: number }[] = []; pvpLog: { day: number; k: number; v: number; dl: number }[] = [];
  econ: { day: number; supply: number; sources: Record<string, number>; sinks: Record<string, number>; mkt: { sales: number; volume: number; tax: number; fees: number; listed: number; avgRatio: number }; gini: number }[] = [];
  private bossStart = new Map<number, number>(); private bossDeaths = new Map<number, number>(); private riftOpen = 0; private riftDone = 0; private riftFail = 0;
  constructor(public seed: number, public n: number, public W = 10) {
    this.rng = mulberry32(seed ^ 0x51ed); this.rig = makeRig(seed, { headless: true, spawnCamps: true, riftEvery: [150, 300] }); this.market = new MarketModel(this); this.seedAgents(); this.instrument();
  }
  // ───────────── kuruluş ─────────────
  private pickArch(): Arch { let t = this.rng() * ARCHS.reduce((s, a) => s + a.weight, 0); for (const a of ARCHS) if ((t -= a.weight) < 0) return a; return ARCHS[0]; }
  private range([a, b]: [number, number]) { return a + this.rng() * (b - a); }
  private seedAgents() {
    const w = this.rig.world; const r = this.rng;
    for (let i = 0; i < this.n; i++) {
      const arch = this.pickArch(); const boy = (['gok', 'yer', 'ay'] as const)[i % 3]; const L = Math.round(this.range(arch.start));
      const par: Params = {
        skill: this.range(arch.skill), retreat: this.range(arch.retreat), offset: Math.round(this.range(arch.offset)), safeUp: arch.upgrade.safeUp, riskUp: arch.upgrade.riskUp, charm: arch.upgrade.charm, book: arch.upgrade.book,
        defAware: r() < arch.defAware, smartWeapon: r() < arch.smartWeapon, spec: specOf(arch, r), sellP: arch.market.sell, buyP: arch.market.buy, fightBack: r() < arch.pvp.fightBack,
        skillOrder: r() < 0.7 ? DEFAULT_ORDER : [...DEFAULT_ORDER].sort(() => r() - 0.5), obaDil: arch.oba, readsMap: process.env.POP_NOMAP ? false : r() < 0.5,
      };
      const p = this.rig.add(boy, 'player', (d) => this.seedData(d, L, par, arch));
      // hesap yaşı: tohum oyuncuları eskidir (yeni başlayanlar 48 sa pazar kısıtına takılır)
      this.rig.db.db.prepare('UPDATE players SET created = ? WHERE id = ?').run(L > 6 ? w.now - 40 * 86400000 : w.now - 3600000, p.dbId);
      const a = new Agent(this, i, p.name, arch, par, boy, p.dbId, L); a.p = p; this.agents.push(a); this.byDb.set(p.dbId, a);
      w.leave(p);
    }
  }
  private seedData(d: import('../../../server/types').PlayerData, L: number, par: Params, arch: Arch) {
    const r = this.rng; d.level = L; d.xp = Math.round(r() * 0.6 * xpToNext(Math.min(49, L))); d.spec = L >= 10 ? par.spec : 'none';
    d.skillRanks = SKILLS.map((k) => (L >= k.lvl ? Math.min(6, 1 + Math.floor(L / (arch.key === 'yeni' ? 20 : 8) * (0.5 + r()))) : 1)); d.skillPts = arch.key === 'yeni' ? Math.min(6, Math.floor(L / 2)) : 0;
    const tierRoll = () => { const x = r() * (L > 30 ? 0.8 : 1); return x < 0.04 ? 3 : x < 0.2 ? 2 : x < 0.65 ? 1 : 0; };
    for (const s of ['weapon', 'armor', 'helmet', 'amulet'] as Slot[]) { if (L < 3 && r() < 0.6) continue; let it: Item; for (let k = 0; k < 8; k++) { it = makeItem(r, s, Math.max(1, L - Math.floor(r() * 4)), tierRoll() as 0); if (s !== 'weapon' || !par.smartWeapon || (it.wk !== 'yay' && it.wk !== 'buyu')) break; } it!.up = Math.max(0, Math.min(9, Math.round(this.range([0, Math.min(par.safeUp, 1 + L / 10)])))); it!.lvlReq = Math.min(it!.lvlReq, L); d.equip[s] = it!; }
    d.gold = Math.round(150 + 90 * Math.pow(L, 1.45) * (0.4 + r())); d.bag = { ore: Math.round(L * 3 * r()) + 6, hide: Math.round(L * r()), wood: Math.round(L * r()), book: arch.upgrade.book ? Math.floor(r() * 4) : 0, charm: arch.upgrade.charm ? Math.floor(r() * 3) : 0, frag: 0 };
    for (let i = 0; i < Math.round(r() * 6); i++) d.items.push(makeItem(r, (['weapon', 'armor', 'helmet', 'amulet'] as const)[Math.floor(r() * 4)], Math.max(1, L - Math.floor(r() * 8)), tierRoll() as 0));
    d.loggedOutAt = this.rig.clock.now() - 6 * 3600000; d.rested = Math.round(xpToNext(Math.min(49, L)) * r());
  }
  /** ölçüm kancaları: gerçek World metotlarını sarar (davranışı değiştirmez) */
  private instrument() {
    const w = this.rig.world; const self = this;
    const kill0 = w.killPlayer.bind(w); w.killPlayer = (p, src) => {
      const a = self.byPid.get(p.id);
      if (a) {
        a.tot.deaths++; if (a.activity === 'farm') a.sliceFarmDeaths++;
        const by = src?.kind === 'mob' ? (src.bossId ? 'boss.' + src.bossId : src.type) : src?.kind === 'player' ? 'pl' : 'dot'; a.deathBy[by] = (a.deathBy[by] ?? 0) + 1;
        if (src?.kind === 'player') { a.tot.pvpDeaths++; const k = self.byPid.get(src.id); if (k) { k.tot.pvpKills++; self.pvpLog.push({ day: self.day, k: k.dbId, v: a.dbId, dl: src.d.level - p.d.level }); } }
        if (src?.kind === 'mob' && src.bossId) self.bossDeaths.set(src.bossId, (self.bossDeaths.get(src.bossId) ?? 0) + 1);
        a.frustration += 1;
      }
      kill0(p, src);
    };
    const killMob0 = w.killMob.bind(w); w.killMob = (m: Mob) => {
      if (m.bossId) { const start = self.bossStart.get(m.bossId) ?? w.now; self.bossFights.push({ day: self.day, boss: m.bossId, sec: Math.round((w.now - start) / 1000), deaths: self.bossDeaths.get(m.bossId) ?? 0, participants: m.contrib.size }); for (const pid of m.contrib.keys()) { const a = self.byPid.get(pid); if (a) { a.tot.bossKills++; a.reward('boss'); } } self.bossStart.delete(m.bossId); self.bossDeaths.delete(m.bossId); }
      else { for (const pid of m.contrib.keys()) { const a = self.byPid.get(pid); if (a && a.activity === 'farm') a.sliceFarmKills++; if (a) a.tot.kills++; } }
      killMob0(m);
    };
    const close0 = w.closeRift.bind(w); w.closeRift = (r) => { self.riftDone++; for (const pid of r.contrib.keys()) { const a = self.byPid.get(pid); if (a) { a.tot.riftCloses++; a.reward('rift'); } } close0(r); };
    const open0 = w.openRift.bind(w); w.openRift = () => { const r = open0(); if (r) self.riftOpen++; return r; };
    const emit0 = w.emit.bind(w); w.emit = (ev, x, z) => {
      if (ev.k === 'dmg' && ev.pl) { const a = self.byPid.get(ev.id); if (a) { if (ev.blk) a.tot.blocked++; else { const src = ev.src ? w.mobs.get(ev.src) : undefined; const kind = src ? (src.bossId ? self.bossKind(src.bossId) : MOBS[src.type].kind) : ev.src ? 'pl' : 'dot'; a.dmgByKind[kind] = (a.dmgByKind[kind] ?? 0) + ev.v; } } }
      emit0(ev, x, z);
    };
    const give0 = w.giveItem.bind(w); w.giveItem = (p, it) => { const ok = give0(p, it); const a = self.byPid.get(p.id); if (a && ok && it.tier >= 2) { a.reward('rare'); a.tot.rare++; } return ok; };
    const lvl0 = w.addXp.bind(w); w.addXp = (p, xp, c) => { const before = p.d.level; const r = lvl0(p, xp, c); const a = self.byPid.get(p.id); if (a && p.d.level > before) a.reward('level'); return r; };
  }
  bossKind(id: number) { return ['cift', 'buyu', 'bicak', 'buyu', 'cift'][id - 1]; }

  // ───────────── bir gün ─────────────
  runDay(): void {
    this.day++; const w = this.rig.world; const r = this.rng;
    // günlük program: hangi dilimlerde, kaç dakika
    const plan = this.agents.map((a) => { const total = this.range(a.arch.minutes); const chosen = a.arch.slices.map((p) => r() < p); if (!chosen.some(Boolean)) chosen[2] = true; const k = chosen.filter(Boolean).length; return { a, mins: chosen.map((c) => (c ? total / k : 0)) }; });
    // gün başı kayıt çıpası
    for (const a of this.agents) { (a as any).__day = { kills0: a.tot.kills + a.tot.extraKills, deaths0: a.tot.deaths + a.tot.extraDeaths, boss0: a.tot.bossKills, rift0: a.tot.riftCloses, pk0: a.tot.pvpKills, pd0: a.tot.pvpDeaths, up0: a.tot.upgradesOk, ds0: a.tot.destroyed, min0: a.tot.minutes, ledger0: this.lastLedgerId(a.dbId) }; }
    SLICES.forEach((sl, si) => { this.runSlice(si, plan.filter((x) => x.mins[si] > 0)); this.rig.clock.advance(sl.gapH * 3600000 - this.W * 60000); });
    void w;
    // gün sonu
    for (const a of this.agents) a.days.push(this.dayRec(a));
    this.recordEcon();
  }
  private lastLedgerId(dbId: number) { return (this.rig.db.db.prepare('SELECT COALESCE(MAX(id),0) m FROM ledger WHERE player_id = ?').get(dbId) as unknown as { m: number }).m; }
  private runSlice(si: number, online: { a: Agent; mins: number[] }[]) {
    const w = this.rig.world; const t0 = performance.now();
    if (!online.length) { return; }
    this.riftOpen = this.riftDone = this.riftFail = 0; const bossKills0 = this.bossFights.length; this.bossStart.clear(); this.bossDeaths.clear();
    // giriş (gerçek join: dinlenmiş XP, rüya, posta teslimi)
    for (const { a } of online) { const row = this.rig.db.playerById(a.dbId)!; a.p = w.join(row, () => {}, () => {}); this.byPid.set(a.p.id, a); a.sliceFarmTicks = a.sliceFarmWall = a.sliceFarmKills = a.sliceFarmDeaths = 0; a.sliceStartKills = a.tot.kills; a.sliceStartDeaths = a.tot.deaths; }
    this.market.invalidate();
    for (const { a } of online) { a.pickActivity(); a.town(); if (a.p.hp < a.p.stats.maxHp * 0.6) a.resting = true; if (a.activity === 'farm' || !a.camp) a.pickCamp(); }
    // dünya zaten giriş yapanlarla başlar: gerçek tick'ler
    const ticks = this.W * 600; const occStat: Record<number, { sum: number; n: number }> = {}; const campUse: Record<number, number> = {}; const bossTouch = new Set<number>();
    for (let t = 0; t < ticks; t++) {
      const ix = this.index(); if (t % 20 === 0) this.updateOccupancy(online.map((x) => x.a), occStat, campUse);
      for (const { a } of online) { a.step(ix); }
      for (const m of ix.bosses) if (m.contrib.size && !this.bossStart.has(m.bossId)) { this.bossStart.set(m.bossId, w.now); bossTouch.add(m.bossId); }
      this.rig.tick();
    }
    // dilim sonu: ölçekleme (gerçek ödül tabloları), ikinci yurt ziyareti, çıkış
    const log: SliceLog = { day: this.day, slice: si, online: online.length, riftsOpened: this.riftOpen, riftsClosed: this.riftDone, riftsFailed: 0, bossKills: this.bossFights.length - bossKills0, occBuckets: {}, campUse, tickMs: 0 };
    for (const { a, mins } of online) {
      a.tot.minutes += mins[si]; const farmMin = a.sliceFarmTicks / 600;
      const extraMin = Math.max(0, mins[si] - this.W);
      // oranlar, farm evresinin TOPLAM süresine (ölü/dinlenme dahil) göre ölçülür: sık ölen oyuncunun gerçek verimi budur
      const wallMin = a.sliceFarmWall / 600;
      if (wallMin >= 1) { a.rate = a.rate * 0.5 + (a.sliceFarmKills / wallMin) * 0.5; a.deathRate = a.deathRate * 0.5 + (a.sliceFarmDeaths / wallMin) * 0.5; }
      const o = occStat[a.idx]; if (o && farmMin >= 1) { const avg = o.sum / Math.max(1, o.n); const b = avg <= 1.5 ? '1' : avg <= 3.5 ? '2-3' : avg <= 6.5 ? '4-6' : avg <= 10.5 ? '7-10' : '11+'; const e = (log.occBuckets[b] ??= { n: 0, rate: 0 }); e.n++; e.rate += a.sliceFarmKills / farmMin; }
      if (extraMin > 0) this.extrapolate(a, extraMin);
      a.town(); a.farmMin += farmMin;
    }
    for (const k of Object.keys(log.occBuckets)) log.occBuckets[k].rate = +(log.occBuckets[k].rate / log.occBuckets[k].n).toFixed(1);
    log.tickMs = +((performance.now() - t0) / ticks).toFixed(2); this.sliceLogs.push(log);
    for (const { a } of online) { a.d.x = a.p.x; a.d.z = a.p.z; w.leave(a.p); this.byPid.delete(a.p.id); a.camp = null; }
    for (const m of [...w.mobs.values()]) if (m.riftId >= 0) w.mobs.delete(m.id);   // dilim sonunda açık çatlaklar dağılır
    w.rifts.clear(); w.drops.clear();
  }
  private index() {
    const campMobs = new Map<number, Mob[]>(); const bosses: Mob[] = []; const riftMobs = new Map<number, Mob[]>();
    for (const m of this.rig.world.mobs.values()) { if (m.dead) continue; if (m.bossId) bosses.push(m); else if (m.riftId >= 0) { let l = riftMobs.get(m.riftId); if (!l) riftMobs.set(m.riftId, (l = [])); l.push(m); } else if (m.campId >= 0) { let l = campMobs.get(m.campId); if (!l) campMobs.set(m.campId, (l = [])); l.push(m); } }
    return { campMobs, bosses, riftMobs };
  }
  private updateOccupancy(as: Agent[], occStat: Record<number, { sum: number; n: number }>, campUse: Record<number, number>) {
    this.occupancy.clear(); for (const a of as) if (a.activity === 'farm' && a.camp && !a.resting) this.occupancy.set(a.camp.id, (this.occupancy.get(a.camp.id) ?? 0) + 1);
    for (const a of as) if (a.activity === 'farm' && a.camp) { const n = this.occupancy.get(a.camp.id) ?? 1; const o = (occStat[a.idx] ??= { sum: 0, n: 0 }); o.sum += n; o.n++; campUse[a.camp.id] = (campUse[a.camp.id] ?? 0) + 1; }
  }
  // ───────────── ölçekleme: dilim dışı farm dakikaları gerçek ödül tablolarıyla işlenir ─────────────
  private extrapolate(a: Agent, minutes: number) {
    const w = this.rig.world; const p = a.p; let kills = Math.round(a.rate * minutes); let deathsLeft = a.deathRate * minutes; a.tot.extraKills += 0;
    const chunk = 40; const deathPerKill = kills > 0 ? deathsLeft / kills : 0;
    while (kills > 0) {
      const n = Math.min(chunk, kills); kills -= n;
      if (p.d.level < 10 || a.arch.camp !== 'random') a.pickCamp(); const c = a.camp ?? (a.pickCamp(), a.camp!); const lvl = Math.max(1, Math.min(48, c.level));
      for (let i = 0; i < n; i++) this.killEquivalent(a, c, lvl);
      a.tot.extraKills += n;
      deathsLeft -= deathPerKill * n; while (deathsLeft >= 1 || (deathsLeft > 0 && this.rng() < deathsLeft)) { deathsLeft -= 1; const loss = Math.min(p.d.xp, Math.round(xpToNext(p.d.level) * DEATH_XP_LOSS)); p.d.xp -= loss; a.tot.extraDeaths++; a.frustration += 1; a.deathBy['farm'] = (a.deathBy['farm'] ?? 0) + 1; if (deathsLeft <= 0) break; }
      this.collectDrops(a);
      if (p.d.items.length >= 20) a.town();
    }
    w.flushGold(p); p.d.hp = p.stats.maxHp;
  }
  private killEquivalent(a: Agent, c: Camp, lvl: number) {
    const w = this.rig.world; const p = a.p; const type = c.types[Math.floor(this.rng() * c.types.length)]; const ml = Math.max(1, lvl + Math.floor(this.rng() * 3) - 1);
    const m = w.makeMob(type, ml, p.x, p.z, -1); w.mobs.delete(m.id);
    const diff = p.d.level - ml; const f = diff > 3 ? Math.max(0.1, 1 - 0.12 * (diff - 3)) : Math.min(1.25, 1 + 0.05 * -diff);
    if (p.d.level < MAX_LEVEL || true) w.addXp(p, mobXp(ml) * f, true);
    p.d.counters.kills++; w.rollDrops(p, m, 1);
  }
  private collectDrops(a: Agent) {
    const w = this.rig.world; const p = a.p;
    for (const [id, dr] of [...w.drops]) { if (dr.owner !== p.id) continue; if (!w.collectDrop(p, dr)) { a.tot.lostBagFull++; this.stats.lostBagFull++; } w.drops.delete(id); }
  }

  // ───────────── kayıtlar ─────────────
  private dayRec(a: Agent): DayRec {
    const m = (a as any).__day; const row = this.rig.db.playerById(a.dbId)!; const d = JSON.parse(row.data) as Player['d'];
    const led = a.ledgerSince(m.ledger0); const income: Record<string, number> = {}; const expense: Record<string, number> = {}; let net = 0;
    const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] ?? 0) + Math.round(v); };
    for (const l of led) { const x = JSON.parse(l.detail); switch (l.kind) {
      case 'mob.gold': add(income, 'yaratık', x.gold); break; case 'sell': add(income, 'NPC satış', x.price); break; case 'clue': add(income, 'gizem', x.gold); break; case 'milestone': add(income, 'kilometre taşı', x.gold); break;
      case 'boss.reward': add(income, 'boss', x.gold); break; case 'rift.reward': add(income, 'çatlak', x.gold); break; case 'exp.collect': add(income, 'sefer', x.gold); break; case 'tutorial': add(income, 'öğretici', x.gold ?? 0); break;
      case 'market.sale': add(income, 'pazar satış', x.proceeds); net += x.proceeds; break; case 'market.buy': add(expense, 'pazar alış', x.price); net -= x.price; break;
      case 'market.list': add(expense, 'ilan ücreti', x.fee); net -= x.fee; break; case 'upgrade': add(expense, 'artı basma', x.gold); break; case 'reroll': add(expense, 'efsun yenileme', x.gold); break; case 'craft': add(expense, 'üretim', x.gold ?? 0); break; case 'skill.rank': add(expense, 'beceri', x.gold ?? 0); break; case 'oba.build': add(expense, 'oba', x.gold ?? 0); break; } }
    const prog = d.level + (d.level >= 50 ? 0 : d.xp / xpToNext(d.level));
    let worth = d.gold; for (const it of d.items) worth += vendorOfItem(it); for (const it of Object.values(d.equip)) if (it) worth += vendorOfItem(it as Item);
    return { day: this.day, level: d.level, prog: +prog.toFixed(2), gold: d.gold, worth, kills: a.tot.kills + a.tot.extraKills - m.kills0, deaths: a.tot.deaths + a.tot.extraDeaths - m.deaths0, minutes: Math.round(a.tot.minutes - m.min0), bossKills: a.tot.bossKills - m.boss0, riftCloses: a.tot.riftCloses - m.rift0, pvpKills: a.tot.pvpKills - m.pk0, pvpDeaths: a.tot.pvpDeaths - m.pd0, marketNet: net, upgrades: a.tot.upgradesOk - m.up0, destroyed: a.tot.destroyed - m.ds0, income, expense };
  }
  private recordEcon() {
    const db = this.rig.db.db; const rows = db.prepare('SELECT kind, detail FROM ledger WHERE id > ? ORDER BY id').all(this.ledgerMark) as unknown as { kind: string; detail: string }[];
    this.ledgerMark = (db.prepare('SELECT COALESCE(MAX(id),0) m FROM ledger').get() as unknown as { m: number }).m;
    const sources: Record<string, number> = {}; const sinks: Record<string, number> = {}; let sales = 0, vol = 0, tax = 0, fees = 0, listed = 0, ratioSum = 0;
    const add = (o: Record<string, number>, k: string, v: number) => { o[k] = (o[k] ?? 0) + Math.round(v); };
    for (const l of rows) { const x = JSON.parse(l.detail); switch (l.kind) {
      case 'mob.gold': add(sources, 'yaratık', x.gold); break; case 'sell': add(sources, 'NPC satış', x.price); break; case 'clue': add(sources, 'gizem', x.gold); break; case 'milestone': add(sources, 'kilometre taşı', x.gold); break; case 'boss.reward': add(sources, 'boss (altın yağmuru dahil)', 0); break; case 'exp.collect': add(sources, 'sefer', x.gold); break;
      case 'upgrade': add(sinks, 'artı basma', x.gold); break; case 'reroll': add(sinks, 'efsun yenileme', x.gold); break; case 'craft': add(sinks, 'üretim', x.gold ?? 0); break; case 'skill.rank': add(sinks, 'beceri', x.gold ?? 0); break; case 'oba.build': add(sinks, 'oba', x.gold ?? 0); break;
      case 'market.list': add(sinks, 'pazar ilan ücreti', x.fee); fees += x.fee; listed++; break; case 'market.sale': add(sinks, 'pazar vergisi', x.tax); tax += x.tax; sales++; vol += x.price; ratioSum += x.price / Math.max(1, marketRefFromVendor(x.vendor)); break; } }
    const row = db.prepare("SELECT COALESCE(SUM(gold),0) g FROM mail WHERE kind='gold'").get() as unknown as { g: number };
    const golds = this.agents.map((a) => (JSON.parse(this.rig.db.playerById(a.dbId)!.data).gold as number)); const supply = golds.reduce((s, g) => s + g, 0) + row.g;
    const sorted = golds.slice().sort((x, y) => x - y); let cum = 0; let gi = 0; sorted.forEach((g, i) => { cum += g; gi += cum - g / 2 + 0 * i; }); const gini = sorted.length && supply ? 1 - (2 * gi) / (sorted.length * supply) : 0;
    this.econ.push({ day: this.day, supply, sources, sinks, mkt: { sales, volume: vol, tax, fees, listed, avgRatio: sales ? +(ratioSum / sales).toFixed(2) : 0 }, gini: +gini.toFixed(3) });
  }
}
const vendorOfItem = (it: Item) => Math.round((8 + it.ilvl * 4) * [1, 1.2, 1.45, 1.8][it.tier] * (1 + it.up * 0.5));
const marketRefFromVendor = (v: number) => v * 6;
void newId; void genBosses;
