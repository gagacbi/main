/**
 * İstemci kare maliyeti ölçümü: oyuncunun etrafında N yaratık varken `vs.update` (varlık/plaka/animasyon) ve `fx.update` süresi.
 *   npx tsx tests/perf/mob-perf.ts            (önce npm run build)
 * Yazılım rasterleştirmede (SwiftShader) çizim süresi gerçek GPU'yu temsil etmez; burada yalnız JS tarafı (DOM/animasyon) ölçülür.
 */
import { chromium } from 'playwright';
import { startGameServer } from '../../server/index';

const srv = await startGameServer({ port: 0, dbPath: `/tmp/perf-${Date.now()}.db`, cfg: { test: true, riftEvery: [9999, 9999] } });
const url = `http://localhost:${srv.port}/`; const world = () => [...srv.ctx.worlds][0];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'tr-TR' });
await ctx.addInitScript(() => { try { localStorage.setItem('kut.lang', 'tr'); localStorage.setItem('kut.q', 'medium'); } catch { /* */ } });
const page = await ctx.newPage(); page.setDefaultTimeout(120000);
const NAME = 'Perf' + Math.floor(Math.random() * 900 + 100);
await page.goto(url + '?autoq=0'); await page.waitForSelector('.title .tcard', { timeout: 120000 }); await sleep(1500);
await page.click('#sw'); await sleep(500); await page.fill('#ln', NAME); await page.fill('#lp', 'gizli1234'); await page.click('.boycard[data-b="ay"]'); await sleep(500);
await page.click('#go'); await page.waitForFunction('window.__ready === true', null, { timeout: 150000 }); await sleep(2500);
const me = () => [...world().players.values()].find((p) => p.name === NAME)!;
await page.evaluate(() => { const g = (window as any).__game; const t = { vs: 0, fx: 0, n: 0 }; (window as any).__t = t; const vs = g.vs.update.bind(g.vs); g.vs.update = (...a: unknown[]) => { const s = performance.now(); vs(...a); t.vs += performance.now() - s; t.n++; }; const fx = g.fx.update.bind(g.fx); g.fx.update = (...a: unknown[]) => { const s = performance.now(); fx(...a); t.fx += performance.now() - s; }; });
async function measure(label: string, n: number, hit: boolean) {
  const w = world(); const p = me(); p.god = true; for (const m of [...w.mobs.values()]) if (!m.dead && !m.dummy) { m.hp = 0; w.killMob(m); }
  for (let i = 0; i < n; i++) { const ang = (i / Math.max(1, n)) * 6.283; const r = 4 + (i % 8) * 3.4; const m = w.makeMob('cakal', 20, p.x + Math.cos(ang) * r, p.z + Math.sin(ang) * r, -1); m.hx = m.x; m.hz = m.z; m.leash = 80; }
  await sleep(2500);
  await page.evaluate(() => { const t = (window as any).__t; t.vs = t.fx = t.n = 0; });
  if (hit) { for (let k = 0; k < 14; k++) { for (const m of world().mobs.values()) if (!m.dead && !m.dummy && Math.hypot(m.x - me().x, m.z - me().z) < 12) { m.hp = Math.max(1, m.hp - 1); world().emit({ k: 'dmg', id: m.id, v: 12, src: me().id } as never, m.x, m.z); } await sleep(150); } } else await sleep(2500);
  const r = await page.evaluate(() => { const t = (window as any).__t; const g = (window as any).__game; return { frames: t.n, vsMs: t.vs / Math.max(1, t.n), fxMs: t.fx / Math.max(1, t.n), plates: document.querySelectorAll('.plate').length, meshes: g.gs.scene.meshes.length, enabled: g.gs.scene.meshes.filter((m: any) => m.isEnabled()).length, active: g.gs.scene.getActiveMeshes().length, draws: g.gs.engine._drawCalls?.current ?? g.gs.engine.drawCalls ?? 0, tris: Math.round(g.gs.scene.getActiveIndices() / 3), pops: document.querySelectorAll('.pop').length, fps: Math.round(g.fps) }; });
  console.log(`${label.padEnd(26)} kare=${String(r.frames).padStart(4)}  vs.update=${r.vsMs.toFixed(2)} ms  fx.update=${r.fxMs.toFixed(2)} ms  plaka=${r.plates}  mesh=${r.meshes} açık=${r.enabled} aktif=${r.active} çizim=${r.draws} üçgen=${r.tris}  popup=${r.pops}  fps=${r.fps}`);
}
if (process.env.TOP) { const top = await page.evaluate(() => { const g = (window as any).__game; const sc = g.gs.scene; return sc.meshes.filter((m: any) => m.isEnabled() && m.isInFrustum && m.isInFrustum(sc.activeCamera.frustumPlanes ?? (sc.frustumPlanes))).map((m: any) => ({ n: m.name, idx: m.getTotalIndices?.() ?? 0, inst: m.thinInstanceCount || m.instances?.length || 0, en: m.isEnabled(), vis: m.isVisible, cull: m.alwaysSelectAsActiveMesh ? 'always' : 'cull' })).map((m: any) => ({ ...m, tri: Math.round(m.idx / 3 * Math.max(1, m.inst)) })).sort((a: any, b: any) => b.tri - a.tri).slice(0, 400); }); const agg: Record<string, number> = {}; for (const m of top as any[]) { const k = String(m.n).replace(/@.*$/, ''); agg[k] = (agg[k] ?? 0) + m.tri; } console.log(JSON.stringify(Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 12))); const top2: any[] = [];  const tot = await page.evaluate(() => { const g = (window as any).__game; return { camPos: g.gs.scene.activeCamera?.position, far: g.gs.scene.activeCamera?.maxZ, fog: g.gs.scene.fogEnd }; }); console.log(JSON.stringify(tot)); }
await measure('0 yaratık (boşta)', 0, false); await measure('20 yaratık (boşta)', 20, false); await measure('40 yaratık (boşta)', 40, false); await measure('40 yaratık + vuruş yağmuru', 40, true);
if (process.env.SHOT) { await page.evaluate(() => { const g = (window as any).__game; g.camDist = Number(process.env.CAMD ?? 7); g.camPitch = Number(process.env.CAMP ?? 1.15); }); await sleep(2500); await page.screenshot({ path: process.env.SHOT }); }
await browser.close(); process.exit(0);
