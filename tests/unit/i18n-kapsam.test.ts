import { describe, expect, test } from 'vitest';
import { hasKey } from '../../client/src/i18n';
import { ALL_SLOTS, DMG_KINDS, ENCH_KEYS, FIELD_BOSS, MOBS, SKILLS } from '../../shared/game';
import { THREADS, THREAD_SIZE } from '../../shared/lore';
import { MAPS } from '../../shared/maps';
import { EL_KEYS } from '../../shared/element';
import { FISH_IDS } from '../../shared/fishing';
import { ERA_AT, RUIN_LEVELS } from '../../shared/chronicle';
import { DAILY } from '../../shared/daily';

/** Oyun varlıklarının hepsinin TR/EN çevirisi var mı? (dinamik t('önek.'+x) kullanımları statik taramada görünmez) */
const eksik = (keys: string[]) => keys.filter((k) => !hasKey(k));
describe('çeviri kapsamı', () => {
  test('eşya adları, kademe, yuva, hasar türü, efsun, yaratık, boss, yetenek, harita', () => {
    const k: string[] = [];
    for (const s of ALL_SLOTS) { k.push('slot.' + s); for (let b = 0; b < 5; b++) k.push(`item.${s}.${b}`); }
    for (let t = 0; t < 4; t++) k.push('tierp.' + t); for (const d of DMG_KINDS) k.push('dk.' + d); for (const e of ENCH_KEYS) k.push('ench.' + e);
    for (const m of Object.keys(MOBS)) k.push('mob.' + m); for (const b of FIELD_BOSS.list) k.push(b[2]);
    for (const s of SKILLS) k.push('skill.' + s.id, 'skill.' + s.id + '.d'); for (const m of Object.keys(MAPS)) k.push('map.' + m, 'map.' + m + '.d');
    expect(eksik(k)).toEqual([]);
  });
  test('boss duyuruları, gizem iplikleri, çağlar, kalıntılar', () => {
    const k: string[] = []; FIELD_BOSS.list.forEach((_, i) => k.push(`sys.boss_up.${i + 1}`, `sys.boss_down.${i + 1}`));
    for (const t of THREADS) { k.push('thread.' + t, 'thread.' + t + '.hint'); for (let n = 1; n <= THREAD_SIZE[t]; n++) if (t !== 'insc' || true) k.push(`${t}.${n}`); }
    for (let i = 0; i < ERA_AT.length; i++) k.push('era.' + i, 'era.' + i + '.d'); for (let n = 1; n <= RUIN_LEVELS.length; n++) k.push('ruin.' + n);
    expect(eksik(k)).toEqual([]);
  });
  test('Göl Avı, element, günlük görev', () => {
    const k: string[] = []; for (const f of FISH_IDS) k.push('fish.' + f); for (const e of EL_KEYS) k.push('el.' + e);
    for (const d of ['kill', 'mat', 'fish', 'hunt', 'rift', 'dungeon']) k.push('daily.' + d); for (const r of ['xp', 'kimiz', 'book', 'lif']) k.push('daily.r.' + r); void DAILY;
    for (const e of ['sazan', 'otsazani', 'zargana', 'hamsi', 'levrek', 'kadife', 'kralyengeci', 'altinsudak', 'ata']) void e;
    expect(eksik(k)).toEqual([]);
  });
});
