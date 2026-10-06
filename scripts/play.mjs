// Tek komutla oyna: kurulum → derleme → yönetici hesabı → sunucu → tarayıcı.
//   npm run play        (ya da OYNA.bat / OYNA.command / oyna.sh'a çift tıkla)
// Ortam: PORT (2567), KUT_DB, PLAY_NO_OPEN=1 (tarayıcı açma), PLAY_REBUILD=1 (derlemeyi zorla)
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const win = process.platform === 'win32';
const npx = win ? 'npx.cmd' : 'npx'; const npm = win ? 'npm.cmd' : 'npm';
const PORT = process.env.PORT ?? '2567'; const URL = `http://localhost:${PORT}`;
const ADMIN = { name: 'Yonetici', pw: 'oyna123' };
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

say('Sunucu başlatılıyor…');
const srv = spawn(npx, ['tsx', 'server/index.ts'], { stdio: 'inherit', shell: win, env: { ...process.env, PORT } });
const stop = () => { try { srv.kill(); } catch { /* */ } process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop); srv.on('exit', (c) => { if (c) die(`Sunucu kapandı (kod ${c}). Port ${PORT} dolu olabilir: PORT=2600 npm run play`); });

const ready = async () => { for (let i = 0; i < 120; i++) { try { const r = await fetch(URL); if (r.ok) return true; } catch { /* henüz değil */ } await new Promise((r) => setTimeout(r, 500)); } return false; };
if (!(await ready())) die('Sunucu 60 sn içinde hazır olmadı.');

console.log(`\n══════════════════════════════════════════════
  KUT hazır → ${URL}
  ${created ? 'Yönetici hesabı oluşturuldu' : 'Yönetici hesabı (var)'}:  ad "${ADMIN.name}"  parola "${ADMIN.pw}"
  (seviye 50 · 100.000 akçe · sohbete /gm help yaz, F2 yönetici paneli)
  Normal oyuncu olarak denemek için "Kayıt ol" ile yeni hesap aç.
  Kapatmak için bu pencerede Ctrl+C.
══════════════════════════════════════════════`);
if (!process.env.PLAY_NO_OPEN) { const o = win ? ['cmd', ['/c', 'start', '', URL]] : process.platform === 'darwin' ? ['open', [URL]] : ['xdg-open', [URL]]; try { spawn(o[0], o[1], { stdio: 'ignore', detached: true }).unref(); } catch { /* tarayıcıyı elle aç */ } }
