import { TIER_COLORS, type DmgKind, type Item, type Slot } from '@shared/game';

/**
 * Eşya ikonları: dolgulu, konturlu (oyunun toon görünümüne uygun) SVG.
 * Malzeme paleti bandı (0–4: deri/ahşap → bronz → demir → gümüş → altın/ejder), taş rengi kademeyi (nadir/destansı/efsanevi) gösterir.
 * Aynı slot ve bantta aynı ikon çıkar; ayırt edici olan silah türü (kılıç, çift el, bıçak, yay, büyü).
 */
interface Pal { m: string; d: string; l: string; w: string }   // ana, koyu, açık, ahşap/deri
const PALS: Pal[] = [
  { m: '#a98a62', d: '#6d5236', l: '#d6bd93', w: '#7a5a3a' },   // 0 deri/ahşap
  { m: '#c98b4a', d: '#865226', l: '#f0bd7a', w: '#6d4a2c' },   // 1 bronz
  { m: '#9aa6b5', d: '#5b6574', l: '#d5dde8', w: '#5d4630' },   // 2 demir
  { m: '#c9d4e6', d: '#6b7a95', l: '#f4f8ff', w: '#3f3550' },   // 3 gümüş
  { m: '#e8b53c', d: '#9a6a12', l: '#ffe48a', w: '#4a2a1a' },   // 4 altın
];
const OL = '#2a1a0e';
const st = (w = 2.2) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const svg = (body: string, cls = 'ico rich') => `<svg class="${cls}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const gemOf = (tier: number, l: string) => (tier <= 0 ? l : TIER_COLORS[tier]);
const gem = (cx: number, cy: number, r: number, c: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" ${st(1.6)}/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".75"/>`;

