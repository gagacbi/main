import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { HUB } from '../shared/game';
import { NAME_RE, hashPassword } from '../server/auth';
import { Db } from '../server/db';
import { newPlayerData } from '../server/types';

/**
 * Yönetici hesabı yönetimi (yalnızca yerel makinede, veritabanı dosyasına doğrudan erişimle).
 *   npm run admin                         → "Yonetici" adıyla rastgele parolalı hesap oluşturur, parolayı bir kez yazdırır
 *   npm run admin -- create <ad> [parola] → belirli ad/parola
 *   npm run admin -- promote <ad>         → var olan hesabı yönetici yapar
 *   npm run admin -- demote <ad>          → yetkiyi alır
 *   npm run admin -- list                 → yöneticileri listeler
 * Oyun içinden yönetici yapılamaz: rol yalnızca bu betikle verilir ve sunucu her GM komutunda rolü doğrular.
 */
const [cmd = 'create', ...rest] = process.argv.slice(2);
mkdirSync('.data', { recursive: true });
const db = new Db(process.env.KUT_DB ?? '.data/kut.db');
const tag = (s: string) => console.log(s);

if (cmd === 'create') {
  const name = rest[0] ?? 'Yonetici'; const pw = rest[1] ?? randomBytes(6).toString('base64url');
  if (!NAME_RE.test(name)) { tag('Ad 3–16 harf/rakam olmalı.'); process.exit(1); }
  if (pw.length < 4) { tag('Parola en az 4 karakter olmalı.'); process.exit(1); }
  if (db.playerByName(name)) { tag(`"${name}" zaten var. Yönetici yapmak için: npm run admin -- promote ${name}`); process.exit(1); }
  const oy = db.assignNoviceOymak('gok', 20); const { salt, hash } = hashPassword(pw); const now = Date.now();
  const data = newPlayerData(now, HUB.spawn.gok, 'tr'); data.gold = 100000; data.level = 50; data.skillPts = 49; data.skillRanks = [6, 6, 6, 6, 6, 6]; data.tut = { step: 5, prog: 0 };
  db.insertPlayer({ name, salt, hash, boy: 'gok', oymak_id: oy.id, points: 0, data: JSON.stringify(data), created: now, last_seen: now, role: 'admin' });
  tag(`Yönetici hesabı hazır.\n  Ad:    ${name}\n  Parola: ${pw}\n  (Seviye 50, 100.000 akçe. Oyunda sohbet kutusuna /gm help yazın ya da F2 ile yönetici panelini açın.)`);
} else if (cmd === 'promote' || cmd === 'demote') {
  const name = rest[0]; if (!name || !db.setRole(name, cmd === 'promote' ? 'admin' : 'player')) { tag('Hesap bulunamadı.'); process.exit(1); }
  tag(`${name}: ${cmd === 'promote' ? 'artık yönetici' : 'yetkisi alındı'}`);
} else if (cmd === 'list') {
  const rows = db.db.prepare("SELECT name FROM players WHERE role = 'admin'").all() as unknown as { name: string }[];
  tag(rows.length ? rows.map((r) => '  ' + r.name).join('\n') : 'Yönetici yok.');
} else { tag('Komutlar: create [ad] [parola] | promote <ad> | demote <ad> | list'); process.exit(1); }
db.close();
