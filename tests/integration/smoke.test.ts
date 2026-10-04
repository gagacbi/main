import { afterAll, beforeAll, expect, test } from 'vitest';
import { Bot, startTestServer, uniq, type TestServer } from './helpers';

let s: TestServer;
beforeAll(async () => { s = await startTestServer(); });
afterAll(async () => { await s.stop(); });

test('smoke: karakter oluştur ve dünyayı gör', async () => {
  const b = await new Bot(s.url, uniq('Alp')).join('gok');
  expect(b.me.level).toBe(1);
  expect(b.snap.mobs.length).toBeGreaterThanOrEqual(0);
  await b.leave();
});
