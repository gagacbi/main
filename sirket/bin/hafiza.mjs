#!/usr/bin/env node
// HAFIZA (graf): her sayfa bir düğüm, her [[bağlantı]] bir kenar. Ajan her koşuda buradan okur, buraya yazar.
//   node sirket/bin/hafiza.mjs            # _graf.json + _indeks.md üretir; kırık bağlantı ve öksüz sayfayı raporlar
import { readdirSync, writeFileSync } from 'node:fs';
import { oku, yol } from './lib.mjs';

const sayfalar = readdirSync(yol('hafiza')).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => f.replace(/\.md$/, ''));
const dugumler = []; const kenarlar = []; const kirik = [];
for (const ad of sayfalar) {
  const md = oku(yol('hafiza', ad + '.md'), ''); const fm = {}; const m = /^---\n([\s\S]*?)\n---/.exec(md);
  if (m) for (const l of m[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  const hedefler = [...new Set([...md.matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1].trim()))];
  for (const h of hedefler) { if (sayfalar.includes(h)) kenarlar.push([ad, h]); else kirik.push(`${ad} → [[${h}]]`); }
  dugumler.push({ id: ad, tur: fm.tur ?? '?', durum: fm.durum ?? '?', guncelleme: fm.guncelleme ?? '?', kaynak: fm.kaynak ?? '', derece: 0 });
}
for (const [a, b] of kenarlar) { dugumler.find((d) => d.id === a).derece++; dugumler.find((d) => d.id === b).derece++; }
const oksuz = dugumler.filter((d) => d.derece === 0).map((d) => d.id);
writeFileSync(yol('hafiza', '_graf.json'), JSON.stringify({ dugumler, kenarlar }, null, 2) + '\n');
const tur = (t) => dugumler.filter((d) => d.tur === t).sort((a, b) => b.derece - a.derece).map((d) => `- [[${d.id}]] (bağ ${d.derece}, ${d.durum}, ${d.guncelleme})`).join('\n') || '(yok)';
writeFileSync(yol('hafiza', '_indeks.md'), `# Hafıza dizini (otomatik: hafiza.mjs)\n\nbüyük düğüm = çok bağlantı\n\n## Kararlar\n${tur('karar')}\n\n## Kavramlar\n${tur('kavram')}\n\n## Varlıklar\n${tur('varlik')}\n\n## Projeler\n${tur('proje')}\n`);
console.log(`${dugumler.length} düğüm · ${kenarlar.length} kenar · kırık bağlantı ${kirik.length} · öksüz ${oksuz.length}`);
if (kirik.length) console.log('KIRIK:\n  ' + kirik.join('\n  '));
if (oksuz.length) console.log('ÖKSÜZ: ' + oksuz.join(', '));
process.exit(kirik.length ? 1 : 0);
