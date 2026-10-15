/**
 * Gruplanmış koşu karşılaştırması: etiket:dizin,dizin,dizin ... ; ilk grup referanstır. Tohum ortalamaları ve referansa fark.
 *   npx tsx tests/sim/population/compare.ts kontrol:/tmp/a,/tmp/b A:/tmp/c,/tmp/d
 */
import { readFileSync } from 'node:fs';
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }; const p90 = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : 0; };
const M = (n: number) => `${(n / 1e6).toFixed(1)}M`;
interface R { [k: string]: number }
function metrics(dir: string): R {
  const D = JSON.parse(readFileSync(`${dir}/ham.json`, 'utf8')); const A: any[] = D.agents; const E: any[] = D.econ; const last = E.slice(-7); const days = D.meta.DAYS;
  const mean = (k: 'sources' | 'sinks', f: (key: string) => boolean) => sum(last.map((e) => sum(Object.entries(e[k]).filter(([n]) => f(n)).map(([, v]) => v as number)))) / last.length;
  const src = mean('sources', () => true), snk = mean('sinks', () => true); const goldAt = (d: number) => A.map((a) => a.days[Math.min(d, a.days.length) - 1].gold);
  const half = Math.floor(E.length / 2); const hrs = (a: any) => sum(a.days.map((d: any) => d.minutes)) / 60; const flagged = A.filter((a) => a.final.pvp && a.arch !== 'pvp');
  const dl: any[] = D.dunLog ?? []; const dh = sum(flagged.map(hrs));
  return {
    ratio: snk / src, src, snk, net: (E[E.length - 1].supply - E[half - 1].supply) / (E.length - half), supply: E[E.length - 1].supply, med7: med(goldAt(Math.floor(days / 2))), med14: med(goldAt(days)), p90: p90(goldAt(days)),
    npc: mean('sources', (n) => n === 'NPC satış'), mob: mean('sources', (n) => n === 'yaratık'), exp: mean('sources', (n) => n === 'sefer'), boss: mean('sources', (n) => n.startsWith('boss') || n === 'çatlak'),
    kimiz: mean('sinks', (n) => n === 'kımız'), cos: mean('sinks', (n) => n.startsWith('kostüm') && n !== 'kostüm: şans eşyası'), luck: mean('sinks', (n) => n === 'kostüm: şans eşyası'), artı: mean('sinks', (n) => n === 'artı basma'),
    dun: dl.length ? dl.filter((r) => r.state === 'won').length / dl.length : 0, flagd: dh ? sum(flagged.map((a) => a.tot.deaths + a.tot.extraDeaths)) / dh : 0,
  };
}
const groups = process.argv.slice(2).map((g) => { const [label, dirs] = g.split(':'); const ms = dirs.split(',').map(metrics); const m: R = {}; for (const k of Object.keys(ms[0])) m[k] = avg(ms.map((x) => x[k])); return { label, n: ms.length, m, ratios: ms.map((x) => x.ratio) }; });
const rows: [string, (m: R) => string, (a: number, b: number) => string][] = [
  ['Sink/kaynak', (m) => `%${(m.ratio * 100).toFixed(1)}`, (a, b) => `${((a - b) * 100 >= 0 ? '+' : '')}${((a - b) * 100).toFixed(1)} puan`],
  ['Kaynak/gün', (m) => M(m.src), (a, b) => M(a - b)], ['Sink/gün', (m) => M(m.snk), (a, b) => M(a - b)], ['Net akçe artışı/gün', (m) => M(m.net), (a, b) => M(a - b)], ['Toplam akçe G14', (m) => M(m.supply), (a, b) => M(a - b)],
  ['Medyan bakiye G7 → G14', (m) => `${M(m.med7)} → ${M(m.med14)}`, (a, b) => '—'], ['Üst %10 bakiye', (m) => M(m.p90), (a, b) => M(a - b)],
  ['NPC satışından kaynak/gün', (m) => M(m.npc), (a, b) => M(a - b)], ['Yaratık akçesinden kaynak/gün', (m) => M(m.mob), (a, b) => M(a - b)], ['Sefer kaynağı/gün', (m) => M(m.exp), (a, b) => M(a - b)], ['Boss+çatlak kaynağı/gün', (m) => M(m.boss), (a, b) => M(a - b)],
  ['Kımız sink/gün', (m) => M(m.kimiz), (a, b) => M(a - b)], ['Kostüm sink/gün', (m) => M(m.cos), (a, b) => M(a - b)], ['Şans eşyası sink/gün', (m) => M(m.luck), (a, b) => M(a - b)], ['Artı basma sink/gün', (m) => M(m.artı), (a, b) => M(a - b)],
  ['Zindan kazanma', (m) => `%${(m.dun * 100).toFixed(0)}`, (a, b) => `${((a - b) * 100).toFixed(0)} puan`], ['Bayraklı çiftçi ölüm/sa', (m) => m.flagd.toFixed(2), (a, b) => (a - b).toFixed(2)],
];
const ref = groups[0]; const head = ['Metrik', ...groups.flatMap((g, i) => (i === 0 ? [`${g.label} (n=${g.n})`] : [`${g.label} (n=${g.n})`, `Fark ${g.label}`]))];
const key: Record<string, keyof R> = { 'Sink/kaynak': 'ratio', 'Kaynak/gün': 'src', 'Sink/gün': 'snk', 'Net akçe artışı/gün': 'net', 'Toplam akçe G14': 'supply', 'Üst %10 bakiye': 'p90', 'NPC satışından kaynak/gün': 'npc', 'Yaratık akçesinden kaynak/gün': 'mob', 'Sefer kaynağı/gün': 'exp', 'Boss+çatlak kaynağı/gün': 'boss', 'Kımız sink/gün': 'kimiz', 'Kostüm sink/gün': 'cos', 'Şans eşyası sink/gün': 'luck', 'Artı basma sink/gün': 'artı', 'Zindan kazanma': 'dun', 'Bayraklı çiftçi ölüm/sa': 'flagd' };
console.log(`| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map(([name, fmt, diff]) => `| ${name} | ${groups.map((g, i) => (i === 0 ? fmt(g.m) : `${fmt(g.m)} | ${key[name] ? diff(g.m[key[name]], ref.m[key[name]]) : '—'}`)).join(' | ')} |`).join('\n')}`);
console.log('\nTohum başına sink/kaynak: ' + groups.map((g) => `${g.label}: ${g.ratios.map((r) => (r * 100).toFixed(1)).join(' / ')}`).join(' · '));
