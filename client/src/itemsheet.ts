import { itemArtUrl } from './game/itemart';

/** Geliştirici sayfası (?items): tüm eşya görselleri bir tabloda; görsel inceleme ve e2e için. */
export function itemSheet() {
  document.body.style.cssText = 'background:#4a3220;color:#fff;font:12px sans-serif;margin:8px;overflow:auto;height:auto';
  const kinds = ['kilic', 'cift', 'bicak', 'yay', 'buyu'] as const; const rows: string[] = [];
  const cell = (it: Parameters<typeof itemArtUrl>[0]) => `<img src="${itemArtUrl(it) ?? ''}" width="88" height="88" style="background:#5a3a22;border-radius:8px;margin:2px">`;
  for (const k of kinds) rows.push(`<div>${k} ${[0, 1, 2, 3, 4].map((b) => cell({ slot: 'weapon', band: b, tier: [0, 1, 2, 3, 3][b] as 0, wk: k })).join('')}</div>`);
  for (const s of ['armor', 'helmet', 'amulet'] as const) rows.push(`<div>${s} ${[0, 1, 2, 3, 4].map((b) => cell({ slot: s, band: b, tier: [0, 1, 2, 3, 3][b] as 0 })).join('')}</div>`);
  document.body.innerHTML = rows.join('');
  (window as unknown as { __sheet: boolean }).__sheet = true;
}