function sword(p: Pal, g: string) {
  return `<g transform="rotate(40 32 32) translate(3.5 3) scale(.9)"><path d="M32 2 L39 11 L39 38 L25 38 L25 11 Z" fill="${p.m}" ${st()}/><path d="M32 4 L36 11 L36 36 L32 36 Z" fill="${p.l}" opacity=".85"/><rect x="31" y="12" width="2" height="22" fill="${p.d}" opacity=".6"/>
  <rect x="17" y="38" width="30" height="6" rx="3" fill="${p.d}" ${st()}/><rect x="28.5" y="44" width="7" height="11" fill="#7a5a3a" ${st()}/><path d="M28.5 47 L35.5 49 M28.5 51 L35.5 53" stroke="${OL}" stroke-width="1.2" opacity=".6"/>${gem(32, 58.5, 3.6, g)}</g>`;
}
function twohand(p: Pal, g: string) {
  return `<g transform="rotate(35 32 32) translate(3 2) scale(.92)"><rect x="29.5" y="8" width="5" height="52" rx="2" fill="${p.w}" ${st()}/><path d="M29.5 14 Q5 8 4 30 Q16 34 29.5 28 Z" fill="${p.m}" ${st()}/><path d="M34.5 14 Q59 8 60 30 Q48 34 34.5 28 Z" fill="${p.m}" ${st()}/>
  <path d="M8 24 Q12 14 27 15" stroke="${p.l}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M56 24 Q52 14 37 15" stroke="${p.l}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M32 2 L35 9 L29 9 Z" fill="${p.d}" ${st(1.8)}/>${gem(32, 22, 3.8, g)}<rect x="27.5" y="48" width="9" height="4" fill="${p.d}" ${st(1.6)}/></g>`;
}
function dagger(p: Pal, g: string) {
  return `<g transform="rotate(38 32 32) translate(3 2) scale(.92)"><path d="M32 6 L38 18 L36 42 L28 42 L26 18 Z" fill="${p.m}" ${st()}/><path d="M32 8 L35 18 L34 40 L32 40 Z" fill="${p.l}" opacity=".85"/><path d="M18 42 Q32 36 46 42 L44 47 Q32 43 20 47 Z" fill="${p.d}" ${st()}/>
  <rect x="29" y="46" width="6" height="10" rx="1.5" fill="#6b4226" ${st()}/>${gem(32, 59, 3.3, g)}</g>`;
}
function bow(p: Pal, g: string) {
  return `<path d="M46 5 Q12 32 46 59" fill="none" stroke="${OL}" stroke-width="8.5" stroke-linecap="round"/><path d="M46 5 Q12 32 46 59" fill="none" stroke="${p.w}" stroke-width="5.5" stroke-linecap="round"/><path d="M45 8 Q18 32 45 56" fill="none" stroke="${p.l}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  <path d="M46 5 L46 59" stroke="#f3ecd2" stroke-width="1.4"/><path d="M10 32 L54 32" stroke="${OL}" stroke-width="4.4" stroke-linecap="round"/><path d="M10 32 L54 32" stroke="${p.l}" stroke-width="2" stroke-linecap="round"/><path d="M54 32 L46 26 L46 38 Z" fill="${p.m}" ${st(1.6)}/><path d="M10 32 L5 27 M10 32 L5 37 M16 32 L12 28 M16 32 L12 36" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>${gem(25, 32, 4, g)}`;
}
function staff(p: Pal, g: string) {
  return `<g transform="rotate(30 32 32) translate(1 2) scale(.94)"><rect x="29.5" y="20" width="5" height="40" rx="2.5" fill="${p.w}" ${st()}/><path d="M22 18 Q20 4 32 4 Q44 4 42 18 L38 14 Q32 10 26 14 Z" fill="${p.m}" ${st()}/><circle cx="32" cy="14" r="8.5" fill="${g}" ${st()}/><circle cx="29" cy="11" r="2.8" fill="#fff" opacity=".8"/>
  <rect x="27" y="22" width="10" height="4" rx="2" fill="${p.d}" ${st(1.6)}/><rect x="27" y="40" width="10" height="3" rx="1.5" fill="${p.d}" ${st(1.4)}/></g>`;
}
function armor(p: Pal, g: string, band: number) {
  return `<path d="M17 8 L26 5 Q32 12 38 5 L47 8 L58 22 L47 28 L46 57 L18 57 L17 28 L6 22 Z" fill="${p.m}" ${st()}/><path d="M18 10 L26 7 L24 54 L19 54 Z" fill="${p.l}" opacity=".45"/><path d="M26 5 Q32 14 38 5 L36 4 Q32 9 28 4 Z" fill="${p.d}" ${st(1.4)}/>
  <rect x="17.5" y="40" width="29" height="6" fill="${p.d}" ${st(1.6)}/><rect x="29" y="38.5" width="6" height="9" rx="1.5" fill="${p.l}" ${st(1.4)}/>${band >= 2 ? `<path d="M14 18 L21 14 M50 18 L43 14" stroke="${p.l}" stroke-width="2.2" stroke-linecap="round"/>` : ''}<path d="M32 16 L32 36 M23 24 L41 24" stroke="${p.d}" stroke-width="1.6" opacity=".55"/>${gem(32, 27, 4.4, g)}`;
}
function helmet(p: Pal, g: string, band: number) {
  return `${band >= 2 ? `<path d="M32 3 Q42 -1 52 8 Q44 8 38 14 Z" fill="${band >= 4 ? '#d83a3a' : '#c24a4a'}" ${st(1.6)}/>` : ''}<path d="M9 42 Q8 10 32 8 Q56 10 55 42 Z" fill="${p.m}" ${st()}/><path d="M13 36 Q14 16 30 12 Q20 20 20 36 Z" fill="${p.l}" opacity=".55"/><rect x="6" y="40" width="52" height="8" rx="3" fill="${p.d}" ${st()}/>
  <rect x="29" y="28" width="6" height="18" rx="1.5" fill="${p.d}" ${st(1.6)}/><path d="M32 6 L32 12" stroke="${OL}" stroke-width="3"/>${gem(32, 22, 3.8, g)}`;
}
function amulet(p: Pal, g: string) {
  return `<path d="M14 6 Q32 34 50 6" fill="none" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M14 6 Q32 34 50 6" fill="none" stroke="${p.m}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 4.2"/><path d="M32 24 L46 40 L32 58 L18 40 Z" fill="${p.m}" ${st()}/><path d="M32 26 L38 40 L32 54 L26 40 Z" fill="${p.l}" opacity=".5"/>
  <path d="M32 32 L40 41 L32 52 L24 41 Z" fill="${g}" ${st(1.6)}/><path d="M28 38 L31 35" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".8"/><circle cx="32" cy="24" r="3" fill="${p.d}" ${st(1.4)}/>`;
}

/** Bir eşyanın renkli ikonu */
export function itemIcon(it: Pick<Item, 'slot' | 'band' | 'tier' | 'wk'>, cls?: string): string {
  const p = PALS[Math.max(0, Math.min(4, it.band))]; const g = gemOf(it.tier, p.l);
  if (it.slot === 'weapon') {
    const k: DmgKind = it.wk ?? 'kilic';
    return svg(k === 'cift' ? twohand(p, g) : k === 'bicak' ? dagger(p, g) : k === 'yay' ? bow(p, g) : k === 'buyu' ? staff(p, g) : sword(p, g), cls);
  }
  if (it.slot === 'armor') return svg(armor(p, g, it.band), cls);
  if (it.slot === 'helmet') return svg(helmet(p, g, it.band), cls);
  return svg(amulet(p, g), cls);
}
/** Boş yuva silueti (kuşanma alanı) */
export function slotGhost(slot: Slot): string { return itemIcon({ slot, band: 0, tier: 0 }, 'ico ghost'); }

