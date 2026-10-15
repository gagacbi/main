/** Sahne çizim maliyeti mikro ölçümü (SwiftShader, yazılım): giriş yap, 30 kez scene.render() ortalaması. Önce npm run build. */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/fc-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'tr-TR' })).newPage(); page.setDefaultTimeout(240000);
await page.addInitScript(() => { try { localStorage.setItem('kut.q', 'high'); } catch { /* */ } });
const NAME = 'Frame' + Math.floor(Math.random() * 900 + 100);
await page.goto(url + '?autoq=0'); await page.waitForSelector('.title .tcard'); await sleep(1500);
await page.click('#sw'); await sleep(400); await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234'); await page.click('.boycard[data-b="ay"]'); await sleep(400);
await page.click('#go'); await page.waitForFunction('window.__ready === true'); await sleep(4000);
const r = await page.evaluate(() => { const g = (window as any).__game; const sc = g.gs.scene; const t0 = performance.now(); for (let i = 0; i < 30; i++) sc.render(); return { renderMs: (performance.now() - t0) / 30, meshes: sc.meshes.length, active: sc.getActiveMeshes().length, tris: sc.getActiveIndices() / 3 }; });
console.log(JSON.stringify(r)); await browser.close(); await srv.close(); process.exit(0);
