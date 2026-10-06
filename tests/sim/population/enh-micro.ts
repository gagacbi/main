/**
 * +10…+15 tasarımı için hızlı mikro-model (saniyeler): tek oyuncu, 4 slot, günlük gelir/bütçe. Ajan simülasyonu gerekmez.
 *   npx tsx tests/sim/population/enh-micro.ts
 * Ölçer: kademeye ulaşma süresi dağılımı, +15 başına akçe, sink/gelir, güç çarpanı (eşya değeri), varyans.
 */
import { mulberry32 } from '../../../shared/rng';
const UP9 = 1 + 160 / 100; const RATE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 32, 25, 18, 12, 8];
type Rules = { name: string; pct: number[]; cap: number; capFrom: number; book: number; fee: number; mult: number[]; pity: number; pityCap: number; dropFrom: number; protect: boolean; rates?: number[]; slotCap?: number };
const flat = [180, 188, 196, 204, 212, 222]; // +10…+15
const mk = (o: Partial<Rules> & { name: string }): Rules => ({ pct: [0, 0, 0, 0, 0, 0, 0, 0, 0, 160, 180, 202, 226, 252, 280, 310], cap: 99, capFrom: 99, book: 0, fee: 0, mult: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], pity: 0, pityCap: 0, dropFrom: 99, protect: false, ...o });
const R: Rules[] = [
  mk({ name: 'v1.1 (abundant Tılsım/kitap)', book: 10, dropFrom: 13, protect: true, cap: 3, capFrom: 10 }),
  mk({ name: 'v1.2', book: 0, fee: 0.6, dropFrom: 13, protect: true, cap: 2, capFrom: 12, mult: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1.15, 1.3, 1.6, 2.1, 3.0] }),
];
const cfg = (JSON.parse(process.env.CAND ?? 'null') ?? []) as Partial<Rules>[]; for (const c of cfg) R.push(mk({ name: 'cand', ...c } as any));
const ILVL = 42; const cost = (t: number, m: number[]) => 60 * t * t * (1 + ILVL / 6) * m[t];
function player(rng: () => number, r: Rules, days: number, income: number, f: number) {
  const up = [9, 9, 9, 9]; const reach: Record<number, number[]> = {}; let spent = 0, bank = 0; const pityN = [0, 0, 0, 0]; const best = (t: number) => (reach[t] ??= [-1, -1, -1, -1]);
  const firstDay: Record<string, number> = {};
  for (let d = 1; d <= days; d++) {
    bank += f * income; let tries = 0; let capTries = 0;
    for (let g = 0; g < 12; g++) {
      let s = -1; let lo = 99; for (let i = 0; i < 4; i++) if (up[i] < 15 && up[i] < lo) { lo = up[i]; s = i; } if (s < 0) break;   // en düşük slotu önce
      const t = up[s] + 1; const c = cost(t, r.mult); const capped = t >= r.capFrom; if (capped && capTries >= r.cap) break; if (tries >= 6) break;
      const fee = r.protect && t >= 13 ? c * r.fee : 0; if (bank < c + fee) break;
      bank -= c + fee; spent += c + fee; tries++; if (capped) capTries++;
      const rate = Math.min(100, RATE[t] + r.book + pityN[s] * r.pity * 1) ; const win = rng() * 100 < Math.min(100, rate + 0);
      if (win) { up[s] = t; pityN[s] = 0; if (!firstDay['w' + t]) firstDay['w' + t] = d; if (s === 0 && !reach[t]) reach[t] = []; (reach as any)['d' + s + '_' + t] ??= d; }
      else { pityN[s] = Math.min(r.pityCap, pityN[s] + 1); if (t >= r.dropFrom && !r.protect) up[s] = Math.max(9, up[s] - 1); }
    }
  }
  return { up, spent, reach, day15: (reach as any)['d0_15'] as number | undefined, d13: (reach as any)['d0_13'] as number | undefined, d12: (reach as any)['d0_12'] as number | undefined };
}
const N = 4000; const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pct = (n: number) => `%${(n * 100).toFixed(0)}`;
console.log('| Kural | ağırlık +15 (30g/60g/90g/180g) | ≥+13 (30g/60g/90g) | Güç çarpanı (ort./p90/p10)* | +15 başına akçe (ort.) | Sink/gelir (ort.) | Takım ≥+13 (180g) | Silah +13 günü p10/p50/p90 |\n|---|---|---|---|---|---|---|---|');
for (const r of R) {
  const rng = mulberry32(12345); const res: any[] = []; for (let i = 0; i < N; i++) { const inc = 547000 * Math.exp((rng() + rng() + rng() - 1.5) * 0.7); const f = 0.05 + 0.25 * rng(); res.push({ inc, f, ...player(rng, r, 180, inc, f) }); }
  const by = (d: number, k: 'day15' | 'd13') => res.filter((x) => (x as any)[k] !== undefined && (x as any)[k] <= d).length / N;
  const mult = res.map((x) => x.up.reduce((s: number, u: number) => s + (1 + r.pct[u] / 100), 0) / 4 / UP9); const gold15 = res.filter((x) => x.day15 !== undefined).map((x) => x.spent); const share = res.map((x) => x.spent / 180 / x.inc);
  console.log(`| ${r.name} | ${[30, 60, 90, 180].map((d) => pct(by(d, 'day15'))).join(' / ')} | ${[30, 60, 90].map((d) => pct(by(d, 'd13'))).join(' / ')} | ×${(mult.reduce((a, b) => a + b, 0) / N).toFixed(2)} / ×${q(mult, 0.9).toFixed(2)} / ×${q(mult, 0.1).toFixed(2)} | ${gold15.length ? Math.round(gold15.reduce((a, b) => a + b, 0) / gold15.length / 1000) + 'k' : '—'} | ${pct(share.reduce((a, b) => a + b, 0) / N)} | ${pct(res.filter((x) => x.up.every((u: number) => u >= 13)).length / N)} | ${(() => { const d = res.filter((x) => x.d13 !== undefined).map((x) => x.d13 as number); return d.length ? [0.1, 0.5, 0.9].map((p) => q(d, p)).join('/') : '—'; })()} |`);
}
console.log('\n*Güç çarpanı = 4 slot ortalama eşya çarpanı / +9 eşya çarpanı.');
