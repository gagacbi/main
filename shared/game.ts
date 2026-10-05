import type { Rng } from './rng';

// ───────────────────────── Temel tipler ─────────────────────────
export type Boy = 'gok' | 'yer' | 'ay';
export const BOYS: Boy[] = ['gok', 'yer', 'ay'];
export type Slot = 'weapon' | 'armor' | 'helmet' | 'amulet';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'amulet'];
export type Tier = 0 | 1 | 2 | 3; // sıradan, nadir, destansı, efsanevi
export const TIER_KEYS = ['common', 'rare', 'epic', 'legendary'] as const;
export type Spec = 'none' | 'kalkan' | 'kilic';
export type EnchKey = 'crit' | 'aspd' | 'mspd' | 'hpPct' | 'atkPct' | 'defPct' | 'leech' | 'xpPct'
  | 'defKilic' | 'defCift' | 'defBicak' | 'defYay' | 'defBuyu' | 'blockHit' | 'blockSkill' | 'pierce';
/** Hasar türü: silah türü + büyü. Savunmalar türe göre ayrıdır (Metin2: kılıç/çift el/bıçak/yay/büyü savunması). */
export type DmgKind = 'kilic' | 'cift' | 'bicak' | 'yay' | 'buyu';
export const DMG_KINDS: DmgKind[] = ['kilic', 'cift', 'bicak', 'yay', 'buyu'];
export const DEF_ENCH: Record<DmgKind, EnchKey> = { kilic: 'defKilic', cift: 'defCift', bicak: 'defBicak', yay: 'defYay', buyu: 'defBuyu' };

export interface Ench { k: EnchKey; v: number }
export interface Item {
  /** efsun yenileme sayısı (maliyeti artırır) */
  rr?: number;
  id: string; slot: Slot; band: number; ilvl: number; tier: Tier; up: number; ench: Ench[]; lvlReq: number;
  /** silah türü (yalnızca silah; eski kayıtlarda yok = kılıç) */
  wk?: DmgKind;
  /** temel efsun: her parçada slota göre garanti gelen sabit özellik (eski kayıtlarda yok) */
  base?: Ench;
}
export interface Bag { ore: number; hide: number; wood: number; book: number; charm: number; frag: number }
export type MatKey = 'ore' | 'hide' | 'wood';

// ───────────────────────── Dünya ─────────────────────────
export const TICK_HZ = 20;
export const WORLD_R = 160;
export const HUB_R = 36;
export const AOI_R = 75;
export const PLAYER_BASE_SPEED = 7.0;
export const BAG_SIZE = 30;
export const MAX_LEVEL = 50;
export const BOY_ID = { gok: 0, yer: 1, ay: 2 } as const;

export const HUB = {
  otag: { x: -15, z: -11, r: 6.8 },
  demirhane: { x: 15, z: -13, r: 4.2 },
  akSakal: { x: -15, z: -2.5 },
  demirci: { x: 11, z: -6.5 },
  fire: { x: 0, z: 0 },
  stele: { x: 2, z: -21 },
  spawn: { gok: { x: -7, z: 16 }, yer: { x: 0, z: 18 }, ay: { x: 7, z: 16 } },
  banners: { gok: { x: -9, z: 6 }, yer: { x: 0, z: 9 }, ay: { x: 9, z: 6 } },
  guards: [0, 1, 2, 3, 4, 5].map((i) => ({ x: Math.cos(i * 1.0472 + 0.5) * 30, z: Math.sin(i * 1.0472 + 0.5) * 30 })),
  interactOtag: 14,
  interactDemirci: 9,
  interactAkSakal: 9,
  interactStele: 9,
};

export function zoneAt(x: number, z: number): 'safe' | 'risky' {
  return x * x + z * z < HUB_R * HUB_R ? 'safe' : 'risky';
}

// ───────────────────────── Boylar ─────────────────────────
export const BOY_BONUS: Record<Boy, { mspd: number; aspd: number; hp: number; def: number; spell: number; heal: number }> = {
  gok: { mspd: 0.06, aspd: 0.05, hp: 0, def: 0, spell: 0, heal: 0 },
  yer: { mspd: 0, aspd: 0, hp: 0.05, def: 0.04, spell: 0, heal: 0 },
  ay: { mspd: 0, aspd: 0, hp: 0, def: 0, spell: 0.12, heal: 0.4 },
};
export const BOY_COLORS: Record<Boy, { main: string; accent: string; dark: string }> = {
  gok: { main: '#4aa8ff', accent: '#f4f8ff', dark: '#1d4f9c' },
  yer: { main: '#4fae5a', accent: '#b98a52', dark: '#2c6a34' },
  ay: { main: '#b9a8e8', accent: '#e8e8f4', dark: '#6a4fa8' },
};

