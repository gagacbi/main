import {
  Color3, Effect, Mesh, ShaderMaterial, VertexBuffer, type Scene,
} from '@babylonjs/core';

/** Cel-shade çekirdeği: bantlı ışık, serin gölge, kenar parlaması, sis; ters-gövde kontur. */

export const SKY = { top: '#16246a', mid: '#4d9be0', horizon: '#ffe2a3' };
export const FOG_COLOR = new Color3(0.93, 0.84, 0.64);
export const LIGHT_DIR = { x: -0.45, y: 0.8, z: 0.4 }; // IŞIĞA doğru yön

Effect.ShadersStore['toonVertexShader'] = `
precision highp float;
attribute vec3 position; attribute vec3 normal;
#ifdef VERTEXCOLOR
attribute vec4 color; varying vec4 vC;
#endif
uniform mat4 world; uniform mat4 worldViewProjection;
varying vec3 vN; varying vec3 vP;
void main(){
  vec4 wp = world * vec4(position, 1.0);
  vP = wp.xyz; vN = normalize(vec3(world * vec4(normal, 0.0)));
  #ifdef VERTEXCOLOR
  vC = color;
  #endif
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;
Effect.ShadersStore['toonFragmentShader'] = `
precision highp float;
varying vec3 vN; varying vec3 vP;
#ifdef VERTEXCOLOR
varying vec4 vC;
#endif
uniform vec3 cameraPosition;
uniform vec3 uColor; uniform vec3 uEmissive; uniform vec3 uFlashColor; uniform float uFlash;
uniform vec3 uLight; uniform vec3 uShadow; uniform vec3 uFogColor; uniform vec2 uFog; uniform float uRim; uniform float uAlpha;
void main(){
  vec3 n = normalize(vN);
  vec3 toCam = cameraPosition - vP; float dist = length(toCam); vec3 V = toCam / dist;
  vec3 L = normalize(uLight);
  float t = dot(n, L) * 0.5 + 0.5;
  float s1 = smoothstep(0.30, 0.34, t); float s2 = smoothstep(0.58, 0.62, t);
  #ifdef VERTEXCOLOR
  vec3 base = vC.rgb * uColor; float gloss = 1.0 - vC.a;
  #else
  vec3 base = uColor; float gloss = 0.0;
  #endif
  vec3 shadow = base * uShadow; vec3 mid = base * 0.84; vec3 lit = base * vec3(1.08, 1.03, 0.94);
  vec3 col = mix(shadow, mid, s1); col = mix(col, lit, s2);
  float rim = smoothstep(0.58, 0.68, 1.0 - max(dot(n, V), 0.0)) * (0.25 + 0.75 * t);
  col += vec3(1.0, 0.92, 0.78) * rim * 0.32 * uRim;
  vec3 H = normalize(L + V);
  col += vec3(1.0) * step(0.965, dot(n, H)) * gloss * 0.55;
  col = mix(col, uFlashColor, uFlash) + uEmissive;
  float f = clamp((dist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  col = mix(col, uFogColor, f * f);
  gl_FragColor = vec4(col, uAlpha);
}`;

Effect.ShadersStore['outlineVertexShader'] = `
precision highp float;
attribute vec3 position; attribute vec3 snormal;
uniform mat4 world; uniform mat4 worldViewProjection; uniform mat4 viewProjection;
uniform float uWidth; uniform vec2 uRes;
void main(){
  vec4 p = worldViewProjection * vec4(position, 1.0);
  vec3 wn = normalize(vec3(world * vec4(snormal, 0.0)));
  vec4 pn = viewProjection * vec4(wn, 0.0);
  vec2 d = vec2(pn.x * uRes.x, pn.y * uRes.y);
  float l = length(d); d = l > 0.0001 ? d / l : vec2(0.0);
  p.xy += d / uRes * 2.0 * uWidth * p.w;
  gl_Position = p;
}`;
Effect.ShadersStore['outlineFragmentShader'] = `
precision highp float;
uniform vec3 uOutline; uniform vec3 uFogColor; uniform vec2 uFog; uniform vec3 cameraPosition;
void main(){ gl_FragColor = vec4(uOutline, 1.0); }`;

export interface ToonOpts { color?: Color3 | string; vertexColors?: boolean; emissive?: Color3 | string; rim?: number; alpha?: number }
const toC3 = (c: Color3 | string | undefined, d: Color3) => (c === undefined ? d : typeof c === 'string' ? Color3.FromHexString(c) : c);

let counter = 0;
export function toonMaterial(scene: Scene, o: ToonOpts = {}): ShaderMaterial {
  const m = new ShaderMaterial('toon' + counter++, scene, 'toon', {
    attributes: o.vertexColors ? ['position', 'normal', 'color'] : ['position', 'normal'],
    uniforms: ['world', 'worldViewProjection', 'cameraPosition', 'uColor', 'uEmissive', 'uFlashColor', 'uFlash', 'uLight', 'uShadow', 'uFogColor', 'uFog', 'uRim', 'uAlpha'],
    defines: o.vertexColors ? ['VERTEXCOLOR'] : [],
    needAlphaBlending: (o.alpha ?? 1) < 1,
  });
  m.setColor3('uColor', toC3(o.color, Color3.White()));
  m.setColor3('uEmissive', toC3(o.emissive, Color3.Black()));
  m.setColor3('uFlashColor', Color3.White()); m.setFloat('uFlash', 0);
  m.setVector3('uLight', { x: LIGHT_DIR.x, y: LIGHT_DIR.y, z: LIGHT_DIR.z } as never);
  m.setColor3('uShadow', new Color3(0.5, 0.56, 0.82));
  m.setColor3('uFogColor', FOG_COLOR); m.setVector2('uFog', { x: 110, y: 300 } as never);
  m.setFloat('uRim', o.rim ?? 1); m.setFloat('uAlpha', o.alpha ?? 1);
  return m;
}

export function setFlash(m: ShaderMaterial, amount: number, color?: Color3) {
  m.setFloat('uFlash', amount); if (color) m.setColor3('uFlashColor', color);
}

let outlineMat: ShaderMaterial | null = null;
export function outlineMaterial(scene: Scene): ShaderMaterial {
  if (outlineMat && outlineMat.getScene() === scene) return outlineMat;
  const m = new ShaderMaterial('outline', scene, 'outline', {
    attributes: ['position', 'snormal'], uniforms: ['world', 'worldViewProjection', 'viewProjection', 'uWidth', 'uRes', 'uOutline', 'uFogColor', 'uFog', 'cameraPosition'],
  });
  m.setFloat('uWidth', 2.1); m.setColor3('uOutline', Color3.FromHexString('#1a1230'));
  m.setVector2('uRes', { x: 1280, y: 720 } as never);
  m.backFaceCulling = true; (m as unknown as { cullBackFaces: boolean }).cullBackFaces = false; // ön yüzleri kes, arka yüzleri çiz
  outlineMat = m;
  const eng = scene.getEngine();
  scene.onBeforeRenderObservable.add(() => {
    m.setVector2('uRes', { x: eng.getRenderWidth(), y: eng.getRenderHeight() } as never);
    m.setFloat('uWidth', Math.max(1.4, eng.getRenderWidth() / 640));
  });
  return m;
}

/** Konum eşleşmesine göre yumuşatılmış normal: sert kenarlı (kutu) parçalarda kontur çatlamasın. */
export function addSmoothNormals(mesh: Mesh) {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind); const nor = mesh.getVerticesData(VertexBuffer.NormalKind);
  if (!pos || !nor) return;
  const acc = new Map<string, [number, number, number]>(); const key = (i: number) => `${Math.round(pos[i * 3] * 400)},${Math.round(pos[i * 3 + 1] * 400)},${Math.round(pos[i * 3 + 2] * 400)}`;
  const n = pos.length / 3;
  for (let i = 0; i < n; i++) { const k = key(i); const a = acc.get(k) ?? [0, 0, 0]; a[0] += nor[i * 3]; a[1] += nor[i * 3 + 1]; a[2] += nor[i * 3 + 2]; acc.set(k, a); }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = acc.get(key(i))!; const l = Math.hypot(a[0], a[1], a[2]) || 1; out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l; }
  mesh.setVerticesData('snormal', out, false, 3);
}

/** Mesh'e kontur ekler (aynı geometriyi paylaşan çocuk mesh). */
export function addOutline(mesh: Mesh, scene: Scene): Mesh {
  addSmoothNormals(mesh);
  const o = mesh.clone(mesh.name + '_ol', mesh, true, false) as Mesh;
  o.material = outlineMaterial(scene); o.isPickable = false; o.alwaysSelectAsActiveMesh = mesh.alwaysSelectAsActiveMesh;
  o.renderingGroupId = mesh.renderingGroupId;
  return o;
}
