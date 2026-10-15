import { Color3, Color4, Engine, FreeCamera, Mesh, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { TIER_COLORS, type DmgKind, type Item } from '@shared/game';
import { EL, type ElKey } from '@shared/element';
import { build, type PartSpec, type V3 } from './meshkit';
import { addOutline, toonMaterial } from './toon';

/**
 * Eşya görselleri: oyunun kendi toon/kontur stiliyle modellenmiş küçük 3B eşyalar (kılıç, balta, hançer, yay, asa, zırh, miğfer, tılsım),
 * ayrı bir minik sahnede bir kez çizilip PNG olarak önbelleğe alınır. Bant = malzeme (deri/ahşap → bronz → çelik → mithril → altın),
 * kademe = taş/aura rengi, silah türü = biçim.
 */
type ItemKey = Pick<Item, 'slot' | 'band' | 'tier' | 'wk'> & { el?: { k: ElKey } };
interface Pal { m: string; d: string; l: string; w: string; k: string }   // ana, koyu, açık, ahşap/deri, bağ rengi
const PALS: Pal[] = [
  { m: '#b39368', d: '#7a5c38', l: '#d8c197', w: '#6d4a2c', k: '#8a5a32' }, { m: '#dd9a52', d: '#935a2a', l: '#f6c98a', w: '#6d4a2c', k: '#6a3c1c' },
  { m: '#b8c3d3', d: '#697689', l: '#eef3fa', w: '#5a4330', k: '#3c2a1c' }, { m: '#9cc3f7', d: '#4f6aaf', l: '#e2f0ff', w: '#3f3550', k: '#2c2440' },
  { m: '#f5c648', d: '#ad6d1a', l: '#fff0a6', w: '#4a2a1a', k: '#7a1f1f' },
];
/** bant paleti (karakter modeli de aynı malzeme renklerini kullanır) */
export const bandPal = (b: number): Pal => PALS[Math.max(0, Math.min(4, b))];
export const pieceGem = (tier: number, b: number): string => (tier <= 0 ? bandPal(b).l : TIER_COLORS[tier]);
const B = (w: number, h: number, dp: number, p: V3, c: string, c2?: string, gloss = 0.35, r?: V3): PartSpec => ({ k: 'box', w, h, dp, p, c, c2, gloss, r });
const C = (d: number, h: number, p: V3, c: string, c2?: string, gloss = 0.3, r?: V3, seg = 14): PartSpec => ({ k: 'cyl', d, h, p, c, c2, gloss, r, seg });
const CN = (db: number, h: number, p: V3, c: string, c2?: string, gloss = 0.3, r?: V3, dt = 0, sc?: V3): PartSpec => ({ k: 'cone', db, dt, h, p, c, c2, gloss, r, s: sc, seg: 12 });
const SP = (d: number, p: V3, c: string, s?: V3, gloss = 0.4): PartSpec => ({ k: 'sphere', d, p, c, s, gloss });
const TR = (d: number, th: number, p: V3, c: string, r: V3 = [Math.PI / 2, 0, 0], gloss = 0.4): PartSpec => ({ k: 'torus', d, th, p, c, r, gloss, seg: 28 });
const gemAt = (g: string, d: number, p: V3): PartSpec[] => [{ k: 'icos', d, p, c: g, sub: 1, flat: true, gloss: 0.6 }, SP(d * 0.3, [p[0] - d * 0.12, p[1] + d * 0.16, p[2] - d * 0.32], '#ffffff', undefined, 0.2)];

/** Eğik/düz bıçak: n dilimli, tepe konik; ortada açık renk sırt */
function blade(len: number, w0: number, w1: number, curve: number, y0: number, p: Pal, thick = 0.11): PartSpec[] {
  const out: PartSpec[] = []; const n = 6;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n; const x = curve * t * t * len; const ang = -Math.atan(2 * curve * t); const w = w0 + (w1 - w0) * t;
    out.push(B(w, len / n + 0.04, thick, [x, y0 + t * len, 0], p.m, p.l, 0.7, [0, 0, ang]), B(w * 0.28, len / n + 0.045, thick * 1.5, [x, y0 + t * len, 0], p.l, p.l, 0.8, [0, 0, ang]));
  }
  const tx = curve * len; out.push(CN(w1, len * 0.2, [tx + curve * 0.04, y0 + len + len * 0.09, 0], p.m, p.l, 0.7, [0, 0, -Math.atan(2 * curve)], 0.0));
  return out;
}
const wraps = (x: number, y0: number, y1: number, n: number, d: number, c: string): PartSpec[] => Array.from({ length: n }, (_, i) => TR(d, 0.045, [x, y0 + ((i + 0.5) / n) * (y1 - y0), 0], c, [0, 0, 0], 0.1));

