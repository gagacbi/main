import type { Rng } from './rng';

// ───────────────────────── Temel tipler ─────────────────────────
export type Boy = 'gok' | 'yer' | 'ay';
export const BOYS: Boy[] = ['gok', 'yer', 'ay'];
export type Slot = 'weapon' | 'armor' | 'helmet' | 'amulet';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'amulet'];
export type Tier = 0 | 1 | 2 | 3; // sıradan, nadir, destansı, efsanevi
export const TIER_KEYS = ['common', 'rare', 'epic', 'legendary'] as const;
export type Spec = 'none' | 'kalkan' | 'kilic';
export type EnchKey = 'crit' | 'aspd' | 'mspd' | 'hpPct' | 'atkPct' | 'defPct' | 'leech' | 'xpPct';

export interface Ench { k: EnchKey; v: number }
export interface Item {
  id: string; slot: Slot; band: number; ilvl: number; tier: Tier; up: number; ench: Ench[]; lvlReq: number;
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
  spawn: { gok: { x: -7, z: 16 }, yer: { x: 0, z: 18 }, ay: { x: 7, z: 16 } },
  banners: { gok: { x: -9, z: 6 }, yer: { x: 0, z: 9 }, ay: { x: 9, z: 6 } },
  guards: [0, 1, 2, 3, 4, 5].map((i) => ({ x: Math.cos(i * 1.0472 + 0.5) * 30, z: Math.sin(i * 1.0472 + 0.5) * 30 })),
  interactOtag: 14,
  interactDemirci: 9,
  interactAkSakal: 9,
};

export function zoneAt(x: number, z: number): 'safe' | 'risky' {
  return x * x + z * z < HUB_R * HUB_R ? 'safe' : 'risky';
}

// ───────────────────────── Boylar ─────────────────────────
export const BOY_BONUS: Record<Boy, { mspd: number; aspd: number; hp: number; def: number; spell: number; heal: number }> = {
  gok: { mspd: 0.06, aspd: 0.05, hp: 0, def: 0, spell: 0, heal: 0 },
  yer: { mspd: 0, aspd: 0, hp: 0.08, def: 0.08, spell: 0, heal: 0 },
  ay: { mspd: 0, aspd: 0, hp: 0, def: 0, spell: 0.07, heal: 0.4 },
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
}
export const SKILLS: SkillDef[] = [
  { id: 'savurma', lvl: 1, cd: 4, kind: 'aoe', r: 4.4, mult: 1.6, fx: 'slash' },
  { id: 'sarsinti', lvl: 3, cd: 10, kind: 'aoe', r: 6.5, mult: 1.2, status: { stun: 1.8 }, fx: 'quake' },
  { id: 'nara', lvl: 5, cd: 12, kind: 'pull', r: 14, mult: 0.35, status: { slow: 3.5 }, fx: 'roar' },
  { id: 'kalkan', lvl: 7, cd: 20, kind: 'shield', r: 0, mult: 0, status: { shield: 9 }, fx: 'shield' },
  { id: 'zehir', lvl: 9, cd: 8, kind: 'aoe', r: 5.5, mult: 0.7, status: { poison: 6 }, fx: 'poison' },
  { id: 'hiddet', lvl: 12, cd: 30, kind: 'aoe', r: 9.5, mult: 3.8, fx: 'wrath' },
];
export const SKILL_MAX_RANK = 6;
export const SKILL_RANK_LABEL = ['M1', 'M2', 'M3', 'M4', 'G1', 'P'];
export const skillRankMult = (rank: number) => 1 + 0.14 * (rank - 1);
export const skillRankGold = (rank: number) => 250 * rank * rank; // rank → rank+1 maliyeti
export const SPEC_LEVEL = 10;
export const SPEC_MODS: Record<Spec, { hp: number; def: number; atk: number; aspd: number; aoe: number; shield: number; taunt: boolean; dmgTaken: number }> = {
  none: { hp: 0, def: 0, atk: 0, aspd: 0, aoe: 0, shield: 1, taunt: false, dmgTaken: 0 },
  kalkan: { hp: 0.22, def: 0.25, atk: -0.08, aspd: 0, aoe: 0, shield: 1.6, taunt: true, dmgTaken: -0.12 },
  kilic: { hp: -0.08, def: 0, atk: 0.16, aspd: 0.12, aoe: 0.2, shield: 1, taunt: false, dmgTaken: 0 },
};

