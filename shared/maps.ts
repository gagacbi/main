/**
 * Haritalar (bölgeler). Tek dünyada birbirinden uzak merkezlerde dururlar; böylece tek oda, tek 20 Hz döngü ve
 * mevcut protokol korunur (bağlantı yeniden kurmak yok). Bu dosya hiçbir şey içe aktarmaz (döngüsel bağımlılık olmasın).
 */
export type MapId = 'bozkir' | 'otlak' | 'erlik' | 'demir' | 'golge';
export type PvpPolicy = 'off' | 'optional';
export interface MapDef {
  id: MapId; kind: 'field' | 'dungeon';
  /** giriş seviye aralığı (dahil) */
  minLv: number; maxLv: number;
  /** yaratık seviye aralığı (kamplar) */
  lv: [number, number];
  pvp: PvpPolicy; rifts: boolean; stones: boolean;
  r: number; safeR: number; seed: number;
  palette: { ground: string; ground2: string; sky: string; fog: string; tree: string };
}
export const MAPS: Record<MapId, MapDef> = {
  bozkir: { id: 'bozkir', kind: 'field', minLv: 1, maxLv: 99, lv: [1, 48], pvp: 'optional', rifts: true, stones: true, r: 160, safeR: 36, seed: 20261004,
    palette: { ground: '#6fbf4a', ground2: '#5aa83e', sky: '#bfe3ff', fog: '#cfe8ff', tree: '#3f9a4a' } },
  otlak: { id: 'otlak', kind: 'field', minLv: 1, maxLv: 20, lv: [1, 14], pvp: 'off', rifts: false, stones: false, r: 105, safeR: 13, seed: 777001,
    palette: { ground: '#8fd35a', ground2: '#7cc24a', sky: '#d6f0ff', fog: '#e4f6ff', tree: '#58b85a' } },
  erlik: { id: 'erlik', kind: 'field', minLv: 38, maxLv: 99, lv: [38, 54], pvp: 'optional', rifts: true, stones: false, r: 150, safeR: 14, seed: 777002,
    palette: { ground: '#6a4f7a', ground2: '#58406a', sky: '#3a2250', fog: '#4a2e6a', tree: '#7a3a8a' } },
  demir: { id: 'demir', kind: 'dungeon', minLv: 41, maxLv: 99, lv: [43, 47], pvp: 'off', rifts: false, stones: false, r: 58, safeR: 0, seed: 777003,
    palette: { ground: '#5a5560', ground2: '#4a4650', sky: '#1c1824', fog: '#241e2e', tree: '#6a6068' } },
  golge: { id: 'golge', kind: 'dungeon', minLv: 46, maxLv: 99, lv: [48, 52], pvp: 'off', rifts: false, stones: false, r: 58, safeR: 0, seed: 777004,
    palette: { ground: '#3a4a5a', ground2: '#2e3c4c', sky: '#0e1a28', fog: '#14202e', tree: '#3a6a8a' } },
};

export interface Region { id: string; map: MapId; cx: number; cz: number; r: number; safeR: number; slot: number }
export const DUNGEON_SLOTS = 6; // şablon başına eşzamanlı örnek
export const REGIONS: Region[] = (() => {
  const out: Region[] = [
    { id: 'bozkir', map: 'bozkir', cx: 0, cz: 0, r: MAPS.bozkir.r, safeR: MAPS.bozkir.safeR, slot: 0 },
    { id: 'otlak', map: 'otlak', cx: 900, cz: 0, r: MAPS.otlak.r, safeR: MAPS.otlak.safeR, slot: 0 },
    { id: 'erlik', map: 'erlik', cx: -900, cz: 0, r: MAPS.erlik.r, safeR: MAPS.erlik.safeR, slot: 0 },
  ];
  (['demir', 'golge'] as MapId[]).forEach((m, mi) => {
    for (let s = 0; s < DUNGEON_SLOTS; s++) out.push({ id: `${m}#${s}`, map: m, cx: -750 + 300 * s, cz: 900 + 300 * mi, r: MAPS[m].r, safeR: 0, slot: s });
  });
  return out;
})();
const BY_ID = new Map(REGIONS.map((r) => [r.id, r]));
export const regionById = (id: string): Region => BY_ID.get(id)!;
/** Konumun bulunduğu bölge (hiçbirinde değilse null). */
export function regionAt(x: number, z: number): Region | null {
  for (const r of REGIONS) { const dx = x - r.cx, dz = z - r.cz; if (dx * dx + dz * dz <= (r.r + 6) * (r.r + 6)) return r; }
  return null;
}
export const FIELD_REGIONS = REGIONS.filter((r) => MAPS[r.map].kind === 'field');
export const isDungeonRegion = (r: Region | null) => !!r && MAPS[r.map].kind === 'dungeon';
