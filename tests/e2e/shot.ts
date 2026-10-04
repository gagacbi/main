import { chromium } from 'playwright';

/** Geliştirme yardımcısı: bir URL'nin ekran görüntüsünü alır. kullanım: tsx tests/e2e/shot.ts <url> <out.png> [bekleme_ms] */
const [url, out, wait] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 300)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 400)));
await p.goto(url);
await p.waitForFunction('window.__ready === true', null, { timeout: 60000 }).catch(() => console.log('ready timeout'));
await p.waitForTimeout(Number(wait ?? 2500));
await p.screenshot({ path: out });
await b.close();
