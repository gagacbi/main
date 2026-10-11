import { describe, expect, test } from 'vitest';
import { decodeEq, eqCode } from '../../shared/appearance';
import { DMG_KINDS, type Item, type Tier } from '../../shared/game';

const it = (slot: Item['slot'], band: number, tier: Tier, wk?: Item['wk']): Item => ({ id: 'x', slot, band, ilvl: 1, tier, up: 0, ench: [], lvlReq: 1, wk });
describe('görünüm kodu (kuşanılan eşya)', () => {
  test('boş kuşanma 0; her silah türü/bant/kademe, miğfer ve zırh gidiş-dönüşte aynı çıkar', () => {
    expect(eqCode({})).toBe(0); expect(decodeEq(0)).toEqual({});
    for (const wk of DMG_KINDS) for (let band = 0; band <= 4; band++) for (const tier of [0, 1, 2, 3] as Tier[]) {
      const code = eqCode({ weapon: it('weapon', band, tier, wk), helmet: it('helmet', 4 - band, tier), armor: it('armor', band, ((tier + 1) % 4) as Tier) });
      const d = decodeEq(code);
      expect(d.weapon).toEqual({ wk, band, tier }); expect(d.helmet).toEqual({ band: 4 - band, tier }); expect(d.armor).toEqual({ band, tier: (tier + 1) % 4 });
      expect(code).toBeLessThan(2 ** 21);   // JSON'da küçük tamsayı
    }
  });
  test('yalnızca bir parça kuşanılınca diğerleri görünmez; silah türü verilmemişse kılıç', () => {
    expect(decodeEq(eqCode({ helmet: it('helmet', 2, 1) }))).toEqual({ helmet: { band: 2, tier: 1 } });
    expect(decodeEq(eqCode({ weapon: it('weapon', 1, 0) })).weapon?.wk).toBe('kilic');
  });
});
