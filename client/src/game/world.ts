import {
  Color3, DynamicTexture, Effect, Engine, Mesh, MeshBuilder, ShaderMaterial, StandardMaterial, TransformNode, VertexBuffer, VertexData, type Scene,
} from '@babylonjs/core';
import { BOYS, BOY_COLORS, HUB, HUB_R, WORLD_R, type Boy } from '@shared/game';
import { MAPS, REGIONS, regionAt, type MapId } from '@shared/maps';
import { mulberry32 } from '@shared/rng';
import { genStones, worldObstacles } from '@shared/world';
import { drawEmblem } from '../ui/emblems';
import { build, type PartSpec } from './meshkit';
import { FOG_COLOR, SKY, addOutline, toonMaterial } from './toon';

// ───────────────────────── Zemin shader'ı ─────────────────────────
Effect.ShadersStore['groundVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 world; uniform mat4 worldViewProjection; varying vec3 vP;
void main(){ vec4 wp = world * vec4(position, 1.0); vP = wp.xyz; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['groundFragmentShader'] = `
precision highp float;
varying vec3 vP; uniform vec3 cameraPosition; uniform vec3 uFogColor; uniform vec2 uFog; uniform float uTime; uniform float uOtag;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ return vnoise(p) * 0.55 + vnoise(p * 2.1) * 0.3 + vnoise(p * 4.3) * 0.15; }
void main(){
  vec2 p = vP.xz; float r = length(p);
  float n1 = fbm(p * 0.05); float n2 = fbm(p * 0.21 + 7.0); float n3 = fbm(p * 0.9);
  vec3 gold1 = vec3(0.93, 0.76, 0.34); vec3 gold2 = vec3(0.82, 0.63, 0.25); vec3 green = vec3(0.50, 0.76, 0.34);
  float band = floor(n1 * 4.0) / 4.0;
  vec3 steppe = mix(gold1, gold2, step(0.5, band));
  steppe = mix(steppe, green, smoothstep(0.56, 0.60, n2) * 0.55);
  steppe *= 0.94 + 0.1 * step(0.6, n3);
  float far = smoothstep(105.0, 150.0, r);
  steppe = mix(steppe, vec3(0.52, 0.38, 0.60) * (0.9 + 0.25 * n2), far * 0.78);
  vec3 hubA = vec3(0.40, 0.76, 0.42); vec3 hubB = vec3(0.33, 0.66, 0.38);
  float stripe = step(0.5, fract((p.x + p.y) * 0.1 + n2 * 0.4));
  vec3 hubc = mix(hubA, hubB, stripe);
  float hubMask = 1.0 - smoothstep(31.0, 40.0, r + (n1 - 0.5) * 9.0);
  vec3 col = mix(steppe, hubc, hubMask);
  // halka yol (aşınmış toprak)
  float road = smoothstep(2.4, 1.2, abs(r - 37.0)) * (1.0 - far);
  col = mix(col, vec3(0.80, 0.62, 0.40) * (0.95 + 0.1 * n3), road * 0.8);
  // plaza: kilim taş
  float plaza = 1.0 - smoothstep(13.2, 13.7, r);
  vec2 q = p / 2.2; vec2 fq = abs(fract(q) - 0.5);
  float diamond = step(fq.x + fq.y, 0.4);
  float chk = step(0.5, fract(floor(q.x) * 0.5 + floor(q.y) * 0.5));
  vec3 stone = mix(vec3(0.86, 0.77, 0.60), vec3(0.78, 0.66, 0.48), diamond);
  stone = mix(stone, vec3(0.30, 0.48, 0.78), diamond * chk * 0.9);
  stone = mix(stone, vec3(0.83, 0.28, 0.25), (1.0 - diamond) * (1.0 - chk) * 0.0);
  float ang = atan(p.y, p.x);
  float ring = smoothstep(11.3, 11.45, r) - smoothstep(13.1, 13.25, r);
  float tri = step(0.5, fract(ang * 5.9 + step(0.5, fract(r * 0.55)) * 0.5));
  vec3 ringc = mix(vec3(0.82, 0.22, 0.22), vec3(0.98, 0.86, 0.45), tri);
  float ring2 = smoothstep(8.4, 8.5, r) - smoothstep(8.9, 9.0, r);
  stone = mix(stone, vec3(0.30, 0.45, 0.80), ring2);
  col = mix(col, stone, plaza); col = mix(col, ringc, ring * plaza);
  // Erlik çatlakları (uzak bölge)
  float cr = abs(fbm(p * 0.085 + 3.0) - 0.5);
  float crack = (1.0 - smoothstep(0.0, 0.014, cr)) * far;
  float glow = 0.6 + 0.4 * sin(uTime * 2.0 + p.x * 0.1);
  col = mix(col, vec3(1.0, 0.25, 0.45) * (0.8 + 0.4 * glow), crack);
  float edge = smoothstep(154.0, 164.0, r); col = mix(col, vec3(0.16, 0.11, 0.30), edge);
  float d = distance(cameraPosition, vP); float f = clamp((d - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  col = mix(col, uFogColor, f * f);
  gl_FragColor = vec4(col, 1.0);
}`;


Effect.ShadersStore['rgroundVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 world; uniform mat4 worldViewProjection; varying vec3 vP;
void main(){ vec4 wp = world * vec4(position, 1.0); vP = wp.xyz; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['rgroundFragmentShader'] = `
precision highp float;
varying vec3 vP; uniform vec3 cameraPosition; uniform vec3 uFogColor; uniform vec2 uFog; uniform float uTime;
uniform vec2 uC; uniform vec3 uA; uniform vec3 uB; uniform float uR; uniform float uSafe; uniform float uKind;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ return vnoise(p) * 0.55 + vnoise(p * 2.1) * 0.3 + vnoise(p * 4.3) * 0.15; }
void main(){
  vec2 p = vP.xz - uC; float r = length(p);
  float n1 = fbm(p * 0.06); float n3 = fbm(p * 0.9);
  vec3 col = mix(uA, uB, step(0.5, floor(n1 * 4.0) / 4.0)); col *= 0.94 + 0.1 * step(0.6, n3);
  if (uKind > 1.5) { float cr = abs(fbm(p * 0.085 + 3.0) - 0.5); float crack = 1.0 - smoothstep(0.0, 0.014, cr); float glow = 0.6 + 0.4 * sin(uTime * 2.0 + p.x * 0.1);
    col = mix(col, vec3(1.0, 0.25, 0.45) * (0.8 + 0.4 * glow), crack * 0.85); }
  else if (uKind > 0.5) { vec2 q = p / 4.0; vec2 f = abs(fract(q) - 0.5); float line = 1.0 - smoothstep(0.45, 0.5, max(f.x, f.y)); col = mix(col, col * 0.55, line); }
  else { float flowers = step(0.86, fbm(p * 0.35 + 9.0)); col = mix(col, vec3(1.0, 0.9, 0.55), flowers * 0.35); }
  if (uSafe > 0.0) {
    float pl = 1.0 - smoothstep(uSafe - 0.6, uSafe, r); vec2 q = p / 2.2; vec2 fq = abs(fract(q) - 0.5); float diamond = step(fq.x + fq.y, 0.4);
    vec3 stone = mix(vec3(0.86, 0.77, 0.60), vec3(0.78, 0.66, 0.48), diamond);
    float ring = smoothstep(uSafe - 1.6, uSafe - 1.4, r) - smoothstep(uSafe - 0.7, uSafe - 0.5, r);
    stone = mix(stone, vec3(0.30, 0.45, 0.80), ring); col = mix(col, stone, pl);
  }
  float edge = smoothstep(uR - 8.0, uR + 3.0, r); col = mix(col, vec3(0.10, 0.07, 0.18), edge);
  float d = distance(cameraPosition, vP); float f = clamp((d - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  col = mix(col, uFogColor, f * f);
  gl_FragColor = vec4(col, 1.0);
}`;

Effect.ShadersStore['propshadowVertexShader'] = `
precision highp float;
attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUv;
void main(){ vUv = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['propshadowFragmentShader'] = `
precision highp float;
varying vec2 vUv; void main(){ float r = length(vUv); float a = (1.0 - smoothstep(0.45, 1.0, r)) * 0.38; gl_FragColor = vec4(0.10, 0.06, 0.24, a); }`;

Effect.ShadersStore['skyVertexShader'] = `
precision highp float;
attribute vec3 position; uniform mat4 worldViewProjection; varying vec3 vD;
void main(){ vD = position; gl_Position = worldViewProjection * vec4(position, 1.0); }`;
Effect.ShadersStore['skyFragmentShader'] = `
precision highp float;
varying vec3 vD; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform float uTime;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 d = normalize(vD); float h = d.y;
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.32, h));
  col = mix(col, uTop, smoothstep(0.28, 0.85, h));
  vec3 sun = normalize(vec3(0.45, 0.62, -0.4)); float sd = max(dot(d, sun), 0.0);
  col += vec3(1.0, 0.82, 0.5) * pow(sd, 22.0) * 0.5; col = mix(col, vec3(1.0, 0.96, 0.8), smoothstep(0.9985, 0.9992, sd));
  // yıldız serpintisi (gece mavisi tepe)
  vec2 g = floor(vec2(atan(d.z, d.x) * 90.0, h * 160.0)); float s = hash(g);
  float star = step(0.9965, s) * smoothstep(0.45, 0.85, h) * (0.6 + 0.4 * sin(uTime * 2.0 + s * 40.0));
  col += vec3(1.0, 0.96, 0.85) * star;
  gl_FragColor = vec4(col, 1.0);
}`;

export function emitTransformedCopies(scene: Scene, name: string, template: Mesh, xf: { x: number; y?: number; z: number; s?: number; ry?: number; tint?: [number, number, number] }[]): Mesh {
  const pos = template.getVerticesData(VertexBuffer.PositionKind)!; const nor = template.getVerticesData(VertexBuffer.NormalKind)!;
  const col = template.getVerticesData(VertexBuffer.ColorKind)!; const idx = template.getIndices()!;
  const nv = pos.length / 3; const P = new Float32Array(nv * 3 * xf.length), N = new Float32Array(nv * 3 * xf.length), C = new Float32Array(nv * 4 * xf.length);
  const I = new Uint32Array(idx.length * xf.length);
  xf.forEach((t, k) => {
    const s = t.s ?? 1; const c = Math.cos(t.ry ?? 0), sn = Math.sin(t.ry ?? 0); const tint = t.tint ?? [1, 1, 1];
    for (let i = 0; i < nv; i++) {
      const x = pos[i * 3] * s, y = pos[i * 3 + 1] * s, z = pos[i * 3 + 2] * s;
      P[(k * nv + i) * 3] = x * c + z * sn + t.x; P[(k * nv + i) * 3 + 1] = y + (t.y ?? 0); P[(k * nv + i) * 3 + 2] = -x * sn + z * c + t.z;
      const nx = nor[i * 3], nz = nor[i * 3 + 2];
      N[(k * nv + i) * 3] = nx * c + nz * sn; N[(k * nv + i) * 3 + 1] = nor[i * 3 + 1]; N[(k * nv + i) * 3 + 2] = -nx * sn + nz * c;
      C[(k * nv + i) * 4] = col[i * 4] * tint[0]; C[(k * nv + i) * 4 + 1] = col[i * 4 + 1] * tint[1]; C[(k * nv + i) * 4 + 2] = col[i * 4 + 2] * tint[2]; C[(k * nv + i) * 4 + 3] = col[i * 4 + 3];
    }
    for (let i = 0; i < idx.length; i++) I[k * idx.length + i] = idx[i] + k * nv;
  });
  const m = new Mesh(name, scene); const vd = new VertexData();
  vd.positions = P; vd.normals = N; vd.colors = C; vd.indices = I; vd.applyToMesh(m);
  m.isPickable = false; return m;
}

export class World3D {
  root = new TransformNode('world');
  ground!: Mesh; grounds: Mesh[] = []; sky!: Mesh; skyTop = Color3.FromHexString(SKY.top); skyMid = Color3.FromHexString(SKY.mid); skyHor = Color3.FromHexString(SKY.horizon); atmo: MapId = 'bozkir'; skyMat!: ShaderMaterial; clouds = new TransformNode('clouds');
  mats: ShaderMaterial[] = []; flames: Mesh[] = []; flagPivots: TransformNode[] = []; runes: Mesh[] = []; steleMat!: ShaderMaterial;
  otagGlow = 0; time = 0;
  mat: ShaderMaterial;
  constructor(public scene: Scene) {
    this.mat = toonMaterial(scene, { vertexColors: true });
    this.makeSky(); this.makeGround(); this.makeMountains(); this.makeClouds(); this.makeTrees(); this.makeRocks(); this.makeGrass(); this.makeHub(); this.makePropShadows(); this.makeStones(); this.makeRegions();
  }
  isGround(m: { name?: string } | null | undefined) { return !!m && (m === (this.ground as unknown) || this.grounds.includes(m as Mesh)); }

  private makeSky() {
    const m = MeshBuilder.CreateSphere('sky', { diameter: 800, segments: 24, sideOrientation: 1 }, this.scene);
    const mat = new ShaderMaterial('sky', this.scene, 'sky', { attributes: ['position'], uniforms: ['worldViewProjection', 'uTop', 'uMid', 'uHor', 'uTime'] });
    mat.setColor3('uTop', this.skyTop); mat.setColor3('uMid', this.skyMid); mat.setColor3('uHor', this.skyHor); this.skyMat = mat;
    mat.setFloat('uTime', 0); mat.backFaceCulling = false; mat.disableDepthWrite = true;
    m.material = mat; m.infiniteDistance = true; m.isPickable = false; m.renderingGroupId = 0; m.applyFog = false;
    this.sky = m; this.mats.push(mat);
  }
  private makeGround() {
    const g = MeshBuilder.CreateDisc('ground', { radius: 330, tessellation: 64 }, this.scene);
    g.rotation.x = Math.PI / 2; g.bakeCurrentTransformIntoVertices();
    const mat = new ShaderMaterial('ground', this.scene, 'ground', { attributes: ['position'], uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uFogColor', 'uFog', 'uTime', 'uOtag'] });
    mat.setColor3('uFogColor', FOG_COLOR); mat.setVector2('uFog', { x: 110, y: 300 } as never); mat.setFloat('uTime', 0); mat.setFloat('uOtag', 1);
    mat.backFaceCulling = false; g.material = mat; g.isPickable = true; g.name = 'ground'; this.ground = g; this.grounds.push(g); this.mats.push(mat);
  }
  private makeMountains() {
    const specs: PartSpec[] = []; const r = mulberry32(5);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + r() * 0.1; const d = 215 + r() * 60; const h = 55 + r() * 70; const w = 70 + r() * 60;
      specs.push({ k: 'cone', db: w, dt: 6, h, p: [Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d], c: '#6b5aa8', c2: '#c9b6f0', seg: 7 });
      specs.push({ k: 'cone', db: w * 0.42, dt: 2, h: h * 0.38, p: [Math.cos(a) * d, h * 0.82 - 4, Math.sin(a) * d], c: '#f4f1ff', c2: '#ffffff', seg: 7 });
    }
    const m = build(this.scene, 'mountains', specs); m.material = this.mat; this.root.addChild(m);
  }
  private makeClouds() {
    const r = mulberry32(11); const specs: PartSpec[] = [];
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2; const d = 90 + r() * 200; const y = 70 + r() * 50; const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const n = 4 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) specs.push({ k: 'sphere', d: 16 + r() * 14, s: [1.4, 0.7, 1], p: [cx + (k - n / 2) * 12 + r() * 6, y + r() * 5, cz + r() * 10], c: '#ffffff', c2: '#f6efff', seg: 8 });
    }
    const m = build(this.scene, 'clouds', specs); m.material = toonMaterial(this.scene, { vertexColors: true, rim: 0.4 }); m.parent = this.clouds; m.applyFog = false;
    addOutline(m, this.scene);
  }

  private makeTrees() {
    const sc = this.scene; const obs = worldObstacles().filter((o) => o.kind === 'tree');
    const tpl = [
      // yuvarlak yapraklı
      build(sc, 't0', [
        { k: 'cyl', dt: 0.3, db: 0.5, h: 2.6, p: [0, 1.3, 0], c: '#7a4f2e', c2: '#a06a3e' },
        { k: 'icos', d: 3.0, s: [1, 0.9, 1], p: [0, 3.2, 0], c: '#2f9e55', c2: '#58c878', sub: 1 }, { k: 'icos', d: 2.2, p: [0.9, 2.5, 0.3], c: '#2a9150', c2: '#4fbf70', sub: 1 }, { k: 'icos', d: 2.0, p: [-0.9, 2.7, -0.4], c: '#2f9e55', c2: '#58c878', sub: 1 },
      ]),
      // çam
      build(sc, 't1', [
        { k: 'cyl', dt: 0.26, db: 0.42, h: 1.8, p: [0, 0.9, 0], c: '#6b4326', c2: '#8a5a32' },
        { k: 'cone', db: 3.2, dt: 0.3, h: 2.4, p: [0, 2.2, 0], c: '#1f7a4d', c2: '#34a56a', seg: 8 }, { k: 'cone', db: 2.5, dt: 0.2, h: 2.1, p: [0, 3.5, 0], c: '#24865a', c2: '#3cb374', seg: 8 }, { k: 'cone', db: 1.7, dt: 0.0, h: 1.9, p: [0, 4.7, 0], c: '#2a9560', c2: '#46c27c', seg: 8 },
      ]),
      // altın bozkır ağacı (kayın)
      build(sc, 't2', [
        { k: 'cyl', dt: 0.22, db: 0.4, h: 2.8, p: [0, 1.4, 0], c: '#efe6d2', c2: '#c9bda6' },
        { k: 'icos', d: 2.6, s: [1.1, 0.85, 1.1], p: [0, 3.3, 0], c: '#e8a02e', c2: '#ffd35a', sub: 1 }, { k: 'icos', d: 1.8, p: [1.0, 2.7, 0.2], c: '#d98a2a', c2: '#f4bd48', sub: 1 },
      ]),
    ];
    const groups: { x: number; z: number; s: number; ry: number; tint: [number, number, number] }[][] = [[], [], []];
    const r = mulberry32(21);
    for (const o of obs) {
      const g = regionAt(o.x, o.z); const t = 0.9 + r() * 0.2;
      if (g && g.map === 'otlak') { groups[o.v].push({ x: o.x, z: o.z, s: o.s, ry: r() * 6.28, tint: [t * 1.05, t * 1.12, t * 0.95] }); continue; }
      if (g && g.map === 'erlik') { groups[1].push({ x: o.x, z: o.z, s: o.s * 1.1, ry: r() * 6.28, tint: [t * 1.25, t * 0.62, t * 1.35] }); continue; }
      const d = Math.hypot(o.x, o.z); const far = d > 110;
      const v = d < 60 ? (o.v === 2 ? 0 : o.v % 2) : far ? (o.v === 0 ? 1 : 1) : o.v;
      groups[v === 2 && d < 55 ? 0 : v].push({ x: o.x, z: o.z, s: o.s * 1.0, ry: r() * 6.28, tint: [t, t, far ? t * 1.1 : t] });
    }
    groups.forEach((g, i) => {
      if (!g.length) { tpl[i].dispose(); return; }
      const m = emitTransformedCopies(sc, 'trees' + i, tpl[i], g); m.material = this.mat; addOutline(m, sc); tpl[i].dispose(); this.root.addChild(m);
    });
  }
  private makeRocks() {
    const sc = this.scene; const obs = worldObstacles().filter((o) => o.kind === 'rock'); const r = mulberry32(33);
    const tpl = build(sc, 'rock', [
      { k: 'icos', d: 2.4, s: [1, 0.72, 0.9], p: [0, 0.8, 0], c: '#8a8aa6', c2: '#b9b9d2', sub: 1 }, { k: 'icos', d: 1.5, s: [1, 0.8, 1], p: [0.9, 0.5, 0.5], c: '#7a7a98', c2: '#a4a4c0', sub: 1 },
    ]);
    const xf = obs.map((o) => { const t = 0.88 + r() * 0.24; const g = regionAt(o.x, o.z);
      if (g && g.id !== 'bozkir') { const pal = MAPS[g.map].palette.ground2; const c = [1, 3, 5].map((i) => Math.min(1.5, parseInt(pal.slice(i, i + 2), 16) / 255 * 2.3)); return { x: o.x, z: o.z, s: o.s * 0.9, ry: r() * 6.28, tint: [c[0] * t, c[1] * t, c[2] * t] as [number, number, number] }; }
      const far = Math.hypot(o.x, o.z) > 110; return { x: o.x, z: o.z, s: o.s * 0.9, ry: r() * 6.28, tint: [far ? t * 1.05 : t, far ? t * 0.88 : t, far ? t * 1.15 : t] as [number, number, number] }; });
    const m = emitTransformedCopies(sc, 'rocks', tpl, xf); m.material = this.mat; addOutline(m, sc); tpl.dispose(); this.root.addChild(m);
  }
  private makeGrass() {
    const sc = this.scene; const r = mulberry32(44); const obs = worldObstacles();
    const mk = (c1: string, c2: string, h: number) => build(sc, 'tuft', [0, 1, 2, 3].map((i): PartSpec => ({ k: 'cone', db: 0.16, dt: 0, h: h * (0.7 + (i % 2) * 0.35), p: [Math.cos(i * 1.6) * 0.14, h * 0.4, Math.sin(i * 1.6) * 0.14], r: [Math.sin(i * 1.6) * 0.25, 0, -Math.cos(i * 1.6) * 0.25], c: c1, c2, seg: 4 })));
    const tg = mk('#4fa84a', '#a8e060', 0.8); const tgold = mk('#c99a3a', '#f2d36a', 0.9); const tpurple = mk('#7a4f9a', '#c49bff', 0.9);
    const xg: { x: number; z: number; s: number; ry: number; tint: [number, number, number] }[] = [], xa: typeof xg = [], xp: typeof xg = [];
    for (let i = 0; i < 4200; i++) {
      const a = r() * 6.283; const d = 4 + Math.sqrt(r()) * (WORLD_R + 6); const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (d < 14 && d > 0) continue; if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 0.4) ** 2)) continue;
      const t = 0.85 + r() * 0.3; const e = { x, z, s: 0.7 + r() * 0.9, ry: r() * 6.28, tint: [t, t, t] as [number, number, number] };
      (d < 36 ? xg : d > 115 ? xp : xa).push(e);
    }
    for (const [tpl, xf, nm] of [[tg, xg, 'g0'], [tgold, xa, 'g1'], [tpurple, xp, 'g2']] as const) {
      const m = emitTransformedCopies(sc, nm, tpl, xf); m.material = this.mat; tpl.dispose(); this.root.addChild(m);
    }
    // çiçekler (hub çevresi)
    const specs: PartSpec[] = []; const cols = ['#ff6b8a', '#ffd166', '#ffffff', '#8fb8ff', '#ff9f43'];
    for (let i = 0; i < 160; i++) {
      const a = r() * 6.283; const d = 15 + r() * 25; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (obs.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (o.r + 0.8) ** 2)) continue;
      specs.push({ k: 'cyl', d: 0.04, h: 0.45, p: [x, 0.22, z], c: '#3f9a4a' }, { k: 'sphere', d: 0.26, s: [1, 0.6, 1], p: [x, 0.5, z], c: cols[i % cols.length], seg: 5 });
    }
    const f = build(sc, 'flowers', specs); f.material = this.mat; this.root.addChild(f);
  }

  stones: { n: number; x: number; z: number; glow: Mesh; mat: ShaderMaterial; seen: boolean }[] = [];
  /** Balbal taşları: gizemin bozkıra dağılmış ipuçları. Okunmamışlar mavi parlar, okunanlar solar. */
  private makeStones() {
    const sc = this.scene;
    for (const st of genStones()) {
      const body: PartSpec[] = [
        { k: 'box', w: 2.2, h: 0.45, dp: 2.2, p: [0, 0.22, 0], c: '#8d8aa8', c2: '#b4b1cc' }, { k: 'cyl', db: 1.5, dt: 1.0, h: 2.8, p: [0, 1.85, 0], c: '#8e8bb0', c2: '#c9c6e4', seg: 8 },
        { k: 'sphere', d: 1.25, s: [1, 1.05, 0.95], p: [0, 3.65, 0], c: '#b4b1cc', c2: '#d8d6ee' }, { k: 'torus', d: 1.25, th: 0.14, p: [0, 2.2, 0], c: '#6f6c90' },
        { k: 'cyl', d: 0.34, h: 0.3, p: [0.2, 2.55, 0.74], c: '#6f6c90' }, { k: 'cyl', d: 0.4, h: 0.12, p: [0.2, 2.74, 0.74], c: '#cfc9a0', gloss: 0.5 },
        { k: 'box', w: 0.22, h: 0.06, dp: 0.1, p: [-0.28, 3.68, 0.58], c: '#4a4766' }, { k: 'box', w: 0.22, h: 0.06, dp: 0.1, p: [0.28, 3.68, 0.58], c: '#4a4766' }, { k: 'box', w: 0.34, h: 0.05, dp: 0.1, p: [0, 3.4, 0.6], c: '#4a4766' },
      ];
      const m = build(sc, 'balbal' + st.n, body); m.material = this.mat; m.position.set(st.x, 0, st.z); m.rotation.y = Math.atan2(-st.x, -st.z); addOutline(m, sc).parent = m; this.root.addChild(m);
      const gm = toonMaterial(sc, { vertexColors: true, emissive: new Color3(0.2, 0.7, 1), rim: 0 });
      const glow = build(sc, 'balbalglow' + st.n, [{ k: 'box', w: 0.5, h: 0.07, dp: 0.06, p: [0, 1.9, 0.78], c: '#7fe0ff' }, { k: 'box', w: 0.07, h: 0.5, dp: 0.06, p: [0, 1.75, 0.78], c: '#7fe0ff' }, { k: 'box', w: 0.3, h: 0.06, dp: 0.06, p: [0, 1.5, 0.74], c: '#7fe0ff' },
        { k: 'sphere', d: 0.12, p: [-0.28, 3.68, 0.64], c: '#9fefff' }, { k: 'sphere', d: 0.12, p: [0.28, 3.68, 0.64], c: '#9fefff' }]);
      glow.material = gm; glow.parent = m; this.stones.push({ n: st.n, x: st.x, z: st.z, glow, mat: gm, seen: false });
    }
  }
  setStonesSeen(seen: Set<number>) { for (const s of this.stones) { s.seen = seen.has(s.n); s.mat.setColor3('uEmissive', s.seen ? new Color3(0.05, 0.12, 0.16) : new Color3(0.2, 0.7, 1)); } }

  /** Ağaç, kaya ve yapıların altına yumuşak gölge yaması (tek birleşik mesh, alfa karışımlı). */
  private makePropShadows() {
    const obs = worldObstacles(); const P: number[] = [], U: number[] = [], I: number[] = []; let n = 0;
    const disc = (x: number, z: number, rx: number, rz: number) => {
      const seg = 14; const base = n; P.push(x + 0.5, 0.045, z - 0.6); U.push(0, 0); n++;
      for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; P.push(x + 0.5 + Math.cos(a) * rx, 0.045, z - 0.6 + Math.sin(a) * rz); U.push(Math.cos(a), Math.sin(a)); n++; }
      for (let i = 0; i < seg; i++) I.push(base, base + 1 + i, base + 1 + ((i + 1) % seg));
    };
    for (const o of obs) { const k = o.kind === 'tree' ? 2.4 * o.s : o.kind === 'rock' ? 1.9 * o.s : o.r + 1.8; disc(o.x, o.z, k, k * 0.9); }
    for (const b of BOYS) disc(HUB.banners[b].x, HUB.banners[b].z, 1.2, 1.1);
    for (const g of HUB.guards) disc(g.x, g.z, 1.6, 1.5);
    const m = new Mesh('propShadows', this.scene); const vd = new VertexData();
    vd.positions = new Float32Array(P); vd.uvs = new Float32Array(U); vd.indices = new Uint32Array(I); vd.normals = new Float32Array(P.length).map((_, i) => (i % 3 === 1 ? 1 : 0)); vd.applyToMesh(m);
    const mat = new ShaderMaterial('propShadow', this.scene, 'propshadow', { attributes: ['position', 'uv'], uniforms: ['worldViewProjection'], needAlphaBlending: true });
    mat.backFaceCulling = false; mat.disableDepthWrite = true; mat.alphaMode = Engine.ALPHA_COMBINE; m.material = mat; m.isPickable = false; m.alwaysSelectAsActiveMesh = true; this.root.addChild(m);
  }

  // ───────────────────────── Boy yurdu (hub) ─────────────────────────
  private yurt(x: number, z: number, o: { r: number; wall: number; roof: string; roof2: string; stripe: string; stripe2: string; flag?: string; door?: number }): PartSpec[] {
    const { r, wall } = o; const s: PartSpec[] = [];
    s.push({ k: 'cyl', d: r * 2, h: wall, p: [x, wall / 2, z], c: '#f6ecd2', c2: '#e8d7b0', seg: 18 });
    s.push({ k: 'cone', db: r * 2.35, dt: r * 0.28, h: r * 0.95, p: [x, wall + r * 0.47, z], c: o.roof, c2: o.roof2, seg: 18 });
    s.push({ k: 'cyl', d: r * 0.34, h: r * 0.16, p: [x, wall + r * 0.98, z], c: '#7a4f2e' });
    for (let i = 0; i < 3; i++) s.push({ k: 'torus', d: r * 2.02 + i * 0.01, th: 0.14, p: [x, wall * (0.22 + i * 0.28), z], c: i % 2 ? o.stripe2 : o.stripe, seg: 28 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s.push({ k: 'box', w: 0.5, h: 0.5, dp: 0.1, p: [x + Math.cos(a) * (r + 0.02), wall * 0.62, z + Math.sin(a) * (r + 0.02)], r: [0, -a + Math.PI / 2, Math.PI / 4], c: i % 2 ? o.stripe : o.stripe2 }); }
    const da = o.door ?? Math.PI / 2;
    s.push({ k: 'box', w: r * 0.62, h: wall * 0.78, dp: 0.18, p: [x + Math.cos(da) * (r + 0.05), wall * 0.4, z + Math.sin(da) * (r + 0.05)], r: [0, -da + Math.PI / 2, 0], c: '#5a3a24', c2: '#7a5030' });
    s.push({ k: 'torus', d: r * 0.68, th: 0.1, p: [x + Math.cos(da) * (r + 0.1), wall * 0.78, z + Math.sin(da) * (r + 0.1)], r: [0, -da + Math.PI / 2, 0], c: o.stripe2 });
    if (o.flag) { s.push({ k: 'cyl', d: 0.08, h: r * 0.9, p: [x, wall + r * 1.35, z], c: '#7a4f2e' }, { k: 'box', w: 1.0, h: 0.55, dp: 0.04, p: [x + 0.5, wall + r * 1.65, z], c: o.flag }); }
    return s;
  }
  makeHub() {
    const sc = this.scene; const specs: PartSpec[] = [];
    // Otağ (büyük, renkli)
    specs.push(...this.yurt(HUB.otag.x, HUB.otag.z, { r: HUB.otag.r, wall: 3.4, roof: '#d63a3a', roof2: '#ff8a5a', stripe: '#2f6fd6', stripe2: '#f2c14e', flag: '#2f6fd6', door: Math.atan2(5, 15) }));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; specs.push({ k: 'cone', db: 0.7, dt: 0.1, h: 3.0, p: [HUB.otag.x + Math.cos(a) * 3.0, 5.3, HUB.otag.z + Math.sin(a) * 3.0], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], c: i % 2 ? '#f2c14e' : '#2f6fd6', c2: '#ffffff', seg: 4 }); }
    // süs yurtlar
    const deco = [[-24, 10, '#3aa56a', '#8fe0a8'], [24, 8, '#4a7fd6', '#9fc4ff'], [-27, -4, '#b46bd6', '#e0b8ff'], [27, -14, '#e0903a', '#ffd08a'], [-6, -26, '#3aa5a5', '#9fe8e0'], [22, 22, '#d6527a', '#ffa8c0'], [-22, 24, '#d6b33a', '#fff08a']] as [number, number, string, string][];
    deco.forEach(([x, z, c1, c2], i) => specs.push(...this.yurt(x, z, { r: 3.0, wall: 2.4, roof: c1, roof2: c2, stripe: '#f2c14e', stripe2: '#d63a3a', flag: i % 2 ? '#d63a3a' : '#2f6fd6', door: Math.atan2(-z, -x) })));
    // Demirhane (açık çadır + ocak + örs)
    const D = HUB.demirhane;
    for (const [dx, dz] of [[-3.4, -3], [3.4, -3], [-3.4, 3], [3.4, 3]]) specs.push({ k: 'cyl', d: 0.34, h: 4.2, p: [D.x + dx, 2.1, D.z + dz], c: '#6b4326', c2: '#8a5a32' });
    specs.push({ k: 'cone', db: 10.5, dt: 0.6, h: 2.4, p: [D.x, 5.4, D.z], c: '#b5482a', c2: '#e8744a', seg: 4, r: [0, Math.PI / 4, 0] });
    specs.push({ k: 'torus', d: 9.3, th: 0.2, p: [D.x, 4.2, D.z], c: '#f2c14e', seg: 4, r: [0, Math.PI / 4, 0] });
    specs.push({ k: 'cyl', dt: 1.6, db: 1.9, h: 1.0, p: [D.x + 1.6, 0.5, D.z - 1.4], c: '#5b5870', c2: '#7a7894' }, { k: 'cyl', d: 1.3, h: 0.1, p: [D.x + 1.6, 1.02, D.z - 1.4], c: '#2a2432' });
    specs.push({ k: 'box', w: 1.5, h: 0.5, dp: 0.7, p: [D.x - 1.3, 1.0, D.z - 0.5], c: '#4d4a60', gloss: 0.6 }, { k: 'box', w: 0.9, h: 0.7, dp: 0.6, p: [D.x - 1.3, 0.35, D.z - 0.5], c: '#6b4326' }, { k: 'cone', db: 0.5, dt: 0.1, h: 0.5, p: [D.x - 2.3, 1.22, D.z - 0.5], r: [0, 0, Math.PI / 2], c: '#4d4a60', gloss: 0.6 });
    specs.push({ k: 'cyl', d: 1.0, h: 0.2, p: [D.x - 3.2, 1.1, D.z + 1.2], r: [0, 0, Math.PI / 2], c: '#9aa7b8', gloss: 0.7 });
    for (const [dx, dz] of [[2.4, 1.6], [-1.8, 2.2]]) specs.push({ k: 'cyl', d: 0.14, h: 1.6, p: [D.x + dx, 0.12, D.z + dz], r: [0, 0, Math.PI / 2], c: '#8a5a32' });
    // ateş çukuru + taşlar
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; specs.push({ k: 'icos', d: 0.85, s: [1, 0.7, 1], p: [Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5], c: '#8a8aa6', c2: '#b9b9d2', sub: 0 }); }
    specs.push({ k: 'cyl', d: 0.2, h: 1.7, p: [0, 0.34, 0], r: [0, 0, Math.PI / 2], c: '#6b4326' }, { k: 'cyl', d: 0.2, h: 1.7, p: [0, 0.34, 0], r: [0, 1.57, Math.PI / 2], c: '#7a5030' });
    // Yazıt taşı (Orhun esinli stel)
    const S = HUB.stele;
    specs.push({ k: 'box', w: 3.2, h: 0.5, dp: 3.2, p: [S.x, 0.25, S.z], c: '#8a8aa6' }, { k: 'box', w: 2.6, h: 0.4, dp: 2.6, p: [S.x, 0.7, S.z], c: '#9a9ab6' });
    specs.push({ k: 'box', w: 1.6, h: 5.6, dp: 1.0, p: [S.x, 3.5, S.z], c: '#6f6a8a', c2: '#a49fc4' }, { k: 'cone', db: 1.7, dt: 0.5, h: 0.9, p: [S.x, 6.75, S.z], seg: 4, r: [0, Math.PI / 4, 0], c: '#a49fc4' });
    // Boy bayrak direkleri (bez ayrıca)
    for (const b of BOYS) { const B = HUB.banners[b]; specs.push({ k: 'cyl', d: 0.2, h: 7.5, p: [B.x, 3.75, B.z], c: '#6b4326', c2: '#8a5a32' }, { k: 'sphere', d: 0.5, p: [B.x, 7.6, B.z], c: '#f2c14e', gloss: 0.6 }); }
    // muhafız postları
    for (const g of HUB.guards) specs.push({ k: 'cyl', d: 2.0, h: 0.5, p: [g.x, 0.25, g.z], c: '#8a8aa6', c2: '#b9b9d2' }, { k: 'cyl', d: 0.24, h: 1.5, p: [g.x + 1.2, 0.9, g.z], c: '#6b4326' }, { k: 'sphere', d: 0.4, p: [g.x + 1.2, 1.8, g.z], c: '#ff9f43', gloss: 0.5 });
    // mesireli kenar çitleri
    const m = build(sc, 'hub', specs); m.material = this.mat; addOutline(m, sc); this.root.addChild(m);

    // alev (ateş çukuru) — parlayan
    const fm = toonMaterial(sc, { vertexColors: true, emissive: new Color3(0.9, 0.5, 0.1), rim: 0 });
    for (const [k, h, c1, c2, s] of [['a', 2.2, '#ff6a1a', '#ffd166', 0.0], ['b', 1.6, '#ff9f1a', '#fff0a0', 0.8], ['c', 1.3, '#ff6a1a', '#ffd166', 2.1]] as const) {
      const f = build(sc, 'flame' + k, [{ k: 'cone', db: 0.9 - s * 0.1, dt: 0, h, p: [0, h / 2, 0], c: c1, c2: c2, seg: 8 }]); f.material = fm; f.position.set(Math.cos(s * 3) * 0.3, 0.3, Math.sin(s * 3) * 0.3); f.metadata = { ph: s }; this.flames.push(f);
    }
    // otağ bayrağı ve demirhane parıltısı
    const forge = build(sc, 'forge', [{ k: 'sphere', d: 1.1, s: [1, 0.35, 1], p: [D.x + 1.6, 1.05, D.z - 1.4], c: '#ff5a1a', c2: '#ffd166' }]); forge.material = fm;
    // boy bayrakları (emblemli bez)
    for (const b of BOYS) this.banner(b);
    // yazıt taşı rünleri (parlak)
    this.steleMat = toonMaterial(sc, { vertexColors: true, emissive: new Color3(0.1, 0.5, 0.9), rim: 0 });
    const runeSpecs: PartSpec[] = [];
    for (let i = 0; i < 18; i++) { const y = 1.4 + (i % 9) * 0.5; const side = i < 9 ? 0 : 1; const w = 0.26 + ((i * 7) % 5) * 0.05;
      const o = side === 0 ? { p: [S.x - 0.2, y, S.z + 0.52] as [number, number, number], r: [0, 0, 0] as [number, number, number] } : { p: [S.x + 0.2, y, S.z - 0.52] as [number, number, number], r: [0, 0, 0] as [number, number, number] };
      runeSpecs.push({ k: 'box', w, h: 0.07, dp: 0.04, p: o.p, c: '#7fe0ff' }, { k: 'box', w: 0.07, h: 0.34, dp: 0.04, p: [o.p[0] + (i % 2 ? 0.1 : -0.1), o.p[1], o.p[2]], c: '#7fe0ff' }); }
    const rn = build(sc, 'runes', runeSpecs); rn.material = this.steleMat; this.runes.push(rn);
  }
  private banner(b: Boy) {
    const B = HUB.banners[b]; const sc = this.scene; const bc = BOY_COLORS[b];
    const tex = new DynamicTexture('banner' + b, { width: 256, height: 384 }, sc, true); const c = tex.getContext() as unknown as CanvasRenderingContext2D;
    const g = c.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, bc.main); g.addColorStop(1, bc.dark); c.fillStyle = g; c.fillRect(0, 0, 256, 384);
    c.fillStyle = bc.accent; c.fillRect(0, 0, 256, 22); c.fillRect(0, 362, 256, 22);
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f2c14e' : bc.accent; c.beginPath(); c.moveTo(i * 32, 22); c.lineTo(i * 32 + 16, 46); c.lineTo(i * 32 + 32, 22); c.fill(); }
    drawEmblem(c, b, 128, 190, 150, bc.accent, '#1a1230'); tex.update();
    const mat = new StandardMaterial('bm' + b, sc); mat.emissiveTexture = tex; mat.diffuseColor = Color3.Black(); mat.specularColor = Color3.Black(); mat.backFaceCulling = false; mat.disableLighting = true;
    const piv = new TransformNode('bannerP' + b, sc); piv.position.set(B.x, 7.0, B.z);
    const plane = MeshBuilder.CreatePlane('bn', { width: 2.2, height: 3.3 }, sc); plane.material = mat; plane.parent = piv; plane.position.set(1.2, -1.7, 0); plane.isPickable = false;
    this.flagPivots.push(piv);
  }


  /** Bozkır dışındaki alanlar: zemin, kapı taşı, kamp ateşi (hepsi aynı sahnede, uzak merkezlerde; sis uzaktakini gizler). */
  private makeRegions() {
    const sc = this.scene;
    for (const g of REGIONS) {
      if (g.id === 'bozkir') continue; const def = MAPS[g.map]; const dun = def.kind === 'dungeon';
      const d = MeshBuilder.CreateDisc('rground' + g.id, { radius: g.r + 40, tessellation: 64 }, sc);
      d.rotation.x = Math.PI / 2; d.bakeCurrentTransformIntoVertices(); d.position.set(g.cx, 0, g.cz);
      const mat = new ShaderMaterial('rground' + g.id, sc, 'rground', { attributes: ['position'], uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uFogColor', 'uFog', 'uTime', 'uC', 'uA', 'uB', 'uR', 'uSafe', 'uKind'] });
      mat.setColor3('uFogColor', FOG_COLOR); mat.setVector2('uFog', { x: dun ? 40 : 110, y: dun ? 140 : 300 } as never); mat.setFloat('uTime', 0);
      mat.setVector2('uC', { x: g.cx, y: g.cz } as never); mat.setColor3('uA', Color3.FromHexString(def.palette.ground)); mat.setColor3('uB', Color3.FromHexString(def.palette.ground2));
      mat.setFloat('uR', g.r); mat.setFloat('uSafe', g.safeR); mat.setFloat('uKind', dun ? 1 : g.map === 'erlik' ? 2 : 0);
      mat.backFaceCulling = false; d.material = mat; d.isPickable = true; this.grounds.push(d); this.mats.push(mat);
      if (g.safeR > 0) { this.makeGate(g.cx, g.cz - 4, def.palette.tree); this.makeCampFire(g.cx, g.cz); }
    }
    this.makeGate(HUB.gate.x, HUB.gate.z, '#7fe0ff');
  }
  /** Kapı taşı: iki sütun, lento ve parlayan halka */
  private makeGate(x: number, z: number, glowHex: string) {
    const sc = this.scene; const rot = Math.atan2(-x, -z);
    const body = build(sc, 'gate', [
      { k: 'box', w: 6.4, h: 0.5, dp: 3.4, p: [0, 0.25, 0], c: '#8d8aa8', c2: '#b4b1cc' },
      { k: 'cyl', db: 1.1, dt: 0.9, h: 5.4, p: [-2.4, 3.1, 0], c: '#8e8bb0', c2: '#c9c6e4', seg: 8 }, { k: 'cyl', db: 1.1, dt: 0.9, h: 5.4, p: [2.4, 3.1, 0], c: '#8e8bb0', c2: '#c9c6e4', seg: 8 },
      { k: 'box', w: 6.6, h: 0.9, dp: 1.3, p: [0, 6.2, 0], c: '#a09cc0', c2: '#cfcce8' }, { k: 'sphere', d: 1.0, p: [0, 7.1, 0], c: '#b4b1cc', c2: '#d8d6ee' },
    ]);
    body.material = this.mat; body.position.set(x, 0, z); body.rotation.y = rot; addOutline(body, sc).parent = body; this.root.addChild(body);
    const gm = toonMaterial(sc, { vertexColors: true, emissive: Color3.FromHexString(glowHex), rim: 0 });
    const ring = build(sc, 'gatering', [{ k: 'torus', d: 4.0, th: 0.28, p: [0, 3.3, 0], r: [Math.PI / 2, 0, 0], c: glowHex }, { k: 'sphere', d: 3.4, s: [1, 1, 0.08], p: [0, 3.3, 0], c: glowHex, c2: '#ffffff' }]);
    ring.material = gm; ring.position.set(x, 0, z); ring.rotation.y = rot; ring.metadata = { gate: true, ph: x }; this.gates.push(ring);
  }
  gates: Mesh[] = [];
  private makeCampFire(x: number, z: number) {
    const fm = toonMaterial(this.scene, { vertexColors: true, emissive: new Color3(0.9, 0.5, 0.1), rim: 0 });
    const base = build(this.scene, 'campbase', [{ k: 'cyl', db: 2.4, dt: 2.0, h: 0.5, p: [0, 0.25, 0], c: '#6a5a4a', c2: '#8a7a6a', seg: 10 }]); base.material = this.mat; base.position.set(x, 0, z); this.root.addChild(base);
    for (const [h, c1, c2, s] of [[2.0, '#ff6a1a', '#ffd166', 0], [1.4, '#ff9f1a', '#fff0a0', 0.8]] as const) {
      const f = build(this.scene, 'cflame', [{ k: 'cone', db: 0.9 - s * 0.1, dt: 0, h, p: [0, h / 2, 0], c: c1, c2, seg: 8 }]); f.material = fm; f.position.set(x + Math.cos(s * 3) * 0.3, 0.5, z + Math.sin(s * 3) * 0.3); f.metadata = { ph: s }; this.flames.push(f);
    }
  }
  /** Bulunulan haritaya göre gökyüzü ve sis rengini yumuşakça değiştirir */
  setAtmosphere(map: MapId) { this.atmo = map; }
  private stepAtmosphere(dt: number) {
    const pal = MAPS[this.atmo].palette; const k = Math.min(1, dt * 1.8);
    const tgt = this.atmo === 'bozkir' ? { top: Color3.FromHexString(SKY.top), mid: Color3.FromHexString(SKY.mid), hor: Color3.FromHexString(SKY.horizon), fog: new Color3(0.93, 0.84, 0.64) }
      : { top: Color3.FromHexString(pal.sky).scale(0.55), mid: Color3.FromHexString(pal.sky), hor: Color3.FromHexString(pal.fog), fog: Color3.FromHexString(pal.fog) };
    const lerp = (a: Color3, b: Color3) => { a.r += (b.r - a.r) * k; a.g += (b.g - a.g) * k; a.b += (b.b - a.b) * k; };
    lerp(this.skyTop, tgt.top); lerp(this.skyMid, tgt.mid); lerp(this.skyHor, tgt.hor); lerp(FOG_COLOR, tgt.fog);
    this.skyMat.setColor3('uTop', this.skyTop); this.skyMat.setColor3('uMid', this.skyMid); this.skyMat.setColor3('uHor', this.skyHor);
    this.scene.clearColor.r = FOG_COLOR.r; this.scene.clearColor.g = FOG_COLOR.g; this.scene.clearColor.b = FOG_COLOR.b;
  }

  setInscriptions(n: number) { this.steleMat.setColor3('uEmissive', new Color3(0.1 + n * 0.05, 0.35 + n * 0.12, 0.7 + n * 0.1)); }

  update(dt: number) {
    this.time += dt; const t = this.time;
    for (const m of this.mats) { m.setFloat('uTime', t); }
    this.clouds.rotation.y += dt * 0.004; this.stepAtmosphere(dt);
    for (const g of this.gates) { const k = 0.7 + 0.3 * Math.sin(t * 2.4 + (g.metadata.ph as number)); g.scaling.set(1, 1, 1); (g.material as ShaderMaterial).setColor3('uEmissive', new Color3(0.25 * k + 0.1, 0.8 * k, 1 * k)); }
    for (const f of this.flames) { const ph = (f.metadata?.ph ?? 0) as number; f.scaling.y = 0.85 + Math.sin(t * 9 + ph * 3) * 0.2 + Math.sin(t * 17 + ph) * 0.08; f.scaling.x = f.scaling.z = 0.92 + Math.sin(t * 7 + ph) * 0.1; f.rotation.y = t * 0.8; }
    this.flagPivots.forEach((p, i) => { p.rotation.y = Math.sin(t * 1.6 + i) * 0.12; });
    this.steleMat.setColor3('uFlashColor', Color3.White());
    for (const s of this.stones) if (!s.seen) { const k = 0.65 + 0.35 * Math.sin(t * 2.2 + s.n); s.mat.setColor3('uEmissive', new Color3(0.2 * k, 0.7 * k, 1 * k)); }
  }
}

export const HUB_RADIUS = HUB_R;
