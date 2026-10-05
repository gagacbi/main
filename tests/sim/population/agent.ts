import {
  BAG_SIZE, CRAFT, DMG_KINDS, FIELD_BOSS, HUB, HUB_R, MARKET, MOBS, RANGED_MIN_RANGE, SKILLS, WEAPON_MODS, computeStats, marketPriceBounds, marketRef, rerollCost, upgradeCost, vendorPrice, xpToNext, zoneAt,
  type DmgKind, type Item, type Slot, type Spec,
} from '../../../shared/game';
import { dist2, type Camp } from '../../../shared/world';
import type { Mob, Player } from '../../../server/world';
import type { Arch } from './archetypes';
import type { Engine } from './engine';

export type Activity = 'farm' | 'boss' | 'rift' | 'pvp';
export interface Params { skill: number; retreat: number; offset: number; safeUp: number; riskUp: number; charm: boolean; book: boolean; defAware: boolean; smartWeapon: boolean; spec: Spec; sellP: number; buyP: number; fightBack: boolean; skillOrder: number[]; obaDil: number; /** mini haritayı (kamp seviyesi + doluluk) okur */ readsMap: boolean }
export interface DayRec { day: number; level: number; prog: number; gold: number; worth: number; kills: number; deaths: number; minutes: number; bossKills: number; riftCloses: number; pvpKills: number; pvpDeaths: number; marketNet: number; upgrades: number; destroyed: number; income: Record<string, number>; expense: Record<string, number> }

const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'amulet'];
const DEFAULT_ORDER = [0, 1, 5, 4, 3, 2];

/** Bir oyuncunun kararlarını ve ölçümlerini taşıyan ajan. */
export class Agent {
  p!: Player; activity: Activity = 'farm'; camp: Camp | null = null; resting = false; noticeAt: number[] = [0, 0, 0, 0, 0, 0];
  victim: number | null = null; bossTarget: Mob | null = null; fightBackUntil = 0; fightBackId = 0;
  // ölçümler
  days: DayRec[] = []; events: string[] = []; actTicks: Record<string, number> = { farm: 0, boss: 0, rift: 0, pvp: 0, rest: 0 };
  tot = { kills: 0, extraKills: 0, deaths: 0, extraDeaths: 0, bossKills: 0, riftCloses: 0, pvpKills: 0, pvpDeaths: 0, minutes: 0, upgradesOk: 0, upgradesFail: 0, destroyed: 0, lostBagFull: 0, rare: 0, mktListed: 0, mktSold: 0, mktBought: 0, mktProfit: 0, blocked: 0, pierced: 0 };
  dmgByKind: Record<string, number> = { kilic: 0, cift: 0, bicak: 0, yay: 0, buyu: 0, pl: 0, dot: 0 }; deathBy: Record<string, number> = {};
  lastRewardMin = 0; maxRewardGap = 0; sinceReward = 0; frustration = 0; failStreak = 0; maxFailStreak = 0; levelAtDay: number[] = []; farmMin = 0; farmKills = 0; farmDeaths = 0; rate = 18; deathRate = 0.01;
  sliceFarmTicks = 0; sliceFarmWall = 0; sliceFarmKills = 0; sliceFarmDeaths = 0; sliceStartKills = 0; sliceStartDeaths = 0; listings = 0;
  constructor(public eng: Engine, public idx: number, public name: string, public arch: Arch, public par: Params, public boy: 'gok' | 'yer' | 'ay', public dbId: number, public seedLevel: number) {}
  get w() { return this.eng.rig.world; }
  get d() { return this.p.d; }

