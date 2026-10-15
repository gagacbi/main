/**
 * Kuşanılan eşyaların karakter üzerindeki görünümü: farklı silah türü/bant/kademe ile yakın plan görüntüler.
 *   OUT=/tmp npx tsx tests/perf/gear-shot.ts      (önce npm run build)
 */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
import type { Item } from '../../shared/game';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/gear-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const world = () => [...srv.ctx.worlds][0]; const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 700 }, locale: 'tr-TR' })).newPage(); page.setDefaultTimeout(150000);
await page.addInitScript(() => { try { localStorage.setItem('kut.q', 'high'); } catch { /* */ } });
const NAME = 'Gear' + Math.floor(Math.random() * 900 + 100);
await page.goto(url + '?autoq=0&pitch=' + (process.env.PITCH ?? '1.15') + '&yaw=' + (process.env.YAW ?? '1.57') + '&dist=' + (process.env.DIST ?? '8')); await page.waitForSelector('.title .tcard'); await sleep(1500);
await page.click('#sw'); await sleep(400); await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234'); await page.click('.boycard[data-b="gok"]'); await sleep(400);
await page.click('#go'); await page.waitForFunction('window.__ready === true'); await sleep(2500);
const me = () => [...world().players.values()].find((p) => p.name === NAME)!; me().god = true;
const mk = (slot: Item['slot'], band: number, tier: Item['tier'], wk?: Item['wk']): Item => ({ id: 'g' + Math.random(), slot, band, ilvl: band * 7 + 3, tier, up: 0, ench: [], lvlReq: 1, wk });
const SETS: [string, Partial<Record<Item['slot'], Item>>][] = (process.env.SETS ?? '').split(';').filter(Boolean).length ? [] : [
  ['tam4', { weapon: mk('weapon', 4, 3, 'kilic'), helmet: mk('helmet', 4, 3), armor: mk('armor', 4, 3), shield: mk('shield', 4, 3), boots: mk('boots', 4, 3), bracelet: mk('bracelet', 4, 3), earring: mk('earring', 4, 3) }],
  ['tam1', { weapon: mk('weapon', 1, 1, 'kilic'), helmet: mk('helmet', 1, 1), armor: mk('armor', 1, 1), boots: mk('boots', 1, 1), bracelet: mk('bracelet', 1, 1), earring: mk('earring', 1, 1) }],
  ['kilic', { weapon: mk('weapon', 3, 2, 'kilic'), helmet: mk('helmet', 3, 2), armor: mk('armor', 3, 2) }],
  ['cift', { weapon: mk('weapon', 2, 1, 'cift'), helmet: mk('helmet', 2, 1), armor: mk('armor', 2, 1) }],
  ['yay', { weapon: mk('weapon', 4, 3, 'yay'), helmet: mk('helmet', 4, 3), armor: mk('armor', 4, 3) }],
  ['buyu', { weapon: mk('weapon', 3, 3, 'buyu'), helmet: mk('helmet', 1, 0), armor: mk('armor', 1, 0) }],
  ['bicak', { weapon: mk('weapon', 4, 3, 'bicak'), helmet: mk('helmet', 0, 0), armor: mk('armor', 0, 0) }],
];
for (const [name, eq] of SETS) {
  const p = me(); p.x = 6; p.z = 42; p.d.equip = eq; p.meDirty = true; await sleep(1500);
  await page.evaluate(() => { const g = (window as any).__game; g.camYaw = Number(new URLSearchParams(location.search).get('yaw') ?? 1.57); g.camPitch = Number(new URLSearchParams(location.search).get('pitch') ?? 1.15); g.camDist = Number(new URLSearchParams(location.search).get('dist') ?? 8); }); await sleep(2500);
  await page.screenshot({ path: `${process.env.OUT ?? '/tmp'}/gear-${name}.png`, clip: { x: 250, y: 100, width: 400, height: 500 } }); console.log('shot', name);
}
await browser.close(); process.exit(0);
