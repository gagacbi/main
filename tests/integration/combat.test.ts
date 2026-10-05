import { SHIELD_ABSORB, deathXpLoss } from '../../shared/game';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HUB, SKILLS, computeStats, makeItem, mobXp, xpToNext, HUB_R } from '../../shared/game';
import { F } from '../../shared/protocol';
import { Bot, mobAt, playerOf, startTestServer, tp, uniq, waitSnap, worldOf, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
const FAR = { x: 0, z: 70 }; // riskli bölge, kamp yok (spawnCamps=false)
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });
const fresh = async (boy: 'gok' | 'yer' | 'ay' = 'gok', n = 'Sv') => { worldOf(s).mobs.clear(); const b = await new Bot(s.url, uniq(n)).join(boy); tp(s, b, FAR.x, FAR.z); await waitSnap(b); return b; };

describe('B1 otomatik seri vuruş', () => {
  test('saldırı basılı tutulunca en yakın düşmana vurur; bırakınca durur; ödül sunucuda verilir', async () => {
    const b = await fresh();
    const far = mobAt(s, b, 'cakal', 1, 3.0, 0, 5); const near = mobAt(s, b, 'cakal', 1, 1.5, 0, 5);
    far.target = near.target = 0; far.nextAtk = near.nextAtk = Infinity; // yalnızca oyuncunun vuruşunu ölçelim
    b.send('atk', { on: true });
    await b.until(() => near.hp < near.maxHp);
    expect(far.hp).toBe(far.maxHp); // en yakın hedef seçildi
    const h1 = near.hp; await b.sleep(700); expect(near.hp).toBeLessThan(h1); // seri vuruş devam
    b.send('atk', { on: false }); await b.sleep(150); const h2 = near.hp; await b.sleep(700); expect(near.hp).toBe(h2);
    expect(b.evs.some((e) => e.k === 'swing' && e.id === b.id)).toBe(true);
    await b.leave();
  });
  test('öldürme: deneyim + akçe + ganimet yalnızca vuran oyuncuya görünür (bireysel ganimet)', async () => {
    const a = await fresh('gok', 'Katil'); const o = await fresh('yer', 'Gozcu'); tp(s, o, FAR.x + 2, FAR.z);
    const m = mobAt(s, a, 'cakal', 1, 1.5, 0, 0.3); m.nextAtk = Infinity;
    const xp0 = a.me.xp; a.send('atk', { on: true });
    await a.until(() => m.dead);
    a.send('atk', { on: false });
    await a.until(() => a.snap.drops.length > 0); await waitSnap(o, 3);
    expect(o.snap.drops.length).toBe(0); // gözlemci göremiyor
    expect(a.me.xp + a.me.level * 1000).toBeGreaterThan(xp0 + a.me.level * 1000 - 1);
    expect(playerOf(s, a).d.counters.kills).toBe(1);
    const g0 = a.me.gold; tp(s, a, m.x, m.z); // toplama yarıçapına gir
    await a.until(() => a.me.gold > g0, 4000);
    await a.leave(); await o.leave();
  });
  test('ölüm sonrası yaratık kampında yeniden doğar (kamp mobu)', async () => {
    const w = worldOf(s); const c = w.camps[0];
    const m = w.spawnCampMob(c); m.hp = 0; w.killMob(m);
    expect(m.dead).toBe(true); expect(m.respawnAt).toBeGreaterThan(w.now);
    s.advance(20000); await anchor.sleep(150);
    expect(m.dead).toBe(false); w.mobs.delete(m.id);
  });
});

