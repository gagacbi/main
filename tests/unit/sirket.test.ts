import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/** Şirket (dağıtıcı + bekçi + masa + hafıza) gerçek betiklerle, geçici bir git projesinde denenir. */
const SIRKET = resolve(__dirname, '../../sirket');
const node = (cwd: string, script: string, ...a: string[]) => spawnSync('node', [join(cwd, 'sirket/bin', script), ...a], { cwd, encoding: 'utf8' });
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
function proje(kapilar: string[] = ['node -e "process.exit(0)"'], extra: Record<string, unknown> = {}) {
  const d = mkdtempSync(join(tmpdir(), 'sirket-')); git(d, 'init', '-q'); git(d, 'config', 'user.email', 't@t'); git(d, 'config', 'user.name', 't');
  const kur = spawnSync('node', [join(SIRKET, 'bin/kur.mjs'), d, 'ta'], { encoding: 'utf8' }); expect(kur.status).toBe(0);
  writeFileSync(join(d, 'sirket/takimlar/ta/kurallar.md'), '```json\n' + JSON.stringify({ izinliYollar: ['src/**'], yasakliYollar: ['src/kilit.txt'], kapilar, gunlukKosu: 2, denemeTavani: 2, ...extra }) + '\n```\n');
  mkdirSync(join(d, 'src')); writeFileSync(join(d, 'src/a.txt'), 'a'); git(d, 'add', '-A'); git(d, 'commit', '-q', '-m', 'ilk'); return d;
}
const ekle = (d: string, baslik = 'iş') => node(d, 'dagitici.mjs', 'ekle', '--takim', 'ta', '--baslik', baslik).stdout.trim();
const rapor = (d: string, id: string, s = '## Sonuç\nBitti. SAYI: 3 test KAYNAK: vitest\n') => writeFileSync(join(d, 'sirket/calisma', id + '.rapor.md'), s);