// ───────────────────────── Seviye / deneyim ─────────────────────────
export const xpToNext = (level: number) => Math.round(45 * Math.pow(level, 1.8) * (level % 10 === 9 ? 2.5 : 1));
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
  crit: [1, 5], aspd: [2, 8], mspd: [2, 6], hpPct: [3, 10], atkPct: [3, 9], defPct: [3, 10], leech: [1, 3], xpPct: [2, 6],
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
export function makeItem(r: Rng, slot: Slot, ilvl: number, tier: Tier): Item {
  const ench: Ench[] = [];
  const n = tier;
  const pool = [...ENCH_KEYS];
  for (let i = 0; i < n && pool.length; i++) {
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const [lo, hi] = ENCH_TABLE[k];
    ench.push({ k, v: Math.round((lo + (hi - lo) * r()) * 10) / 10 });
  }
  return { id: newId(), slot, band: bandOf(ilvl), ilvl, tier, up: 0, ench, lvlReq: itemLvlReq(ilvl) };
}
export const randomSlot = (r: Rng): Slot => SLOTS[Math.floor(r() * SLOTS.length)];

// ───────────────────────── Oyuncu istatistikleri ─────────────────────────
export interface StatInput { level: number; boy: Boy; spec: Spec; equip: Partial<Record<Slot, Item>>; kut: number }
export interface Stats {
  maxHp: number; atk: number; def: number; crit: number; critMult: number; atkInterval: number;
  moveSpeed: number; leech: number; xpPct: number; spell: number; heal: number; aoe: number; shieldMult: number; dmgTaken: number;
}
export function computeStats(p: StatInput): Stats {
  const L = p.level;
  let hp = 150 + 34 * (L - 1);
  let atk = 12 + 4.5 * (L - 1);
  let def = 6 + 2.2 * (L - 1);
  let crit = 5; let aspd = 0; let mspd = 0; let leech = 0; let xpPct = 0;
  let hpPct = 0; let atkPct = 0; let defPct = 0;
  for (const it of Object.values(p.equip)) {
    if (!it) continue;
    const s = itemStats(it);
    atk += s.atk; def += s.def; hp += s.hp; crit += s.critPct; atkPct += s.atkPct;
    for (const e of it.ench) {
      switch (e.k) {
        case 'crit': crit += e.v; break; case 'aspd': aspd += e.v / 100; break; case 'mspd': mspd += e.v / 100; break;
        case 'hpPct': hpPct += e.v / 100; break; case 'atkPct': atkPct += e.v; break; case 'defPct': defPct += e.v / 100; break;
        case 'leech': leech += e.v / 100; break; case 'xpPct': xpPct += e.v; break;
      }
    }
  }
  const b = BOY_BONUS[p.boy]; const sp = SPEC_MODS[p.spec];
  hp *= 1 + hpPct + b.hp + sp.hp;
  def *= 1 + defPct + b.def + sp.def;
  atk *= 1 + atkPct / 100 + sp.atk + kutBonusPct(p.kut) / 100;
  aspd += b.aspd + sp.aspd; mspd += b.mspd;
  return {
    maxHp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), crit, critMult: 1.6,
    atkInterval: 0.55 / (1 + aspd), moveSpeed: PLAYER_BASE_SPEED * (1 + mspd), leech, xpPct,
    spell: 1 + b.spell, heal: 1 + b.heal, aoe: 1 + sp.aoe, shieldMult: sp.shield, dmgTaken: 1 + sp.dmgTaken,
  };
}

/** Hasar formülü (savunma azaltımı). pvp = PvP katsayısı ayrı ayarlanır (PRD §5 denge). */
export const PVE_COEF = 1.0;
export const PVP_COEF = 0.35;
export const CURSE_DMG_MULT = 0.75;
export const defReduction = (def: number) => 100 / (100 + def);
export function hitDamage(atk: number, mult: number, def: number, pvp: boolean, cursed: boolean, roll = 1) {
  return Math.max(1, Math.round(atk * mult * roll * defReduction(def) * (pvp ? PVP_COEF : PVE_COEF) * (cursed ? CURSE_DMG_MULT : 1)));
}

