import { chromium, type Page } from 'playwright';
/** Geliştirme oturumu: oyuna girer, yürür, savaşır, panelleri açar; ekran görüntüleri alır. */
const out = process.argv[2] ?? '/tmp/play';
const name = 'Alp' + Math.floor(Math.random() * 1e5);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p: Page = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', (m) => { if (['error'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 400)); });
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 500)));
await p.goto(`http://localhost:5173/?name=${name}&pw=secret1&create=gok&q=${process.env.Q ?? 'high'}`);
await p.waitForFunction('window.__ready === true', null, { timeout: 90000 });
await p.waitForTimeout(2000);
const g = (expr: string) => p.evaluate(`(() => { const g = window.__game; return ${expr}; })()`);
console.log('fps', await g('Math.round(g.fps)'));
await p.screenshot({ path: `${out}_0.png` });
// güneye yürü (bozkıra)
await p.keyboard.down('s'); await p.waitForTimeout(Number(process.env.WALK ?? 9000)); await p.keyboard.up('s');
console.log('pos', await g('JSON.stringify(g.pos)'), 'fps', await g('Math.round(g.fps)'), 'mobs', await g('[...g.vs.views.values()].filter(v=>v.kind==="mob").length'));
await p.screenshot({ path: `${out}_1.png` });
await p.keyboard.down('Space'); await p.waitForTimeout(6000);
await p.screenshot({ path: `${out}_2.png` });
await p.keyboard.up('Space');
console.log('me', await g('JSON.stringify({lvl:g.me.level,xp:g.me.xp,gold:g.me.gold,hp:g.hp})'));
await b.close();
