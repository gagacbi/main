import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { makeItem } from '../../shared/game';
import { mulberry32 } from '../../shared/rng';
import { makeRig } from '../sim/rig';

/**
 * RPC bulanık test (fuzz): her işleme bozuk argümanlar (NaN, negatif, devasa, dize, nesne, null) gönderilir.
 * Beklenen: yalnızca tanımlı oyun hataları (GameError kodları) ya da başarı; durum bozulmaz (NaN akçe, negatif malzeme, geçersiz eşya yok).
 */
const OPS = [...readFileSync(new URL('../../shared/protocol.ts', import.meta.url), 'utf8').match(/export type RpcOp =([\s\S]*?);/)![1].matchAll(/'([a-zA-Z.]+)'/g)].map((m) => m[1]).filter((o) => o !== 'gm');
const BAD: unknown[] = [undefined, null, NaN, -1, 0, 1e15, -1e15, 'abc', '', {}, [], [1, 2], true, 1.5, '1e999', { id: {}, n: NaN }, Infinity];
const KEYS = ['id', 'n', 'slot', 'what', 'op', 'el', 'v', 'qty', 'price', 'good', 'choice', 'bait', 'hits', 'line', 'key', 'to', 'name', 'on', 'lang', 'expId', 'b', 'k', 'item', 'lvl', 'x', 'z', 'a', 'd'];

/** geçerli temel argümanlar: tek alanı bozulur (rastgele anahtarlardan çok daha derin yollara ulaşır) */
const iid = (p: any, i: number) => p.d.items[i % Math.max(1, p.d.items.length)]?.id ?? 'x';
const BASE: Record<string, (p: any) => Record<string, unknown>> = {
  'fish.buy': () => ({ what: 'hamur', n: 5 }), 'fish.cast': () => ({ bait: 'hamur' }), 'fish.reel': () => ({ hits: 3 }), 'fish.rod': () => ({}), 'fish.eat': () => ({ id: 'sazan' }), 'kt.refine': () => ({ type: 'alp', grade: 0 }), 'kt.set': () => ({ type: 'alp', grade: 0 }), 'kt.unset': () => ({ type: 'alp' }), 'chest.open': () => ({ n: 1 }), 'fish.clean': () => ({ id: 'sazan' }), 'fish.ancestor': () => ({ choice: 'bait' }),
  element: (p) => ({ id: iid(p, 0), op: 'raise', el: 'buz' }), equip: (p) => ({ id: iid(p, 1) }), unequip: () => ({ slot: 'weapon' }), sell: (p) => ({ id: iid(p, 2) }), upgrade: (p) => ({ id: iid(p, 3), book: true, charm: true }),
  reroll: (p) => ({ id: iid(p, 0), line: 0, key: 'crit' }), craft: () => ({ kind: 'book' }), 'kimiz.buy': () => ({ n: 3 }), 'kimiz.use': () => ({}), rankSkill: () => ({ slot: 1 }), spec: () => ({ choice: 'kilic' }),
  'market.list': (p) => ({ good: 'ore', qty: 5, price: 100, id: iid(p, 4) }), 'market.buy': () => ({ id: 1 }), 'market.cancel': () => ({ id: 1 }), 'market.browse': () => ({ slot: 'weapon', sort: 'price', minIlvl: 1, maxIlvl: 30, maxPrice: 5000 }),
  'oba.donate': () => ({ ore: 5, hide: 5, wood: 5 }), 'oba.build': () => ({ b: 'otag' }), 'oba.dispatch': () => ({ id: 1, hours: 1 }), 'oba.evolve': () => ({ compId: 'c1' }), 'oba.collect': () => ({ expId: 1 }), stone: () => ({ n: 1 }), ruin: () => ({ n: 1 }), travel: () => ({ to: 'otlak' }), cos: () => ({ op: 'buy', item: 'boncuk', k: 'lif', n: 2 }),
};
function sane(p: any) {
  const d = p.d; const fin = (v: unknown, n: string) => expect(Number.isFinite(v as number), `${n}=${String(v)}`).toBe(true);
  fin(d.gold, 'gold'); expect(d.gold).toBeGreaterThanOrEqual(0); for (const k of Object.keys(d.bag)) { fin(d.bag[k], 'bag.' + k); expect(d.bag[k], 'bag.' + k).toBeGreaterThanOrEqual(0); }
  fin(d.kimiz ?? 0, 'kimiz'); expect(d.kimiz ?? 0).toBeGreaterThanOrEqual(0); fin(p.hp, 'hp'); fin(p.x, 'x'); fin(p.z, 'z'); fin(d.xp, 'xp'); fin(d.level, 'level');
  for (const it of [...d.items, ...Object.values(d.equip)] as any[]) { fin(it.up, 'up'); expect(it.up).toBeGreaterThanOrEqual(0); expect(it.up).toBeLessThanOrEqual(9); if (it.el) { fin(it.el.p, 'el.p'); expect(it.el.p).toBeLessThanOrEqual(24); } }
  if (d.keys) for (const n of d.keys) { fin(n, 'keys'); expect(n, 'keys').toBeGreaterThanOrEqual(0); }
  if (d.kt) { for (const r of d.kt.s) for (const n of r) { fin(n, 'kt.s'); expect(n, 'kt.s').toBeGreaterThanOrEqual(0); } for (const g of d.kt.eq) expect(g >= -1 && g < 5, 'kt.eq').toBe(true); }
  if (d.fish) { for (const k of ['rod', 'pts', 'hamur', 'solucan', 'luck']) { fin(d.fish[k], 'fish.' + k); expect(d.fish[k], 'fish.' + k).toBeGreaterThanOrEqual(0); } for (const [f, n] of Object.entries(d.fish.stock)) expect(Number.isFinite(n as number) && (n as number) >= 0, 'stock.' + f).toBe(true); }
  if (d.cos) for (const g of [...Object.values(d.cos.mats), ...Object.values(d.cos.luck)]) expect(Number.isFinite(g as number) && (g as number) >= 0).toBe(true);
}

