import { Client, Room } from 'colyseus.js';
import type { Boy } from '@shared/game';
import type { ChatMsg, JoinOptions, Me, RpcOp, RpcRes, Snapshot, Welcome } from '@shared/protocol';

export function serverUrl(): string {
  const q = new URLSearchParams(location.search).get('server'); if (q) return q;
  if (location.port === '5173') return `ws://${location.hostname}:2567`;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
}
const httpBase = () => serverUrl().replace(/^ws/, 'http');

type Handlers = { snap: (s: Snapshot) => void; me: (m: Me) => void; chat: (c: ChatMsg) => void; welcome: (w: Welcome) => void; close: (code: number) => void; duelInvite: (from: string) => void; camps: (occ: number[]) => void };

export class Net {
  room!: Room; welcome!: Welcome; h: Partial<Handlers> = {};
  /** sunucu saati − istemci saati (ms); geri sayımlar sunucu zaman damgalarına göre hesaplanır */
  offset = 0; now() { return Date.now() + this.offset; }
  private seq = 1; private pend = new Map<number, (r: RpcRes) => void>(); pingMs = 0; private pingTimer = 0;
  on<K extends keyof Handlers>(k: K, f: Handlers[K]) { this.h[k] = f; }

  async connect(name: string, password: string, create: Boy | null, lang: 'tr' | 'en') {
    const client = new Client(serverUrl());
    const opts: JoinOptions = { name, password, lang, create: create ? { boy: create } : undefined };
    let hint: string | null = null;
    if (!create) { try { const r = await fetch(`${httpBase()}/api/layer?name=${encodeURIComponent(name)}`).then((x) => x.json()); hint = r.roomId; } catch { /* */ } }
    try {
      this.room = hint ? await client.joinById(hint, opts).catch(() => client.joinOrCreate('world', opts)) : await client.joinOrCreate('world', opts);
    } catch (e) {
      const msg = (e as { message?: string }).message ?? 'net';
      throw new Error(/^[a-z_]+$/.test(msg) ? msg : msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network') ? 'net' : msg);
    }
    const r = this.room;
    r.onMessage('snap', (s: Snapshot) => this.h.snap?.(s)); r.onMessage('me', (m: Me) => this.h.me?.(m));
    r.onMessage('chat', (c: ChatMsg) => this.h.chat?.(c)); r.onMessage('welcome', (w: Welcome) => { this.welcome = w; this.offset = w.serverTime - Date.now(); this.h.welcome?.(w); });
    r.onMessage('rpcr', (x: RpcRes) => { this.pend.get(x.id)?.(x); this.pend.delete(x.id); });
    r.onMessage('camps', (o: number[]) => this.h.camps?.(o));
    r.onMessage('duelInvite', (m: { from: string }) => this.h.duelInvite?.(m.from));
    r.onMessage('pong', (m: { t: number; st: number }) => { this.pingMs = Math.round(performance.now() - m.t); this.offset = m.st + this.pingMs / 2 - Date.now(); });
    r.onMessage('*', () => {});
    r.onLeave((code) => { clearInterval(this.pingTimer); this.h.close?.(code); });
    this.pingTimer = window.setInterval(() => this.room.send('ping', { t: performance.now() }), 2000); this.room.send('ping', { t: performance.now() });
  }
  rpc(op: RpcOp, a: unknown = {}): Promise<RpcRes> {
    const id = this.seq++;
    return new Promise((res) => { this.pend.set(id, res); this.room.send('rpc', { id, op, a }); setTimeout(() => { if (this.pend.delete(id)) res({ id, ok: false, err: 'net' }); }, 8000); });
  }
  input(x: number, z: number) { this.room.send('in', { x, z }); }
  attack(on: boolean, focus?: number) { this.room.send('atk', { on, focus }); }
  skill(slot: number) { this.room.send('sk', slot); }
  chat(ch: string, text: string, to?: string) { this.room.send('chat', { ch, text, to }); }
  leave() { try { this.room.leave(); } catch { /* */ } }
}
