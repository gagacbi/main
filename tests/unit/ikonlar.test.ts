import { describe, expect, test } from 'vitest';
import { uiIcon, uiIconAudit } from '../../client/src/ui/gipaint';
import { ICONS } from '../../client/src/ui/icons';

describe('simge denetimi', () => {
  test('eşlemedeki her game-icons silüeti üretilmiş kümede var (eksik olan sessizce "ore" olurdu)', () => {
    const miss = uiIconAudit().filter((x) => !x.ok).map((x) => `${x.k}→${x.name}`); expect(miss).toEqual([]);
  });
  test('yeni sistem simgeleri (anahtarlar, sandık, sürü, kapat, ses...) boyalı game-icons ile gelir; çizgi ikonda kalan anahtarlar bilinen kısa liste', () => {
    for (const k of ['key_0', 'key_1', 'key_2', 'chest', 'chest_open', 'gems', 'pack', 'close', 'sound', 'mute', 'loom', 'nazar', 'dugum', 'boncuk', 'kagit', 'rift', 'chat', 'weapon']) expect(uiIcon(k), k).not.toBeNull();
    const lineOnly = Object.keys(ICONS).filter((k) => !uiIcon(k)).sort();
    // kalanlar: durum etiketleri ve malzeme/eşya simgeleri (matIcon/itemicons boyalı sürümü kullanır) — liste büyürse bilinçli karar gerekir
    expect(lineOnly.length).toBeLessThanOrEqual(24);
  });
});
