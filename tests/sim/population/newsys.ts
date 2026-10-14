/**
 * Yeni sistemlerin (balıkçılık, günlük görev, element, Kut Taşı, yoldaş evrimi, boss sandığı) ajan davranışları.
 * Hepsi GERÇEK sunucu RPC'leriyle çalışır; yalnızca zaman (dünya saati donuk olduğu için) modellenir:
 *  - balık oyununun süresi oyuncu becerisinden ve olta bölgesinden hesaplanır, cast→reel arası sunucu saati elle ileri alınır;
 *  - bot modu ("makro"): sunucunun doğrulayamadığı vuruş bildirimi 3/3 gider, çevrim yalnızca minReelSec kadar sürer (sömürü üst sınırı).
 * Dürüstlük: talep tarafı (balığı kim satın alır, bufın değeri) modeldir, ölçüm değildir; rapor bunu açıkça yazar.
 */
import { FEATURES, HUB, compEvo, COMP_EVO, type Item } from '../../../shared/game';
import { FISH, FISH_DEFS, fishKey, newFishState, type FishId } from '../../../shared/fishing';
import { EL, type ElKey, EL_KEYS } from '../../../shared/element';
import { KT, KT_GRADES, KT_TYPES, ktNorm } from '../../../shared/kuttas';
import { CHEST, chestPos, gradeOfLevel, keyFor, normKeys } from '../../../shared/chest';
import { genBosses } from '../../../shared/world';
import { MARKET } from '../../../shared/game';
import { costUnit } from '../../../shared/costume';
import { goodBounds, goodRef, kimizPrice } from '../../../shared/goods';
import { upgradeCost } from '../../../shared/game';
import type { Agent } from './agent';

const EAT_ORDER: FishId[] = ['altinsudak', 'kadife', 'kralyengeci', 'zargana', 'otsazani', 'sazan', 'hamsi', 'levrek'];
const lot = (id: FishId) => (FISH_DEFS.find((f) => f.id === id)!.rare ? 1 : 4);
const stockOf = (a: Agent, id: FishId) => a.d.fish?.stock[id] ?? 0;
const totalFish = (a: Agent) => Object.values(a.d.fish?.stock ?? {}).reduce((s, n) => s + (n ?? 0), 0);

/** kasadan ayrılan zorunlu rezerv (kımız + güvenlik payı) — kostüm rutiniyle aynı mantık */
export function reserve(a: Agent): number {
  const L = a.d.level; return 4 * costUnit(L) + kimizPrice(L) * Math.ceil(a.kzRate * 60 * 3);
}

/** Zamanlama oyununu simüle eder: kaç vuruş, kaç saniye. İnsan: beceri ve olta bölgesine bağlı; bot: 3/3 ve yalnızca minReelSec. */
export function fishGame(a: Agent, rod: number): { hits: number; cycleSec: number } {
  const r = a.eng.rng;
  if (a.par.fishBot) return { hits: FISH.hitsNeeded, cycleSec: FISH.minReelSec + 0.15 };
  const zone = FISH.zone(rod); const p = Math.min(0.95, 0.22 + 0.62 * a.par.skill + (zone - 0.18) * 1.5);
  let t = 0, hits = 0;
  while (hits < FISH.hitsNeeded && t < FISH.gameSec) { t += 1.7; if (r() < p) hits++; else t += FISH.missPenaltySec; }
  const used = Math.min(t, FISH.gameSec); return { hits, cycleSec: FISH.castCdSec + used + 1.2 };   // +1.2 sn: arayüz/yeniden atış
}

