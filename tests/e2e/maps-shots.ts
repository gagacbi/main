import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
import { HUB } from '../../shared/game';
import { Bot } from '../integration/helpers';

/** Hızlı görsel doğrulama: harita ekran görüntüleri (docs/evidence/maps-*.png). */
mkdirSync('docs/evidence', { recursive: true });
process.env.KUT_PING_RETRIES = '30';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/maps-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'tr-TR' });
await ctx.addInitScript(() => { try { localStorage.setItem('kut.lang', 'tr'); localStorage.setItem('kut.q', 'medium'); } catch { /* */ } });
const AN = 'Haritaci' + Math.floor(Math.random() * 900 + 100);
const seed = await new Bot(`ws://localhost:${srv.port}`, AN).join('gok'); await seed.leave(); await sleep(300); srv.ctx.db.setRole(AN, 'admin');
const pg = await ctx.newPage(); const errs: string[] = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto(`${url}?name=${AN}&pw=secret1&autoq=0`, { timeout: 120000 }); await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 }); await sleep(2500);
const w = [...srv.ctx.worlds][0]; const ap = [...w.players.values()].find((x) => x.name === AN)!;
const shot = (n: string) => pg.screenshot({ path: `docs/evidence/maps-${n}.png` });
const gm = async (line: string) => { w.rpcRun(ap, 'gm', { line }); await sleep(1500); };
ap.x = HUB.gate.x; ap.z = HUB.gate.z + 5; await sleep(1800); await shot('kapi-yurt');
await pg.keyboard.press('e'); await sleep(900); await shot('kapi-paneli'); await pg.keyboard.press('Escape');
await gm('tp otlak'); await sleep(2500); await shot('otlak-kamp');
console.log(await pg.evaluate(`(() => { const g = window.__game; return JSON.stringify({ pos: [g.pos.x, g.pos.z], srv: [g.serverYou?.x, g.serverYou?.z], lv: [...g.vs.views.values()].filter(v => v.kind === 'mob').map(v => v.lvl ?? v.l).slice(0, 12) }); })()`)); console.log(ap.x, ap.z);
ap.x = 900 + 40; ap.z = 20; await sleep(2500); await shot('otlak-saha');
await gm('tp erlik'); await sleep(2500); await shot('erlik-kamp');
ap.x = -900 + 50; ap.z = 30; await sleep(2500); await shot('erlik-saha');
console.log('errors', errs.slice(0, 5)); await browser.close(); await srv.close?.(); process.exit(0);