function sword(b: number, p: Pal, g: string): PartSpec[] {
  const L = [1.25, 1.5, 1.85, 1.85, 2.05][b]; const W = [0.3, 0.4, 0.24, 0.42, 0.46][b]; const curve = b === 2 ? 0.1 : 0;
  const s: PartSpec[] = [C(0.1, 0.5, [0, 0.0, 0], p.k, p.w, 0.1), ...wraps(0, -0.2, 0.2, 5, 0.12, p.w), SP(0.2, [0, -0.3, 0], b >= 3 ? p.l : p.d, undefined, 0.6), ...blade(L, W, W * 0.82, curve, 0.28, p)];
  if (b === 2) s.push(C(0.42, 0.07, [0, 0.27, 0], p.d, p.m, 0.6), TR(0.44, 0.05, [0, 0.27, 0], p.l, [0, 0, 0], 0.7));
  else if (b <= 1) s.push(B(b ? 0.8 : 0.55, 0.1, 0.14, [0, 0.27, 0], p.d, p.m, 0.5), SP(0.14, [b ? 0.4 : 0.28, 0.27, 0], p.m), SP(0.14, [b ? -0.4 : -0.28, 0.27, 0], p.m));
  else { s.push(B(0.7, 0.1, 0.14, [0, 0.27, 0], p.d, p.m, 0.6), CN(0.18, 0.55, [0.55, 0.42, 0], p.m, p.l, 0.6, [0, 0, -0.9]), CN(0.18, 0.55, [-0.55, 0.42, 0], p.m, p.l, 0.6, [0, 0, 0.9]), ...gemAt(g, 0.26, [0, 0.27, -0.1]));
    if (b === 4) s.push(...[0.7, 1.0, 1.3, 1.6].map((y) => B(0.07, 0.1, 0.1, [0, y, -0.06], g, g, 0.7))); }
  if (b >= 2) s.push(...gemAt(g, 0.18, [0, -0.32, -0.04]));
  return s;
}
/** Balta ağzı: ay çizgisi (yarım daire) boyunca dizili dilimler; dış kenar parlak */
function bit(side: number, hy: number, R: number, p: Pal): PartSpec[] {
  const out: PartSpec[] = []; const n = 7;
  for (let i = 0; i < n; i++) {
    const t = -1 + (2 * i) / (n - 1); const a = t * 1.0; const x = side * (0.12 + R * Math.cos(a) - R * 0.35); const y = hy + R * Math.sin(a);
    const th = 0.42 - 0.12 * Math.abs(t);
    out.push(B(th, (2 * R * 1.0) / (n - 1) * 1.25, 0.13, [x, y, 0], p.m, p.l, 0.65, [0, 0, side * a]), B(0.07, (2 * R) / (n - 1) * 1.3, 0.15, [x + side * Math.cos(a) * th * 0.46, y + Math.sin(a) * th * 0.46, 0], p.l, p.l, 0.85, [0, 0, side * a]));
  }
  return out;
}
function axe(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [C(0.15, 2.2, [0, 0.5, 0], p.w, p.k, 0.15), ...wraps(0, -0.45, 0.1, 4, 0.19, p.d), SP(0.26, [0, -0.62, 0], p.d)];
  const hy = 1.2; const R = 0.62 + b * 0.05;
  s.push(B(0.3, 0.7, 0.24, [0, hy, 0], p.d, p.m, 0.5), ...bit(1, hy, R, p));
  if (b >= 2) s.push(...bit(-1, hy, R, p)); else s.push(CN(0.22, 0.55, [-0.34, hy, 0], p.d, p.m, 0.5, [0, 0, Math.PI / 2]));
  s.push(CN(0.28, 0.55, [0, hy + 0.62, 0], p.m, p.l, 0.7));
  if (b >= 3) s.push(...gemAt(g, 0.3, [0, hy, -0.2]));
  if (b >= 1) s.push(TR(0.4, 0.08, [0, 0.4, 0], p.l, [0, 0, 0], 0.6));
  return s;
}
function dagger(b: number, p: Pal, g: string): PartSpec[] {
  const L = [0.85, 1.0, 1.1, 1.15, 1.25][b];
  const s: PartSpec[] = [C(0.12, 0.42, [0, 0, 0], p.k, p.w, 0.1), ...wraps(0, -0.17, 0.17, 4, 0.14, p.w), SP(0.2, [0, -0.28, 0], p.d, undefined, 0.6), ...blade(L, 0.3, 0.22, [0.12, 0.1, 0.16, 0.2, 0.0][b] * 0.5, 0.24, p), B(0.5, 0.09, 0.14, [0, 0.22, 0], p.d, p.m, 0.6), CN(0.12, 0.22, [0.27, 0.3, 0], p.m, p.l, 0.6, [0, 0, -0.5]), CN(0.12, 0.22, [-0.27, 0.3, 0], p.m, p.l, 0.6, [0, 0, 0.5])];
  if (b >= 2) s.push(...gemAt(g, 0.2, [0, 0.22, -0.1]));
  if (b >= 3) for (let i = 0; i < 4; i++) s.push(CN(0.09, 0.14, [0.13, 0.5 + i * 0.18, 0], p.m, p.l, 0.6, [0, 0, -Math.PI / 2]));
  return s;
}
function bow(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = []; const R = 1.0; const n = 10; const a0 = -1.0, a1 = 1.0;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0); const x = -R * Math.cos(a) + R; const y = R * Math.sin(a);
    s.push(C(0.17 - Math.abs(a) * 0.06, (a1 - a0) / n * R + 0.09, [x, y, 0], b >= 2 ? p.m : p.w, b >= 2 ? p.d : p.k, 0.35, [0, 0, -a]));
  }
  const tx = -R * Math.cos(a1) + R, ty = R * Math.sin(a1);
  s.push(C(0.04, ty * 2, [tx, 0, 0], '#f4efd8', undefined, 0.1));
  for (const sd of [-1, 1]) s.push(CN(0.12, 0.3, [tx + 0.08, sd * (ty + 0.1), 0], b >= 3 ? g : p.l, p.l, 0.5, [0, 0, -sd * 0.7]));
  s.push(C(0.17, 0.5, [0, 0, 0], p.k, p.w, 0.1), ...wraps(0, -0.2, 0.2, 4, 0.19, p.d), TR(0.22, 0.05, [0, 0.28, 0], p.l, [0, 0, 0], 0.6), TR(0.22, 0.05, [0, -0.28, 0], p.l, [0, 0, 0], 0.6));
  if (b >= 1) s.push(...gemAt(g, 0.2, [-0.05, 0, -0.1]));
  // ok: kirişe takılı; ucu yayın karnı yönüne (−x) bakar (oklar kirişten gövde/hedef yönüne uçar)
  const tail = tx + 0.05;
  s.push(C(0.07, 1.5, [tail - 0.75, 0, 0], p.w, p.k, 0.1, [0, 0, Math.PI / 2]), CN(0.26, 0.4, [tail - 1.5 - 0.1, 0, 0], p.l, p.m, 0.7, [0, 0, Math.PI / 2]));
  for (const k of [0, 1, 2]) s.push(B(0.2, 0.2, 0.02, [tail - 0.12 - k * 0.11, 0, 0], k === 1 ? g : '#f4efd8', undefined, 0.2, [0.4, 0, 0.4]));
  return s;
}
function staff(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [C(0.17 + (b === 0 ? 0.04 : 0), 2.0, [0, 0.4, 0], p.w, p.k, 0.15), ...wraps(0, -0.3, 0.3, 3, 0.22, p.d), CN(0.2, 0.3, [0, -0.7, 0], p.m, p.d, 0.5, [Math.PI, 0, 0])];
  const hy = 1.6;
  if (b === 0) { s.push(SP(0.34, [0, hy, 0], p.w, [1, 1.2, 1], 0.1), CN(0.1, 0.5, [0.18, hy + 0.3, 0], p.w, p.k, 0.1, [0, 0, -0.5]), CN(0.1, 0.5, [-0.18, hy + 0.3, 0], p.w, p.k, 0.1, [0, 0, 0.5]), ...gemAt(g, 0.26, [0, hy + 0.15, -0.14])); }
  else {
    s.push(SP(0.7, [0, hy + 0.1, 0], g, undefined, 0.75), SP(0.2, [-0.12, hy + 0.25, -0.3], '#ffffff', undefined, 0.2));
    for (let i = 0; i < 3 + (b >= 3 ? 1 : 0); i++) { const a = (i / (3 + (b >= 3 ? 1 : 0))) * Math.PI * 2 + 0.6; s.push(CN(0.16, 0.7, [Math.cos(a) * 0.3, hy - 0.2, Math.sin(a) * 0.3], p.m, p.l, 0.65, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5])); }
    s.push(TR(1.0, 0.1, [0, hy + 0.1, 0], p.l, [Math.PI / 2, 0, 0], 0.65), TR(0.3, 0.06, [0, hy - 0.45, 0], p.m, [Math.PI / 2, 0, 0], 0.6));
    if (b >= 3) s.push(TR(0.95, 0.05, [0, hy + 0.1, 0], g, [Math.PI / 2, 0.5, 0.3], 0.7), SP(0.14, [0.5, hy + 0.35, -0.1], g, undefined, 0.7), SP(0.12, [-0.45, hy - 0.1, 0.2], g, undefined, 0.7));
    if (b === 4) s.push(CN(0.14, 0.5, [0.28, hy + 0.55, 0], p.m, p.l, 0.7, [0, 0, -0.35]), CN(0.14, 0.5, [-0.28, hy + 0.55, 0], p.m, p.l, 0.7, [0, 0, 0.35]));
  }
  return s;
}
function armor(b: number, p: Pal, g: string): PartSpec[] {
  const cloth = b === 0 ? '#9a6f45' : b === 1 ? '#8a4a2a' : b === 2 ? '#4a5568' : b === 3 ? '#38489a' : '#8a1f1f';
  const s: PartSpec[] = [
    { k: 'cyl', dt: 1.0, db: 0.78, h: 1.15, p: [0, 0.1, 0], c: p.m, c2: p.d, gloss: b >= 1 ? 0.45 : 0.1, seg: 18 },
    { k: 'cyl', dt: 0.8, db: 1.05, h: 0.55, p: [0, -0.7, 0], c: cloth, c2: p.d, gloss: 0.1, seg: 18 },
    TR(0.9, 0.12, [0, -0.45, 0], p.k, [0, 0, 0], 0.3), B(0.22, 0.2, 0.08, [0, -0.45, -0.46], p.l, p.l, 0.7),
    TR(0.62, 0.14, [0, 0.72, 0], p.d, [0, 0, 0], 0.4),
    SP(0.72, [0, 0.2, -0.3], p.l, [1.0, 0.95, 0.42], b ? 0.6 : 0.15),
    C(0.34, 0.7, [0.72, 0.1, 0], cloth, p.d, 0.1, [0, 0, 0.42]), C(0.34, 0.7, [-0.72, 0.1, 0], cloth, p.d, 0.1, [0, 0, -0.42]),
  ];
  if (b >= 1) s.push(SP(0.62, [0.6, 0.62, 0], p.m, [1.1, 0.7, 1.0], 0.5), SP(0.62, [-0.6, 0.62, 0], p.m, [1.1, 0.7, 1.0], 0.5));
  if (b >= 2) s.push(B(0.12, 0.9, 0.08, [0, 0.15, -0.55], p.d, p.d, 0.5), B(0.7, 0.1, 0.08, [0, 0.32, -0.52], p.d, p.d, 0.5));
  if (b >= 3) for (const sd of [-1, 1]) s.push(CN(0.2, 0.55, [sd * 0.66, 0.95, 0], p.l, p.m, 0.7, [0, 0, -sd * 0.35]), CN(0.14, 0.4, [sd * 0.82, 0.78, -0.1], p.l, p.m, 0.7, [0, 0, -sd * 0.9]));
  if (b >= 1) s.push(...gemAt(g, b >= 3 ? 0.3 : 0.22, [0, 0.22, -0.52]));
  if (b === 4) s.push(TR(1.05, 0.06, [0, 0.6, 0], p.l, [0, 0, 0], 0.7), TR(0.88, 0.05, [0, -0.1, 0], p.l, [0, 0, 0], 0.7));
  return s;
}
function helmet(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [
    SP(1.2, [0, 0.12, 0], p.m, [1, 0.88, 1.08], b ? 0.55 : 0.1), TR(1.22, 0.14, [0, -0.27, 0], p.d, [0, 0, 0], 0.5),
    SP(0.62, [0, -0.2, -0.46], '#1a1020', [1, 0.62, 0.3], 0.1), B(0.14, 0.6, 0.12, [0, -0.04, -0.6], p.d, p.m, 0.5),
    B(0.16, 0.5, 0.5, [0.56, -0.28, -0.05], p.d, p.m, 0.4), B(0.16, 0.5, 0.5, [-0.56, -0.28, -0.05], p.d, p.m, 0.4),
  ];
  if (b === 0) s.push(B(1.15, 0.1, 0.12, [0, 0.0, -0.52], p.k, p.w, 0.1), SP(0.2, [0, 0.74, 0], p.k));
  if (b >= 1) s.push(B(0.14, 0.4, 1.0, [0, 0.62, 0], p.d, p.m, 0.5));
  if (b >= 2) s.push(B(0.12, 0.5, 1.2, [0, 0.84, 0], p.l, p.m, 0.6), TR(1.0, 0.07, [0, 0.12, 0], p.l, [Math.PI / 2, 0, 0], 0.6));
  if (b >= 3) for (const sd of [-1, 1]) s.push(CN(0.26, 0.95, [sd * 0.7, 0.6, 0], '#f3ecd8', '#c9b98a', 0.3, [0, 0, -sd * 0.55]));
  if (b === 4) s.push(CN(0.5, 0.9, [0, 0.95, 0.35], '#d83a3a', '#7a1f1f', 0.2, [-0.8, 0, 0]), TR(1.34, 0.07, [0, -0.1, 0], p.l, [0, 0, 0], 0.7));
  if (b >= 1) s.push(...gemAt(g, 0.22, [0, 0.38, -0.6]));
  return s;
}
function amulet(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [TR(1.7, b === 0 ? 0.1 : 0.07, [0, 0.55, 0], b === 0 ? p.k : p.m, [Math.PI / 2, 0, 0], b ? 0.6 : 0.1)];
  if (b === 0) for (let i = 0; i < 7; i++) { const a = Math.PI * (0.18 + 0.64 * (i / 6)) + Math.PI; s.push(SP(0.2, [Math.cos(a) * 0.85, 0.55 + Math.sin(a) * 0.85, 0], i % 2 ? p.l : p.w, undefined, 0.3)); }
  const py = -0.35;
  s.push(TR(0.78 + b * 0.04, 0.1, [0, py, 0], p.m, [Math.PI / 2, 0, 0], 0.6), ...gemAt(g, 0.46 + b * 0.04, [0, py, -0.05]));
  if (b >= 1) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.push(CN(0.12, 0.22 + (b >= 3 ? 0.08 : 0), [Math.cos(a) * 0.5, py + Math.sin(a) * 0.5, 0], p.l, p.m, 0.6, [0, 0, a - Math.PI / 2])); }
  if (b >= 3) s.push(TR(1.16, 0.05, [0, py, 0.04], p.l, [Math.PI / 2, 0, 0], 0.7), SP(0.18, [0, 0.92, -0.1], g, undefined, 0.7));
  if (b === 4) s.push(CN(0.3, 0.7, [0.62, py + 0.34, 0], p.l, p.m, 0.7, [0, 0, -1.0]), CN(0.3, 0.7, [-0.62, py + 0.34, 0], p.l, p.m, 0.7, [0, 0, 1.0]));
  return s;
}

