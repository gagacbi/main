import {
  Color3, Color4, DynamicTexture, Effect, Engine, Mesh, MeshBuilder, ParticleSystem, ShaderMaterial, Texture, TransformNode, Vector3, type Scene,
} from '@babylonjs/core';
import { build } from './meshkit';
import { toonMaterial } from './toon';

// ───────── shader'lar ─────────
Effect.ShadersStore['fxringVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 worldViewProjection; varying vec2 vP;
void main(){ vP = position.xy * 2.0; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['fxringFragmentShader'] = `
precision highp float;
varying vec2 vP; uniform vec3 uColor; uniform float uProg; uniform float uInner; uniform float uAngle; uniform float uSpan; uniform float uAlpha; uniform float uMode; uniform float uThick;
void main(){
  float r = length(vP); float a = atan(vP.x, vP.y);
  float w = uThick * mix(1.5, 0.7, uProg);
  float band = smoothstep(uProg - w, uProg, r) * (1.0 - smoothstep(uProg, uProg + 0.03, r));
  float fill = (1.0 - smoothstep(0.0, uProg, r)) * 0.22 * uMode;
  float da = abs(mod(a - uAngle + 3.14159, 6.28318) - 3.14159);
  float arc = 1.0 - smoothstep(uSpan * 0.5 - 0.15, uSpan * 0.5, da);
  float inner = smoothstep(uInner, uInner + 0.05, r);
  float al = (band + fill) * arc * inner * uAlpha * (1.0 - uProg * 0.55);
  gl_FragColor = vec4(uColor * (1.0 + band * 0.8), al);
}`;
Effect.ShadersStore['fxbeamVertexShader'] = `
precision highp float;
attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['fxbeamFragmentShader'] = `
precision highp float;
varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha; uniform float uTime;
void main(){
  float y = vUv.y; float edge = 1.0 - abs(fract(vUv.x * 4.0 + uTime * 0.5) - 0.5) * 0.0;
  float a = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.35, 1.0, y)) * uAlpha * 0.62;
  float s = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 6.0 + y * 8.0);
  gl_FragColor = vec4(uColor * (1.0 + (1.0 - y) * 0.6), a * s);
}`;
Effect.ShadersStore['fxriftVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 worldViewProjection; varying vec2 vP;
void main(){ vP = position.xy * 2.0; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['fxriftFragmentShader'] = `
precision highp float;
varying vec2 vP; uniform float uTime; uniform float uPower; uniform vec3 uColor;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ return vn(p)*0.55 + vn(p*2.2)*0.3 + vn(p*4.7)*0.15; }
void main(){
  float r = length(vP); if (r > 1.0) discard;
  float a = atan(vP.y, vP.x);
  float sw = a + r * 4.0 - uTime * 0.9;
  vec2 q = vec2(cos(sw), sin(sw)) * r * 3.2;
  float n = fbm(q + uTime * 0.1);
  float crack = 1.0 - smoothstep(0.0, 0.05, abs(fbm(vP * 5.0 + 2.0) - 0.5));
  float core = 1.0 - smoothstep(0.0, 0.55, r);
  float fall = 1.0 - smoothstep(0.55, 1.0, r);
  float glow = (crack * 1.4 + n * 0.55 + core * 1.1) * fall;
  vec3 col = mix(uColor, vec3(1.0, 0.35, 0.55), crack) + vec3(0.5, 0.2, 0.8) * core;
  gl_FragColor = vec4(col * (0.8 + uPower * 0.5), clamp(glow, 0.0, 1.0) * (0.55 + uPower * 0.35));
}`;
Effect.ShadersStore['fxshadowVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 worldViewProjection; varying vec2 vP;
void main(){ vP = position.xy * 2.0; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['fxshadowFragmentShader'] = `
precision highp float;
varying vec2 vP; void main(){ float r = length(vP); float a = (1.0 - smoothstep(0.55, 1.0, r)) * 0.42; gl_FragColor = vec4(0.08, 0.04, 0.2, a); }`;

function ringMat(scene: Scene, additive = true) {
  const m = new ShaderMaterial('ring', scene, 'fxring', { attributes: ['position'], uniforms: ['worldViewProjection', 'uColor', 'uProg', 'uInner', 'uAngle', 'uSpan', 'uAlpha', 'uMode', 'uThick'], needAlphaBlending: true });
  m.backFaceCulling = false; m.disableDepthWrite = true; m.alphaMode = additive ? Engine.ALPHA_ADD : Engine.ALPHA_COMBINE;
  m.setFloat('uInner', 0); m.setFloat('uAngle', 0); m.setFloat('uSpan', 6.3); m.setFloat('uAlpha', 1); m.setFloat('uProg', 0); m.setFloat('uMode', 0); m.setFloat('uThick', 0.2); m.setColor3('uColor', Color3.White());
  return m;
}

interface Anim { mesh: Mesh; mat: ShaderMaterial | null; t: number; dur: number; update: (k: number, a: Anim) => void; done?: () => void; free: () => void }
interface Pop { el: HTMLElement; t: number; x: number; y: number; z: number; vy: number; dur: number }

export class FX {
  anims: Anim[] = []; pops: Pop[] = []; popLayer: HTMLElement; shake = 0; shadowMat: ShaderMaterial; shadowBase: Mesh; tex!: DynamicTexture;
  private ringPool: { mesh: Mesh; mat: ShaderMaterial; busy: boolean }[] = [];
  private beamPool: { mesh: Mesh; mat: ShaderMaterial; busy: boolean }[] = [];
  private psp: Record<string, ParticleSystem> = {}; time = 0;
  constructor(public scene: Scene, ui: HTMLElement) {
    this.popLayer = document.createElement('div'); this.popLayer.className = 'poplayer'; ui.appendChild(this.popLayer);
    this.tex = new DynamicTexture('dot', 64, this.scene, true); const c = this.tex.getContext() as unknown as CanvasRenderingContext2D;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); this.tex.update();
    this.shadowMat = new ShaderMaterial('shadow', scene, 'fxshadow', { attributes: ['position'], uniforms: ['worldViewProjection'], needAlphaBlending: true }); this.shadowMat.backFaceCulling = false; this.shadowMat.disableDepthWrite = true; this.shadowMat.alphaMode = Engine.ALPHA_COMBINE;
    this.shadowBase = MeshBuilder.CreateDisc('shadowBase', { radius: 0.5, tessellation: 20 }, scene); this.shadowBase.rotation.x = Math.PI / 2; this.shadowBase.bakeCurrentTransformIntoVertices(); this.shadowBase.material = this.shadowMat; this.shadowBase.isPickable = false; this.shadowBase.setEnabled(false);
    for (let i = 0; i < 26; i++) { const mesh = MeshBuilder.CreateDisc('ringfx', { radius: 0.5, tessellation: 56 }, scene); mesh.rotation.x = Math.PI / 2; mesh.bakeCurrentTransformIntoVertices(); const mat = ringMat(scene); mesh.material = mat; mesh.isPickable = false; mesh.setEnabled(false); mesh.renderingGroupId = 1; this.ringPool.push({ mesh, mat, busy: false }); }
    for (let i = 0; i < 8; i++) { const mesh = MeshBuilder.CreateCylinder('beamfx', { height: 1, diameter: 1, tessellation: 20, cap: Mesh.NO_CAP }, scene); mesh.isPickable = false; mesh.setEnabled(false); mesh.renderingGroupId = 1; const mat = new ShaderMaterial('beam', scene, 'fxbeam', { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'uColor', 'uAlpha', 'uTime'], needAlphaBlending: true }); mat.backFaceCulling = false; mat.disableDepthWrite = true; mat.alphaMode = Engine.ALPHA_ADD; mat.setColor3('uColor', Color3.White()); mat.setFloat('uAlpha', 1); mat.setFloat('uTime', 0); mesh.material = mat; this.beamPool.push({ mesh, mat, busy: false }); }
    const mk = (name: string, o: { n?: number; life: [number, number]; size: [number, number]; col1: Color4; col2: Color4; speed: [number, number]; grav: number; dir1: Vector3; dir2: Vector3; add?: boolean; rot?: boolean }) => {
      const ps = new ParticleSystem(name, 500, this.scene); ps.particleTexture = this.tex; ps.emitter = new Vector3(0, 0, 0); ps.minEmitBox = new Vector3(-0.15, 0, -0.15); ps.maxEmitBox = new Vector3(0.15, 0.1, 0.15);
      ps.color1 = o.col1; ps.color2 = o.col2; ps.colorDead = new Color4(o.col2.r, o.col2.g, o.col2.b, 0); ps.minSize = o.size[0]; ps.maxSize = o.size[1]; ps.minLifeTime = o.life[0]; ps.maxLifeTime = o.life[1];
      ps.emitRate = 0; ps.minEmitPower = o.speed[0]; ps.maxEmitPower = o.speed[1]; ps.updateSpeed = 0.02; ps.gravity = new Vector3(0, o.grav, 0); ps.direction1 = o.dir1; ps.direction2 = o.dir2;
      ps.blendMode = o.add === false ? ParticleSystem.BLENDMODE_STANDARD : ParticleSystem.BLENDMODE_ONEONE; ps.start(); this.psp[name] = ps; return ps;
    };
    mk('spark', { life: [0.25, 0.55], size: [0.12, 0.28], col1: new Color4(1, 0.95, 0.6, 1), col2: new Color4(1, 0.55, 0.15, 1), speed: [3, 7], grav: -9, dir1: new Vector3(-1, 0.6, -1), dir2: new Vector3(1, 1.6, 1) });
    mk('dust', { life: [0.5, 1.1], size: [0.4, 0.9], col1: new Color4(0.85, 0.75, 0.55, 0.5), col2: new Color4(0.7, 0.6, 0.45, 0.4), speed: [1.5, 3.5], grav: 0.2, dir1: new Vector3(-1, 0.1, -1), dir2: new Vector3(1, 0.5, 1), add: false });
    mk('gold', { life: [0.5, 0.9], size: [0.1, 0.22], col1: new Color4(1, 0.9, 0.4, 1), col2: new Color4(1, 0.7, 0.2, 1), speed: [1, 3.5], grav: -2.4, dir1: new Vector3(-1, 1, -1), dir2: new Vector3(1, 2, 1) });
    mk('poison', { life: [0.6, 1.2], size: [0.2, 0.45], col1: new Color4(0.5, 1, 0.3, 0.9), col2: new Color4(0.2, 0.7, 0.4, 0.7), speed: [0.5, 2], grav: 1.2, dir1: new Vector3(-1, 0.4, -1), dir2: new Vector3(1, 1.2, 1) });
    mk('ember', { life: [1.2, 2.4], size: [0.12, 0.3], col1: new Color4(1, 0.4, 0.7, 1), col2: new Color4(0.7, 0.3, 1, 1), speed: [0.4, 1.4], grav: 1.4, dir1: new Vector3(-0.6, 1, -0.6), dir2: new Vector3(0.6, 2, 0.6) });
    mk('holy', { life: [0.8, 1.5], size: [0.2, 0.42], col1: new Color4(1, 1, 0.8, 1), col2: new Color4(0.6, 0.85, 1, 1), speed: [1, 3], grav: 1.5, dir1: new Vector3(-1, 1, -1), dir2: new Vector3(1, 3, 1) });
    mk('smoke', { life: [1.2, 2.2], size: [0.7, 1.5], col1: new Color4(0.5, 0.5, 0.55, 0.3), col2: new Color4(0.7, 0.7, 0.75, 0.2), speed: [0.2, 0.6], grav: 0.6, dir1: new Vector3(-0.2, 1, -0.2), dir2: new Vector3(0.2, 1.5, 0.2), add: false });
    mk('fire', { life: [0.4, 0.9], size: [0.25, 0.55], col1: new Color4(1, 0.7, 0.2, 1), col2: new Color4(1, 0.3, 0.05, 1), speed: [0.4, 1.2], grav: 2.4, dir1: new Vector3(-0.3, 1, -0.3), dir2: new Vector3(0.3, 2, 0.3) });
  }

  burst(name: string, x: number, y: number, z: number, n: number) {
    const ps = this.psp[name]; if (!ps) return; (ps.emitter as Vector3).set(x, y, z); ps.manualEmitCount += n;
  }
  /** sürekli yayıcı (ör. ateş çukuru) */
  emitRate(name: string, rate: number, x: number, y: number, z: number) { const ps = this.psp[name]; (ps.emitter as Vector3).set(x, y, z); ps.emitRate = rate; }

  private take<T extends { busy: boolean }>(pool: T[]): T | null { for (const p of pool) if (!p.busy) { p.busy = true; return p; } return null; }
  ring(x: number, z: number, radius: number, color: string, dur = 0.55, o: { y?: number; angle?: number; span?: number; fill?: boolean; inner?: number; inward?: boolean; alpha?: number } = {}) {
    const p = this.take(this.ringPool); if (!p) return;
    p.mesh.setEnabled(true); p.mesh.position.set(x, o.y ?? 0.1, z); p.mesh.scaling.setAll(radius * 2);
    p.mat.setColor3('uColor', Color3.FromHexString(color)); p.mat.setFloat('uAngle', o.angle ?? 0); p.mat.setFloat('uSpan', o.span ?? 6.3); p.mat.setFloat('uInner', o.inner ?? 0); p.mat.setFloat('uMode', o.fill ? 1 : 0); p.mat.setFloat('uAlpha', o.alpha ?? 1); p.mat.setFloat('uThick', Math.min(0.26, Math.max(0.045, 1.5 / radius)));
    this.anims.push({ mesh: p.mesh, mat: p.mat, t: 0, dur, update: (k, a) => a.mat!.setFloat('uProg', o.inward ? 1 - k * 0.92 : 0.05 + k * 0.95), free: () => { p.mesh.setEnabled(false); p.busy = false; } });
  }
  beam(x: number, z: number, h: number, w: number, color: string, dur = 0.9) {
    const p = this.take(this.beamPool); if (!p) return;
    p.mesh.setEnabled(true); p.mesh.position.set(x, h / 2, z); p.mesh.scaling.set(w, h, w); p.mat.setColor3('uColor', Color3.FromHexString(color));
    this.anims.push({ mesh: p.mesh, mat: p.mat, t: 0, dur, update: (k, a) => { a.mat!.setFloat('uAlpha', Math.min(1, k * 8) * (1 - k)); a.mat!.setFloat('uTime', this.time); a.mesh.scaling.x = a.mesh.scaling.z = w * (1 - k * 0.6); }, free: () => { p.mesh.setEnabled(false); p.busy = false; } });
  }
  /** Beceri efekti (sunucu 'fx' olayı) */
  skill(fx: string, x: number, z: number, r: number, ang = 0) {
    switch (fx) {
      case 'slash': this.ring(x, z, r, '#bfe4ff', 0.34, { angle: ang, span: 6.3, fill: true }); this.ring(x, z, r * 0.8, '#ffffff', 0.28, { angle: ang, span: 2.6, inner: 0.1 }); this.burst('spark', x, 1.2, z, 16); this.shake = Math.max(this.shake, 0.15); break;
      case 'quake': this.ring(x, z, r, '#ffd08a', 0.7, { fill: true }); this.ring(x, z, r * 0.6, '#ffffff', 0.5); this.burst('dust', x, 0.3, z, 34); this.shake = Math.max(this.shake, 0.5); break;
      case 'roar': this.ring(x, z, r, '#ffe27a', 0.7, { inward: true }); this.ring(x, z, r * 0.55, '#ff9f43', 0.6, { inward: true }); this.burst('spark', x, 1.4, z, 14); this.shake = Math.max(this.shake, 0.25); break;
      case 'shield': this.ring(x, z, 2.6, '#8fd0ff', 0.7, { fill: true }); this.burst('holy', x, 0.3, z, 30); this.beam(x, z, 5, 1.6, '#9fd8ff', 0.8); break;
      case 'poison': this.ring(x, z, r, '#7dff6a', 0.8, { fill: true }); this.burst('poison', x, 0.4, z, 36); break;
      case 'wrath': this.ring(x, z, r, '#ffd46a', 0.9, { fill: true }); this.ring(x, z, r * 0.65, '#fff1c0', 0.7); this.beam(x, z, 34, 1.7, '#ffc94a', 0.9); this.burst('spark', x, 1, z, 70); this.burst('holy', x, 0.5, z, 40); this.shake = Math.max(this.shake, 0.9); break;
    }
  }
  levelUp(x: number, z: number) { this.beam(x, z, 16, 1.2, '#ffe27a', 1.4); this.ring(x, z, 6, '#fff1a8', 1.0, { fill: true }); this.burst('holy', x, 0.4, z, 60); this.burst('gold', x, 1, z, 30); }
  hitSpark(x: number, y: number, z: number, crit: boolean) { this.burst('spark', x, y, z, crit ? 18 : 8); }

  popup(text: string, x: number, y: number, z: number, cls: string, dur = 1.0) {
    if (this.pops.length > 60) return;
    const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = text; this.popLayer.appendChild(el);
    this.pops.push({ el, t: 0, x: x + (Math.random() - 0.5) * 0.8, y, z: z + (Math.random() - 0.5) * 0.8, vy: 2.2, dur });
  }

  update(dt: number, project: (x: number, y: number, z: number) => { x: number; y: number; vis: boolean }) {
    this.time += dt;
    for (let i = this.anims.length - 1; i >= 0; i--) { const a = this.anims[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.update(k, a); if (k >= 1) { a.free(); this.anims.splice(i, 1); } }
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]; p.t += dt; const k = p.t / p.dur; p.y += p.vy * dt * (1 - k); const s = project(p.x, p.y, p.z);
      p.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.35 - p.t * 2)})`; p.el.style.opacity = s.vis ? String(Math.min(1, (1 - k) * 2.2)) : '0';
      if (k >= 1) { p.el.remove(); this.pops.splice(i, 1); }
    }
  }
}

