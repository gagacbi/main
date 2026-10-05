import { MARKET, marketRef, vendorPrice, type Item } from '../../../shared/game';
import type { MarketListing } from '../../../shared/protocol';
import type { Agent } from './agent';
import type { Engine } from './engine';

/** Pazar davranış modeli: satıcılar vitrindeki emsal fiyatlara bakar (fiyat keşfi), tüccarlar ucuz ilanı toplar. Gerçek RPC'ler motorda çağrılır. */
export class MarketModel {
  cache: MarketListing[] | null = null; flipHold: { agent: Agent; itemId: string; paid: number }[] = [];
  constructor(public eng: Engine) {}
  invalidate() { this.cache = null; }
  browseAll(): MarketListing[] {
    if (this.cache) return this.cache;
    const w = this.eng.rig.world; const rows = w.ctx.db.marketBrowse({ sort: 'price', limit: 400, offset: 0, now: w.now });
    this.cache = rows.map((r) => { const item = JSON.parse(r.item) as Item; return { id: r.id, sellerId: r.seller_id, seller: r.seller, item, price: r.price, expires: r.expires, ref: marketRef(item) }; }); return this.cache;
  }
  /** emsal ilanların ortancası (aynı slot, ±4 ilvl, aynı kademe ±1, aynı artı ±1) */
  comparable(it: Item): number | null {
    const c = this.browseAll().filter((l) => l.item.slot === it.slot && Math.abs(l.item.ilvl - it.ilvl) <= 4 && Math.abs(l.item.tier - it.tier) <= 1 && Math.abs(l.item.up - it.up) <= 1).map((l) => l.price / Math.max(1, l.ref)).sort((a, b) => a - b);
    return c.length >= 3 ? c[Math.floor(c.length / 2)] : null;
  }
  quote(it: Item, flip: boolean): number {
    const ref = marketRef(it); const med = this.comparable(it);
    if (med !== null) return Math.round(ref * med * (flip ? 0.96 : 1));   // vitrin emsaline göre
    return Math.round(ref * (flip ? 0.95 : 1.1));
  }
  canList(a: Agent) { const row = this.eng.rig.db.playerById(a.dbId)!; return (this.eng.rig.world.now - row.created) / 3600000 >= MARKET.newAccountH && this.eng.rig.db.marketSellerOpen(a.dbId).length < MARKET.maxListings; }
  craftBudget(a: Agent) { return a.d.gold > 4000; }
  onList(a: Agent, _it: Item, _price: number, _ref: number) { this.invalidate(); void a; }
  onBuy(_a: Agent, _l: MarketListing, _gain: number) { this.invalidate(); }
}
export const vendorOf = vendorPrice;
