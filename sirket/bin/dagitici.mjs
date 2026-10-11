#!/usr/bin/env node
// DAĞITICI: kuyruk → koşu. Karar verir, sonraki takıma iş emri (brief) hazırlar. LLM ÇAĞIRMAZ; tavanları uygular.
//   node sirket/bin/dagitici.mjs ekle --takim denge --baslik "..." --istek "..." [--oncelik 2]
//   node sirket/bin/dagitici.mjs sonraki          # sıradaki işi seçer, calisma/<id>.brief.md yazar
//   node sirket/bin/dagitici.mjs durum            # kuyruk ve tavan özeti
import { arg, bugun, git, gorevler, gorevYaz, kurallar, oku, sayac, sayacYaz, simdi, takimlar, yol, yazJson, jsonl, okuJson } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const [, , komut = 'durum', ...rest] = process.argv;
const GENEL = okuJson(yol('sirket.json'), { gunlukToplamKosu: 8 });

function ekle() {
  const takim = arg(rest, 'takim'); const baslik = arg(rest, 'baslik'); const istek = arg(rest, 'istek', baslik);
  if (!takim || !takimlar().includes(takim)) { console.error(`takım yok: ${takim}. Var olanlar: ${takimlar().join(', ')}`); process.exit(2); }
  if (!baslik) { console.error('--baslik gerekli'); process.exit(2); }
  const n = gorevler().length + 1; const id = `${bugun().replace(/-/g, '')}-${String(n).padStart(3, '0')}`;
  gorevYaz({ id, takim, baslik, istek, oncelik: Number(arg(rest, 'oncelik', 3)), durum: 'bekliyor', deneme: 0, olusturma: simdi(), notlar: [] });
  console.log(id);
}

function bugunToplam() { return jsonl(yol('masa', bugun() + '.jsonl')).length + gorevler().filter((g) => g.sonKosu && g.sonKosu.startsWith(bugun())).length; }

function sonraki() {
  const bekleyen = gorevler().filter((g) => g.durum === 'bekliyor').sort((a, b) => a.oncelik - b.oncelik || a.olusturma.localeCompare(b.olusturma));
  if (!bekleyen.length) { console.log('kuyruk boş'); return; }
  const kosan = gorevler().filter((g) => g.durum === 'kosuyor'); if (kosan.length) { console.log(`önce bitmeli: ${kosan[0].id} (${kosan[0].takim}) hâlâ koşuyor`); process.exit(3); }
  const toplam = gorevler().filter((g) => g.sonKosu && g.sonKosu.startsWith(bugun())).length;
  if (toplam >= GENEL.gunlukToplamKosu) { console.log(`TAVAN: günlük toplam koşu (${GENEL.gunlukToplamKosu}) doldu`); process.exit(4); }
  for (const g of bekleyen) {
    const k = kurallar(g.takim); const d = sayac(g.takim);
    if ((g.deneme ?? 0) >= k.denemeTavani) { g.durum = 'askida'; g.notlar.push(`${simdi()} dağıtıcı: deneme tavanı (${k.denemeTavani}) aşıldı → insana`); gorevYaz(g); continue; }
    if (d.duraklat) { continue; }
    if (d.bugunKosu >= k.gunlukKosu) { continue; }
    g.durum = 'kosuyor'; g.deneme = (g.deneme ?? 0) + 1; g.sonKosu = simdi(); g.taban = git('rev-parse', 'HEAD'); gorevYaz(g);
    d.bugunKosu += 1; d.sonGorev = g.id; sayacYaz(g.takim, d);
    const T = (f) => oku(yol('takimlar', g.takim, f), '(yok)');
    const defter = T('defter.md').split('\n').slice(-30).join('\n');
    const brief = `# İş emri ${g.id} — ${g.baslik}\n\nTakım: **${g.takim}** · deneme ${g.deneme}/${k.denemeTavani} · taban: \`${g.taban || '—'}\`\n\n## Önce oku\n1. sirket/ANAYASA.md (her koşu önce bunu okur)\n2. sirket/takimlar/${g.takim}/takim.md ve kurallar.md\n3. sirket/hafiza/ içindeki ilgili sayfalar ([[bağlantılar]])\n\n## İstek\n${g.istek}\n\n## Sınırlar (bekçi bunları denetler)\n- İzinli yollar: ${k.izinliYollar.join(', ') || '(hepsi)'}\n- Yasaklı yollar: ${k.yasakliYollar.join(', ') || '(yok)'}\n- Kapılar (hepsi geçmeli): ${k.kapilar.map((c) => '`' + c + '`').join(' · ') || '(yok)'}\n\n## Teslim\n\`sirket/calisma/${g.id}.rapor.md\` yaz: \`## Sonuç\` bölümü, değiştirilen dosyalar, sınırlar. Her sayısal iddia \`SAYI: ... KAYNAK: dosya/komut\` biçiminde olmalı (kaynaksız sayı yok).\nSonra: \`node sirket/bin/bekci.mjs ${g.id}\`\n\n## Takım defteri (son notlar)\n${defter}\n\n## Önceki bekçi notları\n${(g.notlar || []).slice(-3).join('\n') || '(yok)'}\n`;
    writeFileSync(yol('calisma', g.id + '.brief.md'), brief);
    console.log(`sirket/calisma/${g.id}.brief.md`); return;
  }
  console.log('sırada iş var ama tavan/duraklatma yüzünden hiçbiri koşamıyor (durum için: dagitici.mjs durum)');
}

function durum() {
  const g = gorevler(); const say = (d) => g.filter((x) => x.durum === d).length;
  console.log(`kuyruk: bekliyor ${say('bekliyor')} · koşuyor ${say('kosuyor')} · kabul ${say('kabul')} · askıda ${say('askida')} · bugün toplam koşu ${g.filter((x) => x.sonKosu?.startsWith(bugun())).length}/${GENEL.gunlukToplamKosu}`);
  for (const t of takimlar()) { const d = sayac(t); const k = kurallar(t); console.log(`  ${t.padEnd(10)} bugün ${d.bugunKosu}/${k.gunlukKosu}${d.duraklat ? ' · DURAKLATILDI' : ''} · bekleyen ${g.filter((x) => x.takim === t && x.durum === 'bekliyor').length}`); }
}
const KOMUT = { ekle, sonraki, durum }; if (!KOMUT[komut]) { console.error('komut: ekle | sonraki | durum'); process.exit(2); } KOMUT[komut]();