// ───────── Erlik çatlağı (portal) ─────────
export class RiftView {
  root = new TransformNode('rift'); mat: ShaderMaterial; beam: Mesh; rocks: Mesh; power = 0;
  constructor(public scene: Scene, public fx: FX, public id: number, x: number, z: number) {
    this.root.position.set(x, 0, z);
    const d = MeshBuilder.CreateDisc('riftdisc', { radius: 11, tessellation: 48 }, scene); d.rotation.x = Math.PI / 2; d.bakeCurrentTransformIntoVertices(); d.parent = this.root; d.position.y = 0.09; d.isPickable = false; d.renderingGroupId = 1;
    this.mat = new ShaderMaterial('riftmat', scene, 'fxrift', { attributes: ['position'], uniforms: ['worldViewProjection', 'uTime', 'uPower', 'uColor'], needAlphaBlending: true }); this.mat.backFaceCulling = false; this.mat.disableDepthWrite = true; this.mat.alphaMode = Engine.ALPHA_ADD;
    this.mat.setColor3('uColor', new Color3(0.55, 0.2, 0.9)); this.mat.setFloat('uPower', 0); this.mat.setFloat('uTime', 0); d.material = this.mat;
    this.beam = MeshBuilder.CreateCylinder('riftbeam', { height: 46, diameterTop: 1.2, diameterBottom: 7, tessellation: 24, cap: Mesh.NO_CAP }, scene); this.beam.parent = this.root; this.beam.position.y = 23; this.beam.isPickable = false; this.beam.renderingGroupId = 1;
    const bm = new ShaderMaterial('riftbeam', scene, 'fxbeam', { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'uColor', 'uAlpha', 'uTime'], needAlphaBlending: true }); bm.backFaceCulling = false; bm.disableDepthWrite = true; bm.alphaMode = Engine.ALPHA_ADD; bm.setColor3('uColor', new Color3(0.8, 0.3, 0.9)); bm.setFloat('uAlpha', 0.55); bm.setFloat('uTime', 0); this.beam.material = bm;
    const specs = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * 6.283; const rr = 7 + (i % 3) * 1.4; return { k: 'icos' as const, d: 1 + (i % 3) * 0.6, s: [1, 0.8, 1] as [number, number, number], p: [Math.cos(a) * rr, 2 + (i % 4) * 0.9, Math.sin(a) * rr] as [number, number, number], c: '#3c3458', c2: '#6a5c9a', sub: 0 }; });
    this.rocks = build(scene, 'riftrocks', specs); this.rocks.material = toonMaterial(scene, { vertexColors: true, emissive: new Color3(0.2, 0.05, 0.3) }); this.rocks.parent = this.root;
  }
  update(dt: number, t: number, state: number) {
    this.power += ((state > 0 ? 1 : 0) - this.power) * Math.min(1, dt * 2);
    this.mat.setFloat('uTime', t); this.mat.setFloat('uPower', this.power); (this.beam.material as ShaderMaterial).setFloat('uTime', t); this.rocks.rotation.y += dt * 0.25;
    this.rocks.position.y = Math.sin(t * 1.4) * 0.4;
    if (Math.random() < dt * 14) this.fx.burst('ember', this.root.position.x + (Math.random() - 0.5) * 12, 0.2, this.root.position.z + (Math.random() - 0.5) * 12, 2);
  }
  dispose() { this.root.dispose(false, true); }
}

