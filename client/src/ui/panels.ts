import {
  BOOK_BONUS, BOY_COLORS, EXPEDITION_HOURS, OBA, SKILLS, SKILL_MAX_RANK, SKILL_RANK_LABEL, SLOTS, SPEC_LEVEL, TIER_COLORS, TUTORIAL_STEPS, TUTORIAL_TARGET,
  UPGRADE_DESTROYS_FROM, UPGRADE_RATE, UP_PCT, itemStats, skillRankGold, upgradeCost, type ExpeditionResult, type Item, type MatKey, type Slot,
} from '@shared/game';
import type { MarketListing, MarketMail, ObaInfo } from '@shared/protocol';
import type { Game } from '../game/game';
import { fmtDur, getLang, itemName, num, setLang, t, tierName } from '../i18n';
import { THREADS, THREAD_SIZE, titlesOf, type Thread } from '@shared/lore';
import { MAPS, regionAt, type MapId } from '@shared/maps';
import { DUNGEONS } from '@shared/dungeon';
import { GATE_DUNGEONS, GATE_LINKS, INSCRIPTIONS, CRAFT, DMG_KINDS, MARKET, HUB_R, inHubTown, marketRef, marketPriceBounds, rerollCost, BASE_ENCH_POOL, ENCH_KEYS } from '@shared/game';
import { emblemSvg } from './emblems';
import { icon } from './icons';

const ELDER_SVG = `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd9ef"/></linearGradient></defs>
  <path d="M-4 150 Q8 104 60 100 Q112 104 124 150 Z" fill="url(#rb)" stroke="#1a1230" stroke-width="3"/><path d="M44 104 L60 126 L76 104" fill="none" stroke="#4aa8ff" stroke-width="5" stroke-linecap="round"/>
  <path d="M26 66 Q22 120 60 140 Q98 120 94 66 Q60 84 26 66 Z" fill="#ffffff" stroke="#1a1230" stroke-width="3" stroke-linejoin="round"/><path d="M48 112 Q60 120 72 112 M54 124 Q60 128 66 124" fill="none" stroke="#cfd9ef" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="60" cy="66" rx="29" ry="31" fill="#f4c79c" stroke="#1a1230" stroke-width="3"/><path d="M32 70 Q60 96 88 70 Q76 100 60 102 Q44 100 32 70 Z" fill="#fff" stroke="#1a1230" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M48 82 Q60 88 72 82 Q60 78 48 82 Z" fill="#fff" stroke="#1a1230" stroke-width="2"/><ellipse cx="50" cy="62" rx="4.4" ry="5.6" fill="#2a1b12"/><ellipse cx="70" cy="62" rx="4.4" ry="5.6" fill="#2a1b12"/><circle cx="51.6" cy="60" r="1.6" fill="#fff"/><circle cx="71.6" cy="60" r="1.6" fill="#fff"/>
  <path d="M40 54 Q50 46 58 53 M62 53 Q70 46 80 54" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><path d="M40 54 Q50 46 58 53 M62 53 Q70 46 80 54" fill="none" stroke="#1a1230" stroke-width="1.2" stroke-linecap="round" opacity=".4"/>
  <ellipse cx="42" cy="72" rx="5" ry="3.4" fill="#ff9a8a" opacity=".6"/><ellipse cx="78" cy="72" rx="5" ry="3.4" fill="#ff9a8a" opacity=".6"/><ellipse cx="60" cy="68" rx="3.4" ry="2.8" fill="#e0a97f"/>
  <path d="M28 40 Q28 18 60 14 Q92 18 92 40 Q92 44 88 44 L32 44 Q28 44 28 40 Z" fill="#fff" stroke="#1a1230" stroke-width="3" stroke-linejoin="round"/><path d="M26 44 Q60 52 94 44 L94 38 Q60 46 26 38 Z" fill="#dfe8f8" stroke="#1a1230" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="60" cy="12" r="6" fill="#f2c14e" stroke="#1a1230" stroke-width="2.5"/><path d="M40 28 Q60 20 80 28" fill="none" stroke="#4aa8ff" stroke-width="4" stroke-linecap="round"/></svg>`;
export type PanelName = 'inv' | 'char' | 'skills' | 'smith' | 'oba' | 'elder' | 'inscr' | 'settings' | 'help' | 'gm' | 'market' | 'gate';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const enchLine = (e: { k: string; v: number }) => `${t('ench.' + e.k)} +${e.v}%`;

export function itemCell(it: Item | null, slot?: Slot, opts: { sel?: boolean; id?: boolean } = {}) {
  if (!it) return `<div class="cell empty" ${slot ? `data-slot="${slot}"` : ''}><span class="sl">${slot ? t('slot.' + slot) : ''}</span>${icon(slot ?? 'bag')}</div>`;
  return `<div class="cell item ${opts.sel ? 'sel' : ''}" style="--tc:${TIER_COLORS[it.tier]}" data-item="${it.id}">${icon(it.slot)}${it.up > 0 ? `<span class="up">+${it.up}</span>` : ''}</div>`;
}
export function itemTip(it: Item, cmp?: Item): string {
  const s = itemStats(it); const c = cmp ? itemStats(cmp) : null;
  const ln = (label: string, v: number, cv: number | null, unit = '') => v ? `<div class="ln"><span>${label}</span><span>${v}${unit}${cv !== null ? ` <span class="cmp ${v > cv ? 'up' : v < cv ? 'dn' : ''}">${v > cv ? '▲' : v < cv ? '▼' : '='}</span>` : ''}</span></div>` : '';
  return `<div class="tn" style="--tc:${TIER_COLORS[it.tier]}">${esc(itemName(it))}${it.up ? ` <b>+${it.up}</b>` : ''}</div><div class="ts">${tierName(it.tier)} · ${t('slot.' + it.slot)} · ${t('ui.ilvl')} ${it.ilvl}</div>`
    + ln(t('ui.atk'), s.atk, c ? c.atk : null) + ln(t('ui.def'), s.def, c ? c.def : null) + ln(t('ui.hp'), s.hp, c ? c.hp : null) + ln(t('ui.crit'), s.critPct, c ? c.critPct : null, '%') + ln(t('ui.atk') + '%', s.atkPct, c ? c.atkPct : null, '%')
    + (it.slot === 'weapon' ? `<div class="ln"><span>${t('ui.weaponKind')}</span><b>${t('dk.' + (it.wk ?? 'kilic'))}</b></div>` : '')
    + (it.base ? `<div class="en base">◆ ${t('ui.baseEnch')}: ${enchLine(it.base)}</div>` : '')
    + it.ench.map((e) => `<div class="en">✦ ${enchLine(e)}</div>`).join('') + `<div class="ts" style="margin-top:4px">${t('ui.lvlReq')}: ${it.lvlReq}</div>`;
}

export class Panels {
  open: PanelName | null = null; el: HTMLElement; tipEl: HTMLElement;
  mkTab: 'browse' | 'mine' = 'browse'; mkSlot = ''; mkSort: 'deal' | 'price' | 'new' = 'deal'; mkMine2 = true; mkData: { listings: MarketListing[]; total: number } = { listings: [], total: 0 }; mkMine: { listings: MarketListing[]; mail: MarketMail[]; max: number } = { listings: [], mail: [], max: 8 }; mkSel = ''; mkPrice = '';
  selUp = ''; smithTab: 'up' | 'craft' | 'reroll' = 'up'; useBook = false; useCharm = false; lastResult: { cls: string; text: string } | null = null; selBag = '';
  codexTab: Thread = 'insc'; gmLine = ''; gmOut: string[] = []; oba: ObaInfo | null = null; donate: Record<MatKey, number> = { ore: 0, hide: 0, wood: 0 }; expResult: ExpeditionResult | null = null; tick = 0; obaTimer = 0; busy = false;
  constructor(public g: Game, root: HTMLElement) {
    this.el = document.createElement('div'); this.el.className = 'overlay'; root.appendChild(this.el);
    this.tipEl = document.createElement('div'); this.tipEl.className = 'tip'; root.appendChild(this.tipEl);
    this.el.addEventListener('mousedown', (e) => { if (e.target === this.el) this.close(); });
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('contextmenu', (e) => { const c = (e.target as HTMLElement).closest('[data-item]') as HTMLElement | null; if (c) { e.preventDefault(); this.quick(c.dataset.item!); } });
    root.addEventListener('mouseover', (e) => this.hover(e)); root.addEventListener('mousemove', (e) => this.moveTip(e)); root.addEventListener('mouseout', () => (this.tipEl.style.display = 'none'));
    this.el.addEventListener('change', (e) => this.onChange(e));
    this.el.addEventListener('input', (e) => { const el = e.target as HTMLInputElement; if (el.id === 'gmline') this.gmLine = el.value; });
    this.el.addEventListener('keydown', (e) => { e.stopPropagation(); const el = e.target as HTMLInputElement; if (el.id === 'gmline' && e.key === 'Enter') void this.runGm(this.gmLine); if (e.key === 'Escape') this.close(); });
  }
  async runGm(line: string) {
    if (!line.trim()) return; this.gmLine = ''; this.gmOut.push('> ' + line);
    const r = await this.g.net.rpc('gm', { line });
    if (!r.ok) this.gmOut.push('✖ ' + t('err.' + (r.err ?? 'internal'))); else { const d = r.data as { ok: boolean; msg: string }; this.gmOut.push((d.ok ? '' : '✖ ') + d.msg); }
    this.render(true);
  }
  get me() { return this.g.me; }
  isOpen(n?: PanelName) { return n ? this.open === n : this.open !== null; }