// ───────────────────────── Yetenekler (Alp) ─────────────────────────
export type StatusKey = 'stun' | 'slow' | 'poison' | 'curse' | 'shield';
export interface SkillDef {
  id: string; lvl: number; cd: number; kind: 'aoe' | 'pull' | 'shield';
  r: number; mult: number; status?: Partial<Record<StatusKey, number>>; fx: string;
  /** hasar türü; yoksa silahın türü */
  dk?: DmgKind;
}
export const SKILLS: SkillDef[] = [
  { id: 'savurma', lvl: 1, cd: 4, kind: 'aoe', r: 4.4, mult: 1.6, fx: 'slash' },
  { id: 'sarsinti', lvl: 3, cd: 10, kind: 'aoe', r: 6.5, mult: 1.2, status: { stun: 1.8 }, fx: 'quake' },
  { id: 'nara', lvl: 5, cd: 12, kind: 'pull', dk: 'buyu', r: 14, mult: 0.35, status: { slow: 3.5 }, fx: 'roar' },
  { id: 'kalkan', lvl: 7, cd: 20, kind: 'shield', r: 0, mult: 0, status: { shield: 9 }, fx: 'shield' },
  { id: 'zehir', lvl: 9, cd: 8, kind: 'aoe', dk: 'buyu', r: 5.5, mult: 0.7, status: { poison: 6 }, fx: 'poison' },
  { id: 'hiddet', lvl: 12, cd: 30, kind: 'aoe', r: 9.5, mult: 7, fx: 'wrath' },
];
/** Zehirli Kesik: saniyelik hasar = saldırı × bu katsayı × kademe × büyü (savunmayı yok sayar) */
export const POISON_DOT = 0.2;
/** Tengri Kalkanı emilimi = azami can × bu katsayı × kademe × uzmanlık çarpanı */
export const SHIELD_ABSORB = 0.18;
export const SKILL_MAX_RANK = 6;
export const SKILL_RANK_LABEL = ['M1', 'M2', 'M3', 'M4', 'G1', 'P'];
export const skillRankMult = (rank: number) => 1 + 0.14 * (rank - 1);
export const skillRankGold = (rank: number) => 250 * rank * rank; // rank → rank+1 maliyeti
export const SPEC_LEVEL = 10;
export const SPEC_MODS: Record<Spec, { hp: number; def: number; atk: number; aspd: number; aoe: number; shield: number; taunt: boolean; dmgTaken: number; blockHit: number; blockSkill: number; pierce: number; /** oyuncudan gelen hasara ek çarpan (PvP dengesi; PvE'yi etkilemez) */ pvpTaken: number }> = {
  none: { hp: 0, def: 0, atk: 0, aspd: 0, aoe: 0, shield: 1, taunt: false, dmgTaken: 0, blockHit: 0, blockSkill: 0, pierce: 0, pvpTaken: 0 },
  kalkan: { hp: 0.08, def: 0.08, atk: -0.06, aspd: 0, aoe: 0, shield: 1.2, taunt: true, dmgTaken: -0.06, blockHit: 0.06, blockSkill: 0.04, pierce: 0, pvpTaken: 0.1 },
  kilic: { hp: -0.04, def: 0, atk: 0.14, aspd: 0.1, aoe: 0.2, shield: 1, taunt: false, dmgTaken: 0, blockHit: 0, blockSkill: 0, pierce: 0.06, pvpTaken: 0 },
};

// ───────────────────────── Seviye / deneyim ─────────────────────────
/** Hedef (bot, saat): Sv10≈1, Sv20≈6, Sv30≈20, Sv40≈55, Sv50≈110 — bkz. docs/BALANS_RAPORU.md */
export const xpToNext = (level: number) => Math.round(28 * Math.pow(level, 2.95) * (level % 10 === 9 ? 2.5 : 1));
export const mobXp = (lvl: number) => Math.round(10 + 8 * lvl);
export const KUT_PER_POINT = 1500; // seviye sınırından sonra bu kadar deneyim = 1 Kut puanı
export const kutBonusPct = (kut: number) => Math.min(25, kut * 0.5); // küçük kalıcı bonus (%)
export const RESTED_CAP_LEVELS = 1.5;
export const RESTED_PER_HOUR_LEVELS = 0.05;
export const RESTED_HUB_MULT = 1.5;
export const RESTED_XP_MULT = 2;
export const restedCap = (level: number) => Math.round(xpToNext(level) * RESTED_CAP_LEVELS);
export function restedGain(level: number, hours: number, inHub: boolean) {
  return Math.round(xpToNext(level) * RESTED_PER_HOUR_LEVELS * hours * (inHub ? RESTED_HUB_MULT : 1));
}

