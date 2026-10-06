import { Matrix, Vector3 } from '@babylonjs/core';
import { BOYS, HUB, SKILLS, zoneAt, type Boy, type MobType, type Spec } from '@shared/game';
import { F, type ChatMsg, type GameEvent, type Me, type SnapDrop, type SnapRift, type Snapshot } from '@shared/protocol';
import { Audio } from '../audio';
import { getLang, itemName, t } from '../i18n';
import { AURA } from './entities';
import { Net } from '../net';
import type { UI } from '../ui/ui';
import { ViewSystem, View } from './entities';
import { DropView, FX, RiftView } from './fx';
import { IDLE, buildHuman, type Rig } from './models';
import { Predictor } from './predict';
import { genStones } from '@shared/world';
import { GATE_LINKS, gatePos } from '@shared/game';
import { regionAt } from '@shared/maps';
import { LOOM_POS, costumeCode } from '@shared/costume';
import { GameScene, type Quality } from './scene';
import type { ViewDist } from './toon';
import { World3D } from './world';

interface Npc { key: 'aksakal' | 'demirci' | 'guard'; rig: Rig; x: number; z: number; plate: HTMLElement; mark: HTMLElement | null; t: number; faceAway?: number }

export class Game {
  gs: GameScene; world: World3D; fx: FX; audio = new Audio(); net = new Net(); vs: ViewSystem; ui!: UI;
  me!: Me; prevMe: Me | null = null; myId = 0; myBoy: Boy = 'gok'; pred = new Predictor(); pos = this.pred.pos; rot = 0; hp = 1; flags = 0; selfView: View | null = null;
  campOcc: number[] = []; serverYou = { x: 0, z: 0 }; snap: Snapshot | null = null; snapAt = 0;
  drops = new Map<number, DropView>(); rifts = new Map<number, RiftView>(); riftSnap: SnapRift[] = []; npcs: Npc[] = [];
  keys = new Set<string>(); camYaw = -Math.PI / 2; camPitch = 1.0; camDist = 22; camTarget = new Vector3(0, 1.7, 0);
  focusId = 0; atkHeld = false; clickAttack = false; moveTarget: { x: number; z: number } | null = null; lastDir = { x: 0, z: 0 }; lastSend = 0;
  cdEnd = [0, 0, 0, 0, 0, 0]; cdTotal = SKILLS.map((s) => s.cd); castLock = 0; serverOffset = 0; time = 0; fps = 60; slowFrames = 0; typing = false;
  regionId = 'bozkir'; nearby: { key: string; dist: number } | null = null; lastDeath: { by: string; kd?: string } | null = null; deadSince = 0; wasDead = false; mobsNear = 0; lowFpsSince = 0; lodN = 0;
  dustT = 0; autoQuality = new URLSearchParams(location.search).get('autoq') !== '0'; private dragging = false; private lastX = 0; private lastY = 0; private downAt = 0; private downPos = { x: 0, y: 0 };

  constructor(public canvas: HTMLCanvasElement, public uiRoot: HTMLElement, quality: Quality) {
    this.gs = new GameScene(canvas, quality);
    { let vd: ViewDist = 'mid'; try { const v = localStorage.getItem('kut.vd'); if (v === 'near' || v === 'mid' || v === 'far') vd = v; } catch { /* */ } this.gs.setViewDistance(vd); }
    this.world = new World3D(this.gs.scene);
    this.fx = new FX(this.gs.scene, uiRoot);
    this.vs = new ViewSystem(this.gs.scene, this.fx, uiRoot);
    this.buildNpcs();
    this.bindInput();
  }

  // ───────────── NPC'ler ─────────────
  private buildNpcs() {
    const sc = this.gs.scene;
    const mk = (key: Npc['key'], x: number, z: number, rig: Rig, nameKey: string, mark: boolean) => {
      rig.root.position.set(x, 0, z);
      for (const m of rig.meshes) if (!m.name.endsWith('_ol')) { m.isPickable = true; m.metadata = { npc: key }; }
      const plate = document.createElement('div'); plate.className = 'plate npc'; plate.innerHTML = `<div class="nm">${t(nameKey)}</div>`; this.uiRoot.appendChild(plate);
      let markEl: HTMLElement | null = null; if (mark) { markEl = document.createElement('div'); markEl.className = 'qmark'; markEl.textContent = '!'; this.uiRoot.appendChild(markEl); }
      this.npcs.push({ key, rig, x, z, plate, mark: markEl, t: Math.random() * 5 });
    };
    mk('aksakal', HUB.akSakal.x, HUB.akSakal.z, buildHuman(sc, { boy: 'gok', kind: 'aksakal' }), 'npc.aksakal', true);
    mk('demirci', HUB.demirci.x, HUB.demirci.z, buildHuman(sc, { boy: 'yer', kind: 'demirci' }), 'npc.demirci', false);
    for (const g of HUB.guards) mk('guard', g.x, g.z, buildHuman(sc, { boy: 'gok', kind: 'guard' }), 'npc.guard', false);
    this.npcs.forEach((n) => { n.rig.root.rotation.y = n.key === 'guard' ? Math.atan2(n.x, n.z) : n.key === 'aksakal' ? 0.5 : -0.9; if (n.key === 'guard') n.faceAway = n.rig.root.rotation.y; });
    this.refreshNpcNames();
  }
  refreshNpcNames() { for (const n of this.npcs) { const nm = n.plate.querySelector('.nm'); if (nm) nm.textContent = t(n.key === 'aksakal' ? 'npc.aksakal' : n.key === 'demirci' ? 'npc.demirci' : 'npc.guard'); } }

