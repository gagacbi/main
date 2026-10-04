import {
  BUILDINGS, COMPANION_NAMES, EXPEDITION_HOURS, NOVICE_MAX_LEVEL, OBA, TRAITS, makeItem, randomSlot, rollTier, type BuildingKey, type Boy, type Companion, type Expedition, type ExpeditionResult, type MatKey, type Trait,
} from '../shared/game';
import {  mulberry32, pick } from '../shared/rng';
import type { ObaInfo } from '../shared/protocol';
import { GameError, type Ctx, type PlayerData } from './types';

export interface OymakRec {
  id: number; boy: Boy; name: string; npc: string;
  lv: Record<BuildingKey, number>; up: { b: BuildingKey; to: number; finishAt: number } | null;
  storage: { ore: number; hide: number; wood: number };
}
export interface Actor { dbId: number; name: string; d: PlayerData; oymakId: number; points: number }

export function loadOymak(ctx: Ctx, id: number): OymakRec {
  let o = ctx.oymaks.get(id);
  if (!o) {
    const row = ctx.db.oymak(id);
    if (!row) throw new GameError('no_oymak');
    const d = JSON.parse(row.data);
    o = { id, boy: row.boy, name: row.name, npc: row.npc, lv: d.lv, up: d.up, storage: d.storage };
    ctx.oymaks.set(id, o);
  }
  settle(ctx, o);
  return o;
}
export function saveOymak(ctx: Ctx, o: OymakRec) {
  ctx.db.saveOymak(o.id, JSON.stringify({ lv: o.lv, up: o.up, storage: o.storage }));
}
/** Yükseltme bitiş zamanı geçtiyse tamamla (çevrimdışı ilerleme: sonuç, ilk erişimde hesaplanır). */
export function settle(ctx: Ctx, o: OymakRec) {
  if (o.up && ctx.clock.now() >= o.up.finishAt) {
    o.lv[o.up.b] = o.up.to; o.up = null; saveOymak(ctx, o);
  }
}

export function makeCompanion(rng: () => number, level = 1): Companion {
  const t1 = pick(rng, TRAITS); let t2 = pick(rng, TRAITS); if (t2 === t1) t2 = TRAITS[(TRAITS.indexOf(t1) + 1) % TRAITS.length];
  return { id: 'c' + Math.floor(rng() * 1e9).toString(36), name: pick(rng, COMPANION_NAMES), cls: pick(rng, ['alp', 'kam', 'mergen'] as const), level, xp: 0, traits: [t1, t2] };
}
export function ensureCompanions(ctx: Ctx, a: Actor, otag: number) {
  const want = OBA.slots(otag);
  while (a.d.companions.length < want) a.d.companions.push(makeCompanion(ctx.rng, Math.max(1, Math.floor(a.d.level / 3))));
}

function share(ctx: Ctx, a: Actor) {
  const w = ctx.db.oymakWeight(a.oymakId, OBA.baseWeight);
  const row = ctx.db.playerById(a.dbId);
  const total = w.total + (a.points - (row?.points ?? a.points));
  return { share: (a.points + OBA.baseWeight) / Math.max(1, total), members: w.members };
}

export function pendingProduction(ctx: Ctx, o: OymakRec, a: Actor) {
  const hours = Math.max(0, Math.min(OBA.capHours(o.lv.otag), (ctx.clock.now() - a.d.claimAt) / 3600000));
  const r = OBA.rate(o.lv.otag, o.lv.demir); const s = share(ctx, a).share;
  return { ore: Math.floor(r.ore * hours * s), hide: Math.floor(r.hide * hours * s), wood: Math.floor(r.wood * hours * s), hours, share: s };
}