// ───────────────────────── Eşya ─────────────────────────
export const TIER_MULT = [1, 1.2, 1.45, 1.8];
/** Silah türü etkileri: saldırı çarpanı, vuruş hızı, ek kritik, menzil. Kılıç dengeli; çift el ağır; bıçak hızlı; yay/çan uzaktan ama zayıf. */
export const WEAPON_MODS: Record<DmgKind, { atk: number; aspd: number; crit: number; range: number; spell: number }> = {
  kilic: { atk: 0, aspd: 0, crit: 0, range: 3.6, spell: 0 },
  cift: { atk: 0.04, aspd: -0.12, crit: 0, range: 3.9, spell: 0 },
  bicak: { atk: -0.06, aspd: 0.18, crit: 4, range: 3.2, spell: 0 },
  yay: { atk: -0.09, aspd: 0, crit: 0, range: 8.5, spell: 0 },
  buyu: { atk: -0.08, aspd: -0.04, crit: 0, range: 6.5, spell: 0.3 },
};
/** Menzilli silahlar (menzil > bu değer) yürürken otomatik vuruş yapamaz: durup nişan almak gerekir (aksi hâlde kaçarak vurma riski sıfırlıyordu). */
export const RANGED_MIN_RANGE = 6;
export const WEAPON_DROP: [DmgKind, number][] = [['kilic', 0.4], ['cift', 0.2], ['bicak', 0.15], ['yay', 0.15], ['buyu', 0.1]];
export const weaponKindOf = (it: Pick<Item, 'wk'> | undefined | null): DmgKind => it?.wk ?? 'kilic';
export const TIER_COLORS = ['#c9c2b0', '#4aa8ff', '#b46bff', '#ffb02e'];
export const UP_PCT = [0, 10, 20, 30, 40, 60, 80, 105, 130, 160]; // +n → temel değere % ek
export const upMult = (up: number) => 1 + UP_PCT[Math.min(9, up)] / 100;
/** hedef seviye (+1…+9) → başarı şansı %. PRD §7 taslak tablosu. */
export const UPGRADE_RATE = [0, 100, 90, 85, 80, 65, 50, 35, 20, 10];
export const UPGRADE_DESTROYS_FROM = 5; // hedef +5 ve üstü başarısızlıkta eşya yok olur
export const BOOK_BONUS = 10; // demirci el kitabı: +10 puan
export const upgradeCost = (target: number, ilvl: number) => ({
  gold: Math.round(60 * target * target * (1 + ilvl / 6)),
  ore: 2 + target * 2,
});
export const bandOf = (ilvl: number) => Math.min(4, Math.floor(ilvl / 7));
export const itemLvlReq = (ilvl: number) => Math.max(1, ilvl - 2);

export interface ItemStats { atk: number; def: number; hp: number; critPct: number; atkPct: number }
export function itemBase(it: Pick<Item, 'slot' | 'ilvl' | 'tier'>): ItemStats {
  const m = TIER_MULT[it.tier];
  const o: ItemStats = { atk: 0, def: 0, hp: 0, critPct: 0, atkPct: 0 };
  switch (it.slot) {
    case 'weapon': o.atk = Math.round((5 + it.ilvl * 3.4) * m); break;
    case 'armor': o.def = Math.round((3 + it.ilvl * 1.6) * m); o.hp = Math.round((30 + it.ilvl * 14) * m); break;
    case 'helmet': o.def = Math.round((2 + it.ilvl * 1.0) * m); o.hp = Math.round((18 + it.ilvl * 8) * m); break;
    case 'amulet': o.critPct = Math.round((2 + it.ilvl * 0.15) * m * 10) / 10; o.atkPct = Math.round((1 + it.ilvl * 0.2) * m * 10) / 10; break;
  }
  return o;
}
export function itemStats(it: Item): ItemStats {
  const b = itemBase(it); const k = upMult(it.up);
  return { atk: Math.round(b.atk * k), def: Math.round(b.def * k), hp: Math.round(b.hp * k), critPct: +(b.critPct * k).toFixed(1), atkPct: +(b.atkPct * k).toFixed(1) };
}
export const ENCH_TABLE: Record<EnchKey, [number, number]> = {
  crit: [1, 5], aspd: [2, 8], mspd: [2, 6], hpPct: [3, 10], atkPct: [3, 9], defPct: [3, 10], leech: [2, 5], xpPct: [2, 6],
  defKilic: [3, 9], defCift: [3, 9], defBicak: [3, 9], defYay: [3, 9], defBuyu: [3, 9], blockHit: [3, 9], blockSkill: [3, 9], pierce: [3, 9],
};
/** Temel efsun havuzu (slota göre, her parçada bir tane garanti). Zırh=tür savunması, miğfer=blok, silah=delme/vuruş, tılsım=yardımcı. */
export const BASE_ENCH_POOL: Record<Slot, EnchKey[]> = {
  weapon: ['pierce', 'crit', 'atkPct', 'aspd'],
  armor: ['defKilic', 'defCift', 'defBicak', 'defYay', 'defBuyu'],
  helmet: ['blockHit', 'blockSkill', 'hpPct', 'defPct'],
  amulet: ['leech', 'xpPct', 'mspd', 'crit'],
};
export const ENCH_KEYS = Object.keys(ENCH_TABLE) as EnchKey[];

