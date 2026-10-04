import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
p.on('console', (m) => console.log('[c]', m.type(), m.text().slice(0, 500)));
await p.goto('http://localhost:5173/?gallery=1&view=close');
await p.waitForFunction('window.__ready === true', null, { timeout: 60000 });
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const gs = (window as any).__gs; const sc = gs.scene;
  const m = sc.meshes.find((x: any) => x.name === 'body_m');
  const mat = m?.material;
  const eff = mat?.getEffect?.();
  return { n: sc.meshes.length, hasColor: m?.isVerticesDataPresent('color'), kinds: m?.getVerticesDataKinds?.(), mat: mat?.name, defines: eff?.defines, err: eff?.getCompilationError?.(), ready: eff?.isReady?.(), attrs: eff?.getAttributesNames?.() };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
