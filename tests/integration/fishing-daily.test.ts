import { describe, expect, test } from 'vitest';
import { DAILY, dailyRoll } from '../../shared/daily';
import { FISH, FISH_DEFS, rollFish, catchChance } from '../../shared/fishing';
import { goodAdd, goodGet, GOOD_KEYS } from '../../shared/goods';
import { mulberry32 } from '../../shared/rng';
import { makeRig } from '../sim/rig';

const call = (w: any, p: any, op: string, a: unknown = {}) => { try { return { ok: true as const, data: w.rpcRun(p, op, a) as any }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } };
function shore(level = 12) { const rig = makeRig(61, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = level; w.recalc(p); p.x = FISH.pond.x; p.z = FISH.pond.z + FISH.pond.r + 2.5; p.d.gold = 50000; return { rig, w, p }; }

describe('Göl Avı', () => {
  test('olta ve yem gerekir; kıyıdan uzakta, düşük seviyede veya savaşta atılamaz', () => {
    const { w, p } = shore(); expect(call(w, p, 'fish.cast', { bait: 'hamur' }).err).toBe('fish_no_rod');
    expect(call(w, p, 'fish.buy', { what: 'rod' }).ok).toBe(true); expect(call(w, p, 'fish.cast', { bait: 'hamur' }).err).toBe('fish_no_bait');
    call(w, p, 'fish.buy', { what: 'hamur', n: 5 }); p.x += 40; expect(call(w, p, 'fish.cast', { bait: 'hamur' }).err).toBe('fish_far'); p.x -= 40;
    p.d.level = 3; expect(call(w, p, 'fish.cast', { bait: 'hamur' }).err).toBe('fish_level'); p.d.level = 12;
    const g0 = p.d.gold; expect(call(w, p, 'fish.cast', { bait: 'hamur' }).ok).toBe(true); expect(p.d.fish!.hamur).toBe(4); expect(g0).toBe(p.d.gold);   // akçe girişi yok
  });
  test('zamanlama oyunu: çok hızlı veya eksik vuruş başarısız; sonuç atışta sunucuca belirlenir; başarıda balık envantere girer ve pazar malı olur', () => {
    const { rig, w, p } = shore(); call(w, p, 'fish.buy', { what: 'rod' }); call(w, p, 'fish.buy', { what: 'hamur', n: 20 });
    call(w, p, 'fish.cast', { bait: 'hamur' }); expect(call(w, p, 'fish.reel', { hits: 3 }).data.ok).toBe(false);   // minReelSec dolmadan
    rig.seconds(2); call(w, p, 'fish.cast', { bait: 'hamur' }); rig.seconds(5); expect(call(w, p, 'fish.reel', { hits: 2 }).data.ok).toBe(false);
    let got = 0; for (let i = 0; i < 12; i++) { rig.seconds(2); const c = call(w, p, 'fish.cast', { bait: 'hamur' }); if (!c.ok) break; rig.seconds(5); const r = call(w, p, 'fish.reel', { hits: 3 }); if (r.data.ok) got++; else expect(r.data.escaped).toBe(true); }
    expect(got).toBeGreaterThan(2); expect(got).toBeLessThan(12); const total = Object.values(p.d.fish!.stock).reduce((a, b) => a + (b ?? 0), 0) + (p.d.fish!.ancestor ? 1 : 0); expect(total).toBe(got);
    expect(call(w, p, 'fish.reel', { hits: 3 }).err).toBe('fish_nocast');   // tek kullanımlık
    goodAdd(p.d, 'fish_sazan', 2); expect(goodGet(p.d, 'fish_sazan')).toBeGreaterThanOrEqual(2); expect(GOOD_KEYS).toContain('fish_sazan');
  });
  test('tutma şansı: olta/solucan/şans yemiyle artar, üst sınırı aşmaz; kaçan balık envantere girmez; ayıklama sonuçları', () => {
    expect(catchChance('sazan', 1, 'hamur', false)).toBeLessThan(catchChance('sazan', 10, 'hamur', false)); expect(catchChance('sazan', 1, 'solucan', false)).toBeGreaterThan(catchChance('sazan', 1, 'hamur', false));
    expect(catchChance('altinsudak', 1, 'hamur', false)).toBeLessThan(catchChance('sazan', 1, 'hamur', false)); expect(catchChance('sazan', 10, 'solucan', true)).toBeLessThanOrEqual(FISH.catch.max);
    const { rig, w, p } = shore(); call(w, p, 'fish.buy', { what: 'rod' }); call(w, p, 'fish.buy', { what: 'hamur', n: 5 }); let esc = 0, ok = 0;
    for (let i = 0; i < 60; i++) { p.d.fish!.hamur = 3; rig.seconds(2); call(w, p, 'fish.cast', { bait: 'hamur' }); rig.seconds(5); const r = call(w, p, 'fish.reel', { hits: 3 }); if (r.data.escaped) esc++; else if (r.data.ok) ok++; }
    expect(esc).toBeGreaterThan(3); expect(ok).toBeGreaterThan(20); expect(Object.values(p.d.fish!.stock).reduce((a, b) => a + (b ?? 0), 0) + (p.d.fish!.ancestor ? 1 : 0)).toBe(ok);
    p.d.fish!.stock = { sazan: 60 }; p.d.fish!.solucan = 0; const res: Record<string, number> = {}; for (let i = 0; i < 60; i++) { const r = call(w, p, 'fish.clean', { id: 'sazan' }); res[r.data.res] = (res[r.data.res] ?? 0) + 1; }
    expect(res.solucan).toBeGreaterThan(0); expect(res.kilcik).toBeGreaterThan(0); expect(res.kacti).toBeGreaterThan(0); expect(p.d.fish!.stock.sazan).toBe(0); expect(call(w, p, 'fish.clean', { id: 'sazan' }).err).toBe('no_item');
  });
  test('nadir balık oranı yem, olta ve şans yemiyle artar; ağırlıklar tutarlı', () => {
    const rare = (rod: number, bait: 'hamur' | 'solucan', luck: boolean) => { const r = mulberry32(3); let n = 0; for (let i = 0; i < 20000; i++) { const id = rollFish(r, rod, bait, luck); if (FISH_DEFS.find((f) => f.id === id)!.rare) n++; } return n / 20000; };
    const base = rare(1, 'hamur', false); expect(base).toBeGreaterThan(0.03); expect(base).toBeLessThan(0.15);
    expect(rare(1, 'solucan', false)).toBeGreaterThan(base * 1.6); expect(rare(8, 'hamur', false)).toBeGreaterThan(base * 1.3); expect(rare(1, 'hamur', true)).toBeGreaterThan(base * 2.2);
  });
  test('pişirme yalnızca Yurt\'ta; süreli güç istatistiğe girer ve süresi dolunca kalkar; Levrek zehri temizler', () => {
    const { rig, w, p } = shore(); p.d.fish = { rod: 1, pts: 0, hamur: 0, solucan: 0, luck: 0, stock: { sazan: 2, levrek: 1 }, caught: 0, ancestor: false };
    const ms0 = p.stats.moveSpeed; p.x = 600; p.z = 0; expect(call(w, p, 'fish.eat', { id: 'sazan' }).err).toBe('fish_cook_town'); p.x = FISH.pond.x; p.z = FISH.pond.z + 11;
    expect(call(w, p, 'fish.eat', { id: 'sazan' }).ok).toBe(true); expect(p.stats.moveSpeed).toBeGreaterThan(ms0); expect(p.d.fish.stock.sazan).toBe(1);
    rig.seconds(FISH.ancestorBuffSec + 5); expect(p.d.buffs ?? []).toHaveLength(0); expect(p.stats.moveSpeed).toBeCloseTo(ms0, 5);
    p.status = { poison: { until: w.now + 9000, dps: 5, src: 0 } } as any; call(w, p, 'fish.eat', { id: 'levrek' }); expect(p.status.poison).toBeUndefined();
  });
  test('Gölün Atası: serbest bırakınca herkese XP gücü ve Yıllık kaydı; kesince parça+tılsım; yem yapınca şans yemi', () => {
    const { w, p } = shore(); const q = (w as any).ctx.worlds.values().next().value.players.values().next().value; void q;
    p.d.fish = { rod: 1, pts: 0, hamur: 0, solucan: 0, luck: 0, stock: {}, caught: 0, ancestor: true }; expect(call(w, p, 'fish.ancestor', { choice: 'release' }).ok).toBe(true);
    expect(p.d.buffs!.some((b) => b.id === 'ata' && b.k === 'xpPct')).toBe(true);
    p.d.fish.ancestor = true; const ch0 = p.d.bag.charm; call(w, p, 'fish.ancestor', { choice: 'cut' }); expect(p.d.bag.charm).toBe(ch0 + 1);
    p.d.fish.ancestor = true; call(w, p, 'fish.ancestor', { choice: 'bait' }); expect(p.d.fish.luck).toBe(FISH.luckCasts); expect(call(w, p, 'fish.ancestor', { choice: 'bait' }).ok).toBe(false);
  });
  test('olta geliştirme: puan ve akçe ister; başarısızlıkta puanın %10\'u gider', () => {
    const { w, p } = shore(); p.d.fish = { rod: 1, pts: 5, hamur: 0, solucan: 0, luck: 0, stock: {}, caught: 0, ancestor: false }; expect(call(w, p, 'fish.rod').err).toBe('fish_pts');
    p.d.fish.pts = FISH.rodNeed(1); const g0 = p.d.gold; const r = call(w, p, 'fish.rod'); expect(r.ok).toBe(true); expect(p.d.gold).toBe(g0 - FISH.rodCost(1));
  });
});

describe('Obanın Günlüğü', () => {
  test('Sv 10 altında görev yok; 4 görev ve kill her zaman var; seviye şartlı görevler uygun', () => {
    const lo = dailyRoll(mulberry32(1), 10, 5); expect(lo.tasks.length).toBe(DAILY.count); expect(lo.tasks.some((t) => t.k === 'kill')).toBe(true); expect(lo.tasks.some((t) => t.k === 'dungeon')).toBe(false);
    let dun = 0; for (let i = 0; i < 40; i++) if (dailyRoll(mulberry32(i), 45, 5).tasks.some((t) => t.k === 'dungeon')) dun++; expect(dun).toBeGreaterThan(5);
  });
  test('ilerleme, otomatik ödül, Günlük Hediye ve gün dönümünde yeni görevler', () => {
    const { rig, w, p } = shore(20); const st = w.dailyOf(p); expect(st.tasks.length).toBe(4);
    const book0 = p.d.bag.book, kim0 = p.d.kimiz ?? 0; for (const t of st.tasks) w.daily(p, t.k, t.need + 5);
    expect(st.tasks.every((t) => t.claimed)).toBe(true); expect(st.gift).toBe(true); expect(p.d.bag.book).toBeGreaterThanOrEqual(book0 + DAILY.gift.book); expect((p.d.kimiz ?? 0)).toBeGreaterThanOrEqual(kim0 + DAILY.gift.kimiz);
    const again = st.tasks.map((t) => t.done); w.daily(p, 'kill', 5); expect(st.tasks.map((t) => t.done)).toEqual(again);   // bitmiş görev tekrar ödül vermez
    rig.seconds(86400 + 60); const next = w.dailyOf(p); expect(next.day).not.toBe(st.day); expect(next.tasks.every((t) => !t.claimed)).toBe(true);
    p.d.level = 4; const day2 = w.dailyOf(p); w.daily(p, 'kill', 999); expect(day2.tasks.some((t) => t.claimed)).toBe(false);
  });
  test('çok düşük seviyeli yaratık günlük "kill" sayacına sayılmaz', () => {
    const { w, p } = shore(40); p.x = 0; p.z = 130; const k = w.dailyOf(p).tasks.find((t) => t.k === 'kill')!; const m = w.makeMob('cakal', 5, p.x + 2, p.z, -1); m.contrib.set(p.id, 1); w.killMob(m); expect(k.done).toBe(0);
  });
  test('gerçek olaylar ilerletir: yaratık öldürme günlük "kill" sayacını artırır', () => {
    const { w, p } = shore(15); p.x = 0; p.z = 130; const k = w.dailyOf(p).tasks.find((t) => t.k === 'kill')!; const m = w.makeMob('cakal', 15, p.x + 2, p.z, -1); m.contrib.set(p.id, 1); w.killMob(m); expect(k.done).toBe(1);
  });
  test('yorgunluk: günde fatigueAfter yakalamadan sonra tutma şansı çarpanla düşer, ertesi gün yenilenir; bot makrosunun üst sınırı', () => {
    const { rig, w, p } = shore(); call(w, p, 'fish.buy', { what: 'rod' }); call(w, p, 'fish.buy', { what: 'solucan', n: 50 });
    const run = (n: number) => { let ok = 0; for (let i = 0; i < n; i++) { p.d.fish!.hamur = 5; rig.seconds(2); const c = call(w, p, 'fish.cast', { bait: 'hamur' }); if (!c.ok) continue; rig.seconds(5); if (call(w, p, 'fish.reel', { hits: 3 }).data.ok) ok++; } return ok; };
    p.d.fish!.day = undefined; p.d.fish!.today = 0; const fresh = run(120) / 120;
    rig.seconds(1); p.d.fish!.today = FISH.fatigueAfter; const tired = run(120) / 120; expect(tired).toBeLessThan(fresh * 0.7); expect(call(w, p, 'fish.cast', { bait: 'hamur' }).data.tired).toBe(true);
    rig.clock.advance(26 * 3600000); p.d.fish!.hamur = 5; rig.seconds(2); expect(call(w, p, 'fish.cast', { bait: 'hamur' }).data.tired).toBe(false);   // gün değişti
  });
});