let itemSeq = 0;
export function newId(prefix = 'i'): string {
  itemSeq = (itemSeq + 1) % 1e9;
  return prefix + Date.now().toString(36) + itemSeq.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

export function rollTier(r: Rng, minTier: Tier = 0, bonus = 0): Tier {
  const x = r() * (1 + bonus);
  let t: Tier = x < 0.02 ? 3 : x < 0.08 ? 2 : x < 0.3 ? 1 : 0;
  if (bonus > 0 && x > 1) t = (Math.min(3, t + 1) as Tier);
  return (Math.max(t, minTier) as Tier);
}
export function rollWeaponKind(r: Rng): DmgKind {
  let x = r(); for (const [k, w] of WEAPON_DROP) { if (x < w) return k; x -= w; } return 'kilic';
}
export function makeItem(r: Rng, slot: Slot, ilvl: number, tier: Tier, wk?: DmgKind): Item {
  const ench: Ench[] = [];
  const n = tier;
  const roll = (k: EnchKey): Ench => { const [lo, hi] = ENCH_TABLE[k]; return { k, v: Math.round((lo + (hi - lo) * r()) * 10) / 10 }; };
  const poolB = BASE_ENCH_POOL[slot]; const base = roll(poolB[Math.floor(r() * poolB.length)]);
  const pool = ENCH_KEYS.filter((k) => k !== base.k);
  for (let i = 0; i < n && pool.length; i++) ench.push(roll(pool.splice(Math.floor(r() * pool.length), 1)[0]));
  const it: Item = { id: newId(), slot, band: bandOf(ilvl), ilvl, tier, up: 0, ench, lvlReq: itemLvlReq(ilvl), base };
  if (slot === 'weapon') it.wk = wk ?? rollWeaponKind(r);
  return it;
}
export const randomSlot = (r: Rng): Slot => SLOTS[Math.floor(r() * SLOTS.length)];

// ───────────────────────── Oyuncu istatistikleri ─────────────────────────
export interface StatInput { level: number; boy: Boy; spec: Spec; equip: Partial<Record<Slot, Item>>; kut: number }
export interface Stats {
  maxHp: number; atk: number; def: number; crit: number; critMult: number; atkInterval: number;
  moveSpeed: number; leech: number; xpPct: number; spell: number; heal: number; aoe: number; shieldMult: number; dmgTaken: number;
  /** tür savunması (0–0,5): gelen hasarı o oranda azaltır */
  defKind: Record<DmgKind, number>; blockHit: number; blockSkill: number; pierce: number; weaponKind: DmgKind; range: number;
}
/** Üst sınırlar: efsun/boy/uzmanlık yığılınca bile hesap uçmasın (BALANS_RAPORU §bonus hesapları) */
export const STAT_CAP = { crit: 75, aspd: 0.6, leech: 0.2, mspd: 0.5, defKind: 0.4, blockHit: 0.35, blockSkill: 0.3, pierce: 0.4 };
export function computeStats(p: StatInput): Stats {
  const L = p.level;
  let hp = 150 + 34 * (L - 1);
  let atk = 12 + 4.5 * (L - 1);
  let def = 6 + 2.2 * (L - 1);
  let crit = 5; let aspd = 0; let mspd = 0; let leech = 0; let xpPct = 0;
  let hpPct = 0; let atkPct = 0; let defPct = 0;
  const defKind: Record<DmgKind, number> = { kilic: 0, cift: 0, bicak: 0, yay: 0, buyu: 0 };
  let blockHit = 0; let blockSkill = 0; let pierce = 0;
  const apply = (e: Ench) => {
    switch (e.k) {
      case 'crit': crit += e.v; break; case 'aspd': aspd += e.v / 100; break; case 'mspd': mspd += e.v / 100; break;
      case 'hpPct': hpPct += e.v / 100; break; case 'atkPct': atkPct += e.v; break; case 'defPct': defPct += e.v / 100; break;
      case 'leech': leech += e.v / 100; break; case 'xpPct': xpPct += e.v; break;
      case 'defKilic': defKind.kilic += e.v / 100; break; case 'defCift': defKind.cift += e.v / 100; break; case 'defBicak': defKind.bicak += e.v / 100; break;
      case 'defYay': defKind.yay += e.v / 100; break; case 'defBuyu': defKind.buyu += e.v / 100; break;
      case 'blockHit': blockHit += e.v / 100; break; case 'blockSkill': blockSkill += e.v / 100; break; case 'pierce': pierce += e.v / 100; break;
    }
  };
  for (const it of Object.values(p.equip)) {
    if (!it) continue;
    const s = itemStats(it);
    atk += s.atk; def += s.def; hp += s.hp; crit += s.critPct; atkPct += s.atkPct;
    if (it.base) apply(it.base);
    for (const e of it.ench) apply(e);
  }
  const wk = weaponKindOf(p.equip.weapon); const wm = WEAPON_MODS[wk];
  const b = BOY_BONUS[p.boy]; const sp = SPEC_MODS[p.spec];
  hp *= 1 + hpPct + b.hp + sp.hp;
  def *= 1 + defPct + b.def + sp.def;
  atk *= 1 + atkPct / 100 + sp.atk + wm.atk + kutBonusPct(p.kut) / 100;
  aspd += b.aspd + sp.aspd + wm.aspd; mspd += b.mspd; crit += wm.crit;
  blockHit += sp.blockHit; blockSkill += sp.blockSkill; pierce += sp.pierce;
  crit = Math.min(STAT_CAP.crit, crit); aspd = Math.min(STAT_CAP.aspd, aspd); leech = Math.min(STAT_CAP.leech, leech); mspd = Math.min(STAT_CAP.mspd, mspd);
  for (const k of DMG_KINDS) defKind[k] = Math.min(STAT_CAP.defKind, defKind[k]);
  return {
    maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), crit, critMult: 1.6,
    atkInterval: 0.55 / (1 + Math.max(-0.5, aspd)), moveSpeed: PLAYER_BASE_SPEED * (1 + mspd), leech, xpPct,
    spell: 1 + b.spell + wm.spell, heal: 1 + b.heal, aoe: 1 + sp.aoe, shieldMult: sp.shield, dmgTaken: 1 + sp.dmgTaken,
    defKind, blockHit: Math.min(STAT_CAP.blockHit, blockHit), blockSkill: Math.min(STAT_CAP.blockSkill, blockSkill), pierce: Math.min(STAT_CAP.pierce, pierce), weaponKind: wk, range: wm.range,
  };
}