describe('şirket: dağıtıcı → takım → bekçi → masa', () => {
  test('uçtan uca: iş eklenir, brief üretilir, değişiklik + rapor + geçen kapı → KABUL → masaya düşer → insan onaylar', () => {
    const d = proje(); const id = ekle(d, 'a dosyasını değiştir'); expect(id).toMatch(/^\d{8}-001$/);
    const s = node(d, 'dagitici.mjs', 'sonraki'); expect(s.stdout).toContain(`${id}.brief.md`); const brief = readFileSync(join(d, `sirket/calisma/${id}.brief.md`), 'utf8');
    expect(brief).toContain('ANAYASA.md'); expect(brief).toContain('İzinli yollar: src/**');
    writeFileSync(join(d, 'src/a.txt'), 'b'); rapor(d, id);
    const b = node(d, 'bekci.mjs', id); expect(b.status).toBe(0); expect(b.stdout).toContain('KABUL');
    const masa = readFileSync(join(d, 'sirket/masa', new Date().toISOString().slice(0, 10) + '.jsonl'), 'utf8'); expect(masa).toContain(id);
    expect(node(d, 'masa.mjs').stdout).toContain(`[${id}]`); expect(node(d, 'masa.mjs', 'evet', id).stdout).toContain('ONAY'); expect(node(d, 'masa.mjs').stdout).toContain('onay bekleyen 0');
  });
  test('bekçi reddeder: yasaklı/izin dışı yol, kaynaksız sayı, eksik rapor, geçmeyen kapı; iş kuyruğa döner, deneme tavanında askıya alınır', () => {
    const d = proje(['node -e "process.exit(1)"']); const id = ekle(d); node(d, 'dagitici.mjs', 'sonraki');
    writeFileSync(join(d, 'src/kilit.txt'), 'x'); writeFileSync(join(d, 'dis.txt'), 'y'); rapor(d, id, '## Sonuç\nSAYI: 5 test\n');
    const r = node(d, 'bekci.mjs', id); expect(r.status).toBe(1); expect(r.stdout).toContain('yasaklı yola dokunuldu: src/kilit.txt'); expect(r.stdout).toContain('izin dışı yol: dis.txt'); expect(r.stdout).toContain('KAYNAK yok');
    const g = JSON.parse(readFileSync(join(d, `sirket/kuyruk/${id}.json`), 'utf8')); expect(g.durum).toBe('bekliyor'); expect(g.deneme).toBe(1); expect(g.notlar.join()).toContain('RED');
    node(d, 'dagitici.mjs', 'sonraki'); rapor(d, id); node(d, 'bekci.mjs', id);   // 2. deneme (tavan 2)
    const s3 = node(d, 'dagitici.mjs', 'sonraki'); const g2 = JSON.parse(readFileSync(join(d, `sirket/kuyruk/${id}.json`), 'utf8')); expect(g2.durum).toBe('askida'); expect(s3.stdout).toContain('tavan');
  });
  test('kapı geçmezse (temiz rapor, izinli yol) RED; rapor yoksa RED', () => {
    const d = proje(['node -e "process.exit(1)"']); const id = ekle(d); node(d, 'dagitici.mjs', 'sonraki'); writeFileSync(join(d, 'src/a.txt'), 'c');
    expect(node(d, 'bekci.mjs', id).stdout).toContain('rapor yok'); rapor(d, id); const r = node(d, 'bekci.mjs', id); expect(r.status).toBe(1); expect(r.stdout).toContain('kapı geçmedi');
  });
  test('tavanlar: takım günlük koşu tavanı dolunca sıradaki iş koşmaz; koşan iş varken yenisi başlamaz; duraklatılan takım atlanır', () => {
    const d = proje(); const a = ekle(d, 'bir'); const b = ekle(d, 'iki'); const c = ekle(d, 'üç');
    expect(node(d, 'dagitici.mjs', 'sonraki').stdout).toContain(a); expect(node(d, 'dagitici.mjs', 'sonraki').stdout).toContain('önce bitmeli');
    writeFileSync(join(d, 'src/a.txt'), '1'); rapor(d, a); node(d, 'bekci.mjs', a); expect(node(d, 'dagitici.mjs', 'sonraki').stdout).toContain(b);
    writeFileSync(join(d, 'src/a.txt'), '2'); rapor(d, b); node(d, 'bekci.mjs', b); const s = node(d, 'dagitici.mjs', 'sonraki'); expect(s.stdout).toContain('tavan'); void c;
    const d2 = proje(); ekle(d2); writeFileSync(join(d2, 'sirket/takimlar/ta/durum.json'), JSON.stringify({ duraklat: true, gun: new Date().toISOString().slice(0, 10), bugunKosu: 0 })); expect(node(d2, 'dagitici.mjs', 'sonraki').stdout).toContain('hiçbiri koşamıyor');
  });
  test('masa "hayır" işi kuyruğa geri koyar; olmayan takıma iş eklenmez', () => {
    const d = proje(); const id = ekle(d); node(d, 'dagitici.mjs', 'sonraki'); writeFileSync(join(d, 'src/a.txt'), 'z'); rapor(d, id); node(d, 'bekci.mjs', id);
    node(d, 'masa.mjs', 'hayir', id, 'beğenmedim'); expect(JSON.parse(readFileSync(join(d, `sirket/kuyruk/${id}.json`), 'utf8')).durum).toBe('bekliyor');
    expect(spawnSync('node', [join(d, 'sirket/bin/dagitici.mjs'), 'ekle', '--takim', 'yok', '--baslik', 'x'], { cwd: d, encoding: 'utf8' }).status).toBe(2);
  });
});

