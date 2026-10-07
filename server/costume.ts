import {
  COSTUME, COS_MATS, DAY, LOOM_POS, LOOKS, LUCK_KEYS, addLineCost, costLevel, costumeLines, craftChance, extendCost, gold, inGrace, isExpired, loomRoll, newCostume, newCostumeState, rerollAllCost, rerollLineCost, rollLine,
  type CosMat, type Costume, type CostumeState, type CostumeTier, type LoomKind, type LuckKey,
} from '../shared/costume';
import { inHubTown } from '../shared/game';
import { dist } from '../shared/world';
import { GameError } from './types';
import type { Player, World } from './world';

export const cosOf = (p: Player): CostumeState => (p.d.cos ??= newCostumeState());
const needLoom = (p: Player) => { if (!inHubTown(p.x, p.z) || dist(p, LOOM_POS) > LOOM_POS.interact + 1) throw new GameError('too_far'); };
const find = (s: CostumeState, id: string): Costume | null => (s.worn?.id === id ? s.worn : s.bag.find((c) => c.id === id) ?? null);
const pay = (w: World, p: Player, g: number, kind: string, detail: unknown) => { if (p.d.gold < g) throw new GameError('no_gold'); p.d.gold -= g; w.ledger(p, kind, { ...(detail as object), gold: g }); };

/** Süresi dolanları çantaya al, tolerans süresini aşanları sil. Değişim varsa true. */
export function tickCostumes(w: World, p: Player): boolean {
  const s = cosOf(p); const now = w.now; let ch = false;
  if (s.worn && isExpired(s.worn, now)) { s.bag.push(s.worn); s.worn = null; ch = true; w.sys(p, 'sys.cos_expired'); }
  const keep = s.bag.filter((c) => !isExpired(c, now) || inGrace(c, now)); if (keep.length !== s.bag.length) { s.bag = keep; ch = true; w.sys(p, 'sys.cos_lost'); }
  for (const c of [s.worn, ...s.bag]) { if (!c) continue; const left = c.expiresAt - now; if (left > 0 && left < DAY && now - p.cosWarnAt > 6 * 3600000) { p.cosWarnAt = now; w.sys(p, 'sys.cos_soon', { h: Math.max(1, Math.round(left / 3600000)) }); } }
  if (ch) { w.recalc(p); p.meDirty = true; }
  return ch;
}

