/** docs/balans/sonuc.json + docs/BALANS_RAPORU.sablon.md → docs/BALANS_RAPORU.md (tablolar sayılardan üretilir, elle yazılmaz) */
import { readFileSync, writeFileSync } from 'node:fs';

const D = JSON.parse(readFileSync(process.env.SIM_QUICK === '1' ? 'docs/balans/sonuc.hizli.json' : 'docs/balans/sonuc.json', 'utf8'));
const tpl = readFileSync('docs/BALANS_RAPORU.sablon.md', 'utf8');
const tab = (head: string[], rows: (string | number)[][]) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}`;
const h = (s: number | null | undefined) => (s == null ? '—' : (s / 3600).toFixed(2));
const n = (x: number) => x.toLocaleString('tr-TR');

const P = D.progression;
const marks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter((l) => P.levelAt[l] != null);
const out: Record<string, string> = {};
out.TARIH = new Date().toISOString().slice(0, 10);
out.ILERLEME = tab(['Seviye', 'Süre (sa)', 'Hedef (sa)', 'Seviyeye kadar öldürme', 'Kill/sa (o seviye)'], marks.map((l) => {
  const tg: Record<number, string> = { 10: '≈1', 20: '≈6', 30: '≈20', 40: '≈55', 50: '≈110' };
  const prev = l - 5; const dt = (P.levelAt[l] - (P.levelAt[prev] ?? 0)) / 3600; const dk = P.killsAt[l] - (P.killsAt[prev] ?? 0);
  return [l, h(P.levelAt[l]), tg[l] ?? '', n(P.killsAt[l]), n(Math.round(dk / dt))];
})) + `\n\nKoşu: ${P.simHours} simüle saat, ${P.wallS} sn gerçek süre; ulaşılan seviye **${P.level}**, ${P.deaths} ölüm, ${n(P.kills)} yaratık, artı basma: ${P.upgrades.ok} başarı / ${P.upgrades.fail} başarısız / ${P.destroyed} yok olan.`;
out.DUEL = tab(['Sv', 'Saldırı', 'Savunma', 'Can', 'ÖS* (sn)', 'Can %/öldürme', '4\'lü sürü ölüm (sn)', '+5 yaratık ÖS', '+5 can %/öldürme', 'Seviye için öldürme'], D.duel.map((r: Record<string, number>) => [r.L, r.atk, r.def, n(r.hp), r.ttk, r.takenPct, r.pack4DieSec, r.plus5Ttk, r.plus5TakenPct, n(r.killsToLevel)]));
out.POWER = tab(['Sv', 'Çıplak DPS', 'Referans DPS', '+9 efsanevi DPS', 'Referans/çıplak', '+9/referans', 'Çıplak can', 'Referans can', '+9 can'], D.power.map((r: Record<string, number>) => [r.L, r.nakedDps, r.refDps, r.topDps, `×${r.refOverNaked}`, `×${r.topOverRef}`, n(r.nakedHp), n(r.refHp), n(r.topHp)]));
out.BOYSPEC = tab(['Boy', 'Uzmanlık', 'DPS', 'Can', 'Savunma', 'Etkin can**', 'Hız', 'Büyü', 'Şifa'], D.boySpec.map((r: Record<string, number | string>) => [r.boy, r.spec, r.dps, n(r.hp as number), r.def, n(r.ehp as number), r.moveSpeed, r.spell, r.heal]));
out.SKILLS = D.skills.map((s: { L: number; basicDps: number; rotation5: number; rows: { id: string; cd: number; mult: number; aoeDmgPer30s: number; vsBasic: number }[] }) => `**Sv${s.L}** — temel vuruş ${n(s.basicDps)}/sn; 5 hedefe tam rotasyon ${n(s.rotation5)}/sn (×${(s.rotation5 / s.basicDps).toFixed(1)})\n\n${tab(['Yetenek', 'Bekleme', 'Çarpan', '30 sn toplam (5 hedef)', 'Temel vuruşa oranı'], s.rows.map((r) => [r.id, r.cd, r.mult, n(r.aoeDmgPer30s), `×${r.vsBasic}`]))}`).join('\n\n');
out.PVP = tab(['Sv', 'Kılıç→Kalkan ölüm (sn)', 'Kalkan→Kılıç', 'Kılıç↔Kılıç', 'PvE denk. (Kılıç→Kalkan)', '+9 efsanevi → çıplak ay'], D.pvp.map((r: Record<string, number>) => [r.L, r.kilicVsKalkanSec, r.kalkanVsKilicSec, r.kilicVsKilicSec, r.pveEquivSec, r.top9VsLow0Sec]));
out.UPG = tab(['Parça ilvl', 'Strateji', 'Hedef', 'Beklenen deneme', 'Akçe', 'Cevher', 'Kitap', 'Tılsım', 'Yok olan parça'], D.upgradeEV.map((r: Record<string, number | string>) => [r.ilvl, r.policy, `+${r.stopAt}`, r.tries, n(r.gold as number), n(r.ore as number), r.books, r.charms, r.lostItems]));
out.VARIANTS = tab(['Boy', 'Uzmanlık', 'Seviye', 'Kill/sa', 'Ölüm/sa', 'Can %/öldürme', 'Sv10 süresi (sa)'], D.variants.map((r: Record<string, number | string | null>) => [r.boy, r.spec, r.level, n(r.killsPerH as number), r.deathsPerH, r.hpPerKillPct, h(r.t10 as number | null)]));
out.OFFSETS = tab(['Kamp seviyesi', 'Kill/sa', 'Ölüm/sa', 'Can %/öldürme', 'XP/sa', 'XP/sa (seviyenin %)'], D.offsets.map((r: Record<string, number>) => [r.offset > 0 ? `Sv+${r.offset}` : r.offset === 0 ? 'Sv±0' : `Sv${r.offset}`, n(r.killsPerH), r.deathsPerH, r.hpPerKillPct, n(r.xpPerH), r.xpPerHPctOfLevel]));
out.RIFT = tab(['Sv', 'Oyuncu', 'Sonuç', 'Temizleme (sn)', 'Toplam ölüm', 'Ödül XP (seviyenin %)'], D.rift.map((r: Record<string, number | string>) => [r.L, r.players, r.state, r.clearSec, r.deaths, r.rewardXpPct]));
out.ADMIN = tab(['Sv', 'Efsanevi +9 takım', 'Kill/sa', 'Ölüm', 'Can %/öldürme', 'Saldırı', 'Can'], D.admin.map((r: Record<string, number | boolean>) => [r.L, r.kit ? 'evet' : 'hayır', n(r.killsPerH as number), r.deaths, r.hpPerKillPct, n(r.atk as number), n(r.hp as number)]));
out.ECON = tab(['Sv', 'Akçe/sa', 'Kill/sa', '+9 (tılsımlı) toplam akçe', 'Kaç saatlik kazanç'], D.economy.map((r: Record<string, number>) => [r.L, n(r.goldPerH), n(r.killsPerH), n(r.plus9CharmGold), r.plus9Hours]));

writeFileSync('docs/BALANS_RAPORU.md', tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => out[k] ?? `{{${k}?}}`));
console.log('docs/BALANS_RAPORU.md yazıldı');
