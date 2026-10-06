// Tek komutla oyna: kurulum → derleme → yönetici hesabı → sunucu → tarayıcı.
//   npm run play        (ya da OYNA.bat / OYNA.command / oyna.sh'a çift tıkla)
//   npm run play:share  → aynı + arkadaşların için genel adres (Cloudflare Tunnel, ücretsiz, hesap gerekmez)
// Ortam: PORT (2567), KUT_DB, PLAY_NO_OPEN=1 (tarayıcı açma), PLAY_REBUILD=1 (derlemeyi zorla), PLAY_SHARE=1 (= --share)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const win = process.platform === 'win32';
const npx = win ? 'npx.cmd' : 'npx'; const npm = win ? 'npm.cmd' : 'npm';
const PORT = process.env.PORT ?? '2567'; const URL = `http://localhost:${PORT}`;
const SHARE = process.argv.includes('--share') || !!process.env.PLAY_SHARE;
// Yönetici parolası sabit/bilinen DEĞİL: ilk çalıştırmada rastgele üretilir, yalnızca bu bilgisayarda .data/yonetici-parola.txt dosyasında durur.
mkdirSync('.data', { recursive: true }); const PWF = '.data/yonetici-parola.txt';
if (!existsSync(PWF)) writeFileSync(PWF, randomBytes(8).toString('base64url'));
const ADMIN = { name: 'Yonetici', pw: readFileSync(PWF, 'utf8').trim() };
const say = (s) => console.log(`\n▶ ${s}`);
const die = (s) => { console.error(`\n✖ ${s}`); process.exit(1); };

const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 5)) die(`Node 22.5 veya üstü gerekli (sende ${process.versions.node}). https://nodejs.org adresinden indir.`);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: win, ...opts });
const newest = (dir) => { let t = 0; for (const e of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, e.name); t = Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs); } return t; };

if (!existsSync('node_modules')) { say('Bağımlılıklar kuruluyor (ilk seferde birkaç dakika sürer)…'); if (run(npm, ['install']).status !== 0) die('npm install başarısız.'); }
const built = existsSync('dist/index.html');
const stale = built && ['client', 'shared'].some((d) => existsSync(d) && newest(d) > statSync('dist/index.html').mtimeMs);
if (!built || stale || process.env.PLAY_REBUILD) { say('İstemci derleniyor…'); if (run(npx, ['vite', 'build']).status !== 0) die('Derleme başarısız.'); }

say('Yönetici hesabı hazırlanıyor…');
const adm = spawnSync(npx, ['tsx', 'scripts/admin.ts', 'create', ADMIN.name, ADMIN.pw], { encoding: 'utf8', shell: win });
const created = adm.status === 0;
spawnSync(npx, ['tsx', 'scripts/admin.ts', 'passwd', ADMIN.name, ADMIN.pw], { encoding: 'utf8', shell: win });   // eski sürümlerdeki bilinen parolayı da değiştirir

say('Sunucu başlatılıyor…');
const srv = spawn(npx, ['tsx', 'server/index.ts'], { stdio: 'inherit', shell: win, env: { ...process.env, PORT } });
const stop = () => { try { srv.kill(); } catch { /* */ } process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop); srv.on('exit', (c) => { if (c) die(`Sunucu kapandı (kod ${c}). Port ${PORT} dolu olabilir: PORT=2600 npm run play`); });

const ready = async () => { for (let i = 0; i < 120; i++) { try { const r = await fetch(URL); if (r.ok) return true; } catch { /* henüz değil */ } await new Promise((r) => setTimeout(r, 500)); } return false; };
if (!(await ready())) die('Sunucu 60 sn içinde hazır olmadı.');

const lan = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;   // aynı Wi-Fi/ağdaki arkadaşlar için
let shareUrl = '';
if (SHARE) {
  say('Genel adres açılıyor (Cloudflare Tunnel, ücretsiz)…');
  try {
    const req = createRequire(import.meta.url);
    try { req.resolve('cloudflared'); } catch { if (run(npm, ['install', '--no-save', '--no-audit', '--no-fund', 'cloudflared']).status !== 0) throw new Error('cloudflared paketi kurulamadı'); }
    const cf = req('cloudflared'); if (!existsSync(cf.bin)) { say('cloudflared indiriliyor (bir kez)…'); await cf.install(cf.bin); }
    const t = cf.Tunnel.quick(URL);
    shareUrl = await new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('60 sn içinde adres alınamadı')), 60000); t.once('url', (u) => { clearTimeout(to); res(u); }); t.once('error', (e) => { clearTimeout(to); rej(e); }); t.once('exit', (c) => { clearTimeout(to); rej(new Error('cloudflared kapandı (kod ' + c + ')')); }); });
    process.on('exit', () => { try { t.stop(); } catch { /* */ } });
  } catch (e) { console.error(`\n✖ Genel adres açılamadı: ${e.message}\n  Elle denemek için: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ → cloudflared kur, sonra: cloudflared tunnel --url ${URL}`); }
}
console.log(`\n══════════════════════════════════════════════
  KUT hazır → ${URL}${lan ? `\n  Aynı ağdakiler (Wi-Fi/LAN) → http://${lan}:${PORT}` : ''}
  ${shareUrl ? `ARKADAŞLARA VER → ${shareUrl}   (adres her çalıştırmada değişir)\n  ` : ''}Yönetici hesabı:  ad "${ADMIN.name}"  parola "${ADMIN.pw}"   (yalnız sen bil; dosya: ${PWF})
  (seviye 50 · 100.000 akçe · sohbete /gm help yaz, F2 yönetici paneli)
  Normal oyuncu olarak denemek için "Kayıt ol" ile yeni hesap aç.${shareUrl ? '\n  Bilgisayarın ve bu pencere açık kaldıkça oynanır. Kapatmak için Ctrl+C.' : '\n  Kapatmak için bu pencerede Ctrl+C.'}
══════════════════════════════════════════════`);
if (!process.env.PLAY_NO_OPEN) { const o = win ? ['cmd', ['/c', 'start', '', URL]] : process.platform === 'darwin' ? ['open', [URL]] : ['xdg-open', [URL]]; try { spawn(o[0], o[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* tarayıcıyı elle aç */ } }
