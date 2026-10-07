/**
 * Endgame Enhancement Economy v1.1 — Simulation Only. Kontrol (olgun kohort, +9 tavan) ile deneyi karşılaştırır.
 *   npx tsx tests/sim/population/enh11-report.ts  ctrlDir1,ctrlDir2,...  expDir1,expDir2,...  [çıktı.md]
 * Üç etki ayrı raporlanır: (1) doğrudan +10…+15 sink, (2) diğer harcamaların ikamesi, (3) güç → gelir/tüketim.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { computeStats, hitDamage, type Item } from '../../../shared/game';
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const pct = (a: number[], q: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
const f0 = (n: number) => Math.round(n).toLocaleString('tr-TR'); const f1 = (n: number) => n.toFixed(1); const f2 = (n: number) => n.toFixed(2); const P = (n: number) => `%${(n * 100).toFixed(1)}`; const K = (n: number) => `${(n / 1000).toFixed(0)}k`; const Mn = (n: number) => `${(n / 1e6).toFixed(2)}M`;
const load = (dirs: string) => dirs.split(',').map((d) => JSON.parse(readFileSync(`${d}/ham.json`, 'utf8')));
const stats = (a: any) => computeStats({ level: a.final.level, boy: a.boy, spec: a.final.spec, equip: a.def as Record<string, Item>, kut: a.final.kut });
const power = (a: any) => { const s = stats(a); return s.atk * s.maxHp; };
const ttk = (A: any, B: any) => { const sa = stats(A), sb = stats(B); const crit = 1 + Math.min(1, sa.crit / 100) * (sa.critMult - 1); const dmg = hitDamage(sa.atk, 1, sb.def, true, false) * crit; return (sb.maxHp / Math.max(1, dmg)) * sa.atkInterval; };

function arm(runs: any[]) {
  const per = runs.map((D) => {
    const E: any[] = D.econ; const agents: any[] = D.agents; const days = D.meta.DAYS;
    const src = sum(E.map((e) => sum(Object.values(e.sources) as number[]))); const sinks: Record<string, number> = {}; for (const e of E) for (const [k, v] of Object.entries(e.sinks)) sinks[k] = (sinks[k] ?? 0) + (v as number);
    const snk = sum(Object.values(sinks)); const enh = sinks['artı +10…+15'] ?? 0;
    const gold = agents.map((a) => a.days[a.days.length - 1].gold); const coh = agents.filter((a) => a.seedLevel >= 35);
    const ext = (k: string) => sum(agents.map((a) => a.ext?.[k] ?? 0)); const tiers: any = {}; for (let t = 10; t <= 15; t++) tiers[t] = { try: ext('enhTry_t' + t), ok: ext('enhOk_t' + t), drop: ext('enhDrop_t' + t), fail: ext('enhFail_t' + t) };
    const ups: number[] = agents.flatMap((a) => Object.values(a.def as Record<string, Item>).map((i) => i.up));
    const maxUp = (a: any) => Math.max(0, ...Object.values(a.def as Record<string, Item>).map((i) => i.up)); const full = (a: any) => Object.values(a.def as Record<string, Item>).length === 4 && Object.values(a.def as Record<string, Item>).every((i) => i.up >= 14);
    const pw = agents.map(power); const sorted = [...pw].sort((x, y) => x - y); const med = sorted[Math.floor(sorted.length / 2)]; const top = avg(sorted.slice(Math.floor(sorted.length * 0.9)));
    const idxMed = pw.findIndex((x) => x === med); const topAg = agents.filter((_, i) => pw[i] >= sorted[Math.floor(sorted.length * 0.9)]); const medAg = agents[idxMed];
    const cPw = coh.map(power).sort((x, y) => x - y); const cMed = cPw[Math.floor(cPw.length / 2)] ?? 1; const cTop = avg(cPw.slice(Math.floor(cPw.length * 0.9)));
    const bf: any[] = D.bossFights; const dl: any[] = D.dunLog; const dwon = dl.filter((x) => x.state === 'won').length;
    const hrs = sum(agents.map((a) => sum(a.days.map((d: any) => d.minutes)))) / 60; const dth = sum(agents.map((a) => a.tot.deaths + a.tot.extraDeaths)); const cohHrs = sum(coh.map((a) => sum(a.days.map((d: any) => d.minutes)))) / 60;
    const inc = (a: any, k: string) => sum(a.days.map((d: any) => d.income?.[k] ?? 0)); const cohKills = sum(coh.map((a) => sum(a.days.map((d: any) => d.kills)))) / Math.max(1, cohHrs); const cohMobGold = sum(coh.map((a) => inc(a, 'yaratık'))) / Math.max(1, cohHrs);
    const cohDeaths = sum(coh.map((a) => a.tot.deaths + a.tot.extraDeaths)) / Math.max(1, cohHrs);
    const cohKz = sum(coh.map((a) => (a.days[a.days.length - 1].kzUsed ?? 0))) / Math.max(1, cohHrs);
    return { days, src, snk, enh, sinks, net: src - snk, goldTot: sum(gold), gMed: pct(gold, 0.5), gTop: avg([...gold].sort((x, y) => x - y).slice(Math.floor(gold.length * 0.9))), tiers, ups, enhGold: ext('enhGold'), enhOre: ext('enhOre'), enhCharm: ext('enhCharm'), enhBook: ext('enhBook'), blocks: { Budget: ext('enhBlockBudget'), Gold: ext('enhBlockGold'), Ore: ext('enhBlockOre'), Risk: ext('enhSkippedRisk') },
      reach15: agents.filter((a) => maxUp(a) >= 15).length, full14: agents.filter(full).length, reach10: agents.filter((a) => maxUp(a) >= 10).length, nCoh: coh.length, gap: top / med, cGap: cTop / cMed,
      ttkMM: medAg ? ttk(medAg, medAg) : 0, ttkTM: avg(topAg.map((t) => ttk(t, medAg))), ttkMT: avg(topAg.map((t) => ttk(medAg, t))),
      bossTtk: avg(bf.map((b) => b.sec)), bossN: bf.length, dunWin: dl.length ? dwon / dl.length : 0, dunN: dl.length, dph: dth / Math.max(1, hrs), cohKills, cohMobGold, cohDeaths, cohKz, agents };
  });
  return per;
}
const m = (per: any[], f: (x: any) => number) => avg(per.map(f));
const C = arm(load(process.argv[2])), X = arm(load(process.argv[3])); const nS = C.length;
const L: string[] = []; const w = (s = '') => L.push(s);
const row = (name: string, f: (x: any) => number, fmt: (n: number) => string) => { const c = m(C, f), x = m(X, f); const d = c ? ((x - c) / Math.abs(c)) : 0; w(`| ${name} | ${fmt(c)} | ${fmt(x)} | ${c ? (d >= 0 ? '+' : '') + (d * 100).toFixed(1) + '%' : '—'} |`); };
w(`# Endgame Enhancement Economy v1.1 — Simulation Only\n\n${nS} seed · ${C[0].days} gün · 150 oyuncu · baseline_heavy, KZ 0.09, NPC 0.70, Mob %100 (kilitli profil) · olgun kohort (başlangıç seviyesi ≥35, +9 takım) iki kolda da var.\nKontrol = +9 tavan. Deney = +10…+15 açık. Değerler seed ortalamasıdır.\n`);
w('## 1. Ekonomi\n\n| Metrik | Kontrol | v1.1 | Fark |\n|---|---|---|---|');
row('Toplam kaynak', (x) => x.src, Mn); row('Toplam sink', (x) => x.snk, Mn); row('  ↳ +10…+15 doğrudan sink', (x) => x.enh, Mn); row('Sink/kaynak', (x) => x.snk / x.src, P); row('Net akçe artışı (kaynak−sink)', (x) => x.net, Mn); row('G7 toplam oyuncu akçesi', (x) => x.goldTot, Mn); row('Medyan bakiye', (x) => x.gMed, K); row('Üst %10 bakiye (ort.)', (x) => x.gTop, K);
w('\n### Etki ayrımı\n\n**(1) Doğrudan +10…+15 sink:** ' + Mn(m(X, (x) => x.enh)) + ` (toplam sink'in ${P(m(X, (x) => x.enh / x.snk))} kadarı; sink/kaynak puanına katkısı ≈ ${((m(X, (x) => x.enh / x.src)) * 100).toFixed(1)} puan).`);
const cats = new Set<string>(); for (const r of [...C, ...X]) for (const k of Object.keys(r.sinks)) cats.add(k);
w('\n**(2) Diğer harcamaların ikamesi (kategori başına sink, Kontrol → v1.1):**\n\n| Kategori | Kontrol | v1.1 | Fark |\n|---|---|---|---|');
for (const k of [...cats].filter((k) => k !== 'artı +10…+15').sort()) { const c = m(C, (x) => x.sinks[k] ?? 0), x = m(X, (y) => y.sinks[k] ?? 0); if (c + x < 20000) continue; w(`| ${k} | ${Mn(c)} | ${Mn(x)} | ${c ? ((x - c) / c * 100 >= 0 ? '+' : '') + ((x - c) / c * 100).toFixed(1) + '%' : '—'} |`); }
w('\n**(3) Güç → gelir/tüketim (yalnızca kohort, oyuncu-saat başına):**\n\n| Metrik | Kontrol | v1.1 | Fark |\n|---|---|---|---|');
row('Öldürme/saat', (x) => x.cohKills, f1); row('Yaratık akçesi/saat', (x) => x.cohMobGold, K); row('Ölüm/saat', (x) => x.cohDeaths, f2); row('Kımız kullanımı/saat (toplam)', (x) => x.cohKz, f2);
w('\n## 2. Progression\n\n| Metrik | Kontrol | v1.1 |\n|---|---|---|');
w(`| Kohort oyuncu sayısı | ${f1(m(C, (x) => x.nCoh))} | ${f1(m(X, (x) => x.nCoh))} |`); w(`| ≥+10 ekipmanı olan oyuncu | ${f1(m(C, (x) => x.reach10))} | ${f1(m(X, (x) => x.reach10))} |`); w(`| +15'e ulaşan oyuncu | ${f1(m(C, (x) => x.reach15))} | ${f1(m(X, (x) => x.reach15))} |`); w(`| 4 slotu ≥+14 olan oyuncu | ${f1(m(C, (x) => x.full14))} | ${f1(m(X, (x) => x.full14))} |`);
w(`| Toplam yükseltme denemesi (+10…+15) | 0 | ${f1(m(X, (x) => sum(Object.values(x.tiers).map((t: any) => t.try))))} |`);
w('\n**Kademe başına (deney, seed ortalaması):**\n\n| Hedef | Tasarım şansı | Deneme | Başarı | Gerçek oran | Düşme |\n|---|---|---|---|---|---|'); const RATE: any = { 10: '40%', 11: '32%', 12: '25%', 13: '18%', 14: '12%', 15: '8%' };
for (let t = 10; t <= 15; t++) { const tr = m(X, (x) => x.tiers[t].try), ok = m(X, (x) => x.tiers[t].ok), dr = m(X, (x) => x.tiers[t].drop); w(`| +${t} | ${RATE[t]} | ${f1(tr)} | ${f1(ok)} | ${tr ? P(ok / tr) : '—'} | ${f1(dr)} |`); }
const tries = m(X, (x) => sum(Object.values(x.tiers).map((t: any) => t.try))); const oks = m(X, (x) => sum(Object.values(x.tiers).map((t: any) => t.ok)));
w(`\n- Deneme başına ortalama akçe: **${f0(m(X, (x) => x.enhGold) / Math.max(1, tries))}**; başarılı yükseltme başına **${f0(m(X, (x) => x.enhGold) / Math.max(1, oks))}** akçe (başarısız denemeler dahil).`);
w(`- Başarısızlık maliyeti (başarısız deneme akçesi): ${Mn(m(X, (x) => x.enhGold) * (1 - oks / Math.max(1, tries)))} · ortalama ${f1(m(X, (x) => x.enhOre))} demir cevheri · tılsım ${f1(m(X, (x) => x.enhCharm))} · kitap ${f1(m(X, (x) => x.enhBook))}.`);
w(`- Engel nedenleri (deneme yapılamadı, kayıt sayısı): bütçe ${f0(m(X, (x) => x.blocks.Budget))} · akçe ${f0(m(X, (x) => x.blocks.Gold))} · cevher ${f0(m(X, (x) => x.blocks.Ore))} · riskten vazgeçme ${f0(m(X, (x) => x.blocks.Risk))}.`);
const dist = (per: any[]) => { const c: Record<number, number> = {}; for (const r of per) for (const u of r.ups) c[u] = (c[u] ?? 0) + 1 / per.length; return c; };
const dc = dist(C), dx = dist(X); w('\n**Ekipman artı dağılımı (slot sayısı, seed ort.):**\n\n| +n | ' + [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => '+' + n).join(' | ') + ' |\n|---|' + '---|'.repeat(11));
w(`| Kontrol | ${[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => f1(dc[n] ?? 0)).join(' | ')} |`); w(`| v1.1 | ${[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((n) => f1(dx[n] ?? 0)).join(' | ')} |`);
w('\n**Profil kırılımı (deney, tüm seed\'ler; risk iştahı / bütçe oranı üçlüleri):**\n\n| Grup | Oyuncu | Deneme/oyuncu | Düşme/oyuncu | Ort. en yüksek +n | Harcanan akçe/oyuncu |\n|---|---|---|---|---|---|');
const ag = X.flatMap((r) => r.agents).filter((a: any) => a.seedLevel >= 35); const grp = (name: string, key: string, lo: number, hi: number) => { const g = ag.filter((a: any) => a.par[key] >= lo && a.par[key] < hi); if (!g.length) return; const e = (a: any, k: string) => a.ext?.[k] ?? 0; const tryN = sum(g.map((a: any) => sum([10, 11, 12, 13, 14, 15].map((t) => e(a, 'enhTry_t' + t))))); const dropN = sum(g.map((a: any) => sum([10, 11, 12, 13, 14, 15].map((t) => e(a, 'enhDrop_t' + t))))); w(`| ${name} | ${g.length} | ${f1(tryN / g.length)} | ${f1(dropN / g.length)} | ${f1(avg(g.map((a: any) => Math.max(0, ...Object.values(a.def as Record<string, Item>).map((i) => i.up)))))} | ${f0(sum(g.map((a: any) => e(a, 'enhGold'))) / g.length)} |`); };
grp('risk iştahı düşük (<0.33)', 'riskAppetite', 0, 0.33); grp('risk iştahı orta', 'riskAppetite', 0.33, 0.67); grp('risk iştahı yüksek (≥0.67)', 'riskAppetite', 0.67, 2); grp('bütçe oranı düşük (<0.13)', 'upBudget', 0, 0.13); grp('bütçe oranı orta', 'upBudget', 0.13, 0.22); grp('bütçe oranı yüksek (≥0.22)', 'upBudget', 0.22, 2);
w('\n## 3. Combat\n\n| Metrik | Kontrol | v1.1 | Fark |\n|---|---|---|---|');
row('PvP TTK: medyan → medyan (sn)', (x) => x.ttkMM, f1); row('PvP TTK: üst %10 → medyan (sn)', (x) => x.ttkTM, f1); row('PvP TTK: medyan → üst %10 (sn)', (x) => x.ttkMT, f1); row('Boss TTK (ort. sn)', (x) => x.bossTtk, f1); row('Zindan kazanma oranı', (x) => x.dunWin, P); row('Ölüm/saat (tüm nüfus)', (x) => x.dph, f2);
row('Güç farkı: üst %10 / medyan (tüm nüfus)', (x) => x.gap, f2); row('Güç farkı: üst %10 / medyan (kohort içi)', (x) => x.cGap, f2);
w(`\n_PvP TTK, nihai ekipmandan hesaplanan istatistiklerle (temel saldırı, kritik beklentisi dahil, PvP hasar formülü) analitik olarak hesaplandı; simülasyondaki gerçek düello sayısı çok az olduğu için gözlemsel TTK kullanılmadı. Güç = saldırı × azami can._\n`);
writeFileSync(process.argv[4] ?? '/tmp/enh11.md', L.join('\n')); console.log(L.join('\n'));