/** Balık tutma: `minutes` dakika boyunca gerçek fish.* RPC'leriyle. Döndürür: atış sayısı. */
export function fishRoutine(a: Agent, minutes: number): number {
  if (!FEATURES.fish) return 0; const d = a.d; const w = a.w; const p = a.p; if (d.level < FISH.minLevel || minutes <= 0) return 0;
  a.at(FISH.pond.x, FISH.pond.z + FISH.pond.r + 1.5); p.lastCombat = 0;
  const f = (d.fish ??= newFishState());
  if (f.rod < 1) { if (d.gold < FISH.rodPrice + 60 || !a.rpc('fish.buy', { what: 'rod' }).ok) return 0; a.ext.fishRodBought = 1; }
  let left = minutes * 60; let casts = 0; let hitsOk = 0;
  const richBait = a.par.fishBait === 'solucan';
  while (left > 0) {
    const buy = (b: 'hamur' | 'solucan') => { const n = Math.min(50, Math.floor((d.gold * (a.par.fisher ? 0.95 : 0.15)) / FISH.bait[b])); return n >= 1 && a.rpc('fish.buy', { what: b, n }).ok; };
    let bait: 'hamur' | 'solucan' = richBait ? 'solucan' : 'hamur';
    if (f[bait] < 1 && !buy(bait)) { bait = 'hamur'; if (f.hamur < 1 && !buy('hamur')) break; }
    const c = a.rpc('fish.cast', { bait }); if (!c.ok) break;
    const g = fishGame(a, f.rod); if (p.fishCast) p.fishCast.at = w.now - Math.max(FISH.minReelSec * 1000 + 100, Math.min(g.cycleSec * 1000, 14000));
    const r = a.rpc('fish.reel', { hits: g.hits }); p.fishAt = 0; casts++; left -= g.cycleSec;
    if (r.ok && r.data.ok) { hitsOk++; a.ext['fish_' + r.data.fish] = (a.ext['fish_' + r.data.fish] ?? 0) + 1; }
    if (f.ancestor) a.rpc('fish.ancestor', { choice: a.arch.market.flip ? 'cut' : 'bait' });
    if (f.pts >= FISH.rodNeed(f.rod) && f.rod < FISH.rodMax && d.gold > reserve(a) + FISH.rodCost(f.rod) * 2) a.rpc('fish.rod');
  }
  a.ext.fishCasts = (a.ext.fishCasts ?? 0) + casts; a.ext.fishCaught = (a.ext.fishCaught ?? 0) + hitsOk; a.ext.fishMin = (a.ext.fishMin ?? 0) + minutes - Math.max(0, left) / 60;
  return casts;
}

/** Balık satışı: küçük partiler (insan davranışı: 12'lik yaygın, 3'lük nadir), açık ilan hakkı kadar. */
export function fishTrade(a: Agent) {
  if (!FEATURES.fish || !a.d.fish) return; const mk = a.eng.market; const r = a.eng.rng; const d = a.d;
  const keep: Partial<Record<FishId, number>> = {}; if (a.par.buffUser) for (const id of EAT_ORDER) keep[id] = id === 'altinsudak' || id === 'kadife' ? 1 : 3;
  const ids = [...EAT_ORDER].sort((x, y) => (FISH_DEFS.find((f) => f.id === y)!.ref) - (FISH_DEFS.find((f) => f.id === x)!.ref));
  for (const id of ids) {
    for (let g = 0; g < 6; g++) {
      const have = stockOf(a, id) - (keep[id] ?? 0); if (have < 1 || !mk.canList(a)) break;
      if (!(a.arch.market.sell > r()) && !a.par.fisher) break;
      const qty = Math.min(have, lot(id)); const key = fishKey(id) as Parameters<typeof goodBounds>[0]; const unit = mk.goodUnit(key); const b = goodBounds(key, qty);
      const price = Math.max(b.min, Math.min(b.max, Math.round(unit * qty * (0.92 + r() * 0.2))));
      if (a.rpc('market.list', { good: key, qty, price }).ok) { a.tot.mktListed++; a.ext.fishListed = (a.ext.fishListed ?? 0) + qty; mk.invalidate(); } else break;
    }
  }
  void d;
}

