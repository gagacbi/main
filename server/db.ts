import { DatabaseSync } from 'node:sqlite';
import type { Boy } from '../shared/game';

export interface PlayerRow { id: number; name: string; salt: string; hash: string; boy: Boy; oymak_id: number; points: number; data: string; created: number; last_seen: number; role: 'player' | 'admin' }
export interface OymakRow { id: number; boy: Boy; name: string; npc: string; data: string }

const OYMAK_NAMES: Record<Boy, string[]> = {
  gok: ['Mavi Kartal Obası', 'Bulut Alpları Obası', 'Gök Tuğ Obası'],
  yer: ['Yeşil Bozkurt Obası', 'Kızıl Toprak Obası', 'Çam Pınarı Obası'],
  ay: ['Gümüş Geyik Obası', 'Ay Işığı Obası', 'Mor Kilim Obası'],
};
const NPC_NAMES = ['Ak Sakal Dede Korkut', 'Ak Sakal Bilge Kam', 'Ak Sakal Aksakal Baba'];

export class Db {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS players(
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, hash TEXT NOT NULL,
        boy TEXT NOT NULL, oymak_id INTEGER NOT NULL, points INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, created INTEGER NOT NULL, last_seen INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_players_oymak ON players(oymak_id);
      CREATE TABLE IF NOT EXISTS oymak(id INTEGER PRIMARY KEY AUTOINCREMENT, boy TEXT NOT NULL, name TEXT NOT NULL, npc TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS world(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, player_id INTEGER, kind TEXT NOT NULL, detail TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_ledger_player ON ledger(player_id);
    `);
    this.migrate();
  }
  close() { this.db.close(); }
  /** eski veritabanlarına rol sütunu ekler */
  private migrate() {
    const cols = this.db.prepare('PRAGMA table_info(players)').all() as unknown as { name: string }[];
    if (!cols.some((c) => c.name === 'role')) this.db.exec("ALTER TABLE players ADD COLUMN role TEXT NOT NULL DEFAULT 'player'");
  }
  setRole(name: string, role: 'player' | 'admin'): boolean {
    return this.db.prepare('UPDATE players SET role = ? WHERE name = ?').run(role, name).changes > 0;
  }
  tx<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); this.db.exec('COMMIT'); return r; } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  playerByName(name: string): PlayerRow | undefined {
    return this.db.prepare('SELECT * FROM players WHERE name = ?').get(name) as unknown as PlayerRow | undefined;
  }
  playerById(id: number): PlayerRow | undefined {
    return this.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as unknown as PlayerRow | undefined;
  }
  insertPlayer(r: Omit<PlayerRow, 'id' | 'role'> & { role?: 'player' | 'admin' }): number {
    const res = this.db.prepare('INSERT INTO players(name,salt,hash,boy,oymak_id,points,data,created,last_seen,role) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(r.name, r.salt, r.hash, r.boy, r.oymak_id, r.points, r.data, r.created, r.last_seen, r.role ?? 'player');
    return Number(res.lastInsertRowid);
  }
  savePlayer(id: number, data: string, points: number, oymakId: number, lastSeen: number) {
    this.db.prepare('UPDATE players SET data = ?, points = ?, oymak_id = ?, last_seen = ? WHERE id = ?').run(data, points, oymakId, lastSeen, id);
  }
  oymakWeight(oymakId: number, base: number): { total: number; members: number } {
    const r = this.db.prepare('SELECT COALESCE(SUM(points),0) AS p, COUNT(*) AS n FROM players WHERE oymak_id = ?').get(oymakId) as unknown as { p: number; n: number };
    return { total: r.p + base * r.n, members: r.n };
  }
  oymakMembers(oymakId: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM players WHERE oymak_id = ?').get(oymakId) as unknown as { n: number }).n;
  }

  oymak(id: number): OymakRow | undefined {
    return this.db.prepare('SELECT * FROM oymak WHERE id = ?').get(id) as unknown as OymakRow | undefined;
  }
  saveOymak(id: number, data: string) { this.db.prepare('UPDATE oymak SET data = ? WHERE id = ?').run(data, id); }
  /** Boyun, üye sınırı dolmamış acemi oymağını döndürür; yoksa yenisini açar. */
  assignNoviceOymak(boy: Boy, cap: number): OymakRow {
    const rows = this.db.prepare('SELECT * FROM oymak WHERE boy = ? ORDER BY id').all(boy) as unknown as OymakRow[];
    for (const o of rows) if (this.oymakMembers(o.id) < cap) return o;
    const n = rows.length;
    const name = n < 3 ? OYMAK_NAMES[boy][n] : `${OYMAK_NAMES[boy][n % 3]} ${Math.floor(n / 3) + 1}`;
    const npc = NPC_NAMES[n % NPC_NAMES.length];
    const data = JSON.stringify({ lv: { otag: 1, demir: 1 }, up: null, storage: { ore: 0, hide: 0, wood: 0 } });
    const res = this.db.prepare('INSERT INTO oymak(boy,name,npc,data) VALUES(?,?,?,?)').run(boy, name, npc, data);
    return this.oymak(Number(res.lastInsertRowid))!;
  }

  worldGet(key: string, def = 0): number {
    const r = this.db.prepare('SELECT value FROM world WHERE key = ?').get(key) as unknown as { value: string } | undefined;
    return r ? Number(r.value) : def;
  }
  worldSet(key: string, v: number) {
    this.db.prepare('INSERT INTO world(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(v));
  }
  ledger(ts: number, playerId: number | null, kind: string, detail: unknown) {
    this.db.prepare('INSERT INTO ledger(ts,player_id,kind,detail) VALUES(?,?,?,?)').run(ts, playerId, kind, JSON.stringify(detail));
  }
  ledgerRows(playerId: number): { kind: string; detail: string }[] {
    return this.db.prepare('SELECT kind, detail FROM ledger WHERE player_id = ? ORDER BY id').all(playerId) as unknown as { kind: string; detail: string }[];
  }
}
