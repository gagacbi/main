/**
 * Çözümsel denge tabloları: aynı formüller (shared/game.ts), hiçbir rastgelelik yok.
 * "Referans yapı": seviyeye uygun ilvl, nadir (mavi) parça, seviyeyle artan güvenli artı.
 */
import { lvlDiffIn, lvlDiffOut, MOBS, computeStats, hitDamage, makeItem, defReduction, mobAtk, mobDef, mobHp, mobXp, xpToNext, upMult, SLOTS, UPGRADE_RATE, UPGRADE_DESTROYS_FROM, BOOK_BONUS, upgradeCost, type Boy, type Item, type Spec, type Slot, type Tier, type MobType } from '../../shared/game';

export const refUp = (L: number) => (L < 8 ? 0 : L < 16 ? 1 : L < 24 ? 2 : L < 32 ? 3 : L < 40 ? 4 : 5); // güvenli bölgede tipik artı
export function refGear(L: number, tier: Tier = 1, up = refUp(L)): Partial<Record<Slot, Item>> {
  const eq: Partial<Record<Slot, Item>> = {}; const r = () => 0.5;
  for (const s of SLOTS) { const it = makeItem(r, s, Math.max(1, L), tier, 'kilic'); it.ench = []; delete it.base; it.up = up; eq[s] = it; }
  return eq;
}
export function refStats(L: number, boy: Boy = 'gok', spec: Spec = 'none', tier: Tier = 1, up = refUp(L)) {
  return computeStats({ level: L, boy, spec: L >= 10 ? spec : 'none', equip: refGear(L, tier, up), kut: 0 });
}
const AVG: MobType[] = ['tepegoz', 'albasti', 'erlik', 'cakal'];
export function mobAvg(lvl: number, types: MobType[] = AVG) {
  const n = types.length; let hp = 0, atk = 0, def = 0, dps = 0;
  for (const t of types) { const d = MOBS[t]; hp += mobHp(lvl) * d.hp / n; atk += mobAtk(lvl) * d.atk / n; def += mobDef(lvl) * d.def / n; dps += (mobAtk(lvl) * d.atk) / d.atkInterval / n; }
  return { hp, atk, def, dps };
}
/** Tek hedef: referans oyuncu, aynı seviyede ortalama bir yaratığa karşı. */
export function duel(L: number, mobLvl = L, boy: Boy = 'gok', spec: Spec = 'none', tier: Tier = 1, up = refUp(L)) {
  const s = refStats(L, boy, spec, tier, up); const m = mobAvg(mobLvl);
  const hit = hitDamage(s.atk, lvlDiffOut(mobLvl - L), m.def, false, false) * (1 + (s.crit / 100) * (s.critMult - 1));
  const ttk = (m.hp / hit) * s.atkInterval;
  const mobDmg = hitDamage(m.atk * lvlDiffIn(mobLvl - L), 1, s.def, false, false) * s.dmgTaken; const mobDps = (mobDmg * m.dps) / Math.max(1, m.atk);
  const taken = mobDps * ttk;
  return { s, m, hit, ttk, mobDps, taken, takenPct: (taken / s.maxHp) * 100, dieSecVs: (n: number) => s.maxHp / (mobDps * n) };
}
export function killsToLevel(L: number) { return Math.ceil(xpToNext(L) / mobXp(L)); }

/** +0 → +9 beklenen maliyet (Markov): yok olursa yeni +0 parça gerekir. policy: kitap/tılsım kullanımı. */
export function upgradeEV(ilvl: number, policy: { book?: boolean; charm?: boolean; stopAt?: number } = {}) {
  const goal = policy.stopAt ?? 9; // E[maliyet(basamak i → hedef)], yok olma → 0'a dön (yeni parça)
  const rate = (t: number) => Math.min(100, UPGRADE_RATE[t] + (policy.book ? BOOK_BONUS : 0)) / 100;
  // E[i] = beklenen toplam deneme maliyeti i'den hedefe. Başarısızlıkta: <5 kalır, ≥5 yok olur (tılsımlıysa kalır).
  const cost = (t: number) => upgradeCost(t, ilvl);
  const E: { gold: number; ore: number; tries: number; books: number; charms: number; items: number }[] = Array.from({ length: goal + 1 }, () => ({ gold: 0, ore: 0, tries: 0, books: 0, charms: 0, items: 0 }));
  // iteratif çözüm: durum 0..goal-1; sabit nokta
  for (let iter = 0; iter < 4000; iter++) {
    for (let i = goal - 1; i >= 0; i--) {
      const t = i + 1; const p = rate(t); const c = cost(t); const useCharm = !!policy.charm && t >= UPGRADE_DESTROYS_FROM;
      const next = E[i + 1]; const stay = E[i]; const zero = E[0];
      const fail = 1 - p;
      const destroy = t >= UPGRADE_DESTROYS_FROM && !useCharm;
      const f = (k: 'gold' | 'ore' | 'tries' | 'books' | 'charms' | 'items') => {
        const own = k === 'gold' ? c.gold : k === 'ore' ? c.ore : k === 'tries' ? 1 : k === 'books' ? (policy.book ? 1 : 0) : k === 'charms' ? (useCharm ? 1 : 0) : 0;
        const onFail = destroy ? zero[k] + (k === 'items' ? 1 : 0) : stay[k];
        return own + p * next[k] + fail * onFail;
      };
      E[i] = { gold: f('gold'), ore: f('ore'), tries: f('tries'), books: f('books'), charms: f('charms'), items: f('items') };
    }
  }
  return E[0];
}
export { defReduction, upMult };
