/**
 * Ekran görüntüsü aracı: giriş yapar, oyuncuyu verilen noktaya taşır, kamerayı ayarlar, görüntü alır.
 *   SHOTS="ad:x:z:yaw:pitch:dist,..." OUT=/tmp npx tsx tests/perf/shot.ts      (önce npm run build)
 */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/shot-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const world = () => [...srv.ctx.worlds][0]; const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'tr-TR' })).newPage(); page.setDefaultTimeout(150000);
await page.addInitScript(() => { try { localStorage.setItem('kut.q', 'high'); } catch { /* */ } });
const NAME = 'Foto' + Math.floor(Math.random() * 900 + 100);
await page.goto(url + '?autoq=0'); await page.waitForSelector('.title .tcard'); await sleep(1500);
await page.click('#sw'); await sleep(400); await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234'); await page.click('.boycard[data-b="ay"]'); await sleep(400);
await page.click('#go'); await page.waitForFunction('window.__ready === true'); await sleep(2500);
await page.evaluate(() => { const c = (window as any).__game.gs.camera; c.upperRadiusLimit = 900; c.upperBetaLimit = 1.56; });
const me = () => [...world().players.values()].find((p) => p.name === NAME)!; me().god = true;
for (const spec of (process.env.SHOTS ?? 'a:0:20:-1.57:1.0:24').split(',')) {
  const [name, x, z, yaw, pitch, dist] = spec.split(':'); const p = me(); p.x = Number(x); p.z = Number(z); p.meDirty = true; await sleep(1500);
  await page.evaluate(([y, pi, d]) => { const g = (window as any).__game; g.camYaw = Number(y); g.camPitch = Number(pi); g.camDist = Number(d); }, [yaw, pitch, dist]); await sleep(2800);
  if (process.env.EVAL) { const r = await page.evaluate(process.env.EVAL as string); console.log(JSON.stringify(r)); await sleep(1500); }
  await page.screenshot({ path: `${process.env.OUT ?? '/tmp'}/${name}.png` }); console.log('shot', name);
}
await browser.close(); process.exit(0);
