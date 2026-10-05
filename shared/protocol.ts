import type { Boy, Bag, Companion, Expedition, Item, Slot, Spec, StatusKey, Stats, MobType, BuildingKey } from './game';

// ───────── İstemci → Sunucu ─────────
export interface JoinOptions {
  name: string; password: string; create?: { boy: Boy }; lang?: 'tr' | 'en';
}
export type RpcOp =
  | 'equip' | 'unequip' | 'sell' | 'upgrade' | 'craft' | 'spec' | 'rankSkill' | 'respawn'
  | 'duel' | 'duelAccept' | 'oba.state' | 'oba.donate' | 'oba.claim' | 'oba.build' | 'oba.dispatch' | 'oba.collect'
  | 'inscription' | 'lang' | 'gm' | 'stone' | 'elder' | 'dreamSeen'
  | 'reroll' | 'market.browse' | 'market.list' | 'market.buy' | 'market.cancel' | 'market.mine' | 'market.claim';

// ───────── Sunucu → İstemci ─────────
export interface Welcome {
  id: number; roomId: string; layer: number; serverTime: number; tickHz: number;
}
export interface ObaInfo {
  id: number; name: string; npc: string; members: number; memberCap: number;
  levels: Record<BuildingKey, number>; maxLevel: number;
  upgrade: { b: BuildingKey; to: number; finishAt: number } | null;
  storage: { ore: number; hide: number; wood: number };
  rate: { ore: number; hide: number; wood: number }; capHours: number;
  pending: { ore: number; hide: number; wood: number; hours: number };
  share: number; points: number; rank: number; slots: number;
  nextCost: Partial<Record<BuildingKey, { gold: number; ore: number; hide: number; wood: number; sec: number } | null>>;
}
export interface Me {
  name: string; boy: Boy; level: number; xp: number; xpNext: number; kut: number; gold: number; spec: Spec;
  hp: number; stats: Stats; skillRanks: number[]; skillPts: number; bag: Bag; items: Item[]; equip: Partial<Record<Slot, Item>>;
  rested: number; restedCap: number; rank: number; points: number; oymakId: number; oymakName: string;
  companions: Companion[]; expeditions: Expedition[]; tut: { step: number; prog: number }; lang: 'tr' | 'en';
  cds: number[]; dead: number; inscr: { frags: number; unlocked: number; thresholds: number[] };
  role: 'player' | 'admin'; clues: string[]; shards: number; pendingDream: number; god: boolean;
}
/** bit bayrakları */
export const F = { DEAD: 1, ATK: 2, STUN: 4, SLOW: 8, POISON: 16, CURSE: 32, SHIELD: 64, RED: 128, DUEL: 256, MOUNT: 512, BOSS: 1024 } as const;
export const STATUS_FLAG: Record<StatusKey, number> = { stun: F.STUN, slow: F.SLOW, poison: F.POISON, curse: F.CURSE, shield: F.SHIELD };

export interface SnapPlayer { i: number; n: string; b: number; l: number; x: number; z: number; r: number; h: number; H: number; f: number; sp: number; oy: string }
export interface SnapMob { i: number; t: MobType; l: number; x: number; z: number; r: number; h: number; H: number; f: number; /** saha bossu kimliği */ b?: number }
export interface SnapRift { i: number; x: number; z: number; w: number; st: number; h: number; H: number }
export interface SnapDrop { i: number; k: 'gold' | 'mat' | 'item' | 'book' | 'charm' | 'frag'; x: number; z: number; t: number; a: number; m?: string; o: number }
export type GameEvent =
  | { k: 'dmg'; id: number; v: number; crit?: boolean; heal?: boolean; src?: number; pl?: boolean; blk?: boolean }
  | { k: 'swing'; id: number; tx?: number; tz?: number }
  | { k: 'fx'; fx: string; x: number; z: number; r: number; o: number }
  | { k: 'die'; id: number; /** ölüm nedeni: yaratık türü, 'boss.N', 'pl' (oyuncu) ya da 'dot' */ by?: string; /** hasar türü */ kd?: string }
  | { k: 'lvl'; id: number; lvl: number }
  | { k: 'status'; id: number; s: StatusKey; dur: number }
  | { k: 'guard'; x: number; z: number; tx: number; tz: number }
  | { k: 'rift'; st: 'open' | 'wave' | 'boss' | 'closed' | 'fail'; x: number; z: number; wave?: number }
  | { k: 'spawn'; id: number };
export interface Snapshot {
  t: number; ack: number; you: { x: number; z: number; r: number; hp: number; f: number };
  players: SnapPlayer[]; mobs: SnapMob[]; rifts: SnapRift[]; drops: SnapDrop[]; ev: GameEvent[]; pop: number;
}
export interface MarketListing { id: number; sellerId: number; seller: string; item: Item; price: number; expires: number; ref: number }
export interface MarketMail { id: number; kind: 'gold' | 'item'; gold: number; item?: Item; note: string }
export interface ChatMsg { ch: 'near' | 'boy' | 'oymak' | 'sys' | 'whisper'; from: string; boy?: Boy; text: string; key?: string; p?: Record<string, string | number> }
export interface RpcRes { id: number; ok: boolean; err?: string; data?: unknown; p?: Record<string, string | number> }