  // ───────────── başlık sahnesi (giriş ekranı arka planı) ─────────────
  heroes: { rig: Rig; boy: Boy; x: number; z: number }[] = []; titleBoy: Boy = 'gok'; titleT = 0;
  startTitle() {
    const sc = this.gs.scene; const spots: [Boy, number, number][] = [['gok', -3.6, 6.5], ['yer', 0, 8.2], ['ay', 3.6, 6.5]];
    for (const [b, x, z] of spots) { const rig = buildHuman(sc, { boy: b, spec: b === 'gok' ? 'kalkan' : b === 'ay' ? 'none' : 'kilic' }); rig.root.position.set(x, 0, z); rig.root.rotation.y = Math.PI + (x > 0 ? -0.2 : x < 0 ? 0.2 : 0); this.heroes.push({ rig, boy: b, x, z }); }
    const cam = this.gs.camera; cam.lowerRadiusLimit = 5; cam.beta = 1.28; cam.radius = 14; cam.target.set(0, 2.2, 7.2);
    this.gs.engine.runRenderLoop(this.titleLoop);
  }
  private titleLoop = () => {
    const dt = Math.min(0.05, this.gs.engine.getDeltaTime() / 1000); this.titleT += dt; const cam = this.gs.camera;
    cam.alpha = -Math.PI / 2 + Math.sin(this.titleT * 0.18) * 0.32; cam.beta = 1.26 + Math.sin(this.titleT * 0.13) * 0.04; cam.radius = 15.5;
    this.titleShift += (this.titleShiftTarget - this.titleShift) * Math.min(1, dt * 3); cam.target.set(this.titleShift, 2.4, 7.2);
    for (const h of this.heroes) {
      const sel = h.boy === this.titleBoy; const sc = h.rig.root.scaling.x + ((sel ? 1.18 : 0.95) - h.rig.root.scaling.x) * Math.min(1, dt * 6); h.rig.root.scaling.setAll(sc);
      h.rig.root.position.z += ((sel ? h.z - 0.8 : h.z) - h.rig.root.position.z) * Math.min(1, dt * 5);
      h.rig.update({ ...IDLE, t: this.titleT + h.x, dt, speed: 0, attack: sel ? ((this.titleT * 0.7) % 1.6 < 0.6 ? ((this.titleT * 0.7) % 1.6) / 0.6 : -1) : -1 });
    }
    this.updateNpcs(dt); this.world.update(dt); this.fx.update(dt, this.projector);
    this.fx.emitRate('fire', 28, HUB.fire.x, 0.7, HUB.fire.z); this.fx.emitRate('smoke', 3, HUB.fire.x, 3.2, HUB.fire.z);
    this.gs.scene.render();
  };
  titleShift = 0; titleShiftTarget = 0;
  setTitleBoy(b: Boy) { this.titleBoy = b; }
  setTitleLayout(mode: 'login' | 'create') { this.titleShiftTarget = mode === 'create' ? -5.2 : 0; }
  stopTitle() { this.gs.engine.stopRenderLoop(this.titleLoop); for (const h of this.heroes) h.rig.dispose(); this.heroes = []; this.gs.camera.lowerRadiusLimit = 8; }