describe('RPC bulanık test', () => {
  test(`${OPS.length} işlem × bozuk argümanlar: çökme yok, durum bozulmaz`, () => {
    const rig = makeRig(81, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); const r = mulberry32(Number(process.env.FUZZ_SEED ?? 5));
    p.d.level = 30; w.recalc(p); p.d.gold = 1_000_000; for (const k of ['ore', 'hide', 'wood', 'book', 'charm', 'frag'] as const) p.d.bag[k] = 50; p.d.kimiz = 5;
    for (let i = 0; i < 6; i++) { const it = makeItem(r, (['weapon', 'armor', 'helmet', 'amulet', 'shield', 'boots'] as const)[i], 20, 2); it.lvlReq = 1; it.up = 7; p.d.items.push(it); }
    p.d.fish = { rod: 2, pts: 30, hamur: 5, solucan: 5, luck: 0, stock: { sazan: 3 }, caught: 0, ancestor: true };
    const pozlar = [[0, 130], [-30, 63], [11, -6.5], [40, 0], [-38, -28 + 8]]; let calls = 0; const tuhaf: string[] = [];
    for (const op of OPS) for (let round = 0; round < Number(process.env.FUZZ_ROUNDS ?? 90); round++) {
      const [x, z] = pozlar[round % pozlar.length]; p.x = x; p.z = z; p.deadUntil = 0; p.hp = Math.max(1, p.hp); while (p.d.items.length < 8) { const it = makeItem(r, (['weapon', 'armor', 'helmet', 'amulet'] as const)[p.d.items.length % 4], 20, 2); it.lvlReq = 1; it.up = 7; p.d.items.push(it); } p.d.gold = Math.max(p.d.gold, 500000); const a: Record<string, unknown> = {};
      if (BASE[op] && round % 3 !== 0) { Object.assign(a, BASE[op](p)); const ks = Object.keys(a); if (ks.length) a[ks[Math.floor(r() * ks.length)]] = BAD[Math.floor(r() * BAD.length)]; }
      else for (let k = 0; k < 1 + (round % 4); k++) a[KEYS[Math.floor(r() * KEYS.length)]] = BAD[Math.floor(r() * BAD.length)];
      if (round % 5 === 0) a.id = p.d.items[Math.floor(r() * p.d.items.length)]?.id;
      try { w.rpcRun(p, op as any, a); } catch (e) { calls++; if (!(e as any).code && (e as any).constructor?.name !== 'GameError') tuhaf.push(`${op} ${JSON.stringify(a)} → ${(e as Error).message}`); }
      try { sane(p); } catch (e) { throw new Error(`${op} ${JSON.stringify(a, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))} → ${(e as Error).message}`); }
    }
    expect(tuhaf.slice(0, 8)).toEqual([]);   // tanımsız hata türü (TypeError vb.) = savunmasız argüman işleme
  });
});
