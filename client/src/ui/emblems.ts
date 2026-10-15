import type { Boy } from '@shared/game';

/** Boy amblemleri (64x64). Aynı veriyle hem canvas (bayrak dokusu) hem SVG (arayüz) çizilir. */
interface Emb { fills: string[]; cuts: string[]; strokes: string[]; dots: [number, number, number][] }
const EMB: Record<Boy, Emb> = {
  // Kartal: açık kanatlı, yandan bakan baş
  gok: {
    fills: ['M32 8 L36 14 L40 13 L37 20 L46 14 L60 20 L50 24 L58 30 L45 30 L51 40 L38 35 L37 48 L42 58 L32 52 L22 58 L27 48 L26 35 L13 40 L19 30 L6 30 L14 24 L4 20 L18 14 L27 20 L24 13 L28 14 Z'],
    cuts: ['M30 18 L34 18 L35 22 L29 22 Z', 'M26 30 L38 30 L36 38 L28 38 Z'],
    strokes: ['M32 22 L32 46'], dots: [[34, 15, 1.6]],
  },
  // Bozkurt: önden kurt başı
  yer: {
    fills: ['M12 6 L26 20 L38 20 L52 6 L54 28 L48 42 L40 47 L32 58 L24 47 L16 42 L10 28 Z'],
    cuts: ['M19 29 L27 31 L25 35 L18 33 Z', 'M45 29 L37 31 L39 35 L46 33 Z', 'M28 46 L36 46 L32 52 Z'],
    strokes: ['M32 22 L32 40', 'M20 14 L26 22', 'M44 14 L38 22'], dots: [[32, 45, 2.4]],
  },
  // Geyik: dallı boynuzlu baş
  ay: {
    fills: ['M32 58 L24 45 L22 35 L28 29 L36 29 L42 35 L40 45 Z', 'M22 35 L9 32 L20 42 Z', 'M42 35 L55 32 L44 42 Z'],
    cuts: ['M26 36 L29 37 L28 40 L25 39 Z', 'M38 36 L35 37 L36 40 L39 39 Z'],
    strokes: ['M27 30 L22 18 L16 5', 'M22 18 L10 12', 'M24 23 L14 23', 'M37 30 L42 18 L48 5', 'M42 18 L54 12', 'M40 23 L50 23'], dots: [[32, 54, 2.6]],
  },
};

export function drawEmblem(ctx: CanvasRenderingContext2D, boy: Boy, cx: number, cy: number, size: number, fill: string, dark: string) {
  const e = EMB[boy]; const k = size / 64;
  ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(k, k);
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of e.fills) { const P = new Path2D(p); ctx.fill(P); ctx.stroke(P); }
  for (const p of e.strokes) ctx.stroke(new Path2D(p));
  ctx.fillStyle = dark; for (const p of e.cuts) ctx.fill(new Path2D(p));
  for (const [x, y, r] of e.dots) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
export function emblemSvg(boy: Boy, fill = '#f4f1ff', dark = '#1a1230', cls = ''): string {
  const e = EMB[boy];
  return `<svg class="${cls}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g fill="${fill}" stroke="${fill}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${e.fills.map((p) => `<path d="${p}"/>`).join('')}${e.strokes.map((p) => `<path d="${p}" fill="none"/>`).join('')}</g><g fill="${dark}">${e.cuts.map((p) => `<path d="${p}"/>`).join('')}${e.dots.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;
}