const MATS: Record<string, string> = {
  ore: `<path d="M8 42 L20 14 L40 9 L56 26 L50 50 L24 56 Z" fill="#7f8aa0" ${st()}/><path d="M20 14 L30 30 L56 26 M30 30 L24 56" fill="none" stroke="${OL}" stroke-width="1.6"/><path d="M22 16 L38 12 L30 30 Z" fill="#b9c4d8"/><path d="M30 30 L56 26 L50 50 Z" fill="#5d687e"/><circle cx="42" cy="22" r="2.4" fill="#7fe0ff"/><circle cx="18" cy="40" r="2" fill="#7fe0ff"/>`,
  hide: `<path d="M8 14 L24 8 L40 8 L56 14 L60 30 L48 34 L50 54 L36 50 L28 50 L14 54 L16 34 L4 30 Z" fill="#b9814a" ${st()}/><path d="M24 10 L32 20 L40 10" fill="none" stroke="${OL}" stroke-width="1.6"/><path d="M14 18 L24 12 L22 30 L10 28 Z" fill="#d9a56a" opacity=".6"/><circle cx="26" cy="32" r="2" fill="#7a4e24"/><circle cx="38" cy="36" r="2.4" fill="#7a4e24"/>`,
  wood: `<rect x="6" y="18" width="52" height="28" rx="6" fill="#8a5a30" ${st()}/><ellipse cx="50" cy="32" rx="9" ry="14" fill="#d9a56a" ${st()}/><ellipse cx="50" cy="32" rx="5.5" ry="9" fill="none" stroke="#8a5a30" stroke-width="1.6"/><ellipse cx="50" cy="32" rx="2" ry="3.4" fill="#8a5a30"/><path d="M12 24 L40 24 M12 32 L36 32 M12 40 L40 40" stroke="#6a421f" stroke-width="1.6" stroke-linecap="round"/>`,
  akce: `<circle cx="32" cy="32" r="24" fill="#e8b53c" ${st()}/><circle cx="32" cy="32" r="17.5" fill="none" stroke="#9a6a12" stroke-width="2.4"/><path d="M32 18 L32 46 M22 26 L32 18 L42 26 M22 38 L32 46 L42 38" fill="none" stroke="#9a6a12" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 22 Q20 10 34 9" fill="none" stroke="#ffe48a" stroke-width="3" stroke-linecap="round"/>`,
  book: `<path d="M8 12 L32 18 L56 12 L56 52 L32 58 L8 52 Z" fill="#8c2f2f" ${st()}/><path d="M32 18 L32 58" stroke="${OL}" stroke-width="2"/><path d="M12 16 L30 21 L30 54 L12 49 Z" fill="#f3e6c4"/><path d="M52 16 L34 21 L34 54 L52 49 Z" fill="#ecdcb4"/><path d="M16 26 L26 28.5 M16 33 L26 35.5 M16 40 L26 42.5 M38 28.5 L48 26 M38 35.5 L48 33" stroke="#7a5a3a" stroke-width="1.8" stroke-linecap="round"/><circle cx="44" cy="46" r="3" fill="#e8b53c" ${st(1.2)}/>`,
  charm: `<path d="M32 4 L54 15 L50 40 Q46 54 32 60 Q18 54 14 40 L10 15 Z" fill="#3c8f6a" ${st()}/><path d="M32 10 L48 18 L45 38 Q42 49 32 54 Z" fill="#59c394" opacity=".55"/><circle cx="32" cy="32" r="9" fill="#fff6c8" ${st(1.8)}/><circle cx="32" cy="32" r="4" fill="#3c8f6a"/><path d="M32 12 L32 20 M32 44 L32 52 M14 32 L22 32 M42 32 L50 32" stroke="#fff6c8" stroke-width="2.4" stroke-linecap="round"/>`,
  frag: `<path d="M12 10 L50 6 L58 30 L44 58 L18 54 L6 34 Z" fill="#6e7bd8" ${st()}/><path d="M12 10 L30 22 L50 6 M30 22 L28 40 L58 30 M28 40 L18 54 L44 58 L28 40 L6 34 L30 22" fill="none" stroke="${OL}" stroke-width="1.4"/><path d="M14 12 L28 20 L8 32 Z" fill="#a9b4ff" opacity=".7"/><path d="M26 28 L36 28 M31 28 L31 42" stroke="#fff6c8" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`,
  kimiz: `<path d="M24 6 L40 6 L38 16 Q50 24 50 40 Q50 58 32 58 Q14 58 14 40 Q14 24 26 16 Z" fill="#e8e0c8" ${st()}/><path d="M22 36 Q32 32 42 36 L44 46 Q32 56 20 46 Z" fill="#f7f1da"/><rect x="22" y="2" width="20" height="8" rx="3" fill="#8a5a30" ${st()}/><path d="M18 30 Q16 38 20 46" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/><circle cx="32" cy="46" r="3" fill="#7fb5ff"/>`,
};
export const matIcon = (key: string, cls = 'ico rich') => svg(MATS[key] ?? MATS.ore, cls);
export const hasMatIcon = (key: string) => key in MATS;
