/**
 * ham.json → karakter başına rapor (docs/balans/populasyon/oyuncular/*.md), toplu özet (ozet.json) ve rapor tabloları.
 *   npx tsx tests/sim/population/report.ts
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { DMG_KINDS, computeStats, type Item } from '../../../shared/game';

const OUT = process.env.POP_OUT ?? 'docs/balans/populasyon'; const D = JSON.parse(readFileSync(`${OUT}/ham.json`, 'utf8'));
const agents: any[] = D.agents; const days = D.meta.DAYS;
const n = (x: number) => Math.round(x).toLocaleString('tr-TR'); const f1 = (x: number) => (Math.round(x * 10) / 10).toString();
const tab = (head: string[], rows: (string | number)[][]) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0); const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0); const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// ── karakter başına çıkarım ──
interface Ins { name: string; arch: string; level0: number; level1: number; prog0: number; prog1: number; gold1: number; hours: number; kills: number; deaths: number; deathsPerH: number; defMain: string; defMainPct: number; mainShare: number; defs: Record<string, number>; churn: number; reasons: string[]; rewardsPerH: number; stagn: number; worthGain: number; income: number; spent: number; blocked: number }
const ins: Ins[] = agents.map((a) => {
  const dr: any[] = a.days; const first = dr[0], last = dr[dr.length - 1]; const hours = sum(dr.map((d: any) => d.minutes)) / 60;
  const kills = sum(dr.map((d: any) => d.kills)); const deaths = sum(dr.map((d: any) => d.deaths));
  const equip = a.def as Record<string, Item>; const st = computeStats({ level: a.final.level, boy: a.boy, spec: a.final.spec, equip, kut: a.final.kut });
  const tot = sum(DMG_KINDS.map((k) => a.dmgByKind[k] ?? 0)) + (a.dmgByKind.pl ?? 0) + (a.dmgByKind.dot ?? 0); let main = 'kilic', mv = -1; for (const k of DMG_KINDS) if ((a.dmgByKind[k] ?? 0) > mv) { mv = a.dmgByKind[k] ?? 0; main = k; }
  const income = sum(dr.map((d: any) => sum(Object.values(d.income) as number[]))); const spent = sum(dr.map((d: any) => sum(Object.values(d.expense) as number[])));
  const rewards = a.tot.rare + a.tot.upgradesOk + a.tot.bossKills + a.tot.riftCloses + (a.final.level - a.seedLevel) + a.tot.mktSold; const rph = hours > 0 ? rewards / hours : 0;
  let stagn = 0, run = 0; for (let i = 1; i < dr.length; i++) { const dp = dr[i].prog - dr[i - 1].prog; if (dr[i].minutes >= 45 && dp < 0.15 && a.final.level < 50) { run++; stagn = Math.max(stagn, run); } else run = 0; }
  const reasons: string[] = []; let churn = 0;
  if (stagn >= 4) { churn += 2; reasons.push(`${stagn} gün üst üste ilerleme yok`); }
  if (hours > 0 && deaths / hours > 8) { churn += 2; reasons.push(`saatte ${f1(deaths / hours)} ölüm`); }
  if (a.tot.destroyed >= 3) { churn += 1.5; reasons.push(`${a.tot.destroyed} eşya yok oldu`); }
  if (a.maxFailStreak >= 6) { churn += 1; reasons.push(`${a.maxFailStreak} başarısız artı serisi`); }
  if (rph < 1.2 && hours > 6) { churn += 1.5; reasons.push(`ödül sıklığı düşük (${f1(rph)}/sa)`); }
  const dailyInc = income / Math.max(1, days); if (last.gold > dailyInc * 25 && a.final.level >= 20) { churn += 1; reasons.push('biriken akçeyi harcayacak yer yok'); }
  if (a.tot.pvpDeaths >= 5 && a.tot.pvpKills === 0) { churn += 2; reasons.push(`${a.tot.pvpDeaths} kez oyuncular tarafından öldürüldü`); }
  const defs: Record<string, number> = {}; for (const k of DMG_KINDS) defs[k] = Math.round(st.defKind[k] * 100);
  return { name: a.name, arch: a.arch, level0: first.level, level1: last.level, prog0: dr[0].prog - 0, prog1: last.prog, gold1: last.gold, hours, kills, deaths, deathsPerH: hours ? deaths / hours : 0, defMain: main, defMainPct: Math.round(st.defKind[main as 'kilic'] * 100), mainShare: tot ? mv / tot : 0, defs, churn, reasons, rewardsPerH: rph, stagn, worthGain: last.worth - first.worth, income, spent, blocked: a.tot.blocked };
});

// ── karakter raporları ──
const dir = `${OUT}/oyuncular`; if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const ACT: Record<string, string> = { farm: 'farm', boss: 'boss', rift: 'çatlak', pvp: 'PvP', rest: 'dinlenme' };
agents.forEach((a, i) => {
  const I = ins[i]; const dr: any[] = a.days; const total = sum(Object.values(a.actTicks) as number[]) || 1;
  const inc: Record<string, number> = {}, exp: Record<string, number> = {}; for (const d of dr) { for (const [k, v] of Object.entries(d.income)) inc[k] = (inc[k] ?? 0) + (v as number); for (const [k, v] of Object.entries(d.expense)) exp[k] = (exp[k] ?? 0) + (v as number); }
  const eq = Object.entries(a.def as Record<string, Item>).map(([s, it]) => `${s}: ${['sıradan', 'nadir', 'destansı', 'efsanevi'][it.tier]} ilvl${it.ilvl} +${it.up}${it.wk ? ' [' + it.wk + ']' : ''} · temel ${it.base ? it.base.k + ' ' + it.base.v : '—'} · ${it.ench.map((e) => e.k + ' ' + e.v).join(', ') || 'efsun yok'}`).join('\n- ');
  const threat = DMG_KINDS.map((k) => `${k}: ${n(a.dmgByKind[k] ?? 0)} hasar (savunma %${I.defs[k]})`).join(' · ');
  const md = `# ${a.name} — ${a.archName} (${a.boy}, ${a.final.spec})

**Başlangıç:** Sv${a.seedLevel} · **Bitiş:** Sv${I.level1} (+${f1(I.prog1 - dr[0].prog + (dr[0].prog - a.seedLevel))} seviye) · akçe ${n(I.gold1)} · oynanan ≈${f1(I.hours)} sa · öldürme ${n(I.kills)} · ölüm ${n(I.deaths)} (${f1(I.deathsPerH)}/sa)
**Karar profili:** beceri doğruluğu ${f1(a.par.skill * 100)}% · geri çekilme can %${f1(a.par.retreat * 100)} · hedef kamp ofseti ${a.par.offset >= 0 ? '+' : ''}${a.par.offset} · savunma bilinci ${a.par.defAware ? 'var' : 'yok'} · akıllı silah ${a.par.smartWeapon ? 'evet' : 'hayır'} · artı: güvenli +${a.par.safeUp}, risk +${a.par.riskUp}

## Günlük seyir
${tab(['Gün', 'Sv', 'ilerleme', 'akçe', 'servet', 'öldürme', 'ölüm', 'dk', 'boss', 'çatlak', 'PvP k/ö', 'pazar net', 'artı ✓', 'yok'], dr.map((d: any) => [d.day, d.level, d.prog, n(d.gold), n(d.worth), n(d.kills), d.deaths, d.minutes, d.bossKills, d.riftCloses, `${d.pvpKills}/${d.pvpDeaths}`, n(d.marketNet), d.upgrades, d.destroyed]))}

## Akçe kaynakları ve harcamalar (toplam)
Gelir: ${Object.entries(inc).map(([k, v]) => `${k} ${n(v)}`).join(' · ') || '—'}
Gider: ${Object.entries(exp).map(([k, v]) => `${k} ${n(v)}`).join(' · ') || '—'}

## Etkinlik zamanı (gerçek dilimlerde)
${Object.entries(a.actTicks).map(([k, v]) => `${ACT[k]} %${Math.round(((v as number) / total) * 100)}`).join(' · ')}

## Savunma analizi
Aldığı hasar: ${threat} · oyuncu hasarı ${n(a.dmgByKind.pl ?? 0)} · zehir ${n(a.dmgByKind.dot ?? 0)} · bloklanan vuruş ${n(a.tot.blocked)}
**En çok hasar alınan tür:** ${I.defMain} (hasarın %${Math.round(I.mainShare * 100)}'i) — o türe karşı savunma %${I.defMainPct}${I.defMainPct < 10 && I.mainShare > 0.4 ? ' ⚠ **savunma tehdit türüyle uyuşmuyor**' : ''}
Ölüm nedenleri: ${Object.entries(a.deathBy).map(([k, v]) => `${k}×${v}`).join(', ') || '—'}
Kuşanılan:
- ${eq || 'yok'}

## Pazar
İlan ${a.tot.mktListed} · alış ${a.tot.mktBought} · pazar neti ${n(sum(dr.map((d: any) => d.marketNet)))} akçe

## Memnuniyet / ayrılma riski
Ödül sıklığı ${f1(I.rewardsPerH)}/sa · en uzun durgunluk ${I.stagn} gün · yok olan eşya ${a.tot.destroyed} · en uzun başarısız artı serisi ${a.maxFailStreak}
**Ayrılma riski skoru: ${f1(I.churn)}** ${I.churn >= 4 ? '🔴 yüksek' : I.churn >= 2 ? '🟠 orta' : '🟢 düşük'}${I.reasons.length ? ' — ' + I.reasons.join('; ') : ''}
${a.events.length ? '\n## Olaylar\n- ' + a.events.slice(0, 12).join('\n- ') : ''}
`;
  writeFileSync(`${dir}/${String(i + 1).padStart(3, '0')}-${a.name}.md`, md);
});
writeFileSync(`${dir}/README.md`, `# Karakter raporları\n\nHer satır bir karakterin raporuna gider. Toplu analiz: [../../../POPULASYON_RAPORU.md](../../../POPULASYON_RAPORU.md).\n\n${tab(['#', 'Karakter', 'Arketip', 'Sv (başlangıç→son)', 'akçe', 'ölüm/sa', 'ayrılma riski'], agents.map((a, i) => [i + 1, `[${a.name}](${String(i + 1).padStart(3, '0')}-${a.name}.md)`, a.archName, `${a.seedLevel}→${ins[i].level1}`, n(ins[i].gold1), f1(ins[i].deathsPerH), f1(ins[i].churn)]))}\n`);

// ── toplu özet ──
const byArch: Record<string, number[]> = {}; ins.forEach((x, i) => (byArch[agents[i].archName] ??= []).push(i));
const lvlHist = (day: number) => { const b = [0, 0, 0, 0, 0]; for (const a of agents) { const d = a.days[Math.min(day, a.days.length) - 1]; b[Math.min(4, Math.floor((d.level - 1) / 10))]++; } return b; };
const S: Record<string, any> = {};
S.ARCH = tab(['Arketip', 'Oyuncu', 'Seviye kazancı (gün başı)', 'Ort. ölüm/sa', 'Ort. ödül/sa', 'Yok olan eşya', 'Ort. ayrılma riski', 'Yüksek riskli %'], Object.entries(byArch).map(([name, ix]) => [name, ix.length, f1(avg(ix.map((i) => (ins[i].prog1 - agents[i].days[0].prog) / days))), f1(avg(ix.map((i) => ins[i].deathsPerH))), f1(avg(ix.map((i) => ins[i].rewardsPerH))), sum(ix.map((i) => agents[i].tot.destroyed)), f1(avg(ix.map((i) => ins[i].churn))), Math.round((ix.filter((i) => ins[i].churn >= 4).length / ix.length) * 100)]));
S.LEVELS = tab(['Gün', 'Sv1–10', 'Sv11–20', 'Sv21–30', 'Sv31–40', 'Sv41–50'], [1, Math.ceil(days / 2), days].map((d) => [d, ...lvlHist(d)]));
const E: any[] = D.econ; const avgDay = (k: 'sources' | 'sinks') => { const o: Record<string, number> = {}; for (const e of E) for (const [a, v] of Object.entries(e[k])) o[a] = (o[a] ?? 0) + (v as number) / E.length; return o; };
const src = avgDay('sources'), snk = avgDay('sinks'); const srcT = sum(Object.values(src)), snkT = sum(Object.values(snk));
S.ECON = tab(['Gün', 'Akçe arzı', 'Gini', 'Pazar satış', 'Pazar hacmi', 'Vergi', 'İlan ücreti', 'Satış/değer'], E.map((e) => [e.day, n(e.supply), e.gini, e.mkt.sales, n(e.mkt.volume), n(e.mkt.tax), n(e.mkt.fees), e.mkt.avgRatio]));
S.FLOW = `**Günlük ortalama kaynak:** ${n(srcT)} akçe — ${Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} %${Math.round((v / srcT) * 100)}`).join(', ')}\n\n**Günlük ortalama sink:** ${n(snkT)} akçe — ${Object.entries(snk).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} %${Math.round((v / Math.max(1, snkT)) * 100)}`).join(', ')}\n\n**Sink / kaynak oranı: %${f1((snkT / Math.max(1, srcT)) * 100)}** (100'ün çok altı = enflasyon)`;
const SL: any[] = D.slices; const buckets: Record<string, { n: number; r: number }> = {}; for (const s of SL) for (const [b, v] of Object.entries(s.occBuckets) as [string, any][]) { const x = (buckets[b] ??= { n: 0, r: 0 }); x.n += v.n; x.r += v.rate * v.n; }
S.CROWD = tab(['Kampta eşzamanlı oyuncu', 'Gözlem', 'Öldürme/dk (kişi başı)'], ['1', '2-3', '4-6', '7-10', '11+'].filter((b) => buckets[b]).map((b) => [b, buckets[b].n, f1(buckets[b].r / buckets[b].n)]));
const campShare = () => { const c: Record<number, number> = {}; for (const s of SL) for (const [k, v] of Object.entries(s.campUse)) c[Number(k)] = (c[Number(k)] ?? 0) + (v as number); const t = sum(Object.values(c)); const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `kamp ${k} %${Math.round(((v as number) / t) * 100)}`); const hhi = sum(Object.values(c).map((v) => (v / t) ** 2)); return { top, hhi, used: Object.keys(c).length }; };
const cs = campShare(); S.CAMPS = `Kullanılan kamp sayısı ${cs.used}/42 · en kalabalık 5 kamp: ${cs.top.join(', ')} · yoğunlaşma (HHI) ${cs.hhi.toFixed(3)} (1/42=0,024 tam dağılım)`;
const bf: any[] = D.bossFights; const bs = [1, 2, 3, 4, 5].map((id) => { const x = bf.filter((b) => b.boss === id); return [id, x.length, x.length ? f1(avg(x.map((b) => b.sec))) : '—', x.length ? f1(avg(x.map((b) => b.participants))) : '—', x.length ? f1(avg(x.map((b) => b.deaths))) : '—']; });
S.BOSS = tab(['Boss', 'Öldürme (dilimde)', 'Ort. süre (sn)', 'Ort. katılımcı', 'Ölüm/öldürme'], bs); S.BOSSPLAY = `Boss öldüren oyuncu: ${agents.filter((a) => a.tot.bossKills > 0).length}/${agents.length} (%${Math.round((agents.filter((a) => a.tot.bossKills > 0).length / agents.length) * 100)}); boss avcılarının boss başına dilim öldürmesi ${f1(avg(Object.entries(byArch).filter(([k]) => k === 'Boss avcısı').flatMap(([, ix]) => ix.map((i) => agents[i].tot.bossKills))))}`;
const riftOpen = sum(SL.map((s) => s.riftsOpened)), riftClosed = sum(SL.map((s) => s.riftsClosed)); S.RIFT = `Dilimlerde açılan çatlak ${riftOpen}, kapanan ${riftClosed} (%${riftOpen ? Math.round((riftClosed / riftOpen) * 100) : 0}); kapatan oyuncu ${agents.filter((a) => a.tot.riftCloses > 0).length}/${agents.length}`;
const pv: any[] = D.pvpLog; const gank = pv.filter((p) => p.dl >= 8).length;
S.PVP = `PvP öldürme ${pv.length}; bunun ${gank} tanesi (%${pv.length ? Math.round((gank / pv.length) * 100) : 0}) 8+ seviye altındaki oyuncuya (gank); kırmızı adlı oyuncu ${agents.filter((a) => a.final.rank < 0).length}; PvP'de en az 5 kez öldürülüp hiç öldürmeyen ${agents.filter((a) => a.tot.pvpDeaths >= 5 && a.tot.pvpKills === 0).length}`;
const kindTake: Record<string, number> = {}; const kindDef: Record<string, number[]> = {}; for (const a of agents) for (const k of DMG_KINDS) { kindTake[k] = (kindTake[k] ?? 0) + (a.dmgByKind[k] ?? 0); (kindDef[k] ??= []).push(ins[a.idx].defs[k]); }
const tk = sum(Object.values(kindTake));
S.DEF = tab(['Hasar türü', 'Alınan hasar payı', 'Ortalama savunma %', 'Savunması ≥%15 olan oyuncu %'], DMG_KINDS.map((k) => [k, `%${Math.round((kindTake[k] / Math.max(1, tk)) * 100)}`, f1(avg(kindDef[k])), Math.round((kindDef[k].filter((x) => x >= 15).length / kindDef[k].length) * 100)]));
const aware = ins.filter((_, i) => agents[i].par.defAware), unaware = ins.filter((_, i) => !agents[i].par.defAware);
const mism = ins.filter((x) => x.defMainPct < 10 && x.mainShare > 0.4 && x.hours > 3).length;
S.DEFCMP = tab(['Grup', 'Oyuncu', 'Ölüm/sa', 'Ana tehdit türüne karşı savunma %', 'Bloklanan vuruş'], [['Savunma bilinçli', aware.length, f1(avg(aware.map((x) => x.deathsPerH))), f1(avg(aware.map((x) => x.defMainPct))), n(avg(aware.map((x) => x.blocked)))], ['Bilinçsiz', unaware.length, f1(avg(unaware.map((x) => x.deathsPerH))), f1(avg(unaware.map((x) => x.defMainPct))), n(avg(unaware.map((x) => x.blocked)))]]) + `\n\nAna tehdit türüne karşı savunması %10'un altında olup hasarın %40+'ını o türden alan oyuncu: **${mism}/${agents.length}**`;
const risk = { low: ins.filter((x) => x.churn < 2).length, mid: ins.filter((x) => x.churn >= 2 && x.churn < 4).length, high: ins.filter((x) => x.churn >= 4).length }; const rc: Record<string, number> = {}; for (const x of ins) for (const r of x.reasons) { const k = r.replace(/[0-9.,]+/g, '#'); rc[k] = (rc[k] ?? 0) + 1; }
S.CHURN = `Düşük ${risk.low} · orta ${risk.mid} · **yüksek ${risk.high}** (toplam ${agents.length}).\n\nEn sık nedenler: ${Object.entries(rc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`).join('; ') || '—'}`;
S.PERF = `Ortalama tick+ajan maliyeti ${f1(avg(SL.map((s) => s.tickMs)))} ms (dilimler: ${SL.length}); en yoğun dilim ${f1(Math.max(...SL.map((s) => s.tickMs)))} ms/tick, çevrimiçi ${Math.max(...SL.map((s) => s.online))} oyuncu.`;
S.META = `${D.meta.N} oyuncu · ${D.meta.DAYS} gün · dilim ${D.meta.W} dk (günde 4 dilim) · tohum ${D.meta.SEED} · gerçek süre ${Math.round(D.meta.wallSec / 60)} dk`;
S.MKT2 = (() => { const t = agents.filter((a) => a.arch === 'tuccar'); const prof = t.map((a) => sum(a.days.map((d: any) => d.marketNet))); return `Tüccar/zanaatkâr pazar neti: ortalama ${n(avg(prof))} akçe (en iyi ${n(Math.max(...prof, 0))}); üretilen ${D.stats.crafted} parça, üretim maliyeti ${n(D.stats.craftGold)} akçe; çanta doluluğundan kaybolan ganimet ${n(D.stats.lostBagFull)}.`; })();
writeFileSync(`${OUT}/ozet.json`, JSON.stringify({ S, ins, risk }, null, 1));
console.log(`raporlar yazıldı: ${agents.length} karakter; risk düşük/orta/yüksek = ${risk.low}/${risk.mid}/${risk.high}`);
