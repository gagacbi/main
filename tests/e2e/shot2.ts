import { chromium } from 'playwright';
/** kullanım: tsx tests/e2e/shot2.ts <url> <out.png> [bekleme_ms] [js]  — JS: sayfada çalıştırılacak ek betik */
const [url, out, wait, js] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 400)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));
await p.goto(url);
await p.waitForTimeout(Number(wait ?? 4000));
if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log('JS:', JSON.stringify(r)); await p.waitForTimeout(1500); }
await p.screenshot({ path: out });
await b.close();
