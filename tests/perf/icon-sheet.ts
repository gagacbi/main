/** Simge tablosu ekran görüntüsü (?icons=1). Önce: npm run build.   OUT=/tmp/icons.png npx tsx tests/perf/icon-sheet.ts */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';
const srv = await startGameServer({ port: 0, dbPath: `/tmp/ic-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 1500 } })).newPage(); page.setDefaultTimeout(180000);
const errs: string[] = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`http://localhost:${srv.port}/?icons=1`); await page.waitForFunction('window.__ready === true'); await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: process.env.OUT ?? '/tmp/icons.png', fullPage: true }); console.log('errors', errs.slice(0, 3));
await browser.close(); await srv.close(); process.exit(0);
