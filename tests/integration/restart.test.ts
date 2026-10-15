import { expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Bot, playerOf, startTestServer, uniq } from './helpers';

test('A5 sunucu yeniden başlasa da veri veritabanından gelir', async () => {
  const dbPath = join(mkdtempSync(join(tmpdir(), 'kut-r-')), 'restart.db');
  const s1 = await startTestServer({ dbPath, cfg: { spawnCamps: false } });
  const name = uniq('Yeniden');
  let b = await new Bot(s1.url, name).join('ay'); const level = playerOf(s1, b).d.level;
  playerOf(s1, b).d.gold = 4321; await b.leave(); await b.sleep(150);
  await s1.close();
  const s2 = await startTestServer({ dbPath, cfg: { spawnCamps: false } });
  b = await new Bot(s2.url, name).join(); expect(b.me.gold).toBe(4321); expect(b.me.level).toBe(level);
  await b.leave(); await s2.close();
});