  // ─── açma / kapama ───
  async show(n: PanelName) {
    this.open = n; this.lastResult = null; this.el.classList.add('open'); this.g.ui.sfx('ui');
    if (n === 'oba') await this.refreshOba();
    if (n === 'elder') await this.g.net.rpc('elder');
    if (n === 'market') await this.loadMarket();
    this.render();
    if (n === 'oba') { clearInterval(this.obaTimer); this.obaTimer = window.setInterval(() => { if (this.open === 'oba') this.tickOba(); }, 500); }
  }
  close() { this.open = null; this.el.classList.remove('open'); this.tipEl.style.display = 'none'; clearInterval(this.obaTimer); this.g.canvas.focus(); }
  toggle(n: PanelName) { if (this.open === n) this.close(); else void this.show(n); }
  async refreshOba() { const r = await this.g.net.rpc('oba.state'); if (r.ok) this.oba = r.data as ObaInfo; }
  refresh() { if (this.open) this.render(true); }
  private readySig = '';
  /** Yalnızca geri sayımları ve ilerleme çubuklarını günceller; düğmeler yerinde kalır (tıklama kaybolmaz). */
  tickOba() {
    const now = this.g.net.now(); const m = this.me; const o = this.oba; if (!m || !o) return;
    const sig = m.expeditions.map((e) => (now >= e.endAt ? 1 : 0)).join('') + (o.upgrade && now >= o.upgrade.finishAt ? 'U' : '');
    if (sig !== this.readySig) { this.readySig = sig; if (o.upgrade && now >= o.upgrade.finishAt) { void this.refreshOba().then(() => this.render(true)); } else this.render(true); return; }
    this.el.querySelectorAll<HTMLElement>('[data-cd]').forEach((n) => { n.textContent = fmtDur(Number(n.dataset.cd) - now); });
    this.el.querySelectorAll<HTMLElement>('[data-pg]').forEach((n) => { const [a, b] = n.dataset.pg!.split(',').map(Number); n.style.width = `${Math.max(2, Math.min(100, ((now - a) / (b - a)) * 100))}%`; });
  }

  shell(title: string, ic: string, body: string, cls = '') {
    return `<div class="panel felt ${cls}"><div class="head"><h2>${icon(ic)}${title}</h2><button class="btn icon" data-act="close" aria-label="${t('ui.close')}">${icon('close')}</button></div><div class="kilim"></div><div class="body">${body}</div></div>`;
  }
  render(keepScroll = false) {
    if (!this.open || !this.me) return;
    const sc = keepScroll ? (this.el.querySelector('.body') as HTMLElement | null)?.scrollTop ?? 0 : 0;
    const sc2 = keepScroll ? (this.el.querySelector('.itemlist') as HTMLElement | null)?.scrollTop ?? 0 : 0;
    const fn = { inv: () => this.inv(), char: () => this.char(), skills: () => this.skills(), smith: () => this.smith(), oba: () => this.obaPanel(), elder: () => this.elder(), inscr: () => this.inscr(), gm: () => this.gm(), market: () => this.market(), gate: () => this.gatePanel(), settings: () => this.settings(), help: () => this.help() }[this.open];
    const hadFocus = document.activeElement?.id === 'gmline'; this.el.innerHTML = fn();
    if (hadFocus) { const gi = this.el.querySelector('#gmline') as HTMLInputElement | null; gi?.focus(); gi?.setSelectionRange(gi.value.length, gi.value.length); }
    const b = this.el.querySelector('.body') as HTMLElement | null; if (b && sc) b.scrollTop = sc; const il = this.el.querySelector('.itemlist') as HTMLElement | null; if (il && sc2) il.scrollTop = sc2;
  }

  // ─── çanta ───
  private matChips() {
    const m = this.me; const k: [string, number][] = [['gold', m.gold], ['ore', m.bag.ore], ['hide', m.bag.hide], ['wood', m.bag.wood], ['book', m.bag.book], ['charm', m.bag.charm], ['frag', m.bag.frag]];
    return `<div class="mats">${k.map(([n, v]) => `<span class="chip" data-mat="${n}">${icon(n === 'gold' ? 'akce' : n)}${num(v)}</span>`).join('')}</div>`;
  }
  inv() {
    const m = this.me; const bc = BOY_COLORS[m.boy];
    const bag = Array.from({ length: 30 }, (_, i) => itemCell(m.items[i] ?? null, undefined, { sel: m.items[i]?.id === this.selBag })).join('');
    const eq = SLOTS.map((s) => itemCell(m.equip[s] ?? null, s)).join('');
    const sel = m.items.find((i) => i.id === this.selBag); const near = this.nearSmith();
    const act = sel ? `<div class="card row" style="margin-top:10px"><div class="grow"><b>${esc(itemName(sel))}</b><div class="muted">${t('ui.lvlReq')}: ${sel.lvlReq}</div></div>
      <button class="btn primary small" data-act="equip" data-id="${sel.id}" ${sel.lvlReq > m.level ? 'disabled' : ''}>${t('ui.equip')}</button>
      <button class="btn small" data-act="sell" data-id="${sel.id}" ${near ? '' : 'disabled'} title="${near ? '' : t('npc.demirci')}">${t('ui.sell')}</button>
      <button class="btn small" data-act="toUp" data-id="${sel.id}">${t('ui.upgrade')}</button></div>` : '';
    return this.shell(t('ui.inventory'), 'bag', `<div class="inv"><div class="eqcol"><div class="paper" style="--b1:${bc.main};--b2:${bc.dark}">${emblemSvg(m.boy, '#fff6df', 'rgba(0,0,0,.35)')}<div class="nm">${esc(m.name)}</div></div><div class="eqslots">${eq}</div></div>
      <div><div class="sub">${t('ui.bag')} <span class="muted">${m.items.length}/30</span></div><div class="bag">${bag}</div>${act}${this.matChips()}<div class="muted" style="margin-top:8px">${getLang() === 'tr' ? 'Sağ tık: hızlı kuşan' : 'Right-click: quick equip'}</div></div></div>`);
  }
  nearSmith() { const d = Math.hypot(this.g.pos.x - 11, this.g.pos.z + 6.5); return d < 13; }

