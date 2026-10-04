import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { HUB, INSCRIPTIONS, NOVICE_MAX_LEVEL, OBA, TUTORIAL_STEPS } from '../../shared/game';
import type { ObaInfo } from '../../shared/protocol';
import { Bot, playerOf, startTestServer, tp, uniq, waitSnap, type TestServer } from './helpers';

let s: TestServer; let anchor: Bot;
beforeAll(async () => { s = await startTestServer({ cfg: { spawnCamps: false } }); anchor = await new Bot(s.url, 'Capa').join('gok'); });
afterAll(async () => { await anchor.leave(); await s.stop(); });
const atOtag = (b: Bot) => tp(s, b, HUB.otag.x + 8, HUB.otag.z + 6);
async function member(boy: 'gok' | 'yer' | 'ay' = 'yer', n = 'Ob') {
  const b = await new Bot(s.url, uniq(n)).join(boy); atOtag(b); await waitSnap(b);
  // test izolasyonu: oymak durumunu başlangıca al (oymaklar testler arası paylaşılır)
  const o = s.ctx.oymaks.get(playerOf(s, b).oymakId)!; o.lv = { otag: 1, demir: 1 }; o.up = null; o.storage = { ore: 0, hide: 0, wood: 0 };
  return b;
}
const info = async (b: Bot) => (await b.rpc('oba.state')).data as ObaInfo;
const reconnect = async (b: Bot) => { await b.leave(); await anchor.sleep(120); return new Bot(s.url, b.name).join(); };

describe('E1 acemi oymak ve ak sakal', () => {
  test('yeni oyuncu boyunun acemi oymağına otomatik girer; NPC ak sakal ve 2 yoldaş yuvası vardır', async () => {
    const b = await member('ay'); const o = await info(b);
    expect(o.name).toMatch(/Ay|Gümüş|Mor/); expect(o.npc).toMatch(/Ak Sakal/); expect(o.slots).toBe(2); expect(b.me.companions.length).toBe(2);
    expect(o.levels).toEqual({ otag: 1, demir: 1 }); expect(o.maxLevel).toBe(NOVICE_MAX_LEVEL); expect(o.memberCap).toBe(20);
    expect(b.me.oymakName).toBe(o.name); await b.leave();
  });
  test('aynı boyun oyuncuları aynı acemi oymağa düşer; üye sınırı dolunca yenisi açılır', async () => {
    const a = await member('gok', 'Ma'); const c = await member('gok', 'Mb');
    expect(a.me.oymakId).toBe(c.me.oymakId); await a.leave(); await c.leave();
    const other = s.ctx.db.assignNoviceOymak('gok', 1); expect(other.id).not.toBe(a.me.oymakId);
  });
  test('öğretici adımları sırayla ilerler ve ödül verir', async () => {
    const b = await member('yer', 'Tut'); const p = playerOf(s, b);
    expect(b.me.tut).toEqual({ step: 0, prog: 0 });
    for (let i = 0; i < 5; i++) { (await import('./helpers')).worldOf(s, b).tutorial(p, 'kill'); }
    expect(p.d.tut.step).toBe(1); expect(p.d.gold).toBeGreaterThan(150);
    p.d.bag.wood = 10; expect((await b.rpc('oba.donate', { wood: 5 })).ok).toBe(true); expect(p.d.tut.step).toBe(2);
    expect(TUTORIAL_STEPS.length).toBe(5); await b.leave();
  });
});