export function obaInfo(ctx: Ctx, a: Actor): ObaInfo {
  const o = loadOymak(ctx, a.oymakId);
  ensureCompanions(ctx, a, o.lv.otag);
  const pend = pendingProduction(ctx, o, a); const sh = share(ctx, a);
  const nextCost: ObaInfo['nextCost'] = {};
  for (const b of BUILDINGS) {
    const to = o.lv[b] + 1;
    const cap = b === 'otag' ? NOVICE_MAX_LEVEL : Math.min(NOVICE_MAX_LEVEL, o.lv.otag);
    nextCost[b] = to > cap ? null : { gold: OBA.upgradeGold(to), ...OBA.upgradeRes(to), sec: OBA.upgradeSec(to) };
  }
  return {
    id: o.id, name: o.name, npc: o.npc, members: sh.members, memberCap: OBA.memberCap(o.lv.otag), levels: { ...o.lv }, maxLevel: NOVICE_MAX_LEVEL,
    upgrade: o.up ? { ...o.up } : null, storage: { ...o.storage }, rate: OBA.rate(o.lv.otag, o.lv.demir), capHours: OBA.capHours(o.lv.otag),
    pending: { ore: pend.ore, hide: pend.hide, wood: pend.wood, hours: pend.hours }, share: sh.share, points: a.points, rank: 0, slots: OBA.slots(o.lv.otag), nextCost,
  };
}

export function donate(ctx: Ctx, a: Actor, amounts: Partial<Record<MatKey, number>>) {
  const o = loadOymak(ctx, a.oymakId);
  let total = 0;
  for (const k of ['ore', 'hide', 'wood'] as MatKey[]) {
    const n = Math.floor(amounts[k] ?? 0);
    if (n < 0) throw new GameError('bad_amount');
    if (n > a.d.bag[k]) throw new GameError('not_enough');
    total += n;
  }
  if (total <= 0) throw new GameError('bad_amount');
  for (const k of ['ore', 'hide', 'wood'] as MatKey[]) {
    const n = Math.floor(amounts[k] ?? 0); a.d.bag[k] -= n; o.storage[k] += n;
  }
  a.points += total; saveOymak(ctx, o);
  ctx.db.ledger(ctx.clock.now(), a.dbId, 'oba.donate', { amounts, points: total });
  return total;
}

export function claim(ctx: Ctx, a: Actor) {
  const o = loadOymak(ctx, a.oymakId);
  const p = pendingProduction(ctx, o, a);
  a.d.bag.ore += p.ore; a.d.bag.hide += p.hide; a.d.bag.wood += p.wood;
  a.d.claimAt = ctx.clock.now();
  ctx.db.ledger(ctx.clock.now(), a.dbId, 'oba.claim', { ore: p.ore, hide: p.hide, wood: p.wood, hours: +p.hours.toFixed(3), share: +p.share.toFixed(3) });
  return p;
}

export function build(ctx: Ctx, a: Actor, b: BuildingKey) {
  if (!BUILDINGS.includes(b)) throw new GameError('bad_building');
  const o = loadOymak(ctx, a.oymakId);
  if (o.up) throw new GameError('upgrade_busy');
  const to = o.lv[b] + 1;
  const cap = b === 'otag' ? NOVICE_MAX_LEVEL : Math.min(NOVICE_MAX_LEVEL, o.lv.otag);
  if (to > NOVICE_MAX_LEVEL) throw new GameError('novice_cap');
  if (to > cap) throw new GameError('otag_cap');
  const gold = OBA.upgradeGold(to); const res = OBA.upgradeRes(to);
  if (a.d.gold < gold) throw new GameError('no_gold');
  for (const k of ['ore', 'hide', 'wood'] as MatKey[]) if (o.storage[k] < res[k]) throw new GameError('oba_short', { need: res[k], have: o.storage[k], res: k });
  a.d.gold -= gold; for (const k of ['ore', 'hide', 'wood'] as MatKey[]) o.storage[k] -= res[k];
  o.up = { b, to, finishAt: ctx.clock.now() + OBA.upgradeSec(to) * 1000 };
  a.points += OBA.upgradePoints(to);
  saveOymak(ctx, o);
  ctx.db.ledger(ctx.clock.now(), a.dbId, 'oba.build', { b, to, gold, res, finishAt: o.up.finishAt });
  return o.up;
}

