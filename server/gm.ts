import {
  BAG_SIZE, HUB, MAX_LEVEL, SKILLS, SLOTS, defReduction, makeItem, mobDef, mobHp, mobXp, xpToNext, restedCap, INSCRIPTIONS,
  type MobType, type Slot, type Spec,
} from '../shared/game';
import { CLUE_GOLD } from '../shared/lore';
import { genStones } from '../shared/world';
import { LOOKS, newCostume, type CosMat, type CostumeTier, type LuckKey } from '../shared/costume';
import { cosOf } from './costume';
import * as oba from './oba';
import type { Player, World } from './world';

/**
 * Yönetici (GM) komutları. Yalnızca sunucuda, rolü 'admin' olan hesaplar çağırabilir (World.rpcRun doğrular).
 * Amaç: oyundaki her sistemi hızla sınamak. Her komut sonucu insan okunur bir metin döndürür.
 */
export const GM_HELP = [
  'level <n> · xp <n> · gold <n> · give <ore|hide|wood|book|charm|frag> <n> · item <silah|zirh|migfer|tilsim> <tier0-3> <ilvl> [+up]',
  'kit [+up] (4 efsanevi eşya kuşan) · heal · god · cdreset · maxskills · skillpts <n> · spec <none|kalkan|kilic> · rank <n> · rested · kut <n>',
  'tp hub | tp <x> <z> | tp rift | tp stone <1-8> | tp <oyuncu> · spawn <tur> <lvl> [adet] · killall · dummy · dps · rift · riftclear',
  'time <saat> (sunucu saatini ilerlet: oba/sefer/dinlenme) · oba (tüm oba işlerini bitir + kaynak) · frag <n> · clue <hepsi|id> · dream · tut · kill',
  'stats · ttk <moblvl> · econ · whoami',
].join('\n');

const TYPES: MobType[] = ['tepegoz', 'albasti', 'erlik', 'cakal', 'bekci'];
const SLOT_ALIAS: Record<string, Slot> = { silah: 'weapon', weapon: 'weapon', zirh: 'armor', armor: 'armor', migfer: 'helmet', helmet: 'helmet', tilsim: 'amulet', amulet: 'amulet' };