describe('E2/E3 bina yükseltme', () => {
  test('bitiş zamanı veritabanına yazılır, çevrimdışıyken de ilerler; Demirhane Otağ seviyesini aşamaz', async () => {
    let b = await member('yer', 'Bn'); const p = playerOf(s, b); p.d.gold = 1e6;
    const need = OBA.upgradeRes(2);
    p.d.bag.ore = need.ore * 3; p.d.bag.hide = need.hide * 3; p.d.bag.wood = need.wood * 3;
    expect((await b.rpc('oba.build', { b: 'demir' })).err).toBe('otag_cap'); // Otağ 1 → Demirhane 2 olamaz
    expect((await b.rpc('oba.build', { b: 'otag' })).err).toBe('oba_short');  // ambar boş
    expect((await b.rpc('oba.donate', { ore: need.ore, hide: need.hide, wood: need.wood })).ok).toBe(true);
    const r = await b.rpc('oba.build', { b: 'otag' }); expect(r.ok).toBe(true);
    const o = r.data as ObaInfo; expect(o.upgrade!.to).toBe(2);
    expect(o.upgrade!.finishAt - Date.now()).toBeGreaterThan(OBA.upgradeSec(2) * 1000 - 5000);
    const row = JSON.parse(s.ctx.db.oymak(p.oymakId)!.data); expect(row.up.finishAt).toBe(o.upgrade!.finishAt); // DB'de bitiş zamanı
    expect((await b.rpc('oba.build', { b: 'demir' })).err).toBe('upgrade_busy');
    b = await reconnect(b);                                           // çevrimdışı
    expect((await info(b)).levels.otag).toBe(1);
    s.advance((OBA.upgradeSec(2) + 5) * 1000);
    const after = await info(b); expect(after.levels.otag).toBe(2); expect(after.upgrade).toBeNull();
    expect(after.slots).toBe(4); expect(after.memberCap).toBe(40); expect(b.me.companions.length).toBe(4); // otağ → yoldaş yuvası + üye sınırı
    expect(after.capHours).toBe(OBA.capHours(2));
    await b.leave();
  });
  test('acemi oba seviye sınırı vardır', async () => {
    const b = await member('ay', 'Sn'); const p = playerOf(s, b); p.d.gold = 1e9; const o = s.ctx.oymaks.get(p.oymakId)!;
    o.lv.otag = NOVICE_MAX_LEVEL; o.lv.demir = NOVICE_MAX_LEVEL; o.storage = { ore: 1e6, hide: 1e6, wood: 1e6 };
    expect((await b.rpc('oba.build', { b: 'otag' })).err).toBe('novice_cap'); o.lv.otag = o.lv.demir = 1; await b.leave();
  });
  test('yetersiz akçe reddedilir; yükseltme akçe + ambar kaynağı harcar', async () => {
    const b = await member('yer', 'Gd'); const p = playerOf(s, b); const o = s.ctx.oymaks.get(p.oymakId)!; o.storage = { ore: 99, hide: 99, wood: 99 };
    p.d.gold = 10; expect((await b.rpc('oba.build', { b: 'otag' })).err).toBe('no_gold');
    p.d.gold = 5000; const st0 = { ...o.storage }; expect((await b.rpc('oba.build', { b: 'otag' })).ok).toBe(true);
    expect(5000 - p.d.gold).toBe(OBA.upgradeGold(2)); expect(st0.ore - o.storage.ore).toBe(OBA.upgradeRes(2).ore);
    o.up = null; o.lv.otag = 1; await b.leave();
  });
  test('oba işlemleri Otağ’a yakın olmayı ister', async () => {
    const b = await member('yer', 'Fr'); tp(s, b, 0, 30); expect((await b.rpc('oba.claim')).err).toBe('too_far'); await b.leave();
  });
});

describe('E4 yoldaş seferleri', () => {
  test('1/4/12 saat; erken toplanamaz; süre dolunca giriş sırasında hesaplanır; yuva sınırı', async () => {
    let b = await member('yer', 'Sf'); const p = playerOf(s, b); const [c1, c2] = p.d.companions.map((c) => c.id);
    p.d.companions[0].traits = ['gozupek', 'sansli']; p.d.companions[1].traits = ['tuccar', 'sansli'];
    expect((await b.rpc('oba.dispatch', { compId: c1, hours: 2 })).err).toBe('bad_hours');
    const r1 = await b.rpc('oba.dispatch', { compId: c1, hours: 4 }); expect(r1.ok).toBe(true);
    expect((await b.rpc('oba.dispatch', { compId: c1, hours: 1 })).err).toBe('comp_busy');
    expect((await b.rpc('oba.dispatch', { compId: c2, hours: 12 })).ok).toBe(true);
    const ex = p.d.expeditions; expect(ex.length).toBe(2); expect(ex[0].endAt - ex[0].startAt).toBe(4 * 3600000); expect(ex[1].endAt - ex[1].startAt).toBe(12 * 3600000);
    expect((await b.rpc('oba.collect', { expId: ex[0].id })).err).toBe('exp_not_done');
    b = await reconnect(b); const p2 = playerOf(s, b); expect(p2.d.expeditions.length).toBe(2); // çevrimdışıyken sürüyor
    s.advance(4 * 3600000 + 1000);
    const g0 = p2.d.gold; const id = p2.d.expeditions[0].id; const r = await b.rpc('oba.collect', { expId: id });
    expect(r.ok).toBe(true); const res = (r.data as { result: { gold: number } }).result; expect(res.gold).toBeGreaterThan(0); expect(p2.d.gold - g0).toBe(res.gold);
    expect(p2.d.expeditions.length).toBe(1); expect((await b.rpc('oba.collect', { expId: id })).err).toBe('no_expedition');
    s.advance(9 * 3600000); expect((await b.rpc('oba.collect', { expId: p2.d.expeditions[0].id })).ok).toBe(true);
    await b.leave();
  });
  test('yoldaş yuvası dolunca yeni sefer reddedilir; Çevik yoldaş seferi kısaltır', async () => {
    const b = await member('ay', 'Yv'); const p = playerOf(s, b); p.d.companions[0].traits = ['cevik', 'tuccar'];
    const ids = p.d.companions.map((c) => c.id);
    const r = await b.rpc('oba.dispatch', { compId: ids[0], hours: 1 }); expect(r.ok).toBe(true);
    expect(p.d.expeditions[0].endAt - p.d.expeditions[0].startAt).toBe(Math.round(3600000 * 0.85));
    expect((await b.rpc('oba.dispatch', { compId: ids[1], hours: 1 })).ok).toBe(true);
    p.d.companions.push({ id: 'ekstra', name: 'X', cls: 'alp', level: 1, xp: 0, traits: ['cevik', 'tuccar'] });
    expect((await b.rpc('oba.dispatch', { compId: 'ekstra', hours: 1 })).err).toBe('slots_full'); await b.leave();
  });
});

