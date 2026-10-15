#!/usr/bin/env node
// MASA: sabah tek liste. Yayın düğmesi insanda: her kabul edilen koşu için evet / hayır.
//   node sirket/bin/masa.mjs              # bekleyen onaylar
//   node sirket/bin/masa.mjs evet <id>    # onayla     hayir <id> "neden"   # geri çevir (iş kuyruğa döner)
import { bugun, gorevler, gorevYaz, jsonl, simdi, yol, okuJson, yazJson } from './lib.mjs';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const [, , komut, id, ...neden] = process.argv;
const dosyalar = existsSync(yol('masa')) ? readdirSync(yol('masa')).filter((f) => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f)) : [];
const hepsi = dosyalar.flatMap((f) => jsonl(yol('masa', f)).map((r) => ({ ...r, _f: f })));
if (komut === 'evet' || komut === 'hayir') {
  const r = hepsi.find((x) => x.id === id); if (!r) { console.error('masada yok: ' + id); process.exit(2); }
  const yeni = jsonl(yol('masa', r._f)).map((x) => (x.id === id ? { ...x, onay: komut === 'evet', onayTs: simdi(), neden: neden.join(' ') || undefined } : x));
  writeFileSync(yol('masa', r._f), yeni.map((x) => JSON.stringify(x)).join('\n') + '\n');
  if (komut === 'hayir') { const g = gorevler().find((x) => x.id === id); if (g) { g.durum = 'bekliyor'; g.notlar.push(`${simdi()} insan: HAYIR — ${neden.join(' ')}`); gorevYaz(g); } }
  console.log(`${komut === 'evet' ? 'ONAY' : 'RED'} ${id}`); process.exit(0);
}
const bekleyen = hepsi.filter((r) => r.onay === null || r.onay === undefined);
console.log(`MASA — ${bugun()} · onay bekleyen ${bekleyen.length}`);
for (const r of bekleyen) console.log(`  [${r.id}] ${r.takim}: ${r.baslik}  (${r.degisen} dosya · kapılar ${r.kapilar?.filter((k) => k.ok).length}/${r.kapilar?.length})  → masa.mjs evet|hayir ${r.id}`);
