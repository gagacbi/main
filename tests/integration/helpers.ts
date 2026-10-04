import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, Room } from 'colyseus.js';
import { mulberry32 } from '../../shared/rng';
import type { Boy } from '../../shared/game';
import type { Me, RpcOp, RpcRes, Snapshot, Welcome, ChatMsg } from '../../shared/protocol';
import { startGameServer, type GameServer, type StartOptions } from '../../server/index';

export interface TestServer extends GameServer { url: string; dir: string; stop: () => Promise<void>; advance: (ms: number) => void }
export async function startTestServer(o: StartOptions = {}): Promise<TestServer> {
  const dir = mkdtempSync(join(tmpdir(), 'kut-'));
  const s = await startGameServer({ port: 0, dbPath: join(dir, 'k.db'), serveClient: false, rng: mulberry32(7), ...o, cfg: { rateLimit: true, riftEvery: [9999, 9999], ...o.cfg } });
  return { ...s, url: `ws://localhost:${s.port}`, dir, advance: (ms) => s.ctx.clock.advance(ms), stop: async () => { await s.close(); rmSync(dir, { recursive: true, force: true }); } };
}

export const liveBots = new Set<Bot>();
export async function leaveAll() { for (const b of [...liveBots]) { if (b.name !== 'Capa') { try { await Promise.race([b.room.leave(), new Promise((r) => setTimeout(r, 400))]); } catch { /* */ } } liveBots.delete(b); } }

export class Bot {
  room!: Room; me!: Me; snap!: Snapshot; welcome!: Welcome; chat: ChatMsg[] = []; snaps = 0; id = 0;
  private pend = new Map<number, (r: RpcRes) => void>(); private seq = 1; evs: Snapshot['ev'] = [];
  constructor(public url: string, public name: string, public password = 'secret1') {}
  async join(create?: Boy, roomId?: string) {
    const c = new Client(this.url);
    const opts = { name: this.name, password: this.password, create: create ? { boy: create } : undefined };
    this.room = roomId ? await c.joinById(roomId, opts) : await c.joinOrCreate('world', opts);
    this.room.onMessage('me', (m: Me) => { this.me = m; });
    this.room.onMessage('snap', (s: Snapshot) => { this.snap = s; this.snaps++; this.evs.push(...s.ev); });
    this.room.onMessage('welcome', (w: Welcome) => { this.welcome = w; this.id = w.id; });
    this.room.onMessage('rpcr', (r: RpcRes) => { this.pend.get(r.id)?.(r); this.pend.delete(r.id); });
    this.room.onMessage('chat', (m: ChatMsg) => this.chat.push(m));
    this.room.onMessage('*', () => {});
    await this.until(() => !!this.me && !!this.snap && !!this.welcome);
    liveBots.add(this);
    return this;
  }
  rpc(op: RpcOp, a: unknown = {}): Promise<RpcRes> {
    const id = this.seq++;
    return new Promise((res) => { this.pend.set(id, res); this.room.send('rpc', { id, op, a }); });
  }
  send(t: string, m: unknown) { this.room.send(t, m); }
  async until(fn: () => boolean, ms = 8000, step = 25) {
    const t0 = Date.now();
    while (!fn()) { if (Date.now() - t0 > ms) throw new Error('timeout: ' + fn.toString()); await new Promise((r) => setTimeout(r, step)); }
  }
  sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
  async leave() { liveBots.delete(this); await this.room.leave(); }
  get pos() { return this.snap.you; }
}
export const uniq = (p: string) => p + Math.floor(Math.random() * 1e6).toString(36);

import type { World, Player, Mob } from '../../server/world';
import type { MobType } from '../../shared/game';
export const worldOf = (s: TestServer, b?: Bot): World => {
  for (const w of s.ctx.worlds) if (!b || w.players.has(b.id)) return w;
  throw new Error('no world');
};
export const playerOf = (s: TestServer, b: Bot): Player => worldOf(s, b).players.get(b.id)!;
export function mobAt(s: TestServer, b: Bot, type: MobType, lvl: number, dx = 2, dz = 0, hpMult = 1): Mob {
  const w = worldOf(s, b); const p = w.players.get(b.id)!;
  const m = w.makeMob(type, lvl, p.x + dx, p.z + dz, -1);
  m.hp = m.maxHp = Math.round(m.maxHp * hpMult);
  return m;
}
/** Oyuncuyu riskli bölgede bilinen bir noktaya taşı (test kurulumu). */
export function tp(s: TestServer, b: Bot, x: number, z: number) { const p = playerOf(s, b); p.x = x; p.z = z; }
export async function waitSnap(b: Bot, n = 2) { const t = b.snaps + n; await b.until(() => b.snaps >= t); }
