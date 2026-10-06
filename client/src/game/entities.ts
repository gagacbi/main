import { Color3, Mesh, MeshBuilder, type InstancedMesh, type Scene } from '@babylonjs/core';
import { FIELD_BOSS, MOBS, type Boy, type MobType, type Spec } from '@shared/game';
import { F } from '@shared/protocol';
import { decodeCostume } from '@shared/costume';
import { t } from '../i18n';
import { buildHuman, buildMob, type AnimState, type Rig } from './models';
import { build } from './meshkit';
import { getViewK, toonMaterial } from './toon';
import type { FX } from './fx';

interface Sample { t: number; x: number; z: number; r: number }
const INTERP_MS = 110;

export class View {
  kind: 'player' | 'mob'; id: number; rig: Rig; buf: Sample[] = []; x = 0; z = 0; r = 0; speed = 0; hp = 1; H = 1; flags = 0; name = ''; level = 1;
  cs = 0; boy: Boy = 'gok'; spec: Spec = 'none'; mobType: MobType = 'cakal'; self = false; bossId = 0; auraT = Math.random();
  lodOff = false; attackT = -1; hit = 0; dyingT = -1; castT = -1; t = Math.random() * 10; removeAt = 0; shadow: InstancedMesh; shield: Mesh | null = null; stars: Mesh | null = null;
  plate: HTMLElement; barFill: HTMLElement; nameEl: HTMLElement; stEl: HTMLElement; lastFlags = 0; boss = false; baseY = 0; lastAtkDur = 0.55;
  constructor(public scene: Scene, fx: FX, ui: HTMLElement, o: { kind: 'player' | 'mob'; id: number; boy?: Boy; spec?: Spec; mob?: MobType; name: string; level: number; bossId?: number; cs?: number }) {
    this.kind = o.kind; this.id = o.id; this.name = o.name; this.level = o.level;
    if (o.kind === 'player') { this.boy = o.boy ?? 'gok'; this.spec = o.spec ?? 'none'; this.cs = o.cs ?? 0; this.rig = buildHuman(scene, { boy: this.boy, spec: this.spec, costume: decodeCostume(this.cs) }); }
    else { this.mobType = o.mob!; this.boss = o.mob === 'bekci'; this.bossId = o.bossId ?? 0; this.rig = buildMob(scene, o.mob!); const sc = this.bossId ? FIELD_BOSS.scaleView : ({ tepegoz: 1.15, albasti: 1.0, erlik: 1.0, cakal: 1.0, bekci: 1.6 } as Record<MobType, number>)[o.mob!]; this.rig.setScale(sc); }
    for (const m of this.rig.meshes) if (!m.name.endsWith('_ol')) { m.isPickable = true; m.metadata = { eid: this.id }; }
    this.shadow = fx.shadowBase.createInstance('sh' + this.id); this.shadow.isPickable = false;
    const sz = this.kind === 'player' ? 1.8 : this.bossId ? 10 : this.boss ? 7.5 : this.mobType === 'tepegoz' ? 2.5 : 2.0; this.shadow.scaling.set(sz, 1, sz);
    this.plate = document.createElement('div'); this.plate.className = 'plate ' + (this.kind === 'mob' ? 'mob' : 'pl') + (this.boss ? ' boss' : '');
    this.plate.innerHTML = '<div class="nm"></div><div class="hpbar"><i></i></div><div class="st"></div>';
    this.nameEl = this.plate.querySelector('.nm') as HTMLElement; this.barFill = this.plate.querySelector('.hpbar i') as HTMLElement; this.stEl = this.plate.querySelector('.st') as HTMLElement;
    ui.appendChild(this.plate);
    this.refreshName();
  }
  refreshName(friendly = true) {
    const nm = this.kind === 'mob' ? (this.bossId ? t('boss.' + this.bossId) : t('mob.' + this.mobType)) : this.name;
    const red = (this.flags & F.RED) !== 0;
    const kd = this.kind === 'mob' ? (this.bossId ? FIELD_BOSS.list[this.bossId - 1][1] : MOBS[this.mobType].kind) : '';
    this.nameEl.innerHTML = `<b class="lv">${this.level}</b>${esc(nm)}${kd ? `<span class="dk" title="${t('ui.dmgKind')}">${t('dk.' + kd)}</span>` : ''}`;
    this.plate.classList.toggle('red', red); this.plate.classList.toggle('pvp', (this.flags & F.PVP) !== 0); this.plate.classList.toggle('foe', this.kind === 'player' && !friendly && !this.self); this.plate.classList.toggle('self', this.self);
  }
  /** snapshot örneği ekle */
  push(x: number, z: number, r: number, now: number) {
    const b = this.buf; b.push({ t: now, x, z, r }); if (b.length > 8) b.shift();
  }
  /** enterpolasyonlu konumu hesapla */
  sample(now: number) {
    const b = this.buf; if (!b.length) return;
    const rt = now - INTERP_MS; let i = b.length - 1; while (i > 0 && b[i - 1].t >= rt) i--;
    if (i === 0 && b[0].t > rt) { this.setPos(b[0].x, b[0].z, b[0].r); return; }
    const a = b[Math.max(0, i - 1)], c = b[i];
    if (i === 0 || c.t === a.t) { this.setPos(c.x, c.z, c.r); return; }
    const k = Math.min(1, Math.max(0, (rt - a.t) / (c.t - a.t)));
    if (Math.hypot(c.x - a.x, c.z - a.z) > 12) { this.setPos(c.x, c.z, c.r); return; }
    let dr = c.r - a.r; while (dr > Math.PI) dr -= 6.2832; while (dr < -Math.PI) dr += 6.2832;
    this.setPos(a.x + (c.x - a.x) * k, a.z + (c.z - a.z) * k, a.r + dr * k);
  }
  private setPos(x: number, z: number, r: number) { this.x = x; this.z = z; this.r = r; }
}