  // ───────────── değerlendirme ─────────────
  /** hedef tehdit karışımı (hasar türü ağırlıkları): kamp türleri, boss ya da rakip silah türleri */
  threat(): Record<DmgKind, number> {
    const t: Record<DmgKind, number> = { kilic: 0, cift: 0, bicak: 0, yay: 0, buyu: 0 };
    if (this.activity === 'boss' && this.bossTarget) t[FIELD_BOSS.list[this.bossTarget.bossId - 1][1]] += 1;
    else if (this.activity === 'pvp') { t.kilic += 0.6; t.cift += 0.15; t.bicak += 0.1; t.yay += 0.1; t.buyu += 0.05; }
    else if (this.camp) for (const ty of this.camp.types) t[MOBS[ty].kind] += 1 / this.camp.types.length; else t.kilic = 1;
    return t;
  }
  /** yapı hedefi: DPS × etkin can (tehdit karışımına göre savunma bilen oyuncuda, bilmeyende türsüz) */
  objective(equip: Partial<Record<Slot, Item>>, aware: boolean): number {
    const st = computeStats({ level: this.d.level, boy: this.boy, spec: this.d.spec, equip, kut: this.d.kut });
    const th = this.threat(); let red = 0, blk = st.blockHit;
    for (const k of DMG_KINDS) red += th[k] * (aware ? st.defKind[k] : 0.1 * st.defKind[k]);
    const ranged = st.range > RANGED_MIN_RANGE; const dps = (st.atk * (1 + st.crit / 100 * 0.6) / st.atkInterval) * (ranged && this.par.smartWeapon ? 0.55 : 1);
    const defRed = 100 / (100 + st.def); const ehp = st.maxHp / (defRed * (1 - red) * (1 - (aware ? blk : blk * 0.3)) * st.dmgTaken);
    return dps * ehp;
  }
  /** parça değeri satıcıya/pazara: kendi yapısında kullanmayacağı parçayı satar */
  bestFor(slot: Slot, pool: Item[]): Item | undefined {
    const aware = this.par.defAware; const cur = this.d.equip[slot]; let best = cur; let bs = this.objective(this.d.equip, aware);
    for (const it of pool) {
      if (it.slot !== slot || it.lvlReq > this.d.level) continue;
      if (slot === 'weapon' && !this.par.smartWeapon === false && WEAPON_MODS[it.wk ?? 'kilic'].range > RANGED_MIN_RANGE && false) continue;
      const sc = this.objective({ ...this.d.equip, [slot]: it }, aware);
      if (sc > bs * 1.002) { best = it; bs = sc; }
    }
    return best;
  }
  /** bilgisiz oyuncu: yalnızca görünen sayıya (saldırı/savunma toplamı) bakar */
  naiveBest(slot: Slot, pool: Item[]): Item | undefined {
    const sc = (it: Item) => { const s = computeStats({ level: this.d.level, boy: this.boy, spec: this.d.spec, equip: { ...this.d.equip, [slot]: it }, kut: 0 }); return s.atk * 3 + s.def * 2 + s.maxHp / 12; };
    let best = this.d.equip[slot]; let bs = best ? sc(best) : -1;
    for (const it of pool) if (it.slot === slot && it.lvlReq <= this.d.level) { const v = sc(it); if (v > bs) { best = it; bs = v; } }
    return best;
  }
  networth() {
    let v = this.d.gold; for (const it of this.d.items) v += vendorPrice(it); for (const it of Object.values(this.d.equip)) if (it) v += vendorPrice(it);
    return v;
  }
  progress() { return this.d.level + (this.d.level >= 50 ? 0 : this.d.xp / xpToNext(this.d.level)); }

