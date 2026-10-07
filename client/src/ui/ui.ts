import { COMBO, BOY_COLORS, HUB, HUB_PLAZA_R, HUB_R, HUB_WALL_R, gatePos, zoneAt, SKILLS, SKILL_RANK_LABEL, TUTORIAL_STEPS, TUTORIAL_TARGET, WORLD_R, MAX_LEVEL, type DmgKind } from '@shared/game';
import { huntQuest } from '@shared/hunt';
import { eraName } from '../chron';
import { genRuins } from '@shared/chronicle';
import { F, type ChatMsg, type Me } from '@shared/protocol';
import { ROAD_HALF, ROAD_LEN, genAllCamps, genBosses, genStones, worldObstacles } from '@shared/world';
import { MAPS, regionAt } from '@shared/maps';
import { LOOM_POS } from '@shared/costume';
import type { Game } from '../game/game';
import { getLang, hasKey, num, t } from '../i18n';
import { emblemSvg } from './emblems';
import { icon } from './icons';
import { Panels, type PanelName } from './panels';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
type ChatTab = 'all' | 'near' | 'boy' | 'oymak';

export class UI {
  root: HTMLElement; panels: Panels; e: Record<string, HTMLElement> = {}; chatTab: ChatTab = 'all'; questHtml = ''; chatLog: (ChatMsg & { at: number })[] = []; hudAcc = 0; mapAcc = 0; minimap!: HTMLCanvasElement; campList = genAllCamps(); bossList = genBosses();
  slots: HTMLElement[] = []; lastCd: boolean[] = [false, false, false, false, false, false]; mapStatic: HTMLCanvasElement | null = null; pendingDuel = ''; fpsAcc = 0;
  constructor(public g: Game, root: HTMLElement) {
    this.root = root; g.ui = this; this.build(); this.panels = new Panels(g, root);
  }
  sfx(n: string) { this.g.audio.sfx(n); }

