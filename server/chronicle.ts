import type { Db } from './db';
import { CHRON_MAX, CHRON_PTS, ERA_AT, eraOf, type ChronEntry, type ChronKind } from '../shared/chronicle';

/** Kut Yıllığı: sunucu çapı kalıcı olay günlüğü (world kv'de JSON). Çağ, toplam puandan türer. */
export class Chronicle {
  entries: ChronEntry[]; pts: number; firsts: Record<string, string>;
  constructor(private db: Db) {
    try { const j = JSON.parse(db.worldGetStr('chron', '{}')); this.entries = j.e ?? []; this.pts = j.p ?? 0; this.firsts = j.f ?? {}; } catch { this.entries = []; this.pts = 0; this.firsts = {}; }
  }
  get era() { return eraOf(this.pts); }
  private save() { this.db.worldSetStr('chron', JSON.stringify({ e: this.entries, p: this.pts, f: this.firsts })); }
  /** Olay ekler; çağ değiştiyse yeni çağ numarasını döner (aksi halde -1). */
  add(now: number, k: ChronKind, who: string, a = 0, b = 0): number {
    const before = this.era;
    this.entries.push({ t: now, k, who, a, b }); if (this.entries.length > CHRON_MAX) this.entries.splice(0, this.entries.length - CHRON_MAX);
    this.pts += CHRON_PTS[k] ?? 0;
    const after = this.era;
    if (after > before) this.entries.push({ t: now, k: 'era', who: '', a: after, b: 0 });
    this.save();
    return after > before ? after : -1;
  }
  /** İlk-ünvan: anahtar daha önce alınmadıysa true ve kaydı yazar */
  first(key: string, now: number, k: ChronKind, who: string, a: number, b = 0): number {
    if (this.firsts[key]) return -1;
    this.firsts[key] = who; return this.add(now, k, who, a, b || 1);
  }
  view() { return { entries: this.entries.slice(-60).reverse(), pts: this.pts, era: this.era, firsts: this.firsts, eraAt: ERA_AT }; }
}

const cache = new WeakMap<Db, Chronicle>();
/** Veritabanı başına tek Yıllık örneği (ctx şeklini değiştirmeden) */
export const chronOf = (db: Db): Chronicle => { let c = cache.get(db); if (!c) cache.set(db, (c = new Chronicle(db))); return c; };
