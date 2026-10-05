import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { BAG_SIZE, MARKET, marketPriceBounds, marketRef, makeItem, vendorPrice, type Item } from '../../shared/game';

const H = 3600 * 1000;
function setup() {
  const rig = makeRig(5, { spawnCamps: false }); const w = rig.world;
  const seller = rig.add('gok'); const buyer = rig.add('yer');
  rig.clock.advance(MARKET.newAccountH * H + 1000);          // hesaplar yeterince yaşlı
  for (const p of [seller, buyer]) { p.x = 0; p.z = 5; p.d.gold = 100000; }
  const give = (p = seller, tier = 2, up = 0, ilvl = 20): Item => { const it = makeItem(() => 0.5, 'weapon', ilvl, tier as 0, 'kilic'); it.up = up; p.d.items.push(it); return it; };
  const rpc = (p: typeof seller, op: Parameters<typeof w.rpcRun>[1], a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
  return { rig, w, seller, buyer, give, rpc };
}

describe('pazar', () => {
  test('ilan → satın alma: eşya el değiştirir, vergi ve ilan ücreti akçe sinkidir, satıcı posta olarak alır, ledger yazılır', () => {
    const { rig, w, seller, buyer, give, rpc } = setup(); const it = give(); const price = 4000; const g0s = seller.d.gold, g0b = buyer.d.gold;
    const l = rpc(seller, 'market.list', { id: it.id, price }); expect(l.ok).toBe(true);
    const fee = Math.max(MARKET.listFeeMin, Math.round(price * MARKET.listFeePct)); expect(seller.d.gold).toBe(g0s - fee); expect(seller.d.items.some((x) => x.id === it.id)).toBe(false);
    const b = rpc(buyer, 'market.buy', { id: l.data.id }); expect(b.ok).toBe(true);
    expect(buyer.d.gold).toBe(g0b - price); expect(buyer.d.items.some((x) => x.id === it.id)).toBe(true);
    const tax = Math.round(price * MARKET.taxPct); rig.tick();   // çevrimiçi satıcıya posta hemen teslim edilir
    expect(seller.d.gold).toBe(g0s - fee + price - tax);
    const kinds = rig.db.ledgerRows(seller.dbId).map((r) => r.kind); expect(kinds).toContain('market.list'); expect(kinds).toContain('market.sale');
    expect(rig.db.ledgerRows(buyer.dbId).map((r) => r.kind)).toContain('market.buy');
    // para korunumu: kayıp yalnızca vergi + ücret
    expect((g0s + g0b) - (seller.d.gold + buyer.d.gold)).toBe(fee + tax);
    expect(w.ctx.db.marketGet(l.data.id)).toBeUndefined();
  });
  test('aynı ilanı iki alıcı aynı anda alamaz; satıcı kendi ilanını alamaz', () => {
    const { rig, seller, buyer, give, rpc } = setup(); const third = rig.add('ay'); third.x = 0; third.z = 5; third.d.gold = 100000;
    const it = give(); const l = rpc(seller, 'market.list', { id: it.id, price: 3000 }); const a = rpc(buyer, 'market.buy', { id: l.data.id }); const b = rpc(third, 'market.buy', { id: l.data.id });
    expect(a.ok).toBe(true); expect(b.ok).toBe(false); expect(b.err).toBe('market_gone');
    const it2 = give(); const l2 = rpc(seller, 'market.list', { id: it2.id, price: 3000 }); expect(rpc(seller, 'market.buy', { id: l2.data.id }).err).toBe('market_own');
  });
  test('kısıtlar: yeni hesap ilan veremez; kuşanılmış eşya satılamaz; fiyat sınırları; ilan sayısı; yalnızca yurtta', () => {
    const rig = makeRig(6, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.x = 0; p.z = 5; p.d.gold = 99999;
    const it = makeItem(() => 0.5, 'weapon', 20, 2, 'kilic'); p.d.items.push(it);
    const call = (op: Parameters<typeof w.rpcRun>[1], a: unknown) => { try { w.rpcRun(p, op, a); return 'ok'; } catch (e) { return (e as Error).message; } };
    expect(call('market.list', { id: it.id, price: 3000 })).toBe('market_new_account');
    rig.clock.advance(MARKET.newAccountH * H + 1000);
    const b = marketPriceBounds(it); expect(call('market.list', { id: it.id, price: b.min - 1 })).toBe('market_price_low'); expect(call('market.list', { id: it.id, price: b.max + 1 })).toBe('market_price_high');
    expect(call('market.list', { id: 'yok', price: b.min })).toBe('no_item');
    p.x = 80; p.z = 0; expect(call('market.list', { id: it.id, price: b.min })).toBe('market_town'); p.x = 0; p.z = 5;
    p.d.items.length = 0; for (let i = 0; i < MARKET.maxListings; i++) { const x = makeItem(() => 0.5, 'armor', 20, 1); p.d.items.push(x); expect(call('market.list', { id: x.id, price: marketPriceBounds(x).min + 5 })).toBe('ok'); }
    const extra = makeItem(() => 0.5, 'armor', 20, 1); p.d.items.push(extra); expect(call('market.list', { id: extra.id, price: marketPriceBounds(extra).min })).toBe('market_full');
  });
  test('fiyat tavanı gerçek para ticaretini sınırlar: çöp eşyayı milyonlara satıp akçe aktarılamaz', () => {
    const junk = makeItem(() => 0.1, 'helmet', 3, 0); expect(marketPriceBounds(junk).max).toBeLessThan(5000); expect(marketPriceBounds(junk).min).toBe(vendorPrice(junk));
    const top = makeItem(() => 0.9, 'weapon', 50, 3); top.up = 9; expect(marketPriceBounds(top).max).toBeGreaterThan(marketRef(top)); expect(marketPriceBounds(top).max).toBeLessThanOrEqual(MARKET.absoluteMax);
  });
  test('süresi dolan ilan eşyayı satıcının postasına geri verir; çevrimdışı satıcı girişte parasını alır', () => {
    const { rig, w, seller, buyer, give, rpc } = setup(); const it = give(); const l = rpc(seller, 'market.list', { id: it.id, price: 3000 });
    rig.clock.advance(MARKET.durationH * H + 1000); rig.tick(); rig.tick();
    expect(w.ctx.db.marketGet(l.data.id)).toBeUndefined(); expect(seller.d.items.some((x) => x.id === it.id)).toBe(true);   // çevrimiçi: posta otomatik teslim
    // çevrimdışı satıcı: satış sonrası çıkıp girince alır
    const it2 = give(); const l2 = rpc(seller, 'market.list', { id: it2.id, price: 3000 }); w.leave(seller); const g0 = rig.db.playerById(seller.dbId)!; void g0;
    expect(rpc(buyer, 'market.buy', { id: l2.data.id }).ok).toBe(true);
    const gold0 = JSON.parse(rig.db.playerById(seller.dbId)!.data).gold;   // girişten önceki kayıtlı akçe
    const back = w.join(rig.db.playerById(seller.dbId)!, () => {}, () => {});
    expect(back.d.gold).toBeGreaterThan(gold0); expect(back.d.gold - gold0).toBe(3000 - Math.round(3000 * MARKET.taxPct));
  });
  test('çanta doluysa satın alınamaz/iptal edilemez; iptalde eşya geri gelir; göz atma süzgeci ve sıralama çalışır', () => {
    const { rig, seller, buyer, give, rpc } = setup(); const a = give(seller, 1, 0, 10), b = give(seller, 3, 3, 30);
    const la = rpc(seller, 'market.list', { id: a.id, price: marketPriceBounds(a).min + 100 }); const lb = rpc(seller, 'market.list', { id: b.id, price: marketPriceBounds(b).min + 100 });
    const list = rpc(buyer, 'market.browse', { sort: 'price' }).data.listings; expect(list.length).toBe(2); expect(list[0].price).toBeLessThanOrEqual(list[1].price);
    expect(rpc(buyer, 'market.browse', { slot: 'armor' }).data.listings.length).toBe(0); expect(rpc(buyer, 'market.browse', { minTier: 3 }).data.listings.length).toBe(1);
    while (buyer.d.items.length < BAG_SIZE) buyer.d.items.push(makeItem(() => 0.5, 'amulet', 1, 0));
    expect(rpc(buyer, 'market.buy', { id: la.data.id }).err).toBe('bag_full');
    expect(rpc(seller, 'market.cancel', { id: lb.data.id }).ok).toBe(true); expect(seller.d.items.some((x) => x.id === b.id)).toBe(true); expect(rpc(buyer, 'market.browse', {}).data.listings.length).toBe(1);
    void rig;
  });
  test('rastgele alım-satım fuzz’ı: para korunumu (kayıp = vergi + ücret) ve eşya korunumu', () => {
    const { rig, w, seller, buyer } = setup(); const ps = [seller, buyer, rig.add('ay'), rig.add('gok')]; for (const p of ps) { p.x = 0; p.z = 5; p.d.gold = 50000; p.d.items.length = 0; for (let i = 0; i < 6; i++) p.d.items.push(makeItem(() => 0.3 + 0.1 * i, (['weapon', 'armor', 'helmet', 'amulet'] as const)[i % 4], 10 + i * 4, (i % 4) as 0)); }
    const goldSum = () => ps.reduce((s, p) => s + p.d.gold, 0) + (rig.db.db.prepare("SELECT COALESCE(SUM(gold),0) g FROM mail WHERE kind='gold'").get() as unknown as { g: number }).g;
    const itemCount = () => ps.reduce((s, p) => s + p.d.items.length, 0) + (rig.db.db.prepare("SELECT COUNT(*) c FROM market WHERE status='open'").get() as { c: number }).c + (rig.db.db.prepare("SELECT COUNT(*) c FROM mail WHERE kind='item'").get() as { c: number }).c;
    const g0 = goldSum(), n0 = itemCount(); let sunk = 0; let r = 7; const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
    for (let i = 0; i < 400; i++) {
      const p = ps[Math.floor(rnd() * 4)];
      try {
        if (rnd() < 0.5 && p.d.items.length) { const it = p.d.items[Math.floor(rnd() * p.d.items.length)]; const b = marketPriceBounds(it); const price = Math.round(b.min + rnd() * (b.max - b.min) * 0.1); const fee = Math.max(MARKET.listFeeMin, Math.round(price * MARKET.listFeePct)); w.rpcRun(p, 'market.list', { id: it.id, price }); sunk += fee; }
        else { const open = w.ctx.db.marketBrowse({ sort: 'new', limit: 5, offset: 0, now: w.now }); if (open.length) { const row = open[Math.floor(rnd() * open.length)]; const tax = Math.round(row.price * MARKET.taxPct); w.rpcRun(p, 'market.buy', { id: row.id }); sunk += tax; } }
      } catch { /* kural reddi */ }
      if (i % 40 === 0) { rig.tick(); }
    }
    expect(goldSum()).toBe(g0 - sunk); expect(itemCount()).toBe(n0);
  });
});
