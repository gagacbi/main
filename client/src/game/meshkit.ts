import { Color4, Mesh, MeshBuilder, VertexBuffer, type Scene } from '@babylonjs/core';

export type V3 = [number, number, number];
export interface PartSpec {
  k: 'sphere' | 'cyl' | 'cone' | 'box' | 'torus' | 'cap' | 'disc' | 'icos';
  p?: V3; r?: V3; s?: V3; c: string; gloss?: number;
  d?: number; h?: number; dt?: number; db?: number; w?: number; dp?: number; th?: number; seg?: number; sub?: number;
  /** uç renk (dikey gradyan) */ c2?: string;
}

const hex = (h: string, a = 1) => { const c = Color4.FromHexString(h.length === 7 ? h + 'ff' : h); c.a = a; return c; };

function make(scene: Scene, s: PartSpec): Mesh {
  let m: Mesh;
  switch (s.k) {
    case 'sphere': m = MeshBuilder.CreateSphere('p', { diameter: s.d ?? 1, segments: s.seg ?? 10 }, scene); break;
    case 'icos': m = MeshBuilder.CreateIcoSphere('p', { radius: (s.d ?? 1) / 2, subdivisions: s.sub ?? 1, flat: false }, scene); break;
    case 'cyl': m = MeshBuilder.CreateCylinder('p', { height: s.h ?? 1, diameterTop: s.dt ?? s.d ?? 1, diameterBottom: s.db ?? s.d ?? 1, tessellation: s.seg ?? 12 }, scene); break;
    case 'cone': m = MeshBuilder.CreateCylinder('p', { height: s.h ?? 1, diameterTop: s.dt ?? 0, diameterBottom: s.db ?? s.d ?? 1, tessellation: s.seg ?? 12 }, scene); break;
    case 'box': m = MeshBuilder.CreateBox('p', { width: s.w ?? 1, height: s.h ?? 1, depth: s.dp ?? 1 }, scene); break;
    case 'torus': m = MeshBuilder.CreateTorus('p', { diameter: s.d ?? 1, thickness: s.th ?? 0.2, tessellation: s.seg ?? 20 }, scene); break;
    case 'cap': m = MeshBuilder.CreateCapsule('p', { radius: (s.d ?? 0.5) / 2, height: s.h ?? 1, tessellation: s.seg ?? 10, subdivisions: 3 }, scene); break;
    case 'disc': m = MeshBuilder.CreateDisc('p', { radius: (s.d ?? 1) / 2, tessellation: s.seg ?? 24 }, scene); break;
  }
  if (s.s) m.scaling.set(...s.s);
  if (s.r) m.rotation.set(...s.r);
  if (s.p) m.position.set(...s.p);
  m.bakeCurrentTransformIntoVertices();
  const n = m.getTotalVertices(); const col = new Float32Array(n * 4);
  const c1 = hex(s.c, 1 - (s.gloss ?? 0)); const c2 = s.c2 ? hex(s.c2, 1 - (s.gloss ?? 0)) : null;
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
  let miny = Infinity, maxy = -Infinity; if (c2) for (let i = 0; i < n; i++) { const y = pos[i * 3 + 1]; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  for (let i = 0; i < n; i++) {
    let c = c1; if (c2) { const t = (pos[i * 3 + 1] - miny) / Math.max(0.0001, maxy - miny); c = new Color4(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t, c1.a); }
    col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = c.a;
  }
  m.setVerticesData(VertexBuffer.ColorKind, col, false, 4);
  return m;
}

/** Parçaları tek bir tepe-renkli mesh'e birleştirir. */
export function build(scene: Scene, name: string, specs: PartSpec[]): Mesh {
  const meshes = specs.map((s) => make(scene, s));
  const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false)!;
  merged.name = name; merged.isPickable = false;
  return merged;
}