/** Delici vuruş savunmayı yok saymanın yanında bu kadar ek hasar verir (delme bedelini ödetmek için). */
export const PIERCE_BONUS = 1.25;
/** Gelen vuruşa savunma uygular. Delme (pierce) şansı tür savunmasını ve bloğu yok sayar. rng3: [delme, blok] zarları. */
export function applyDefense(stats: Pick<Stats, 'defKind' | 'blockHit' | 'blockSkill'>, kind: DmgKind, skill: boolean, pierce: number, rollPierce: number, rollBlock: number): { mult: number; blocked: boolean; pierced: boolean } {
  const pierced = rollPierce < pierce;
  if (pierced) return { mult: PIERCE_BONUS, blocked: false, pierced: true };
  const chance = skill ? stats.blockSkill : stats.blockHit;
  if (rollBlock < chance) return { mult: 0, blocked: true, pierced: false };
  return { mult: 1 - stats.defKind[kind], blocked: false, pierced: false };
}

/** Hasar formülü (savunma azaltımı). pvp = PvP katsayısı ayrı ayarlanır (PRD §5 denge). */
export const PVE_COEF = 1.0;
/** Düşük seviye koruması: saldırgandan bu kadar seviye aşağıdaki hedef (ve çatışmayı başlatmamışsa) PvP'de hasar azaltması alır; 20+ farkta dokunulmazdır. */
export const pvpGapMult = (attLevel: number, tgtLevel: number) => { const gap = attLevel - tgtLevel; return gap >= 20 ? 0 : gap >= 10 ? 0.25 : gap >= 6 ? 0.6 : 1; };
/** Kalabalık kampta yeniden doğuş süresi çarpanı: oyuncu sayısı arttıkça kısalır (taban 0,25) */
export const campRespawnMult = (playersNear: number) => Math.max(0.4, 1 / (1 + 0.12 * Math.max(0, playersNear - 1)));
export const PVP_COEF = 0.35;
export const CURSE_DMG_MULT = 0.75;
export const defReduction = (def: number) => 100 / (100 + def);
export function hitDamage(atk: number, mult: number, def: number, pvp: boolean, cursed: boolean, roll = 1) {
  return Math.max(1, Math.round(atk * mult * roll * defReduction(def) * (pvp ? PVP_COEF : PVE_COEF) * (cursed ? CURSE_DMG_MULT : 1)));
}

