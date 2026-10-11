import { GI } from './gameicons.generated';

const OL = '#25160b';
let uid = 0;
/** Bir game-icons gövdesini konturlu, gradyan dolgulu ve parlamalı çizer */
export function paint(name: string, top: string, mid: string, bot: string, cls: string): string {
  const raw = GI[name] ?? GI['ore']; const id = 'g' + (uid++ % 4096);
  const outline = raw.replace(/fill="currentColor"/g, `fill="${OL}" stroke="${OL}" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"`);
  const fill = raw.replace(/fill="currentColor"/g, `fill="url(#${id}f)"`);
  const shine = raw.replace(/fill="currentColor"/g, `fill="url(#${id}s)"`);
  return `<svg class="${cls}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}f" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`
    + `<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>${outline}${fill}${shine}</svg>`;
}

/** Arayüz simgeleri (HUD, yetenek çubuğu, paneller): game-icons silüeti + renk paleti. Eşlemesi olmayan simgeler eski çizgi ikonda kalır. */
type P3 = [string, string, string];
const GOLD: P3 = ['#fff3b0', '#f2bb3b', '#a8691a'];
const UI: Record<string, [string, P3]> = {
  savurma: ['axe-swing', ['#ffffff', '#cfd9e8', '#6b7a95']], sarsinti: ['earth-crack', ['#ffd9a0', '#d98b44', '#7a4a1c']], nara: ['megaphone', ['#ffe0b0', '#f08a3c', '#a23c1c']],
  kalkan: ['viking-shield', ['#e2f0ff', '#7fb0f0', '#3a5aa8']], zehir: ['poison-bottle', ['#d8ffb0', '#6fcf4a', '#2a7a2a']], hiddet: ['thunder-struck', ['#fffbd0', '#ffe03c', '#d98a0a']],
  swords: ['sword-clash', GOLD], bag: ['knapsack', ['#e3c797', '#b9814a', '#6a4a28']], char: ['character', GOLD], skills: ['skills', GOLD], oba: ['tipi', ['#fff0d0', '#e8a85a', '#8a4f22']],
  stele: ['stone-tablet', ['#e4e1f2', '#9a97bd', '#5a587c']], akce: ['coins', GOLD], globe: ['compass', GOLD], book: ['open-book', ['#ffd9c8', '#d8644c', '#7a2a1c']], skull: ['skull-crossed-bones', ['#f4f0e6', '#cfc8b4', '#6b6450']],
  fish_sazan: ['tropical-fish', ['#ffe3b0', '#e8a04a', '#8a5420']], fish_otsazani: ['clownfish', ['#d8f2c0', '#7fc05a', '#3a6a28']], fish_zargana: ['double-fish', ['#e2f0ff', '#8fb8f2', '#3a5aa8']],
  fish_hamsi: ['school-of-fish', ['#f4f7fc', '#aeb9cb', '#5f6c80']], fish_levrek: ['flatfish', ['#e6e1f5', '#a59bd0', '#5a4f8a']], fish_kadife: ['angler-fish', ['#f0d4ff', '#b46bff', '#5a2a9a']],
  fish_kralyengeci: ['crab', ['#ffc4b0', '#e0553a', '#7a2214']], fish_altinsudak: ['porcupinefish', ['#fff3b0', '#f2bb3b', '#a8691a']], fish_ata: ['whale-tail', ['#c8f0ff', '#4ab0e8', '#1e5a9a']],
  hamur: ['sliced-bread', ['#fff0d0', '#e0b070', '#8a6030']], solucan: ['earth-worm', ['#ffc8c0', '#e07a7a', '#8a3a3a']], rod: ['fishing-pole', ['#e3c797', '#b9814a', '#6a4a28']], daily: ['scroll-unfurled', ['#fff3d0', '#e8c070', '#9a6a28']],
  kimiz: ['waterskin', ['#fff8dc', '#e6d9a8', '#9a8450']],
};
export function uiIcon(k: string): string | null { const m = UI[k]; return m ? paint(m[0], m[1][0], m[1][1], m[1][2], 'gi') : null; }
