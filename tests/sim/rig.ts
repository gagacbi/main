/**
 * Başsız (tarayıcısız, ağsız) oyun sunucusu donanımı: World sınıfı sahte saatle sürülür, bot oyuncular
 * gerçek sunucu kurallarıyla oynar. Bir simüle saat ≈ saniyeler içinde koşar (hızlandırılmış denge testi).
 */
import { Db } from '../../server/db';
import { Clock } from '../../server/clock';
import { World, Player, type Mob } from '../../server/world';
import { newPlayerData, type Ctx, type PlayerData } from '../../server/types';
import { runGm } from '../../server/gm';
import { mulberry32 } from '../../shared/rng';
import { HUB, RANGED_MIN_RANGE, SKILLS, TICK_HZ, WEAPON_MODS, itemStats, xpToNext, type Boy, type Item, type Slot, type Spec } from '../../shared/game';
import { dist2, type Camp } from '../../shared/world';

export const DT = 0.1; // simülasyon adımı (sn); sunucu en çok 0,1 sn'lik adıma izin verir
export function makeRig(seed = 1, cfg: Partial<Ctx['cfg']> = {}) {
  const db = new Db(':memory:');
  const clock = new Clock();
  const ctx: Ctx = {
    db, clock, rng: mulberry32(seed), worlds: new Set(), oymaks: new Map(), broadcastSys: () => {},
    cfg: { maxPerLayer: 150, riftEvery: [999999, 999999], test: true, mobScale: 1, rateLimit: false, spawnCamps: true, simLatency: 0, ...cfg },
  };
  const world = new World(ctx, 1);
  let n = 0;
  const add = (boy: Boy, role: 'player' | 'admin' = 'player', mutate?: (d: PlayerData) => void): Player => {
    const name = `sim${++n}`;
    const oy = db.assignNoviceOymak(boy, 20);
    const d = newPlayerData(clock.now(), HUB.spawn[boy], 'tr'); mutate?.(d);
    const id = db.insertPlayer({ name, salt: 'x', hash: 'x', boy, oymak_id: oy.id, points: 0, data: JSON.stringify(d), created: clock.now(), last_seen: clock.now(), role });
    return world.join(db.playerById(id)!, () => {}, () => {});
  };
  const tick = (dt = DT) => { clock.advance(dt * 1000); world.tick(dt); };
  const seconds = (s: number) => { for (let i = 0; i < Math.round(s / DT); i++) tick(); };
  const gm = (p: Player, line: string) => runGm(world, p, line);
  return { db, clock, ctx, world, add, tick, seconds, gm };
}
export type Rig = ReturnType<typeof makeRig>;

export interface BotOpts { spec: Spec; /** hedef kamp seviyesi = seviye + ofset */ offset?: number; /** bu artıya kadar güvenli bas (5+ yok olabilir) */ safeUp?: number; riskUp?: number; useBooks?: boolean; /** verilirse kamp aramaz: bu noktada kalıp savaşır (çatlak testi); bakım ve geri çekilme yok */ anchor?: { x: number; z: number } }
export interface BotStats { levelAt: Record<number, number>; killsAt: Record<number, number>; goldAt: Record<number, number>; dmgAt: Record<number, number>; kills: number; deaths: number; goldGained: number; upgrades: { ok: number; fail: number; destroyed: number }; dmgTaken: number; trips: number; itemsSeen: number }

const SK_PRIORITY = [0, 1, 5, 4, 3, 2];
const slotScore = (it: Item): number => {
  const s = itemStats(it);
  // gerçek oyuncu gibi: yürürken vuramayan menzilli silahı bot koşarken kullanamaz, seçmez
  switch (it.slot) { case 'weapon': return WEAPON_MODS[it.wk ?? 'kilic'].range > RANGED_MIN_RANGE ? 0 : s.atk * 3 * (1 + WEAPON_MODS[it.wk ?? 'kilic'].atk) / (1 + WEAPON_MODS[it.wk ?? 'kilic'].aspd); case 'armor': case 'helmet': return s.def * 2 + s.hp / 12; case 'amulet': return s.critPct * 6 + s.atkPct * 4; }
};