  // ───────────── bağlantı ─────────────
  async connect(name: string, password: string, create: Boy | null) {
    await this.net.connect(name, password, create, getLang());
    this.net.on('welcome', (w) => { this.myId = w.id; this.serverOffset = w.serverTime - Date.now(); });
    this.net.on('me', (m) => this.onMe(m));
    this.net.on('camps', (o) => { this.campOcc = o; });
    this.net.on('snap', (s) => this.onSnap(s));
    this.net.on('chat', (c) => this.onChat(c));
    this.net.on('duelInvite', (from) => this.ui.duelInvite(from));
    this.net.on('close', (code) => this.ui.disconnected(code));
    await new Promise<void>((res) => { const iv = setInterval(() => { if (this.me && this.snap) { clearInterval(iv); res(); } }, 30); });
    this.myBoy = this.me.boy; this.pos.x = this.snap!.you.x; this.pos.z = this.snap!.you.z; this.serverYou = { ...this.pos };
    this.selfView = this.vs.ensure({ kind: 'player', id: this.myId, boy: this.me.boy, spec: this.me.spec, name: this.me.name, level: this.me.level, cs: this.myCostume(this.me) });
    this.selfView.self = true; this.vs.self = this.selfView; this.selfView.refreshName();
    this.world.setInscriptions(this.me.inscr.unlocked); this.world.setStonesSeen(new Set(this.me.clues.filter((c) => c.startsWith('stone.')).map((c) => Number(c.slice(6)))));
    this.camYaw = Math.PI / 2 + 0.25; this.camPitch = 1.06; this.camDist = 17; this.rot = Math.PI; this.camTarget.set(this.pos.x, 1.7, this.pos.z);
    this.gs.engine.runRenderLoop(() => { this.frame(); this.gs.scene.render(); });
  }

  onMe(m: Me) {
    const prev = this.me; this.prevMe = prev ?? null; this.me = m;
    for (let i = 0; i < 6; i++) this.cdEnd[i] = performance.now() + m.cds[i] * 1000;
    if (prev && this.selfView) {
      const dg = m.gold - prev.gold; if (dg > 0) { this.fx.popup(`+${dg} ${t('mat.gold')}`, this.pos.x, 3.4, this.pos.z, 'gold'); this.audio.sfx('coin', 0.6); }
      for (const k of ['ore', 'hide', 'wood', 'book', 'charm', 'frag'] as const) {
        const d = m.bag[k] - prev.bag[k]; if (d > 0) { this.fx.popup(`+${d} ${t('mat.' + k)}`, this.pos.x, 3.0, this.pos.z, k === 'frag' ? 'frag' : 'mat'); this.audio.sfx(k === 'frag' || k === 'charm' || k === 'book' ? 'rare' : 'loot', 0.7); }
      }
      const had = new Set(prev.items.map((i) => i.id));
      for (const it of m.items) if (!had.has(it.id)) { this.fx.popup(itemName(it), this.pos.x, 3.8, this.pos.z, 'item t' + it.tier); this.audio.sfx(it.tier >= 2 ? 'rare' : 'loot'); }
      if (m.spec !== prev.spec || this.myCostume(m) !== this.selfView.cs) this.respecView();
      if (m.inscr.unlocked !== prev.inscr.unlocked) this.world.setInscriptions(m.inscr.unlocked);
      if (m.clues.length !== prev.clues.length) this.world.setStonesSeen(new Set(m.clues.filter((c) => c.startsWith('stone.')).map((c) => Number(c.slice(6)))));
      if (m.level !== prev.level && this.selfView) { this.selfView.level = m.level; this.selfView.refreshName(); }
    }
    this.ui?.onMe(m, prev);
  }
  /** giyili ve süresi dolmamış kostümün kodu */
  myCostume(m: Me) { const w = m.cos?.worn; return w && this.net.now() < w.expiresAt ? costumeCode(w) : 0; }
  private respecView() {
    if (!this.selfView) return; const old = this.selfView; const f = old.flags;
    this.vs.remove(old);
    this.selfView = this.vs.ensure({ kind: 'player', id: this.myId, boy: this.me.boy, spec: this.me.spec, name: this.me.name, level: this.me.level, cs: this.myCostume(this.me) });
    this.selfView.self = true; this.vs.self = this.selfView; this.selfView.flags = f; this.selfView.refreshName();
  }
  onChat(c: ChatMsg) { this.ui.chat(c); }