  // ─── karakter ───
  char() {
    const m = this.me; const s = m.stats;
    const ln = (a: string, b: string | number) => `<div class="ln"><span>${a}</span><b>${b}</b></div>`;
    const specBlock = m.level >= SPEC_LEVEL && m.spec === 'none'
      ? `<div class="sub">${t('ui.chooseSpec')}</div><div class="specs">${(['kalkan', 'kilic'] as const).map((k) => `<div class="card spec" data-act="spec" data-v="${k}"><h4>${t('spec.' + k)}</h4><p>${t('spec.' + k + '.desc')}</p><button class="btn primary small">${t('ui.select')}</button></div>`).join('')}</div><div class="muted">${t('ui.specNote')}</div>`
      : `<div class="sub">${t('ui.class')}</div><div class="card"><b>${t('spec.' + m.spec)}</b>${m.spec !== 'none' ? `<div class="muted">${t('spec.' + m.spec + '.desc')}</div>` : `<div class="muted">${t('class.alp.desc')}</div>`}</div>`;
    return this.shell(t('ui.character'), 'char', `<div style="min-width:520px"><div class="row"><div class="grow"><div style="font-family:var(--f-head);font-size:22px;font-weight:600">${esc(m.name)}</div><div class="muted">${t('boy.' + m.boy)} · ${t('ui.level')} ${m.level}</div></div>
      <div class="chip">${icon('akce')}${num(m.gold)}</div></div><div class="sub">${t('ui.stats')}</div><div class="stats">${ln(t('ui.hp'), num(s.maxHp))}${ln(t('ui.atk'), num(s.atk))}${ln(t('ui.def'), num(s.def))}${ln(t('ui.crit'), s.crit.toFixed(1) + '%')}
      ${ln(t('ui.aspd'), (1 / s.atkInterval).toFixed(2) + '/s')}${ln(t('ui.mspd'), s.moveSpeed.toFixed(1))}${ln(t('ui.leech'), (s.leech * 100).toFixed(0) + '%')}${ln(t('ui.xpb'), '+' + s.xpPct.toFixed(0) + '%')}
      ${ln(t('ui.spell'), '×' + s.spell.toFixed(2))}${ln(t('ui.rank'), m.rank < 0 ? `<span class="bad">${m.rank}</span>` : m.rank)}${ln(t('ui.kut'), m.kut)}${ln(t('ui.points'), num(m.points))}</div>
      <div class="sub">${t('ui.defs')}</div><div class="stats">${DMG_KINDS.map((k) => ln(t('dk.' + k), (s.defKind[k] * 100).toFixed(0) + '%')).join('')}${ln(t('ui.blockHit'), (s.blockHit * 100).toFixed(0) + '%')}${ln(t('ui.blockSkill'), (s.blockSkill * 100).toFixed(0) + '%')}${ln(t('ui.pierce'), (s.pierce * 100).toFixed(0) + '%')}${ln(t('ui.weaponKind'), t('dk.' + s.weaponKind))}</div>
      <div class="sub">${t('boy.' + m.boy)}</div><div class="card">${t('boy.' + m.boy + '.bonus')}</div>${specBlock}</div>`);
  }

  // ─── pazar ───
  async loadMarket() {
    const [b, m] = await Promise.all([this.g.net.rpc('market.browse', { slot: this.mkSlot || undefined, sort: this.mkSort, ...(this.mkMine2 ? { minIlvl: Math.max(1, this.me.level - 10), maxIlvl: this.me.level + 2 } : {}) }), this.g.net.rpc('market.mine')]);
    if (b.ok) this.mkData = b.data as typeof this.mkData; if (m.ok) this.mkMine = m.data as typeof this.mkMine;
  }
  market() {
    const m = this.me; const inTown = inHubTown(this.g.pos.x, this.g.pos.z); const gold = `<span class="chip">${icon('akce')}${num(m.gold)}</span>`;
    const tabs = `<div class="tabs2"><div class="tab2 ${this.mkTab === 'browse' ? 'on' : ''}" data-act="mktab" data-v="browse">${t('mk.browse')} <small>${this.mkData.total}</small></div><div class="tab2 ${this.mkTab === 'mine' ? 'on' : ''}" data-act="mktab" data-v="mine">${t('mk.mine')} <small>${this.mkMine.listings.length}/${this.mkMine.max}</small>${this.mkMine.mail.length ? ' <span class="badge">' + this.mkMine.mail.length + '</span>' : ''}</div></div>`;
    const warn = inTown ? '' : `<div class="card hint-card">${t('mk.town')}</div>`;
    const row = (l: MarketListing, own: boolean) => {
      const ratio = l.price / Math.max(1, l.ref); const cls = ratio < 0.7 ? 'good' : ratio > 1.6 ? 'bad' : '';
      return `<div class="card mk-row"><div class="cell item" style="--tc:${TIER_COLORS[l.item.tier]}" data-item-tip="${l.id}">${icon(l.item.slot)}${l.item.up > 0 ? `<span class="up">+${l.item.up}</span>` : ''}</div>
        <div class="grow"><b>${esc(itemName(l.item))}</b><div class="muted">${t('slot.' + l.item.slot)} · ${t('ui.ilvl')} ${l.item.ilvl}${l.item.slot === 'weapon' ? ' · ' + t('dk.' + (l.item.wk ?? 'kilic')) : ''} · ${esc(l.seller)}</div></div>
        <div class="mk-price ${cls}">${icon('akce')}${num(l.price)}<small>${t('mk.ref')} ${num(l.ref)}</small></div>
        ${own ? `<button class="btn small" data-act="mkcancel" data-id="${l.id}">${t('mk.cancel')}</button>` : `<button class="btn primary small" data-act="mkbuy" data-id="${l.id}" ${m.gold < l.price || !inTown ? 'disabled' : ''}>${t('mk.buy')}</button>`}</div>`;
    };
    if (this.mkTab === 'browse') {
      const chips = ['', ...SLOTS].map((s) => `<div class="chip ${this.mkSlot === s ? 'on' : ''}" data-act="mkslot" data-v="${s}">${s ? t('slot.' + s) : t('mk.all')}</div>`).join('');
      const list = this.mkData.listings.length ? this.mkData.listings.map((l) => row(l, false)).join('') : `<div class="muted" style="padding:14px">${t('mk.empty')}</div>`;
      return this.shell(t('mk.title'), 'akce', `<div style="min-width:640px">${warn}<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${tabs}<span class="grow"></span>${gold}</div><div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${chips}<span class="grow"></span><div class="chip ${this.mkMine2 ? 'on' : ''}" data-act="mkfit" title="${t('mk.fitHint')}">${t('mk.fit')}</div><div class="chip" data-act="mksort">${this.mkSort === 'deal' ? t('mk.sortDeal') : this.mkSort === 'price' ? t('mk.sortPrice') : t('mk.sortNew')}</div></div><div class="itemlist" style="max-height:380px;overflow:auto">${list}</div><div class="muted" style="margin-top:6px">${t('mk.note', { tax: Math.round(MARKET.taxPct * 100), fee: Math.round(MARKET.listFeePct * 100), h: MARKET.durationH })}</div></div>`);
    }
    const mail = this.mkMine.mail.length ? `<div class="sub">${t('mk.mail')}</div>` + this.mkMine.mail.map((x) => `<div class="card">${x.kind === 'gold' ? `${icon('akce')} +${num(x.gold)}` : esc(itemName(x.item!))} <span class="muted">${x.note.startsWith('sold') ? t('mk.sold') : t('mk.expired')}</span></div>`).join('') + `<button class="btn primary small" data-act="mkclaim" style="margin-top:6px">${t('mk.claim')}</button>` : '';
    const bag = m.items.map((it) => `<div class="cell item ${this.mkSel === it.id ? 'sel' : ''}" style="--tc:${TIER_COLORS[it.tier]}" data-act="mkpick" data-id="${it.id}" title="${esc(itemName(it))}">${icon(it.slot)}${it.up > 0 ? `<span class="up">+${it.up}</span>` : ''}</div>`).join('');
    const sel = m.items.find((i) => i.id === this.mkSel); const b = sel ? marketPriceBounds(sel) : null;
    const form = sel ? `<div class="card"><b>${esc(itemName(sel))}</b> <span class="muted">(${t('mk.limits', { min: num(b!.min), max: num(b!.max) })})</span><div class="row" style="margin-top:6px"><input id="mkprice" class="gminput" inputmode="numeric" placeholder="${t('mk.price')}" value="${esc(this.mkPrice)}" /><button class="btn primary small" data-act="mklist">${t('mk.list')}</button></div></div>` : `<div class="muted">${t('mk.pick')}</div>`;
    return this.shell(t('mk.title'), 'akce', `<div style="min-width:640px">${warn}<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${tabs}<span class="grow"></span>${gold}</div>${mail}<div class="sub">${t('mk.myListings')}</div>${this.mkMine.listings.length ? this.mkMine.listings.map((l) => row(l, true)).join('') : `<div class="muted">${t('mk.none')}</div>`}<div class="sub">${t('mk.sellFromBag')}</div><div class="grid-bag">${bag || `<span class="muted">${t('mk.noItems')}</span>`}</div>${form}</div>`);
  }