describe('B2/B6 yetenekler, alan hasarı, toplama', () => {
  test('bekleme sunucuda doğrulanır; seviye kapısı vardır', async () => {
    const b = await fresh(); const m = mobAt(s, b, 'tepegoz', 1, 2, 0, 20); m.nextAtk = Infinity;
    b.send('sk', 0); await b.until(() => m.hp < m.maxHp); const h = m.hp;
    b.send('sk', 0); b.send('sk', 0); await b.sleep(250); expect(m.hp).toBe(h); // bekleme dolmadı
    b.send('sk', 5); await b.sleep(250); expect(m.hp).toBe(h); // seviye 12 gerekir, seviye 1
    expect(b.me.cds[0]).toBeGreaterThan(2);
    await b.leave();
  });
  test('alan yeteneği tek seferde yaratık grubunu vurur', async () => {
    const b = await fresh(); const mobs = Array.from({ length: 6 }, (_, i) => { const m = mobAt(s, b, 'cakal', 1, Math.cos(i) * 3, Math.sin(i) * 3, 3); m.nextAtk = Infinity; return m; });
    b.send('sk', 0);
    await b.until(() => mobs.filter((m) => m.hp < m.maxHp).length >= 5); await waitSnap(b, 3);
    expect(b.evs.filter((e) => e.k === 'fx' && e.fx === 'slash').length).toBeGreaterThan(0);
    await b.leave();
  });
  test('Çağrı Narası uzaktaki yaratıkları çeker ve yavaşlatır (yaratık toplama)', async () => {
    const b = await fresh(); playerOf(s, b).d.level = 5; playerOf(s, b).d.skillPts = 0;
    const ms = [8, 10, 12].map((dx) => { const m = mobAt(s, b, 'cakal', 1, dx, 0, 5); m.nextAtk = Infinity; return m; });
    b.send('sk', 2);
    await b.until(() => ms.every((m) => m.hp < m.maxHp));
    const p = playerOf(s, b);
    for (const m of ms) { expect(Math.hypot(m.x - p.x, m.z - p.z)).toBeLessThan(3.2); expect(m.target).toBe(b.id); expect(s.ctx.worlds.values().next().value!.hasStatus(m, 'slow')).toBe(true); }
    await b.leave();
  });
  test('B3 yetenek kademesi: puan + akçe harcar, M1→M2→…→P; kapılar çalışır', async () => {
    const b = await fresh(); const p = playerOf(s, b);
    expect((await b.rpc('rankSkill', { slot: 0 })).err).toBe('no_skill_points');
    p.d.skillPts = 10; p.d.gold = 100000;
    for (let i = 0; i < 5; i++) expect((await b.rpc('rankSkill', { slot: 0 })).ok).toBe(true);
    await b.until(() => b.me.skillRanks[0] === 6); expect(b.me.skillPts).toBe(5);
    expect((await b.rpc('rankSkill', { slot: 0 })).err).toBe('max_rank');
    expect((await b.rpc('rankSkill', { slot: 5 })).err).toBe('level_low');
    await b.leave();
  });
  test('daha yüksek kademe daha çok hasar verir', async () => {
    const dmg = async (rank: number) => {
      const b = await fresh(); const p = playerOf(s, b); p.d.skillRanks[0] = rank; p.rate.win = 0;
      s.ctx.rng = () => 0.5; // sabit rastgelelik: kritik yok, zar = 1
      const m = mobAt(s, b, 'tepegoz', 1, 2, 0, 50); m.nextAtk = Infinity; b.send('sk', 0);
      await b.until(() => m.hp < m.maxHp); const d = m.maxHp - m.hp; await b.leave(); return d;
    };
    const d1 = await dmg(1), d6 = await dmg(6);
    expect(d6).toBeGreaterThan(d1 * 1.5);
    s.ctx.rng = Math.random;
  });
});

describe('B4 uzmanlık (seviye 10)', () => {
  test('seviye 10 öncesi seçilemez; seçim kalıcı; etkiler ölçülebilir', async () => {
    const k = await fresh('gok', 'Kal'); const q = await fresh('gok', 'Kil');
    expect((await k.rpc('spec', { choice: 'kalkan' })).err).toBe('level_low');
    for (const b of [k, q]) { const p = playerOf(s, b); p.d.level = 10; s.ctx.worlds.values().next().value!.recalc(p); }
    expect((await k.rpc('spec', { choice: 'kalkan' })).ok).toBe(true); expect((await q.rpc('spec', { choice: 'kilic' })).ok).toBe(true);
    expect((await k.rpc('spec', { choice: 'kilic' })).err).toBe('spec_set');
    await k.until(() => k.me.spec === 'kalkan'); await q.until(() => q.me.spec === 'kilic');
    expect(k.me.stats.maxHp).toBeGreaterThan(q.me.stats.maxHp); expect(q.me.stats.atk).toBeGreaterThan(k.me.stats.atk);
    await k.leave(); await q.leave();
  });
  test('Kalkan Alp sarsıntıyla yaratıkları provoke eder; kalkan beceri hasar emer', async () => {
    const other = await fresh('yer', 'Baska'); const b = await fresh(); tp(s, other, FAR.x + 3, FAR.z);
    const p = playerOf(s, b); p.d.level = 10; p.d.spec = 'kalkan'; s.ctx.worlds.values().next().value!.recalc(p);
    const m = mobAt(s, b, 'cakal', 1, 4, 0, 40); m.nextAtk = Infinity; m.target = other.id;
    b.send('sk', 1); await b.until(() => m.target === b.id);
    b.send('sk', 3); await b.until(() => (b.snap.you.f & F.SHIELD) !== 0);
    expect(playerOf(s, b).status.shield!.absorb).toBeGreaterThan(p.stats.maxHp * SHIELD_ABSORB * 1.15);
    await b.leave(); await other.leave();
  });
});