function shield(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [C(1.75, 0.18, [0, 0, 0], p.m, p.d, 0.4, [Math.PI / 2, 0, 0], 28), TR(1.75, 0.16, [0, 0, 0], b === 0 ? p.k : p.d, [Math.PI / 2, 0, 0], 0.5)];
  if (b >= 1) s.push(B(1.5, 0.14, 0.07, [0, 0, -0.1], p.d, p.d, 0.4), B(0.14, 1.5, 0.07, [0, 0, -0.1], p.d, p.d, 0.4));
  if (b >= 2) s.push(TR(1.12, 0.08, [0, 0, -0.1], p.l, [Math.PI / 2, 0, 0], 0.65));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.push(SP(0.13, [Math.cos(a) * 0.74, Math.sin(a) * 0.74, -0.12], p.l, undefined, 0.6)); }
  if (b >= 3) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; s.push(CN(0.16, 0.34, [Math.cos(a) * 0.44, Math.sin(a) * 0.44, -0.22], p.l, p.m, 0.7, [-Math.PI / 2, 0, 0])); }
  s.push(SP(0.52, [0, 0, -0.14], b === 0 ? p.w : p.l, [1, 1, 0.5], 0.6), ...gemAt(g, 0.3, [0, 0, -0.34]));
  if (b === 4) s.push(CN(0.3, 0.5, [0, 1.0, 0], p.l, p.m, 0.7), CN(0.3, 0.5, [0, -1.0, 0], p.l, p.m, 0.7, [Math.PI, 0, 0]));
  return s;
}
function boots(b: number, p: Pal, g: string): PartSpec[] {
  const leather = b === 0 ? '#8a6a44' : b === 1 ? '#7a4a28' : b === 2 ? '#4a5568' : b === 3 ? '#38489a' : '#8a1f1f';
  const s: PartSpec[] = [
    { k: 'cyl', dt: 0.62, db: 0.5, h: 1.0, p: [0, 0.3, 0.1], c: leather, c2: p.d, gloss: 0.15, seg: 14 },
    { k: 'sphere', d: 0.78, s: [0.78, 0.62, 1.55], p: [0, -0.4, -0.22], c: leather, c2: p.d, gloss: 0.2 },
    B(0.62, 0.12, 1.25, [0, -0.7, -0.2], p.d, p.d, 0.2), TR(0.7, 0.13, [0, 0.82, 0.1], p.m, [0, 0, 0], 0.5), SP(0.4, [0, -0.5, -0.78], p.m, [1, 0.8, 0.7], 0.5),
  ];
  if (b >= 1) s.push(B(0.5, 0.1, 0.5, [0, 0.2, -0.22], p.l, p.m, 0.5, [-0.35, 0, 0]));
  if (b >= 2) s.push(B(0.34, 0.62, 0.08, [0, 0.35, -0.28], p.m, p.l, 0.65, [0.1, 0, 0]));
  if (b >= 3) s.push(CN(0.16, 0.36, [0, -0.62, 0.52], p.l, p.m, 0.7, [-Math.PI / 2, 0, 0]));
  if (b === 4) for (const sd of [-1, 1]) s.push(CN(0.22, 0.7, [sd * 0.36, 0.55, 0.28], p.l, p.m, 0.7, [0.5, 0, -sd * 0.6]));
  if (b >= 1) s.push(...gemAt(g, 0.22, [0, 0.82, -0.2]));
  return s;
}
function bracelet(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [TR(1.0, 0.36, [0, 0, 0], p.m, [0, 0, 0], 0.6), TR(1.0, 0.1, [0, 0.14, 0], p.l, [0, 0, 0], 0.7)];
  const n = 8; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; s.push(SP(0.13, [Math.cos(a) * 0.5, 0.18, Math.sin(a) * 0.5], i % 2 ? p.l : p.d, undefined, 0.5)); }
  if (b >= 2) s.push(TR(0.74, 0.1, [0, -0.1, 0], p.l, [0, 0, 0], 0.7));
  if (b >= 3) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s.push(CN(0.14, 0.3, [Math.cos(a) * 0.62, 0.05, Math.sin(a) * 0.62], p.l, p.m, 0.7, [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2])); }
  s.push(...gemAt(g, b >= 3 ? 0.42 : 0.32, [0, 0.3, -0.5]));
  if (b === 4) for (const sd of [-1, 1]) s.push(...gemAt(g, 0.2, [sd * 0.4, 0.28, -0.32]));
  return s;
}
function earring(b: number, p: Pal, g: string): PartSpec[] {
  const s: PartSpec[] = [TR(0.95, 0.1, [0, 0.25, 0], p.m, [Math.PI / 2, 0, 0], 0.65), SP(0.2, [0, 0.76, 0], p.l, undefined, 0.7), C(0.04, 0.5, [0, -0.45, 0], p.m, p.m, 0.6), ...gemAt(g, 0.5 + b * 0.04, [0, -0.85, 0])];
  if (b >= 1) s.push(CN(0.22, 0.3, [0, -0.5, 0], p.l, p.m, 0.7, [Math.PI, 0, 0]));
  if (b >= 2) s.push(TR(0.55, 0.07, [0, 0.25, 0], p.l, [Math.PI / 2, 0, 0], 0.7));
  if (b >= 3) for (const sd of [-1, 1]) s.push(SP(0.2, [sd * 0.34, -0.55, 0], '#f6f1e2', undefined, 0.6), C(0.03, 0.36, [sd * 0.34, -0.38, 0], p.m, p.m, 0.6));
  if (b === 4) for (const sd of [-1, 1]) s.push(CN(0.22, 0.6, [sd * 0.5, 0.55, 0], p.l, p.m, 0.7, [0, 0, -sd * 0.7]));
  return s;
}

