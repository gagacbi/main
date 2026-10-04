import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { RIFT } from '../../shared/game';
import { Bot, playerOf, startTestServer, tp, uniq, waitSnap, worldOf, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false, riftEvery: [1, 1] } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });

async function joinAt(n: string, boy: 'gok' | 'yer' | 'ay', x: number, z: number, level = 1) {
  const b = await new Bot(s.url, uniq(n)).join(boy); playerOf(s, b).d.level = level; worldOf(s, b).recalc(playerOf(s, b)); tp(s, b, x, z); await waitSnap(b); return b;
}
const killAll = (b: Bot, ids: Set<number>, extra = 0) => {
  const w = worldOf(s, b); const p = playerOf(s, b);
  for (const id of [...ids]) { const m = w.mobs.get(id); if (m) w.damage(p, m, m.hp + 1 + extra); }
};

RIFT.waveGapSec = 0.2; // testte dalga arası beklemeyi kısalt
describe('D6 Erlik çatlağı', () => {
  test('rastgele zamanda ve yerde açılır; oyunculara duyurulur; riskli bölgededir', async () => {
    const w = worldOf(s); w.rifts.clear();
    await anchor.until(() => w.rifts.size > 0, 15000);
    const r = [...w.rifts.values()][0]; const d = Math.hypot(r.x, r.z);
    expect(d).toBeGreaterThanOrEqual(RIFT.minDist - 1); expect(d).toBeLessThanOrEqual(RIFT.maxDist + 1);
    await anchor.until(() => anchor.chat.some((m) => m.key === 'sys.rift_open'));
    await anchor.until(() => anchor.snap.rifts.length > 0);
    w.rifts.clear(); s.ctx.cfg.riftEvery = [9999, 9999]; w.nextRiftAt = Infinity;
  });
  test('otomatik katılım: yaklaşınca dalgalar başlar; 3 dalga + bekçi; kapanınca katılımcıya garanti nadir+ ganimet', async () => {
    const w = worldOf(s); w.rifts.clear(); const r = w.openRift()!;
    const a = await joinAt('RA', 'gok', r.x + 3, r.z); const idle = await joinAt('Uzak', 'yer', r.x + 60, r.z);
    await a.until(() => r.state === 1);             // parti kurmadan otomatik başladı
    expect(r.wave).toBe(1);
    let waveHp = 0;
    for (let wv = 1; wv <= RIFT.waves; wv++) {
      await a.until(() => r.wave === wv && r.mobs.size > 0 && r.state === 1, 5000);
      waveHp = Math.max(waveHp, w.mobs.get([...r.mobs][0])!.maxHp); killAll(a, r.mobs); await a.sleep(120);
    }
    await a.until(() => r.state === 2, 5000);         // bekçi
    const boss = [...r.mobs].map((id) => w.mobs.get(id)!)[0]; expect(boss.type).toBe('bekci'); expect(boss.maxHp).toBeGreaterThan(10 * waveHp);
    killAll(a, r.mobs); await a.until(() => r.state === 3, 5000);
    const pa = playerOf(s, a); const pi = playerOf(s, idle);
    await a.until(() => pa.d.items.some((it) => it.tier >= 1), 6000);               // yakındaki katılımcı ganimeti toplar
    expect(pa.d.items.some((it) => it.tier >= 1)).toBe(true);        // garanti nadir veya üstü
    expect(pi.d.items.length).toBe(0); expect([...w.drops.values()].filter((d) => d.owner === idle.id).length).toBe(0); // katkısı olmayan almaz
    expect(idle.snap.drops.length).toBe(0);
    await a.leave(); await idle.leave(); w.drops.clear();
  });
  test('zorluk yakındaki oyuncu sayısı ve seviyesine ölçeklenir', async () => {
    const w = worldOf(s); w.rifts.clear(); w.mobs.clear();
    const solo = w.openRift()!; const a = await joinAt('S1', 'gok', solo.x + 3, solo.z);
    await a.until(() => solo.state === 1); const n1 = solo.mobs.size; const hp1 = w.mobs.get([...solo.mobs][0])!.maxHp; const lvl1 = solo.lvl;
    await a.leave(); w.rifts.clear(); w.mobs.clear();
    const squad = w.openRift()!;
    const bots = await Promise.all([0, 1, 2].map((i) => joinAt('G' + i, 'yer', squad.x + 60, squad.z, 9)));
    for (const [i, b] of bots.entries()) { const pl = playerOf(s, b); pl.x = squad.x + 2 + i; pl.z = squad.z; }   // üçü aynı anda yaklaşsın: dalga 3 kişiye göre kurulsun
    await bots[0].until(() => squad.state === 1);
    const n3 = squad.mobs.size; const hp3 = w.mobs.get([...squad.mobs][0])!.maxHp;
    expect(n3).toBeGreaterThanOrEqual(n1); expect(squad.scale).toBeCloseTo(1 + RIFT.hpPerExtra * 2, 2); expect(squad.lvl).toBeGreaterThan(lvl1);
    expect(hp3).toBeGreaterThan(hp1);
    for (const b of bots) await b.leave(); w.rifts.clear(); w.mobs.clear();
  });
  test('süresi dolan çatlak kapanır ve yaratıkları temizlenir', async () => {
    const w = worldOf(s); w.rifts.clear(); w.mobs.clear(); const r = w.openRift()!;
    const a = await joinAt('Sure', 'ay', r.x + 3, r.z); await a.until(() => r.state === 1);
    s.advance((RIFT.lifeSec + 5) * 1000); await a.until(() => w.rifts.size === 0); expect(r.mobs.size).toBeGreaterThan(0);
    for (const id of r.mobs) expect(w.mobs.has(id)).toBe(false); await a.leave();
  });
});
