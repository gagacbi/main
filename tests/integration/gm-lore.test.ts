import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HUB } from '../../shared/game';
import { genStones } from '../../shared/world';
import { RIFT } from '../../shared/game';
import { Bot, playerOf, startTestServer, tp, uniq, waitSnap, worldOf, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false, riftEvery: [9999, 9999] } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });

async function admin(n = 'Gm') {
  const name = uniq(n); let b = await new Bot(s.url, name).join('gok'); await b.leave(); await b.sleep(100);
  s.ctx.db.setRole(name, 'admin'); b = await new Bot(s.url, name).join(); return b;
}
const gm = async (b: Bot, line: string) => (await b.rpc('gm', { line })).data as { ok: boolean; msg: string };

RIFT.waveGapSec = 0.2; // testte dalga arası beklemeyi kısalt
describe('H1 yönetici yetkisi', () => {
  test('rolü olmayan hesap GM komutu çalıştıramaz; rol yalnızca veritabanından gelir', async () => {
    const b = await new Bot(s.url, uniq('Norm')).join('yer');
    expect((await b.rpc('gm', { line: 'level 50' })).err).toBe('forbidden'); expect(b.me.level).toBe(1); expect(b.me.role).toBe('player');
    b.send('gm', { line: 'level 50' }); await b.sleep(200); expect(b.me.level).toBe(1);   // doğrudan mesaj da etkisiz
    await b.leave();
  });
  test('yönetici: level / kit / gold / give / item / god / heal / dummy+dps çalışır ve kaydedilir', async () => {
    const b = await admin(); const p = playerOf(s, b); expect(b.me.role).toBe('admin');
    expect((await gm(b, 'level 40')).ok).toBe(true); expect(p.d.level).toBe(40); expect(p.hp).toBe(p.stats.maxHp);
    const base = p.stats.atk; expect((await gm(b, 'kit +9')).ok).toBe(true); expect(p.stats.atk).toBeGreaterThan(base * 1.8); expect(Object.keys(p.d.equip).length).toBe(4);
    await gm(b, 'gold 5000'); await gm(b, 'give ore 77'); await gm(b, 'item silah 2 20 +3');
    expect(p.d.bag.ore).toBeGreaterThanOrEqual(77); expect(p.d.items.some((i) => i.slot === 'weapon' && i.up === 3 && i.tier === 2)).toBe(true);
    await gm(b, 'god'); p.hp = 10; const w = worldOf(s, b); w.damage(null, p, 5000); expect(p.hp).toBe(10); expect(p.deadUntil).toBe(0);
    await gm(b, 'god'); await gm(b, 'heal'); expect(p.hp).toBe(p.stats.maxHp);
    tp(s, b, 0, 70); await gm(b, 'dummy'); await gm(b, 'maxskills'); b.send('atk', { on: true }); await b.sleep(1800); b.send('atk', { on: false });
    const r = await gm(b, 'dps'); expect(r.msg).toMatch(/hasar\/sn/); expect(w.dummyLog.length).toBeGreaterThan(0);
    for (const c of ['stats', 'ttk 20', 'econ', 'whoami', 'help']) expect((await gm(b, c)).ok).toBe(true);
    expect((await gm(b, 'bilinmeyen')).ok).toBe(false);
    expect(s.ctx.db.ledgerRows(p.dbId).some((l) => l.kind === 'gm')).toBe(true); // her GM komutu kayıt altında
    await b.leave();
  });
  test('GM zaman ilerletme + oba komutu: bitmemiş yükseltme ve seferler anında tamamlanır', async () => {
    const b = await admin('GmOba'); const p = playerOf(s, b); tp(s, b, HUB.otag.x + 8, HUB.otag.z + 6); await waitSnap(b);
    await gm(b, 'oba'); await b.rpc('oba.build', { b: 'otag' }); await b.rpc('oba.dispatch', { compId: p.d.companions[0].id, hours: 12 });
    await gm(b, 'oba'); const st = (await b.rpc('oba.state')).data as { levels: { otag: number }; upgrade: unknown };
    expect(st.levels.otag).toBe(2); expect(p.d.expeditions[0].endAt).toBeLessThanOrEqual(worldOf(s, b).now); await b.leave();
  });
});