export function itemSpecs(it: ItemKey): PartSpec[] {
  const b = Math.max(0, Math.min(4, it.band)); const p = PALS[b]; const g = it.el ? EL.colors[it.el.k] : it.tier <= 0 ? p.l : TIER_COLORS[it.tier];
  if (it.slot === 'weapon') { const k = (it.wk as DmgKind | undefined) ?? 'kilic'; return k === 'cift' ? axe(b, p, g) : k === 'bicak' ? dagger(b, p, g) : k === 'yay' ? bow(b, p, g) : k === 'buyu' ? staff(b, p, g) : sword(b, p, g); }
  switch (it.slot) { case 'armor': return armor(b, p, g); case 'helmet': return helmet(b, p, g); case 'shield': return shield(b, p, g); case 'boots': return boots(b, p, g); case 'bracelet': return bracelet(b, p, g); case 'earring': return earring(b, p, g); default: return amulet(b, p, g); }
}
/** Sahnedeki duruş: silahlar eğik (uç sağ-yukarı), zırh/miğfer/tılsım hafif döndürülmüş */
const POSE: Record<string, V3> = { kilic: [0, -0.5, -0.78], cift: [0, -0.4, -0.7], bicak: [0, -0.5, -0.78], yay: [0, 0.55, 0], buyu: [0, -0.4, -0.55], armor: [-0.12, 0.5, 0], helmet: [0.18, 0.55, 0], amulet: [0.05, 0.45, 0], shield: [-0.1, 0.55, 0], boots: [0.1, 0.9, 0], bracelet: [0.85, 0.3, 0], earring: [0.05, 0.4, 0] };