/** Makul bir oyuncunun yaptığını yapan bot: kamp seç, yaklaş, vur, yetenek kullan, can azalırsa çekil, ara sıra demirciye uğra. */
export class PlayBot {
  st: BotStats = { levelAt: { 1: 0 }, killsAt: { 1: 0 }, goldAt: { 1: 150 }, dmgAt: { 1: 0 }, kills: 0, deaths: 0, goldGained: 0, upgrades: { ok: 0, fail: 0, destroyed: 0 }, dmgTaken: 0, trips: 0, itemsSeen: 0 };
  private camp: Camp | null = null; private resting = false; private lastMaint = 0; private lastLevel = 1; t0: number; private lastDeaths = 0;
  constructor(public rig: Rig, public p: Player, public o: BotOpts) {
    this.t0 = rig.clock.now();
    const w = rig.world; const orig = w.damage.bind(w);
    w.damage = (src, tgt, amount, o2) => { const r = orig(src, tgt, amount, o2); if (tgt === p && typeof r === 'number') this.st.dmgTaken += r; return r; };
  }
  get w() { return this.rig.world; }
  get t() { return (this.rig.clock.now() - this.t0) / 1000; }
  private rpc(op: Parameters<World['rpcRun']>[1], a: unknown = {}) { try { return { ok: true as const, data: this.w.rpcRun(this.p, op, a) }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } }

  private pickCamp(): Camp {
    const L = this.p.d.level; const want = Math.max(1, Math.min(48, L + (this.o.offset ?? 0)));
    const cs = this.w.camps.slice().sort((a, b) => Math.abs(a.level - want) - Math.abs(b.level - want) || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    const best = Math.abs(cs[0].level - want);
    return cs.filter((c) => Math.abs(c.level - want) === best).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
  }
  private aliveNear(r: number): Mob[] { const out: Mob[] = []; for (const m of this.w.mobs.values()) if (!m.dead && !m.dummy && dist2(this.p, m) <= r * r) out.push(m); return out; }
  private go(x: number, z: number) { const dx = x - this.p.x, dz = z - this.p.z; const l = Math.hypot(dx, dz) || 1; this.w.onInput(this.p, { x: dx / l, z: dz / l }); }
  private stop() { this.w.onInput(this.p, { x: 0, z: 0 }); }

  step() {
    const p = this.p; const w = this.w; const d = p.d;
    // istatistik
    if (d.level !== this.lastLevel) { for (let l = this.lastLevel + 1; l <= d.level; l++) { this.st.levelAt[l] = this.t; this.st.killsAt[l] = d.counters.kills; this.st.goldAt[l] = d.gold; this.st.dmgAt[l] = this.st.dmgTaken; } this.lastLevel = d.level; }
    if (d.counters.deaths !== this.lastDeaths) { this.st.deaths += d.counters.deaths - this.lastDeaths; this.lastDeaths = d.counters.deaths; this.camp = null; this.resting = true; }
    if (p.deadUntil > 0) { try { w.respawn(p); } catch { /* erken */ } return; }
    if (this.o.anchor) {
      this.skills(); const near = this.aliveNear(30);
      if (!near.length) { this.go(this.o.anchor.x, this.o.anchor.z); w.onAttack(p, { on: false }); return; }
      let tg = near[0]; let bd2 = Infinity; for (const m of near) { const q = dist2(p, m); if (q < bd2) { bd2 = q; tg = m; } }
      if (Math.sqrt(bd2) > 2.6) this.go(tg.x, tg.z); else this.stop();
      w.onAttack(p, { on: true, focus: tg.id }); return;
    }
    // bakım (demirci uğrağı)
    if (this.t - this.lastMaint > 180 && this.t > 5) { this.maintain(); this.lastMaint = this.t; }
    const risky = Math.hypot(p.x, p.z) > 36;
    // dinlen: yurtta ya da güvenli bölgede can dolana dek
    if (this.resting) {
      if (risky) { this.go(0, 0); w.onAttack(p, { on: false }); return; }
      this.stop(); if (p.hp >= p.stats.maxHp * 0.95) this.resting = false; return;
    }
    if (p.hp < p.stats.maxHp * 0.3) { this.resting = true; return; }
    if (!this.camp || this.camp.level !== Math.max(1, Math.min(48, d.level + (this.o.offset ?? 0)))) this.camp = this.pickCamp();
    const c = this.camp;
    const near = this.aliveNear(14);
    // yetenekler
    this.skills();
    if (near.length === 0) { w.onAttack(p, { on: false }); this.go(c.x, c.z); return; }
    let tgt = near[0]; let bd = Infinity; for (const m of near) { const dd = dist2(p, m); if (dd < bd) { bd = dd; tgt = m; } }
    const dd = Math.sqrt(bd);
    if (dd > 2.6) this.go(tgt.x, tgt.z); else this.stop();
    w.onAttack(p, { on: true, focus: tgt.id });
  }

  private skills() {
    const p = this.p; const w = this.w; const hpPct = p.hp / p.stats.maxHp;
    for (const i of SK_PRIORITY) {
      const sk = SKILLS[i]; if (p.d.level < sk.lvl || w.now < p.cds[i]) continue;
      const r = sk.r * p.stats.aoe; const n = this.aliveNear(r).length; const all = this.aliveNear(14).length;
      const boss = this.aliveNear(r).some((m) => m.type === 'bekci');
      let use = false;
      switch (sk.id) {
        case 'hiddet': use = n >= 3 || boss || (n >= 1 && hpPct < 0.5); break;
        case 'sarsinti': use = n >= 2 || (n >= 1 && hpPct < 0.6); break;
        case 'savurma': use = n >= 2; break;
        case 'zehir': use = n >= 2; break;
        case 'nara': use = all >= 3 && n < all; break;
        case 'kalkan': use = hpPct < 0.65 && all >= 1; break;
      }
      if (use) w.onSkill(p, i);
    }
  }

  /** Demirci uğrağı: eşya giy, sat, artı bas, yetenek puanı harca, uzmanlık seç. Yürüyüş süresi 30 sn bekleme ile temsil edilir. */
  maintain() {
    const p = this.p; const w = this.w; const d = p.d; const bx = p.x, bz = p.z;
    this.st.trips++;
    p.x = HUB.demirci.x - 2; p.z = HUB.demirci.z; this.stop(); w.onAttack(p, { on: false });
    // uzmanlık
    if (d.level >= 10 && d.spec === 'none') this.rpc('spec', { choice: this.o.spec });
    // eşya giy
    this.st.itemsSeen = Math.max(this.st.itemsSeen, d.counters.kills);
    for (const slot of ['weapon', 'armor', 'helmet', 'amulet'] as Slot[]) {
      const cur = d.equip[slot]; let best = cur; let bs = cur ? slotScore(cur) : -1;
      for (const it of d.items) if (it.slot === slot && it.lvlReq <= d.level && slotScore(it) > bs) { best = it; bs = slotScore(it); }
      if (best && best !== cur) this.rpc('equip', { id: best.id });
    }
    // beceri puanı
    for (let guard = 0; guard < 12 && d.skillPts > 0; guard++) {
      let did = false;
      for (const s of SK_PRIORITY) { if (this.rpc('rankSkill', { slot: s }).ok) { did = true; break; } }
      if (!did) break;
    }
    // artı bas
    const safe = this.o.safeUp ?? 4; const risk = this.o.riskUp ?? 4;
    for (const slot of ['weapon', 'armor', 'helmet', 'amulet'] as Slot[]) {
      for (let g = 0; g < 12; g++) {
        const it = d.equip[slot]; if (!it) break;
        const target = it.up + 1; if (target > Math.max(safe, risk)) break;
        const useCharm = target >= 5 && d.bag.charm > 0;
        const useBook = !!this.o.useBooks && d.bag.book > 0;
        if (target >= 5 && target > safe && !useCharm && target > risk) break;
        const r = this.rpc('upgrade', { id: it.id, book: useBook, charm: useCharm });
        if (!r.ok) break;
        const x = r.data as { success: boolean; destroyed: boolean };
        if (x.success) this.st.upgrades.ok++; else { this.st.upgrades.fail++; if (x.destroyed) this.st.upgrades.destroyed++; }
        if (x.destroyed) break;
      }
    }
    // kalan eşyayı sat (çanta dolmasın)
    for (const it of [...d.items]) { if (d.items.length < 14) break; if (this.rpc('sell', { id: it.id }).ok === false) break; }
    for (const it of [...d.items]) { const cur = d.equip[it.slot]; if (!cur || slotScore(it) <= slotScore(cur)) this.rpc('sell', { id: it.id }); }
    for (let i = 0; i < Math.round(30 / DT); i++) this.rig.tick();
    p.x = bx; p.z = bz; p.hp = Math.max(p.hp, Math.min(p.stats.maxHp, p.hp));
  }
}

export { xpToNext, TICK_HZ };
