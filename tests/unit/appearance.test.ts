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
  test('ek yuvalar (çizme, bilezik, küpe) 45 bitlik kodda kaybolmaz; eski kodlar aynı çözülür', () => {
    const it2 = (slot: any, band: number, tier: number) => ({ slot, band, tier }) as any;
    const eq = { weapon: it2('weapon', 3, 2), helmet: it2('helmet', 1, 1), armor: it2('armor', 4, 3), shield: it2('shield', 2, 0), boots: it2('boots', 4, 3), bracelet: it2('bracelet', 2, 1), earring: it2('earring', 3, 2) };
    const code = eqCode(eq as any); expect(Number.isSafeInteger(code)).toBe(true); expect(code).toBeGreaterThan(2 ** 27);
    const d = decodeEq(code); expect(d.boots).toEqual({ band: 4, tier: 3 }); expect(d.bracelet).toEqual({ band: 2, tier: 1 }); expect(d.earring).toEqual({ band: 3, tier: 2 });
    expect(d.weapon?.band).toBe(3); expect(d.helmet?.band).toBe(1); expect(d.armor?.band).toBe(4); expect(d.shield?.band).toBe(2);
    const low = eqCode({ weapon: it2('weapon', 1, 0) } as any); expect(low).toBeLessThan(2 ** 27); expect(decodeEq(low).boots).toBeUndefined(); expect(JSON.parse(JSON.stringify(code))).toBe(code);
  });
});
