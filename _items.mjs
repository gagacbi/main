import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 780 } }); p.on('console', (m) => console.log('C', m.text().slice(0, 200))); p.on('pageerror', (e) => console.log('E', e.message.slice(0, 300)));
await p.goto('http://localhost:4177/?items'); await p.waitForFunction('window.__sheet === true', null, { timeout: 90000 }).catch((e) => console.log('timeout'));
await p.waitForTimeout(500); await p.screenshot({ path: process.argv[2] }); await b.close();
