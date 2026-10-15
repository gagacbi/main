import { DMG_KINDS, type DmgKind, type Item, type Slot, type Tier } from './game';

/**
 * Kuşanılan eşyaların görünümü (başkaları da görür): silah (tür+bant+kademe), miğfer ve zırh (bant+kademe), tek tamsayıda.
 * bit düzeni: silah 9 bit [var:1, tür:3, bant:3, kademe:2] · miğfer 6 bit [var:1, bant:3, kademe:2] · zırh 6 bit · kalkan 6 bit (27 bit toplam)
 */
export interface LookPiece { band: number; tier: Tier; wk?: DmgKind }
export interface EqLook { weapon?: LookPiece; helmet?: LookPiece; armor?: LookPiece; shield?: LookPiece; boots?: LookPiece; bracelet?: LookPiece; earring?: LookPiece }
const LOW = 2 ** 27;   // ilk 27 bit: silah/miğfer/zırh/kalkan; üstü: çizme/bilezik/küpe (sayı 45 bit, JSON'da güvenli; bit işlemleri düşük kısımda)
const pack = (it: Pick<Item, 'band' | 'tier'> | undefined, kind: number | null): number => (it ? 1 | ((kind ?? 0) << 1) | (Math.max(0, Math.min(7, it.band)) << (kind === null ? 1 : 4)) | (it.tier << (kind === null ? 4 : 7)) : 0);
export function eqCode(eq: Partial<Record<Slot, Item>>): number {
  const w = eq.weapon ? pack(eq.weapon, Math.max(0, DMG_KINDS.indexOf(eq.weapon.wk ?? 'kilic'))) : 0;
  const lo = w | (pack(eq.helmet, null) << 9) | (pack(eq.armor, null) << 15) | (pack(eq.shield, null) << 21);
  const hi = pack(eq.boots, null) | (pack(eq.bracelet, null) << 6) | (pack(eq.earring, null) << 12);
  return lo + hi * LOW;
}
export function decodeEq(full: number): EqLook {
  const out: EqLook = {}; const code = full % LOW; const hi = Math.floor(full / LOW);
  const hp = (v: number): LookPiece | undefined => (v & 1 ? { band: (v >> 1) & 7, tier: ((v >> 4) & 3) as Tier } : undefined);
  out.boots = hp(hi & 63); out.bracelet = hp((hi >> 6) & 63); out.earring = hp((hi >> 12) & 63); for (const k of ['boots', 'bracelet', 'earring'] as const) if (!out[k]) delete out[k];
  if (code & 1) out.weapon = { wk: DMG_KINDS[(code >> 1) & 7] ?? 'kilic', band: (code >> 4) & 7, tier: ((code >> 7) & 3) as Tier };
  const h = (code >> 9) & 63; if (h & 1) out.helmet = { band: (h >> 1) & 7, tier: ((h >> 4) & 3) as Tier };
  const a = (code >> 15) & 63; if (a & 1) out.armor = { band: (a >> 1) & 7, tier: ((a >> 4) & 3) as Tier };
  const sh = (code >> 21) & 63; if (sh & 1) out.shield = { band: (sh >> 1) & 7, tier: ((sh >> 4) & 3) as Tier };
  return out;
}