/** Buf tüketicisi: oturum başında en iyi balığı yer (stokta yoksa pazardan en ucuz partiyi alır). Talep modeli: ref×1.6'ya kadar öder. */
export function buffRoutine(a: Agent, plannedMin: number) {
  if (!FEATURES.fish || !a.par.buffUser || a.d.level < 10 || process.env.POP_NOBUFF) return; const d = a.d; const mk = a.eng.market;
  const want = Math.min(4, Math.max(1, Math.ceil(plannedMin / 10))); a.at(HUB.demirci.x - 2, HUB.demirci.z);
  for (let i = 0; i < 1; i++) {
    let id = EAT_ORDER.find((x) => stockOf(a, x) > 0);
    if (!id && d.gold > reserve(a) * 0.5) {
      const rich = d.gold > 60_000; const cands: FishId[] = rich ? ['altinsudak', 'zargana', 'sazan', 'hamsi'] : ['zargana', 'sazan', 'hamsi', 'otsazani'];
      for (const c of cands) {
        const key = fishKey(c) as Parameters<typeof goodBounds>[0]; const l = mk.goodsFor(key).find((x) => x.sellerId !== a.p.dbId && x.unit <= goodRef(key, 1) * 1.6 && x.price <= d.gold * 0.15);
        if (l && a.rpc('market.buy', { id: l.id }).ok) { a.ext.fishBought = (a.ext.fishBought ?? 0) + l.qty; a.tot.mktBought++; mk.invalidate(); id = c; break; }
      }
    }
    if (id && a.rpc('fish.eat', { id }).ok) a.ext.fishEaten = (a.ext.fishEaten ?? 0) + 1;
  }
  void want;
}
/** ölçeklenen (dilim dışı) dakikalarda buf tüketimi: 10 dk'da bir balık, stokta varsa */
export function extraFish(a: Agent, minutes: number) {
  if (!FEATURES.fish || !a.par.buffUser || !a.d.fish) return; let n = Math.min(4, Math.floor(minutes / 10));
  while (n-- > 0) { const id = EAT_ORDER.find((x) => stockOf(a, x) > 0); if (!id) break; a.d.fish.stock[id]!--; a.ext.fishEatenExtra = (a.ext.fishEatenExtra ?? 0) + 1; }
}

/** Kut Taşı: en iyi taşı tak, 3 aynı taşı akçe yettikçe saflaştır. */
export function ktRoutine(a: Agent) {
  if (!FEATURES.kt || !a.par.ktOn || a.d.level < KT.minLevel) return; const d = a.d; const kt = d.kt; if (!kt) return; ktNorm(kt);
  let refines = 0;
  for (let i = 0; i < KT_TYPES.length; i++) {
    const type = KT_TYPES[i];
    for (let g = 0; g < KT_GRADES - 1 && refines < 4; g++) {
      while (kt.s[i][g] >= KT.refineNeed && refines < 4) {
        const cost = KT.refineCost(g, d.level); if (d.gold < reserve(a) + cost * 2 || g >= (a.par.ktMaxGrade ?? 3)) break;
        const res = a.rpc('kt.refine', { type, grade: g }); if (!res.ok) break; refines++; a.ext.ktRefine = (a.ext.ktRefine ?? 0) + 1; if (res.data.ok) a.ext.ktRefineOk = (a.ext.ktRefineOk ?? 0) + 1;
      }
    }
    let best = -1; for (let g = KT_GRADES - 1; g >= 0; g--) if (kt.s[i][g] > 0) { best = g; break; }
    if (best > kt.eq[i]) { const res = a.rpc('kt.set', { type, grade: best }); if (res.ok) { a.ext.ktSet = (a.ext.ktSet ?? 0) + 1; if (res.data.kept === false) a.ext.ktBroke = (a.ext.ktBroke ?? 0) + 1; } }
  }
}