  // ─── yetenekler ───
  skills() {
    const m = this.me;
    const rows = SKILLS.map((s, i) => {
      const rk = m.skillRanks[i]; const locked = m.level < s.lvl; const cost = skillRankGold(rk);
      const can = !locked && rk < SKILL_MAX_RANK && m.skillPts > 0 && m.gold >= cost;
      return `<div class="skillrow ${locked ? 'locked' : ''}" data-skill="${i}"><div class="sicon">${icon(s.id)}</div><div><h4>${i + 1}. ${t('skill.' + s.id)} <span class="rk">${locked ? t('ui.locked', { n: s.lvl }) : SKILL_RANK_LABEL[rk - 1]}</span></h4><div class="muted">${t('skill.' + s.id + '.d')} · ${t('ui.cd')} ${s.cd}${getLang() === 'tr' ? 'sn' : 's'}</div><div class="rankpips">${Array.from({ length: SKILL_MAX_RANK }, (_, k) => `<i class="${k < rk ? 'on' : ''}"></i>`).join('')}</div></div>
        <div>${rk >= SKILL_MAX_RANK ? `<span class="chip">${t('oba.maxed')}</span>` : `<button class="btn small primary" data-act="rank" data-i="${i}" ${can ? '' : 'disabled'}>${t('ui.upgrade')}<br><small>${num(cost)} ${icon('akce')}</small></button>`}</div></div>`;
    }).join('');
    return this.shell(t('ui.skills'), 'skills', `<div style="min-width:560px"><div class="row"><span class="chip">${icon('skills')} ${t('ui.skillpts')}: ${m.skillPts}</span><span class="chip">${icon('akce')}${num(m.gold)}</span></div><div class="gap"></div>${rows}
      ${m.level >= SPEC_LEVEL && m.spec === 'none' ? `<div class="sub">${t('ui.chooseSpec')}</div><div class="specs">${(['kalkan', 'kilic'] as const).map((k) => `<div class="card spec" data-act="spec" data-v="${k}"><h4>${t('spec.' + k)}</h4><p>${t('spec.' + k + '.desc')}</p><button class="btn primary small">${t('ui.select')}</button></div>`).join('')}</div>` : ''}</div>`);
  }

  // ─── demirci ───
  allItems(): Item[] { const m = this.me; return [...SLOTS.map((s) => m.equip[s]).filter(Boolean) as Item[], ...m.items]; }
  smith() {
    const m = this.me; const items = this.allItems(); let sel = items.find((i) => i.id === this.selUp);
    if (!sel && items.length) { sel = items[0]; this.selUp = sel.id; }
    const eqIds = new Set(SLOTS.map((s) => m.equip[s]?.id));
    const list = items.length ? items.map((it) => `<div class="irow ${it.id === this.selUp ? 'sel' : ''}" data-act="pickUp" data-id="${it.id}">${itemCell(it)}<div><div class="nm" style="color:${TIER_COLORS[it.tier] === '#c9c2b0' ? 'inherit' : TIER_COLORS[it.tier]}">${esc(itemName(it))}${it.up ? ` +${it.up}` : ''}</div><div class="ds">${t('slot.' + it.slot)}${eqIds.has(it.id) ? ' · ' + t('ui.equipped') : ''}</div></div></div>`).join('') : `<div class="muted">${t('ui.chooseItem')}</div>`;
    let right = '';
    if (this.smithTab === 'up') {
      if (!sel) right = `<div class="card muted">${t('ui.chooseItem')}</div>`;
      else {
        const target = sel.up + 1; const maxed = sel.up >= 9; const cost = upgradeCost(Math.min(9, target), sel.ilvl);
        const base = UPGRADE_RATE[Math.min(9, target)]; const rate = Math.min(100, base + (this.useBook ? BOOK_BONUS : 0)); const destroys = target >= UPGRADE_DESTROYS_FROM;
        const okG = m.gold >= cost.gold, okO = m.bag.ore >= cost.ore;
        const can = !maxed && okG && okO && (!this.useBook || m.bag.book > 0) && (!this.useCharm || (m.bag.charm > 0 && destroys)) && !this.busy;
        const tbl = UPGRADE_RATE.slice(1).map((r, i) => { const lv = i + 1; return `<div class="${lv === target ? 'cur' : ''} ${lv < target ? 'done' : ''} ${lv >= UPGRADE_DESTROYS_FROM ? 'risk' : 'safe'}" title="+${lv}">+${lv}<br>${r}%</div>`; }).join('');
        right = `<div class="bigitem">${itemCell(sel)}<div class="grow"><div class="nm" style="color:${TIER_COLORS[sel.tier]}">${esc(itemName(sel))} ${sel.up ? '+' + sel.up : ''}</div><div class="muted">${tierName(sel.tier)} · ${t('ui.ilvl')} ${sel.ilvl} · +${sel.up} → ${maxed ? '—' : '+' + target} <b>(${UP_PCT[sel.up]}% → ${maxed ? '—' : UP_PCT[target] + '%'})</b></div></div></div><div class="gap"></div>
          ${maxed ? `<div class="card good">${t('err.max_up')}</div>` : `<div class="sub">${t('ui.rate')}</div><div class="ratebar ${rate >= 70 ? '' : rate >= 35 ? 'mid' : 'low'}"><i style="width:${rate}%"></i><b>${rate}%${this.useBook ? ` (${base}% +${BOOK_BONUS})` : ''}</b></div>
          <div class="ratetable">${tbl}</div><div class="muted" style="margin-top:6px">${t('ui.onFail')}: ${destroys ? `<span class="bad">${t('ui.failDestroy')}</span>` : `<span class="good">${t('ui.failKeep')}</span>`}</div>
          <div class="sub">${t('ui.cost')}</div><div class="row"><span class="chip ${okG ? 'need-ok' : 'need-no'}">${icon('akce')}${num(cost.gold)} / ${num(m.gold)}</span><span class="chip ${okO ? 'need-ok' : 'need-no'}">${icon('ore')}${cost.ore} / ${m.bag.ore}</span></div>
          <div class="checks"><label><input type="checkbox" data-chk="book" ${this.useBook ? 'checked' : ''} ${m.bag.book ? '' : 'disabled'}> ${icon('book')} ${t('ui.useBook')} <span class="chip">×${m.bag.book}</span></label>
          <label><input type="checkbox" data-chk="charm" ${this.useCharm ? 'checked' : ''} ${m.bag.charm && destroys ? '' : 'disabled'}> ${icon('charm')} ${t('ui.useCharm')} <span class="chip">×${m.bag.charm}</span></label></div>
          <div class="gap"></div><button class="btn primary" style="font-size:19px;padding:10px 30px;width:100%" data-act="upgrade" ${can ? '' : 'disabled'}>${icon('weapon')} ${t('ui.upgrade')} +${target}</button>`}
          ${this.lastResult ? `<div class="result ${this.lastResult.cls}">${this.lastResult.text}</div>` : ''}`;
      }
    } else if (this.smithTab === 'reroll') {
      if (!sel) right = `<div class="card muted">${t('ui.chooseItem')}</div>`;
      else {
        const lines = [...(sel.base ? [{ k: sel.base.k, v: sel.base.v, line: 'base' as const }] : []), ...sel.ench.map((e, i) => ({ k: e.k, v: e.v, line: i as number | 'base' }))];
        const keysFor = (line: number | 'base') => (line === 'base' ? BASE_ENCH_POOL[sel!.slot] : ENCH_KEYS).filter((k) => ![sel!.base?.k, ...sel!.ench.map((e) => e.k)].includes(k));
        right = `<div class="bigitem">${itemCell(sel)}<div class="grow"><div class="nm" style="color:${TIER_COLORS[sel.tier]}">${esc(itemName(sel))} ${sel.up ? '+' + sel.up : ''}</div><div class="muted">${t('rr.n', { n: sel.rr ?? 0 })}</div></div></div><div class="card hint-card">${t('rr.help')}</div>`
          + lines.map((l) => { const rc = rerollCost(sel!, l.line === 'base', false), tc = rerollCost(sel!, l.line === 'base', true); const opts = keysFor(l.line).map((k) => `<option value="${k}">${t('ench.' + k)}</option>`).join('');
            return `<div class="card rr-row"><div class="grow">${l.line === 'base' ? '◆ ' + t('ui.baseEnch') + ': ' : '✦ '}<b>${t('ench.' + l.k)} +${l.v}%</b></div><button class="btn small" data-act="rr" data-line="${l.line}" ${m.gold >= rc ? '' : 'disabled'}>${t('rr.random')} ${icon('akce')}${num(rc)}</button><select class="rrsel" data-sel="${l.line}">${opts}</select><button class="btn small primary" data-act="rrt" data-line="${l.line}" ${m.gold >= tc ? '' : 'disabled'}>${t('rr.pick')} ${icon('akce')}${num(tc)}</button></div>`; }).join('')
          + (this.lastResult ? `<div class="result ${this.lastResult.cls}">${this.lastResult.text}</div>` : '');
      }
    } else {
      const rec = [
        { k: 'book', ic: 'book', need: { ore: CRAFT.book.ore }, gold: CRAFT.book.gold }, { k: 'charm', ic: 'charm', need: { ore: CRAFT.charm.ore, hide: CRAFT.charm.hide }, gold: CRAFT.charm.gold },
        ...SLOTS.map((s) => ({ k: 'gear:' + s, ic: s as string, need: { ore: CRAFT.gear.ore, hide: CRAFT.gear.hide, wood: CRAFT.gear.wood }, gold: CRAFT.gear.goldBase + CRAFT.gear.goldPerLevel * m.level })),
      ];
      right = rec.map((r) => {
        const ok = m.gold >= r.gold && Object.entries(r.need).every(([k, v]) => m.bag[k as MatKey] >= v);
        const nm = r.k.startsWith('gear:') ? `${t('ui.craft.gear')}: ${t('slot.' + r.k.slice(5))}` : t('ui.craft.' + r.k);
        return `<div class="recipe card"><div class="cell">${icon(r.ic)}</div><div><b>${nm}</b><div class="row" style="flex-wrap:wrap;margin-top:4px"><span class="chip ${m.gold >= r.gold ? 'need-ok' : 'need-no'}">${icon('akce')}${num(r.gold)}</span>${Object.entries(r.need).map(([k, v]) => `<span class="chip ${m.bag[k as MatKey] >= v ? 'need-ok' : 'need-no'}">${icon(k)}${v}</span>`).join('')}${r.k === 'charm' ? `<span class="chip">${t('bld.demir')} 2</span>` : ''}</div></div><button class="btn small green" data-act="craft" data-k="${r.k}" ${ok ? '' : 'disabled'}>${t('ui.craft')}</button></div>`;
      }).join('') + (this.lastResult ? `<div class="result ${this.lastResult.cls}">${this.lastResult.text}</div>` : '');
    }
    return this.shell(t('npc.demirci'), 'weapon', `<div class="tabs2"><div class="tab2 ${this.smithTab === 'up' ? 'on' : ''}" data-act="tab" data-v="up">${t('ui.upgrade')}</div><div class="tab2 ${this.smithTab === 'craft' ? 'on' : ''}" data-act="tab" data-v="craft">${t('ui.craft')}</div><div class="tab2 ${this.smithTab === 'reroll' ? 'on' : ''}" data-act="tab" data-v="reroll">${t('rr.tab')}</div></div>
      <div class="smith"><div>${this.smithTab === 'up' ? `<div class="sub">${t('ui.bag')}</div><div class="itemlist">${list}</div>${this.matChips()}` : this.matChips()}</div><div>${right}</div></div>`);
  }