describe('B5 durum etkileri', () => {
  test('sersemletme: sersemlemiş yaratık hareket etmez ve saldırmaz', async () => {
    const b = await fresh(); playerOf(s, b).d.level = 5;
    const m = mobAt(s, b, 'cakal', 1, 3, 0, 30); b.send('sk', 1);
    await b.until(() => m.hp < m.maxHp); const w = worldOf(s, b); expect(w.hasStatus(m, 'stun')).toBe(true);
    const x = m.x; const hp = playerOf(s, b).hp; await b.sleep(500); expect(m.x).toBeCloseTo(x, 1); expect(playerOf(s, b).hp).toBe(hp);
    await b.leave();
  });
  test('zehir: zamanla hasar verir', async () => {
    const b = await fresh(); playerOf(s, b).d.level = 9;
    const m = mobAt(s, b, 'tepegoz', 1, 3, 0, 60); m.nextAtk = Infinity; b.send('sk', 4);
    await b.until(() => worldOf(s, b).hasStatus(m, 'poison')); const h = m.hp; await b.sleep(2300); expect(m.hp).toBeLessThan(h);
    await b.leave();
  });
  test('Albastı laneti: lanetli oyuncunun hasarı azalır; kalkan ve yavaşlatma bayrakları görünür', async () => {
    const b = await fresh(); const w = worldOf(s, b); const p = playerOf(s, b);
    s.ctx.rng = () => 0.001; // lanet şansı her zaman tutsun
    const m = mobAt(s, b, 'albasti', 1, 1.5, 0, 50); m.target = b.id;
    await b.until(() => (b.snap.you.f & F.CURSE) !== 0, 6000);
    s.ctx.rng = Math.random; expect(w.hasStatus(p, 'curse')).toBe(true);
    w.applyStatus(p, 'slow', 3); await b.until(() => (b.snap.you.f & F.SLOW) !== 0);
    const speedNormal = p.stats.moveSpeed; p.dirx = 1; p.lastInput = w.now; const x0 = p.x; await b.sleep(400);
    expect(p.x - x0).toBeLessThan(speedNormal * 0.4 * 0.7);
    await b.leave();
  });
});

describe('B7 ölüm cezası ve bölge kuralları', () => {
  test('riskli bölgede yaratığa ölünce az deneyim kaybı; yurda doğar', async () => {
    const b = await fresh(); const p = playerOf(s, b); p.d.level = 25; p.d.xp = 100000; const w = worldOf(s, b); w.recalc(p);
    const m = mobAt(s, b, 'tepegoz', 60, 1.5, 0, 1); m.target = b.id;
    await b.until(() => p.deadUntil > 0, 8000);
    const loss = Math.round(xpToNext(25) * deathXpLoss(25));
    expect(p.d.xp).toBe(100000 - Math.min(100000, loss)); expect(p.d.level).toBe(25);
    await b.sleep(3100); expect((await b.rpc('respawn')).ok).toBe(true);
    expect(Math.hypot(p.x, p.z)).toBeLessThan(HUB_R); expect(p.hp).toBe(p.stats.maxHp);
    await b.leave();
  });
  test('güvenli bölgede yaratık saldırmaz, oyuncu oyuncuya hasar veremez', async () => {
    const a = await fresh('gok', 'GA'); const c = await fresh('yer', 'GB');
    tp(s, a, 0, 20); tp(s, c, 1.5, 20); const w = worldOf(s, a);
    const hp = playerOf(s, c).hp; const m = mobAt(s, c, 'cakal', 1, 1, 0, 3); m.target = c.id;
    a.send('atk', { on: true, focus: c.id }); a.send('sk', 0); await a.sleep(1200);
    expect(playerOf(s, c).hp).toBe(hp);
    expect(w.canHitPlayer(playerOf(s, a), playerOf(s, c), true)).toBe(false);
    a.send('atk', { on: false }); await a.leave(); await c.leave();
  });
});