describe('H2 gizem: balbal taşları', () => {
  test('8 taş deterministik; yakındaysan ipucu + akçe, uzaksan reddedilir, 8. taş 7 taş ister', async () => {
    const stones = genStones(); expect(stones.length).toBe(8); expect(stones.map((x) => x.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const d = stones.map((x) => Math.hypot(x.x, x.z)); for (let i = 1; i < 8; i++) expect(d[i]).toBeGreaterThan(d[i - 1] - 8); // uzaklığa göre artar
    const b = await new Bot(s.url, uniq('Gezgin')).join('ay'); const p = playerOf(s, b);
    expect((await b.rpc('stone', { n: 1 })).err).toBe('too_far');
    tp(s, b, stones[0].x - 2, stones[0].z); const g0 = p.d.gold; const r = await b.rpc('stone', { n: 1 }); expect(r.ok).toBe(true);
    expect(p.d.clues).toContain('stone.1'); expect(p.d.gold).toBeGreaterThan(g0); expect((await b.rpc('stone', { n: 1 })).data).toEqual({ isNew: false });
    tp(s, b, stones[7].x - 2, stones[7].z); expect((await b.rpc('stone', { n: 8 })).err).toBe('stone_locked');
    for (let i = 1; i < 7; i++) { tp(s, b, stones[i].x - 2, stones[i].z); expect((await b.rpc('stone', { n: i + 1 })).ok).toBe(true); }
    tp(s, b, stones[7].x - 2, stones[7].z); expect((await b.rpc('stone', { n: 8 })).ok).toBe(true); expect(p.d.clues.filter((c) => c.startsWith('stone.')).length).toBe(8);
    expect((await b.rpc('stone', { n: 99 })).err).toBe('bad_stone'); await b.leave();
  });
});

describe('H3 gizem: rüyalar, Ak Sakal, mühür kırıkları, birleşme', () => {
  test('uzun süre çevrimdışı kalıp dönen oyuncu sıradaki rüyayı görür; beşte durur; kalıcıdır', async () => {
    const name = uniq('Ruya'); let b = await new Bot(s.url, name).join('gok'); await b.leave(); await anchor.sleep(100);
    b = await new Bot(s.url, name).join(); expect(b.me.pendingDream).toBe(0);   // kısa süre: rüya yok
    for (let i = 1; i <= 6; i++) {
      await b.leave(); await anchor.sleep(100); s.advance(5 * 3600 * 1000); b = await new Bot(s.url, name).join();
      if (i <= 5) { expect(b.me.pendingDream).toBe(i); await b.rpc('dreamSeen'); await b.until(() => b.me.clues.includes(`dream.${i}`)); } else expect(b.me.pendingDream).toBe(0);
    }
    expect(playerOf(s, b).d.clues.filter((c) => c.startsWith('dream.')).length).toBe(5); await b.leave();
  });
  test('Ak Sakal: seviye eşiklerinde yeni söz; yakında olmak şart', async () => {
    const b = await admin('GmElder'); const p = playerOf(s, b); await gm(b, 'level 1'); tp(s, b, 0, 25);
    expect((await b.rpc('elder')).err).toBe('too_far'); tp(s, b, HUB.akSakal.x + 3, HUB.akSakal.z + 3);
    expect(((await b.rpc('elder')).data as { got: string[] }).got).toEqual([]); await gm(b, 'level 9');
    expect(((await b.rpc('elder')).data as { got: string[] }).got).toEqual(['elder.1', 'elder.2']);
    await gm(b, 'level 30'); await b.rpc('elder'); expect(p.d.clues.filter((c) => c.startsWith('elder.')).length).toBe(5); await b.leave();
  });
  test('Erlik çatlağı kapanınca mühür kırığı düşer; 1., 3., 6. kırıkta yeni ipucu', async () => {
    const b = await admin('GmShard'); const w = worldOf(s, b); const p = playerOf(s, b); await gm(b, 'god'); w.rifts.clear();
    for (let k = 1; k <= 6; k++) {
      w.mobs.clear(); const r = w.openRift()!; tp(s, b, r.x + 3, r.z); await b.until(() => r.state === 1, 6000);
      for (let i = 0; i < 60 && r.state !== 3; i++) { for (const id of [...r.mobs]) { const m = w.mobs.get(id); if (m) w.damage(p, m, m.hp + 1); } await b.sleep(120); }
      await b.until(() => r.state === 3, 6000); w.rifts.clear(); w.drops.clear();
    }
    expect(p.d.shards).toBe(6); expect(p.d.clues.filter((c) => c.startsWith('shard.')).sort()).toEqual(['shard.1', 'shard.2', 'shard.3']); void RIFT; await b.leave();
  });
  test('"Mühürün Dışı": dört ipliğin ucu birleşince açılır ve kalıcıdır; yarım ilerleme açmaz', async () => {
    const b = await admin('GmTruth'); const p = playerOf(s, b);
    for (const id of ['dream.1', 'dream.2', 'elder.1', 'elder.2', 'stone.1', 'stone.2']) await gm(b, 'clue ' + id);
    expect(p.d.clues).not.toContain('truth.1');       // yalnızca 3 iplik
    await gm(b, 'clue stone.3'); await gm(b, 'clue shard.1'); expect(p.d.clues).toContain('truth.1');
    const n = p.d.clues.length; await b.leave(); await anchor.sleep(120); const b2 = await new Bot(s.url, b.name).join(); expect(b2.me.clues.length).toBe(n); await b2.leave();
  });
  test('eski kayıt (ipucu alanı olmayan) sorunsuz açılır', async () => {
    const name = uniq('Eski'); const b = await new Bot(s.url, name).join('yer'); await b.leave(); await anchor.sleep(100);
    const row = s.ctx.db.playerByName(name)!; const d = JSON.parse(row.data); delete d.clues; delete d.dreams; delete d.shards; delete d.pendingDream;
    s.ctx.db.savePlayer(row.id, JSON.stringify(d), row.points, row.oymak_id, Date.now());
    const b2 = await new Bot(s.url, name).join(); expect(b2.me.clues).toEqual([]); expect(b2.me.shards).toBe(0); await b2.leave();
  });
});