  // ─── oba ───
  obaPanel() {
    const o = this.oba; const m = this.me; if (!o) return this.shell(t('oba.title'), 'oba', '…');
    const now = this.g.net.now(); const up = o.upgrade; const left = up ? up.finishAt - now : 0;
    const bld = (b: 'otag' | 'demir') => {
      const lv = o.levels[b]; const nx = o.nextCost[b]; const busy = !!up; const isUp = up?.b === b;
      const have = (k: MatKey, n: number) => `<span class="chip ${o.storage[k] >= n ? 'need-ok' : 'need-no'}">${icon(k)}${n}</span>`;
      return `<div class="card bld"><div class="bi">${icon(b === 'otag' ? 'oba' : 'weapon')}<b>${lv}</b></div><div><h4>${t('bld.' + b)}</h4><div class="muted">${t('bld.' + b + '.d')}</div>
        ${isUp ? `<div class="minibar"><i data-pg="${up!.finishAt - OBA.upgradeSec(up!.to) * 1000},${up!.finishAt}" style="width:${Math.max(2, Math.min(100, 100 - (left / (OBA.upgradeSec(up!.to) * 1000)) * 100))}%"></i></div><div class="muted">${t('oba.upgrading')} → ${up!.to} · ${t('oba.finish')}: <b data-cd="${up!.finishAt}">${fmtDur(left)}</b></div>`
          : nx ? `<div class="row" style="flex-wrap:wrap;margin-top:6px"><span class="chip ${m.gold >= nx.gold ? 'need-ok' : 'need-no'}">${icon('akce')}${num(nx.gold)}</span>${have('ore', nx.ore)}${have('hide', nx.hide)}${have('wood', nx.wood)}<span class="chip">${fmtDur(nx.sec * 1000)}</span><button class="btn small primary" data-act="build" data-b="${b}" ${busy || m.gold < nx.gold ? 'disabled' : ''}>${t('oba.build')} → ${lv + 1}</button></div>`
            : `<div class="chip" style="margin-top:6px">${t('oba.maxed')}</div>`}</div></div>`;
    };
    const stepper = (k: MatKey) => `<div class="row"><span class="chip" style="width:130px">${icon(k)}${t('mat.' + k)}</span><span class="muted" style="width:56px">×${m.bag[k]}</span><div class="stepper"><button data-act="dn" data-k="${k}">−</button><span>${this.donate[k]}</span><button data-act="up" data-k="${k}">+</button><button data-act="max" data-k="${k}" style="width:auto;padding:0 6px">max</button></div></div>`;
    const pend = o.pending; const hasPend = pend.ore + pend.hide + pend.wood > 0;
    const comps = m.companions.map((c) => {
      const exp = m.expeditions.find((e) => e.compId === c.id); const done = exp && now >= exp.endAt; const rem = exp ? exp.endAt - now : 0;
      const sends = exp ? (done ? `<button class="btn small green" data-act="collect" data-id="${exp.id}">${t('oba.collectExp')}</button> <span class="good">${t('oba.ready')}</span>` : `<div class="grow"><div class="minibar"><i data-pg="${exp.startAt},${exp.endAt}" style="width:${Math.min(100, ((now - exp.startAt) / (exp.endAt - exp.startAt)) * 100)}%"></i></div><span class="muted">${t('oba.returns')}: <b data-cd="${exp.endAt}">${fmtDur(rem)}</b></span></div>`)
        : `${EXPEDITION_HOURS.map((h) => `<button class="btn small" data-act="send" data-id="${c.id}" data-h="${h}">${t('oba.hours', { n: h })}</button>`).join('')}`;
      return `<div class="card comp ${c.cls}"><div class="av">${c.name[0]}</div><div><h4>${esc(c.name)} <span class="muted">${t('ccls.' + c.cls)} · ${t('ui.level')} ${c.level}</span></h4><div class="row" style="flex-wrap:wrap;gap:4px">${c.traits.map((tr) => `<span class="chip" title="${t('trait.' + tr + '.d')}">${t('trait.' + tr)}</span>`).join('')}</div><div class="sends">${sends}</div></div></div>`;
    }).join('');
    const res = this.expResult ? `<div class="result ok full" style="grid-column:1/-1">${t('oba.loot')}: +${num(this.expResult.gold)} ${icon('akce')} ${Object.entries(this.expResult.mats).map(([k, v]) => `+${v} ${icon(k)}`).join(' ')} ${this.expResult.frag ? `+${this.expResult.frag} ${icon('frag')}` : ''} ${this.expResult.items.map((it) => `<span style="color:${TIER_COLORS[it.tier]}">${esc(itemName(it))}</span>`).join(', ')}</div>` : '';
    return this.shell(`${esc(o.name)}`, 'oba', `<div class="oba"><div class="full row muted"><span>${t('oba.npc')}: <b>${esc(o.npc)}</b></span><span>${t('oba.members')}: <b>${o.members}/${o.memberCap}</b></span><span class="grow"></span><span class="chip">${icon('swords')} ${t('ui.points')}: ${num(o.points)}</span></div><div class="full muted">${t('oba.novice', { n: o.maxLevel })}</div>
      <div><div class="sub">${t('oba.title')}</div>${bld('otag')}<div class="gap"></div>${bld('demir')}
      <div class="sub">${t('oba.storage')}</div><div class="card"><div class="row" style="flex-wrap:wrap">${(['ore', 'hide', 'wood'] as MatKey[]).map((k) => `<span class="chip">${icon(k)}${num(o.storage[k])}</span>`).join('')}</div><div class="muted" style="margin:6px 0">${t('oba.donate.d')}</div>${(['ore', 'hide', 'wood'] as MatKey[]).map(stepper).join('')}<div class="gap"></div><button class="btn small primary" data-act="donate" ${this.donate.ore + this.donate.hide + this.donate.wood > 0 ? '' : 'disabled'}>${t('oba.donate')}</button></div>
      <div class="sub">${t('oba.prod')}</div><div class="card"><div class="muted">${(['ore', 'hide', 'wood'] as MatKey[]).map((k) => `${icon(k)} ${o.rate[k]}${t('oba.perHour')}`).join(' · ')}</div><div class="muted">${t('oba.cap', { n: o.capHours })} · ${t('oba.share')}: <b>${(o.share * 100).toFixed(0)}%</b></div>
      <div class="row" style="margin-top:6px"><span class="chip">${t('oba.pending')}: ${icon('ore')}${pend.ore} ${icon('hide')}${pend.hide} ${icon('wood')}${pend.wood}</span><button class="btn small green" data-act="claim" ${hasPend ? '' : 'disabled'}>${t('oba.collect')}</button></div></div></div>
      <div><div class="sub">${t('oba.companions')} <span class="muted">(${t('oba.slots')}: ${m.expeditions.length}/${o.slots})</span></div>${comps}</div>${res}</div>`, 'wide');
  }

