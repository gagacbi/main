/**
 * Çok tohumlu/çok ayarlı özet: ham.json dizinlerini okur, ekonomi ve savaş metriklerini tek tabloda verir; sink/kaynak bandını sınıflar.
 *   npx tsx tests/sim/population/multi.ts /tmp/a /tmp/b ...
 */
import { readFileSync } from 'node:fs';

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const p90 = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : 0; };
const M = (n: number) => `${(n / 1e6).toFixed(1)}M`; const f = (n: number, d = 1) => n.toFixed(d);
const band = (r: number) => (r < 0.7 ? '<%70 yetersiz' : r < 0.8 ? '%70–80 yaklaştık' : r <= 0.9 ? '%80–90 HEDEF' : '>%90 fazla agresif');

const rows: Record<string, string | number>[] = [];
for (const dir of process.argv.slice(2)) {
  const D = JSON.parse(readFileSync(`${dir}/ham.json`, 'utf8')); const A: any[] = D.agents; const E: any[] = D.econ; const days = D.meta.DAYS;
  const last = E.slice(-7); const src = sum(last.map((e) => sum(Object.values(e.sources) as number[]))) / last.length; const snk = sum(last.map((e) => sum(Object.values(e.sinks) as number[]))) / last.length;
  const kimizSink = sum(last.map((e) => (e.sinks['kımız'] ?? 0))) / last.length; const ratio = snk / Math.max(1, src);
  const supply0 = E[Math.floor(E.length / 2) - 1].supply, supply1 = E[E.length - 1].supply; const netPerDay = (supply1 - supply0) / (E.length - Math.floor(E.length / 2));
  const goldAt = (d: number) => A.map((a) => a.days[Math.min(d, a.days.length) - 1].gold);
  const hrs = (a: any) => sum(a.days.map((d: any) => d.minutes)) / 60; const lvl10 = A.filter((a) => a.final.level >= 10 && hrs(a) > 0);
  const kUsed = sum(A.map((a) => a.ext?.kimizUsed ?? 0)), kBought = sum(A.map((a) => a.ext?.kimizBought ?? 0)), kSpend = sum(A.map((a) => a.ext?.kimizSpend ?? 0));
  const kUsers = A.filter((a) => (a.ext?.kimizBought ?? 0) > 0); const dl: any[] = D.dunLog ?? []; const dw = dl.filter((r) => r.state === 'won').length;
  const flagged = A.filter((a) => a.final.pvp && a.arch !== 'pvp'); const deathsPerH = (g: any[]) => { const h = sum(g.map(hrs)); return h ? sum(g.map((a) => a.tot.deaths + a.tot.extraDeaths)) / h : 0; };
  rows.push({
    'koşu': dir.split('/').pop()!, 'sink/kaynak': `%${f(ratio * 100)}`, 'bant': band(ratio), 'kaynak/gün': M(src), 'sink/gün': M(snk), 'kımız sink/gün': M(kimizSink), 'arz': M(supply1), 'net artış/gün': M(netPerDay),
    'medyan bakiye g7→g14': `${M(med(goldAt(Math.floor(days / 2))))}→${M(med(goldAt(days)))}`, 'üst %10': M(p90(goldAt(days))),
    'kımız alım/kişi (14 gün)': kUsers.length ? Math.round(kSpend / kUsers.length).toLocaleString('tr-TR') : '—', 'kımız kullanan': `${kUsers.length}/${A.length}`, 'içilen/alınan': `${kUsed}/${kBought}`, 'içilen/oyuncu-saat': f(kUsed / Math.max(1, sum(lvl10.map(hrs))), 2),
    'zindan kazanma': dl.length ? `%${Math.round((dw / dl.length) * 100)} (${dl.length})` : '—', 'PvP öldürme': D.pvpLog.length, 'bayraklı çiftçi ölüm/sa': f(deathsPerH(flagged), 2), 'ölüm/sa (hepsi)': f(deathsPerH(A), 2),
  });
}
const keys = Object.keys(rows[0]); console.log(`| ${keys.join(' | ')} |\n|${keys.map(() => '---').join('|')}|\n${rows.map((r) => `| ${keys.map((k) => r[k]).join(' | ')} |`).join('\n')}`);
