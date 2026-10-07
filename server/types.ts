import type { CostumeState } from '../shared/costume';
import type { Bag, Companion, Expedition, Item, Slot, Spec } from '../shared/game';
import type { Rng } from '../shared/rng';
import type { Clock } from './clock';
import type { Db } from './db';
import type { OymakRec } from './oba';
import type { World } from './world';

export interface PlayerData {
  v: 1; level: number; xp: number; kut: number; kutXp: number; gold: number; hp: number; spec: Spec;
  skillRanks: number[]; skillPts: number; bag: Bag; items: Item[]; equip: Partial<Record<Slot, Item>>;
  claimAt: number; companions: Companion[]; expeditions: Expedition[]; rested: number; loggedOutAt: number; outInHub: boolean;
  rank: number; rankKills: number; tut: { step: number; prog: number };
  /** v1.2 deney: günlük yüksek artı denemesi sayacı (yalnızca ENH.v11 açıkken yazılır) */ enh?: { day: number; n: number };
  /** telemetri (ekonomi kalibrasyonu): çevrimiçi/savaş saniyesi ve Kımız kullanımı; oyun mantığını etkilemez */ tel?: { onlineSec: number; combatSec: number; kimizUsed: number };
  counters: { kills: number; deaths: number; upgrades: number; pvpKills: number; destroyed: number };
  x: number; z: number; lang: 'tr' | 'en';
  clues: string[]; dreams: number; shards: number; pendingDream: number;
  /** isteğe bağlı PvP bayrağı (eski kayıtlarda yok = kapalı) */
  pvp?: boolean;
  /** kostüm sistemi (eski kayıtlarda yok) */
  cos?: CostumeState;
  /** kımız (şifa içeceği) adedi */
  kimiz?: number;
  /** günlük zindan hakkı ve toplam bitirme sayısı */
  dun?: { day: number; n: Record<string, number>; clears: Record<string, number> };
}

export interface Config {
  maxPerLayer: number; riftEvery: [number, number]; test: boolean; mobScale: number; rateLimit: boolean; spawnCamps: boolean; /** yalnızca test: her yönde yapay gecikme (ms) */ simLatency: number; /** yalnızca simülasyon: anlık görüntü üretme (ağ yok) */ headless?: boolean;
}
export interface Ctx {
  db: Db; clock: Clock; rng: Rng; cfg: Config; worlds: Set<World>; oymaks: Map<number, OymakRec>;
  /** pazarda satışı olmuş, postası beklenen çevrimiçi satıcılar (tick'te otomatik teslim) */
  mailFlag: Set<number>;
  broadcastSys: (key: string, p?: Record<string, string | number>) => void;
}

export class GameError extends Error {
  constructor(public code: string, public p?: Record<string, string | number>) { super(code); }
}

export const newPlayerData = (now: number, spawn: { x: number; z: number }, lang: 'tr' | 'en'): PlayerData => ({
  v: 1, level: 1, xp: 0, kut: 0, kutXp: 0, gold: 150, hp: 0, spec: 'none', skillRanks: [1, 1, 1, 1, 1, 1], skillPts: 0,
  bag: { ore: 6, hide: 0, wood: 0, book: 0, charm: 0, frag: 0 }, items: [], equip: {},
  claimAt: now, companions: [], expeditions: [], rested: 0, loggedOutAt: 0, outInHub: true, rank: 0, rankKills: 0,
  tut: { step: 0, prog: 0 }, counters: { kills: 0, deaths: 0, upgrades: 0, pvpKills: 0, destroyed: 0 },
  x: spawn.x, z: spawn.z, lang, clues: [], dreams: 0, shards: 0, pendingDream: 0,
});