  // ─── Ak Sakal ───
  elder() {
    const m = this.me; const step = m.tut.step;
    const steps = TUTORIAL_STEPS.map((k, i) => `<div class="tutstep ${i < step ? 'done' : i === step ? 'cur' : ''}"><div class="cb">${i < step ? '✓' : ''}</div><span>${t('tut.' + i)}${i === step ? ` <b>(${m.tut.prog}/${TUTORIAL_TARGET[k]})</b>` : ''}</span></div>`).join('');
    return this.shell(t('npc.aksakal'), 'stele', `<div class="elder"><div class="face">${ELDER_SVG}</div><div><div class="bubble">${t('elder.hello')}<br><br>${t('elder.tip1')}<br>${t('elder.tip2')}<br>${t('elder.tip3')}<br>${t('elder.tip4')}</div><div class="sub">${t('ui.tut')}</div>${steps}${step >= 5 ? `<div class="good" style="margin-top:6px">${t('tut.end')}</div>` : ''}
      ${m.clues.some((c) => c.startsWith('elder.')) ? `<div class="sub">${t('thread.elder')}</div>${m.clues.filter((c) => c.startsWith('elder.')).sort().map((c) => `<div class="card" style="margin-bottom:6px;font-style:italic">${t(c)}</div>`).join('')}` : ''}</div></div>`);
  }

  // ─── kapı taşı ───
  gatePanel() {
    const m = this.me; const reg = regionAt(this.g.pos.x, this.g.pos.z); const links = reg ? GATE_LINKS[reg.id] ?? [] : [];
    const card = (id: MapId) => {
      const d = MAPS[id]; const low = m.level < d.minLv; const high = m.level > d.maxLv;
      const why = low ? t('err.level_low', { lvl: d.minLv }) : high ? t('err.level_high', { lvl: d.maxLv }) : '';
      return `<div class="card gatecard" data-map="${id}"><div class="gt"><b>${t('map.' + id)}</b> <span class="muted">${t('map.lv', { a: d.lv[0], b: d.lv[1] })}</span></div><div class="muted">${t('map.' + id + '.d')}</div>
        <div class="ln"><span>${t('map.pvp')}</span><b>${t('map.pvp.' + d.pvp)}</b></div><div class="ln"><span>${t('map.entry')}</span><b>${d.minLv}–${d.maxLv > 90 ? '∞' : d.maxLv}</b></div>
        <button class="btn ${why ? '' : 'primary'}" data-act="travel" data-v="${id}" ${why ? 'disabled' : ''}>${why || t('map.go')}</button></div>`;
    };
    const dun = reg ? GATE_DUNGEONS[reg.id] ?? [] : []; const now = this.g.net.now(); const dn = m.dun;
    const dcard = (id: MapId) => {
      const def = DUNGEONS[id]!; const left = dn.left[id] ?? 0; const low = m.level < def.minLv; const open = dn.open[id]; const mine = dn.lobby?.d === id;
      const why = low ? t('err.level_low', { lvl: def.minLv }) : left <= 0 ? t('err.dun_daily') : m.gold < def.fee ? t('err.no_gold') : dn.lobby ? t('err.dun_in_lobby') : '';
      return `<div class="card gatecard" data-dun="${id}"><div class="gt"><b>${t('map.' + id)}</b> <span class="muted">${t('map.lv', { a: MAPS[id].lv[0], b: MAPS[id].lv[1] })}</span></div><div class="muted">${t('map.' + id + '.d')}</div>
        <div class="ln"><span>${t('dun.fee')}</span><b>${num(def.fee)}</b></div><div class="ln"><span>${t('dun.today')}</span><b>${left}/${def.daily}</b></div><div class="ln"><span>${t('dun.clears')}</span><b>${dn.clears[id] ?? 0}</b></div>
        <div class="ln"><span>${t('dun.limit')}</span><b>${Math.round(def.limitSec / 60)} ${t('dun.min')} · ${t('dun.party.max', { n: def.partyMax })}</b></div>
        ${open ? `<div class="dl">${t('dun.open', { n: open.n, s: Math.max(0, Math.ceil((open.at - now) / 1000)) })}</div>` : ''}
        <div class="row2">${mine ? `<button class="btn" data-act="dunleave">${t('dun.cancel')}</button>` : open ? `<button class="btn ${why ? '' : 'primary'}" data-act="dunenter" data-v="${id}" ${why ? 'disabled' : ''}>${why || t('dun.join')}</button>` : `<button class="btn ${why ? '' : 'primary'}" data-act="dunenter" data-v="${id}" ${why ? 'disabled' : ''}>${why || t('dun.party.open', { s: def.lobbySec })}</button><button class="btn" data-act="dunenter" data-v="${id}" data-solo="1" ${why ? 'disabled' : ''}>${t('dun.solo')}</button>`}</div></div>`;
    };
    return this.shell(t('npc.gate'), 'stele', `<div class="muted" style="margin-bottom:8px">${t('map.gate.hint')}</div>${links.map((l) => card(l)).join('')}${dun.length ? `<div class="sub">${t('dun.title')}</div>${dun.map((l) => dcard(l)).join('')}` : ''}`);
  }

