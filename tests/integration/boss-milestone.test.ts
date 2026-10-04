import { describe, expect, test } from 'vitest';
import { makeRig } from '../sim/rig';
import { FIELD_BOSS, MILESTONE_LEVELS, MOBS, SKILLS, milestoneGift, xpToNext } from '../../shared/game';
import { genBosses } from '../../shared/world';

describe('saha bosları', () => {
  test('5 boss deterministik konumda; seviye grubuna uygun uzaklıkta; dünya açılınca doğar', () => {
    const b = genBosses(); expect(b.length).toBe(5); expect(genBosses()).toEqual(b);
    for (let i = 1; i < b.length; i++) expect(Math.hypot(b[i].x, b[i].z)).toBeGreaterThan(Math.hypot(b[i - 1].x, b[i - 1].z));
    const rig = makeRig(1); const bosses = [...rig.world.mobs.values()].filter((m) => m.bossId > 0); expect(bosses.map((m) => m.bossId).sort()).toEqual([1, 2, 3, 4, 5]);
  });
  test('öldürülünce katılımcıya garanti destansı+ parça (boss’un hasar türüne karşı efsunlu), kitap, parça; duyuru; 15 dk sonra yeniden doğar', () => {
    const rig = makeRig(2, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok', 'admin'); rig.gm(p, 'level 30'); rig.gm(p, 'god');
    const def = genBosses()[2]; const boss = w.spawnBoss(def); expect(boss.lvl).toBe(def.level);
    p.x = boss.x - 3; p.z = boss.z; const heard: string[] = []; w.ctx.broadcastSys = (k) => heard.push(k);
    boss.contrib.set(p.id, 1000); boss.hp = 1; w.damage(p, boss, 5);
    expect(boss.dead).toBe(true); expect(heard).toContain('sys.boss_down.3');
    const drops = [...w.drops.values()].filter((d) => d.owner === p.id);
    const items = drops.filter((d) => d.k === 'item').map((d) => d.item!); expect(items.length).toBeGreaterThanOrEqual(1);
    expect(Math.max(...items.map((i) => i.tier))).toBeGreaterThanOrEqual(2);
    const kind = MOBS.bekci.kind; void kind;
    expect(items.some((i) => [i.base, ...i.ench].some((e) => e?.k === 'defBicak'))).toBe(true); // 3. boss bıçak türü
    expect(drops.filter((d) => d.k === 'book').length).toBeGreaterThanOrEqual(2); expect(drops.filter((d) => d.k === 'frag').length).toBe(3);
    // yeniden doğuş
    for (let i = 0; i < 100; i++) rig.tick(); expect(boss.dead).toBe(true);
    rig.clock.advance(FIELD_BOSS.respawnSec * 1000 + 1000); rig.tick(); expect(boss.dead).toBe(false); expect(boss.hp).toBe(boss.maxHp); expect(heard).toContain('sys.boss_up.3');
  });
  test('alan darbesi: önce uyarı halkası, gecikmeden sonra hasar ve sersemletme; beceri bloğu engeller', () => {
    const rig = makeRig(3, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 20; w.recalc(p); p.hp = p.stats.maxHp;
    const def = genBosses()[1]; const boss = w.spawnBoss(def); p.x = boss.x - 4; p.z = boss.z; boss.target = p.id; boss.slamAt = w.now; boss.nextAtk = Infinity;
    const seen: { k: string; fx?: string; r?: number; blk?: boolean }[] = []; const emit0 = w.emit.bind(w); w.emit = (ev, x, z) => { seen.push(ev as never); emit0(ev, x, z); };
    rig.tick(); expect(seen.some((e) => e.k === 'fx' && e.fx === 'wrath' && e.r === FIELD_BOSS.slamRadius)).toBe(true);
    expect(p.hp).toBe(p.stats.maxHp); // henüz hasar yok
    rig.seconds(FIELD_BOSS.slamTelegraphSec + 0.3); expect(p.hp).toBeLessThan(p.stats.maxHp); expect(p.status.stun).toBeTruthy();
    // blok
    p.hp = p.stats.maxHp; p.status = {}; p.stats.blockSkill = 1; boss.slamAt = w.now; boss.slamHitAt = 0; seen.length = 0; rig.tick(); rig.seconds(FIELD_BOSS.slamTelegraphSec + 0.3);
    expect(p.hp).toBe(p.stats.maxHp); expect(seen.some((e) => e.k === 'dmg' && e.blk)).toBe(true);
  });
  test('menzil dışındaki oyuncu alan darbesinden etkilenmez', () => {
    const rig = makeRig(4, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); const boss = w.spawnBoss(genBosses()[0]); const q = rig.add('yer');
    p.x = boss.x - 3; p.z = boss.z; q.x = boss.x + 30; q.z = boss.z; boss.target = p.id; boss.slamAt = w.now; boss.nextAtk = Infinity;
    rig.seconds(FIELD_BOSS.slamTelegraphSec + 0.5); expect(q.hp).toBe(q.stats.maxHp);
  });
  test('öfke: can %30 altına inince saldırı aralığı kısalır', () => {
    const rig = makeRig(5, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok'); p.d.level = 30; w.recalc(p); p.god = true;
    const boss = w.spawnBoss(genBosses()[2]); boss.slamAt = Infinity; p.x = boss.x - 2; p.z = boss.z; boss.target = p.id;
    const gap = (hpFrac: number) => { boss.hp = boss.maxHp * hpFrac; boss.nextAtk = 0; rig.tick(); return boss.nextAtk - w.now; };
    expect(gap(0.2)).toBeLessThan(gap(0.9) * 0.85);
  });
});

describe('kilometre taşı armağanı', () => {
  test('seviye 10·20·30·40·50’de bir kez; akçe, kitap, tılsım, yazıt parçası ve destansı+ parça; ledger’a yazılır', () => {
    const rig = makeRig(6, { spawnCamps: false }); const w = rig.world; const p = rig.add('gok');
    for (const L of MILESTONE_LEVELS) {
      p.d.level = L - 1; p.d.xp = 0; const g0 = p.d.gold, b0 = p.d.bag.book, c0 = p.d.bag.charm, n0 = p.d.items.length;
      w.addXp(p, xpToNext(L - 1), false); expect(p.d.level).toBe(L);
      const g = milestoneGift(L); expect(p.d.gold).toBe(g0 + g.gold); expect(p.d.bag.book).toBe(b0 + g.books); expect(p.d.bag.charm).toBe(c0 + g.charms);
      const got = p.d.items.length > n0 ? p.d.items[p.d.items.length - 1] : [...w.drops.values()].map((d) => d.item).filter(Boolean).pop()!; expect(got.tier).toBeGreaterThanOrEqual(g.itemTier);
    }
    const rows = rig.db.db.prepare("SELECT COUNT(*) c FROM ledger WHERE kind='milestone' AND player_id=?").get(p.dbId) as { c: number }; expect(rows.c).toBe(5);
    p.d.level = 11; p.d.xp = 0; const g1 = p.d.gold; w.addXp(p, 5, false); expect(p.d.gold).toBe(g1); // 10 dışında armağan yok
  });
  test('boss alanı seviye grubu: boss seviyesi 9/19/29/39/48', () => { expect(FIELD_BOSS.list.map((b) => b[0])).toEqual([9, 19, 29, 39, 48]); expect(SKILLS.length).toBe(6); });
});
