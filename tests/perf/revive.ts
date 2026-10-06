/**
 * Regresyon: ölüp yeniden doğan oyuncunun karakteri görünür kalmalı (önceden görünüm ölümden ~1 sn sonra silinip geri kurulmuyordu).
 *   npx tsx tests/perf/revive.ts   (önce npm run build)
 */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/revive-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const world = () => [...srv.ctx.worlds][0]; const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1024, height: 600 }, locale: 'tr-TR' })).newPage(); page.setDefaultTimeout(150000);
const NAME = 'Dirilis' + Math.floor(Math.random() * 900 + 100);
await page.goto(url + '?autoq=0'); await page.waitForSelector('.title .tcard'); await sleep(1500);
await page.click('#sw'); await sleep(400); await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234'); await page.click('.boycard[data-b="ay"]'); await sleep(400);
await page.click('#go'); await page.waitForFunction('window.__ready === true'); await sleep(2500);
const me = () => [...world().players.values()].find((p) => p.name === NAME)!;
const state = () => page.evaluate(() => { const g = (window as any).__game; const v = g.selfView; return { inViews: g.vs.views.has(g.myId) && g.vs.views.get(g.myId) === v, dyingT: v.dyingT, rootOn: v.rig.root.isEnabled(), meshesOn: v.rig.meshes.filter((m: any) => m.isEnabled()).length, rotZ: v.rig.root.rotation.z, dead: (g.flags & 1) !== 0 }; });
const before = await state();
const w = world(); const p = me(); w.killPlayer(p, null as never); await sleep(2500);
const dead = await state();
p.deadUntil = w.now - 1; w.respawn(p); await sleep(2500);
const after = await state();
console.log('önce ', JSON.stringify(before)); console.log('ölü  ', JSON.stringify(dead)); console.log('sonra', JSON.stringify(after));
const ok = after.inViews && after.dyingT < 0 && after.rootOn && after.meshesOn > 3 && Math.abs(after.rotZ) < 0.01;
console.log(ok ? 'PASS yeniden doğan karakter görünür' : 'FAIL karakter görünmez/silinmiş'); await browser.close(); process.exit(ok ? 0 : 1);
