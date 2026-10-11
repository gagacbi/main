#!/usr/bin/env node
// BEKÇİ: her koşuyu denetler. kabul → masa · red → kuyruk (deneme+1, gerekçe notla). İnsan yerine kapıları ve sınırları uygular.
//   node sirket/bin/bekci.mjs <iş-id>
import { execSync } from 'node:child_process';
import { muhurFarki, okuJson, git, gorevler, gorevYaz, jsonlEkle, kurallar, oku, simdi, uyar, yol, bugun, ekle, PROJE } from './lib.mjs';

const id = process.argv[2]; const g = gorevler().find((x) => x.id === id);
if (!g) { console.error('iş yok: ' + id); process.exit(2); }
const k = kurallar(g.takim); const sorunlar = []; const kanit = {};

// 1) değişen dosyalar (taban sürümden bu yana + çalışma ağacı); sirket/ kendisi sayılmaz
const adlar = new Set();
if (g.taban) for (const f of git('diff', '--name-only', g.taban + '..HEAD').split('\n')) if (f) adlar.add(f);
for (const f of git('status', '--porcelain', '-uall').split('\n')) { const m = /^.{2}\s+(?:.* -> )?(.+)$/.exec(f); if (m) adlar.add(m[1].replace(/^"|"$/g, '')); }
const degisen = [...adlar].filter((f) => !f.startsWith('sirket/') && !f.startsWith('docs/evidence/')); kanit.degisen = degisen;
for (const f of degisen) {
  if (k.yasakliYollar.some((p) => uyar(p, f))) sorunlar.push(`yasaklı yola dokunuldu: ${f}`);
  else if (k.izinliYollar.length && !k.izinliYollar.some((p) => uyar(p, f))) sorunlar.push(`izin dışı yol: ${f}`);
}
if (!degisen.length && !g.salt_okunur) sorunlar.push('hiçbir dosya değişmemiş (salt-okunur iş değilse boş koşu kabul edilmez)');

// 1b) MÜHÜR: takımlar birbirine mesaj atmaz, dosya yazar. Korunan dosyalar (anayasa, bin, kurallar, başka takım, masa, başka işler) değişmemiş olmalı
const muhur = okuJson(yol('calisma', id + '.muhur.json'));
if (!muhur) sorunlar.push('mühür yok: iş dağıtıcıdan geçmemiş (sirket/calisma/' + id + '.muhur.json)');
else for (const f of muhurFarki(muhur)) sorunlar.push(`mühür bozuldu (${f}) — takımlar yalnızca kendi çıktısını, hafiza/ ve yeni kuyruk işi (devir) yazar`);
kanit.devirler = gorevler().filter((x) => x.kimden === id).map((x) => x.id);

// 2) rapor ve "kaynaksız sayı yok"
const rapor = oku(yol('calisma', id + '.rapor.md'));
if (!rapor) sorunlar.push(`rapor yok: sirket/calisma/${id}.rapor.md`);
else {
  if (!/^## Sonuç/m.test(rapor)) sorunlar.push('raporda "## Sonuç" bölümü yok');
  for (const [i, l] of rapor.split('\n').entries()) if (/SAYI:/.test(l) && !/KAYNAK:/.test(l)) sorunlar.push(`rapor satır ${i + 1}: SAYI var, KAYNAK yok`);
}

// 3) kapılar: komutlar çıkış kodu 0 vermeli
kanit.kapilar = [];
if (!sorunlar.length || process.env.BEKCI_HEPSI) for (const c of k.kapilar) {
  const t0 = Date.now();
  try { execSync(c, { cwd: PROJE, stdio: 'ignore', timeout: (k.kapiZamanasimi ?? 900) * 1000, env: { ...process.env, CI: '1' } }); kanit.kapilar.push({ c, ok: true, sn: Math.round((Date.now() - t0) / 1000) }); }
  catch { kanit.kapilar.push({ c, ok: false, sn: Math.round((Date.now() - t0) / 1000) }); sorunlar.push(`kapı geçmedi: ${c}`); break; }
}

const kabul = sorunlar.length === 0;
if (kabul) {
  g.durum = 'kabul'; g.notlar.push(`${simdi()} bekçi: KABUL`); gorevYaz(g);
  jsonlEkle(yol('masa', bugun() + '.jsonl'), { id, takim: g.takim, baslik: g.baslik, ts: simdi(), kapilar: kanit.kapilar, degisen: degisen.length, onay: null });
  ekle(yol('takimlar', g.takim, 'defter.md'), `\n- ${bugun()} · ${id} · ${g.baslik} → kabul (${degisen.length} dosya, kapılar: ${kanit.kapilar.length})\n`);
  console.log(`KABUL ${id} → masa/${bugun()}.jsonl`);
} else {
  g.durum = 'bekliyor'; g.notlar.push(`${simdi()} bekçi: RED — ${sorunlar.join(' | ')}`); gorevYaz(g);
  jsonlEkle(yol('masa', 'red.jsonl'), { id, takim: g.takim, ts: simdi(), sorunlar });
  console.log(`RED ${id} (deneme ${g.deneme}):\n- ${sorunlar.join('\n- ')}`); process.exit(1);
}