  // ─── yazıtlar ───
  /** Kodeks: gizemin beş ipliği + "Mühürün Dışı". Yazıt kartlarının sınıfları (.stele-card/.locked) e2e testleriyle uyumludur. */
  inscr() {
    const m = this.me; const i = m.inscr; const th = this.codexTab; const own = (x: Thread) => m.clues.filter((c) => c.startsWith(x + '.')).length;
    const cnt = (x: Thread) => (x === 'insc' ? i.unlocked : own(x));
    const total = THREADS.reduce((n, x) => n + THREAD_SIZE[x], 0); const found = THREADS.reduce((n, x) => n + cnt(x), 0);
    const tabs = THREADS.map((x) => `<div class="tab2 ${x === th ? 'on' : ''}" data-act="cx" data-v="${x}">${t('thread.' + x)} <small>${cnt(x)}/${THREAD_SIZE[x]}</small></div>`).join('');
    const known = (n: number) => (th === 'insc' ? n <= i.unlocked : m.clues.includes(`${th}.${n}`));
    const rom = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    const cards = Array.from({ length: THREAD_SIZE[th] }, (_, k) => {
      const n = k + 1; const ok = known(n);
      const label = th === 'insc' ? `${t('thread.insc')} ${rom[k]} <span class="muted">(${num(INSCRIPTIONS[k])} ${icon('frag')})</span>` : `${t('thread.' + th)} ${rom[k]}`;
      return `<div class="card stele-card ${ok ? '' : 'locked'}"><div class="sg">${ok ? rom[k] : '?'}</div><div><b>${label}</b><div style="margin-top:4px;font-size:15px;font-style:italic">${ok ? t(`${th}.${n}`) : t('ui.locked.clue')}</div></div></div>`;
    }).join('');
    const prev = [0, ...i.thresholds].filter((x) => x <= i.frags).pop() ?? 0; const next = i.thresholds.find((x) => i.frags < x) ?? i.thresholds[i.thresholds.length - 1];
    const pct = i.unlocked >= i.thresholds.length ? 100 : Math.round(((i.frags - prev) / Math.max(1, next - prev)) * 100);
    const fragBar = th === 'insc' ? `<div class="sub">${t('insc.progress')}</div><div class="ratebar mid"><i style="width:${pct}%"></i><b>${num(i.frags)} / ${next}</b></div><div class="row" style="margin:8px 0"><span class="chip">${icon('frag')} ${t('mat.frag')}: ${m.bag.frag}</span></div>` : '';
    const titles = titlesOf(m.clues).map((x) => `<span class="chip">★ ${t(x)}</span>`).join(' ');
    return this.shell(t('ui.codex'), 'stele', `<div class="insc codex"><div class="row"><div class="grow muted">${t('ui.codex.sub')}</div><span class="chip">${found}/${total} ${t('ui.clues')}</span></div>
      ${titles ? `<div class="row" style="margin:6px 0;flex-wrap:wrap"><b>${t('ui.titles')}:</b> ${titles}</div>` : ''}<div class="tabs2" style="flex-wrap:wrap;margin-top:8px">${tabs}</div>
      <div class="card hint-card">${t('thread.' + th + '.hint')}</div>${fragBar}<div style="margin-top:8px">${cards}</div></div>`);
  }