  // ───────────── anlık görüntü ─────────────
  onSnap(s: Snapshot) {
    const now = performance.now(); this.snap = s; this.snapAt = now; this.serverYou = { x: s.you.x, z: s.you.z };
    this.hp = s.you.hp; this.flags = s.you.f;
    if (this.selfView) { this.selfView.flags = s.you.f; this.selfView.hp = s.you.hp; this.selfView.H = this.me?.stats.maxHp ?? 1; this.selfView.level = this.me?.level ?? 1; }
    const seen = new Set<number>(); seen.add(this.myId);
    for (const p of s.players) {
      seen.add(p.i); const spec: Spec = p.sp === 1 ? 'kalkan' : p.sp === 2 ? 'kilic' : 'none';
      let v = this.vs.get(p.i);
      if (v && (v.spec !== spec || v.cs !== (p.cs ?? 0))) { this.vs.remove(v); v = undefined; }
      v = v ?? this.vs.ensure({ kind: 'player', id: p.i, boy: BOYS[p.b], spec, name: p.n, level: p.l, cs: p.cs ?? 0 });
      const first = v.buf.length === 0; v.push(p.x, p.z, p.r, now); if (first) { v.x = p.x; v.z = p.z; v.r = p.r; }
      v.hp = p.h; v.H = p.H; const nf = p.f; if ((nf & (F.RED | F.PVP)) !== (v.flags & (F.RED | F.PVP)) || v.level !== p.l) { v.flags = nf; v.level = p.l; v.refreshName(BOYS[p.b] === this.myBoy); } v.flags = nf;
    }
    for (const m of s.mobs) {
      seen.add(m.i); const v = this.vs.ensure({ kind: 'mob', id: m.i, mob: m.t as MobType, name: '', level: m.l, bossId: m.b });
      const first = v.buf.length === 0; v.push(m.x, m.z, m.r, now); if (first) { v.x = m.x; v.z = m.z; v.r = m.r; }
      v.hp = m.h; v.H = m.H; v.flags = m.f;
      if (v.dyingT >= 0 && m.h > 0) { v.dyingT = -1; v.rig.root.rotation.z = 0; v.rig.root.rotation.x = 0; v.rig.baseY = 0; }
    }
    for (const v of [...this.vs.views.values()]) if (!seen.has(v.id) && v.dyingT < 0 && !v.self) this.vs.remove(v);
    this.riftSnap = s.rifts;
    this.syncRifts(s.rifts); this.syncDrops(s.drops, now);
    for (const e of s.ev) this.onEvent(e);
  }

  private syncRifts(rs: SnapRift[]) {
    const seen = new Set<number>();
    for (const r of rs) { seen.add(r.i); if (!this.rifts.has(r.i)) this.rifts.set(r.i, new RiftView(this.gs.scene, this.fx, r.i, r.x, r.z)); }
    for (const [id, rv] of this.rifts) if (!seen.has(id)) { rv.dispose(); this.rifts.delete(id); }
  }
  private syncDrops(ds: SnapDrop[], now: number) {
    const seen = new Set<number>();
    for (const d of ds) {
      seen.add(d.i); let v = this.drops.get(d.i);
      if (!v) { v = new DropView(this.gs.scene, d.i, d.k, d.t, d.m, this.uiRoot, d.k === 'item' && d.t >= 1 ? `${t('tier.' + d.t)} ${t('slot.' + d.m)}` : null); this.drops.set(d.i, v); v.born = now - d.a; if (d.t >= 2) this.audio.sfx('rare', 0.6); }
      v.update(d.a + (now - this.snapAt), this.time, d.x, d.z);
    }
    for (const [id, v] of this.drops) if (!seen.has(id)) { this.fx.burst(v.kind === 'gold' ? 'gold' : 'holy', v.root.position.x, 0.6, v.root.position.z, 8); v.dispose(); this.drops.delete(id); }
  }