/** Seviye farkı (yaratık − oyuncu) PvE hasarını eğer: yüksek seviye yaratığa vuruşlar azalır, yaratığın vuruşları artar. */
export const lvlDiffOut = (diff: number) => (diff > 0 ? Math.max(0.35, 1 - 0.05 * diff) : Math.min(1.1, 1 + 0.02 * -diff)); // oyuncunun yaratığa hasarı
export const lvlDiffIn = (diff: number) => (diff > 0 ? Math.min(2, 1 + 0.05 * diff) : Math.max(0.5, 1 - 0.04 * -diff)); // yaratığın oyuncuya hasarı

// ───────────────────────── Yaratıklar ─────────────────────────
export type MobType = 'tepegoz' | 'albasti' | 'erlik' | 'cakal' | 'bekci';
export interface MobDef {
  kind: DmgKind; hp: number; atk: number; def: number; speed: number; atkInterval: number; range: number; aggro: number; scale: number;
  onHit?: { status: StatusKey; chance: number; dur: number };
}
export const MOBS: Record<MobType, MobDef> = {
  tepegoz: { kind: 'cift', hp: 1.35, atk: 1.25, def: 1.1, speed: 3.3, atkInterval: 2.0, range: 2.6, aggro: 9, scale: 1.25, onHit: { status: 'stun', chance: 0.08, dur: 1 } },
  albasti: { kind: 'buyu', hp: 0.9, atk: 1.0, def: 0.8, speed: 4.2, atkInterval: 1.6, range: 2.3, aggro: 11, scale: 1.0, onHit: { status: 'curse', chance: 0.3, dur: 6 } },
  erlik: { kind: 'buyu', hp: 1.0, atk: 1.15, def: 1.0, speed: 4.4, atkInterval: 1.5, range: 2.3, aggro: 10, scale: 1.05, onHit: { status: 'poison', chance: 0.25, dur: 5 } },
  cakal: { kind: 'bicak', hp: 0.6, atk: 0.8, def: 0.6, speed: 5.4, atkInterval: 1.0, range: 2.0, aggro: 10, scale: 0.9, onHit: { status: 'slow', chance: 0.25, dur: 2.5 } },
  bekci: { kind: 'cift', hp: 16, atk: 2.8, def: 1.5, speed: 3.6, atkInterval: 2.2, range: 4.2, aggro: 30, scale: 3.2, onHit: { status: 'stun', chance: 0.2, dur: 1.2 } },
};
/** Yaratık canı: temel eğri × (2,3 + 1,5/(1+L/12)). Hedef: referans oyuncu aynı seviye yaratığı ≈3–5 sn'de keser (docs/BALANS_RAPORU.md). */
export const mobHp = (lvl: number) => (20 + 14 * lvl + 0.5 * lvl * lvl) * (2.3 + 1.5 / (1 + lvl / 12));
export const mobAtk = (lvl: number) => 4 + 2.4 * lvl + 0.045 * lvl * lvl;
export const mobDef = (lvl: number) => 1 + 1.4 * lvl;
/** Altın girişi dengesi: nüfus simülasyonu günlük girişin sink'in 11 katı olduğunu gösterdi (BALANS_RAPORU/POPULASYON_RAPORU) */
export const GOLD_MULT = 0.45;
export const mobGold = (lvl: number) => Math.max(1, Math.round((3 + 2 * (lvl <= 30 ? lvl : 30 + (lvl - 30) * 0.5)) * GOLD_MULT * 10) / 10);
export const MOB_RESPAWN: [number, number] = [10, 18];
export const MAX_CAMP_LEVEL = 48;
export const campLevel = (dist: number) => Math.max(1, Math.min(MAX_CAMP_LEVEL, Math.round(1 + (dist - 40) / 2.5)));
export function campTypes(dist: number): MobType[] {
  if (dist < 75) return ['tepegoz', 'cakal'];
  if (dist < 115) return ['albasti', 'cakal', 'tepegoz'];
  return ['erlik', 'albasti', 'cakal'];
}

