import { createServer, type Server as HttpServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Clock } from './clock';
import { Db } from './db';
import { WorldRoom } from './room';
import type { Config, Ctx } from './types';

export interface GameServer {
  port: number; ctx: Ctx; http: HttpServer; colyseus: Server; close: () => Promise<void>;
}
export interface StartOptions { port?: number; dbPath?: string; cfg?: Partial<Config>; rng?: () => number; serveClient?: boolean }

export async function startGameServer(opts: StartOptions = {}): Promise<GameServer> {
  const db = new Db(opts.dbPath ?? process.env.KUT_DB ?? '.data/kut.db');
  const cfg: Config = {
    maxPerLayer: Number(process.env.KUT_MAX_PER_LAYER ?? 150), riftEvery: [150, 300], test: process.env.KUT_TEST === '1',
    mobScale: 1, rateLimit: true, spawnCamps: true, simLatency: 0, ...opts.cfg,
  };
  const ctx: Ctx = {
    db, clock: new Clock(), rng: opts.rng ?? Math.random, cfg, worlds: new Set(), oymaks: new Map(), mailFlag: new Set(),
    broadcastSys: (key, p) => { for (const w of ctx.worlds) for (const pl of w.players.values()) { w.sys(pl, key, p); pl.meDirty = true; } },
  };
  const app = express();
  app.use(express.json());
  app.get('/api/status', (_req, res) => {
    const worlds = [...ctx.worlds].map((w) => ({ layer: w.layer, roomId: w.roomId, players: w.players.size, mobs: w.mobs.size, rifts: w.rifts.size, avgTickMs: w.tickMsN ? w.tickMsSum / w.tickMsN : 0, maxTickMs: w.tickMsMax }));
    res.json({ ok: true, worlds, frags: db.worldGet('frags', 0) });
  });
  /** Oymak arkadaşının bulunduğu katmanı öner (aynı katmanda tutma). */
  app.get('/api/layer', (req, res) => {
    const row = db.playerByName(String(req.query.name ?? ''));
    if (!row) { res.json({ roomId: null }); return; }
    for (const w of ctx.worlds) {
      if (w.players.size >= cfg.maxPerLayer) continue;
      for (const p of w.players.values()) if (p.oymakId === row.oymak_id) { res.json({ roomId: w.roomId, layer: w.layer }); return; }
    }
    res.json({ roomId: null });
  });
  if (cfg.test) {
    app.post('/__test/advance', (req, res) => { ctx.clock.advance(Number(req.body?.ms ?? 0)); res.json({ now: ctx.clock.now() }); });
  }
  if (opts.serveClient !== false) {
    const here = dirname(fileURLToPath(import.meta.url));
    const dist = join(here, '..', 'dist');
    if (existsSync(dist)) {
      app.use(express.static(dist, { maxAge: '1h' }));
      app.get('/{*splat}', (_req, res) => res.sendFile(join(dist, 'index.html')));
    } else {
      app.get('/', (_req, res) => res.type('text').send('KUT sunucusu çalışıyor. İstemci için `npm run dev` veya `npm run build` kullanın.'));
    }
  }
  const http = createServer(app);
  const colyseus = new Server({ transport: new WebSocketTransport({ server: http, pingInterval: 5000, pingMaxRetries: Number(process.env.KUT_PING_RETRIES ?? 6) }), gracefullyShutdown: false });
  colyseus.define('world', WorldRoom, { ctx });
  await new Promise<void>((resolve) => http.listen(opts.port ?? Number(process.env.PORT ?? 2567), resolve));
  const addr = http.address(); const port = typeof addr === 'object' && addr ? addr.port : 0;
  return {
    port, ctx, http, colyseus,
    close: async () => {
      for (const w of [...ctx.worlds]) w.dispose();
      await Promise.resolve(matchMaker.disconnectAll()).catch(() => {});
      await colyseus.gracefullyShutdown(false).catch(() => {});
      http.close(); db.close();
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { mkdirSync } = await import('node:fs');
  mkdirSync('.data', { recursive: true });
  const s = await startGameServer();
  console.log(`KUT sunucusu hazır → http://localhost:${s.port}`);
  const stop = async () => { await s.close(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
