import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HUB, UPGRADE_RATE, BOOK_BONUS, makeItem, itemStats, upgradeCost, type Item } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { Bot, playerOf, startTestServer, tp, uniq, waitSnap, worldOf, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });
const smith = (b: Bot) => tp(s, b, HUB.demirci.x - 2, HUB.demirci.z);
const mk = (up = 0, tier: 0 | 1 | 2 | 3 = 0, slot: Item['slot'] = 'weapon', ilvl = 10) => { const it = makeItem(mulberry32(3), slot, ilvl, tier); it.up = up; it.lvlReq = 1; return it; };
async function player(n = 'Dm') {
  const b = await new Bot(s.url, uniq(n)).join('yer'); smith(b); await waitSnap(b);
  const p = playerOf(s, b); p.d.gold = 1e9; p.d.bag.ore = 1e6; return { b, p };
}

describe('D3 artı basma', () => {
  test('istatistiksel doğrulama: her hedef seviyede başarı oranı PRD tablosuna uyar', async () => {
    const { b, p } = await player(); const w = worldOf(s, b); const N = 2500; const rng = mulberry32(99); s.ctx.rng = rng;
    for (let target = 1; target <= 9; target++) {
      let ok = 0;
      for (let i = 0; i < N; i++) {
        const it = mk(target - 1); p.d.items = [it]; p.d.bag.charm = 0;
        const r = w.upgrade(p, { id: it.id }); if (r.success) ok++;
      }
      const rate = (ok / N) * 100; const exp = UPGRADE_RATE[target];
      const tol = 3.4 * Math.sqrt((exp * (100 - exp)) / N) + 0.2;
      expect(Math.abs(rate - exp), `+${target}: ölçülen %${rate.toFixed(1)} beklenen %${exp}`).toBeLessThanOrEqual(tol);
    }
    s.ctx.rng = Math.random; await b.leave();
  });
  test('+1…+4 başarısızlıkta eşya korunur (yalnızca malzeme gider); +5 ve üstünde eşya yok olur', async () => {
    const { b, p } = await player(); const w = worldOf(s, b); s.ctx.rng = () => 0.999; // her zaman başarısız
    for (const target of [2, 3, 4]) {
      const it = mk(target - 1); p.d.items = [it]; const g0 = p.d.gold, o0 = p.d.bag.ore;
      const r = w.upgrade(p, { id: it.id });
      expect(r.success).toBe(false); expect(r.destroyed).toBe(false); expect(p.d.items.length).toBe(1); expect(it.up).toBe(target - 1);
      const c = upgradeCost(target, it.ilvl); expect(g0 - p.d.gold).toBe(c.gold); expect(o0 - p.d.bag.ore).toBe(c.ore);
    }
    for (const target of [5, 6, 7, 8, 9]) {
      const it = mk(target - 1); p.d.items = [it]; const r = w.upgrade(p, { id: it.id });
      expect(r.destroyed).toBe(true); expect(p.d.items.length).toBe(0);
    }
    expect(p.d.counters.destroyed).toBe(5);
    s.ctx.rng = Math.random; await b.leave();
  });
  test('kuşanılmış eşya da yükseltilir/yok olur; sonuç hemen veritabanına yazılır', async () => {
    const { b, p } = await player(); const w = worldOf(s, b); const it = mk(4); p.d.equip.weapon = it;
    s.ctx.rng = () => 0.0; const r = w.upgrade(p, { id: it.id }); expect(r.success).toBe(true); expect(it.up).toBe(5);
    expect(JSON.parse(s.ctx.db.playerById(p.dbId)!.data).equip.weapon.up).toBe(5); // kaydedildi
    s.ctx.rng = () => 0.999; const r2 = w.upgrade(p, { id: it.id }); expect(r2.destroyed).toBe(true); expect(p.d.equip.weapon).toBeUndefined();
    s.ctx.rng = Math.random; await b.leave();
  });
  test('D4 demirci el kitabı +10 puan ekler; koruma tılsımı yok olmayı engeller; kitap/tılsım tüketilir', async () => {
    const { b, p } = await player(); const w = worldOf(s, b);
    s.ctx.rng = () => 0.15; // zar 15
    let it = mk(8); p.d.items = [it]; p.d.bag.book = 1;
    expect(w.upgrade(p, { id: it.id }).success).toBe(false);          // %10 → 15 tutmaz
    p.d.items = [it = mk(8)]; p.d.bag.book = 1; p.d.bag.charm = 0;
    const r = w.upgrade(p, { id: it.id, book: true });               // %20 → 15 tutar
    expect(r.rate).toBe(UPGRADE_RATE[9] + BOOK_BONUS); expect(r.success).toBe(true); expect(p.d.bag.book).toBe(0);
    s.ctx.rng = () => 0.999;
    p.d.items = [it = mk(6)]; p.d.bag.charm = 1;
    const r2 = w.upgrade(p, { id: it.id, charm: true });
    expect(r2.destroyed).toBe(false); expect(r2.protectedByCharm).toBe(true); expect(it.up).toBe(6); expect(p.d.items.length).toBe(1); expect(p.d.bag.charm).toBe(0);
    expect(() => w.upgrade(p, { id: it.id, charm: true })).toThrow(); // tılsım yok
    p.d.bag.charm = 1; expect(() => w.upgrade(p, { id: mk(1).id, charm: true })).toThrow();
    s.ctx.rng = Math.random; await b.leave();
  });
  test('RPC üzerinden: demirciye yakın olmak şart, kaynak yetersizse reddedilir, sonuçta oranlar döner', async () => {
    const { b, p } = await player(); const it = mk(0); p.d.items = [it];
    tp(s, b, 0, 25); expect((await b.rpc('upgrade', { id: it.id })).err).toBe('too_far');
    smith(b); p.d.gold = 0; expect((await b.rpc('upgrade', { id: it.id })).err).toBe('no_gold');
    p.d.gold = 1e6; const r = await b.rpc('upgrade', { id: it.id }); expect(r.ok).toBe(true);
    expect((r.data as { rate: number }).rate).toBe(100); expect(b.me.items[0].up).toBe(1);
    expect((await b.rpc('upgrade', { id: 'yok' })).err).toBe('no_item');
    const led = s.ctx.db.ledgerRows(p.dbId).filter((l) => l.kind === 'upgrade'); expect(led.length).toBe(1);
    await b.leave();
  });
  test('+9 eşya temel değere göre belirgin güçlüdür; üst sınır +9', async () => {
    const it = mk(0); const base = itemStats(it).atk; it.up = 9; expect(itemStats(it).atk).toBeGreaterThan(base * 2.4);
    const { b, p } = await player(); p.d.items = [it]; expect((await b.rpc('upgrade', { id: it.id })).err).toBe('max_up'); await b.leave();
  });
});

