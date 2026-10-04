import { BOYS, BOY_COLORS, type Boy } from '@shared/game';
import type { Game } from '../game/game';
import { getLang, setLang, t } from '../i18n';
import { emblemSvg } from './emblems';
import { icon } from './icons';

/** Giriş / karakter oluşturma ekranı. Başarılı girişte çözülür. */
export function showLogin(g: Game, root: HTMLElement, onEnter: (name: string, pw: string, create: Boy | null) => Promise<string | null>): Promise<void> {
  return new Promise((resolve) => {
    let mode: 'login' | 'create' = 'login'; let boy: Boy = 'gok'; let busy = false; let err = '';
    const el = document.createElement('div'); el.className = 'title'; root.appendChild(el);
    const lang = document.createElement('div'); lang.className = 'langsw'; root.appendChild(lang);
    let lastName = ''; try { lastName = localStorage.getItem('kut.name') ?? ''; } catch { /* */ }
    const render = () => {
      el.classList.toggle('create', mode === 'create'); g.setTitleLayout(mode);
      lang.innerHTML = `<div class="seg leather"><button data-l="tr" class="${getLang() === 'tr' ? 'on' : ''}">TR</button><button data-l="en" class="${getLang() === 'en' ? 'on' : ''}">EN</button></div>`;
      const nameV = (el.querySelector('#ln') as HTMLInputElement | null)?.value ?? lastName; const pwV = (el.querySelector('#lp') as HTMLInputElement | null)?.value ?? '';
      el.innerHTML = `<div class="tcard felt"><div class="logo">${t('ui.title')}<small>${t('ui.tagline')}</small></div><div class="kilim"></div><div class="body">
        <div class="field"><label>${t('ui.name')}</label><input id="ln" maxlength="16" autocomplete="username" value="${nameV.replace(/"/g, '&quot;')}" /></div>
        <div class="field"><label>${t('ui.password')}</label><input id="lp" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" value="${pwV.replace(/"/g, '&quot;')}" /></div>
        ${mode === 'create' ? `<div class="field"><label>${t('ui.chooseBoy')}</label><div class="boys">${BOYS.map((b) => `<div class="boycard ${b === boy ? 'on' : ''}" data-b="${b}" style="--b1:${BOY_COLORS[b].main};--b2:${BOY_COLORS[b].dark}"><div class="em">${emblemSvg(b, '#fff6df', 'rgba(0,0,0,.35)')}</div><h4>${t('boy.' + b)}</h4><div class="sy">${t('boy.' + b + '.sym')}</div><div class="bn">${t('boy.' + b + '.bonus')}</div></div>`).join('')}</div></div>
          <div class="field"><label>${t('ui.class')}</label><div class="classrow"><div class="classcard on"><h4>${t('class.alp')}</h4>${t('class.alp.desc')}</div><div class="classcard soon"><h4>${t('class.kam')}</h4>${t('class.soon')}</div><div class="classcard soon"><h4>${t('class.mergen')}</h4>${t('class.soon')}</div></div></div>` : ''}
        <div class="err" id="lerr">${err}</div>
        <div class="actions"><button class="btn primary" id="go" ${busy ? 'disabled' : ''}>${busy ? t('ui.connecting') : mode === 'login' ? t('ui.login') : t('ui.play')}</button></div>
        <div class="linkrow">${mode === 'login' ? `${t('ui.newhere')} <a id="sw">${t('ui.create')}</a>` : `${t('ui.have')} <a id="sw">${t('ui.login')}</a>`}</div></div></div>`;
      (el.querySelector('#sw') as HTMLElement).onclick = () => { mode = mode === 'login' ? 'create' : 'login'; err = ''; render(); };
      el.querySelectorAll('.boycard').forEach((c) => ((c as HTMLElement).onclick = () => { boy = (c as HTMLElement).dataset.b as Boy; g.setTitleBoy(boy); g.audio.sfx('ui'); render(); }));
      (el.querySelector('#go') as HTMLElement).onclick = submit;
      el.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { e.stopPropagation(); if ((e as KeyboardEvent).key === 'Enter') void submit(); }));
    };
    lang.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button[data-l]') as HTMLElement | null; if (b) { setLang(b.dataset.l as 'tr' | 'en'); g.refreshNpcNames(); render(); g.ui.relocalize(); } });
    const submit = async () => {
      if (busy) return; g.audio.start();
      const name = (el.querySelector('#ln') as HTMLInputElement).value.trim(); const pw = (el.querySelector('#lp') as HTMLInputElement).value;
      busy = true; err = ''; render();
      const e = await onEnter(name, pw, mode === 'create' ? boy : null);
      busy = false;
      if (e) { err = t('err.' + e) === 'err.' + e ? e : t('err.' + e); render(); (el.querySelector('#ln') as HTMLInputElement).focus(); return; }
      try { localStorage.setItem('kut.name', name); } catch { /* */ }
      el.remove(); lang.remove(); resolve();
    };
    g.setTitleBoy(boy); render();
  });
}