/** Element yazısı: +7 silaha, kampın zayıf elementi; bütçe = oran × akçe. */
export function elementRoutine(a: Agent) {
  if (!FEATURES.element || !a.par.eleOn) return; const d = a.d; const wp = d.equip.weapon; if (!wp || wp.up < EL.minUp) return;
  const budget = (a.par.upBudget ?? 0.1) * d.gold + 0; let spent = 0;
  const want = (): ElKey => { const cnt: Record<string, number> = {}; for (const t of a.camp?.types ?? []) for (const k of EL.weak[t] ?? []) cnt[k] = (cnt[k] ?? 0) + 1; return (EL_KEYS.slice().sort((x, y) => (cnt[y] ?? 0) - (cnt[x] ?? 0))[0]); };
  if (!wp.el) { const cost = EL.addCost(wp.ilvl); if (d.gold > reserve(a) + cost * 2 && cost <= budget + cost) { const r = a.rpc('element', { id: wp.id, op: 'add', el: want() }); if (r.ok) { a.ext.eleAdd = (a.ext.eleAdd ?? 0) + 1; spent += cost; } } }
  for (let g = 0; g < 3 && wp.el && wp.el.p < EL.maxPower; g++) {
    const cost = EL.raiseCost(wp.ilvl, wp.el.p); if (d.gold < reserve(a) + cost * 3 || spent + cost > budget) break;
    const r = a.rpc('element', { id: wp.id, op: 'raise' }); if (!r.ok) break; spent += cost; a.ext.eleRaise = (a.ext.eleRaise ?? 0) + 1; if (r.data.ok) a.ext.eleRaiseOk = (a.ext.eleRaiseOk ?? 0) + 1;
  }
}

/** Yoldaş evrimi (Otağ'da). */
export function evolveRoutine(a: Agent) {
  if (!FEATURES.evo || !a.par.evoOn) return; const d = a.d;
  for (const c of d.companions) {
    const st = compEvo(c); if (st >= COMP_EVO.max || c.level < COMP_EVO.minLevel[st]) continue;
    const gold = COMP_EVO.gold(st, d.level); if (d.gold < reserve(a) + gold * 2 || d.bag.frag < COMP_EVO.frag[st]) continue;
    if (a.rpc('oba.evolve', { compId: c.id }).ok) a.ext.evolved = (a.ext.evolved ?? 0) + 1;
  }
}

/** Boss sandığı: anahtarı olan oyuncu Bozkır'daki, anahtarının karşıladığı en yüksek sınıf sandığa gidip açar (yolculuk süresi modellenmez). */
export function chestRoutine(a: Agent) {
  if (!FEATURES.chest || process.env.POP_NOCHEST) return; const d = a.d; if (!d.keys) return; const keys = normKeys(d.keys); if (keys[0] + keys[1] + keys[2] === 0) return;
  const bosses = genBosses().filter((b) => b.map === 'bozkir');
  for (let guard = 0; guard < 12; guard++) {
    const k = normKeys(d.keys); const top = k[2] > 0 ? 2 : k[1] > 0 ? 1 : k[0] > 0 ? 0 : -1; if (top < 0) break;
    const b = bosses.filter((x) => gradeOfLevel(x.level) <= top && keyFor(k, gradeOfLevel(x.level)) >= 0).sort((x, y) => gradeOfLevel(y.level) - gradeOfLevel(x.level))[0]; if (!b) break;
    const c = chestPos(b); a.at(c.x, c.z); const r = a.rpc('chest.open', { n: b.id }); if (!r.ok) break;
    a.ext.chestOpened = (a.ext.chestOpened ?? 0) + 1; a.ext['chestG' + gradeOfLevel(b.level)] = (a.ext['chestG' + gradeOfLevel(b.level)] ?? 0) + 1; a.eng.collectDrops(a);
  }
  a.at(HUB.demirci.x - 2, HUB.demirci.z);
}
void upgradeCost; void MARKET; void (null as unknown as Item);