describe('D4/D5 üretim, kuşanma, ganimet', () => {
  test('Demirhane: el kitabı serbest, koruma tılsımı Demirhane 2. seviyeyi ister (oyun içinde kazanılabilir)', async () => {
    const { b, p } = await player(); p.d.bag.hide = 50; p.d.bag.wood = 50;
    expect((await b.rpc('craft', { kind: 'book' })).ok).toBe(true); expect(p.d.bag.book).toBe(1);
    expect((await b.rpc('craft', { kind: 'charm' })).err).toBe('demir_low');
    const o = s.ctx.oymaks.get(p.oymakId)!; o.lv.demir = 2;
    expect((await b.rpc('craft', { kind: 'charm' })).ok).toBe(true); expect(p.d.bag.charm).toBe(1);
    expect((await b.rpc('craft', { kind: 'gear', slot: 'helmet' })).ok).toBe(true);
    expect(p.d.items.at(-1)!.slot).toBe('helmet'); expect(p.d.items.at(-1)!.tier).toBeGreaterThanOrEqual(1);
    o.lv.demir = 1; await b.leave();
  });
  test('kuşan / çıkar: seviye kapısı, istatistik değişimi, takas', async () => {
    const { b, p } = await player(); const a = mk(0, 1, 'weapon', 20); a.lvlReq = 15; const c = mk(0, 0, 'weapon', 3); c.lvlReq = 1;
    p.d.items = [a, c];
    expect((await b.rpc('equip', { id: a.id })).err).toBe('level_low');
    const atk0 = p.stats.atk; expect((await b.rpc('equip', { id: c.id })).ok).toBe(true);
    expect(p.stats.atk).toBeGreaterThan(atk0); expect(p.d.equip.weapon!.id).toBe(c.id); expect(p.d.items.length).toBe(1);
    expect((await b.rpc('unequip', { slot: 'weapon' })).ok).toBe(true); expect(p.stats.atk).toBe(atk0);
    await b.leave();
  });
  test('satış akçe verir (kayıt altında), kuşanılmış eşya satılamaz', async () => {
    const { b, p } = await player(); const it = mk(0, 2); p.d.items = [it]; p.d.equip.armor = mk(0, 0, 'armor');
    const g0 = p.d.gold; const r = await b.rpc('sell', { id: it.id }); expect(r.ok).toBe(true); expect(p.d.gold - g0).toBe((r.data as { price: number }).price);
    expect((await b.rpc('sell', { id: p.d.equip.armor.id })).err).toBe('no_item');
    expect(s.ctx.db.ledgerRows(p.dbId).some((l) => l.kind === 'sell')).toBe(true); await b.leave();
  });
  test('envanter doluyken yeni eşya kaybolmaz: yerde kalır', async () => {
    const { b, p } = await player(); const w = worldOf(s, b);
    p.d.items = Array.from({ length: 30 }, () => mk()); const it = mk(0, 3);
    w.spawnDrop(p, 'item', p.x, p.z, { item: it, t: 3, m: it.slot }); tp(s, b, p.x, p.z);
    await b.sleep(1200); expect(p.d.items.length).toBe(30); expect(w.drops.size).toBe(1);
    expect(b.chat.some((m) => m.key === 'sys.bag_full')).toBe(true); w.drops.clear(); await b.leave();
  });
});
