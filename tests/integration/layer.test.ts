import { afterAll, beforeAll, expect, test } from 'vitest';
import { Bot, startTestServer, uniq, type TestServer } from './helpers';

// Colyseus matchMaker süreç genelinde tekildir; bu dosya kendi süreci/sunucusuyla çalışır.
let small: TestServer;
beforeAll(async () => { small = await startTestServer({ cfg: { spawnCamps: false, maxPerLayer: 2 } }); });
afterAll(async () => { await small.stop(); });

test('oda dolunca ikinci katman açılır; oymak arkadaşı için arkadaşının katmanı önerilir', async () => {
    const a = await new Bot(small.url, uniq('KatA')).join('gok');
    const f = await new Bot(small.url, uniq('KatF')).join('ay');
    const b = await new Bot(small.url, uniq('KatB')).join('gok'); // oda dolu → 2. katman
    expect(a.welcome.roomId).toBe(f.welcome.roomId);
    expect(b.welcome.roomId).not.toBe(a.welcome.roomId);
    expect(new Set([a.welcome.layer, b.welcome.layer]).size).toBe(2);
    expect(a.me.oymakId).toBe(b.me.oymakId); // aynı boyun aynı acemi oymağı
    await f.leave(); await f.sleep(100);
    // Şimdi her iki katmanda da yer var; yeni gelen aynı oymaktan C için arkadaşlarının katmanı önerilmeli
    const c = new Bot(small.url, uniq('KatC'));
    const cj = await new Bot(small.url, c.name).join('gok').catch(() => null); // hesabı oluştur
    expect(cj).not.toBeNull(); await cj!.leave(); await cj!.sleep(100);
    const api = await fetch(`http://localhost:${small.port}/api/layer?name=${encodeURIComponent(c.name)}`).then((r) => r.json());
    expect([a.welcome.roomId, b.welcome.roomId]).toContain(api.roomId);
    const mateRoom = [a, b].find((x) => x.welcome.roomId === api.roomId)!;
    const joined = await new Bot(small.url, c.name).join(undefined, api.roomId);
    expect(joined.welcome.roomId).toBe(mateRoom.welcome.roomId);
    expect(joined.me.oymakId).toBe(mateRoom.me.oymakId);
    await a.leave(); await b.leave(); await joined.leave(); 
});