  private onEvent(e: GameEvent) {
    const near = (x: number, z: number) => Math.hypot(x - this.pos.x, z - this.pos.z) < 30;
    switch (e.k) {
      case 'swing': {
        const v = this.vs.get(e.id); if (!v) return; v.attackT = 0; if (v.self) v.lastAtkDur = this.me.stats.atkInterval;
        if (near(v.x, v.z)) this.audio.sfx('swing', v.self ? 0.7 : 0.3);
        break;
      }
      case 'dmg': {
        const v = this.vs.get(e.id); const mine = e.src === this.myId; const toMe = e.id === this.myId;
        if (v) { if (!e.blk) v.hit = 1; const y = v.rig.height * v.rig.scale; if (!e.blk) this.fx.hitSpark(v.x, y * 0.55, v.z, !!e.crit);
          if (e.blk) { if (toMe || mine || near(v.x, v.z)) this.fx.popup(t('ui.block'), v.x, y + 0.4, v.z, 'dmg-block', 1.0); if (toMe) this.audio.sfx('ui', 0.8); return; }
          const cls = toMe ? 'dmg-me' : mine ? (e.crit ? 'dmg-crit' : 'dmg-out') : 'dmg-other'; if (toMe || mine || near(v.x, v.z)) this.fx.popup((e.crit ? '' : '') + e.v + (e.crit ? '!' : ''), v.x, y + 0.2, v.z, cls, e.crit ? 1.2 : 0.9); }
        if (toMe) { this.audio.sfx('hurt', 0.8); this.fx.shake = Math.max(this.fx.shake, 0.18); } else if (mine) this.audio.sfx(e.crit ? 'crit' : 'hit', 0.8); else if (v && near(v.x, v.z)) this.audio.sfx('hit', 0.25);
        break;
      }
      case 'die': {
        if (e.id === this.myId) this.lastDeath = { by: e.by ?? 'dot', kd: e.kd };
        const v = this.vs.get(e.id); if (!v) return; v.dyingT = 0; v.flags |= F.DEAD;
        if (v.kind === 'mob') { this.fx.burst('dust', v.x, 0.5, v.z, 14); if (near(v.x, v.z)) this.audio.sfx('kill', 0.5); } else if (v.self) { this.audio.sfx('die'); }
        break;
      }
      case 'fx': {
        const v = this.vs.get(e.o); const ang = v ? v.r : 0;
        this.fx.skill(e.fx, e.x, e.z, e.r, ang);
        if (v) v.castT = 0;
        if (near(e.x, e.z)) this.audio.sfx(e.fx === 'slash' ? 'skill' : e.fx, e.o === this.myId ? 1 : 0.5);
        break;
      }
      case 'lvl': { const v = this.vs.get(e.id); if (v) { this.fx.levelUp(v.x, v.z); if (e.lvl % 10 === 0) this.fx.milestone(v.x, v.z, AURA[Math.min(5, e.lvl / 10)]); v.level = e.lvl; v.refreshName(); } if (e.id === this.myId) { this.audio.sfx('levelup'); this.fx.popup(`${t('ui.level')} ${e.lvl}!`, this.pos.x, 4.2, this.pos.z, 'lvl', 1.8); } break; }
      case 'status': { const v = this.vs.get(e.id); if (v && (v.self || near(v.x, v.z))) this.fx.popup(t('st.' + e.s), v.x, v.rig.height * v.rig.scale + 0.7, v.z, 'status ' + e.s, 1.1); break; }
      case 'guard': this.fx.burst('spark', e.tx, 1.4, e.tz, 20); this.fx.ring(e.tx, e.tz, 1.8, '#ff6a6a', 0.4); this.audio.sfx('guard', 0.6); break;
      case 'rift':
        if (e.st === 'open') { this.audio.sfx('rift'); this.fx.beam(e.x, e.z, 60, 4, '#c27aff', 1.6); }
        else if (e.st === 'wave' || e.st === 'boss') { this.fx.ring(e.x, e.z, 11, '#d27aff', 0.9, { fill: true, alpha: 0.7 }); this.audio.sfx('rift', 0.6); if (near(e.x, e.z)) this.ui.toast(e.st === 'boss' ? t('rift.boss') : t('rift.wave', { n: e.wave ?? 1 }), 'rift'); }
        else if (e.st === 'closed') { this.fx.beam(e.x, e.z, 50, 5, '#fff1a8', 1.8); this.fx.burst('holy', e.x, 1, e.z, 90); this.fx.burst('gold', e.x, 1, e.z, 60); this.audio.sfx('levelup'); }
        break;
      case 'spawn': { const v = this.vs.get(e.id); if (v) { v.dyingT = -1; v.flags &= ~F.DEAD; this.fx.burst('dust', v.x, 0.3, v.z, 8); } break; }
    }
  }