export function costumeRpc(w: World, p: Player, a: Record<string, unknown>): unknown {
  w.alive(p); const op = String(a.op); const s = cosOf(p); const now = w.now; const L = p.d.level; const rng = w.ctx.rng; tickCostumes(w, p);
  const costume = (): Costume => { const c = find(s, String(a.id)); if (!c) throw new GameError('no_costume'); return c; };
  switch (op) {
    case 'wear': {
      if (a.id == null) { if (s.worn) { s.bag.push(s.worn); s.worn = null; } }
      else { const i = s.bag.findIndex((c) => c.id === a.id); if (i < 0) throw new GameError('no_costume'); const c = s.bag[i]; if (isExpired(c, now)) throw new GameError('cos_expired'); if (L < COSTUME.tierLevel[c.tier]) throw new GameError('level_low', { lvl: COSTUME.tierLevel[c.tier] }); s.bag.splice(i, 1); if (s.worn) s.bag.push(s.worn); s.worn = c; }
      w.recalc(p); p.meDirty = true; return null;
    }
    case 'discard': { const i = s.bag.findIndex((c) => c.id === a.id); if (i < 0) throw new GameError('no_costume'); s.bag.splice(i, 1); p.meDirty = true; return null; }
    case 'loom.start': {
      needLoom(p); const kind = (a.kind === 'weekly' ? 'weekly' : 'daily') as LoomKind; if (s.loom) throw new GameError('loom_busy');
      pay(w, p, gold(L, kind === 'weekly' ? COSTUME.loomWeekly : COSTUME.loomDaily), 'cos.loom', { kind });
      s.loom = { kind, endAt: now + (kind === 'weekly' ? COSTUME.loomWeeklyDays * DAY : COSTUME.loomDailyHours * 3600000) }; p.meDirty = true; return null;
    }
    case 'loom.collect': {
      needLoom(p); if (!s.loom) throw new GameError('loom_empty'); if (now < s.loom.endAt) throw new GameError('loom_wait');
      const rolls = s.loom.kind === 'weekly' ? 7 : 1; const got: Partial<Record<CosMat | LuckKey, number>> = {};
      for (let i = 0; i < rolls; i++) { const r = loomRoll(rng); for (const [k, v] of Object.entries(r.mats)) { s.mats[k as CosMat] += v; got[k as CosMat] = (got[k as CosMat] ?? 0) + v; } for (const [k, v] of Object.entries(r.luck)) { s.luck[k as LuckKey] += v; got[k as LuckKey] = (got[k as LuckKey] ?? 0) + v; } }
      if (s.loom.kind === 'weekly' && rng() < 0.35) { s.luck.boncuk++; got.boncuk = (got.boncuk ?? 0) + 1; }
      s.loom = null; w.ledger(p, 'cos.collect', { got }); p.meDirty = true; return got;
    }
    case 'buy': {
      needLoom(p); const k = String(a.item) as LuckKey; if (!LUCK_KEYS.includes(k)) throw new GameError('bad_item'); const n = Math.max(1, Math.min(10, Math.floor(Number(a.n) || 1)));
      pay(w, p, gold(L, COSTUME.shop[k]) * n, 'cos.shop', { item: k, n }); s.luck[k] += n; p.meDirty = true; return null;
    }
    case 'craft': {
      needLoom(p); const tier = Math.max(0, Math.min(3, Math.floor(Number(a.tier)))) as CostumeTier; const look = Math.floor(Number(a.look));
      if (!(look >= 0 && look < LOOKS.length)) throw new GameError('bad_item');
      if (L < COSTUME.tierLevel[tier]) throw new GameError('level_low', { lvl: COSTUME.tierLevel[tier] });
      if (s.bag.length >= COSTUME.bagMax) throw new GameError('cos_bag_full');
      const need = COSTUME.craftMats[tier]; for (const m of COS_MATS) if (s.mats[m] < need[m]) throw new GameError('cos_mats');
      const boncuk = Math.max(0, Math.min(COSTUME.boncukMax, Math.floor(Number(a.boncuk) || 0))); const dugum = a.dugum ? 1 : 0;
      if (s.luck.boncuk < boncuk || s.luck.dugum < dugum) throw new GameError('cos_luck');
      pay(w, p, gold(L, COSTUME.craftGold[tier]), 'cos.craft', { tier, boncuk, dugum });
      for (const m of COS_MATS) s.mats[m] -= need[m]; s.luck.boncuk -= boncuk; s.luck.dugum -= dugum;
      const chance = craftChance(tier, s.pity, boncuk); const ok = rng() < chance;
      if (ok) { const c = newCostume(rng, look, tier, now, L); s.bag.push(c); s.pity = 0; s.crafted++; p.meDirty = true; w.ledger(p, 'cos.made', { tier, look, chance }); return { ok: true, id: c.id, chance }; }
      s.pity++; let back: Partial<Record<CosMat, number>> | undefined;
      if (dugum) { back = {}; for (const m of COS_MATS) { const r = Math.floor(need[m] * COSTUME.dugumReturn); s.mats[m] += r; back[m] = r; } }
      p.meDirty = true; w.ledger(p, 'cos.fail', { tier, chance, pity: s.pity }); return { ok: false, chance, back };
    }
    case 'ench.add': {
      needLoom(p); const c = costume(); if (isExpired(c, now)) throw new GameError('cos_expired'); if (c.ench.length >= COSTUME.maxLines) throw new GameError('cos_lines_full');
      const nazar = a.nazar ? 1 : 0; if (nazar && s.luck.nazar < 1) throw new GameError('cos_luck');
      pay(w, p, addLineCost(c, costLevel(c, L)), 'cos.ench', { op: 'add', tier: c.tier }); s.luck.nazar -= nazar;
      c.ench.push(rollLine(rng, c.tier, [LOOKS[c.look].base, ...c.ench.map((e) => e.k)], !!nazar)); p.meDirty = true; w.recalc(p); return null;
    }
    case 'ench.reroll': {
      needLoom(p); const c = costume(); if (isExpired(c, now)) throw new GameError('cos_expired'); if (!c.ench.length) throw new GameError('cos_no_lines');
      const nazar = a.nazar ? 1 : 0; if (nazar && s.luck.nazar < 1) throw new GameError('cos_luck');
      if (s.luck.kagit < 1) throw new GameError('cos_paper');
      pay(w, p, rerollAllCost(c, costLevel(c, L)), 'cos.ench', { op: 'reroll', tier: c.tier, rr: c.rr }); s.luck.nazar -= nazar; s.luck.kagit--;
      const n = c.ench.length; c.ench = []; for (let i = 0; i < n; i++) c.ench.push(rollLine(rng, c.tier, [LOOKS[c.look].base, ...c.ench.map((e) => e.k)], !!nazar));
      c.rr++; p.meDirty = true; w.recalc(p); return null;
    }
    case 'ench.line': {
      needLoom(p); const c = costume(); if (isExpired(c, now)) throw new GameError('cos_expired'); const i = Math.floor(Number(a.line)); if (!(i >= 0 && i < c.ench.length)) throw new GameError('cos_no_lines');
      const nazar = a.nazar ? 1 : 0; if (nazar && s.luck.nazar < 1) throw new GameError('cos_luck');
      if (s.luck.kagit < 1) throw new GameError('cos_paper');
      pay(w, p, rerollLineCost(c, costLevel(c, L)), 'cos.ench', { op: 'line', tier: c.tier, rr: c.rr }); s.luck.nazar -= nazar; s.luck.kagit--;
      const others = c.ench.filter((_, j) => j !== i).map((e) => e.k); c.ench[i] = rollLine(rng, c.tier, [LOOKS[c.look].base, ...others], !!nazar); c.rr++; p.meDirty = true; w.recalc(p); return null;
    }
    case 'look': {
      needLoom(p); const c = costume(); const look = Math.floor(Number(a.look)); if (!(look >= 0 && look < LOOKS.length) || look === c.look) throw new GameError('bad_item');
      pay(w, p, gold(costLevel(c, L), COSTUME.lookChange), 'cos.look', { tier: c.tier }); c.look = look; p.meDirty = true; w.recalc(p); return null;
    }
    case 'extend': {
      needLoom(p); const c = costume(); const exp = isExpired(c, now); if (exp && !inGrace(c, now)) throw new GameError('cos_lost');
      const from = exp ? now : c.expiresAt; if (from + COSTUME.extendDays * DAY - now > COSTUME.maxDays * DAY) throw new GameError('cos_max');
      pay(w, p, extendCost(c, costLevel(c, L), exp), 'cos.extend', { tier: c.tier, lines: c.ench.length, expired: exp }); c.expiresAt = from + COSTUME.extendDays * DAY; p.meDirty = true; w.recalc(p); return null;
    }
  }
  throw new GameError('bad_item');
}
export { costumeLines };