describe('şirket: takımlar birbirine mesaj atmaz (mühür)', () => {
  function iki() { const d = proje(); const k = join(d, 'sirket/takimlar'); mkdirSync(join(k, 'tb')); for (const f of ['takim.md', 'kurallar.md', 'durum.json', 'defter.md']) writeFileSync(join(k, 'tb', f), f === 'kurallar.md' ? '```json\n{"kapilar":[]}\n```\n' : f === 'durum.json' ? '{}\n' : '#\n'); return d; }
  const kos = (d: string) => { const id = ekle(d); node(d, 'dagitici.mjs', 'sonraki'); writeFileSync(join(d, 'src/a.txt'), 'x' + Math.random()); rapor(d, id); return id; };
  test('başka takımın dosyasını düzenlemek, kendi kurallarını gevşetmek, anayasayı veya bekçiyi değiştirmek → RED', () => {
    for (const hedef of ['sirket/takimlar/tb/defter.md', 'sirket/takimlar/tb/durum.json', 'sirket/takimlar/ta/kurallar.md', 'sirket/ANAYASA.md', 'sirket/bin/kur.mjs', 'sirket/sirket.json']) {
      const d = iki(); const id = kos(d); writeFileSync(join(d, hedef), readFileSync(join(d, hedef), 'utf8') + '\n# sızma'); const r = node(d, 'bekci.mjs', id);
      expect(r.status, hedef).toBe(1); expect(r.stdout, hedef).toContain('mühür bozuldu'); expect(r.stdout).toContain(hedef);
    }
  });
  test('başka işin kuyruk kaydını silmek veya düzenlemek → RED', () => {
    const d = iki(); const diger = node(d, 'dagitici.mjs', 'ekle', '--takim', 'ta', '--baslik', 'diğer', '--oncelik', '5').stdout.trim(); const id = kos(d); const f = join(d, `sirket/kuyruk/${diger}.json`); writeFileSync(f, readFileSync(f, 'utf8').replace('bekliyor', 'kabul'));
    expect(node(d, 'bekci.mjs', id).stdout).toContain(`kuyruk/${diger}.json`);
  });
  test('izinli iletişim: yeni iş yazmak (devir), hafıza sayfası, kendi çıktıları → KABUL ve devir kaydı izlenir', () => {
    const d = iki(); const id = kos(d); const dev = node(d, 'dagitici.mjs', 'ekle', '--takim', 'tb', '--kimden', id, '--baslik', 'devir').stdout.trim(); writeFileSync(join(d, 'sirket/hafiza/not.md'), '---\ntur: kavram\ndurum: aktif\nguncelleme: 2026-10-12\nkaynak: x\n---\n# not\n');
    const r = node(d, 'bekci.mjs', id); expect(r.status).toBe(0); expect(r.stdout).toContain('KABUL');
    const g = JSON.parse(readFileSync(join(d, `sirket/kuyruk/${dev}.json`), 'utf8')); expect(g.kimden).toBe(id); expect(g.takim).toBe('tb'); expect(g.durum).toBe('bekliyor');
  });
  test('dağıtıcıdan geçmemiş (mührü olmayan) iş kabul edilmez', () => {
    const d = proje(); const id = ekle(d); writeFileSync(join(d, 'src/a.txt'), 'q'); rapor(d, id); const r = node(d, 'bekci.mjs', id); expect(r.status).toBe(1); expect(r.stdout).toContain('mühür yok');
  });
});

describe('şirket: hafıza grafı (bu depodaki gerçek sayfalar)', () => {
  test('kırık bağlantı yok, öksüz sayfa yok; her sayfada frontmatter (tür, durum, güncelleme, kaynak)', () => {
    const r = spawnSync('node', [join(SIRKET, 'bin/hafiza.mjs')], { encoding: 'utf8' }); expect(r.stdout).toContain('kırık bağlantı 0'); expect(r.stdout).toContain('öksüz 0'); expect(r.status).toBe(0);
    const g = JSON.parse(readFileSync(join(SIRKET, 'hafiza/_graf.json'), 'utf8')); expect(g.dugumler.length).toBeGreaterThanOrEqual(10);
    for (const n of g.dugumler) { expect(n.tur).not.toBe('?'); expect(n.durum).not.toBe('?'); expect(n.guncelleme).not.toBe('?'); expect(n.kaynak).not.toBe(''); }
    expect(existsSync(join(SIRKET, 'hafiza/_indeks.md'))).toBe(true); void cpSync;
  });
  test('ANAYASA kilitli ekonomi kararlarını ve yayın düğmesi kuralını içerir', () => {
    const a = readFileSync(join(SIRKET, 'ANAYASA.md'), 'utf8'); for (const s of ['Yayın düğmesi insanda', 'Kaynaksız sayı yok', 'POP_KZ_RATE=0.09', 'kısmen doğrulandı', '+10…+15']) expect(a).toContain(s);
  });
});