export function runGm(w: World, p: Player, line: string): { ok: boolean; msg: string } {
  const a = line.trim().replace(/^\//, '').replace(/^gm\s+/i, '').split(/\s+/).filter(Boolean); const cmd = (a[0] ?? 'help').toLowerCase(); const n = (i: number, d = 0) => (Number.isFinite(Number(a[i])) && a[i] !== undefined ? Number(a[i]) : d);
  const d = p.d; const ok = (msg: string) => ({ ok: true, msg }); const bad = (msg: string) => ({ ok: false, msg });
  switch (cmd) {
    case 'help': return ok(GM_HELP);
    case 'whoami': return ok(`${p.name} · rol=${p.role} · oda=${w.roomId} · katman=${w.layer} · oyuncu=${w.players.size} · yaratık=${w.mobs.size}`);
    case 'level': { const L = Math.max(1, Math.min(MAX_LEVEL, Math.floor(n(1, d.level)))); const old = d.level; d.level = L; d.xp = 0; d.skillPts += Math.max(0, L - old); w.recalc(p); p.hp = p.stats.maxHp; return ok(`Seviye ${old} → ${L}. Yetenek puanı: ${d.skillPts}`); }
    case 'xp': { const g = w.addXp(p, Math.max(0, n(1)), false); return ok(`+${g} deneyim (seviye ${d.level})`); }
    case 'kut': { d.kut = Math.max(0, Math.floor(n(1))); w.recalc(p); return ok(`Kut puanı=${d.kut}`); }
    case 'gold': d.gold += Math.floor(n(1)); return ok(`Akçe=${d.gold}`);
    case 'give': {
      const k = a[1] as 'ore' | 'hide' | 'wood' | 'book' | 'charm' | 'frag'; if (!['ore', 'hide', 'wood', 'book', 'charm', 'frag'].includes(k)) return bad('give <ore|hide|wood|book|charm|frag> <n>');
      if (k === 'frag') w.addFrag(p, Math.floor(n(2, 1))); else d.bag[k] += Math.floor(n(2, 1)); return ok(`${k} +${n(2, 1)}`);
    }
    case 'item': {
      const slot = SLOT_ALIAS[(a[1] ?? '').toLowerCase()]; if (!slot) return bad('item <silah|zirh|migfer|tilsim> <tier 0-3> <ilvl> [+up]');
      const tier = Math.max(0, Math.min(3, Math.floor(n(2, 3)))) as 0 | 1 | 2 | 3; const il = Math.max(1, Math.floor(n(3, d.level)));
      if (d.items.length >= BAG_SIZE) return bad('Çanta dolu');
      const it = makeItem(w.ctx.rng, slot, il, tier); it.lvlReq = 1; const up = a.find((x) => x.startsWith('+')); if (up) it.up = Math.min(9, Number(up.slice(1)) || 0);
      d.items.push(it); return ok(`${slot} tier${tier} ilvl${il} +${it.up} çantada`);
    }
    case 'kit': {
      const up = Math.min(9, Number((a.find((x) => x.startsWith('+')) ?? '+9').slice(1)) || 9);
      for (const s of SLOTS) { const it = makeItem(w.ctx.rng, s, Math.max(1, d.level), 3); it.lvlReq = 1; it.up = up; const old = d.equip[s]; if (old && d.items.length < BAG_SIZE) d.items.push(old); d.equip[s] = it; }
      w.recalc(p); return ok(`Efsanevi +${up} takım kuşanıldı. Saldırı=${p.stats.atk} Savunma=${p.stats.def} Can=${p.stats.maxHp}`);
    }
    case 'heal': w.recalc(p); p.hp = p.stats.maxHp; p.deadUntil = 0; p.status = {}; return ok('İyileştirildi');
    case 'god': p.god = !p.god; return ok(`Ölümsüzlük ${p.god ? 'AÇIK' : 'kapalı'}`);
    case 'cdreset': p.cds = [0, 0, 0, 0, 0, 0]; return ok('Bekleme süreleri sıfırlandı');
    case 'maxskills': d.skillRanks = [6, 6, 6, 6, 6, 6]; return ok('Tüm yetenekler P kademesinde');
    case 'skillpts': d.skillPts = Math.floor(n(1)); return ok(`Yetenek puanı=${d.skillPts}`);
    case 'spec': { const s = (a[1] ?? 'none') as Spec; if (!['none', 'kalkan', 'kilic'].includes(s)) return bad('spec <none|kalkan|kilic>'); d.spec = s; w.recalc(p); return ok(`Uzmanlık=${s}`); }
    case 'rank': d.rank = Math.floor(n(1)); d.rankKills = 0; return ok(`Derece=${d.rank}`);
    case 'rested': d.rested = restedCap(d.level); return ok(`Dinlenmiş deneyim=${d.rested}`);
    case 'tut': d.tut = { step: 5, prog: 0 }; return ok('Öğretici tamamlandı');
    case 'kill': p.god = false; w.damage(null, p, 1e9); return ok('Öldürüldün');
    case 'cos': {
      const s = cosOf(p); const sub = (a[1] ?? '').toLowerCase();
      if (sub === 'mats') { for (const k of Object.keys(s.mats) as CosMat[]) s.mats[k] += 200; for (const k of Object.keys(s.luck) as LuckKey[]) s.luck[k] += 10; return ok('Kostüm malzemeleri +200, şans eşyaları +10'); }
      if (sub === 'give') { const tier = Math.max(0, Math.min(3, Math.floor(n(2)))) as CostumeTier; const look = Math.floor(Number(a[3] ?? 0)) % LOOKS.length; const c = newCostume(w.ctx.rng, look, tier, w.now); s.bag.push(c); return ok(`Kostüm ${c.id}`); }
      if (sub === 'expire') { const c = s.worn ?? s.bag[0]; if (!c) return bad('kostüm yok'); c.expiresAt = w.now + 3600000; w.recalc(p); return ok('Kostüm 1 saat sonra bitecek'); }
      if (sub === 'loom') { if (!s.loom) return bad('tezgâh boş'); s.loom.endAt = w.now; return ok('Tezgâh hazır'); }
      return bad('cos mats | cos give <0-3> [görünüm] | cos expire | cos loom');
    }
    case 'tp': {
      const t = (a[1] ?? '').toLowerCase();
      if (t === 'hub') { p.x = HUB.spawn[p.boy].x; p.z = HUB.spawn[p.boy].z; return ok('Yurt'); }
      if (t === 'otlak' || t === 'erlik') { w.teleport(p, t); return ok(t); }
      if (t === 'rift') { const r = [...w.rifts.values()][0]; if (!r) return bad('Açık çatlak yok (rift komutu)'); p.x = r.x - 16; p.z = r.z; return ok('Çatlağa ışınlandın'); }
      if (t === 'stone') { const st = genStones().find((q) => q.n === Math.floor(n(2))); if (!st) return bad('tp stone <1-8>'); p.x = st.x - 3; p.z = st.z; return ok(`Balbal taşı ${st.n}`); }
      if (t === 'boss') { const m = [...w.mobs.values()].find((q) => q.bossId === Math.floor(n(2))); if (!m) return bad('tp boss <1-9>'); p.x = m.hx - 14; p.z = m.hz; return ok(`Saha bossu ${m.bossId} (sv ${m.lvl})`); }
      if (a.length >= 3 && Number.isFinite(Number(a[1])) && Number.isFinite(Number(a[2]))) { p.x = n(1); p.z = n(2); return ok(`(${p.x}, ${p.z})`); }
      for (const o of w.ctx.worlds) for (const q of o.players.values()) if (q.name.toLowerCase() === t) { p.x = q.x + 2; p.z = q.z; return ok('Oyuncuya ışınlandın'); }
      return bad('tp hub | tp x z | tp rift | tp stone n | tp boss n | tp oyuncu');
    }
    case 'spawn': {
      const t = (a[1] ?? 'cakal') as MobType; if (!TYPES.includes(t)) return bad('Tür: ' + TYPES.join(', ')); const L = Math.max(1, Math.floor(n(2, d.level))); const c = Math.min(30, Math.max(1, Math.floor(n(3, 1))));
      for (let i = 0; i < c; i++) { const ang = (i / c) * 6.283; const m = w.makeMob(t, L, p.x + Math.cos(ang) * 6, p.z + Math.sin(ang) * 6, -1); m.hx = m.x; m.hz = m.z; m.leash = 80; }
      return ok(`${c}× ${t} (sv ${L})`);
    }
    case 'killall': { let k = 0; for (const m of [...w.mobs.values()]) if (!m.dead && !m.dummy) { m.hp = 0; w.killMob(m); k++; } return ok(`${k} yaratık öldürüldü`); }
    case 'dummy': { const m = w.makeMob('tepegoz', 1, p.x + Math.sin(p.rot) * 3, p.z + Math.cos(p.rot) * 3, -1); m.dummy = true; m.maxHp = m.hp = 1e9; m.nextAtk = Infinity; w.dummyLog.length = 0; return ok('Antrenman kuklası: vurdukça `dps` komutuyla son 10 sn hasarı gör'); }
    case 'dps': { const now = w.now; const recent = w.dummyLog.filter((x) => now - x.t < 10000); const sum = recent.reduce((s, x) => s + x.v, 0); const first = recent[0]?.t ?? now; const span = Math.max(1, Math.min(10, (now - first) / 1000)); return ok(`Son 10 sn: ${sum} hasar, ${recent.length} vuruş → ${(sum / span).toFixed(0)} hasar/sn`); }
    case 'rift': { const r = w.openRift(); if (!r) return bad('Çatlak açılamadı'); return ok(`Çatlak açıldı (${Math.round(Math.hypot(r.x, r.z))} birim). tp rift ile git`); }
    case 'riftclear': { let k = 0; for (const r of w.rifts.values()) for (const id of [...r.mobs]) { const m = w.mobs.get(id); if (m) { w.damage(p, m, m.hp + 1); k++; } } return ok(`${k} çatlak yaratığı temizlendi (katkı sende)`); }
    case 'time': { const h = Math.max(0, n(1, 1)); w.ctx.clock.advance(h * 3600000); return ok(`Sunucu saati +${h} sa ileri (tüm sunucu etkilenir)`); }
    case 'oba': {
      const o = oba.loadOymak(w.ctx, p.oymakId); o.storage.ore += 500; o.storage.hide += 500; o.storage.wood += 500; d.gold += 50000;
      if (o.up) { o.up.finishAt = w.now; oba.settle(w.ctx, o); } oba.saveOymak(w.ctx, o); for (const e of d.expeditions) e.endAt = w.now;
      return ok('Ambara +500 kaynak, +50.000 akçe, yükseltme ve seferler bitirildi');
    }
    case 'frag': { w.addFrag(p, Math.floor(n(1, 1))); const fr = w.ctx.db.worldGet('frags', 0); return ok(`Sunucu parçası=${fr}; çözülen yazıt=${INSCRIPTIONS.filter((t) => fr >= t).length}/${INSCRIPTIONS.length}`); }
    case 'clue': {
      if ((a[1] ?? '') === 'hepsi' || a[1] === 'all') {
        const ids = [...Array(5)].flatMap((_, i) => [`dream.${i + 1}`, `elder.${i + 1}`]).concat([...Array(8)].map((_, i) => `stone.${i + 1}`), ['shard.1', 'shard.2', 'shard.3']);
        let k = 0; for (const id of ids) if (w.discoverClue(p, id, 0)) k++; d.dreams = 5; d.shards = Math.max(d.shards, 6); w.ctx.db.worldSet('frags', Math.max(w.ctx.db.worldGet('frags', 0), INSCRIPTIONS[INSCRIPTIONS.length - 1])); return ok(`${k} ipucu keşfedildi; sunucu yazıtları tamamen çözüldü`);
      }
      if (!a[1]) return bad('clue <hepsi|id>'); return ok(w.discoverClue(p, a[1], CLUE_GOLD) ? 'Keşfedildi' : 'Zaten biliniyor');
    }
    case 'dream': { if (d.dreams >= 5) return bad('5 rüya da görüldü'); d.dreams++; d.pendingDream = d.dreams; return ok(`Rüya ${d.dreams} bekliyor (arayüz gösterecek)`); }
    case 'stats': {
      const s = p.stats; const sk = SKILLS.map((k, i) => `${k.id}:${d.skillRanks[i]}`).join(' ');
      return ok(`Sv${d.level} ${d.spec} · can ${s.maxHp} saldırı ${s.atk} savunma ${s.def} kritik %${s.crit.toFixed(1)} (×${s.critMult}) · vuruş ${s.atkInterval.toFixed(2)}sn · hız ${s.moveSpeed.toFixed(2)} · çalma %${(s.leech * 100).toFixed(0)} · alan×${s.aoe.toFixed(2)} · beceri×${s.spell.toFixed(2)} · alınan hasar×${s.dmgTaken.toFixed(2)} · deneyim +%${s.xpPct} · ${sk}`);
    }
    case 'ttk': {
      const L = Math.max(1, Math.floor(n(1, d.level))); const s = p.stats; const hp = mobHp(L); const red = defReduction(mobDef(L)); const crit = 1 + (s.crit / 100) * (s.critMult - 1);
      const dpsBasic = (s.atk * crit * red) / s.atkInterval; const sweep = (s.atk * crit * red * 1.6 * s.spell) / 4;
      return ok(`Sv${L} yaratık: can ${Math.round(hp)}; temel vuruş ${dpsBasic.toFixed(0)} hasar/sn → ${(hp / dpsBasic).toFixed(1)} sn; tek hedef ölüm süresi (savurma dahil) ${(hp / (dpsBasic + sweep)).toFixed(1)} sn; yaratık deneyimi ${mobXp(L)}; seviye başına ${(xpToNext(d.level) / mobXp(L)).toFixed(0)} yaratık`);
    }
    case 'econ': {
      const oyk = oba.loadOymak(w.ctx, p.oymakId); const pend = oba.pendingProduction(w.ctx, oyk, p);
      return ok(`akçe ${d.gold} · cevher ${d.bag.ore} deri ${d.bag.hide} odun ${d.bag.wood} · kitap ${d.bag.book} tılsım ${d.bag.charm} · yazıt ${d.bag.frag} · oba bekleyen ${pend.ore}/${pend.hide}/${pend.wood} (${pend.hours.toFixed(1)} sa) · yok olan eşya ${d.counters.destroyed}`);
    }
    default: return bad(`Bilinmeyen komut: ${cmd}\n${GM_HELP}`);
  }
}
