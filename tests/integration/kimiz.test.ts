import { describe, expect, test } from 'vitest';
import { HUB, KIMIZ } from '../../shared/game';
import { goodGet, kimizPrice } from '../../shared/goods';
import { makeRig } from '../sim/rig';

function setup(level = 30) {
  const rig = makeRig(71, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; p.d.gold = 1e6; w.recalc(p); p.hp = p.stats.maxHp; p.x = HUB.demirci.x - 2; p.z = HUB.demirci.z;
  const rpc = (op: Parameters<typeof w.rpcRun>[1], a: unknown = {}) => w.rpcRun(p, op, a) as any;
  return { rig, w, p, rpc };
}
describe('kımız (şifa içeceği): kontrollü savaş sink’i', () => {
  test('satın alma akçeyi sistemden siler (ledger), demirci yakınlığı ve istif sınırı şart', () => {
    const { p, rpc } = setup(); const g0 = p.d.gold; const r = rpc('kimiz.buy', { n: 10 });
    expect(g0 - p.d.gold).toBe(kimizPrice(30) * 10); expect(r.cost).toBe(kimizPrice(30) * 10); expect(p.d.kimiz).toBe(10);
    for (const bad of [0, -1, KIMIZ.buyMax + 1, 1.5 * 0 + NaN]) expect(() => rpc('kimiz.buy', { n: bad })).toThrow();
    rpc('kimiz.buy', { n: 20 }); rpc('kimiz.buy', { n: 20 }); expect(() => rpc('kimiz.buy', { n: 20 })).toThrow(); expect(p.d.kimiz).toBeLessThanOrEqual(KIMIZ.maxStack);
    p.x = -30; p.z = 20; expect(() => rpc('kimiz.buy', { n: 1 })).toThrow(); p.d.gold = 0; p.x = HUB.demirci.x - 2; p.z = HUB.demirci.z; expect(() => rpc('kimiz.buy', { n: 1 })).toThrow();
  });
  test('fiyat seviyeyle ölçeklenir ve kostüm birimine bağlıdır (zirvede pahalı, başlangıçta ucuz)', () => {
    expect(kimizPrice(10)).toBeLessThan(kimizPrice(30)); expect(kimizPrice(30)).toBeLessThan(kimizPrice(45)); expect(kimizPrice(1)).toBeGreaterThanOrEqual(8);
  });
  test('kullanım: stat vermez; zamana yayılmış can yeniler; bekleme süresi; tam canda ve stoksuzken kullanılmaz; ölünce durur', () => {
    const { rig, w, p, rpc } = setup(); p.d.kimiz = 5; const atk0 = p.stats.atk, def0 = p.stats.def;
    expect(() => rpc('kimiz.use')).toThrow(); // tam can
    p.hp = Math.round(p.stats.maxHp * 0.3); const hp0 = p.hp; const r = rpc('kimiz.use'); expect(p.d.kimiz).toBe(4); expect(p.stats.atk).toBe(atk0); expect(p.stats.def).toBe(def0);
    expect(p.hp).toBe(hp0); rig.seconds(1); expect(p.hp).toBeGreaterThan(hp0); expect(p.hp).toBeLessThan(hp0 + r.hot); rig.seconds(5); expect(p.hp).toBeGreaterThanOrEqual(Math.min(p.stats.maxHp, hp0 + r.hot) - 3);
    p.hp = Math.round(p.stats.maxHp * 0.3); expect(() => rpc('kimiz.use')).toThrow(); // bekleme
    rig.seconds(KIMIZ.cooldownSec + 1); p.hp = Math.round(p.stats.maxHp * 0.3); rpc('kimiz.use'); w.damage(null, p, 1e9); const before = p.hp; rig.seconds(3); expect(p.hp).toBe(before);
    p.d.kimiz = 0; expect(() => rpc('kimiz.use')).toThrow();
  });
  test('PvP’de etkisi yarım (iksir yığma kısıtı); aynı bekleme süresi hem PvP hem PvE için', () => {
    const { rig, w, p, rpc } = setup(); p.d.kimiz = 4; p.hp = Math.round(p.stats.maxHp * 0.2);
    const pve = rpc('kimiz.use').hot; rig.seconds(KIMIZ.cooldownSec + 1); p.hp = Math.round(p.stats.maxHp * 0.2); p.lastPvp = w.now; const pvp = rpc('kimiz.use').hot;
    expect(pvp / pve).toBeCloseTo(KIMIZ.pvpMult, 1);
  });
  test('kımız pazarda takas edilir (yığın mal) ve istifi aşamaz; değişmez: akçe/adet negatif olmaz (fuzz)', () => {
    const { rig, w, p, rpc } = setup(); expect(goodGet(p.d, 'kimiz')).toBe(0); p.d.kimiz = 30; rig.db.db.prepare('UPDATE players SET created = ?').run(w.now - 100 * 3600000);
    const l = rpc('market.list', { good: 'kimiz', qty: 10, price: 60000 }); expect(p.d.kimiz).toBe(20); rpc('market.cancel', { id: l.id }); expect(p.d.kimiz).toBe(30);
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 400; i++) { try { const o = rnd(); if (o < 0.4) rpc('kimiz.buy', { n: 1 + Math.floor(rnd() * 25) }); else if (o < 0.8) { p.hp = Math.round(p.stats.maxHp * rnd()); rpc('kimiz.use'); } else p.d.gold = Math.floor(rnd() * 5e5); } catch { /* reddedilen */ } rig.seconds(rnd() * 8);
      expect(p.d.gold).toBeGreaterThanOrEqual(0); expect(Number.isInteger(p.d.gold)).toBe(true); expect(p.d.kimiz ?? 0).toBeGreaterThanOrEqual(0); expect(p.d.kimiz ?? 0).toBeLessThanOrEqual(KIMIZ.maxStack); expect(p.hp).toBeLessThanOrEqual(p.stats.maxHp); }
  });
});