  // ───────────── yurtta bakım (gerçek RPC'ler) ─────────────
  private rpc(op: Parameters<Engine['rig']['world']['rpcRun']>[1], a: unknown = {}) { try { return { ok: true as const, data: this.w.rpcRun(this.p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } }
  private at(x: number, z: number) { this.p.x = x; this.p.z = z; }
  town() {
    const p = this.p; const d = this.d; const r = this.eng.rng; const w = this.w;
    p.deadUntil = 0; this.at(HUB.demirci.x - 2, HUB.demirci.z);
    this.rpc('market.claim');
    // uzmanlık
    if (d.level >= 10 && d.spec === 'none') this.rpc('spec', { choice: this.par.spec });
    // beceri puanı
    for (let g = 0; g < 10 && d.skillPts > 0; g++) { let did = false; for (const s of this.par.skillOrder) if (this.rpc('rankSkill', { slot: s }).ok) { did = true; break; } if (!did) break; }
    // pazarda alım (yükseltme avcıları)
    if (this.par.buyP > r()) this.marketBuy();
    // kuşan
    for (const s of SLOTS) { const b = this.par.defAware || this.par.smartWeapon ? this.bestFor(s, d.items) : this.naiveBest(s, d.items); const cur = d.equip[s]; if (b && b !== cur) this.rpc('equip', { id: b.id }); }
    // efsun yenile: savunma bilinçli oyuncu, aldığı hasarın ana türüne karşı savunma kurar
    if (this.par.defAware) this.rerollDefense();
    // artı bas
    this.upgradeAll();
    // üretim
    this.craftStuff();
    // satış: pazara ya da satıcıya
    this.sellJunk();
    // oba
    if (this.par.obaDil > r()) this.obaTrip();
    this.at(HUB.demirci.x - 2, HUB.demirci.z); w.recalc(p);
  }
  /** ana tehdit türü: en çok hasar alınan tür (yeterli veri yoksa kamp/boss tehdit karışımı) */
  mainThreat(): DmgKind {
    let best: DmgKind | null = null; let bv = 0; for (const k of DMG_KINDS) if ((this.dmgByKind[k] ?? 0) > bv) { bv = this.dmgByKind[k]; best = k; }
    if (best && bv > 800) return best; const th = this.threat(); let b: DmgKind = 'kilic', v = -1; for (const k of DMG_KINDS) if (th[k] > v) { v = th[k]; b = k; } return b;
  }
  private rerollDefense() {
    const d = this.d; const kind = this.mainThreat(); const key = `def${kind[0].toUpperCase()}${kind.slice(1)}` as 'defKilic';
    const st = () => computeStats({ level: d.level, boy: this.boy, spec: d.spec, equip: d.equip, kut: d.kut }); if (st().defKind[kind] >= 0.18) return;
    const overwrite = ['xpPct', 'mspd', 'leech', 'aspd', 'crit', 'defPct', 'hpPct', 'atkPct']; const budget = d.gold * 0.4; let spent = 0;
    for (const slot of ['armor', 'helmet', 'amulet', 'weapon'] as Slot[]) {
      const it = d.equip[slot]; if (!it || it.ench.some((e) => e.k === key) || it.base?.k === key) continue;
      let li = -1, pr = 99; it.ench.forEach((e, i) => { const q = overwrite.indexOf(e.k); const rank = q < 0 ? 50 : q; if (rank < pr && !e.k.startsWith('def') && !e.k.startsWith('block') && e.k !== 'pierce') { pr = rank; li = i; } });
      if (li < 0) continue; const c = rerollCost(it, false, true); if (spent + c > budget || d.gold < c + 500) continue;
      const res = this.rpc('reroll', { id: it.id, line: li, key }); if (res.ok) { spent += c; this.eng.stats.rerolls++; this.eng.stats.rerollGold += c; this.reward('savunma kuruldu'); if (st().defKind[kind] >= 0.18) break; }
    }
  }
  private upgradeAll() {
    const d = this.d; const pol = this.par;
    for (const slot of SLOTS) for (let g = 0; g < 14; g++) {
      const it = d.equip[slot]; if (!it) break; const target = it.up + 1; if (target > Math.max(pol.safeUp, pol.riskUp)) break;
      const useCharm = target >= 5 && pol.charm && d.bag.charm > 0; const useBook = pol.book && d.bag.book > 0 && target >= 3;
      if (target > pol.safeUp && !useCharm && target > pol.riskUp) break;
      if (target >= 5 && !useCharm && target > pol.safeUp && this.eng.rng() > 0.4) break; // riske giren az
      const cost = upgradeCost(target, it.ilvl); if (d.gold < cost.gold + 200 || d.bag.ore < cost.ore) break;
      const res = this.rpc('upgrade', { id: it.id, book: useBook, charm: useCharm }); if (!res.ok) break;
      if (res.data.success) { this.tot.upgradesOk++; this.failStreak = 0; this.reward(`+${res.data.target} başarılı`); } else { this.tot.upgradesFail++; this.failStreak++; this.maxFailStreak = Math.max(this.maxFailStreak, this.failStreak); if (res.data.destroyed) { this.tot.destroyed++; this.frustration += 3; this.events.push(`gün ${this.eng.day}: ${itemLabel(it)} +${target} denemesinde YOK OLDU`); break; } else this.frustration += 0.5; }
    }
  }
  private craftStuff() {
    const d = this.d; const r = this.eng.rng; const m = this.eng.market;
    if (this.par.charm) while (d.bag.charm < 4 && this.rpc('craft', { kind: 'charm' }).ok) { /* demir 2+ gerekir */ }
    if (this.par.book) while (d.bag.book < 6 && d.bag.ore > 30 && this.rpc('craft', { kind: 'book' }).ok) { /* */ }
    if (this.arch.market.craft && m.craftBudget(this) && d.items.length < 22 && d.bag.ore >= CRAFT.gear.ore + 20 && d.bag.hide >= CRAFT.gear.hide && d.bag.wood >= CRAFT.gear.wood) {
      const slot = SLOTS[Math.floor(r() * 4)]; const gold0 = d.gold; const res = this.rpc('craft', { kind: 'gear', slot });
      if (res.ok) { this.eng.stats.crafted++; this.eng.stats.craftGold += gold0 - d.gold; }
    }
  }
  /** parça kendi yapısına katkı yapar mı (bilinçli oyuncu: hedefe göre; bilinçsiz: yalnızca boş slot) */
  private wantIt(it: Item): boolean {
    const cur = this.d.equip[it.slot]; if (!cur) return it.lvlReq <= this.d.level;
    if (!this.par.defAware || it.lvlReq > this.d.level) return false;
    return this.objective({ ...this.d.equip, [it.slot]: it }, true) > this.objective(this.d.equip, true) * 1.01;
  }
  /** tüccarın gerçek iş modeli: elindeki uygun parçayı güvenli artıya kadar basıp (+5'e tılsımla) pazarda ref değerinden satmak */
  private upgradeForSale() {
    const d = this.d; let n = 0;
    for (const it of [...d.items]) {
      if (n >= 2) break; if (it.tier < 1 || it.up > 0 || it.ilvl < d.level - 6 || this.wantIt(it)) continue;
      for (let g = 0; g < 8; g++) {
        const target = it.up + 1; if (target > 5) break; const cost = upgradeCost(target, it.ilvl); if (d.gold < cost.gold + 1500 || d.bag.ore < cost.ore) break;
        const useCharm = target >= 5 && d.bag.charm > 0; if (target >= 5 && !useCharm) break;
        const res = this.rpc('upgrade', { id: it.id, book: d.bag.book > 0 && target >= 3, charm: useCharm }); if (!res.ok) break; if (!res.data.success && res.data.destroyed) { this.tot.destroyed++; break; }
      }
      n++;
    }
  }
  private sellJunk() {
    const d = this.d; const r = this.eng.rng;
    if (this.arch.market.flip) this.upgradeForSale();
    for (const it of [...d.items]) {
      if (this.wantIt(it) && d.items.length < BAG_SIZE - 6) continue;
      const lvlOk = it.ilvl >= d.level - 14 || it.up >= 2; const worth = marketRef(it) > vendorPrice(it) * 3;   // artılı eski donanım kıdemsizlere gider
      if (this.arch.market.sell > r() && lvlOk && worth && this.eng.market.canList(this)) { if (this.listOnMarket(it)) continue; }
      if (d.items.length > 18 || !this.wantIt(it)) this.rpc('sell', { id: it.id });
    }
  }
  private listOnMarket(it: Item): boolean {
    const b = marketPriceBounds(it); const ref = marketRef(it); const quote = this.eng.market.quote(it, this.arch.market.flip);
    const price = Math.max(b.min, Math.min(b.max, Math.round(quote * (0.9 + this.eng.rng() * 0.25))));
    const res = this.rpc('market.list', { id: it.id, price }); if (res.ok) { this.tot.mktListed++; this.eng.market.onList(this, it, price, ref); return true; } return false;
  }
  private marketBuy() {
    const d = this.d; const lst = this.eng.market.browseFor(this); let bought = 0;
    const budget = Math.floor(d.gold * 0.5);
    const cands = lst.filter((l) => l.sellerId !== this.p.dbId && l.price <= budget && l.item.lvlReq <= d.level && l.item.ilvl >= d.level - 10);
    for (const l of cands.slice(0, 40)) {
      if (bought >= 2 || d.items.length >= BAG_SIZE - 2) break;
      const cur = d.equip[l.item.slot]; const base = this.objective(d.equip, this.par.defAware); const sc = this.objective({ ...d.equip, [l.item.slot]: l.item }, this.par.defAware);
      const gain = sc / base - 1; const flip = this.arch.market.flip && l.price < l.ref * 0.6;
      if ((gain > 0.06 && l.price <= budget) || flip) { const res = this.rpc('market.buy', { id: l.id }); if (res.ok) { bought++; this.tot.mktBought++; this.eng.market.onBuy(this, l, gain); if (flip) this.eng.market.flipHold.push({ agent: this, itemId: l.item.id, paid: l.price }); void cur; } }
    }
  }
  private obaTrip() {
    const d = this.d; this.at(HUB.otag.x + 3, HUB.otag.z);
    const keep = { ore: 60, hide: 12, wood: 10 }; const don: Record<string, number> = {};
    for (const k of ['ore', 'hide', 'wood'] as const) { const n = d.bag[k] - keep[k]; if (n > 0) don[k] = n; }
    if (Object.keys(don).length) this.rpc('oba.donate', don);
    this.rpc('oba.claim');
    const info = this.rpc('oba.state'); if (info.ok) {
      const o = info.data; if (!o.upgrade) for (const b of ['demir', 'otag'] as const) { if (o.nextCost[b] && this.rpc('oba.build', { b }).ok) break; }
    }
    for (const e of [...d.expeditions]) if (this.w.now >= e.endAt) { const res = this.rpc('oba.collect', { expId: e.id }); if (res.ok) this.reward('sefer döndü'); }
    for (const c of d.companions) if (!d.expeditions.some((e) => e.compId === c.id) && d.expeditions.length < (info.ok ? info.data.slots : 2)) this.rpc('oba.dispatch', { compId: c.id, hours: 12 });
  }

  // ───────────── karar: dilim etkinliği, kamp seçimi ─────────────
  pickActivity() {
    const r = this.eng.rng(); const a = this.arch.act; const L = this.d.level; let t = r * (a.farm + a.boss + a.rift + a.pvp);
    let act: Activity = 'farm'; if ((t -= a.farm) < 0) act = 'farm'; else if ((t -= a.boss) < 0) act = 'boss'; else if ((t -= a.rift) < 0) act = 'rift'; else act = 'pvp';
    if (act === 'boss' && !this.pickBoss()) act = 'farm';
    if (act === 'rift' && L < 5) act = 'farm'; if (act === 'pvp' && L < 8) act = 'farm';
    this.activity = act; this.pickCamp();
  }
  pickBoss(): boolean {
    const L = this.d.level; let best: Mob | null = null;
    for (const m of this.w.mobs.values()) if (m.bossId && !m.dead && m.lvl >= L - 6 && m.lvl <= L + 8) { if (!best || Math.abs(m.lvl - L - 2) < Math.abs(best.lvl - L - 2)) best = m; }
    this.bossTarget = best; return !!best;
  }
  pickCamp() {
    const L = this.d.level; const par = this.par; const camps = this.w.camps; const mode = this.arch.camp;
    // haritayı okuyan oyuncu: tehlikeli (≥ +2 seviye) kampa gitmez ve kalabalık (≥8) kamptan kaçınır (mini haritadaki renk ve sayı)
    let want = Math.max(1, Math.min(48, L + (par.readsMap ? Math.min(par.offset, 1) : par.offset))); let pool = camps;
    if (par.readsMap && mode !== 'random') {
      const ok = camps.filter((c) => c.level >= want - 3 && c.level <= want && (this.eng.occupancy.get(c.id) ?? 0) < 8);
      if (ok.length) { this.camp = ok.sort((a, b) => (this.eng.occupancy.get(a.id) ?? 0) - (this.eng.occupancy.get(b.id) ?? 0) || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[Math.floor(this.eng.rng() * Math.min(3, ok.length))]; return; }
    }
    if (par.readsMap && mode === 'random') want = Math.min(want, L + 1);
    if (mode === 'random') { const lo = Math.max(1, L - 4), hi = Math.min(48, L + 2); pool = camps.filter((c) => c.level >= lo && c.level <= hi); if (!pool.length) pool = camps; this.camp = pool[Math.floor(this.eng.rng() * pool.length)]; return; }
    if (mode === 'crowd') { let best: Camp | null = null, bn = -1; for (const c of camps) { if (c.level < L - 3 || c.level > L + 1) continue; const n = this.eng.occupancy.get(c.id) ?? 0; if (n > bn) { bn = n; best = c; } } if (best) { this.camp = best; return; } }
    const sorted = camps.slice().sort((a, b) => Math.abs(a.level - want) - Math.abs(b.level - want) || Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    const bestDelta = Math.abs(sorted[0].level - want); this.camp = sorted.filter((c) => Math.abs(c.level - want) === bestDelta)[Math.floor(this.eng.rng() * Math.min(2, sorted.filter((c) => Math.abs(c.level - want) === bestDelta).length))] ?? sorted[0];
  }

  // ───────────── gerçek zamanlı davranış ─────────────
  private go(x: number, z: number) { const dx = x - this.p.x, dz = z - this.p.z; const l = Math.hypot(dx, dz) || 1; this.w.onInput(this.p, { x: dx / l, z: dz / l }); }
  private stop() { this.w.onInput(this.p, { x: 0, z: 0 }); }
  private nearest<T extends { x: number; z: number }>(list: T[], max: number): T | null { let b: T | null = null, bd = max * max; for (const m of list) { const d = dist2(this.p, m); if (d < bd) { bd = d; b = m; } } return b; }
  private skills(near: Mob[], focusPlayer: Player | null) {
    const p = this.p; const w = this.w; const hp = p.hp / p.stats.maxHp;
    for (const i of this.par.skillOrder) {
      const sk = SKILLS[i]; if (p.d.level < sk.lvl || w.now < p.cds[i]) { this.noticeAt[i] = 0; continue; }
      if (!this.noticeAt[i]) this.noticeAt[i] = w.now + this.eng.rng() * (1 - this.par.skill) * 9000; if (w.now < this.noticeAt[i]) continue;
      const r = sk.r * p.stats.aoe; let n = 0; for (const m of near) if (dist2(p, m) <= r * r) n++; if (focusPlayer && dist2(p, focusPlayer) <= r * r) n++;
      const boss = near.some((m) => m.bossId > 0 && dist2(p, m) <= r * r);
      let use = false; switch (sk.id) { case 'hiddet': use = n >= 3 || boss || (n >= 1 && hp < 0.5); break; case 'sarsinti': use = n >= 2 || (n >= 1 && hp < 0.6); break; case 'savurma': case 'zehir': use = n >= 2 || (boss && sk.id === 'savurma'); break; case 'nara': use = near.length >= 3 && n < near.length; break; case 'kalkan': use = hp < 0.65 && near.length >= 1; break; }
      if (use) { w.onSkill(p, i); this.noticeAt[i] = 0; }
    }
  }
  /** her tick: hangi etkinlik varsa onu yürüt */
  step(ix: { campMobs: Map<number, Mob[]>; bosses: Mob[]; riftMobs: Map<number, Mob[]> }) {
    if (this.activity === 'farm') this.sliceFarmWall++;
    const p = this.p; const w = this.w; const risky = zoneAt(p.x, p.z) === 'risky';
    if (p.deadUntil > 0) { try { w.respawn(p); } catch { /* erken */ } this.resting = true; return; }
    if (this.resting) { if (risky) { this.go(0, 0); w.onAttack(p, { on: false }); this.actTicks.rest++; return; } this.stop(); w.onAttack(p, { on: false }); this.actTicks.rest++; if (p.hp >= p.stats.maxHp * 0.95) this.resting = false; return; }
    if (p.hp < p.stats.maxHp * this.par.retreat) { this.resting = true; return; }
    // saldırıya karşılık
    if (p.lastDamager && w.now - p.lastCombat < 4000 && this.par.fightBack && w.players.get(p.lastDamager) && p.lastDamager !== this.fightBackId) { this.fightBackId = p.lastDamager; this.fightBackUntil = w.now + 12000; }
    const fb = this.fightBackUntil > w.now ? w.players.get(this.fightBackId) : undefined;
    if (fb && fb.deadUntil === 0 && zoneAt(fb.x, fb.z) === 'risky') return this.attackPlayer(fb, ix, false);
    switch (this.activity) {
      case 'boss': return this.doBoss(ix);
      case 'rift': return this.doRift(ix);
      case 'pvp': return this.doPvp(ix);
      default: return this.doFarm(ix);
    }
  }
  private fightMobs(near: Mob[]) {
    const p = this.p; const w = this.w; const t = this.nearest(near, 16);
    this.skills(near, null);
    if (!t) { w.onAttack(p, { on: false }); return false; }
    const d = Math.sqrt(dist2(p, t)); const reach = Math.max(2.4, p.stats.range * 0.85 - 0.3);
    if (d > reach) this.go(t.x, t.z); else this.stop();
    w.onAttack(p, { on: true, focus: t.id }); return true;
  }
  private doFarm(ix: { campMobs: Map<number, Mob[]> }) {
    this.actTicks.farm++; this.sliceFarmTicks++;
    const c = this.camp ?? (this.pickCamp(), this.camp!); const list = ix.campMobs.get(c.id) ?? [];
    const near = list.filter((m) => dist2(this.p, m) < 256);
    if (!this.fightMobs(near)) { this.go(c.x, c.z); }
  }
  private doBoss(ix: { bosses: Mob[] }) {
    this.actTicks.boss++; const b = this.bossTarget; if (!b || b.dead) { this.activity = 'farm'; return; }
    const near = [b]; const d = Math.sqrt(dist2(this.p, b)); if (d > Math.max(3, this.p.stats.range * 0.85 - 0.3) + 2) { this.go(b.x, b.z); this.w.onAttack(this.p, { on: false }); this.skills(ix.bosses.filter((m) => dist2(this.p, m) < 400), null); return; }
    this.fightMobs(ix.bosses.filter((m) => dist2(this.p, m) < 400).concat(near).slice(0, 3));
  }
  private doRift(ix: { riftMobs: Map<number, Mob[]> }) {
    this.actTicks.rift++; let r = null as null | { x: number; z: number; id: number; state: number }; let bd = Infinity;
    for (const x of this.w.rifts.values()) if (x.state !== 3) { const d = dist2(this.p, x); if (d < bd) { bd = d; r = x; } }
    if (!r) { this.activity = 'farm'; return; }
    const mobs = ix.riftMobs.get(r.id) ?? []; const near = mobs.filter((m) => dist2(this.p, m) < 900);
    if (Math.sqrt(dist2(this.p, r)) > 14 && !near.length) { this.go(r.x, r.z); this.w.onAttack(this.p, { on: false }); return; }
    if (!this.fightMobs(near.length ? near : mobs)) this.go(r.x, r.z);
  }
  private doPvp(ix: { campMobs: Map<number, Mob[]> }) {
    this.actTicks.pvp++; const w = this.w; const p = this.p; const L = this.d.level;
    let v = this.victim ? w.players.get(this.victim) : undefined;
    if (!v || v.deadUntil > 0 || zoneAt(v.x, v.z) === 'safe') {
      this.victim = null; v = undefined; let best = Infinity;
      for (const q of w.players.values()) {
        if (q === p || q.deadUntil > 0 || q.boy === p.boy || zoneAt(q.x, q.z) === 'safe') continue;
        const dl = q.d.level - L; const ok = this.arch.pvp.lowbies ? dl <= 2 && dl >= -22 : Math.abs(dl) <= 5; if (!ok) continue;
        const d = dist2(p, q) + (this.arch.pvp.lowbies ? (dl + 22) * 30 : Math.abs(dl) * 60); if (d < best && d < 80 * 80) { best = d; v = q; }
      }
      this.victim = v ? v.id : null;
    }
    if (!v) { this.doFarm(ix); this.actTicks.farm--; this.actTicks.pvp++; return; }
    if (p.hp < p.stats.maxHp * this.arch.pvp.flee) { this.resting = true; return; }
    this.attackPlayer(v, ix, true);
  }
  private attackPlayer(q: Player, _ix: unknown, hunt: boolean) {
    const p = this.p; const w = this.w; const d = Math.sqrt(dist2(p, q)); const reach = Math.max(2.4, p.stats.range * 0.85 - 0.3);
    if (d > reach) this.go(q.x, q.z); else this.stop();
    w.onAttack(p, { on: true, focus: q.id }); this.skills([], q); void hunt;
  }

  // ───────────── ölçüm yardımcıları ─────────────
  reward(note: string) { this.sinceReward = 0; if (note) void note; }
  ledgerSince(from: number) { return this.eng.rig.db.db.prepare('SELECT id, kind, detail FROM ledger WHERE player_id = ? AND id > ? ORDER BY id').all(this.dbId, from) as unknown as { id: number; kind: string; detail: string }[]; }
}
const itemLabel = (it: Item) => `${['sıradan', 'nadir', 'destansı', 'efsanevi'][it.tier]} ${it.slot}(${it.wk ?? ''}) ilvl${it.ilvl}`;
export { DEFAULT_ORDER };