// ───────── ganimet görselleri ─────────
export class DropView {
  root = new TransformNode('drop'); mesh: Mesh; beam: Mesh | null = null; phase = Math.random() * 6; label: HTMLElement | null = null; born = performance.now();
  constructor(public scene: Scene, public id: number, public kind: string, public tier: number, public mat: string | undefined, ui: HTMLElement, labelText: string | null) {
    const T = ['#c9c2b0', '#4aa8ff', '#b46bff', '#ffb02e'][tier] ?? '#ffffff';
    let specs;
    switch (kind) {
      case 'gold': specs = [{ k: 'cyl' as const, d: 0.55, h: 0.1, r: [Math.PI / 2, 0, 0] as [number, number, number], p: [0, 0.4, 0] as [number, number, number], c: '#ffd14a', gloss: 0.7 }, { k: 'torus' as const, d: 0.5, th: 0.07, r: [Math.PI / 2, 0, 0] as [number, number, number], p: [0, 0.4, 0] as [number, number, number], c: '#fff0a0' }]; break;
      case 'mat': specs = mat === 'ore' ? [{ k: 'icos' as const, d: 0.6, s: [1, 0.8, 1] as [number, number, number], p: [0, 0.3, 0] as [number, number, number], c: '#8aa0c8', c2: '#c8d8f4', sub: 0 }] : mat === 'hide' ? [{ k: 'box' as const, w: 0.7, h: 0.1, dp: 0.5, p: [0, 0.15, 0] as [number, number, number], r: [0, 0.4, 0] as [number, number, number], c: '#b07a48', c2: '#d9a066' }] : [{ k: 'cyl' as const, d: 0.3, h: 0.8, r: [0, 0, Math.PI / 2] as [number, number, number], p: [0, 0.2, 0] as [number, number, number], c: '#8a5a32' }, { k: 'cyl' as const, d: 0.3, h: 0.7, r: [0, 1, Math.PI / 2] as [number, number, number], p: [0, 0.5, 0] as [number, number, number], c: '#a06a3e' }]; break;
      case 'book': specs = [{ k: 'box' as const, w: 0.55, h: 0.12, dp: 0.7, p: [0, 0.3, 0] as [number, number, number], c: '#3a6fd6' }, { k: 'box' as const, w: 0.5, h: 0.08, dp: 0.62, p: [0.02, 0.35, 0] as [number, number, number], c: '#fff4d8' }]; break;
      case 'charm': specs = [{ k: 'cyl' as const, db: 0.7, dt: 0.5, h: 0.12, r: [Math.PI / 2, 0, 0] as [number, number, number], p: [0, 0.45, 0] as [number, number, number], c: '#8fe0ff', gloss: 0.6 }, { k: 'sphere' as const, d: 0.25, p: [0, 0.45, 0.06] as [number, number, number], c: '#ffffff' }]; break;
      case 'frag': specs = [{ k: 'cone' as const, db: 0.45, dt: 0, h: 0.9, p: [0, 0.5, 0] as [number, number, number], c: '#5ee6ff', c2: '#bff6ff', seg: 5 }, { k: 'cone' as const, db: 0.45, dt: 0, h: 0.5, p: [0, 0.2, 0] as [number, number, number], r: [Math.PI, 0, 0] as [number, number, number], c: '#3ab8e0', seg: 5 }]; break;
      default: specs = [{ k: 'box' as const, w: 0.7, h: 0.5, dp: 0.5, p: [0, 0.3, 0] as [number, number, number], c: '#7a4f2e' }, { k: 'box' as const, w: 0.74, h: 0.14, dp: 0.54, p: [0, 0.58, 0] as [number, number, number], c: T, gloss: 0.5 }, { k: 'sphere' as const, d: 0.16, p: [0, 0.4, 0.27] as [number, number, number], c: '#ffd14a', gloss: 0.7 }];
    }
    this.mesh = build(scene, 'dropm', specs as never); this.mesh.parent = this.root;
    const em = kind === 'gold' ? new Color3(0.5, 0.35, 0.05) : kind === 'frag' ? new Color3(0.1, 0.4, 0.5) : kind === 'charm' ? new Color3(0.1, 0.3, 0.45) : tier > 0 ? Color3.FromHexString(T).scale(0.28) : Color3.Black();
    this.mesh.material = toonMaterial(scene, { vertexColors: true, emissive: em, rim: 1.4 }); this.mesh.scaling.setAll(kind === 'item' ? 1.1 : 1.0);
    if (kind === 'frag' || kind === 'charm' || tier >= 1 || kind === 'book') {
      const col = kind === 'frag' ? '#5ee6ff' : kind === 'charm' ? '#8fe0ff' : kind === 'book' ? '#6fa0ff' : T;
      const b = MeshBuilder.CreateCylinder('dbeam', { height: 5, diameterTop: 0.15, diameterBottom: 0.8, tessellation: 12, cap: Mesh.NO_CAP }, scene); b.parent = this.root; b.position.y = 2.5; b.isPickable = false; b.renderingGroupId = 1;
      const bm = new ShaderMaterial('db', scene, 'fxbeam', { attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'uColor', 'uAlpha', 'uTime'], needAlphaBlending: true }); bm.backFaceCulling = false; bm.disableDepthWrite = true; bm.alphaMode = Engine.ALPHA_ADD; bm.setColor3('uColor', Color3.FromHexString(col)); bm.setFloat('uAlpha', 0.6); bm.setFloat('uTime', 0); b.material = bm; this.beam = b;
    }
    if (labelText) { this.label = document.createElement('div'); this.label.className = 'droplabel'; this.label.textContent = labelText; this.label.style.color = T; ui.appendChild(this.label); }
  }
  update(age: number, t: number, x: number, z: number) {
    this.root.position.x = x; this.root.position.z = z;
    // "ganimet yağmuru": gökten düşer, zıplar
    const k = Math.min(1, age / 700); const drop = k < 1 ? (1 - k) * (1 - k) * 5.5 : 0; const bounce = k >= 1 && age < 1100 ? Math.abs(Math.sin((age - 700) / 400 * Math.PI)) * 0.55 * (1 - (age - 700) / 400) : 0;
    this.root.position.y = drop + bounce + Math.sin(t * 3 + this.phase) * 0.06 + 0.1;
    this.mesh.rotation.y = t * 2.2 + this.phase; if (this.beam) (this.beam.material as ShaderMaterial).setFloat('uTime', t);
  }
  dispose() { this.root.dispose(false, true); this.label?.remove(); }
}
