import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { Client } from 'colyseus.js';
import { HUB, PLAYER_BASE_SPEED, TICK_HZ } from '../../shared/game';
import { Bot, startTestServer, tp, uniq, waitSnap, worldOf, playerOf, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
// Son istemci çıkınca Colyseus odayı kapatır; bir çapa istemci odayı açık tutar (yalnızca test kolaylığı).
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });

describe('A2/A3 sunucu yetkili hareket', () => {
  test('istemci yalnızca yön gönderir; hız sunucuda sabittir (aşırı büyük vektör hızlandırmaz)', async () => {
    const b = await new Bot(s.url, uniq('Hiz')).join('gok');
    tp(s, b, 0, 10);
    await waitSnap(b);
    const a0 = { ...b.pos };
    const t0 = Date.now();
    const iv = setInterval(() => b.send('in', { x: 9999, z: 0 }), 50);
    await b.sleep(1000); clearInterval(iv);
    const dt = (Date.now() - t0) / 1000;
    const d = Math.hypot(b.pos.x - a0.x, b.pos.z - a0.z);
    const max = PLAYER_BASE_SPEED * 1.06 * dt * 1.15 + 0.5; // gök boyu +%6
    expect(d).toBeGreaterThan(3); expect(d).toBeLessThan(max);
    await b.leave();
  });
  test('ışınlanma denemesi: sahte konum mesajları ve NaN/Infinity girdileri yok sayılır', async () => {
    const b = await new Bot(s.url, uniq('Isin')).join('yer');
    tp(s, b, 0, 10); await waitSnap(b);
    const a0 = { ...b.pos };
    b.send('pos', { x: 100, z: 100 }); b.send('teleport', { x: 100, z: 100 });
    b.send('in', { x: NaN, z: Infinity }); b.send('in', { x: 'a', z: null });
    await b.sleep(400);
    expect(Math.hypot(b.pos.x - a0.x, b.pos.z - a0.z)).toBeLessThan(0.5);
    await b.leave();
  });
  test('ağ kesilince girdi zaman aşımına uğrar ve karakter durur', async () => {
    const b = await new Bot(s.url, uniq('Dur')).join('ay');
    tp(s, b, 0, 10); b.send('in', { x: 1, z: 0 });
    await b.sleep(900);
    const p1 = { ...b.pos }; await b.sleep(400);
    expect(Math.hypot(b.pos.x - p1.x, b.pos.z - p1.z)).toBeLessThan(0.3);
    await b.leave();
  });
  test('hasar ve ganimet istemciden verilemez (bilinmeyen RPC reddedilir)', async () => {
    const b = await new Bot(s.url, uniq('Hile')).join('gok');
    const r = await b.rpc('giveGold' as never, { n: 1e9 });
    expect(r.ok).toBe(false);
    const g0 = b.me.gold; b.send('dmg', { id: 1, v: 99999 }); b.send('gold', { n: 1e9 }); await b.sleep(300);
    expect(b.me.gold).toBe(g0);
    await b.leave();
  });
});

describe('A4 hız sınırlaması', () => {
  test('saniyede çok sayıda RPC yollayan istemcinin fazlası reddedilir', async () => {
    const b = await new Bot(s.url, uniq('Sel')).join('gok');
    const res = await Promise.all(Array.from({ length: 60 }, () => b.rpc('oba.state')));
    const limited = res.filter((r) => r.err === 'rate_limited').length;
    expect(limited).toBeGreaterThan(30); expect(res.filter((r) => r.ok).length).toBeLessThanOrEqual(14);
    expect(playerOf(s, b).dropped).toBeGreaterThan(0);
    await b.leave();
  });
  test('sohbet sıklığı sınırlanır', async () => {
    const b = await new Bot(s.url, uniq('Chat')).join('gok');
    for (let i = 0; i < 20; i++) b.send('chat', { ch: 'near', text: 'selam' + i });
    await b.sleep(400);
    expect(b.chat.filter((m) => m.ch === 'near').length).toBeLessThanOrEqual(3);
    await b.leave();
  });
});

