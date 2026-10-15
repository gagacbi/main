/**
 * Davranış doğrulama: gelir ölçeği değişirken sink inelastik mi? (oyuncu-saat başına sink, sink/kaynak, kımız tüketimi/saat)
 *   npx tsx tests/sim/population/elasticity.ts etiket:dizin ...   (son 2 gün)
 */
import { readFileSync } from 'node:fs';
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const M = (n: number) => `${(n / 1e6).toFixed(2)}M`;
const rows = process.argv.slice(2).map((arg) => {
  const [label, dir] = arg.split(':'); const D = JSON.parse(readFileSync(`${dir}/ham.json`, 'utf8')); const E: any[] = D.econ; const days = D.meta.DAYS; const from = Math.max(1, days - 1);   // son 2 gün (1-tabanlı)
  const ev = E.filter((e) => e.day >= from); const src = sum(ev.map((e) => sum(Object.values(e.sources) as number[]))), snk = sum(ev.map((e) => sum(Object.values(e.sinks) as number[]))), kz = sum(ev.map((e) => e.sinks['kımız'] ?? 0));
  const hrs = sum(D.agents.map((a: any) => sum(a.days.filter((d: any) => d.day >= from).map((d: any) => d.minutes)))) / 60; const dayAt = (a: any, d: number) => a.days[Math.min(d, a.days.length) - 1]; const used = sum(D.agents.map((a: any) => (dayAt(a, days).kzUsed ?? 0) - (dayAt(a, from - 1 || 1).kzUsed ?? 0))); const short = sum(D.agents.map((a: any) => (dayAt(a, days).kzShort ?? 0) - (dayAt(a, from - 1 || 1).kzShort ?? 0)));
  const allHrs = hrs;
  return { label, hrs, src, snk, kz, ratio: snk / src, sinkH: snk / hrs, kzH: kz / hrs, usedH: used / allHrs, short };
});
console.log(`| Senaryo | Kaynak (2 gün) | Sink/oyuncu-saat | Sink/kaynak | Kımız sink/oyuncu-saat | Kımız tüketimi/oyuncu-saat | Kımız eksiği (adet) |\n|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.label} | ${M(r.src)} | ${Math.round(r.sinkH).toLocaleString('tr-TR')} | %${(r.ratio * 100).toFixed(1)} | ${Math.round(r.kzH).toLocaleString('tr-TR')} | ${r.usedH.toFixed(3)} | ${r.short} |`).join('\n')}`);