export const AURA = ['', '#8be28b', '#6ab4ff', '#c58bff', '#ffa24a', '#ffd84a'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export class ViewSystem {
  views = new Map<number, View>(); self: View | null = null;
  constructor(public scene: Scene, public fx: FX, public ui: HTMLElement) {}
  get(id: number) { return this.views.get(id); }
  ensure(o: ConstructorParameters<typeof View>[3]): View {
    let v = this.views.get(o.id);
    if (!v) { v = new View(this.scene, this.fx, this.ui, o); this.views.set(o.id, v); }
    return v;
  }
  remove(v: View) { v.rig.dispose(); v.shadow.dispose(); v.plate.remove(); v.shield?.dispose(false, true); v.stars?.dispose(false, true); this.views.delete(v.id); }
  clear() { for (const v of [...this.views.values()]) this.remove(v); }

  update(dt: number, now: number, myBoy: Boy | null, project: (x: number, y: number, z: number) => { x: number; y: number; vis: boolean }, camX: number, camZ: number) {
    const kv = getViewK(); const crowd = this.views.size; const olR = (crowd > 60 ? 14 : crowd > 35 ? 22 : 38) * kv;   // kalabalıkta kontur yarıçapı daralır
    for (const v of [...this.views.values()]) {
      v.t += dt;
      if (!v.self) v.sample(now);
      const dx = v.x - (v as unknown as { px?: number }).px!, dz = v.z - (v as unknown as { pz?: number }).pz!;
      const sp = Number.isFinite(dx) ? Math.hypot(dx, dz) / Math.max(dt, 0.001) : 0; v.speed += (Math.min(sp, 14) - v.speed) * Math.min(1, dt * 10);
      (v as unknown as { px: number }).px = v.x; (v as unknown as { pz: number }).pz = v.z;
      const root = v.rig.root; root.position.x = v.x; root.position.z = v.z; root.position.y = v.rig.baseY;
      let dr = v.r - root.rotation.y; while (dr > Math.PI) dr -= 6.2832; while (dr < -Math.PI) dr += 6.2832; root.rotation.y += dr * Math.min(1, dt * (v.attackT >= 0 ? 22 : 14));
      if (v.attackT >= 0) { v.attackT += dt / (v.kind === 'mob' ? 0.9 : Math.max(0.35, v.lastAtkDur)); if (v.attackT >= 1) v.attackT = -1; }
      if (v.castT >= 0) { v.castT += dt / 0.5; if (v.castT >= 1) v.castT = -1; }
      v.hit = Math.max(0, v.hit - dt * 5);
      // seviye grubu aurası: 10+ seviyede ayakta yavaş yayılan halka; renk ve sıklık gruba göre
      if (v.kind === 'player' && v.level >= 10 && v.dyingT < 0 && Math.hypot(v.x - camX, v.z - camZ) < 60) {
        const band = Math.min(5, Math.floor(v.level / 10)); v.auraT += dt;
        if (v.auraT > 1.5 - band * 0.15) { v.auraT = 0; this.fx.ring(v.x, v.z, 1.0 + band * 0.18, AURA[band], 1.1, { alpha: 0.55 }); if (band >= 4) this.fx.burst('holy', v.x, 0.3, v.z, 3); }
      }
      // yeniden doğma: bayrak kalktı ve can var → ölüm durumunu sıfırla (oyuncu görünümü silinmez, görünmez kalmaz)
      if (v.dyingT >= 0.2 && !(v.flags & F.DEAD) && v.hp > 0 && v.kind === 'player') { v.dyingT = -1; v.rig.root.rotation.z = 0; v.rig.root.rotation.x = 0; v.rig.baseY = 0; v.removeAt = 0; }
      // ayrıntı düzeyi: uzakta kontur kapalı, çok uzakta karakter hiç çizilmez (kendi karakter hariç)
      if (!v.self) { const dd = Math.hypot(v.x - camX, v.z - camZ); v.rig.setOutlines(dd < olR); const off = dd > 95 * kv; if (off !== v.lodOff) { v.lodOff = off; v.rig.root.setEnabled(!off); } }
      if (v.lodOff && v.dyingT < 0 && !v.self) { v.plate.style.display = 'none'; continue; }   // görüş dışı: animasyon, boyama ve DOM işi yok (CPU tasarrufu)
      const dead = (v.flags & F.DEAD) !== 0 || v.dyingT >= 0;
      if (dead && v.dyingT < 0) v.dyingT = 0;
      if (v.dyingT >= 0) { v.dyingT += dt / 0.7; }
      const st: AnimState = { speed: v.speed, attack: v.attackT, hit: v.hit, dead: v.dyingT >= 0 ? Math.min(1, v.dyingT) : -1, stunned: (v.flags & F.STUN) !== 0, t: v.t, dt, casting: v.castT };
      v.rig.update(st);
      // renk tonu (vurulma / durum)
      let fa = v.hit * 0.9; let fc = Color3.White();
      if (fa < 0.05) {
        const p = 0.5 + 0.5 * Math.sin(v.t * 6);
        if (v.flags & F.POISON) { fc = new Color3(0.3, 1, 0.3); fa = 0.18 + 0.12 * p; } else if (v.flags & F.CURSE) { fc = new Color3(0.7, 0.3, 1); fa = 0.2 + 0.1 * p; } else if (v.flags & F.SLOW) { fc = new Color3(0.5, 0.8, 1); fa = 0.18; }
      }
      v.rig.flashColor = fc; v.rig.flash(fa);
      // dönen yıldızlar (sersem) ve kalkan baloncuğu
      if ((v.flags & F.STUN) && !v.stars) { v.stars = build(this.scene, 'stars', [0, 1, 2].map((i) => ({ k: 'icos' as const, d: 0.3, p: [Math.cos(i * 2.094) * 0.7, 0, Math.sin(i * 2.094) * 0.7] as [number, number, number], c: '#ffe27a', sub: 0 }))); v.stars.material = toonMaterial(this.scene, { vertexColors: true, emissive: new Color3(0.8, 0.6, 0.1) }); }
      if (v.stars) { v.stars.setEnabled((v.flags & F.STUN) !== 0 && !dead); v.stars.position.set(v.x, (v.rig.height * v.rig.scale) + 0.3, v.z); v.stars.rotation.y = v.t * 4; }
      if ((v.flags & F.SHIELD) && !v.shield) { v.shield = MeshBuilder.CreateSphere('shield', { diameter: 3.4, segments: 16 }, this.scene); v.shield.material = toonMaterial(this.scene, { color: '#9fd8ff', emissive: new Color3(0.15, 0.3, 0.5), alpha: 0.3, rim: 2 }); v.shield.isPickable = false; }
      if (v.shield) { v.shield.setEnabled((v.flags & F.SHIELD) !== 0 && !dead); v.shield.position.set(v.x, 1.5, v.z); v.shield.scaling.setAll(1 + Math.sin(v.t * 5) * 0.025); }
      v.lastFlags = v.flags;
      // gölge
      v.shadow.position.set(v.x, 0.05, v.z); v.shadow.setEnabled(v.dyingT < 0.9);
      // isim levhası
      const far = Math.hypot(v.x - camX, v.z - camZ);
      const show = !dead || v.dyingT < 0.5;
      const maxD = v.kind === 'mob' ? (v.boss ? 70 : 30) : 45;
      const p = project(v.x, (v.rig.height * v.rig.scale) + 0.35, v.z);
      const vis = show && p.vis && far < maxD;
      v.plate.style.display = vis ? '' : 'none';
      if (vis) {
        v.plate.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        v.barFill.style.width = `${Math.max(0, Math.min(100, (v.hp / v.H) * 100))}%`;
        v.plate.classList.toggle('full', v.hp >= v.H && v.kind === 'mob');
        if (v.kind === 'player') v.plate.classList.toggle('foe', !v.self && myBoy !== null && v.boy !== myBoy);
        v.stEl.innerHTML = statusPips(v.flags);
      }
      // yok edilen
      if ((v.kind !== 'player' && v.dyingT >= 1.4) || (v.removeAt && now > v.removeAt)) this.remove(v);   // oyuncu görünümü ölümde silinmez (yeniden doğunca geri gelir)
    }
  }
}

function statusPips(f: number) {
  let s = '';
  if (f & F.STUN) s += '<i class="pip stun" title="stun"></i>'; if (f & F.SLOW) s += '<i class="pip slow"></i>'; if (f & F.POISON) s += '<i class="pip poison"></i>';
  if (f & F.CURSE) s += '<i class="pip curse"></i>'; if (f & F.SHIELD) s += '<i class="pip shield"></i>'; if (f & F.DUEL) s += '<i class="pip duel"></i>'; if (f & F.PVP) s += '<i class="pip pvp" title="PvP"></i>';
  return s;
}