  /** Yönetici paneli: yalnızca rolü admin olan hesapta açılır; her komut sunucuda yeniden doğrulanır. */
  gm() {
    const B: [string, string][] = [['Sv 10', 'level 10'], ['Sv 25', 'level 25'], ['Sv 50', 'level 50'], ['Kit +9', 'kit +9'], ['İyileş', 'heal'], ['Ölümsüz', 'god'], ['Bekleme sıfırla', 'cdreset'], ['Tüm yetenek P', 'maxskills'],
      ['+10.000 akçe', 'gold 10000'], ['+100 cevher', 'give ore 100'], ['+20 kitap', 'give book 20'], ['+20 tılsım', 'give charm 20'], ['+100 yazıt', 'frag 100'], ['Oba: hepsini bitir', 'oba'],
      ['Zaman +1 sa', 'time 1'], ['Zaman +12 sa', 'time 12'], ['Çatlak aç', 'rift'], ['Çatlağa git', 'tp rift'], ['Yurda git', 'tp hub'], ['Taş 1’e git', 'tp stone 1'], ['Boss 1’e git', 'tp boss 1'], ['Boss 3’e git', 'tp boss 3'], ['Boss 5’e git', 'tp boss 5'],
      ['Çakal ×10', 'spawn cakal 10 10'], ['Albastı ×6', 'spawn albasti 14 6'], ['Bekçi', 'spawn bekci 20 1'], ['Hepsini öldür', 'killall'], ['Kukla', 'dummy'], ['DPS', 'dps'],
      ['Tüm ipuçları', 'clue hepsi'], ['Rüya', 'dream'], ['Rütbe -3', 'rank -3'], ['Dinlenmiş', 'rested'], ['İstatistik', 'stats'], ['TTK (sv20)', 'ttk 20'], ['Ekonomi', 'econ'], ['Yardım', 'help']];
    return this.shell(t('gm.title'), 'skull', `<div style="min-width:700px"><div class="gmgrid">${B.map(([l, c]) => `<button class="btn small" data-act="gm" data-line="${c}" title="/gm ${c}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><input id="gmline" class="gminput" placeholder="${t('gm.cmd')}" value="${esc(this.gmLine)}" autocomplete="off" /><button class="btn primary small" data-act="gmrun">${t('gm.send')}</button></div>
      <div class="sub">${t('gm.out')}</div><pre class="gmout">${esc(this.gmOut.slice(-14).join('\n'))}</pre></div>`);
  }

  settings() {
    const q = this.g.gs.quality; const a = this.g.audio;
    return this.shell(t('ui.settings'), 'skills', `<div style="min-width:460px"><div class="setrow"><span class="l">${t('ui.lang')}</span><div class="seg"><button data-act="lang" data-v="tr" class="${getLang() === 'tr' ? 'on' : ''}">Türkçe</button><button data-act="lang" data-v="en" class="${getLang() === 'en' ? 'on' : ''}">English</button></div></div>
      <div class="setrow"><span class="l">${t('ui.sound')}</span><div class="seg"><button data-act="snd" data-v="1" class="${a.muted ? '' : 'on'}">${icon('sound')} On</button><button data-act="snd" data-v="0" class="${a.muted ? 'on' : ''}">${icon('mute')} Off</button></div></div>
      <div class="setrow"><span class="l">${t('ui.quality')}</span><div class="seg">${(['high', 'medium', 'low'] as const).map((k) => `<button data-act="q" data-v="${k}" class="${q === k ? 'on' : ''}">${t('ui.q.' + k)}</button>`).join('')}</div></div>
      <div class="gap"></div>${this.helpBody()}</div>`);
  }
  helpBody() { return `<div class="sub">${t('help.title')}</div><div class="helpgrid"><div>${t('help.move')}</div><div>${t('help.fight')}</div><div>${t('help.panels')}</div><div>${t('help.zones')}</div></div>`; }
  help() { return this.shell(t('ui.help'), 'skills', `<div style="min-width:480px;max-width:620px">${this.helpBody()}</div>`); }

  // ─── etkileşimler ───
  async quick(id: string) { const it = this.me.items.find((i) => i.id === id); if (it) await this.act('equip', { id }); }
  async act(op: Parameters<Game['net']['rpc']>[0], a: unknown = {}) {
    const r = await this.g.net.rpc(op, a);
    if (!r.ok) { this.g.ui.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.g.audio.sfx('err'); }
    return r;
  }
  async onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('[data-act],[data-item]') as HTMLElement | null; if (!el) return;
    const act = el.dataset.act;
    if (!act && el.dataset.item) { // çantada eşya seç / kuşanılmışı çıkar
      const id = el.dataset.item; const eq = SLOTS.find((s) => this.me.equip[s]?.id === id);
      if (this.open === 'inv') { if (eq) { await this.act('unequip', { slot: eq }); } else { this.selBag = id; this.render(true); } }
      return;
    }
    const d = el.dataset;
    switch (act) {
      case 'close': this.close(); break;
      case 'dunenter': { const r = await this.g.net.rpc('dungeon.enter', { d: d.v, solo: !!d.solo }); if (!r.ok) { this.g.ui.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.g.ui.sfx('err'); } else { this.close(); } break; }
      case 'dunleave': { await this.g.net.rpc('dungeon.leave'); this.render(true); break; }
      case 'travel': { const r = await this.g.net.rpc('travel', { to: d.v }); if (!r.ok) { this.g.ui.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.g.ui.sfx('err'); } else this.close(); break; }
      case 'cx': this.codexTab = d.v as Thread; break;
      case 'mktab': this.mkTab = d.v as 'browse' | 'mine'; await this.loadMarket(); break;
      case 'mkslot': this.mkSlot = d.v ?? ''; await this.loadMarket(); break;
      case 'mksort': this.mkSort = this.mkSort === 'deal' ? 'price' : this.mkSort === 'price' ? 'new' : 'deal'; await this.loadMarket(); break;
      case 'mkfit': this.mkMine2 = !this.mkMine2; await this.loadMarket(); break;
      case 'mkbuy': { const r = await this.act('market.buy', { id: Number(d.id) }); if (r.ok) { this.g.audio.sfx('upok'); this.lastResult = null; } await this.loadMarket(); break; }
      case 'mkcancel': { await this.act('market.cancel', { id: Number(d.id) }); await this.loadMarket(); break; }
      case 'mkclaim': { await this.act('market.claim'); await this.loadMarket(); break; }
      case 'mkpick': { this.mkSel = d.id!; const it = this.me.items.find((i) => i.id === d.id); this.mkPrice = it ? String(Math.round(marketRef(it))) : ''; break; }
      case 'mklist': { const v = (this.el.querySelector('#mkprice') as HTMLInputElement | null)?.value ?? this.mkPrice; const r = await this.act('market.list', { id: this.mkSel, price: Number(String(v).replace(/\D/g, '')) }); if (r.ok) { this.mkSel = ''; this.mkPrice = ''; this.g.audio.sfx('upok'); } await this.loadMarket(); break; }
      case 'gm': await this.runGm(d.line!); return;
      case 'gmrun': await this.runGm(this.gmLine); return;
      case 'equip': await this.act('equip', { id: d.id }); this.selBag = ''; this.g.ui.sfx('ui'); break;
      case 'sell': { const r = await this.act('sell', { id: d.id }); if (r.ok) { this.g.ui.toast(t('sold', { n: (r.data as { price: number }).price }), 'good'); this.g.audio.sfx('coin'); this.selBag = ''; } break; }
      case 'toUp': this.selUp = d.id!; this.smithTab = 'up'; await this.show('smith'); break;
      case 'spec': { const r = await this.act('spec', { choice: d.v }); if (r.ok) { this.g.audio.sfx('levelup'); } break; }
      case 'rank': { const r = await this.act('rankSkill', { slot: Number(d.i) }); if (r.ok) this.g.audio.sfx('upok'); break; }
      case 'tab': this.smithTab = d.v as 'up' | 'craft' | 'reroll'; this.lastResult = null; break;
      case 'rr': case 'rrt': { const line = d.line === 'base' ? 'base' : Number(d.line); const key = act === 'rrt' ? (this.el.querySelector<HTMLSelectElement>(`select[data-sel="${d.line}"]`)?.value ?? '') : undefined; const r = await this.act('reroll', { id: this.selUp, line, key }); if (r.ok) { const x = r.data as { line: { k: string; v: number }; cost: number }; this.lastResult = { cls: 'ok', text: `${t('ench.' + x.line.k)} +${x.line.v}%` }; this.g.audio.sfx('upok'); } break; }
      case 'pickUp': this.selUp = d.id!; this.lastResult = null; break;
      case 'upgrade': {
        const sel = this.allItems().find((i) => i.id === this.selUp); if (!sel || this.busy) return; this.busy = true; this.render(true);
        this.g.audio.sfx('anvil');
        const r = await this.act('upgrade', { id: sel.id, book: this.useBook, charm: this.useCharm }); this.busy = false;
        if (r.ok) {
          const x = r.data as { success: boolean; destroyed: boolean; target: number; protectedByCharm: boolean };
          if (x.success) { this.lastResult = { cls: 'ok', text: '✦ ' + t('up.success', { n: x.target }) }; this.g.audio.sfx('upok'); this.g.fx.levelUp(this.g.pos.x, this.g.pos.z); this.g.fx.burst('spark', this.g.pos.x, 2, this.g.pos.z, 30); }
          else if (x.destroyed) { this.lastResult = { cls: 'bad', text: '✖ ' + t('up.destroyed') }; this.g.audio.sfx('destroy'); this.selUp = ''; this.g.fx.shake = 0.5; }
          else { this.lastResult = { cls: 'fail', text: (x.protectedByCharm ? '🛡 ' + t('up.failCharm') : t('up.fail')) }; this.g.audio.sfx('upfail'); }
          this.useBook = this.useBook && this.me.bag.book > 1; this.useCharm = this.useCharm && this.me.bag.charm > 1;
        }
        break;
      }
      case 'craft': { const k = d.k!; const r = await this.act('craft', k.startsWith('gear:') ? { kind: 'gear', slot: k.slice(5) } : { kind: k }); if (r.ok) { this.lastResult = { cls: 'ok', text: t('craft.ok') }; this.g.audio.sfx('upok'); } break; }
      case 'dn': this.donate[d.k as MatKey] = Math.max(0, this.donate[d.k as MatKey] - 1); break;
      case 'up': this.donate[d.k as MatKey] = Math.min(this.me.bag[d.k as MatKey], this.donate[d.k as MatKey] + 1); break;
      case 'max': this.donate[d.k as MatKey] = this.me.bag[d.k as MatKey]; break;
      case 'donate': { const r = await this.act('oba.donate', this.donate); if (r.ok) { this.oba = r.data as ObaInfo; this.donate = { ore: 0, hide: 0, wood: 0 }; this.g.audio.sfx('coin'); } break; }
      case 'claim': { const r = await this.act('oba.claim'); if (r.ok) { this.oba = (r.data as { info: ObaInfo }).info; this.g.audio.sfx('loot'); } break; }
      case 'build': { const r = await this.act('oba.build', { b: d.b }); if (r.ok) { this.oba = r.data as ObaInfo; this.g.audio.sfx('upok'); } else await this.refreshOba(); break; }
      case 'send': { const r = await this.act('oba.dispatch', { compId: d.id, hours: Number(d.h) }); if (r.ok) { this.oba = r.data as ObaInfo; this.g.audio.sfx('ui'); this.expResult = null; } break; }
      case 'collect': { const r = await this.act('oba.collect', { expId: d.id }); if (r.ok) { const x = r.data as { result: ExpeditionResult; info: ObaInfo }; this.oba = x.info; this.expResult = x.result; this.g.audio.sfx('rare'); } break; }
      case 'lang': setLang(d.v as 'tr' | 'en'); this.g.refreshNpcNames(); this.g.ui.relocalize(); await this.g.net.rpc('lang', { lang: d.v }); break;
      case 'snd': this.g.audio.setMuted(d.v === '0'); this.g.audio.start(); break;
      case 'q': this.g.setQuality(d.v as 'high' | 'medium' | 'low'); try { localStorage.setItem('kut.q', d.v!); } catch { /* */ } break;
    }
    if (act === 'send' || act === 'collect' || act === 'build') await this.refreshOba();
    this.render(true);
  }
  onChange(e: Event) {
    const el = e.target as HTMLInputElement; if (el.dataset.chk === 'book') this.useBook = el.checked; if (el.dataset.chk === 'charm') this.useCharm = el.checked; this.render(true);
  }

  // ─── ipucu kutusu ───
  private hover(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest('[data-item],[data-skill],[data-mat],[data-slot]') as HTMLElement | null;
    if (!el || !this.me) { this.tipEl.style.display = 'none'; return; }
    let html = ''; let tc = '';
    if (el.dataset.item) {
      const id = el.dataset.item; const m = this.me; const it = m.items.find((i) => i.id === id) ?? SLOTS.map((s) => m.equip[s]).find((i) => i?.id === id); if (!it) return;
      const isEq = SLOTS.some((s) => m.equip[s]?.id === id); html = itemTip(it, isEq ? undefined : m.equip[it.slot]); tc = TIER_COLORS[it.tier];
    } else if (el.dataset.skill) { const i = Number(el.dataset.skill); const s = SKILLS[i]; if (!s) { this.tipEl.style.display = 'none'; return; } html = `<div class="tn" style="--tc:#ffe9a8">${t('skill.' + s.id)}</div><div class="ts">${t('ui.cd')} ${s.cd}${getLang() === 'tr' ? 'sn' : 's'}</div>${t('skill.' + s.id + '.d')}`; }
    else if (el.dataset.mat) { const k = el.dataset.mat; html = `<div class="tn" style="--tc:#ffe9a8">${t('mat.' + k)}</div>`; }
    else if (el.dataset.slot) { html = `<div class="tn" style="--tc:#ffe9a8">${t('slot.' + el.dataset.slot)}</div>`; }
    this.tipEl.innerHTML = html; this.tipEl.style.setProperty('--tc', tc || '#c8932a'); this.tipEl.style.borderColor = tc || '#c8932a'; this.tipEl.style.display = 'block'; this.moveTip(e);
  }
  private moveTip(e: MouseEvent) {
    if (this.tipEl.style.display === 'none') return; const w = this.tipEl.offsetWidth, h = this.tipEl.offsetHeight;
    let x = e.clientX + 16, y = e.clientY + 16; if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = innerHeight - h - 8; this.tipEl.style.left = x + 'px'; this.tipEl.style.top = y + 'px';
  }
}
