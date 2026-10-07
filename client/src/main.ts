import '@fontsource/fredoka/latin-500.css'; import '@fontsource/fredoka/latin-ext-500.css'; import '@fontsource/fredoka/latin-600.css'; import '@fontsource/fredoka/latin-ext-600.css'; import '@fontsource/fredoka/latin-700.css'; import '@fontsource/fredoka/latin-ext-700.css';
import '@fontsource/nunito/latin-400.css'; import '@fontsource/nunito/latin-ext-400.css'; import '@fontsource/nunito/latin-700.css'; import '@fontsource/nunito/latin-ext-700.css'; import '@fontsource/nunito/latin-800.css'; import '@fontsource/nunito/latin-ext-800.css';
import './style.css';
import type { Boy } from '@shared/game';
import { startGallery } from './gallery';
import { Game } from './game/game';
import { setLang, getLang, t } from './i18n';
import type { Quality } from './game/scene';
import { UI } from './ui/ui';
import { showLogin } from './ui/login';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const params = new URLSearchParams(location.search);

async function boot() {
  setLang(getLang());
  if (params.has('gallery')) { startGallery(canvas); return; }
  const test = document.createElement('canvas'); if (!test.getContext('webgl2') && !test.getContext('webgl')) { uiRoot.innerHTML = `<div class="conn on"><div class="felt" style="padding:28px 40px"><h2 style="font-family:var(--f-head)">${t('err.webgl')}</h2></div></div>`; return; }
  let q: Quality = 'high'; try { q = (params.get('q') as Quality) || (localStorage.getItem('kut.q') as Quality) || 'high'; } catch { /* */ }
  const loading = document.createElement('div'); loading.className = 'loading on'; loading.innerHTML = `<div style="text-align:center"><div class="spin"></div>${t('ui.loading')}</div>`; uiRoot.appendChild(loading);
  await new Promise((r) => setTimeout(r, 30));
  const g = new Game(canvas, uiRoot, q);
  new UI(g, uiRoot); uiRoot.classList.add('prelogin');
  const style = document.createElement('style'); style.textContent = '.prelogin > *:not(.title):not(.loading):not(.langsw) { display: none !important; }'; document.head.appendChild(style);
  g.startTitle(); loading.remove();
  (window as unknown as { __game: Game }).__game = g;
  const enter = async (name: string, pw: string, create: Boy | null): Promise<string | null> => {
    try {
      const ld = document.createElement('div'); ld.className = 'loading on'; ld.innerHTML = `<div style="text-align:center"><div class="spin"></div>${t('ui.connecting')}</div>`; uiRoot.appendChild(ld);
      try { await g.connect(name, pw, create); } finally { ld.remove(); }
      g.stopTitle(); uiRoot.classList.remove('prelogin'); style.remove(); g.audio.start(); g.ui.sysLocal('sys.welcome'); setTimeout(() => { g.ui.toast(t('help.fight'), 'good'); setTimeout(() => g.ui.toast(t('help.move'), 'good'), 900); }, 1200);
      (window as unknown as { __ready: boolean }).__ready = true; return null;
    } catch (e) { return (e as Error).message || 'net'; }
  };
  const auto = params.get('name');
  if (auto) { const r = await enter(auto, params.get('pw') ?? 'secret1', (params.get('create') as Boy) || null); if (r) console.error('auto login failed', r); return; }
  await showLogin(g, uiRoot, enter);
}
boot().catch((e) => { console.error(e); uiRoot.innerHTML = `<div class="conn on"><div class="felt" style="padding:28px 40px"><h2 style="font-family:var(--f-head)">Hata</h2><pre>${String(e?.message ?? e)}</pre></div></div>`; });
