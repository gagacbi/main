import { BAG_SIZE, MARKET, marketPriceBounds, marketRef, vendorPrice, inHubTown, type Item } from '../shared/game';
import type { MarketListing, MarketMail } from '../shared/protocol';
import { goodAdd, goodBounds, goodGet, goodRef, isGood, type GoodKey } from '../shared/goods';
import type { MarketRow } from './db';
import { GameError } from './types';
import type { Player, World } from './world';

/**
 * Oyuncular arası pazar. Tüm adımlar tek veritabanı işleminde yapılır; satıcıya ödeme posta (mail) olarak gider
 * (çevrimdışı satıcı da alır). Sinkler: ilan ücreti (%1) ve satış vergisi (%5).
 */
type Stored = Item & { good?: GoodKey; qty?: number };
const parse = (raw: string) => JSON.parse(raw) as Stored;
const rowToListing = (r: MarketRow): MarketListing => { const x = parse(r.item); if (x.good) return { id: r.id, sellerId: r.seller_id, seller: r.seller, good: { k: x.good, qty: x.qty ?? 1 }, price: r.price, expires: r.expires, ref: r.ref }; return { id: r.id, sellerId: r.seller_id, seller: r.seller, item: x, price: r.price, expires: r.expires, ref: marketRef(x) }; };
const mailOf = (m: { id: number; kind: 'gold' | 'item'; gold: number; item: string | null; note: string }): MarketMail => { const x = m.item ? parse(m.item) : undefined; return { id: m.id, kind: m.kind, gold: m.gold, ...(x?.good ? { good: { k: x.good, qty: x.qty ?? 1 } } : x ? { item: x as Item } : {}), note: m.note }; };

function needTown(p: Player) { if (!inHubTown(p.x, p.z)) throw new GameError('market_town'); }

/** Satıcının/ alıcının bekleyen postasını (akçe, eşya) çantaya alır. Çanta doluysa eşya postada kalır. */
export function claimMail(w: World, p: Player): { gold: number; items: number; left: number } {
  const db = w.ctx.db; let gold = 0, items = 0, left = 0;
  for (const m of db.mailList(p.dbId)) {
    if (m.kind === 'gold') { p.d.gold += m.gold; gold += m.gold; db.mailDelete(m.id); }
    else { const x = parse(m.item!); if (x.good) { goodAdd(p.d, x.good, x.qty ?? 1); items++; db.mailDelete(m.id); continue; } if (p.d.items.length >= BAG_SIZE) { left++; continue; } p.d.items.push(x as Item); items++; db.mailDelete(m.id); }
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
      const mail: MarketMail[] = db.mailList(p.dbId).map(mailOf);
      return { listings: db.marketSellerOpen(p.dbId).map(rowToListing), mail, max: MARKET.maxListings };
    }
    case 'market.claim': { w.alive(p); return claimMail(w, p); }
    case 'market.list': {
      w.alive(p); needTown(p); db.marketExpire(now);
      const row = db.playerById(p.dbId)!; if ((now - row.created) / 3600000 < MARKET.newAccountH) throw new GameError('market_new_account', { h: MARKET.newAccountH });
      if (db.marketSellerOpen(p.dbId).length >= MARKET.maxListings) throw new GameError('market_full', { n: MARKET.maxListings });
      if (a.good !== undefined) { // yığın mal ilanı
        if (!isGood(a.good)) throw new GameError('bad_item'); const qty = Math.floor(Number(a.qty)); const price = Math.floor(Number(a.price));
        if (!(qty >= 1) || qty > goodGet(p.d, a.good)) throw new GameError('no_item'); const b = goodBounds(a.good, qty);
        if (!Number.isFinite(price) || price < b.min) throw new GameError('market_price_low', { min: b.min }); if (price > b.max) throw new GameError('market_price_high', { max: b.max });
        const fee = Math.max(MARKET.listFeeMin, Math.round(price * MARKET.listFeePct)); if (p.d.gold < fee) throw new GameError('no_gold'); let gid = 0;
        db.tx(() => { p.d.gold -= fee; goodAdd(p.d, a.good, -qty); gid = db.marketInsert({ sellerId: p.dbId, seller: p.name, item: JSON.stringify({ good: a.good, qty }), slot: 'good:' + a.good, tier: 0, ilvl: 0, up: 0, ref: goodRef(a.good, qty), price, created: now, expires: now + MARKET.durationH * 3600000 }); w.save(p); });
        w.ledger(p, 'market.list', { listing: gid, good: a.good, qty, price, fee, ref: goodRef(a.good, qty), suspicious: price > goodRef(a.good, qty) * 6 }); p.meDirty = true; return { id: gid, fee };
      }
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
      const cx = parse(r.item); if (!cx.good && p.d.items.length >= BAG_SIZE) throw new GameError('bag_full');
      db.tx(() => { db.marketSetStatus(r.id, 'cancelled'); if (cx.good) goodAdd(p.d, cx.good, cx.qty ?? 1); else p.d.items.push(cx as Item); w.save(p); });
      w.ledger(p, 'market.cancel', { listing: r.id }); p.meDirty = true; return null;
    }
    case 'market.buy': {
      w.alive(p); needTown(p); db.marketExpire(now);
      const r = db.marketGet(Math.floor(a.id)); if (!r || r.expires <= now) throw new GameError('market_gone');
      if (r.seller_id === p.dbId) throw new GameError('market_own');
      const it = parse(r.item) as Stored; const isG = !!it.good; if (!isG && p.d.items.length >= BAG_SIZE) throw new GameError('bag_full');
      if (p.d.gold < r.price) throw new GameError('no_gold');
      const tax = Math.round(r.price * MARKET.taxPct); const proceeds = r.price - tax;
      db.tx(() => { db.marketSetStatus(r.id, 'sold'); p.d.gold -= r.price; if (isG) goodAdd(p.d, it.good!, it.qty ?? 1); else p.d.items.push(it as Item); db.mailAdd(r.seller_id, 'gold', proceeds, null, `sold:${r.id}`, now); w.save(p); });
      w.ledger(p, 'market.buy', { listing: r.id, item: isG ? it.good : it.id, price: r.price, seller: r.seller_id });
      db.ledger(now, r.seller_id, 'market.sale', { listing: r.id, item: isG ? it.good : it.id, price: r.price, tax, proceeds, buyer: p.dbId, vendor: isG ? Math.round(r.ref / 6) : vendorPrice(it as Item) });
      w.ctx.mailFlag.add(r.seller_id); p.meDirty = true;
      return isG ? { good: { k: it.good, qty: it.qty ?? 1 }, price: r.price, tax } : { item: it, price: r.price, tax };
    }
  }
  throw new GameError('bad_op');
}