// ───────────────────────── Erlik çatlağı ─────────────────────────
export const RIFT = {
  maxActive: 2, spawnEverySec: [150, 300] as [number, number], lifeSec: 600, activateR: 20, rewardR: 34, minDist: 70, maxDist: 135,
  waves: 3, waveBase: 5, wavePerPlayer: 1, hpPerExtra: 0.35, guardianHpMult: 1, rewardXpMult: 80, rewardGoldMult: 30, waveGapSec: 7, gapHealPct: 0.25,
};

/** Üretim maliyetleri (demirci). Tılsım ucuz olursa yok olma riski anlamsızlaşır: BALANS_RAPORU §artı basma */
export const CRAFT = { book: { ore: 4, gold: 60 }, charm: { ore: 24, hide: 12, gold: 900 }, gear: { ore: 10, hide: 4, wood: 4, goldBase: 150, goldPerLevel: 20 } };

// ───────────────────────── Saha bosları ve kilometre taşları ─────────────────────────
/** Her 10 seviyelik grubun bir saha bossu vardır; yaratık gibi savunma türüne sahiptir ve o türe karşı savunma efsunlu ganimet düşürür. */
export const FIELD_BOSS = {
  respawnSec: 900, aggro: 13, hpMult: 1.3, scaleView: 2.1, xpMult: 40, goldMult: 25, slamEverySec: 11, slamTelegraphSec: 1.4, hpPerExtra: 0.3, maxScale: 8, slamRadius: 7, slamMult: 2.4, enrageBelow: 0.3, enrageAtkSpeed: 1.35,
  /** [seviye, hasar türü, ad anahtarı] */
  list: [[9, 'cift', 'boss.1'], [19, 'buyu', 'boss.2'], [29, 'bicak', 'boss.3'], [39, 'buyu', 'boss.4'], [48, 'cift', 'boss.5']] as [number, DmgKind, string][],
};
export const MILESTONE_LEVELS = [10, 20, 30, 40, 50];
/** Kilometre taşı armağanı (Kut Armağanı): seviye 10·20·30·40·50 */
export const milestoneGift = (level: number) => ({ gold: 400 * level, books: Math.round(level / 10), charms: Math.round(level / 10), itemTier: (level >= 40 ? 3 : 2) as Tier, frags: level / 10 * 5 });

// ───────────────────────── Oba ─────────────────────────
export type BuildingKey = 'otag' | 'demir';
export const BUILDINGS: BuildingKey[] = ['otag', 'demir'];
export const NOVICE_MAX_LEVEL = 3; // acemi oba bina üst sınırı
export const OBA = {
  upgradeGold: (to: number) => 300 * to * to,
  upgradeRes: (to: number) => ({ ore: 12 * to, hide: 8 * to, wood: 14 * to }),
  upgradeSec: (to: number) => 300 * to, // 5 dk × seviye
  upgradePoints: (to: number) => 30 * to,
  rate: (otag: number, demir: number) => ({ wood: 6 * otag, hide: 3 * otag, ore: 1 * otag + 4 * demir }),
  capHours: (otag: number) => 8 + 4 * otag,
  slots: (otag: number) => Math.min(6, 2 + (otag - 1) * 2),
  memberCap: (otag: number) => 20 + (otag - 1) * 20,
  noviceMembers: 20,
  baseWeight: 10,
};
export const EXPEDITION_HOURS = [1, 4, 12] as const;
export type Trait = 'gozupek' | 'tuccar' | 'sansli' | 'cevik';
export const TRAITS: Trait[] = ['gozupek', 'tuccar', 'sansli', 'cevik'];
export interface Companion { id: string; name: string; cls: 'alp' | 'kam' | 'mergen'; level: number; xp: number; traits: Trait[] }
export interface Expedition { id: string; compId: string; hours: number; startAt: number; endAt: number; seed: number }
export interface ExpeditionResult { gold: number; mats: Partial<Record<MatKey, number>>; items: Item[]; frag: number; compXp: number; compLevelUp: boolean }

export const COMPANION_NAMES = ['Börte', 'Kürşad', 'Umay', 'Tonyukuk', 'Alpagut', 'Kaan', 'Ayaz', 'Boğaç', 'Gökçe', 'Yıldız', 'Tarkan', 'Selcen'];

