/**
 * Ekonomi raporu: herhangi bir oyun veritabanının (SQLite) `ledger` + `players` tablolarından
 * kaynak/sink dökümü, bakiye dilimlerine göre birikim, Kımız/+n/Tılsım stokları. Yayındaki veriye
 * (veya simülasyon veritabanına) doğrudan uygulanır; simülasyon varsayımı içermez.
 *   npx tsx scripts/economy-report.ts <db.sqlite> [gün=30]
 * Not: oyuncu-saat için oyun içi süre kaydı yoktur; yalnızca oyuncu-gün (ledger'da en az 1 kaydı olan gün) kullanılır.
 */
import { DatabaseSync } from 'node:sqlite';
const path = process.argv[2]; const days = Number(process.argv[3] ?? 30);
if (!path) { console.error('kullanım: economy-report.ts <db.sqlite> [gün]'); process.exit(1); }
const db = new DatabaseSync(path, { readOnly: true });
const SRC: Record<string, [string, (x: any) => number]> = { 'mob.gold': ['yaratık', (x) => x.gold], sell: ['NPC satış', (x) => x.price], clue: ['gizem', (x) => x.gold], milestone: ['kilometre taşı', (x) => x.gold], 'exp.collect': ['sefer', (x) => x.gold], 'market.sale': ['pazar satış (net)', (x) => x.proceeds], tutorial: ['öğretici', (x) => x.gold ?? 0] };
const SNK: Record<string, (x: any) => [string, number]> = {
  upgrade: (x) => [x.target > 9 ? 'artı +10…+15' : 'artı basma', x.gold], reroll: (x) => ['efsun yenileme', x.gold], craft: (x) => ['üretim', x.gold ?? 0], 'skill.rank': (x) => ['beceri', x.gold ?? 0], 'oba.build': (x) => ['oba', x.gold ?? 0],
  'kimiz.buy': (x) => ['kımız', x.gold], 'dungeon.fee': (x) => ['zindan ücreti', x.fee], 'cos.loom': (x) => ['kostüm: tezgâh', x.gold], 'cos.craft': (x) => ['kostüm: üretim', x.gold], 'cos.ench': (x) => ['kostüm: efsun', x.gold], 'cos.look': (x) => ['kostüm: görünüm', x.gold], 'cos.extend': (x) => ['kostüm: uzatma', x.gold], 'cos.shop': (x) => ['kostüm: şans eşyası', x.gold],
  'market.list': (x) => ['pazar ilan ücreti', x.fee], 'market.sale': (x) => ['pazar vergisi', x.tax] };
const tsMax = (db.prepare('SELECT MAX(ts) m FROM ledger').get() as any).m as number; const from = tsMax - days * 86400000;
const rows = db.prepare('SELECT ts, player_id, kind, detail FROM ledger WHERE ts >= ?').all(from) as any[];
const src: Record<string, number> = {}, snk: Record<string, number> = {}; const per = new Map<number, { inc: number; exp: number; days: Set<number> }>();
for (const r of rows) { let x: any; try { x = JSON.parse(r.detail); } catch { continue; } const pid = r.player_id as number; if (pid == null) continue; const p = per.get(pid) ?? { inc: 0, exp: 0, days: new Set<number>() }; per.set(pid, p); p.days.add(Math.floor(r.ts / 86400000));
  const s = SRC[r.kind]; if (s) { const v = s[1](x) || 0; src[s[0]] = (src[s[0]] ?? 0) + v; p.inc += v; } const k = SNK[r.kind]; if (k) { const [n, v] = k(x); snk[n] = (snk[n] ?? 0) + (v || 0); p.exp += v || 0; } }