const SIZE = 192;
interface Studio { engine: Engine; scene: Scene; cam: FreeCamera; mat: ReturnType<typeof toonMaterial>; canvas: HTMLCanvasElement }
let studio: Studio | null | false = null;
function ensure(): Studio | null {
  if (studio !== null) return studio || null;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
    const engine = new Engine(canvas, true, { alpha: true, preserveDrawingBuffer: true, antialias: true, stencil: false }, false);
    const scene = new Scene(engine); scene.clearColor = new Color4(0, 0, 0, 0);
    const cam = new FreeCamera('ic', new Vector3(0, 0, -10), scene); cam.mode = FreeCamera.ORTHOGRAPHIC_CAMERA; cam.setTarget(Vector3.Zero()); cam.minZ = 0.1; cam.maxZ = 40;
    const mat = toonMaterial(scene, { vertexColors: true, rim: 0.5, emissive: new Color3(0.2, 0.19, 0.17) });
    studio = { engine, scene, cam, mat, canvas };
    // kontur kalınlığı: ana sahne gözlemcisinden SONRA ayarlanır (simgede daha kalın kontur okunur)
    scene.onBeforeRenderObservable.add(() => { for (const m of scene.materials) if (m.name === 'outline') (m as unknown as { setFloat(n: string, v: number): void }).setFloat('uWidth', 5.5); });
    return studio;
  } catch { studio = false; return null; }
}
const cache = new Map<string, string>(); const frameCache = new Map<string, string[]>();
const keyOf = (it: ItemKey) => `${it.slot}|${it.slot === 'weapon' ? it.wk ?? 'kilic' : ''}|${it.band}|${it.tier}|${it.el?.k ?? ''}`;
/** Eşyayı verilen y dönüşleriyle çizer. uniform=true: tüm kareler aynı kadraj (döner önizleme), değilse tek kare sıkı kadraj. */
function shoot(it: ItemKey, yaws: number[], uniform: boolean): string[] | null { return shootSpecs(() => itemSpecs(it), POSE[it.slot === 'weapon' ? it.wk ?? 'kilic' : it.slot], yaws, uniform); }
/** Herhangi bir parça listesini (eşya, taş, anahtar, sandık) aynı stüdyoda çizer */
function shootSpecs(specs: () => PartSpec[], pose: V3, yaws: number[], uniform: boolean, fixed?: { cx: number; cy: number; h: number }): string[] | null {
  const st = ensure(); if (!st) return null;
  const { scene, cam, canvas, engine } = st;
  const mesh: Mesh = build(scene, 'item', specs()); mesh.material = st.mat; addOutline(mesh, scene);
  const pivot = new TransformNode('pv', scene); mesh.parent = pivot;
  const box = (yaw: number) => { pivot.rotation.set(pose[0], pose[1] + yaw, pose[2]); pivot.computeWorldMatrix(true); mesh.computeWorldMatrix(true); mesh.refreshBoundingInfo(); const bb = mesh.getBoundingInfo().boundingBox; return { mn: bb.minimumWorld.clone(), mx: bb.maximumWorld.clone() }; };
  const fitOf = (b: { mn: Vector3; mx: Vector3 }) => ({ cx: (b.mn.x + b.mx.x) / 2, cy: (b.mn.y + b.mx.y) / 2, h: Math.max(b.mx.x - b.mn.x, b.mx.y - b.mn.y) / 2 * 1.03 + 0.04 });
  let shared: { cx: number; cy: number; h: number } | null = null;
  if (uniform) { const bs = yaws.map(box); const mn = new Vector3(Math.min(...bs.map((b) => b.mn.x)), Math.min(...bs.map((b) => b.mn.y)), 0), mx = new Vector3(Math.max(...bs.map((b) => b.mx.x)), Math.max(...bs.map((b) => b.mx.y)), 0); shared = fitOf({ mn, mx }); }
  const urls: string[] = [];
  for (const yaw of yaws) {
    const f = fixed ?? shared ?? fitOf(box(yaw)); box(yaw);
    cam.orthoLeft = f.cx - f.h; cam.orthoRight = f.cx + f.h; cam.orthoTop = f.cy + f.h; cam.orthoBottom = f.cy - f.h; cam.position.set(f.cx, f.cy, -10); cam.setTarget(new Vector3(f.cx, f.cy, 0));
    engine.setSize(SIZE, SIZE); scene.render(); urls.push(canvas.toDataURL('image/png'));
  }
  mesh.dispose(false, false); pivot.dispose();
  return urls;
}
/** Eşya görselinin PNG veri adresi (WebGL yoksa null). Aynı slot/tür/bant/kademe için bir kez çizilir. */
export function itemArtUrl(it: ItemKey): string | null {
  const key = keyOf(it); const hit = cache.get(key); if (hit) return hit;
  const r = shoot(it, [0], false); if (!r) return null; cache.set(key, r[0]); return r[0];
}
/** Döner önizleme kareleri (n kare, tam tur); ilk kullanımda çizilir ve önbelleğe alınır. */
export function itemArtFrames(it: ItemKey, n = 12): string[] | null {
  const key = keyOf(it) + '|' + n; const hit = frameCache.get(key); if (hit) return hit;
  const r = shoot(it, Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2), true); if (!r) return null; frameCache.set(key, r); return r;
}
export const itemArtReady = () => ensure() !== null;

