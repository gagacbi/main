import type { MobType } from './game';
import type { MapId } from './maps';

/** Parti zindanları: Erlik Diyarı kapısından girilir; sabit, ayrı örnek bölgelerde (maps.ts DUNGEON_SLOTS) çalışır. */
export interface DungeonDef {
  id: MapId;
  /** giriş ücreti (akçe; geri dönüşsüz akçe çıkışı) */
  fee: number;
  /** alp başına günlük giriş hakkı */
  daily: number;
  minLv: number; partyMax: number;
  /** parti toplama penceresi (sn) */
  lobbySec: number;
  /** süre sınırı (sn) */
  limitSec: number;
  /** yaratık seviyesi */
  lvl: number;
  waves: { n: number; types: MobType[] }[];
  /** FIELD_BOSS.list dizinine bağlı boss kimliği */
  bossId: number;
  /** her ek katılımcı için can artışı */
  hpPerExtra: number;
  gapSec: number;
  /** yaratık can/saldırı çarpanı (nüfus simülasyonu ilk sürümde %100 kazanma, 2,4 dk gösterdi) ve boss can çarpanı */
  hpMult: number; atkMult: number; bossHpMult: number;
  xpMult: number; goldMult: number; books: number; charms: number; frags: number; ore: number;
}
export const DUNGEONS: Partial<Record<MapId, DungeonDef>> = {
  demir: {
    id: 'demir', fee: 900, daily: 3, minLv: 41, partyMax: 4, lobbySec: 30, limitSec: 1200, lvl: 44, bossId: 10, hpPerExtra: 0.4, gapSec: 6, hpMult: 2.2, atkMult: 1.6, bossHpMult: 4,
    waves: [{ n: 6, types: ['tepegoz', 'cakal'] }, { n: 8, types: ['tepegoz', 'albasti'] }, { n: 8, types: ['erlik', 'albasti', 'tepegoz'] }],
    xpMult: 70, goldMult: 45, books: 3, charms: 1, frags: 6, ore: 14,
  },
  golge: {
    id: 'golge', fee: 2200, daily: 3, minLv: 46, partyMax: 4, lobbySec: 30, limitSec: 1500, lvl: 50, bossId: 11, hpPerExtra: 0.45, gapSec: 6, hpMult: 2.6, atkMult: 1.9, bossHpMult: 5,
    waves: [{ n: 8, types: ['erlik', 'albasti'] }, { n: 9, types: ['erlik', 'tepegoz', 'cakal'] }, { n: 10, types: ['erlik', 'albasti', 'tepegoz'] }, { n: 10, types: ['erlik', 'albasti', 'cakal'] }],
    xpMult: 110, goldMult: 70, books: 4, charms: 2, frags: 10, ore: 20,
  },
};
export const DUNGEON_IDS = Object.keys(DUNGEONS) as MapId[];
/** Günlük sıfırlama: Türkiye saatiyle gece yarısı (UTC+3) */
export const dungeonDay = (now: number) => Math.floor((now + 3 * 3600000) / 86400000);
/** Bitiş sonrası çıkış bekleme süresi (sn) */
export const DUNGEON_EXIT_SEC = 45;
