// Şirket: ortak yardımcılar. Bağımlılık yok (yalnızca Node ≥ 18); başka projelere olduğu gibi taşınır.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..');          // sirket/
export const PROJE = resolve(KOK, '..');                                              // proje kökü
export const yol = (...p) => join(KOK, ...p);
export const bugun = () => new Date().toISOString().slice(0, 10);
export const simdi = () => new Date().toISOString();
export const oku = (f, d = null) => (existsSync(f) ? readFileSync(f, 'utf8') : d);
export const okuJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return d; } };
export const yazJson = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); };
export const ekle = (f, s) => { mkdirSync(dirname(f), { recursive: true }); appendFileSync(f, s); };
export const jsonl = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
export const jsonlEkle = (f, o) => ekle(f, JSON.stringify(o) + '\n');
export const takimlar = () => (existsSync(yol('takimlar')) ? readdirSync(yol('takimlar'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);
export const gorevler = () => (existsSync(yol('kuyruk')) ? readdirSync(yol('kuyruk')).filter((f) => f.endsWith('.json')).map((f) => okuJson(yol('kuyruk', f))).filter(Boolean) : []);
export const gorevYaz = (g) => yazJson(yol('kuyruk', g.id + '.json'), g);
export const arg = (argv, ad, d = null) => { const i = argv.indexOf('--' + ad); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
export const git = (...a) => { try { return execFileSync('git', a, { cwd: PROJE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

/** kurallar.md içindeki ```json bloğu = makine okunur sınırlar */
export function kurallar(takim) {
  const md = oku(yol('takimlar', takim, 'kurallar.md'), '');
  const m = /```json\s*([\s\S]*?)```/.exec(md); let j = {}; try { j = m ? JSON.parse(m[1]) : {}; } catch { /* */ }
  return { izinliYollar: [], yasakliYollar: [], kapilar: [], gunlukKosu: 3, denemeTavani: 3, ...j };
}
export const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§').replace(/\*/g, '[^/]*').replace(/§/g, '.*') + '$');
export const uyar = (g, p) => (g.endsWith('/') ? p.startsWith(g) : globRe(g).test(p));
export const sayac = (takim) => { const d = okuJson(yol('takimlar', takim, 'durum.json'), {}); if (d.gun !== bugun()) { d.gun = bugun(); d.bugunKosu = 0; } return d; };
export const sayacYaz = (takim, d) => yazJson(yol('takimlar', takim, 'durum.json'), d);
export const KUYRUK_DURUM = ['bekliyor', 'kosuyor', 'kabul', 'askida'];

/**
 * MÜHÜR: takımlar birbirine mesaj atmaz, yalnızca dosya yazar. Koşu başında korunan dosyaların özeti alınır; bekçi koşu sonunda karşılaştırır.
 * Korunan: anayasa, sirket.json, bin/, tüm takımların takim.md + kurallar.md (kendi sınırını gevşetemez), diğer takımların her dosyası,
 * kendi durum.json'u (dağıtıcı yazdıktan sonra), masa/, başka işlerin kuyruk ve çalışma dosyaları. Serbest: kendi calisma/<id>.* dosyaları, hafiza/, yeni kuyruk dosyaları (devir), kendi defter.md'si.
 */
const hashle = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
function tara(dir, out = []) { if (!existsSync(dir)) return out; for (const e of readdirSync(dir, { withFileTypes: true })) { const f = join(dir, e.name); if (e.isDirectory()) tara(f, out); else out.push(f); } return out; }
export function korunanlar(takim, id) {
  const rel = (f) => f.slice(KOK.length + 1).replace(/\\/g, '/'); const hepsi = tara(KOK).map(rel).filter((f) => !f.startsWith('hafiza/') && !f.endsWith('.gitkeep'));
  return hepsi.filter((f) => {
    if (f.startsWith(`calisma/${id}.`)) return false;                                 // kendi çıktıları serbest
    if (f === `takimlar/${takim}/defter.md`) return false;                             // kendi defteri
    if (f === `kuyruk/${id}.json`) return false;                                       // kendi iş kaydı (dağıtıcı/bekçi yönetir)
    return true;
  });
}
export const muhurAl = (takim, id) => Object.fromEntries(korunanlar(takim, id).map((f) => [f, hashle(join(KOK, f))]));
export const muhurFarki = (eski) => {
  const sorun = []; for (const [f, h] of Object.entries(eski)) { const yol_ = join(KOK, f); if (!existsSync(yol_)) sorun.push(`silindi: sirket/${f}`); else if (hashle(yol_) !== h) sorun.push(`değişti: sirket/${f}`); } return sorun;
};
