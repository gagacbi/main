import { Room, ServerError, type AuthContext, type Client } from '@colyseus/core';
import { HUB, TICK_HZ, type Boy } from '../shared/game';
import type { JoinOptions, RpcOp, Welcome } from '../shared/protocol';
import { NAME_RE, hashPassword, verifyPassword } from './auth';
import type { PlayerRow } from './db';
import { newPlayerData, type Ctx } from './types';
import { World, type Player } from './world';

interface Auth { row: PlayerRow }
const authFails = new Map<string, { n: number; at: number }>();

export class WorldRoom extends Room {
  maxClients = 150;
  ctx!: Ctx;
  world!: World;
  byClient = new Map<string, Player>();

  onCreate(opts: { ctx: Ctx }) {
    this.ctx = opts.ctx;
    this.maxClients = this.ctx.cfg.maxPerLayer;
    let layer = 1; const used = new Set([...this.ctx.worlds].map((w) => w.layer)); while (used.has(layer)) layer++;
    this.world = new World(this.ctx, layer);
    this.world.roomId = this.roomId;
    this.setSimulationInterval((ms) => this.world.tick(ms / 1000), 1000 / TICK_HZ);
    this.setMetadata({ layer });

    // yapay gecikme yalnızca testlerde (cfg.simLatency); üretimde 0
    const lag = (fn: () => void) => { const d = this.ctx.cfg.simLatency; if (d > 0) setTimeout(fn, d); else fn(); };
    this.onMessage('in', (c, m) => lag(() => { const p = this.pl(c, 'msgs'); if (p) this.world.onInput(p, m); }));
    this.onMessage('atk', (c, m) => lag(() => { const p = this.pl(c, 'msgs'); if (p) this.world.onAttack(p, m); }));
    this.onMessage('sk', (c, m) => lag(() => { const p = this.pl(c, 'msgs'); if (p) this.world.onSkill(p, m); }));
    this.onMessage('chat', (c, m) => { const p = this.pl(c, 'msgs'); if (p && this.world.allow(p, 'chat')) this.world.chat(p, m); });
    this.onMessage('ping', (c, m) => { c.send('pong', { ...m, st: this.ctx.clock.now() }); });
    this.onMessage('*', () => { /* bilinmeyen mesaj türleri yok sayılır */ });
    this.onMessage('rpc', (c, m: { id: number; op: RpcOp; a: unknown }) => {
      const p = this.byClient.get(c.sessionId); if (!p) return;
      if (!this.world.allow(p, 'rpcs')) { c.send('rpcr', { id: m.id, ok: false, err: 'rate_limited' }); return; }
      c.send('rpcr', this.world.rpc(p, m.id, m.op, m.a));
    });
  }

  private pl(c: Client, kind: 'msgs') {
    const p = this.byClient.get(c.sessionId);
    if (!p) return undefined;
    if (!this.world.allow(p, kind)) return undefined;
    return p;
  }

  async onAuth(client: Client, options: JoinOptions, req: AuthContext): Promise<Auth> {
    const ctx = this.ctx;
    const ip = String(req?.ip ?? 'x');
    const f = authFails.get(ip);
    if (ctx.cfg.rateLimit && f && f.n >= 8 && Date.now() - f.at < 30000) throw new ServerError(429, 'too_many_attempts');
    const fail = (code: string) => {
      const e = authFails.get(ip) ?? { n: 0, at: 0 }; e.n++; e.at = Date.now(); authFails.set(ip, e);
      throw new ServerError(401, code);
    };
    const name = String(options?.name ?? '').trim(); const pw = String(options?.password ?? '');
    if (!NAME_RE.test(name)) fail('bad_name');
    if (pw.length < 4 || pw.length > 64) fail('bad_password');
    let row = ctx.db.playerByName(name);
    if (options.create) {
      if (row) fail('name_taken');
      const boy = options.create.boy as Boy;
      if (!['gok', 'yer', 'ay'].includes(boy)) fail('bad_boy');
      const oy = ctx.db.assignNoviceOymak(boy, 20);
      const { salt, hash } = hashPassword(pw);
      const now = ctx.clock.now();
      const data = newPlayerData(now, HUB.spawn[boy], options.lang === 'en' ? 'en' : 'tr');
      const id = ctx.db.insertPlayer({ name, salt, hash, boy, oymak_id: oy.id, points: 0, data: JSON.stringify(data), created: now, last_seen: now });
      row = ctx.db.playerById(id)!;
    } else {
      if (!row) fail('no_account');
      if (!verifyPassword(pw, row!.salt, row!.hash)) fail('wrong_password');
    }
    authFails.delete(ip);
    // aynı hesapla ikinci giriş: eskisini at
    for (const w of ctx.worlds) for (const p of w.players.values()) if (p.dbId === row!.id) p.kick('duplicate');
    void client;
    return { row: row! };
  }

  onJoin(client: Client, _options: JoinOptions, auth: Auth) {
    const row = ctx_fresh(this.ctx, auth.row.id) ?? auth.row;
    const p = this.world.join(row, (t, d) => { const l = this.ctx.cfg.simLatency; if (l > 0) setTimeout(() => { try { client.send(t, d); } catch { /* */ } }, l); else client.send(t, d); }, (reason) => { try { client.leave(4001, reason); } catch { /* */ } });
    this.byClient.set(client.sessionId, p);
    client.send('welcome', { id: p.id, roomId: this.roomId, layer: this.world.layer, serverTime: this.ctx.clock.now(), tickHz: TICK_HZ } satisfies Welcome);
  }

  onLeave(client: Client) {
    const p = this.byClient.get(client.sessionId);
    if (p) { this.world.leave(p); this.byClient.delete(client.sessionId); }
  }
  onDispose() { this.world.dispose(); }
}

function ctx_fresh(ctx: Ctx, id: number) { return ctx.db.playerById(id); }
