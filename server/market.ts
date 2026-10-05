import { BAG_SIZE, MARKET, marketPriceBounds, marketRef, vendorPrice, zoneAt, type Item } from '../shared/game';
import type { MarketListing, MarketMail } from '../shared/protocol';
import type { MarketRow } from './db';
import { GameError } from './types';
import type { Player, World } from './world';

/**
 * Oyuncular arası pazar. Tüm adımlar tek veritabanı işleminde yapılır; satıcıya ödeme posta (mail) olarak gider
 * (çevrimdışı satıcı da alır). Sinkler: ilan ücreti (%1) ve satış vergisi (%5).
 */
const rowToListing = (r: MarketRow): MarketListing => { const item = JSON.parse(r.item) as Item; return { id: r.id, sellerId: r.seller_id, seller: r.seller, item, price: r.price, expires: r.expires, ref: marketRef(item) }; };

function needTown(p: Player) { if (zoneAt(p.x, p.z) !== 'safe') throw new GameError('market_town'); }

/** Satıcının/ alıcının bekleyen postasını (akçe, eşya) çantaya alır. Çanta doluysa eşya postada kalır. */
export function claimMail(w: World, p: Player): { gold: number; items: number; left: number } {
  const db = w.ctx.db; let gold = 0, items = 0, left = 0;
  for (const m of db.mailList(p.dbId)) {
    if (m.kind === 'gold') { p.d.gold += m.gold; gold += m.gold; db.mailDelete(m.id); }
    else { if (p.d.items.length >= BAG_SIZE) { left++; continue; } p.d.items.push(JSON.parse(m.item!) as Item); items++; db.mailDelete(m.id); }
  }
  if (gold || items) { w.ledger(p, 'market.claim', { gold, items }); w.save(p); p.meDirty = true; }
  return { gold, items, left };
}

export function marketRpc(w: World, p: Player, op: string, a: any): unknown {
  const db = w.ctx.db; const now = w.now;
  switch (op) {
    case 'market.browse': {
      const rows = db.marketBrowse({ slot: typeof a.slot === 'string' ? a.slot : undefined, minTier: Number.isFinite(a.minTier) ? a.minTier : undefined, maxPrice: Number.isFinite(a.maxPrice) ? a.maxPrice : undefined, minIlvl: Number.isFinite(a.minIlvl) ? a.minIlvl : undefined, maxIlvl: Number.isFinite(a.maxIlvl) ? a.maxIlvl : undefined, minUp: Number.isFinite(a.minUp) ? a.minUp : undefined, sort: a.sort === 'new' ? 'new' : a.sort === 'deal' ? 'deal' : 'price', limit: MARKET.pageSize, offset: Math.max(0, Math.floor(a.offset ?? 0)), now });
      return { listings: rows.map(rowToListing), total: db.marketOpenCount() };
    }
    case 'market.mine': {
      const mail: MarketMail[] = db.mailList(p.dbId).map((m) => ({ id: m.id, kind: m.kind, gold: m.gold, item: m.item ? (JSON.parse(m.item) as Item) : undefined, note: m.note }));
      return { listings: db.marketSellerOpen(p.dbId).map(rowToListing), mail, max: MARKET.maxListings };
    }
    case 'market.claim': { w.alive(p); return claimMail(w, p); }
    case 'market.list': {
      w.alive(p); needTown(p); db.marketExpire(now);
      const row = db.playerById(p.dbId)!; if ((now - row.created) / 3600000 < MARKET.newAccountH) throw new GameError('market_new_account', { h: MARKET.newAccountH });
      if (db.marketSellerOpen(p.dbId).length >= MARKET.maxListings) throw new GameError('market_full', { n: MARKET.maxListings });
      const i = p.d.items.findIndex((x) => x.id === a.id); if (i < 0) throw new GameError('no_item');   // kuşanılmış eşya satılamaz
      const it = p.d.items[i]; const price = Math.floor(Number(a.price)); const b = marketPriceBounds(it);
      if (!Number.isFinite(price) || price < b.min) throw new GameError('market_price_low', { min: b.min });
      if (price > b.max) throw new GameError('market_price_high', { max: b.max });
      const fee = Math.max(MARKET.listFeeMin, Math.round(price * MARKET.listFeePct)); if (p.d.gold < fee) throw new GameError('no_gold');
      let id = 0;
      db.tx(() => { p.d.gold -= fee; p.d.items.splice(i, 1); id = db.marketInsert({ sellerId: p.dbId, seller: p.name, item: JSON.stringify(it), slot: it.slot, tier: it.tier, ilvl: it.ilvl, up: it.up, ref: marketRef(it), price, created: now, expires: now + MARKET.durationH * 3600000 }); w.save(p); });
      w.ledger(p, 'market.list', { listing: id, item: it.id, price, fee, ref: marketRef(it), suspicious: price > marketRef(it) * 4 });
      p.meDirty = true; return { id, fee };
    }
    case 'market.cancel': {
      w.alive(p); const r = db.marketGet(Math.floor(a.id)); if (!r || r.seller_id !== p.dbId) throw new GameError('market_gone');
      if (p.d.items.length >= BAG_SIZE) throw new GameError('bag_full');
      db.tx(() => { db.marketSetStatus(r.id, 'cancelled'); p.d.items.push(JSON.parse(r.item) as Item); w.save(p); });
      w.ledger(p, 'market.cancel', { listing: r.id }); p.meDirty = true; return null;
    }
    case 'market.buy': {
      w.alive(p); needTown(p); db.marketExpire(now);
      const r = db.marketGet(Math.floor(a.id)); if (!r || r.expires <= now) throw new GameError('market_gone');
      if (r.seller_id === p.dbId) throw new GameError('market_own');
      if (p.d.items.length >= BAG_SIZE) throw new GameError('bag_full');
      if (p.d.gold < r.price) throw new GameError('no_gold');
      const it = JSON.parse(r.item) as Item; const tax = Math.round(r.price * MARKET.taxPct); const proceeds = r.price - tax;
      db.tx(() => { db.marketSetStatus(r.id, 'sold'); p.d.gold -= r.price; p.d.items.push(it); db.mailAdd(r.seller_id, 'gold', proceeds, null, `sold:${r.id}`, now); w.save(p); });
      w.ledger(p, 'market.buy', { listing: r.id, item: it.id, price: r.price, seller: r.seller_id });
      db.ledger(now, r.seller_id, 'market.sale', { listing: r.id, item: it.id, price: r.price, tax, proceeds, buyer: p.dbId, vendor: vendorPrice(it) });
      w.ctx.mailFlag.add(r.seller_id); p.meDirty = true;
      return { item: it, price: r.price, tax };
    }
  }
  throw new GameError('bad_op');
}
