// Şirket: ortak yardımcılar. Bağımlılık yok (yalnızca Node ≥ 18); başka projelere olduğu gibi taşınır.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
