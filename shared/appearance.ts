import { DMG_KINDS, type DmgKind, type Item, type Slot, type Tier } from './game';

/**
 * Kuşanılan eşyaların görünümü (başkaları da görür): silah (tür+bant+kademe), miğfer ve zırh (bant+kademe), tek tamsayıda.
 * bit düzeni: silah 9 bit [var:1, tür:3, bant:3, kademe:2] · miğfer 6 bit [var:1, bant:3, kademe:2] · zırh 6 bit
 */
export interface LookPiece { band: number; tier: Tier; wk?: DmgKind }
export interface EqLook { weapon?: LookPiece; helmet?: LookPiece; armor?: LookPiece }
const pack = (it: Pick<Item, 'band' | 'tier'> | undefined, kind: number | null): number => (it ? 1 | ((kind ?? 0) << 1) | (Math.max(0, Math.min(7, it.band)) << (kind === null ? 1 : 4)) | (it.tier << (kind === null ? 4 : 7)) : 0);
export function eqCode(eq: Partial<Record<Slot, Item>>): number {
  const w = eq.weapon ? pack(eq.weapon, Math.max(0, DMG_KINDS.indexOf(eq.weapon.wk ?? 'kilic'))) : 0;
  return w | (pack(eq.helmet, null) << 9) | (pack(eq.armor, null) << 15);
}
export function decodeEq(code: number): EqLook {
  const out: EqLook = {};
  if (code & 1) out.weapon = { wk: DMG_KINDS[(code >> 1) & 7] ?? 'kilic', band: (code >> 4) & 7, tier: ((code >> 7) & 3) as Tier };
  const h = (code >> 9) & 63; if (h & 1) out.helmet = { band: (h >> 1) & 7, tier: ((h >> 4) & 3) as Tier };
  const a = (code >> 15) & 63; if (a & 1) out.armor = { band: (a >> 1) & 7, tier: ((a >> 4) & 3) as Tier };
  return out;
}