describe('A5/A6 kalıcılık ve kayıt defteri', () => {
  test('çıkış-giriş sonrası karakter, envanter ve sayaçlar aynen döner; işlemler ledger’a yazılır', async () => {
    const name = uniq('Kalici');
    let b = await new Bot(s.url, name).join('yer');
    tp(s, b, HUB.demirci.x - 2, HUB.demirci.z);
    const r = await b.rpc('craft', { kind: 'book' }); expect(r.ok).toBe(true);
    await b.until(() => b.me.bag.book === 1);
    const snapshot = { gold: b.me.gold, ore: b.me.bag.ore, book: b.me.bag.book, boy: b.me.boy };
    const dbId = playerOf(s, b).dbId;
    await b.leave(); await b.sleep(200);
    b = await new Bot(s.url, name).join();
    expect({ gold: b.me.gold, ore: b.me.bag.ore, book: b.me.bag.book, boy: b.me.boy }).toEqual(snapshot);
    expect(snapshot.gold).toBe(150 - 60); expect(snapshot.ore).toBe(6 - 4);
    const led = s.ctx.db.ledgerRows(dbId);
    expect(led.some((l) => l.kind === 'craft' && JSON.parse(l.detail).kind === 'book')).toBe(true);
    await b.leave();
  });
});

describe('A8 kimlik doğrulama', () => {
  test('parola düz metin saklanmaz; hatalı parola ve kopya ad reddedilir', async () => {
    const name = uniq('Auth');
    const b = await new Bot(s.url, name, 'gizliParola9').join('gok'); await b.leave();
    const row = s.ctx.db.playerByName(name)!;
    expect(row.hash).not.toContain('gizliParola9'); expect(row.hash.length).toBe(64); expect(row.salt.length).toBe(32);
    await expect(new Bot(s.url, name, 'yanlis!!').join()).rejects.toThrow();
    await expect(new Bot(s.url, name, 'gizliParola9').join('gok')).rejects.toThrow(); // kopya ad (create)
    await expect(new Bot(s.url, 'x', 'gizliParola9').join('gok')).rejects.toThrow(); // geçersiz ad
    await expect(new Bot(s.url, uniq('Kisa'), 'abc').join('gok')).rejects.toThrow(); // kısa parola
    const c = new Client(s.url);
    await expect(c.joinOrCreate('world', { name: 'Yok' + uniq('x'), password: 'abcd1234' })).rejects.toThrow(); // hesap yok
  });
  test('aynı hesapla ikinci giriş eskisini düşürür', async () => {
    const name = uniq('Cift');
    const a = await new Bot(s.url, name).join('gok');
    let closed = false; a.room.onLeave(() => { closed = true; });
    const b = await new Bot(s.url, name).join();
    await a.until(() => closed);
    expect(worldOf(s).players.size).toBeGreaterThanOrEqual(1);
    await b.leave();
  });
});

describe('A9 çoklu istemci', () => {
  test('10 eşzamanlı istemci birbirini görür; tick süresi bütçe içinde', async () => {
    const bots = await Promise.all(Array.from({ length: 10 }, (_, i) => new Bot(s.url, uniq('Yuk' + i)).join((['gok', 'yer', 'ay'] as const)[i % 3])));
    for (const [i, b] of bots.entries()) tp(s, b, Math.cos(i) * 6, 14 + Math.sin(i) * 6);
    const iv = setInterval(() => bots.forEach((b, i) => b.send('in', { x: Math.cos(Date.now() / 700 + i), z: Math.sin(Date.now() / 700 + i) })), 50);
    await bots[0].sleep(3000); clearInterval(iv);
    for (const b of bots) expect(b.snap.players.length).toBeGreaterThanOrEqual(9);
    expect(bots.every((b) => b.snaps > TICK_HZ * 2)).toBe(true);
    const w = worldOf(s, bots[0]);
    const avg = w.tickMsSum / w.tickMsN;
    console.log(`[A9] tick ort=${avg.toFixed(3)} ms, maks=${w.tickMsMax.toFixed(2)} ms, oyuncu=${w.players.size}`);
    expect(avg).toBeLessThan(10); // 50 ms bütçenin çok altında
    for (const b of bots) await b.leave();
  });
});
void HUB;