// ───────────────────────── Yaratıklar ─────────────────────────
export type MobType = 'tepegoz' | 'albasti' | 'erlik' | 'cakal' | 'bekci';
export interface MobDef {
  hp: number; atk: number; def: number; speed: number; atkInterval: number; range: number; aggro: number; scale: number;
  onHit?: { status: StatusKey; chance: number; dur: number };
}
export const MOBS: Record<MobType, MobDef> = {
  tepegoz: { hp: 1.35, atk: 1.25, def: 1.1, speed: 3.3, atkInterval: 2.0, range: 2.6, aggro: 9, scale: 1.25, onHit: { status: 'stun', chance: 0.08, dur: 1 } },
  albasti: { hp: 0.9, atk: 1.0, def: 0.8, speed: 4.2, atkInterval: 1.6, range: 2.3, aggro: 11, scale: 1.0, onHit: { status: 'curse', chance: 0.3, dur: 6 } },
  erlik: { hp: 1.0, atk: 1.15, def: 1.0, speed: 4.4, atkInterval: 1.5, range: 2.3, aggro: 10, scale: 1.05, onHit: { status: 'poison', chance: 0.25, dur: 5 } },
  cakal: { hp: 0.6, atk: 0.8, def: 0.6, speed: 5.4, atkInterval: 1.0, range: 2.0, aggro: 10, scale: 0.9, onHit: { status: 'slow', chance: 0.25, dur: 2.5 } },
  bekci: { hp: 14, atk: 1.7, def: 1.5, speed: 3.6, atkInterval: 2.2, range: 4.2, aggro: 30, scale: 3.2, onHit: { status: 'stun', chance: 0.2, dur: 1.2 } },
};
export const mobHp = (lvl: number) => 20 + 14 * lvl + 0.5 * lvl * lvl;
export const mobAtk = (lvl: number) => 4 + 2.4 * lvl;
export const mobDef = (lvl: number) => 1 + 1.4 * lvl;
export const mobGold = (lvl: number) => 3 + 2 * lvl;
export const MOB_RESPAWN: [number, number] = [10, 18];
export const campLevel = (dist: number) => Math.max(1, Math.min(24, Math.round(1 + (dist - 40) / 5.2)));
export function campTypes(dist: number): MobType[] {
  if (dist < 75) return ['tepegoz', 'cakal'];
  if (dist < 115) return ['albasti', 'cakal', 'tepegoz'];
  return ['erlik', 'albasti', 'cakal'];
}

// ───────────────────────── Erlik çatlağı ─────────────────────────
export const RIFT = {
  maxActive: 2, spawnEverySec: [150, 300] as [number, number], lifeSec: 600, activateR: 20, rewardR: 34, minDist: 70, maxDist: 135,
  waves: 3, waveBase: 5, wavePerPlayer: 2, hpPerExtra: 0.35, guardianHpMult: 1,
};

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
export const INSCRIPTIONS = [40, 120, 300]; // toplam parça eşikleri (prototip)

// Öğretici (ak sakal)
export const TUTORIAL_STEPS = ['kill', 'donate', 'build', 'expedition', 'upgrade'] as const;
export const TUTORIAL_TARGET = { kill: 5, donate: 5, build: 1, expedition: 1, upgrade: 1 };
export const TUTORIAL_REWARD = { kill: { gold: 80 }, donate: { gold: 120 }, build: { gold: 200 }, expedition: { gold: 150 }, upgrade: { gold: 300, charm: 1 } } as const;

// Sohbet / sınırlar
export const RATE = { msgPerSec: 60, rpcPerSec: 12, chatPerSec: 1.5 };
export const BAD_WORDS = ['amk', 'aq', 'orospu', 'piç', 'siktir', 'fuck', 'shit', 'bitch'];
export const DEATH_XP_LOSS = 0.06;
export const RESPAWN_SEC = 3;
export const COMBAT_FLAG_SEC = 15;
export const RANK_RECOVER_KILLS = 20;
export const NEW_ACCOUNT_NOTE = 48; // saat: ticaret sınırı (ileri aşama, belgelenmiş)
