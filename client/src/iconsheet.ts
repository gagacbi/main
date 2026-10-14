import { chestArtUrl, gemArtUrl, itemArtUrl, keyArtUrl } from './game/itemart';
import { KT_GRADES, KT_TYPES } from '@shared/kuttas';

/** Geliştirme sayfası: Kut Taşı, anahtar, sandık ve ek yuva eşyası simgelerini tek tabloda gösterir (?icons=1). */
export function startIconSheet() {
  document.body.style.cssText = 'margin:0;background:#2b2118;color:#f2e2b0;font:14px sans-serif;padding:16px';
  const cell = (u: string | null, label: string, s = 96) => `<div style="text-align:center;width:${s + 10}px"><div style="width:${s}px;height:${s}px;margin:auto;background:#3a2c20;border-radius:12px;display:grid;place-items:center">${u ? `<img src="${u}" width="${s - 8}" height="${s - 8}">` : '—'}</div><small>${label}</small></div>`;
  let h = '<h3>Kut Taşları (tür × sınıf)</h3><div style="display:flex;flex-wrap:wrap;gap:6px">';
  for (const ty of KT_TYPES) for (let g = 0; g < KT_GRADES; g++) h += cell(gemArtUrl(ty, g), `${ty} ${g}`);
  h += '</div><h3>Anahtarlar ve sandıklar</h3><div style="display:flex;gap:6px">';
  for (let g = 0; g < 3; g++) h += cell(keyArtUrl(g), 'anahtar ' + g); for (let g = 0; g < 3; g++) h += cell(chestArtUrl(g), 'sandık ' + g);
  h += '</div><h3>Ek yuva eşyaları (band 0–4)</h3><div style="display:flex;flex-wrap:wrap;gap:6px">';
  for (const slot of ['shield', 'boots', 'bracelet', 'earring'] as const) for (let b = 0; b < 5; b++) h += cell(itemArtUrl({ slot, band: b, tier: Math.min(3, b), wk: undefined } as never), `${slot} ${b}`);
  h += '</div>'; document.body.innerHTML = h; (window as unknown as { __ready: boolean }).__ready = true;
}