  // ───────────── girdi ─────────────
  private bindInput() {
    const c = this.canvas;
    window.addEventListener('keydown', (e) => {
      this.audio.start();
      if (this.typing || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { this.keys.add(k); this.moveTarget = null; this.clickAttack = false; e.preventDefault(); }
      if (e.code === 'Space') { e.preventDefault(); this.setAttack(true); }
      if (/^[1-6]$/.test(k)) this.useSkill(Number(k) - 1);
      if (e.repeat) return;
      if (k === 'e') this.interact();
      this.ui?.key(k, e);
    });
    window.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); this.keys.delete(k); if (e.code === 'Space') this.setAttack(false); });
    window.addEventListener('blur', () => { this.keys.clear(); this.setAttack(false); });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      this.audio.start(); c.focus(); this.downAt = performance.now(); this.downPos = { x: e.clientX, y: e.clientY };
      if (e.button === 2 || e.button === 1) { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; c.setPointerCapture(e.pointerId); }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return; this.camYaw -= (e.clientX - this.lastX) * 0.006; this.camPitch = Math.min(1.4, Math.max(0.4, this.camPitch - (e.clientY - this.lastY) * 0.005)); this.lastX = e.clientX; this.lastY = e.clientY;
    });
    c.addEventListener('pointerup', (e) => {
      if (this.dragging) { this.dragging = false; try { c.releasePointerCapture(e.pointerId); } catch { /* */ } return; }
      if (e.button === 0 && performance.now() - this.downAt < 400 && Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) < 8) this.click(e.clientX, e.clientY);
    });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.camDist = Math.min(40, Math.max(9, this.camDist + Math.sign(e.deltaY) * 2)); }, { passive: false });
  }
  setAttack(on: boolean) {
    if (on === this.atkHeld) return; this.atkHeld = on; this.net.attack(on, this.focusId || undefined);
  }
  useSkill(i: number) {
    if (!this.me || (this.flags & F.DEAD)) return; const sk = SKILLS[i]; if (this.me.level < sk.lvl) { this.audio.sfx('err'); this.ui.toast(t('ui.locked', { n: sk.lvl }), 'warn'); return; }
    if (performance.now() < this.cdEnd[i]) return;
    this.cdEnd[i] = performance.now() + sk.cd * 1000; this.net.skill(i);
    if (this.selfView) this.selfView.castT = 0;
  }
  private pickEntity(x: number, y: number) {
    const r = this.gs.scene.pick(x * (1 / this.gs.engine.getHardwareScalingLevel()), y * (1 / this.gs.engine.getHardwareScalingLevel()), (m) => m.isPickable && (this.world.isGround(m) || !!m.metadata));
    return r?.hit ? r : null;
  }
  private click(x: number, y: number) {
    const r = this.pickEntity(x, y); if (!r) return;
    const md = r.pickedMesh?.metadata as { eid?: number; npc?: string } | undefined;
    if (md?.eid) { const v = this.vs.get(md.eid); if (v && !v.self) { this.focusId = v.id; this.clickAttack = true; this.moveTarget = null; this.net.attack(this.atkHeld, v.id); this.setAttack(true); this.audio.sfx('ui'); return; } }
    if (md?.npc) { const n = this.npcs.find((q) => q.key === md.npc && Math.hypot(q.x - this.pos.x, q.z - this.pos.z) < 12); if (n) this.interact(md.npc); else { this.moveTarget = { x: r.pickedPoint!.x, z: r.pickedPoint!.z }; this.audio.sfx('ui'); } return; }
    if (this.world.isGround(r.pickedMesh) && r.pickedPoint) { this.moveTarget = { x: r.pickedPoint.x, z: r.pickedPoint.z }; this.clickAttack = false; this.focusId = 0; this.net.attack(this.atkHeld, 0); this.fx.ring(r.pickedPoint.x, r.pickedPoint.z, 1.2, '#ffffff', 0.5, { alpha: 0.7 }); }
  }
  interact(force?: string) {
    const key = force ?? this.nearby?.key; if (!key) return;
    if (key.startsWith('stone:')) { void this.readStone(Number(key.slice(6))); return; }
    if (key === 'aksakal') this.ui.open('elder'); else if (key === 'demirci') this.ui.open('smith'); else if (key === 'otag') this.ui.open('oba'); else if (key === 'stele') this.ui.open('inscr'); else if (key === 'gate') this.ui.open('gate'); else if (key === 'loom') this.ui.open('loom');
    this.audio.sfx('ui');
  }

  async readStone(n: number) {
    const r = await this.net.rpc('stone', { n });
    if (!r.ok) { this.ui.toast(t('err.' + (r.err ?? 'internal'), (r.p as Record<string, number>) ?? {}), 'warn'); this.audio.sfx('err'); return; }
    const isNew = (r.data as { isNew: boolean }).isNew; if (!isNew) { this.ui.toast(t('stone.seen'), ''); return; }
    this.fx.burst('holy', this.pos.x, 2, this.pos.z, 40); this.audio.sfx('rare');
  }

  // ───────────── çerçeve ─────────────
  private projector = (wx: number, wy: number, wz: number) => {
    const e = this.gs.engine; const w = e.getRenderWidth(), h = e.getRenderHeight(); const s = this.gs.scene;
    const p = Vector3.Project(new Vector3(wx, wy, wz), Matrix.IdentityReadOnly, s.getTransformMatrix(), this.gs.camera.viewport.toGlobal(w, h));
    const k = 1 / e.getHardwareScalingLevel();
    return { x: p.x * k, y: p.y * k, vis: p.z > 0 && p.z < 1 && p.x > -60 && p.x < w + 60 && p.y > -60 && p.y < h + 60 };
  };

  private moveInput(): { x: number; z: number } {
    let ix = 0, iz = 0; const k = this.keys;
    if (k.has('w') || k.has('arrowup')) iz += 1; if (k.has('s') || k.has('arrowdown')) iz -= 1; if (k.has('d') || k.has('arrowright')) ix += 1; if (k.has('a') || k.has('arrowleft')) ix -= 1;
    if (ix || iz) {
      const fx = -Math.cos(this.camYaw), fz = -Math.sin(this.camYaw); const rx = fz, rz = -fx;
      const x = fx * iz + rx * ix, z = fz * iz + rz * ix; const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
    }
    // otomatik yaklaşma (saldırı basılı + hedef uzakta)
    if (this.atkHeld || this.clickAttack) {
      const tgt = this.currentTarget();
      if (tgt) { const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z; const d = Math.hypot(dx, dz); if (d > 2.7 && d < 40) return { x: dx / d, z: dz / d }; if (d <= 2.7) return { x: 0, z: 0 }; }
      else if (this.clickAttack) { this.clickAttack = false; this.setAttack(false); }
    }
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.pos.x, dz = this.moveTarget.z - this.pos.z; const d = Math.hypot(dx, dz);
      if (d > 0.6) return { x: dx / d, z: dz / d }; this.moveTarget = null;
    }
    return { x: 0, z: 0 };
  }
  /** Odaklı veya en yakın yaratık */
  currentTarget(): View | null {
    const f = this.focusId ? this.vs.get(this.focusId) : undefined;
    if (f && f.dyingT < 0 && !(f.flags & F.DEAD)) return f;
    if (this.focusId) { this.focusId = 0; this.net.attack(this.atkHeld, 0); }
    let best: View | null = null; let bd = 11 * 11;
    for (const v of this.vs.views.values()) { if (v.kind !== 'mob' || v.dyingT >= 0 || (v.flags & F.DEAD)) continue; const d = (v.x - this.pos.x) ** 2 + (v.z - this.pos.z) ** 2; if (d < bd) { bd = d; best = v; } }
    return best;
  }

  frame() {
    const dtRaw = this.gs.engine.getDeltaTime() / 1000; const dt = Math.min(0.06, Math.max(0.001, dtRaw)); const now = performance.now(); this.time += dt;
    this.fps = this.fps * 0.95 + (1 / Math.max(dtRaw, 0.001)) * 0.05;
    if (!this.me || !this.selfView) return;
    const dead = (this.flags & F.DEAD) !== 0; const stun = (this.flags & F.STUN) !== 0;
    // girdi + tahmin
    const dir = dead || stun ? { x: 0, z: 0 } : this.moveInput();
    const speed = this.me.stats.moveSpeed * ((this.flags & F.SLOW) ? 0.5 : 1);
    this.pred.step(dir, speed, dt); if (dir.x || dir.z) this.rot = Math.atan2(dir.x, dir.z);
    const tgt = this.atkHeld ? this.currentTarget() : null;
    if (tgt && !(dir.x || dir.z) && Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z) < 5) this.rot = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    if ((this.flags & F.ATK) && this.snap && !(dir.x || dir.z)) this.rot = this.snap.you.r;
    this.pred.reconcile(this.serverYou, !!(dir.x || dir.z), dt);
    const changed = Math.abs(dir.x - this.lastDir.x) + Math.abs(dir.z - this.lastDir.z) > 0.03;
    if (changed || ((dir.x || dir.z) && now - this.lastSend > 80)) { this.net.input(dir.x, dir.z); this.lastSend = now; this.lastDir = dir; }
    const sv = this.selfView; sv.x = this.pos.x; sv.z = this.pos.z; sv.r = this.rot;
    if ((dir.x || dir.z) && !dead) { this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.16; this.fx.burst('dust', this.pos.x - dir.x * 0.5, 0.15, this.pos.z - dir.z * 0.5, 2); } }
    // varlıklar
    const zone = zoneAt(this.pos.x, this.pos.z);
    this.vs.update(dt, now + 0, this.myBoy, this.projector, this.camTarget.x, this.camTarget.z);
    this.mobsNear = 0; for (const v of this.vs.views.values()) if (v.kind === 'mob' && v.dyingT < 0 && Math.hypot(v.x - this.pos.x, v.z - this.pos.z) < 16) this.mobsNear++;
    this.audio.tension += (Math.min(1, this.mobsNear / 6) - this.audio.tension) * dt * 0.5;
    // ganimet, çatlak, NPC
    for (const d of this.drops.values()) { const s = this.snap?.drops.find((x) => x.i === d.id); if (s) d.update(s.a + (now - this.snapAt), this.time, s.x, s.z); if (d.label) { const p = this.projector(d.root.position.x, 1.8, d.root.position.z); d.label.style.display = p.vis ? '' : 'none'; d.label.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`; } }
    for (const r of this.rifts.values()) { const s = this.riftSnap.find((x) => x.i === r.id); r.update(dt, this.time, s?.st ?? 0); }
    this.updateNpcs(dt);
    if ((this.lodN = (this.lodN + 1) % 6) === 0) this.world.lod(this.camTarget.x, this.camTarget.z);
    this.world.update(dt);
    this.fx.update(dt, this.projector);
    for (const f of this.world.flames) void f;
    this.fx.emitRate('fire', 28, HUB.fire.x, 0.7, HUB.fire.z); this.fx.emitRate('smoke', 3, HUB.fire.x, 3.2, HUB.fire.z);
    { const rg = regionAt(this.pos.x, this.pos.z); if (rg && rg.id !== 'bozkir' && rg.safeR > 0) { this.fx.emitRate('fire', 22, rg.cx, 0.8, rg.cz); this.fx.emitRate('smoke', 2, rg.cx, 3, rg.cz); } }
    // kamera
    this.updateCamera(dt);
    // etkileşim ipucu
    this.nearby = null; const cand: [string, number, number, number][] = [['aksakal', HUB.akSakal.x, HUB.akSakal.z, HUB.interactAkSakal], ['demirci', HUB.demirci.x, HUB.demirci.z, HUB.interactDemirci], ['otag', HUB.otag.x, HUB.otag.z, HUB.interactOtag], ['stele', HUB.stele.x, HUB.stele.z, HUB.interactStele], ['loom', LOOM_POS.x, LOOM_POS.z, LOOM_POS.interact], ...genStones().map((s): [string, number, number, number] => ['stone:' + s.n, s.x, s.z, 5.5])];
    const reg = regionAt(this.pos.x, this.pos.z); if (reg && MAPS_GATES.has(reg.id)) { const gp = gatePos(reg.id); cand.push(['gate', gp.x, gp.z, HUB.interactGate]); }
    if (reg && reg.id !== this.regionId) { this.regionId = reg.id; this.world.setAtmosphere(reg.map); this.ui.regionChanged(reg.id); }
    for (const [k, x, z, r] of cand) { const d = Math.hypot(x - this.pos.x, z - this.pos.z); if (d < r && (!this.nearby || d < this.nearby.dist)) this.nearby = { key: k, dist: d }; }
    // ölüm bayrağı
    if (dead && !this.wasDead) this.deadSince = now; this.wasDead = dead;
    // kalite otomatiği: uzun süre düşük kare hızı → kalite düşür
    if (this.autoQuality && this.fps < 22 && (this.gs.quality !== 'low' || this.gs.viewDist !== 'near')) { if (!this.lowFpsSince) this.lowFpsSince = now; if (now - this.lowFpsSince > 6000) { if (this.gs.viewDist !== 'near') this.setViewDist(this.gs.viewDist === 'far' ? 'mid' : 'near'); else this.gs.setQuality(this.gs.quality === 'high' ? 'medium' : 'low'); this.lowFpsSince = 0; this.ui.qualityChanged(); } } else this.lowFpsSince = 0;
    this.ui.frame(dt, zone);
  }

  private updateNpcs(dt: number) {
    for (const n of this.npcs) {
      n.t += dt;
      const dx = this.pos.x - n.x, dz = this.pos.z - n.z; const d = Math.hypot(dx, dz);
      if (n.key !== 'guard' && d < 14) { const want = Math.atan2(dx, dz); let dr = want - n.rig.root.rotation.y; while (dr > Math.PI) dr -= 6.2832; while (dr < -Math.PI) dr += 6.2832; n.rig.root.rotation.y += dr * Math.min(1, dt * 4); }
      n.rig.update({ ...IDLE, t: n.t, dt, speed: 0 });
      const p = this.projector(n.x, (n.rig.height) + 0.45, n.z); const vis = p.vis && d < 50;
      n.plate.style.display = vis ? '' : 'none'; if (vis) n.plate.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      if (n.mark) { const show = vis && (this.me?.tut.step ?? 0) < 5; n.mark.style.display = show ? '' : 'none'; if (show) n.mark.style.transform = `translate(${p.x}px, ${p.y - 34 + Math.sin(this.time * 3) * 3}px) translate(-50%, -100%)`; }
    }
  }

  private updateCamera(dt: number) {
    const cam = this.gs.camera; const k = Math.min(1, dt * 9);
    this.camTarget.x += (this.pos.x - this.camTarget.x) * k; this.camTarget.z += (this.pos.z - this.camTarget.z) * k; this.camTarget.y += (1.9 - this.camTarget.y) * k;
    this.fx.shake = Math.max(0, this.fx.shake - dt * 1.6); const s = this.fx.shake;
    cam.alpha = this.camYaw; cam.beta = this.camPitch; cam.radius += (this.camDist - cam.radius) * Math.min(1, dt * 8);
    cam.target.set(this.camTarget.x + (Math.random() - 0.5) * s, this.camTarget.y + (Math.random() - 0.5) * s * 0.6, this.camTarget.z + (Math.random() - 0.5) * s);
  }

  setQuality(q: Quality) { this.gs.setQuality(q); }
  setViewDist(v: ViewDist) { this.gs.setViewDistance(v); try { localStorage.setItem('kut.vd', v); } catch { /* */ } }
  respawn() { return this.net.rpc('respawn'); }
  dispose() { this.gs.engine.stopRenderLoop(); this.net.leave(); }
}

const MAPS_GATES = new Set(Object.keys(GATE_LINKS));