describe('C2/C3/C4 PvP, derece, muhafız, düello', () => {
  test('PvP bilinçli başlar: alan becerisi, hedef seçilmemiş/çatışmaya girmemiş oyuncuya zarar vermez; hedef seçilince farklı boy vurulur, aynı boy vurulmaz', async () => {
    const a = await fresh('gok', 'PA'); const e = await fresh('yer', 'PE'); const f = await fresh('gok', 'PF');
    for (const b of [e, f]) tp(s, b, FAR.x + 2, FAR.z);
    const hpE = playerOf(s, e).hp, hpF = playerOf(s, f).hp;
    a.send('sk', 0); await a.sleep(500);                               // yan hasar: kimse hedef değil
    expect(playerOf(s, e).hp).toBe(hpE); expect(playerOf(s, f).hp).toBe(hpF);
    const pa = playerOf(s, a); pa.focus = playerOf(s, e).id; pa.cds = [0, 0, 0, 0, 0, 0];        // karşı boydan oyuncu bilinçli hedef
    a.send('sk', 0); await a.sleep(500);
    expect(playerOf(s, e).hp).toBeLessThan(hpE); expect(playerOf(s, f).hp).toBe(hpF);
    await a.leave(); await e.leave(); await f.leave();
  });
  test('derece: kendi boyunu veya savaşmayan oyuncuyu öldüren derece kaybeder, adı kırmızı olur, muhafız vurur, yaratık avlayarak geri kazanır', async () => {
    const k = await fresh('gok', 'Zalim'); const v = await fresh('gok', 'Kurban'); const w = worldOf(s, k);
    const pk = playerOf(s, k), pv = playerOf(s, v); tp(s, v, FAR.x + 1, FAR.z);
    pv.lastAggro = Date.now(); pv.lastPvpAgg = 0; w.killPlayer(pv, pk);   // yaratıkla dövüşüyordu ama oyuncuya saldırmadı → savaşmayan sayılır
    expect(pk.d.rank).toBe(-1); await k.until(() => k.me.rank === -1);
    await waitSnap(v, 2); await waitSnap(anchor, 2);
    tp(s, k, 3, 3); await waitSnap(anchor, 3);
    const seen = anchor.snap.players.find((p) => p.i === k.id)!; expect((seen.f & F.RED) !== 0).toBe(true);
    const hp0 = pk.hp; await k.until(() => pk.hp < hp0, 3000); // şehir muhafızı saldırır
    expect(k.evs.some((e) => e.k === 'guard') || anchor.evs.some((e) => e.k === 'guard')).toBe(true);
    pk.d.rankKills = 19; pk.deadUntil = 0; pk.hp = pk.stats.maxHp; tp(s, k, FAR.x, FAR.z);
    const m = mobAt(s, k, 'cakal', 1, 1.5, 0, 0.05); m.nextAtk = Infinity; k.send('atk', { on: true });
    await k.until(() => pk.d.rank === 0, 6000); k.send('atk', { on: false });
    await k.leave(); await v.leave();
  });
  test('kırmızı adlı oyuncu ölünce eşya düşürebilir; kırmızıyı öldüren ceza almaz', async () => {
    const k = await fresh('yer', 'Av'); const red = await fresh('gok', 'Kirmizi'); const w = worldOf(s, k);
    const pr = playerOf(s, red), pk = playerOf(s, k); pr.d.rank = -1; tp(s, red, FAR.x, FAR.z + 1);
    pr.d.items.push(makeItem(() => 0.5, 'weapon', 3, 0));
    s.ctx.rng = () => 0.1; // eşya düşürme şansı tutsun
    w.killPlayer(pr, pk); s.ctx.rng = Math.random;
    expect(pk.d.rank).toBe(0); expect(pr.d.items.length).toBe(0);
    await k.until(() => k.snap.drops.some((d) => d.k === 'item')); await k.leave(); await red.leave();
  });
  test('düello: yalnızca güvenli bölgede, kabul ile başlar, ölümle bitmez', async () => {
    const a = await fresh('gok', 'DA'); const c = await fresh('yer', 'DB'); tp(s, a, 0, 20); tp(s, c, 1.5, 20);
    expect((await a.rpc('duel', { name: c.name })).ok).toBe(true);
    await c.until(() => c.chat.some((m) => m.key === 'sys.duel_invite'));
    expect((await c.rpc('duelAccept')).ok).toBe(true);
    const pa = playerOf(s, a), pc = playerOf(s, c); pc.hp = 5;
    a.send('atk', { on: true, focus: c.id });
    await a.until(() => pa.duelWith === 0, 5000); a.send('atk', { on: false });
    expect(pc.hp).toBe(1); expect(pc.deadUntil).toBe(0);
    tp(s, a, FAR.x, FAR.z); expect((await a.rpc('duel', { name: c.name })).err).toBe('duel_safe_only');
    await a.leave(); await c.leave();
  });
});