const pdays = [...per.values()].reduce((s, p) => s + p.days.size, 0) || 1; const tS = Object.values(src).reduce((a, b) => a + b, 0) || 1; const tK = Object.values(snk).reduce((a, b) => a + b, 0);
const f0 = (n: number) => Math.round(n).toLocaleString('tr-TR'); const P = (n: number) => `%${(n * 100).toFixed(1)}`;
console.log(`# Ekonomi raporu — ${path}\n\nPencere: son ${days} gün · ${per.size} oyuncu · ${f0(pdays)} oyuncu-gün\n`);
console.log('## Kaynak / sink (oyuncu-gün başına)\n\n| Kalem | Tür | Akçe/oyuncu-gün | Pay |\n|---|---|---|---|');
for (const [k, v] of Object.entries(src).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | kaynak | ${f0(v / pdays)} | ${P(v / tS)} |`);
for (const [k, v] of Object.entries(snk).sort((a, b) => b[1] - a[1])) console.log(`| ${k} | sink | ${f0(v / pdays)} | ${P(v / (tK || 1))} |`);
console.log(`\n**Sink/kaynak ${P(tK / tS)}** · net ${f0((tS - tK) / pdays)} akçe/oyuncu-gün\n`);
const pl = (db.prepare('SELECT id, data FROM players').all() as any[]).map((r) => { try { return { id: r.id as number, d: JSON.parse(r.data) }; } catch { return null; } }).filter(Boolean) as { id: number; d: any }[];
const bal = pl.map((p) => ({ id: p.id, g: p.d.gold as number })).sort((a, b) => a.g - b.g); const n = bal.length || 1;
console.log('## Bakiye dilimleri (birikim: kim biriktiriyor?)\n\n| Dilim | Ort. bakiye | Gelir/gün | Gider/gün | Gider/gelir | Net payı |\n|---|---|---|---|---|---|');
const totNet = [...per.values()].reduce((s, p) => s + p.inc - p.exp, 0) || 1;
for (const [name, lo, hi] of [['alt %50', 0, 0.5], ['%50–80', 0.5, 0.8], ['%80–90', 0.8, 0.9], ['üst %10', 0.9, 1]] as [string, number, number][]) { const g = bal.slice(Math.floor(lo * n), Math.ceil(hi * n)); let inc = 0, exp = 0, d = 0, net = 0; for (const b of g) { const p = per.get(b.id); if (!p) continue; inc += p.inc; exp += p.exp; d += p.days.size; net += p.inc - p.exp; } console.log(`| ${name} | ${f0(g.reduce((s, b) => s + b.g, 0) / (g.length || 1))} | ${f0(inc / (d || 1))} | ${f0(exp / (d || 1))} | ${P(exp / (inc || 1))} | ${P(net / totNet)} |`); }
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
console.log(`\n## Koruma eşyası ve artı dağılımı\n\n- Tılsım stoku medyan ${f0(med(pl.map((p) => p.d.bag?.charm ?? 0)))} · kitap ${f0(med(pl.map((p) => p.d.bag?.book ?? 0)))} · Kımız ${f0(med(pl.map((p) => p.d.kimiz ?? 0)))}`);
const ups: Record<number, number> = {}; for (const p of pl) for (const it of Object.values(p.d.equip ?? {}) as any[]) ups[it.up] = (ups[it.up] ?? 0) + 1; console.log(`- Giyili eşya +n dağılımı: ${Object.entries(ups).sort((a, b) => +a[0] - +b[0]).map(([u, c]) => `+${u}:${c}`).join(' ')}`);
{ const t = pl.map((p) => p.d.tel).filter(Boolean) as { onlineSec: number; combatSec: number; kimizUsed: number }[]; const cs = t.reduce((a, x) => a + x.combatSec, 0), ku = t.reduce((a, x) => a + x.kimizUsed, 0), os = t.reduce((a, x) => a + x.onlineSec, 0); console.log(`- Telemetri (${t.length} oyuncu): çevrimiçi ${(os / 3600).toFixed(1)} sa · savaş ${(cs / 60).toFixed(0)} dk (%${os ? ((cs / os) * 100).toFixed(0) : 0}) · Kımız ${ku} adet → **${cs ? (ku / (cs / 60)).toFixed(3) : '—'} Kımız/savaş-dk** (simülasyon varsayımı 0,09), ${os ? (ku / (os / 3600)).toFixed(2) : '—'} /oyuncu-saat`); }
const tr = (db.prepare("SELECT COUNT(*) c FROM ledger WHERE kind='upgrade' AND ts >= ?").get(from) as any).c; console.log(`- Yükseltme denemesi (pencere): ${tr}; yok olan eşya: ${(db.prepare("SELECT COUNT(*) c FROM ledger WHERE kind='upgrade' AND ts >= ? AND detail LIKE '%\"destroyed\":true%'").get(from) as any).c}`);
const mk = db.prepare("SELECT COUNT(*) c FROM ledger WHERE kind='market.sale' AND ts >= ?").get(from) as any; console.log(`- Pazar satışı (pencere): ${mk.c} (${(mk.c / days / n).toFixed(2)} / oyuncu-gün)`);
