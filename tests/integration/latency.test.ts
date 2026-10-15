import { afterAll, beforeAll, expect, test } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Predictor } from '../../client/src/game/predict';
import { Bot, startTestServer, tp, uniq, waitSnap, type TestServer } from './helpers';

// Her yönde 75 ms yapay gecikme = 150 ms gidiş-dönüş (PRD §5 hedef gecikme toleransı).
let s: TestServer; let anchor: Bot;
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false, simLatency: 75 } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });

test('B.gecikme150: 150 ms gidiş-dönüş gecikmede tahmin sapması sınırlı, ışınlanma yok, sunucu yetkili kalır', async () => {
  const b = await new Bot(s.url, uniq('Lag')).join('yer'); tp(s, b, 0, 60); await waitSnap(b, 6);
  const pr = new Predictor(); pr.pos.x = b.snap.you.x; pr.pos.z = b.snap.you.z;
  const speed = b.me.stats.moveSpeed; const DT = 1 / 60; let dir = { x: 0, z: 1 }; let last = { x: 9, z: 9 }; let lastSend = 0;
  const errs: number[] = []; let firstStepMoved = 0; const start = { ...pr.pos };
  const total = Math.round(4.5 * 60);
  for (let i = 0; i < total; i++) {
    const t = i * DT; dir = t < 3.2 ? { x: 0, z: 1 } : { x: 0, z: 0 }; // 3.2 sn yürü, sonra dur
    // istemci döngüsüyle aynı: yön değişince veya 80 ms'de bir gönder
    const changed = Math.abs(dir.x - last.x) + Math.abs(dir.z - last.z) > 0.03;
    if (changed || ((dir.x || dir.z) && t * 1000 - lastSend > 80)) { b.send('in', dir); lastSend = t * 1000; last = dir; }
    pr.step(dir, speed, DT); if (i === 0) firstStepMoved = pr.pos.z - start.z;
    errs.push(pr.reconcile({ x: b.snap.you.x, z: b.snap.you.z }, !!(dir.x || dir.z), DT));
    await b.sleep(1000 / 60);
  }
  await b.sleep(500); const settled = pr.reconcile({ x: b.snap.you.x, z: b.snap.you.z }, false, DT);
  const maxErr = Math.max(...errs); const serverWalked = b.snap.you.z - 60;
  mkdirSync('docs/evidence', { recursive: true });
  writeFileSync('docs/evidence/metrics-latency.json', JSON.stringify({ rttMs: 150, speed, maxPredictionError: +maxErr.toFixed(2), settledError: +settled.toFixed(3), snaps: pr.snaps, firstFrameMove: +firstStepMoved.toFixed(3), serverWalked: +serverWalked.toFixed(1) }, null, 1));
  expect(firstStepMoved).toBeGreaterThan(speed * DT * 0.9);         // girdiye ilk karede anında tepki (gecikme yok)
  expect(serverWalked).toBeGreaterThan(speed * 1.5);                  // sunucu gerçekten yürüttü (yetkili)
  expect(maxErr).toBeLessThan(speed * 0.15 * 1.8);                    // sapma ≲ hız × RTT'nin ~1,8 katı (≈ 1,9 birim)
  expect(pr.snaps).toBe(0);                                           // hiç ışınlama/geri sarma yok
  expect(settled).toBeLessThan(0.25);                                 // durunca sunucu konumuna oturur
  await b.leave();
});