export function dispatch(ctx: Ctx, a: Actor, compId: string, hours: number): Expedition {
  const o = loadOymak(ctx, a.oymakId);
  ensureCompanions(ctx, a, o.lv.otag);
  if (!(EXPEDITION_HOURS as readonly number[]).includes(hours)) throw new GameError('bad_hours');
  const c = a.d.companions.find((x) => x.id === compId);
  if (!c) throw new GameError('no_companion');
  if (a.d.expeditions.some((e) => e.compId === compId)) throw new GameError('comp_busy');
  if (a.d.expeditions.length >= OBA.slots(o.lv.otag)) throw new GameError('slots_full');
  const now = ctx.clock.now();
  const dur = hours * 3600000 * (c.traits.includes('cevik') ? 0.85 : 1);
  const e: Expedition = { id: 'e' + Math.floor(ctx.rng() * 1e9).toString(36), compId, hours, startAt: now, endAt: Math.round(now + dur), seed: Math.floor(ctx.rng() * 2 ** 31) };
  a.d.expeditions.push(e);
  a.points += 5 * hours;
  ctx.db.ledger(now, a.dbId, 'exp.dispatch', { compId, hours, endAt: e.endAt });
  return e;
}

/** Deterministik sefer sonucu (tohum = sefer başında yazılır). */
export function rollExpedition(e: Pick<Expedition, 'seed' | 'hours'>, c: Companion, ownerLevel: number): ExpeditionResult {
  const r = mulberry32(e.seed); const h = e.hours; const has = (t: Trait) => c.traits.includes(t);
  const gold = Math.round((60 + c.level * 15 + ownerLevel * 8) * h * (has('tuccar') ? 1.4 : 1) * (0.85 + 0.3 * r()));
  const mats: Partial<Record<MatKey, number>> = {};
  for (const k of ['ore', 'hide', 'wood'] as MatKey[]) mats[k] = Math.round(h * (2 + r() * 4) * (0.6 + c.level * 0.1));
  const items = [];
  const itemChance = Math.min(0.92, 0.14 * Math.pow(h, 0.9) * (has('gozupek') ? 1.3 : 1));
  const n = h >= 12 ? 2 : 1;
  for (let i = 0; i < n; i++) if (r() < itemChance) items.push(makeItem(r, randomSlot(r), Math.max(1, ownerLevel), rollTier(r, h >= 12 ? 1 : 0, h >= 4 ? 0.5 : 0)));
  const fragChance = Math.min(0.85, 0.05 * h * (has('sansli') ? 2 : 1));
  let frag = 0; for (let i = 0; i < (h >= 12 ? 2 : 1); i++) if (r() < fragChance) frag++;
  const compXp = 20 * h;
  const newXp = c.xp + compXp;
  return { gold, mats, items, frag, compXp, compLevelUp: newXp >= 100 * c.level };
}

export function collect(ctx: Ctx, a: Actor, expId: string): ExpeditionResult {
  const i = a.d.expeditions.findIndex((x) => x.id === expId);
  if (i < 0) throw new GameError('no_expedition');
  const e = a.d.expeditions[i];
  if (ctx.clock.now() < e.endAt) throw new GameError('exp_not_done', { left: e.endAt - ctx.clock.now() });
  const c = a.d.companions.find((x) => x.id === e.compId)!;
  const res = rollExpedition(e, c, a.d.level);
  a.d.expeditions.splice(i, 1);
  a.d.gold += res.gold;
  for (const k of ['ore', 'hide', 'wood'] as MatKey[]) a.d.bag[k] += res.mats[k] ?? 0;
  a.d.bag.frag += res.frag;
  c.xp += res.compXp; if (res.compLevelUp) { c.level++; c.xp = 0; }
  ctx.db.ledger(ctx.clock.now(), a.dbId, 'exp.collect', { expId, gold: res.gold, mats: res.mats, items: res.items.length, frag: res.frag });
  return res;
}