describe('E5/E6 katılım puanı ve üretim', () => {
  test('bağış, yükseltme ve sefer katılım puanı kazandırır; üretim çevrimdışıyken birikir ve puana göre paylaşılır', async () => {
    const a = await member('yer', 'Pa'); const c = await member('yer', 'Pc');
    expect(a.me.oymakId).toBe(c.me.oymakId);
    const pa = playerOf(s, a), pc = playerOf(s, c); pa.d.bag.ore = 100; pc.d.bag.ore = 100;
    expect((await a.rpc('oba.donate', { ore: 90 })).ok).toBe(true); expect((await c.rpc('oba.donate', { ore: 10 })).ok).toBe(true);
    expect(pa.points).toBe(90); expect(pc.points).toBe(10);
    await a.rpc('oba.dispatch', { compId: pa.d.companions[0].id, hours: 4 }); expect(pa.points).toBe(90 + 5 * 4);
    s.advance(6 * 3600000);
    const ia = await info(a), ic = await info(c);
    expect(ia.pending.hours).toBeGreaterThan(5.9); expect(ia.pending.wood + ia.pending.ore).toBeGreaterThan(0);
    expect(ia.share).toBeGreaterThan(ic.share); expect(ia.pending.wood).toBeGreaterThanOrEqual(ic.pending.wood);
    const wood0 = pa.d.bag.wood; const r = await a.rpc('oba.claim'); expect(r.ok).toBe(true);
    expect(pa.d.bag.wood - wood0).toBe(ia.pending.wood); expect((await info(a)).pending.wood).toBe(0);
    s.advance(400 * 3600000); expect((await info(c)).pending.hours).toBeLessThanOrEqual(OBA.capHours(1)); // üst sınır
    await a.leave(); await c.leave();
  });
  test('katılım puanı olmayan üye de pay alır (solo oyuncu mahrum kalmaz)', async () => {
    const b = await member('gok', 'Solo'); s.advance(3 * 3600000); const i = await info(b);
    expect(i.share).toBeGreaterThan(0); expect(i.pending.wood).toBeGreaterThan(0); await b.leave();
  });
});

describe('E7 Kayıp Yazıtlar', () => {
  test('sunucu çapı parça sayacı: eşik aşılınca yazıt çözülür ve tüm oyunculara duyurulur', async () => {
    const a = await member('yer', 'Yz'); const w = (await import('./helpers')).worldOf(s, a); const p = playerOf(s, a);
    const before = s.ctx.db.worldGet('frags', 0); const th = INSCRIPTIONS.find((t) => t > before)!;
    const ann0 = anchor.chat.filter((m) => m.key === 'sys.inscription').length;
    w.addFrag(p, th - before - 1); expect(anchor.chat.filter((m) => m.key === 'sys.inscription').length).toBe(ann0);
    w.addFrag(p, 1);
    await anchor.until(() => anchor.chat.filter((m) => m.key === 'sys.inscription').length === ann0 + 1);
    const st = (await a.rpc('inscription')).data as { frags: number; thresholds: number[] }; expect(st.frags).toBeGreaterThanOrEqual(th);
    await a.until(() => a.me.inscr.unlocked >= 1); expect(s.ctx.db.worldGet('frags')).toBe(st.frags); await a.leave();
  });
});
