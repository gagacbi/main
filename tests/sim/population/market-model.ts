import { MARKET, marketRef, vendorPrice, type Item } from '../../../shared/game';
import type { MarketListing } from '../../../shared/protocol';
import { goodRef, type GoodKey } from '../../../shared/goods';
import type { Agent } from './agent';
import type { Engine } from './engine';

/** Pazar davranış modeli: satıcılar vitrindeki emsal fiyatlara bakar (fiyat keşfi), tüccarlar ucuz ilanı toplar. Gerçek RPC'ler motorda çağrılır. */
export class MarketModel {
  cache: MarketListing[] | null = null; flipHold: { agent: Agent; itemId: string; paid: number }[] = [];
  constructor(public eng: Engine) {}
  invalidate() { this.cache = null; }
  /** ajanın gördüğü liste: seviyesine uygun, fırsat sırasına göre (arayüzün varsayılan görünümü) */
  browseFor(a: Agent): MarketListing[] {
    const w = this.eng.rig.world; const L = a.d.level;
    return w.ctx.db.marketBrowse({ sort: 'deal', minIlvl: Math.max(1, L - 10), maxIlvl: L + 2, limit: 120, offset: 0, now: w.now }).filter((r) => !r.slot.startsWith('good:')).map((r) => { const item = JSON.parse(r.item) as Item; return { id: r.id, sellerId: r.seller_id, seller: r.seller, item, price: r.price, expires: r.expires, ref: marketRef(item) }; });
  }
  browseAll(): MarketListing[] {
    if (this.cache) return this.cache;
    const w = this.eng.rig.world; const rows = w.ctx.db.marketBrowse({ sort: 'price', limit: 400, offset: 0, now: w.now });
    this.cache = rows.filter((r) => !r.slot.startsWith('good:')).map((r) => { const item = JSON.parse(r.item) as Item; return { id: r.id, sellerId: r.seller_id, seller: r.seller, item, price: r.price, expires: r.expires, ref: marketRef(item) }; }); return this.cache;
  }
  /** bir malın açık ilanları (ucuzdan pahalıya, birim fiyatla) */
  goodsFor(k: GoodKey): { id: number; sellerId: number; qty: number; price: number; unit: number }[] {
    const w = this.eng.rig.world; return w.ctx.db.marketBrowse({ slot: 'good:' + k, sort: 'price', limit: 60, offset: 0, now: w.now }).map((r) => { const x = JSON.parse(r.item) as { qty: number }; return { id: r.id, sellerId: r.seller_id, qty: x.qty, price: r.price, unit: r.price / Math.max(1, x.qty) }; }).sort((a, b) => a.unit - b.unit);
  }
  /** mal için emsal birim fiyat: açık ilanların ortancası, yoksa referans */
  goodUnit(k: GoodKey): number { const l = this.goodsFor(k); return l.length >= 3 ? l[Math.floor(l.length / 2)].unit : goodRef(k, 1); }
  /** emsal ilanların ortancası (aynı slot, ±4 ilvl, aynı kademe ±1, aynı artı ±1) */
  comparable(it: Item): number | null {
    const c = this.browseAll().filter((l) => l.item!.slot === it.slot && Math.abs(l.item!.ilvl - it.ilvl) <= 4 && Math.abs(l.item!.tier - it.tier) <= 1 && Math.abs(l.item!.up - it.up) <= 1).map((l) => l.price / Math.max(1, l.ref)).sort((a, b) => a - b);
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