// ───────────── Kut Taşları, boss anahtarları ve sandıklar ─────────────
const GEMS: Record<string, string> = { alp: '#e0503a', kalkan: '#3f86e6', can: '#3fc062', kesin: '#f2c230', cevik: '#a56ae6', emen: '#e46aa6' };
const mix = (a: string, b: string, t: number) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((x, i) => Math.round(x + (pb[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
const GOLD = '#f0c14a', GOLD_D = '#a8741c';
/** sınıfa göre taşın ana rengi: Ham mat/gri, sonrası canlı */
const gemColor = (type: string, grade: number) => (grade === 0 ? mix(GEMS[type], '#8d8678', 0.55) : grade === 1 ? GEMS[type] : mix(GEMS[type], '#ffffff', 0.12 * (grade - 1)));
function gemBody(type: string, c: string, c2: string, grade: number): PartSpec[] {
  const gl = grade === 0 ? 0.1 : 0.7; const f = (o: Partial<PartSpec>): PartSpec => ({ ...(o as PartSpec) });
  switch (type) {
    case 'alp': return [f({ k: 'cyl', d: 0.95, h: 0.8, p: [0, 0, 0], c, c2, gloss: gl, seg: 6 }), f({ k: 'cone', db: 0.95, dt: 0.0, h: 0.95, p: [0, 0.85, 0], c: c2, c2: c, gloss: gl, seg: 6 }), f({ k: 'cone', db: 0.95, dt: 0.35, h: 0.4, p: [0, -0.6, 0], c, c2, gloss: gl, seg: 6, r: [Math.PI, 0, 0] })];
    case 'kalkan': return [f({ k: 'cyl', d: 1.25, h: 0.55, p: [0, 0, 0], c, c2, gloss: gl, seg: 6 }), f({ k: 'cone', db: 1.25, dt: 0.55, h: 0.4, p: [0, 0.47, 0], c: c2, c2: c, gloss: gl, seg: 6 }), f({ k: 'cone', db: 1.25, dt: 0.4, h: 0.4, p: [0, -0.47, 0], c, c2, gloss: gl, seg: 6, r: [Math.PI, 0, 0] })];
    case 'can': return [f({ k: 'sphere', d: 1.05, s: [1, 1.12, 1], p: [0, -0.05, 0], c, gloss: gl }), f({ k: 'cone', db: 0.62, dt: 0.0, h: 0.62, p: [0, 0.68, 0], c: c2, c2: c, gloss: gl, seg: 10 })];
    case 'kesin': return [f({ k: 'cone', db: 1.0, dt: 0.0, h: 0.95, p: [0, 0.5, 0], c: c2, c2: c, gloss: gl, seg: 4, r: [0, Math.PI / 4, 0] }), f({ k: 'cone', db: 1.0, dt: 0.0, h: 1.2, p: [0, -0.62, 0], c, c2, gloss: gl, seg: 4, r: [Math.PI, Math.PI / 4, 0] })];
    case 'cevik': return [f({ k: 'cone', db: 0.7, dt: 0.0, h: 1.7, p: [0, 0.25, 0], c, c2, gloss: gl, seg: 5, r: [0, 0, 0.12] }), f({ k: 'cone', db: 0.36, dt: 0.0, h: 1.2, p: [-0.5, -0.12, 0.1], c: c2, c2: c, gloss: gl, seg: 5, r: [0, 0, 0.55] }), f({ k: 'cone', db: 0.36, dt: 0.0, h: 1.1, p: [0.5, -0.2, -0.05], c: c2, c2: c, gloss: gl, seg: 5, r: [0, 0, -0.5] })];
    default: return [f({ k: 'torus', d: 1.15, th: 0.42, p: [0, 0, 0], c, gloss: gl, seg: 20, r: [Math.PI / 2, 0, 0] }), f({ k: 'sphere', d: 0.5, p: [0, 0.62, 0], c: c2, gloss: gl }), f({ k: 'icos', d: 0.34, p: [0, -0.62, 0], c: c2, sub: 1, flat: true, gloss: gl })];
  }
}
export function gemSpecs(type: string, grade: number): PartSpec[] {
  const c = gemColor(type, grade); const c2 = mix(c, '#ffffff', 0.38); const s: PartSpec[] = gemBody(type, c, c2, grade);
  const spark = (x: number, y: number, d: number): PartSpec => ({ k: 'sphere', d, p: [x, y, -0.5], c: '#ffffff', gloss: 0.2 });
  if (grade === 0) s.push({ k: 'icos', d: 0.42, p: [-0.62, -0.62, 0.1], c: '#7c766a', sub: 0, flat: true, gloss: 0.05 }, { k: 'icos', d: 0.3, p: [0.64, -0.7, 0.05], c: '#8d8678', sub: 0, flat: true, gloss: 0.05 }, { k: 'icos', d: 0.24, p: [0.1, -0.86, -0.1], c: '#6c665a', sub: 0, flat: true, gloss: 0.05 });
  if (grade >= 2) s.push(spark(-0.35, 0.55, 0.16), spark(0.4, 0.1, 0.11));
  if (grade >= 3) { s.push({ k: 'torus', d: 1.0, th: 0.14, p: [0, -0.98, 0], c: GOLD, c2: GOLD_D, gloss: 0.7, seg: 24, r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; s.push({ k: 'cone', db: 0.18, dt: 0.0, h: 0.6, p: [Math.cos(a) * 0.5, -0.65, Math.sin(a) * 0.5], c: GOLD, c2: GOLD_D, gloss: 0.7, seg: 6, r: [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45] }); } }
  if (grade >= 4) { s.push({ k: 'torus', d: 1.75, th: 0.07, p: [0, 0.05, 0], c: '#fff3b0', gloss: 0.9, seg: 36, r: [1.15, 0, 0.3] }); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.8; s.push({ k: 'sphere', d: 0.13, p: [Math.cos(a) * 0.95, Math.sin(a) * 0.95 + 0.1, -0.4], c: '#fff7c4', gloss: 0.3 }); } }
  return s;
}
const GEM_POSE: V3 = [0.28, 0.6, 0.08];
const gemCache = new Map<string, string>();
/** Kut Taşı görseli (tür × sınıf). WebGL yoksa null. */
export function gemArtUrl(type: string, grade: number): string | null {
  const key = `${type}|${grade}`; const hit = gemCache.get(key); if (hit) return hit;
  const r = shootSpecs(() => gemSpecs(type, grade), GEM_POSE, [0], false, { cx: 0, cy: 0.0, h: 1.22 }); if (!r) return null; gemCache.set(key, r[0]); return r[0];
}
const KEY_COL = ['#c9803a', '#cfd6e0', '#ffd24a'];
export function keySpecs(grade: number): PartSpec[] {
  const m = KEY_COL[grade] ?? KEY_COL[0]; const d = mix(m, '#3a2410', 0.45); const l = mix(m, '#ffffff', 0.4);
  const s: PartSpec[] = [
    { k: 'torus', d: 1.0, th: 0.3, p: [0, 0.9, 0], c: m, c2: l, gloss: 0.7, seg: 20, r: [Math.PI / 2, 0, 0] }, { k: 'cyl', d: 0.24, h: 1.7, p: [0, -0.2, 0], c: m, c2: d, gloss: 0.6, seg: 10 },
    { k: 'box', w: 0.5, h: 0.2, dp: 0.2, p: [0.3, -0.75, 0], c: m, c2: d, gloss: 0.6 }, { k: 'box', w: 0.38, h: 0.2, dp: 0.2, p: [0.25, -0.45, 0], c: m, c2: d, gloss: 0.6 }, { k: 'torus', d: 0.42, th: 0.1, p: [0, 0.05, 0], c: l, gloss: 0.8, seg: 14, r: [Math.PI / 2, 0, 0] },
  ];
  if (grade >= 1) s.push({ k: 'icos', d: 0.3, p: [0, 0.9, -0.15], c: grade === 2 ? '#ff6a4a' : '#6ab4ff', sub: 1, flat: true, gloss: 0.8 });
  if (grade >= 2) for (const sd of [-1, 1]) s.push({ k: 'cone', db: 0.2, dt: 0.0, h: 0.5, p: [sd * 0.62, 1.05, 0], c: l, c2: m, gloss: 0.8, seg: 6, r: [0, 0, -sd * 0.8] });
  return s;
}
const keyCache = new Map<number, string>();
export function keyArtUrl(grade: number): string | null {
  const hit = keyCache.get(grade); if (hit) return hit; const r = shootSpecs(() => keySpecs(grade), [0.2, 0.0, 0.7], [0], false); if (!r) return null; keyCache.set(grade, r[0]); return r[0];
}
export function chestSpecs(grade: number): PartSpec[] {
  const m = KEY_COL[grade] ?? KEY_COL[0]; const wood = '#6b4524', wood2 = '#8a5c30';
  return [
    { k: 'box', w: 1.7, h: 0.85, dp: 1.1, p: [0, 0.43, 0], c: wood, c2: wood2, gloss: 0.3 }, { k: 'cyl', db: 0.55, dt: 0.55, h: 1.7, p: [0, 1.05, 0], c: wood, c2: wood2, gloss: 0.3, seg: 12, r: [0, 0, Math.PI / 2] },
    { k: 'box', w: 1.78, h: 0.14, dp: 1.18, p: [0, 0.86, 0], c: m, gloss: 0.7 }, { k: 'box', w: 0.16, h: 1.15, dp: 1.2, p: [-0.55, 0.62, 0], c: m, gloss: 0.7 }, { k: 'box', w: 0.16, h: 1.15, dp: 1.2, p: [0.55, 0.62, 0], c: m, gloss: 0.7 },
    { k: 'box', w: 0.28, h: 0.34, dp: 0.1, p: [0, 0.78, 0.58], c: '#ffe08a', gloss: 0.8 },
  ];
}
const chestCache = new Map<number, string>();
export function chestArtUrl(grade: number): string | null {
  const hit = chestCache.get(grade); if (hit) return hit; const r = shootSpecs(() => chestSpecs(grade), [0.35, -0.55, 0], [0], false); if (!r) return null; chestCache.set(grade, r[0]); return r[0];
}