  private build() {
    const r = this.root;
    r.insertAdjacentHTML('beforeend', `
      <div class="hud-tl leather" id="hudtl"><div class="portrait" id="portrait"></div><div class="lvl" id="lvl"></div><div class="nm"><span id="nm"></span><small id="spec"></small></div>
        <div class="bar hp" id="hpbar"><i></i><span></span></div><div class="bar xp" id="xpbar"><i class="rest"></i><i class="base"></i></div><div class="statusrow" id="tags"></div></div>
      <div class="hud-top"><div class="zonepill leather" id="zone"></div><button class="pvpbtn leather" id="pvpbtn" type="button"></button><div class="targetf leather" id="target"><div class="nm"><span></span><span></span></div><div class="bar hp"><i></i><span></span></div></div>
        <div class="dunbar leather" id="dunbar"><div class="t"><span></span><span></span></div><div class="sub2"></div><button class="btn" data-dunleave>×</button></div>
        <div class="riftbar leather" id="riftbar"><div class="t"><span></span><span></span></div><div class="bar"><i></i></div></div></div>
      <div class="hud-tr"><div class="minimap"><canvas id="mm" width="340" height="340"></canvas><div class="n">N</div></div>
        <div class="btnrow" id="btns"></div><div class="quest leather" id="quest"></div><div class="info" id="info"></div></div>
      <div class="skillbar leather" id="skillbar"></div><div class="kimizslot leather" id="kimizslot" title=""><span class="ic"></span><b>0</b><span class="cdt"></span><kbd>Q</kbd></div>
      <div class="chat" id="chat"><div class="tabs" id="ctabs"></div><div class="log" id="clog"></div><input id="cin" maxlength="140" autocomplete="off" /><div class="hint">${t('ui.chat.hint')}</div></div>
      <div class="prompt leather" id="prompt"></div><div class="toasts" id="toasts"></div><div class="compass" id="compass"><i></i></div>
      <div class="death" id="death"><div class="box felt"><h2>${t('ui.dead')}</h2><p id="deadp"></p><button class="btn primary" id="respawn" disabled></button></div></div>
      <div class="duelbox leather" id="duelbox"><div id="duelt"></div><div class="row"><button class="btn green small" id="duelyes"></button><button class="btn small" id="duelno">${t('ui.cancel')}</button></div></div>
      <div class="lorecard leather" id="lore"></div>
      <div class="dream" id="dream"><div class="snow"></div><div class="box"><div class="eye"></div><h3></h3><p></p><button class="btn primary" id="wake"></button></div></div>
      <div class="fpsbox" id="fps"></div>
      <div class="conn" id="conn"><div class="felt" style="padding:28px 40px;text-align:center"><h2 style="margin:0 0 8px;font-family:var(--f-head)" id="connt"></h2><button class="btn primary" onclick="location.reload()">OK</button></div></div>`);
    for (const id of ['hudtl', 'portrait', 'lvl', 'nm', 'spec', 'hpbar', 'xpbar', 'tags', 'zone', 'target', 'riftbar', 'btns', 'quest', 'info', 'skillbar', 'chat', 'clog', 'cin', 'ctabs', 'prompt', 'toasts', 'compass', 'death', 'deadp', 'respawn', 'duelbox', 'duelt', 'fps', 'conn', 'connt', 'duelyes', 'lore', 'dream', 'wake', 'pvpbtn', 'dunbar', 'kimizslot']) this.e[id] = r.querySelector('#' + id) as HTMLElement;
    this.minimap = r.querySelector('#mm') as HTMLCanvasElement;
    // yetenek çubuğu
    this.e.skillbar.innerHTML = `<div class="slot atk" data-skill="-1" title="Space"><span class="key">␣</span>${icon('swords')}</div>` + SKILLS.map((s, i) => `<div class="slot" data-i="${i}" data-skill="${i}"><span class="key">${i + 1}</span>${icon(s.id)}<span class="rk"></span><div class="cd"></div><span class="cdt"></span><div class="lk"></div></div>`).join('');
    this.e.skillbar.insertAdjacentHTML('beforeend', '<div class="combobadge" style="display:none"></div>'); this.slots = [...this.e.skillbar.querySelectorAll('.slot[data-i]')] as HTMLElement[];
    this.e.skillbar.addEventListener('click', (ev) => { const s = (ev.target as HTMLElement).closest('.slot[data-i]') as HTMLElement | null; if (s) this.g.useSkill(Number(s.dataset.i)); });
    // sağ üst düğmeler
    const btns: [string, PanelName, string, string][] = [['bag', 'inv', 'I', 'ui.inventory'], ['char', 'char', 'C', 'ui.character'], ['skills', 'skills', 'K', 'ui.skills'], ['oba', 'oba', 'O', 'ui.obaPanel'], ['stele', 'inscr', 'Y', 'ui.codex'], ['akce', 'market', 'P', 'mk.title'], ['globe', 'settings', '', 'ui.settings']];
    this.e.btns.innerHTML = btns.map(([ic, p, k, tt]) => `<button class="btn icon" data-p="${p}" title="${t(tt)}">${icon(ic)}${k ? `<span class="k">${k}</span>` : ''}<i class="dot"></i></button>`).join('');
    this.e.btns.addEventListener('click', (ev) => { const b = (ev.target as HTMLElement).closest('button[data-p]') as HTMLElement | null; if (b) this.open(b.dataset.p as PanelName); });
    // sohbet
    this.renderTabs();
    this.e.ctabs.addEventListener('click', (ev) => { const b = (ev.target as HTMLElement).closest('[data-t]') as HTMLElement | null; if (b) { this.chatTab = b.dataset.t as ChatTab; this.renderTabs(); this.renderChat(); } });
    this.e.cin.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { const v = (this.e.cin as HTMLInputElement).value.trim(); if (v) this.sendChat(v); this.endTyping(); }
      else if (ev.key === 'Escape') this.endTyping();
    });
    this.e.cin.addEventListener('blur', () => this.endTyping());
    this.e.respawn.addEventListener('click', () => { void this.g.respawn(); });
    this.e.quest.addEventListener('click', (ev) => { if ((ev.target as HTMLElement).closest('[data-huntskip]')) void this.g.net.rpc('hunt.skip'); });
    this.e.duelyes.addEventListener('click', async () => { await this.g.net.rpc('duelAccept'); this.e.duelbox.style.display = 'none'; });
    (this.e.duelbox.querySelector('#duelno') as HTMLElement).addEventListener('click', () => (this.e.duelbox.style.display = 'none'));
    this.e.pvpbtn.addEventListener('click', () => void this.togglePvp()); this.e.kimizslot.addEventListener('click', () => void this.useKimiz());
    this.e.dunbar.querySelector('[data-dunleave]')!.addEventListener('click', () => void this.g.net.rpc('dungeon.leave'));
    this.relocalize();
  }
  relocalize() {
    this.e.respawn.textContent = t('ui.respawn'); (this.e.duelyes as HTMLElement).textContent = t('ui.accept'); this.e.cin.setAttribute('placeholder', t('ui.chat.ph'));
    const h = this.root.querySelector('.death h2'); if (h) h.textContent = t('ui.dead'); const ch = this.root.querySelector('.chat .hint'); if (ch) ch.textContent = t('ui.chat.hint');
    this.renderTabs(); this.e.btns.querySelectorAll('button[data-p]').forEach((b, i) => { const ks = ['ui.inventory', 'ui.character', 'ui.skills', 'ui.obaPanel', 'ui.codex', 'ui.settings']; (b as HTMLElement).title = t(ks[i]); });
    this.panels?.refresh(); this.hudAcc = 1; if (this.g.me) this.hud(0);
  }
  renderTabs() { const tabs: [ChatTab, string][] = [['all', getLang() === 'tr' ? 'Hepsi' : 'All'], ['near', t('ui.chat.near')], ['boy', t('ui.chat.boy')], ['oymak', t('ui.chat.oymak')]]; this.e.ctabs.innerHTML = tabs.map(([k, l]) => `<div class="tab ${this.chatTab === k ? 'on' : ''}" data-t="${k}">${l}</div>`).join(''); }
  qualityChanged() { this.toast(getLang() === 'tr' ? 'Grafik kalitesi düşürüldü' : 'Graphics quality lowered', 'warn'); this.panels.refresh(); }

  // ───────── girdi ─────────
  key(k: string, e: KeyboardEvent) {
    if (k === 'enter') { e.preventDefault(); this.startTyping(); return; }
    if (k === 'f2' && this.g.me?.role === 'admin') { e.preventDefault(); this.panels.toggle('gm'); return; }
    if (k === 'escape') { if (this.panels.isOpen()) this.panels.close(); return; }
    const map: Record<string, PanelName> = { i: 'inv', c: 'char', k: 'skills', o: 'oba', y: 'inscr', p: 'market', h: 'help', b: 'inv' };
    if (map[k]) { e.preventDefault(); this.open(map[k], true); }
    if (k === 'q') { void this.useKimiz(); }
    if (k === 'm') { this.g.audio.setMuted(!this.g.audio.muted); this.g.audio.start(); }
  }
  open(p: PanelName | 'elder' | 'smith' | 'oba' | 'inscr' | 'loom', toggle = false) {
    if (p === 'oba' || p === 'smith' || p === 'elder' || p === 'inscr') {
      // etkileşimli paneller NPC/binaya yakınlık ister; uzaktaysa yalnızca bilgi gösterilir
    }
    if (toggle) this.panels.toggle(p as PanelName); else void this.panels.show(p as PanelName);
  }
  /** Yeni bölgeye girince adını ve kurallarını göster (ışık: oyuncu PvP/seviye kuralını giriş anında okur) */
  regionChanged(id: string) {
    const r = regionAt(this.g.pos.x, this.g.pos.z); if (!r) return; const d = MAPS[r.map];
    this.toast(`${t('map.' + r.map)} — ${t('map.pvp')}: ${t('map.pvp.' + d.pvp)}`, '');
    void id;
  }
  /** Zindan seferi ya da parti toplama çubuğu */
  dunBar() {
    const b = this.e.dunbar; const dn = this.g.me.dun; const now = this.g.net.now(); const sp = b.querySelectorAll('.t span'); const sub = b.querySelector('.sub2') as HTMLElement;
    if (dn?.run) {
      const r = dn.run; b.style.display = 'block'; sp[0].textContent = t('map.' + r.d);
      const won = r.state === 'won'; const lost = r.state === 'lost'; const left = Math.max(0, ((won || lost ? r.exitAt : r.endAt) - now) / 1000);
      sp[1].textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      sub.textContent = won ? t('dun.won') : lost ? t('dun.lost') : r.state === 'boss' ? t('dun.boss') : r.state === 'gap' && r.wave === 0 ? t('dun.prepare') : t('dun.wave', { n: r.wave, of: r.waves });
    } else if (dn?.lobby) {
      b.style.display = 'block'; sp[0].textContent = t('dun.lobby', { m: t('map.' + dn.lobby.d) }); sp[1].textContent = `${Math.max(0, Math.ceil((dn.lobby.at - now) / 1000))}s`; sub.textContent = t('dun.party', { n: dn.lobby.n });
    } else b.style.display = 'none';
  }
  /** Kımız (Q): zamana yayılmış can yeniler; bekleme ve stok sunucuda doğrulanır */
  async useKimiz() {
    const r = await this.g.net.rpc('kimiz.use');
    if (!r.ok) { this.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.sfx('err'); } else this.sfx('ui');
  }
  kimizHud() {
    const el = this.e.kimizslot; const m = this.g.me; if (!el || !m) return; const n = m.kimiz ?? 0; const left = Math.max(0, (m.kimizAt - this.g.net.now()) / 1000);
    if (!el.firstElementChild?.innerHTML) (el.querySelector('.ic') as HTMLElement).innerHTML = icon('kimiz');
    (el.querySelector('b') as HTMLElement).textContent = String(n); (el.querySelector('.cdt') as HTMLElement).textContent = left > 0 ? String(Math.ceil(left)) : '';
    el.classList.toggle('empty', n < 1); el.classList.toggle('cd', left > 0); el.title = t('kimiz.tip');
  }
  /** PvP bayrağını değiştir (HUD düğmesi ve /pvp komutu) */
  async togglePvp() {
    const r = await this.g.net.rpc('pvp', { on: !this.g.me.pvp });
    if (!r.ok) { this.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.sfx('err'); }
  }
  startTyping() { this.g.typing = true; this.e.chat.classList.add('typing'); (this.e.cin as HTMLInputElement).value = ''; this.e.cin.focus(); }
  endTyping() { this.g.typing = false; this.e.chat.classList.remove('typing'); (this.e.cin as HTMLInputElement).blur(); this.g.canvas.focus(); }
  sendChat(v: string) {
    let ch: string = this.chatTab === 'all' ? 'near' : this.chatTab; let text = v; let to: string | undefined;
    if (v === '/gm' || v.startsWith('/gm ')) { void this.panels.runGm(v.slice(3).trim() || 'help').then(() => this.chat({ ch: 'sys', from: '', text: this.panels.gmOut[this.panels.gmOut.length - 1] ?? '' })); return; }
    if (v.startsWith('/duel ')) { void this.g.net.rpc('duel', { name: v.slice(6).trim() }).then((r) => { if (!r.ok) this.toast(t('err.' + (r.err ?? 'internal')), 'warn'); }); return; }
    if (v === '/pvp') { void this.togglePvp(); return; }
    if (v.startsWith('/w ')) { const m = /^\/w\s+(\S+)\s+(.+)$/.exec(v); if (m) { ch = 'whisper'; to = m[1]; text = m[2]; } }
    else if (v.startsWith('/b ')) { ch = 'boy'; text = v.slice(3); } else if (v.startsWith('/o ')) { ch = 'oymak'; text = v.slice(3); } else if (v.startsWith('/n ')) { ch = 'near'; text = v.slice(3); }
    this.g.net.chat(ch, text, to);
  }
  chat(c: ChatMsg) {
    if (c.key === 'sys.era') c = { ...c, p: { ...c.p, name: eraName(Number(c.p?.n ?? 0)) } };
    if (c.key === 'sys.clue' && c.p?.id) this.lore(String(c.p.id));
    this.chatLog.push({ ...c, at: Date.now() }); if (this.chatLog.length > 120) this.chatLog.shift(); this.renderChat();
    if (c.ch === 'sys' && c.key && hasKey(c.key)) {
      if (['sys.levelup', 'sys.spec_ready', 'sys.tut_done', 'sys.inscription', 'sys.era', 'sys.rift_closed', 'sys.rift_open'].includes(c.key)) this.toast(t(c.key, c.p), c.key === 'sys.rift_open' ? 'rift' : c.key === 'sys.levelup' ? 'lvl' : 'good');
      else if (['sys.pvp_on', 'sys.pvp_off', 'sys.cos_soon', 'sys.cos_expired', 'sys.rank_down', 'sys.xp_lost', 'sys.item_lost', 'sys.bag_full'].includes(c.key)) this.toast(t(c.key, c.p), 'warn');
    }
  }
  renderChat() {
    const log = this.e.clog; const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 12;
    const rows = this.chatLog.filter((m) => this.chatTab === 'all' || m.ch === 'sys' || m.ch === 'whisper' || m.ch === this.chatTab);
    log.innerHTML = rows.slice(-60).map((m) => {
      if (m.ch === 'sys') return `<div class="m sys ${m.key?.startsWith('err') ? 'err' : ''}">✦ ${esc(m.key ? t(m.key, m.p) : m.text)}</div>`;
      const label = m.ch === 'whisper' ? '✉' : m.ch === 'boy' ? '[' + t('ui.chat.boy') + ']' : m.ch === 'oymak' ? '[' + t('ui.chat.oymak') + ']' : '';
      return `<div class="m ${m.ch}"><span class="who">${label} ${esc(m.from)}:</span> ${esc(m.text)}</div>`;
    }).join('');
    if (stick) log.scrollTop = log.scrollHeight;
  }
  sysLocal(key: string, p?: Record<string, string | number>) { this.chat({ ch: 'sys', from: '', text: '', key, p }); }
  toast(text: string, kind = '') {
    const d = document.createElement('div'); d.className = 'toast leather ' + kind; d.textContent = text; this.e.toasts.appendChild(d); setTimeout(() => d.remove(), 3300);
    while (this.e.toasts.children.length > 4) this.e.toasts.firstElementChild?.remove();
  }
  private loreTimer = 0;
  /** Yeni bulunan ipucunu ekranın altında kart olarak gösterir. */
  lore(id: string) {
    const th = id.split('.')[0]; const el = this.e.lore; el.innerHTML = `<small>${t('thread.' + th)}</small>${t(id)}`; el.style.display = 'block'; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this.loreTimer); this.loreTimer = window.setTimeout(() => (el.style.display = 'none'), 9000); this.sfx('rare');
  }
  dreaming = false;
  /** Kurdun rüyası: tam ekran, yazı yazı belirir; "Uyan" ile kapanır ve ipucu kaydedilir. */
  dream(n: number) {
    if (this.dreaming) return; this.dreaming = true; const el = this.e.dream; const p = el.querySelector('p') as HTMLElement; (el.querySelector('h3') as HTMLElement).textContent = `${t('ui.dream')} ${n}/5`;
    const btn = this.e.wake as HTMLButtonElement; btn.textContent = t('ui.wake'); btn.style.visibility = 'hidden'; el.classList.add('on'); p.textContent = '';
    const text = t(`dream.${n}`); let i = 0; const iv = window.setInterval(() => { p.textContent = text.slice(0, ++i); if (i >= text.length) { clearInterval(iv); btn.style.visibility = 'visible'; } }, 38);
    btn.onclick = async () => { clearInterval(iv); el.classList.remove('on'); this.dreaming = false; await this.g.net.rpc('dreamSeen'); };
  }
  duelInvite(from: string) { this.e.duelt.textContent = t('sys.duel_invite', { name: from }); this.e.duelbox.style.display = 'block'; setTimeout(() => (this.e.duelbox.style.display = 'none'), 30000); }
  disconnected(code: number) { if (this.g.net.room && code !== 1000) { this.e.connt.textContent = code === 4001 ? t('err.duplicate') : t('err.disconnected'); this.e.conn.classList.add('on'); } }

  private meSig = '';
  onMe(m: Me, prev: Me | null) {
    const sig = JSON.stringify([m.level, m.xp, m.gold, m.skillPts, m.spec, m.skillRanks, m.bag, m.items.map((i) => i.id + i.up), Object.values(m.equip).map((i) => i?.id + ':' + i?.up), m.tut, m.expeditions.map((e) => e.id), m.companions.map((c) => c.id + c.level), m.rank, m.inscr, m.points, m.oymakId, m.clues, m.role, m.shards]);
    if (sig !== this.meSig) { this.meSig = sig; this.panels.refresh(); }
    this.hudAcc = 1;
    if (m.pendingDream && !this.dreaming) setTimeout(() => this.dream(m.pendingDream), 600);
    if (m.role === 'admin' && !this.e.btns.querySelector('[data-p="gm"]')) this.e.btns.insertAdjacentHTML('beforeend', `<button class="btn icon" data-p="gm" title="${t('gm.title')} (F2)" style="font-size:13px;font-weight:700">GM</button>`);
    if (prev && m.tut.step > prev.tut.step) this.sfx('upok');
    const alert = m.skillPts > 0 || (m.level >= 10 && m.spec === 'none'); this.e.btns.querySelector('[data-p="skills"]')?.classList.toggle('alert', alert);
    this.e.btns.querySelector('[data-p="oba"]')?.classList.toggle('alert', m.expeditions.some((e) => this.g.net.now() >= e.endAt));
  }

  // ───────── HUD ─────────
  hud(dt: number) {
    const g = this.g; const m = g.me; if (!m) return; const bc = BOY_COLORS[m.boy];
    this.e.portrait.style.setProperty('--b1', bc.main); this.e.portrait.style.setProperty('--b2', bc.dark);
    if (!this.e.portrait.firstChild) this.e.portrait.innerHTML = emblemSvg(m.boy, '#fff6df', 'rgba(0,0,0,.4)');
    this.e.lvl.textContent = String(m.level); this.e.nm.textContent = m.name; this.e.spec.textContent = t('spec.' + m.spec);
    const hp = Math.max(0, g.hp); const mh = m.stats.maxHp;
    (this.e.hpbar.querySelector('i') as HTMLElement).style.width = `${Math.min(100, (hp / mh) * 100)}%`; (this.e.hpbar.querySelector('span') as HTMLElement).textContent = `${num(hp)} / ${num(mh)}`; this.e.hpbar.classList.toggle('low', hp / mh < 0.3);
    const base = this.e.xpbar.querySelector('.base') as HTMLElement; const rest = this.e.xpbar.querySelector('.rest') as HTMLElement;
    const maxed = m.level >= MAX_LEVEL; base.style.width = `${Math.min(100, (m.xp / m.xpNext) * 100)}%`; rest.style.width = `${Math.min(100, ((m.xp + (maxed ? 0 : m.rested)) / m.xpNext) * 100)}%`;
    this.e.xpbar.title = `${t('ui.xp')} ${num(m.xp)}/${num(m.xpNext)} · ${t('ui.rested')} ${num(m.rested)}/${num(m.restedCap)}`;
    const tags: string[] = [`<span class="tag">${icon('akce')}${num(m.gold)}</span>`];
    if (m.rested > 0) tags.push(`<span class="tag blue" title="${t('ui.rested')}">${icon('sound')}${t('ui.rested')} ${Math.round((m.rested / m.restedCap) * 100)}%</span>`);
    if (m.role === 'admin') tags.push(`<span class="tag red">${t('ui.role.admin')}${m.god ? ' · GOD' : ''}</span>`);
    if (m.rank < 0) tags.push(`<span class="tag red">${icon('skull')}${t('ui.rank')} ${m.rank}</span>`);
    if (m.kut > 0) tags.push(`<span class="tag">${t('ui.kut')} ${m.kut}</span>`);
    if (m.skillPts > 0) tags.push(`<span class="tag">${icon('skills')}${m.skillPts}</span>`);
    this.e.tags.innerHTML = tags.join('');
    // bölge
    const reg = regionAt(g.pos.x, g.pos.z); const mapId = reg?.map ?? 'bozkir'; const risky = zoneAt(g.pos.x, g.pos.z) === 'risky'; this.e.zone.className = 'zonepill leather ' + (risky ? 'risky' : '');
    { const pol = MAPS[mapId].pvp; const on = !!g.me.pvp && pol === 'optional'; const b = this.e.pvpbtn as HTMLButtonElement; b.className = 'pvpbtn leather ' + (pol === 'off' ? 'na' : on ? 'on' : ''); b.innerHTML = pol === 'off' ? `${t('ui.pvp')}: ${t('map.pvp.off')}` : `${t('ui.pvp')}: ${on ? t('ui.on') : t('ui.off')}`; b.title = t('ui.pvp.tip'); }
    this.e.zone.innerHTML = `${t(mapId === 'bozkir' ? (risky ? 'zone.risky' : 'zone.safe') : (risky ? 'zone.' + mapId + '.risky' : 'zone.' + mapId + '.safe'))} <span class="muted" style="color:#d8c49a;font-size:12px">· ${t('ui.layer')} ${g.net.welcome?.layer ?? 1} · ${g.snap?.pop ?? 1} ${t('ui.online').toLowerCase()}</span>`;
    // hedef
    const tg = g.focusId ? g.vs.get(g.focusId) : g.atkHeld ? g.currentTarget() : null;
    if (tg && tg.dyingT < 0) { const tf = this.e.target; tf.style.display = 'block'; (tf.querySelector('.nm span') as HTMLElement).textContent = tg.kind === 'mob' ? t('mob.' + tg.mobType) : tg.name; (tf.querySelectorAll('.nm span')[1] as HTMLElement).textContent = `${t('ui.level')} ${tg.level}`; (tf.querySelector('.bar i') as HTMLElement).style.width = `${(tg.hp / tg.H) * 100}%`; (tf.querySelector('.bar span') as HTMLElement).textContent = `${num(tg.hp)} / ${num(tg.H)}`; } else this.e.target.style.display = 'none';
    // çatlak çubuğu + pusula
    let near: { x: number; z: number; d: number; w: number; st: number; h: number; H: number } | null = null;
    for (const r of g.riftSnap) { const d = Math.hypot(r.x - g.pos.x, r.z - g.pos.z); if (!near || d < near.d) near = { x: r.x, z: r.z, d, w: r.w, st: r.st, h: r.h, H: r.H }; }
    this.dunBar(); this.kimizHud();
    const rb = this.e.riftbar;
    if (near && near.d < 70) { rb.style.display = 'block'; const sp = rb.querySelectorAll('.t span'); sp[0].textContent = t('rift.name'); sp[1].textContent = near.st === 0 ? t('rift.idle') : near.st === 2 ? t('rift.boss') : t('rift.wave', { n: near.w }); (rb.querySelector('.bar i') as HTMLElement).style.width = near.H ? `${(near.h / near.H) * 100}%` : '100%'; } else rb.style.display = 'none';
    const cp = this.e.compass; if (near && near.d > 28) {
      const dx = near.x - g.pos.x, dz = near.z - g.pos.z; const fx = -Math.cos(g.camYaw), fz = -Math.sin(g.camYaw); const rx = fz, rz = -fx;
      const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz); cp.style.display = 'block'; cp.style.transform = `translate(${Math.sin(ang) * Math.min(innerWidth, innerHeight) * 0.34}px, ${-Math.cos(ang) * Math.min(innerWidth, innerHeight) * 0.34}px) rotate(${ang}rad)`; cp.title = `${Math.round(near.d)}m`;
    } else cp.style.display = 'none';
    // görev takibi
    const st = m.tut.step; const q = this.e.quest; q.style.display = 'block';
    let qh = `<div class="h">${icon('stele')}${t('ui.tut')}</div>` + TUTORIAL_STEPS.map((k, i) => `<div class="row ${i < st ? 'done' : i === st ? 'cur' : ''}"><div class="cb">${i < st ? '✓' : ''}</div><div>${t('tut.' + i)} ${i === st ? `<span class="prog">${m.tut.prog}/${TUTORIAL_TARGET[k]}</span>` : ''}</div></div>`).join('') + (st >= 5 ? `<div class="row cur"><div class="cb">★</div><div>${t('tut.end')}</div></div>` : '');
    if (m.hunt) { const hq = huntQuest(m.hunt.lv); qh += `<div class="h hunt">${t('ui.hunt')} · ${t('ui.level')} ${m.hunt.lv}</div>` + hq.goals.map((gl, i) => `<div class="row"><div>${t('mob.' + gl.type)} <span class="prog">${m.hunt!.prog[i]}/${gl.n}</span></div></div>`).join('') + `<div class="row"><button data-huntskip>${t('ui.huntSkip')}</button>${m.hunt.pending > 1 ? `<span>${t('ui.huntMore', { n: m.hunt.pending - 1 })}</span>` : ''}</div>`; }
    if (qh !== this.questHtml) { this.questHtml = qh; q.innerHTML = qh; }
    // etkileşim ipucu
    const nb = g.nearby; if (nb && !this.panels.isOpen()) { this.e.prompt.style.display = 'block'; this.e.prompt.innerHTML = `<b>E</b>${t('npc.' + (nb.key.startsWith('stone:') ? 'stone' : nb.key.startsWith('ruin:') ? 'ruin' : nb.key))}`; } else this.e.prompt.style.display = 'none';
    // ölüm
    const dead = (g.flags & F.DEAD) !== 0; this.e.death.style.display = dead ? 'grid' : 'none';
    if (dead) { const left = Math.max(0, 3 - (performance.now() - g.deadSince) / 1000); (this.e.respawn as HTMLButtonElement).disabled = left > 0; this.e.deadp.innerHTML = (left > 0 ? t('ui.respawnIn', { n: Math.ceil(left) }) : '') + this.deathHint(); }
    void dt;
  }
  /** Ölüm ekranı: seni neyin öldürdüğü ve o hasar türüne karşı savunman (lamba: oyuncu burada bakar, cevap burada olmalı) */
  deathHint(): string {
    const d = this.g.lastDeath; if (!d) return '';
    const who = d.by === 'pl' ? t('death.pl') : d.by === 'dot' ? t('death.dot') : d.by.startsWith('boss.') ? t(d.by) : t('mob.' + d.by);
    let h = `<div class="dhint"><b>${t('death.by')}:</b> ${esc(who)}`;
    if (d.kd) { const me = this.g.me; const def = Math.round((me.stats.defKind[d.kd as DmgKind] ?? 0) * 100); h += ` · ${t('dk.' + d.kd)} (${t('death.yourDef')}: %${def})`; if (def < 15 && d.by !== 'dot') h += `<div class="tip2">${t('death.advice', { kind: t('dk.' + d.kd) })}</div>`; }
    return h + '</div>';
  }
  frame(dt: number, zone: string) {
    void zone; this.hudAcc += dt; this.mapAcc += dt; this.fpsAcc += dt;
    // yetenek bekleme (her kare)
    const m = this.g.me; const now = performance.now();
    this.slots.forEach((s, i) => {
      const sk = SKILLS[i]; const locked = m.level < sk.lvl; s.classList.toggle('locked', locked);
      (s.querySelector('.lk') as HTMLElement).textContent = locked ? t('ui.locked', { n: sk.lvl }) : ''; (s.querySelector('.lk') as HTMLElement).style.display = locked ? '' : 'none';
      (s.querySelector('.rk') as HTMLElement).textContent = locked ? '' : SKILL_RANK_LABEL[m.skillRanks[i] - 1];
      s.classList.toggle('nextc', !locked && this.g.comboChained(i));   // zincirin devamı: parlayan çerçeve
      const left = Math.max(0, this.g.cdEnd[i] - now) / 1000; const cd = left > 0; const p = cd ? (left / sk.cd) * 100 : 0;
      (s.querySelector('.cd') as HTMLElement).style.setProperty('--p', `${p}%`); const ct = s.querySelector('.cdt') as HTMLElement; ct.style.display = cd ? 'grid' : 'none'; if (cd) ct.textContent = left >= 1 ? String(Math.ceil(left)) : left.toFixed(1);
      if (this.lastCd[i] && !cd && !locked) { s.classList.remove('ready-flash'); void s.offsetWidth; s.classList.add('ready-flash'); } this.lastCd[i] = cd;
    });
    { const b = this.e.skillbar.querySelector('.combobadge') as HTMLElement | null; const c = this.g.me?.combo; if (b) { const on = this.g.comboActive() && c.n > 0; b.style.display = on ? '' : 'none'; if (on) { const left = Math.max(0, (c.u - this.g.net.now()) / 1000); b.innerHTML = `${t('ui.combo')} ×${c.n}<i style="width:${Math.min(100, (left / COMBO.windowSec) * 100)}%"></i>`; } } }
    if (this.hudAcc > 0.1) { this.hud(this.hudAcc); this.hudAcc = 0; }
    if (this.mapAcc > 0.08) { this.drawMap(); this.mapAcc = 0; }
    if (this.fpsAcc > 0.5) { this.fpsAcc = 0; this.e.fps.innerHTML = `${Math.round(this.g.fps)} ${t('ui.fps')} · ${t('ui.ping')} ${this.g.net.pingMs}ms<br>${this.g.gs.quality}`; this.e.info.innerHTML = ''; }
  }

  // ───────── mini harita ─────────
  private drawMap() {
    const g = this.g; const c = this.minimap; const ctx = c.getContext('2d')!; const S = c.width; const R = 130; const k = S / 2 / R; const cx = S / 2;
    ctx.save(); ctx.clearRect(0, 0, S, S); ctx.beginPath(); ctx.arc(cx, cx, cx - 2, 0, Math.PI * 2); ctx.clip();
    const yaw = g.camYaw; const fx = -Math.cos(yaw), fz = -Math.sin(yaw); const rx = fz, rz = -fx;
    // dünya → harita (kamera yönü yukarı)
    const P = (x: number, z: number): [number, number] => { const dx = x - g.pos.x, dz = z - g.pos.z; return [cx + (dx * rx + dz * rz) * k, cx - (dx * fx + dz * fz) * k]; };
    const grd = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx); grd.addColorStop(0, '#e8c765'); grd.addColorStop(1, '#c9a24a'); ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
    const reg = regionAt(g.pos.x, g.pos.z) ?? regionAt(0, 0)!; const hub = reg.id === 'bozkir'; let [ox, oy] = P(reg.cx, reg.cz);
    if (hub) {
      // Erlik bölgesi (mor halka) ve dünya sınırı
      ctx.fillStyle = 'rgba(122,90,160,.55)'; ctx.beginPath(); ctx.arc(ox, oy, WORLD_R * k, 0, 6.3); ctx.arc(ox, oy, WORLD_R * 0.66 * k, 0, 6.3, true); ctx.fill();
      ctx.fillStyle = '#4a2e6a'; ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(ox, oy, WORLD_R * k, 0, 6.3, true); ctx.fill();
      ctx.fillStyle = '#5fbf6a'; ctx.beginPath(); ctx.arc(ox, oy, HUB_R * k, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#fff6df'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.arc(ox, oy, HUB_PLAZA_R * k, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(217,185,122,.9)'; ctx.lineWidth = 2 * ROAD_HALF * k; ctx.lineCap = 'butt'; for (const [ax, az] of [[0, 1], [1, 0]]) { const [x1, y1] = P(-ax * ROAD_LEN, -az * ROAD_LEN); const [x2, y2] = P(ax * ROAD_LEN, az * ROAD_LEN); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      ctx.strokeStyle = '#8a8b96'; ctx.lineWidth = Math.max(2, 3.2 * k); ctx.beginPath(); ctx.arc(ox, oy, HUB_WALL_R * k, 0, 6.3); ctx.stroke();
    } else {
      const pal = MAPS[reg.map].palette; ctx.fillStyle = pal.ground; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#2a1a44'; ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.arc(ox, oy, reg.r * k, 0, 6.3, true); ctx.fill();
      if (reg.safeR > 0) { ctx.fillStyle = '#e8d2a0'; ctx.beginPath(); ctx.arc(ox, oy, reg.safeR * k, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#fff6df'; ctx.lineWidth = 3; ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(30,120,60,.8)'; for (const o of worldObstacles()) if (o.kind === 'tree') { const [x, y] = P(o.x, o.z); if ((x - cx) ** 2 + (y - cx) ** 2 < cx * cx) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.3); ctx.fill(); } }
    // NPC / bina
    const icon2 = (x: number, z: number, col: string, r = 5, sq = false) => { const [a, b] = P(x, z); ctx.fillStyle = col; ctx.strokeStyle = '#1a1230'; ctx.lineWidth = 2; ctx.beginPath(); if (sq) ctx.rect(a - r, b - r, r * 2, r * 2); else ctx.arc(a, b, r, 0, 6.3); ctx.fill(); ctx.stroke(); };
    { const gp = gatePos(reg.id); if (reg.safeR > 0) icon2(gp.x, gp.z, '#7fe0ff', 6, true); }
    if (hub) icon2(HUB.otag.x, HUB.otag.z, '#d63a3a', 7, true)
    if (hub) { icon2(LOOM_POS.x, LOOM_POS.z, '#e86aa8', 6, true); icon2(HUB.demirhane.x, HUB.demirhane.z, '#e08a3a', 6, true); icon2(HUB.akSakal.x, HUB.akSakal.z, '#ffe27a', 5); icon2(HUB.stele.x, HUB.stele.z, '#7fe0ff', 5, true); }
    // kamp halkaları: oyuncunun seviyesine göre tehlike rengi (lamba: yeni oyuncu nereye gideceğini haritada okur) + saha bosları
    for (const c of this.campList) { const [x, y] = P(c.x, c.z); if ((x - cx) ** 2 + (y - cx) ** 2 > (cx + 14) ** 2) continue; const d = c.level - g.me.level; const col = d <= -4 ? '#7ad07a' : d <= 0 ? '#e6f06a' : d <= 3 ? '#ffb23a' : '#ff4a3a';
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 8 * k, 0, 6.3); ctx.stroke(); ctx.fillStyle = col; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(c.level), x, y + 3.5); const n = g.campOcc[c.id] ?? 0; if (n > 0) { ctx.fillStyle = n >= 8 ? '#ff5a4a' : '#ffffff'; ctx.strokeStyle = '#1a1230'; ctx.lineWidth = 3; ctx.font = 'bold 9px sans-serif'; ctx.strokeText('👥' + n, x, y - 8 * k - 3); ctx.fillText('👥' + n, x, y - 8 * k - 3); } }
    for (const b of this.bossList) { const [x, y] = P(b.x, b.z); if ((x - cx) ** 2 + (y - cx) ** 2 > (cx + 14) ** 2) continue; ctx.strokeStyle = '#ff2a6a'; ctx.lineWidth = 3; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(x, y, 9 * k, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#ff9ab8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('☠' + b.level, x, y + 4); }
    for (const st of hub ? genStones() : []) { if (g.me.clues.includes('stone.' + st.n)) continue; const [x, y] = P(st.x, st.z); if ((x - cx) ** 2 + (y - cx) ** 2 > cx * cx) continue; ctx.strokeStyle = '#7fe0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.stroke(); }
    for (const st of hub ? genRuins() : []) { if (g.me.clues.includes('ruin.' + st.n)) continue; const [x, y] = P(st.x, st.z); if ((x - cx) ** 2 + (y - cx) ** 2 > cx * cx) continue; ctx.strokeStyle = '#ffc15e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.stroke(); }
    for (const r of g.riftSnap) { const [x, y] = P(r.x, r.z); const pulse = 6 + Math.sin(performance.now() / 200) * 2; ctx.fillStyle = '#d27aff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, pulse, 0, 6.3); ctx.fill(); ctx.stroke(); }
    for (const v of g.vs.views.values()) { if (v.self || v.dyingT >= 0) continue; const [x, y] = P(v.x, v.z); if (v.kind === 'mob') { ctx.fillStyle = v.boss ? '#ff2a6a' : '#e0453c'; ctx.beginPath(); ctx.arc(x, y, v.boss ? 6 : 2.8, 0, 6.3); ctx.fill(); } else { ctx.fillStyle = v.boy === g.myBoy ? '#4aa8ff' : '#ff9f43'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4, 0, 6.3); ctx.fill(); ctx.stroke(); } }
    for (const d of g.drops.values()) { const [x, y] = P(d.root.position.x, d.root.position.z); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
    // oyuncu oku
    ctx.save(); ctx.translate(cx, cx); ctx.rotate(Math.atan2(g.rot ? Math.sin(g.rot) * rx + Math.cos(g.rot) * rz : 0, 1)); ctx.restore();
    const ang = Math.atan2(Math.sin(g.rot) * rx + Math.cos(g.rot) * rz, Math.sin(g.rot) * fx + Math.cos(g.rot) * fz);
    ctx.translate(cx, cx); ctx.rotate(ang); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a1230'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
