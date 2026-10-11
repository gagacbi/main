#!/usr/bin/env node
// KUR: bu şirketi başka bir projeye kopyalar (bin/, anayasa şablonu, boş kuyruk; takımlar sonra eklenir).
//   node sirket/bin/kur.mjs <hedef-proje-klasörü> [takım1 takım2 ...]
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { KOK } from './lib.mjs';

const [, , hedef, ...takimlar] = process.argv; if (!hedef) { console.error('kullanım: kur.mjs <hedef> [takım ...]'); process.exit(2); }
const H = join(resolve(hedef), 'sirket'); if (existsSync(H)) { console.error('hedefte sirket/ zaten var: ' + H); process.exit(3); }
mkdirSync(join(H, 'bin'), { recursive: true }); cpSync(join(KOK, 'bin'), join(H, 'bin'), { recursive: true });
for (const d of ['kuyruk', 'calisma', 'masa', 'hafiza']) { mkdirSync(join(H, d), { recursive: true }); writeFileSync(join(H, d, '.gitkeep'), ''); }
writeFileSync(join(H, 'sirket.json'), JSON.stringify({ gunlukToplamKosu: 8 }, null, 2) + '\n');
writeFileSync(join(H, 'ANAYASA.md'), readFileSync(join(KOK, 'ANAYASA.md'), 'utf8').replace(/^# .*\n/, '# ANAYASA (şablon: kendi projene göre düzenle)\n'));
for (const t of takimlar.length ? takimlar : ['genel']) {
  const D = join(H, 'takimlar', t); mkdirSync(D, { recursive: true });
  writeFileSync(join(D, 'takim.md'), `# Takım: ${t}\n\nGörev: (bu takım neden var, neye dokunur, neye dokunmaz)\n`);
  writeFileSync(join(D, 'kurallar.md'), `# ${t} — kurallar\n\n\`\`\`json\n${JSON.stringify({ izinliYollar: [], yasakliYollar: [], kapilar: ['npm test'], gunlukKosu: 3, denemeTavani: 3 }, null, 2)}\n\`\`\`\n`);
  writeFileSync(join(D, 'durum.json'), '{}\n'); writeFileSync(join(D, 'defter.md'), `# ${t} defteri\n`);
}
console.log('kuruldu: ' + H + '\nsonraki: node sirket/bin/dagitici.mjs ekle --takim <ad> --baslik "..."');
