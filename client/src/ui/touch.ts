import type { Game } from '../game/game';
import { TUTORIAL_STEPS, TUTORIAL_TARGET } from '@shared/game';
import { GUIDE, guideActive, guideNorm } from '@shared/guide';
import { t } from '../i18n';

/** Dokunmatik kontrol katmanı: sanal joystick (sol), saldırı + etkileşim düğmeleri (sağ); kamera sürükleme/çimdik Game içinde. */
export const isTouchDevice = () => {
  try { if (new URLSearchParams(location.search).get('touch') === '1') return true; return matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0 && matchMedia('(hover:none)').matches; } catch { return false; }
};

export class TouchControls {
  private base!: HTMLElement; private knob!: HTMLElement; private pid = -1; private cx = 0; private cy = 0; private readonly R = 56;
  private btnE!: HTMLElement; private tq!: HTMLElement;
  constructor(private g: Game, root: HTMLElement) {
    document.body.classList.add('touch');
    root.insertAdjacentHTML('beforeend', `<div class="tjoy" id="tjoy"><div class="tknob"></div></div><div class="tquest" id="tquest"></div><div class="tbtns" id="tbtns"><button class="tb tatk" data-t="atk" type="button" aria-label="attack">⚔</button><button class="tb tint" data-t="int" type="button" style="display:none">E</button></div>`);
    this.base = root.querySelector('#tjoy') as HTMLElement; this.knob = this.base.firstElementChild as HTMLElement; this.btnE = root.querySelector('.tint') as HTMLElement;
    const b = this.base;
    b.addEventListener('pointerdown', (e) => { if (this.pid >= 0) return; e.preventDefault(); g.audio.start(); this.pid = e.pointerId; b.setPointerCapture(e.pointerId); const r = b.getBoundingClientRect(); this.cx = r.left + r.width / 2; this.cy = r.top + r.height / 2; this.move(e); });
    b.addEventListener('pointermove', (e) => { if (e.pointerId === this.pid) this.move(e); });
    const end = (e: PointerEvent) => { if (e.pointerId !== this.pid) return; this.pid = -1; g.joy = null; this.knob.style.transform = ''; };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    const atk = root.querySelector('.tatk') as HTMLElement;
    atk.addEventListener('pointerdown', (e) => { e.preventDefault(); g.audio.start(); atk.setPointerCapture(e.pointerId); atk.classList.add('on'); g.setAttack(true); });
    const up = () => { atk.classList.remove('on'); g.setAttack(false); }; atk.addEventListener('pointerup', up); atk.addEventListener('pointercancel', up);
    this.btnE.addEventListener('click', () => g.interact());
    this.tq = root.querySelector('#tquest') as HTMLElement; this.tq.addEventListener('click', () => g.ui.open(g.me.tut.step < TUTORIAL_STEPS.length ? 'elder' : 'guide'));
  }
  private move(e: PointerEvent) {
    let dx = e.clientX - this.cx, dy = e.clientY - this.cy; const l = Math.hypot(dx, dy); if (l > this.R) { dx = dx / l * this.R; dy = dy / l * this.R; }
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.hypot(dx, dy) / this.R; this.g.joy = m < 0.18 ? null : { x: dx / this.R, y: -dy / this.R };
  }
  /** Her karede: yakında etkileşim varsa E düğmesini göster */
  /** telefonda görev kutusu gizli: geçerli adım ya da ilk Rehber görevi tek satırlık şeritte gösterilir; dokununca ilgili panel açılır */
  private questLine() {
    const m = this.g.me; if (!m) return; let txt = '';
    if (m.tut.step < TUTORIAL_STEPS.length) { const k = TUTORIAL_STEPS[m.tut.step]; txt = `${t('tut.' + k)} (${Math.floor(m.tut.prog)}/${TUTORIAL_TARGET[k]})`; }
    else { const g = guideNorm(m.guide); const a = guideActive(g, m.level, 1)[0]; if (a) txt = `${t('guide.' + a.id)} (${g.prog[a.id] ?? 0}/${a.need})`; }
    if (txt !== this.tq.dataset.t) { this.tq.dataset.t = txt; this.tq.textContent = txt; this.tq.style.display = txt ? 'block' : 'none'; } void GUIDE;
  }
  tick() { this.questLine(); document.body.classList.toggle('panel-open', this.g.ui.panels.isOpen()); const show = !!this.g.nearby && !this.g.ui.panels.isOpen(); if (this.btnE.style.display !== (show ? '' : 'none')) this.btnE.style.display = show ? '' : 'none'; }
}
