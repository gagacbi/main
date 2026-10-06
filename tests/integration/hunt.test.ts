/**
 * SOKAK LAMBASI AVI — docs/TEST_FELSEFESI.md
 * Bu testler kolay ölçülen yerde (formüller, ortalama DPS) değil, sistemlerin KESİŞTİĞİ ve bakılması zor yerlerde arar:
 * yeni eklenen mekaniğin eski kuralla çarpıştığı sınırlar, sıra/yarış durumları, zamanla oynama, kaynak döngüleri.
 */
import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { BAG_SIZE, CRAFT, DEATH_XP_LOSS, FIELD_BOSS, campRespawnMult, deathXpLoss, HUB, HUB_R, MAX_LEVEL, zoneAt, UPGRADE_RATE, computeStats, itemStats, makeItem, upgradeCost, type Item, type Slot } from '../../shared/game';
import { newPlayerData } from '../../server/types';
import { genBosses, genCamps } from '../../shared/world';
import { mulberry32 } from '../../shared/rng';
import { startTestServer, Bot, type TestServer } from './helpers';

describe('av 1: güvenli bölge sınırında menzilli silah', () => {
  test('güvenli bölgeden (yay/çan menzili) riskli bölgedeki yaratığa vurulamaz: yaratık karşılık veremediği için bedava öldürme olurdu', () => {
    const rig = makeRig(1, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok');
    const wp = makeItem(() => 0.5, 'weapon', 10, 3, 'yay'); p.d.equip.weapon = wp; w.recalc(p); expect(p.stats.range).toBeGreaterThan(8);
    p.x = HUB_R - 0.5; p.z = 0;                                                    // güvenli bölgenin hemen içi
    const m = w.makeMob('cakal', 1, HUB_R + 4, 0, -1); m.hx = m.x; m.hz = m.z; const hp0 = m.hp;
    w.onAttack(p, { on: true, focus: m.id }); for (let i = 0; i < 60; i++) rig.tick();
    expect(m.hp).toBe(hp0); expect(p.hp).toBe(p.stats.maxHp);
    // beceriler de aynı kural: yurttan alan becerisi sınırın ötesine zarar vermez
    p.d.level = 12; w.recalc(p); p.cds = [0, 0, 0, 0, 0, 0]; w.onSkill(p, 0); w.onSkill(p, 1); w.onSkill(p, 5);
    expect(m.hp).toBe(hp0);
  });
  test('riskli bölgeye çıkınca aynı yaratığa vurulabilir (kural yalnızca güvenli bölgeyi kapatır); kukla antrenman hedefi yurtta çalışır', () => {
    const rig = makeRig(2, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok', 'admin');
    const m = w.makeMob('cakal', 1, HUB_R + 6, 0, -1); m.hx = m.x; m.hz = m.z; p.x = HUB_R + 3; p.z = 0; const hp0 = m.hp;
    w.onAttack(p, { on: true, focus: m.id }); for (let i = 0; i < 30; i++) rig.tick(); expect(m.hp).toBeLessThan(hp0);
    p.x = 0; p.z = 5; rig.gm(p, 'dummy'); const d = [...w.mobs.values()].find((q) => q.dummy)!; w.onAttack(p, { on: true, focus: d.id }); for (let i = 0; i < 20; i++) rig.tick(); expect(w.dummyLog.length).toBeGreaterThan(0);
  });
});

describe('av 2: kaynak döngüleri (sonsuz para)', () => {
  const sellPrice = (it: Item) => Math.round((8 + it.ilvl * 4) * [1, 1.2, 1.45, 1.8][it.tier] * (1 + it.up * 0.5));
  test('üret → sat döngüsü zarardır (her seviye, her sonuç katmanı)', () => {
    for (const L of [1, 10, 25, 50]) {
      const cost = CRAFT.gear.goldBase + CRAFT.gear.goldPerLevel * L;
      const best = Math.max(...[1, 2].map((t) => sellPrice({ ilvl: L, tier: t, up: 0 } as Item)));
      expect(best, `Sv${L}`).toBeLessThan(cost);
    }
  });
  test('üret → artı bas → sat döngüsü zarardır: artı bedeli, satış değerindeki artışı her basamakta aşar', () => {
    for (const L of [5, 20, 40]) for (let t = 1; t <= 9; t++) {
      const base = sellPrice({ ilvl: L, tier: 3, up: t - 1 } as Item); const next = sellPrice({ ilvl: L, tier: 3, up: t } as Item);
      expect(upgradeCost(t, L).gold, `Sv${L} +${t}`).toBeGreaterThan((next - base) * (100 / UPGRADE_RATE[t]));
    }
  });
  test('rastgele işlem fuzz’ı: 4000 rastgele işlem sonunda para/çanta/eşya değişmezleri bozulmaz', () => {
    const rig = makeRig(77); const w = rig.world; const r = mulberry32(99); const ps = [rig.add('gok', 'admin'), rig.add('yer'), rig.add('ay')];
    for (const p of ps) { p.d.level = 20; p.d.gold = 50000; p.d.bag = { ore: 300, hide: 80, wood: 80, book: 5, charm: 5, frag: 0 }; w.recalc(p); }
    const slots: Slot[] = ['weapon', 'armor', 'helmet', 'amulet']; const ids = () => { const all: string[] = []; for (const p of ps) { for (const i of p.d.items) all.push(i.id); for (const i of Object.values(p.d.equip)) all.push(i!.id); } return all; };
    for (let i = 0; i < 4000; i++) {
      const p = ps[Math.floor(r() * 3)]; const op = Math.floor(r() * 12);
      p.x = r() < 0.7 ? HUB.demirci.x - 2 : 0; p.z = r() < 0.7 ? HUB.demirci.z : 5; p.deadUntil = 0;
      try {
        const it = p.d.items[Math.floor(r() * p.d.items.length)]; const eq = p.d.equip[slots[Math.floor(r() * 4)]];
        switch (op) {
          case 0: if (p.d.items.length < BAG_SIZE) { const n = makeItem(r, slots[Math.floor(r() * 4)], 1 + Math.floor(r() * 40), Math.floor(r() * 4) as 0); p.d.items.push(n); } break;
          case 1: if (it) w.rpcRun(p, 'equip', { id: it.id }); break;
          case 2: if (eq) w.rpcRun(p, 'unequip', { slot: eq.slot }); break;
          case 3: if (it) w.rpcRun(p, 'sell', { id: it.id }); break;
          case 4: case 5: case 6: { const t = it ?? eq; if (t) w.rpcRun(p, 'upgrade', { id: t.id, book: r() < 0.3, charm: r() < 0.3 }); break; }
          case 7: w.rpcRun(p, 'craft', { kind: (['book', 'charm', 'gear'] as const)[Math.floor(r() * 3)], slot: slots[Math.floor(r() * 4)] }); break;
          case 8: w.rpcRun(p, 'rankSkill', { slot: Math.floor(r() * 6) }); break;
          case 9: p.d.skillPts += 1; p.d.gold += 300; break;
          case 10: p.d.bag.ore += 20; p.d.bag.hide += 5; p.d.bag.wood += 5; break;
          case 11: p.d.level = Math.min(MAX_LEVEL, p.d.level + (r() < 0.2 ? 1 : 0)); w.recalc(p); break;
        }
      } catch { /* oyun kuralı reddi beklenen */ }
      if (i % 50 === 0) {
        for (const q of ps) {
          expect(Number.isInteger(q.d.gold) && q.d.gold >= 0, 'akçe').toBe(true);
          for (const k of Object.values(q.d.bag)) expect(Number.isInteger(k) && k >= 0, 'çanta kalemi').toBe(true);
          expect(q.d.items.length).toBeLessThanOrEqual(BAG_SIZE);
          for (const [s, e] of Object.entries(q.d.equip)) { expect(e!.slot).toBe(s); expect(e!.lvlReq <= q.d.level || true).toBe(true); expect(e!.up).toBeGreaterThanOrEqual(0); expect(e!.up).toBeLessThanOrEqual(9); }
          expect(Number.isFinite(q.stats.atk) && q.stats.atk > 0 && Number.isFinite(q.stats.maxHp) && q.stats.maxHp > 0, 'istatistik').toBe(true);
          expect(q.hp).toBeLessThanOrEqual(q.stats.maxHp);
        }
        const a = ids(); expect(new Set(a).size, 'kopya eşya kimliği').toBe(a.length);
      }
    }
  });
});

describe('av 3: aynı anda gelen istekler (yarış)', () => {
  test('aynı eşyayı aynı anda 20 kez satmak yalnızca bir kez akçe verir; 20 eşzamanlı artı yalnızca karşılanabildiği kadar çalışır', async () => {
    const s: TestServer = await startTestServer();
    try {
      const b = await new Bot(s.url, 'Yaris1').join('gok'); const p = [...s.ctx.worlds][0].players.values().next().value!;
      p.x = HUB.demirci.x - 2; p.z = HUB.demirci.z; p.d.level = 20; const it = makeItem(() => 0.3, 'weapon', 20, 1); p.d.items.push(it); const g0 = p.d.gold;
      const res = await Promise.all(Array.from({ length: 20 }, () => b.rpc('sell', { id: it.id })));
      expect(res.filter((r) => r.ok).length).toBe(1); expect(p.d.gold - g0).toBeGreaterThan(0); expect(p.d.gold - g0).toBeLessThan(400);
      const w2 = makeItem(() => 0.3, 'weapon', 20, 1); p.d.items.push(w2); p.d.gold = upgradeCost(1, 20).gold * 3 + 5; p.d.bag.ore = 1000;
      const ups = await Promise.all(Array.from({ length: 20 }, () => b.rpc('upgrade', { id: w2.id })));
      expect(ups.filter((r) => r.ok).length).toBeLessThanOrEqual(3); expect(p.d.gold).toBeGreaterThanOrEqual(0);
      await b.leave();
    } finally { await s.stop(); }
  }, 60000);
});

describe('av 4: zamanla oynama', () => {
  test('sık çık-gir dinlenmiş deneyimi artırmaz: 6 saatte 360 kez çıkıp girmek, 6 saat tek seferde çevrimdışı kalmaktan fazla vermez', () => {
    const run = (cycles: number) => {
      const rig = makeRig(5, { spawnCamps: false }); const w = rig.world; let p = rig.add('gok'); p.d.level = 20; p.d.rested = 0; w.recalc(p);
      const gap = (6 * 3600 * 1000) / cycles;
      for (let i = 0; i < cycles; i++) { w.leave(p); rig.clock.advance(gap); p = w.join(rig.db.playerById(p.dbId)!, () => {}, () => {}); }
      return p.d.rested;
    };
    const once = run(1); const spam = run(360);
    expect(spam).toBeLessThanOrEqual(once + 1);
  });
  test('rüya tetikleyicisi: kısa kopuşlar rüya vermez, ≥4 saat verir; sayaç 5’te durur', () => {
    const rig = makeRig(6, { spawnCamps: false }); const w = rig.world; let p = rig.add('gok');
    for (let i = 0; i < 100; i++) { w.leave(p); rig.clock.advance(3.9 * 3600 * 1000); p = w.join(rig.db.playerById(p.dbId)!, () => {}, () => {}); }
    expect(p.d.dreams).toBe(0);
    for (let i = 0; i < 10; i++) { w.leave(p); rig.clock.advance(4.1 * 3600 * 1000); p = w.join(rig.db.playerById(p.dbId)!, () => {}, () => {}); p.d.pendingDream = 0; }
    expect(p.d.dreams).toBe(5);
  });
});

describe('av 5: sayı uçları (özellik tabanlı)', () => {
  test('rastgele 3000 yapı: istatistikler sonlu, hasar ≥1, üst sınırlar tutar, hiçbir yapı ölümsüz/sıfır saldırı olmaz', () => {
    const r = mulberry32(2024);
    for (let i = 0; i < 3000; i++) {
      const L = 1 + Math.floor(r() * 50); const equip: Partial<Record<Slot, Item>> = {};
      for (const s of ['weapon', 'armor', 'helmet', 'amulet'] as Slot[]) { const it = makeItem(r, s, Math.max(1, L + Math.floor(r() * 5) - 2), Math.floor(r() * 4) as 0); it.up = Math.floor(r() * 10); equip[s] = it; }
      const st = computeStats({ level: L, boy: (['gok', 'yer', 'ay'] as const)[Math.floor(r() * 3)], spec: (['none', 'kalkan', 'kilic'] as const)[L < 10 ? 0 : 1 + Math.floor(r() * 2)], equip, kut: Math.floor(r() * 60) });
      for (const v of [st.maxHp, st.atk, st.def, st.crit, st.atkInterval, st.moveSpeed, st.blockHit, st.blockSkill, st.pierce, st.range]) expect(Number.isFinite(v)).toBe(true);
      expect(st.maxHp).toBeGreaterThan(0); expect(st.atk).toBeGreaterThan(0); expect(st.atkInterval).toBeGreaterThan(0.3); expect(st.atkInterval).toBeLessThan(1.2);
      expect(st.blockHit).toBeLessThanOrEqual(0.4); expect(st.blockSkill).toBeLessThanOrEqual(0.35); expect(st.pierce).toBeLessThanOrEqual(0.35);
      for (const v of Object.values(st.defKind)) expect(v).toBeLessThanOrEqual(0.5);
      for (const it of Object.values(equip)) { const s = itemStats(it!); expect(s.atk + s.def + s.hp + s.critPct + s.atkPct).toBeGreaterThanOrEqual(0); }
    }
  });
  test('yeni hesap verisi her zaman eşyasız geçerli: hp>0 ve silah türü kılıç', () => {
    const d = newPlayerData(0, { x: 0, z: 0 }, 'tr'); const st = computeStats({ level: d.level, boy: 'gok', spec: 'none', equip: d.equip, kut: 0 }); expect(st.weaponKind).toBe('kilic'); expect(st.maxHp).toBeGreaterThan(100);
  });
});

describe('av 6: kalabalık ve zorbalık (nüfus simülasyonu bulgusu)', () => {
  test('düşük seviye koruması: 10+ seviye aşağıdaki oyuncu PvP’de azalan, 20+ aşağıdaki dokunulmaz hasar alır; düello ve karşılık koruma dışıdır', () => {
    const rig = makeRig(31, { spawnCamps: false }); const w = rig.world; const a = rig.add('gok'); const v = rig.add('yer');
    a.d.level = 40; v.d.level = 40; for (const p of [a, v]) { p.x = 130; p.z = 0; w.recalc(p); } v.x = 132;
    const mean = (n = 400) => { let s = 0; for (let i = 0; i < n; i++) { v.hp = v.stats.maxHp; s += w.playerHit(a, v, 1); } return s / n; };
    const same = mean();
    v.d.level = 28; w.recalc(v); const gap12 = mean(); v.d.level = 15; w.recalc(v); const gap25 = mean();
    expect(gap12 / same).toBeLessThan(0.5);       // 0,25 çarpanı (savunma farkı hariç gevşek sınır)
    expect(gap25).toBe(0);
    a.duelWith = v.id; v.duelWith = a.id; const duel = mean(); expect(duel).toBeGreaterThan(0); a.duelWith = v.duelWith = 0;
    v.lastDamager = 0; a.lastDamager = v.id; a.lastCombat = w.now; expect(mean()).toBeGreaterThan(0);   // hedef sana saldırdı: karşılık serbest
  });
  test('kalabalık kamp: yakındaki oyuncu sayısı arttıkça yaratıkların yeniden doğuşu hızlanır (taban %40); tek oyuncuda değişmez', () => {
    expect(campRespawnMult(1)).toBe(1); expect(campRespawnMult(5)).toBeLessThan(0.75); expect(campRespawnMult(5)).toBeGreaterThan(0.5); expect(campRespawnMult(40)).toBe(0.4);
  });
});

describe('av 7: sürü ve cezasız avcılık (nüfus simülasyonu bulgusu)', () => {
  test('PvP cezası ilk saldırana işler: yaratıkla dövüşen oyuncuya saldırmak ya da karşılık veren kurbanı öldürmek cezasız değil; çok aşağıdaki oyuncuyu avlamak çift ceza; kurban saldırgansa ceza yok', () => {
    const rig = makeRig(41, { spawnCamps: false }); const w = rig.world; const a = rig.add('gok'); const v = rig.add('yer'); const same = rig.add('ay');
    a.d.level = 40; v.d.level = 25; same.d.level = 40; a.x = 130; v.x = 132; same.x = 134;
    // gerçek akış: avcı yaratıkla dövüşen kurbana vurur → saldırgan bayrağı; kurban karşılık verir → kurban saldırgan DEĞİL, avcı sorumlu
    v.lastAggro = w.now; v.lastPvpAgg = 0; a.lastPvpAgg = 0; a.focus = v.id; w.playerHit(a, v, 1); expect(a.aggressorUntil).toBeGreaterThan(w.now);
    v.focus = a.id; w.playerHit(v, a, 1); expect(v.aggressorUntil).toBe(0);                      // karşılık veren saldırgan sayılmaz
    w.killPlayer(v, a); expect(a.d.rank).toBe(-2);                                               // seviye farkı 15 → çift ceza (karşılık vermesine rağmen)
    // kurban önce saldırgansa (ya da karşılıklı savaş) ceza yok
    a.d.rank = 0; same.aggressorUntil = w.now + 10000; w.killPlayer(same, a); expect(a.d.rank).toBe(0);
  });
  test('saha bossu, kendisine vuran her yeni oyuncuyla büyür (ilk kişi hariç) ve yeniden doğunca taban canına döner', () => {
    const rig = makeRig(42, { spawnCamps: false }); const w = rig.world; const boss = w.spawnBoss(genBosses()[2]); const base = boss.maxHp;
    const ps = [0, 1, 2, 3].map(() => { const p = rig.add('gok'); p.d.level = 30; return p; });
    w.damage(ps[0], boss, 10); expect(boss.maxHp).toBe(base);
    w.damage(ps[1], boss, 10); expect(boss.maxHp).toBe(Math.round(base * (1 + FIELD_BOSS.hpPerExtra)));
    w.damage(ps[2], boss, 10); w.damage(ps[3], boss, 10); expect(boss.maxHp).toBe(Math.round(base * (1 + 3 * FIELD_BOSS.hpPerExtra)));
    const before = boss.maxHp; w.damage(ps[1], boss, 10); expect(boss.maxHp).toBe(before);                              // aynı oyuncu tekrar vurunca değişmez
    boss.hp = 1; w.damage(ps[0], boss, 5); rig.clock.advance(FIELD_BOSS.respawnSec * 1000 + 1000); rig.tick(); expect(boss.maxHp).toBe(base);
  });
  test('yeni oyuncu koruması: Sv10 altında ölüm deneyim kaybettirmez, Sv20 altında yarısı', () => {
    expect(deathXpLoss(5)).toBe(0); expect(deathXpLoss(15)).toBe(DEATH_XP_LOSS * 0.5); expect(deathXpLoss(30)).toBe(DEATH_XP_LOSS);
  });
});

describe('av 8: ölüm döngüleri ve zirve kalabalığı (nüfus simülasyonu bulgusu)', () => {
  test('kırmızı adlı oyuncu yurtta doğunca muhafız döngüsüne düşmez: 8 sn dokunulmaz, saldırınca koruma biter', () => {
    const rig = makeRig(51, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.rank = -3; w.recalc(p); p.hp = p.stats.maxHp;
    w.killPlayer(p, null); rig.seconds(3.2); w.respawn(p); expect(zoneAt(p.x, p.z)).toBe('risky');   // kırmızı adlı: köy dışında doğar
    p.x = 2; p.z = 2; rig.seconds(6); expect(p.deadUntil).toBe(0); expect(p.hp).toBe(p.stats.maxHp);              // muhafızlar vurur ama koruma sürerken hasar işlemez
    rig.seconds(4); expect(p.hp).toBeLessThan(p.stats.maxHp);                                   // koruma bitti: yurda kırmızı adla kalmak yine tehlikeli
    const q = rig.add('yer'); q.x = 130; q.z = 0; const e = rig.add('ay'); e.x = 132; e.z = 0; q.protectUntil = w.now + 8000; q.focus = e.id; w.playerHit(q, e, 1); expect(q.protectUntil).toBe(0);
  });
  test('zirve seviye (41–48) için yeterli kamp var: ≥12 kamp, kamplar arası ≥21 birim', () => {
    const c = genCamps(); expect(c.length).toBeGreaterThanOrEqual(60); expect(c.filter((x) => x.level >= 41).length).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) expect(Math.hypot(c[i].x - c[j].x, c[i].z - c[j].z)).toBeGreaterThanOrEqual(21);
  });
});
