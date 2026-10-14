/**
 * Yeni sistemler A/B raporu: kontrol kolu (hepsi kapalı) ile yeni sistemler açık kolu, çok tohumlu.
 *   CTRL="/tmp/ab/c1 /tmp/ab/c2" NEW="/tmp/ab/n1 /tmp/ab/n2" npx tsx tests/sim/population/newsys-report.ts [çıktı.md]
 * Sayılar tohumlar arası ortalamadır; [min–max] aralığı tohum gürültüsünü gösterir.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { FISH_DEFS } from '../../../shared/fishing';

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const p90 = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : 0; };
const M = (n: number) => (Math.abs(n) >= 1e5 ? `${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : n.toFixed(0)); const f1 = (n: number) => n.toFixed(1); const f2 = (n: number) => n.toFixed(2);

interface Run { dir: string; D: any; A: any[]; E: any[]; days: number }
const load = (dirs: string[]): Run[] => dirs.map((dir) => { const D = JSON.parse(readFileSync(`${dir}/ham.json`, 'utf8')); return { dir, D, A: D.agents, E: D.econ, days: D.meta.DAYS }; });
const arms = { control: load((process.env.CTRL ?? '').split(/\s+/).filter(Boolean)), yeni: load((process.env.NEW ?? '').split(/\s+/).filter(Boolean)) };
const hrs = (a: any) => sum(a.days.map((d: any) => d.minutes)) / 60;
const lastN = (r: Run, n = 7) => r.E.slice(-Math.min(n, r.E.length));
const perDay = (r: Run, kind: 'sources' | 'sinks', key: string) => mean(lastN(r).map((e) => e[kind][key] ?? 0));
const totDay = (r: Run, kind: 'sources' | 'sinks') => mean(lastN(r).map((e) => sum(Object.values(e[kind]) as number[])));

type Metric = (r: Run) => number;
function agg(rs: Run[], m: Metric) { const v = rs.map(m); return { mean: mean(v), min: Math.min(...v), max: Math.max(...v) }; }
const cell = (rs: Run[], m: Metric, fmt: (n: number) => string) => { if (!rs.length) return '—'; const a = agg(rs, m); return `${fmt(a.mean)} [${fmt(a.min)}–${fmt(a.max)}]`; };
const delta = (m: Metric) => { const c = agg(arms.control, m).mean, n = agg(arms.yeni, m).mean; return c ? `${n >= c ? '+' : ''}${(((n - c) / Math.abs(c)) * 100).toFixed(1)}%` : '—'; };
const row = (label: string, m: Metric, fmt: (n: number) => string) => `| ${label} | ${cell(arms.control, m, fmt)} | ${cell(arms.yeni, m, fmt)} | ${delta(m)} |`;
const ext = (r: Run, k: string, filter?: (a: any) => boolean) => sum(r.A.filter(filter ?? (() => true)).map((a) => a.ext?.[k] ?? 0));
const isBot = (a: any) => a.arch === 'balikci';
const lvlAt = (r: Run, d: number) => mean(r.A.map((a) => a.days[Math.min(d, a.days.length) - 1].level));

const out: string[] = [];
const n = (k: 'control' | 'yeni') => arms[k].length;
out.push(`# Yeni sistemler — ekonomi A/B raporu (otomatik üretildi)\n`);
out.push(`Kontrol kolu: ${n('control')} tohum · Yeni sistemler: ${n('yeni')} tohum · ${arms.yeni[0]?.D.meta.N ?? '?'} oyuncu · ${arms.yeni[0]?.days ?? '?'} gün · dilim ${arms.yeni[0]?.D.meta.W ?? '?'} dk. Tohumlar: ${arms.yeni.map((r) => r.D.meta.SEED).join(', ')}.\n`);
out.push(`**Kontrol kolu**: balık, günlük görev, element, ek yuva düşüşleri, Kut Taşı, sürü çağrısı/Sürü Başı, anahtar+sandık ve yoldaş evrimi KAPALI (\`FEATURES\` bayrakları, kod değişmeden). Ajanlar kontrol kolunda bu sistemleri kullanmaz. Her iki kolda: Alp Avı ve günlük kill ilerlemesi ölçeklenen dakikalarda da işlenir (harness düzeltmesi), Kımız \`baseline_heavy\` kilitli profil.\n`);

out.push(`## 1. Toplam ekonomi (son 7 gün ortalaması)\n\n| Metrik | Kontrol | Yeni sistemler | Fark |\n|---|---|---|---|`);
out.push(row('Akçe kaynağı / gün', (r) => totDay(r, 'sources'), M));
out.push(row('Akçe sink / gün', (r) => totDay(r, 'sinks'), M));
out.push(row('Sink / kaynak', (r) => totDay(r, 'sinks') / Math.max(1, totDay(r, 'sources')) * 100, (x) => `%${f1(x)}`));
out.push(row('Net arz artışı / gün', (r) => totDay(r, 'sources') - totDay(r, 'sinks'), M));
out.push(row('Toplam arz (son gün)', (r) => r.E[r.E.length - 1].supply, M));
out.push(row('Medyan bakiye (son gün)', (r) => med(r.A.map((a) => a.days[a.days.length - 1].gold)), M));
out.push(row('Üst %10 bakiye', (r) => p90(r.A.map((a) => a.days[a.days.length - 1].gold)), M));
out.push(row('Gini (son gün)', (r) => r.E[r.E.length - 1].gini, f2));
out.push(row('Muhasebe artığı (korunum denetimi, mutlak)', (r) => Math.abs(mean(r.E.map((e: any) => e.resid ?? 0))), (x) => M(x)));

out.push(`\n## 2. İlerleme ve güç\n\n| Metrik | Kontrol | Yeni sistemler | Fark |\n|---|---|---|---|`);
out.push(row('Ortalama seviye (gün 7)', (r) => lvlAt(r, 7), f1)); out.push(row('Ortalama seviye (son gün)', (r) => lvlAt(r, r.days), f1));
out.push(row('Ölüm / oyuncu-saat', (r) => sum(r.A.map((a) => a.tot.deaths + a.tot.extraDeaths)) / Math.max(1, sum(r.A.map(hrs))), f2));
out.push(row('Yaratık öldürme / oyuncu-saat', (r) => sum(r.A.map((a) => a.tot.kills + a.tot.extraKills)) / Math.max(1, sum(r.A.map(hrs))), f1));
out.push(row('Ort. net değer (son gün)', (r) => mean(r.A.map((a) => a.days[a.days.length - 1].worth)), M));
out.push(row('Yok olan eşya (toplam)', (r) => sum(r.A.map((a) => a.tot.destroyed)), (x) => x.toFixed(0)));
out.push(row('Kımız sink / gün', (r) => perDay(r, 'sinks', 'kımız'), M));

const keysNew = ['sandık', 'öğretici'];
out.push(`\n## 3. Yeni akış kalemleri (M/gün, son 7 gün; yeni kolda)\n\n| Kalem | Tür | Akçe / gün | Toplam kaynağa / sinke oranı |\n|---|---|---|---|`);
const items: [string, 'sources' | 'sinks'][] = [['sandık', 'sources'], ['Kut Taşı saflaştırma', 'sinks'], ['element yazısı', 'sinks'], ['yoldaş evrimi', 'sinks'], ['balık: olta/yem', 'sinks'], ['balık: olta geliştirme', 'sinks']];
for (const [k, kind] of items) { const v = mean(arms.yeni.map((r) => perDay(r, kind, k))); const base = mean(arms.yeni.map((r) => totDay(r, kind))); out.push(`| ${k} | ${kind === 'sources' ? 'kaynak' : 'sink'} | ${M(v)} | %${f2(base ? (v / base) * 100 : 0)} |`); }
void keysNew;

out.push(`\n## 4. Benimseme (toplam, yeni kolda, tohum ortalaması)\n\n| Davranış | Değer |\n|---|---|`);
const E = (k: string, flt?: (a: any) => boolean) => mean(arms.yeni.map((r) => ext(r, k, flt)));
const adopt: [string, number][] = [['Kut Taşı takma', E('ktSet')], ['Kut Taşı saflaştırma (deneme)', E('ktRefine')], ['… başarılı', E('ktRefineOk')], ['Taş kırılması (çıkarma/değiştirme)', E('ktBroke')], ['Sandık açma', E('chestOpened')], ['… bronz / gümüş / altın', 0], ['Yoldaş evrimi', E('evolved')], ['Element ekleme', E('eleAdd')], ['Element yükseltme (deneme)', E('eleRaise')], ['Balık atışı (insan)', E('fishCasts', (a) => !isBot(a))], ['Balık atışı (bot)', E('fishCasts', isBot)], ['Balık yakalama (insan)', E('fishCaught', (a) => !isBot(a))], ['Balık yakalama (bot)', E('fishCaught', isBot)], ['Pazarda listelenen balık', E('fishListed')], ['Pazardan alınan balık', E('fishBought')], ['Yenen balık (oturum başı)', E('fishEaten')], ['Yenen balık (ölçeklenen dk)', E('fishEatenExtra')]];
for (const [k, v] of adopt) { if (k.includes('bronz')) { out.push(`| ${k} | ${f1(E('chestG0'))} / ${f1(E('chestG1'))} / ${f1(E('chestG2'))} |`); continue; } out.push(`| ${k} | ${f1(v)} |`); }
const nfinal = (flt: (a: any) => boolean) => mean(arms.yeni.map((r) => r.A.filter(flt).length));
out.push(`| Son gün: takılı Kut Taşı yuvası (oyuncu başı) | ${f2(mean(arms.yeni.map((r) => mean(r.A.map((a) => (a.final.kt ? a.final.kt.eq.filter((g: number) => g >= 0).length : 0))))))} / 6 |`);
out.push(`| Son gün: en yüksek takılı sınıf ≥ Parlak(2) olan oyuncu | ${f1(100 * mean(arms.yeni.map((r) => r.A.filter((a) => a.final.kt && Math.max(...a.final.kt.eq) >= 2).length / r.A.length)))}% |`);
out.push(`| Son gün: evrim aşaması ≥1 yoldaşı olan oyuncu | ${f1(100 * mean(arms.yeni.map((r) => r.A.filter((a) => (a.final.evo ?? []).some((e: number) => e >= 1)).length / r.A.length)))}% |`);
void nfinal;

// Balık ekonomisi
out.push(`\n## 5. Balıkçılık getirisi (insan ve bot)\n`);
const refOf = (id: string) => FISH_DEFS.find((x) => x.id === id)?.ref ?? 0;
const fishVal = (rs: Run[], flt: (a: any) => boolean) => { let val = 0, min = 0, caught = 0, casts = 0; for (const r of rs) for (const a of r.A.filter(flt)) { for (const d of FISH_DEFS) val += (a.ext?.['fish_' + d.id] ?? 0) * d.ref; min += a.ext?.fishMin ?? 0; caught += a.ext?.fishCaught ?? 0; casts += a.ext?.fishCasts ?? 0; } return { val, hours: min / 60, caught, casts }; };
const humanF = fishVal(arms.yeni, (a) => !isBot(a) && (a.ext?.fishMin ?? 0) > 0), botF = fishVal(arms.yeni, isBot);
const farmGoldH = (rs: Run[]) => { const v: number[] = []; for (const r of rs) { let g = 0, h = 0; for (const a of r.A) { if (isBot(a)) continue; for (const d of a.days) { g += d.income?.['yaratık'] ?? 0; } h += hrs(a); } v.push(g / Math.max(1, h)); } return mean(v); };
void refOf; void farmGoldH;
out.push(`| Grup | Balık-saat | Atış/saat | Yakalama/saat | Tutma oranı | Referans değer/saat (akçe, ref fiyatla) |\n|---|---|---|---|---|---|`);
for (const [nm, g] of [['İnsan (balık payı olan)', humanF], ['Bot (makro, 3/3 vuruş)', botF]] as const) out.push(`| ${nm} | ${f1(g.hours)} | ${f1(g.casts / Math.max(0.01, g.hours))} | ${f1(g.caught / Math.max(0.01, g.hours))} | %${f1((g.caught / Math.max(1, g.casts)) * 100)} | ${M(g.val / Math.max(0.01, g.hours))} |`);
const fs = mean(arms.yeni.map((r) => mean(r.E.map((e: any) => e.mkt.fishSales ?? 0))));
const fv = mean(arms.yeni.map((r) => mean(r.E.map((e: any) => e.mkt.fishVolume ?? 0))));
const stock = mean(arms.yeni.map((r) => sum(r.A.map((a) => a.final.fishStock ?? 0))));
out.push(`\nPazarda balık satışı: ${f1(fs)} işlem/gün, ${M(fv)} akçe/gün hacim · Dönem sonu satılmamış balık stoğu (nüfus toplamı): ${M(stock)} adet.`);
const tf = (rs: Run[]) => mean(rs.map((r) => mean(r.A.filter((a) => !isBot(a)).map((a) => sum(a.days.map((d: any) => d.income?.['yaratık'] ?? 0)) / Math.max(0.1, hrs(a))))));
out.push(`\nKarşılaştırma — yaratık akçesi / oyuncu-saat (ort., botsuz; kontrol / yeni): ${M(tf(arms.control))} / ${M(tf(arms.yeni))}.`);

// Arketip bazında
out.push(`\n## 6. Arketip bazında seviye kazancı ve ölüm (yeni sistemler kolu, kontrole oranla)\n\n| Arketip | Seviye/gün (kontrol → yeni) | Ölüm/saat (kontrol → yeni) | Bakiye medyanı son gün (kontrol → yeni) |\n|---|---|---|---|`);
const archs = [...new Set(arms.yeni.flatMap((r) => r.A.map((a) => a.arch)))];
for (const k of archs) { const g = (rs: Run[], m: (a: any) => number) => mean(rs.map((r) => { const xs = r.A.filter((a) => a.arch === k).map(m); return xs.length ? mean(xs) : 0; }));
  const gain = (a: any) => (a.days[a.days.length - 1].prog - a.days[0].prog) / Math.max(1, a.days.length - 1); const dph = (a: any) => (a.tot.deaths + a.tot.extraDeaths) / Math.max(0.1, hrs(a)); const gold = (a: any) => a.days[a.days.length - 1].gold;
  const nm = arms.yeni[0].A.find((a) => a.arch === k).archName; out.push(`| ${nm} | ${f2(g(arms.control, gain))} → ${f2(g(arms.yeni, gain))} | ${f2(g(arms.control, dph))} → ${f2(g(arms.yeni, dph))} | ${M(g(arms.control, gold))} → ${M(g(arms.yeni, gold))} |`); }

writeFileSync(process.argv[2] ?? '/tmp/newsys-report.md', out.join('\n') + '\n'); console.log(out.join('\n'));