// Kayıp Yazıtlar (sunucu çapı)
export const INSCRIPTIONS = [40, 120, 300, 700, 1500]; // toplam parça eşikleri (prototip)

// Öğretici (ak sakal)
export const TUTORIAL_STEPS = ['kill', 'donate', 'build', 'expedition', 'upgrade'] as const;
export const TUTORIAL_TARGET = { kill: 5, donate: 5, build: 1, expedition: 1, upgrade: 1 };
export const TUTORIAL_REWARD = { kill: { gold: 80 }, donate: { gold: 120 }, build: { gold: 200 }, expedition: { gold: 150 }, upgrade: { gold: 300, charm: 1 } } as const;

// Sohbet / sınırlar
export const RATE = { msgPerSec: 60, rpcPerSec: 12, chatPerSec: 1.5 };
export const BAD_WORDS = ['amk', 'aq', 'orospu', 'piç', 'siktir', 'fuck', 'shit', 'bitch'];
export const DEATH_XP_LOSS = 0.1;
/** yeni oyuncuyu korur: Sv10 altında ölünce deneyim kaybı yok, Sv20 altında yarısı (nüfus simülasyonu: yeni başlayanın ayrılma riski en yüksek) */
export const deathXpLoss = (level: number) => (level < 10 ? 0 : level < 20 ? DEATH_XP_LOSS * 0.5 : DEATH_XP_LOSS); // riskli bölgede ölünce mevcut seviye deneyiminin bu oranı gider (seviye düşmez)
export const RESPAWN_SEC = 3;
/** yeniden doğduktan sonra dokunulmazlık (ms): muhafız/yaratık ölüm döngüsünü kırar; saldırınca biter */
export const RESPAWN_PROTECT_MS = 8000;
export const COMBAT_FLAG_SEC = 15;
export const RANK_RECOVER_KILLS = 20;
export const NEW_ACCOUNT_NOTE = 48; // saat: yeni hesap ilan veremez (bot / gerçek para ticareti önlemi)

// ───────────────────────── Efsun yenileme (altın sinki + oyuncuya savunma/yapı üzerinde söz hakkı) ─────────────────────────
export const REROLL = { base: 40, ilvlAdd: 10, perRepeat: 0.12, baseLineMult: 2.5, targetedMult: 6 };
/** rastgele yenileme: temel × (1 + 0,12 × önceki yenileme); temel efsun ×2,5; istediğin efsunu seçmek ×6 */
export const rerollCost = (it: Pick<Item, 'ilvl' | 'rr'>, isBase: boolean, targeted: boolean) => Math.round(REROLL.base * (it.ilvl + REROLL.ilvlAdd) * (1 + REROLL.perRepeat * Math.min(40, it.rr ?? 0)) * (isBase ? REROLL.baseLineMult : 1) * (targeted ? REROLL.targetedMult : 1));

// ───────────────────────── Pazar ─────────────────────────
/** Oyuncular arası pazar. Vergi ve ilan ücreti akçe sinkidir; yeni hesap kısıtı ve fiyat tavanı bot/RMT önlemidir. */
export const MARKET = { taxPct: 0.05, listFeePct: 0.01, listFeeMin: 10, maxListings: 8, durationH: 72, newAccountH: NEW_ACCOUNT_NOTE, maxPriceMult: 8, maxPriceFloor: 2000, pageSize: 30, absoluteMax: 50_000_000 };
/** Satıcıya (NPC) satış fiyatı */
export const vendorPrice = (it: Pick<Item, 'ilvl' | 'tier' | 'up'>) => Math.round((8 + it.ilvl * 4) * TIER_MULT[it.tier] * (1 + it.up * 0.5));
/** Referans değer: NPC fiyatı ×6 + basılan artıların akçe maliyeti. Pazar fiyat tavanı ve "fırsat" göstergesi buna dayanır. */
export const marketRef = (it: Pick<Item, 'ilvl' | 'tier' | 'up'>) => { let g = vendorPrice({ ilvl: it.ilvl, tier: it.tier, up: 0 }) * 6; for (let t = 1; t <= it.up; t++) g += upgradeCost(t, it.ilvl).gold; return g; };
export const marketPriceBounds = (it: Pick<Item, 'ilvl' | 'tier' | 'up'>) => ({ min: vendorPrice(it), max: Math.min(MARKET.absoluteMax, Math.round(marketRef(it) * MARKET.maxPriceMult + MARKET.maxPriceFloor)) });