describe('D1/D2 ilerleme: kut puanı, dinlenmiş deneyim', () => {
  test('seviye sınırından sonra deneyim Kut puanına döner ve istatistiği kalıcı artırır', async () => {
    const b = await fresh(); const p = playerOf(s, b); const w = worldOf(s, b); p.d.level = 50; w.recalc(p);
    const atk0 = p.stats.atk; w.addXp(p, 4000, false);
    expect(p.d.level).toBe(50); expect(p.d.kut).toBe(2); expect(p.stats.atk).toBeGreaterThan(atk0);
    await b.leave();
  });
  test('seviye atlama: deneyim eğrisine göre atlar, yetenek puanı verir, canı doldurur', async () => {
    const b = await fresh(); const p = playerOf(s, b); const w = worldOf(s, b);
    w.addXp(p, xpToNext(1) + xpToNext(2) + 1, false);
    expect(p.d.level).toBe(3); expect(p.d.skillPts).toBe(2); expect(p.hp).toBe(p.stats.maxHp);
    expect(computeStats({ level: 3, boy: 'gok', spec: 'none', equip: {}, kut: 0 }).maxHp).toBe(p.stats.maxHp);
    await b.leave();
  });
  test('dinlenmiş deneyim: çevrimdışıyken birikir, 1,5 seviyede kapanır, yaratık deneyimini 2 katlar; yurtta daha hızlı', async () => {
    const mk = async (inHub: boolean) => {
      const name = uniq(inHub ? 'Dinh' : 'Dinr'); let b = await new Bot(s.url, name).join('gok');
      if (inHub) tp(s, b, 0, 20); else tp(s, b, FAR.x, FAR.z);
      playerOf(s, b).d.level = 10; await b.leave(); await anchor.sleep(100);
      s.advance(4 * 3600 * 1000);
      b = await new Bot(s.url, name).join(); return b;
    };
    const h = await mk(true); const r = await mk(false);
    expect(h.me.rested).toBeGreaterThan(r.me.rested * 1.4); expect(h.me.rested).toBeLessThanOrEqual(h.me.restedCap);
    await h.leave(); await anchor.sleep(100);
    s.advance(400 * 3600 * 1000);
    const h2 = await new Bot(s.url, h.name).join(); expect(h2.me.rested).toBe(h2.me.restedCap);
    expect(h2.me.restedCap).toBe(Math.round(xpToNext(h2.me.level) * 1.5));
    // 2 kat
    const w = worldOf(s, h2); const p = playerOf(s, h2); const base = mobXp(10);
    p.d.rested = 100000; const x0 = p.d.xp; w.addXp(p, base, true); const gain = p.d.xp - x0 + 0;
    expect(gain).toBe(base * 2);
    p.d.rested = 0; const x1 = p.d.xp; w.addXp(p, base, true); expect(p.d.xp - x1).toBe(base);
    await h2.leave(); await r.leave();
  });
});
void HUB; void SKILLS;
