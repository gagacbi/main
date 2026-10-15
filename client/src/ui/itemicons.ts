import { type DmgKind, type Item, type Slot } from '@shared/game';
import { paint } from './gipaint';
import { itemArtUrl } from '../game/itemart';

/**
 * Eşya ikonları: game-icons.net silüetleri (CC BY 3.0, bkz. docs/KREDILER.md) + oyuna özel boyama:
 * kontur (koyu), bant paleti (0 deri/ahşap → 1 bronz → 2 çelik → 3 mithril → 4 altın) gradyanı ve parlama katmanı.
 * Kademe (nadir/destansı/efsanevi) hücre ışıması ve çerçeve rengiyle gösterilir (CSS --tc).
 */
interface Pal { t: string; m: string; b: string }
const PALS: Pal[] = [
  { t: '#e3c797', m: '#a9814f', b: '#6a4a28' }, { t: '#ffd7a3', m: '#dd8f46', b: '#8a4f22' }, { t: '#f4f7fc', m: '#aeb9cb', b: '#5f6c80' },
  { t: '#e9f5ff', m: '#8fb8f2', b: '#4a62a8' }, { t: '#fff3b0', m: '#f2bb3b', b: '#a8691a' },
];
const KINDS: Record<string, string[]> = {
  kilic: ['gladius', 'broadsword', 'katana', 'zeus-sword', 'rune-sword'],
  cift: ['wood-axe', 'battle-axe', 'war-axe', 'sharp-axe', 'magic-axe'],
  bicak: ['stiletto', 'plain-dagger', 'trench-knife', 'bowie-knife', 'sacrificial-dagger'],
  yay: ['pocket-bow', 'pocket-bow', 'crossbow', 'pocket-bow', 'lightning-bow'],
  buyu: ['wood-stick', 'crystal-wand', 'wizard-staff', 'crescent-staff', 'skull-staff'],
  armor: ['leather-armor', 'chain-mail', 'breastplate', 'abdominal-armor', 'spiked-shoulder-armor'],
  helmet: ['light-helm', 'spartan-helmet', 'centurion-helmet', 'horned-helm', 'overlord-helm'],
  shield: ['round-shield', 'viking-shield', 'bordered-shield', 'spiked-shield', 'dragon-shield'],
  boots: ['leather-boot', 'fur-boot', 'metal-boot', 'steeltoe-boots', 'greaves'],
  bracelet: ['bracer', 'bracers', 'gauntlet', 'bracer', 'gauntlet'],
  earring: ['pearl-earring', 'drop-earrings', 'earrings', 'crystal-earrings', 'drop-earrings'],
  amulet: ['primitive-necklace', 'pearl-necklace', 'gem-pendant', 'necklace', 'ankh'],
};
const iconName = (it: Pick<Item, 'slot' | 'band' | 'wk'>): string => {
  const b = Math.max(0, Math.min(4, it.band));
  if (it.slot === 'weapon') return KINDS[(it.wk as DmgKind | undefined) ?? 'kilic'][b];
  return KINDS[it.slot][b];
};
/** Bir eşyanın renkli ikonu */
export function itemIcon(it: Pick<Item, 'slot' | 'band' | 'tier' | 'wk'> & { el?: { k: import('@shared/element').ElKey } }, cls = 'ico rich'): string {
  const art = itemArtUrl(it); if (art) return `<img class="${cls} art" src="${art}" alt="" draggable="false">`;   // 3B eşya görseli; WebGL yoksa SVG simgeye düşer
  const p = PALS[Math.max(0, Math.min(4, it.band))]; return paint(iconName(it), p.t, p.m, p.b, cls);
}
/** Boş yuva silueti (kuşanma alanı) */
export function slotGhost(slot: Slot): string {
  return paint(({ weapon: 'broadsword', armor: 'chest-armor', helmet: 'viking-helmet', amulet: 'gem-pendant', shield: 'round-shield', boots: 'leather-boot', bracelet: 'bracer', earring: 'pearl-earring' } as Record<Slot, string>)[slot], '#e8d4a8', '#e8d4a8', '#e8d4a8', 'ico ghost');
}
const MATS: Record<string, [string, string, string, string]> = {   // ad → [simge, üst, orta, alt]
  ore: ['ore', '#d6e2f2', '#8b9bb5', '#4a566e'], hide: ['animal-hide', '#e0b27c', '#b07a45', '#6f4623'], wood: ['wood-pile', '#d7a56e', '#a4713c', '#5e3b1b'],
  akce: ['coins', '#fff3b0', '#f2bb3b', '#a8691a'], book: ['spell-book', '#f08a7a', '#b83a3a', '#6a1c1c'], charm: ['rune-stone', '#bff3da', '#4fc08f', '#1f6e4c'],
  frag: ['crystal-cluster', '#d6dcff', '#7f8cf0', '#3a43a8'], kimiz: ['waterskin', '#fff8dc', '#e6d9a8', '#9a8450'],
};
export const matIcon = (key: string, cls = 'ico rich') => { const m = MATS[key] ?? MATS.ore; return paint(m[0], m[1], m[2], m[3], cls); };
export const hasMatIcon = (key: string) => key in MATS;
