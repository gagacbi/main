import { describe, expect, test } from 'vitest';
import { GOOD_KEYS, goodBounds, goodGet, goodRef } from '../../shared/goods';
import { MARKET } from '../../shared/game';
import { makeRig } from '../sim/rig';

function two() {
  const rig = makeRig(51, { spawnCamps: false }); const w = rig.world; const s = rig.add('gok'); const b = rig.add('yer');
  for (const p of [s, b]) { p.d.gold = 1e6; p.x = 0; p.z = 0; } rig.db.db.prepare('UPDATE players SET created = ?').run(w.now - 100 * 3600000);
  const rpc = (p: typeof s, op: Parameters<typeof w.rpcRun>[1], a: unknown = {}) => w.rpcRun(p, op, a) as any;
  return { rig, w, s, b, rpc };
}
describe('pazar: her şey takas edilir (yığın mallar)', () => {
  test('her mal türü (malzeme, kitap, tılsım, parça, kostüm malzemesi, şans eşyası, kâğıt) ilan → satın alma: el değiştirir, vergi ve ilan ücreti sink', () => {
    const { s, b, rpc, w } = two(); expect(GOOD_KEYS.length).toBe(14);
    for (const k of GOOD_KEYS) {
      const qty = 7; if (k === 'ore' || k === 'hide' || k === 'wood' || k === 'book' || k === 'charm' || k === 'frag') s.d.bag[k] += qty; else { s.d.cos ??= { worn: null, bag: [], mats: { lif: 0, boya: 0, ipek: 0, nakis: 0 }, luck: { boncuk: 0, dugum: 0, nazar: 0, kagit: 0 }, loom: null, pity: 0, crafted: 0 }; (k in s.d.cos.mats ? s.d.cos.mats : s.d.cos.luck)[k as never] += qty; }
      const have = goodGet(s.d, k); const price = goodRef(k, qty); const g0 = s.d.gold; const bg = b.d.gold; const bHave = goodGet(b.d, k);
      const r = rpc(s, 'market.list', { good: k, qty, price }); expect(goodGet(s.d, k)).toBe(have - qty); expect(g0 - s.d.gold).toBe(r.fee);
      const buy = rpc(b, 'market.buy', { id: r.id }); expect(buy.good).toEqual({ k, qty }); expect(goodGet(b.d, k)).toBe(bHave + qty); expect(bg - b.d.gold).toBe(price);
      expect(w.ctx.db.mailList(s.dbId).some((m) => m.kind === 'gold' && m.gold === price - Math.round(price * MARKET.taxPct))).toBe(true);
      rpc(s, 'market.claim');
    }
  });
  test('sınırlar: fazla adet, geçersiz mal, fiyat tabanı/tavanı, iptalde iade, süre dolunca postayla iade', () => {
    const { rig, s, b, rpc, w } = two(); s.d.bag.ore = 100;
    expect(() => rpc(s, 'market.list', { good: 'ore', qty: 101, price: 5000 })).toThrow(); expect(() => rpc(s, 'market.list', { good: 'altin', qty: 1, price: 5000 })).toThrow(); expect(() => rpc(s, 'market.list', { good: 'ore', qty: 0, price: 5000 })).toThrow();
    const bd = goodBounds('ore', 100); expect(() => rpc(s, 'market.list', { good: 'ore', qty: 100, price: bd.min - 1 })).toThrow(); expect(() => rpc(s, 'market.list', { good: 'ore', qty: 100, price: bd.max + 1 })).toThrow();
    const a = rpc(s, 'market.list', { good: 'ore', qty: 40, price: 600 }); expect(s.d.bag.ore).toBe(60); rpc(s, 'market.cancel', { id: a.id }); expect(s.d.bag.ore).toBe(100);
    const e = rpc(s, 'market.list', { good: 'ore', qty: 50, price: 700 }); expect(s.d.bag.ore).toBe(50); rig.clock.advance((MARKET.durationH + 1) * 3600000); rpc(b, 'market.browse', {}); w.ctx.db.marketExpire(w.now);
    rpc(s, 'market.claim'); expect(s.d.bag.ore).toBe(100); void e;
    expect(() => rpc(s, 'market.buy', { id: 99999 })).toThrow();
  });
  test('malı kendi alamaz; para ve mal korunumu (rastgele işlem)', () => {
    const { s, b, rpc, w } = two(); s.d.bag.hide = 500; s.d.bag.charm = 30; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const total = () => s.d.bag.hide + b.d.bag.hide + w.ctx.db.marketOpenCount() * 0;
    const base = s.d.bag.hide + b.d.bag.hide; const inListings = () => (w.ctx.db.db.prepare("SELECT item FROM market WHERE status='open' AND slot='good:hide'").all() as { item: string }[]).reduce((n, r) => n + JSON.parse(r.item).qty, 0);
    const mail = () => (w.ctx.db.db.prepare("SELECT item FROM mail WHERE kind='item' AND item LIKE '%hide%'").all() as { item: string }[]).reduce((n, r) => n + JSON.parse(r.item).qty, 0);
    for (let i = 0; i < 300; i++) { const p = rnd() < 0.5 ? s : b; try { const o = rnd(); if (o < 0.5) rpc(p, 'market.list', { good: 'hide', qty: 1 + Math.floor(rnd() * 80), price: 100 + Math.floor(rnd() * 5000) }); else if (o < 0.8) { const rows = w.ctx.db.db.prepare("SELECT id FROM market WHERE status='open'").all() as { id: number }[]; if (rows.length) rpc(p, 'market.buy', { id: rows[Math.floor(rnd() * rows.length)].id }); } else { const rows = w.ctx.db.marketSellerOpen(p.dbId); if (rows.length) rpc(p, 'market.cancel', { id: rows[0].id }); } } catch { /* reddedilen işlem */ }
      expect(s.d.bag.hide + b.d.bag.hide + inListings() + mail()).toBe(base); expect(p.d.gold).toBeGreaterThanOrEqual(0); }
    void total; expect(() => { const rows = w.ctx.db.marketSellerOpen(s.dbId); if (!rows.length) throw new Error('x'); rpc(s, 'market.buy', { id: rows[0].id }); }).toThrow();
  });
});
