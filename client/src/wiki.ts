import { BOOK_BONUS, COMBO, DEATH_XP_LOSS, KIMIZ, MARKET, PVP_FLAG, RANK_RECOVER_KILLS, SKILLS, UPGRADE_DESTROYS_FROM, UPGRADE_RATE, upgradeCost, MAX_LEVEL } from '@shared/game';
import { DUNGEONS } from '@shared/dungeon';
import { ERA_AT, ERA_STEP, CHRON_PTS, RUIN_LEVELS } from '@shared/chronicle';
import { HUNT, huntFor } from '@shared/hunt';
import { getLang, t } from './i18n';

/**
 * Oyun içi Wiki (Kut Ansiklopedisi): sayılar kaynak sabitlerden (shared/*) okunur, böylece denge değişince metin eskimez.
 * Gövde sözdizimi: "## başlık", "- madde", "| a | b |" tablo satırı, boş satır = paragraf.
 */
export interface Article { id: string; ic: string; cat: 'play' | 'grow' | 'world' | 'soon'; title: [string, string]; body: () => [string, string] }
const f = (n: number) => String(Math.round(n * 100) / 100);
const rates = UPGRADE_RATE.slice(1).map((r, i) => `| +${i + 1} | %${r} | ${i + 1 >= UPGRADE_DESTROYS_FROM ? '✗' : '–'} | ${upgradeCost(i + 1, 10).gold} / ${upgradeCost(i + 1, 10).ore} |`).join('\n');

export const ARTICLES: Article[] = [
  { id: 'basics', ic: 'stele', cat: 'play', title: ['Başlangıç ve kontroller', 'Getting started & controls'], body: () => [
`Dünya tek bir bozkırdır: ortada duvarlı Yurt (güvenli), etrafında seviyeye göre uzaklaşan kamplar. Merkezden uzaklaştıkça yaratıklar güçlenir (Sv 1 → Sv 48).
## Kontroller
- Hareket: W A S D veya sağ tık; saldırı: Space; yetenekler: 1–6; Kımız: Q
- Paneller: I çanta, C karakter, K yetenekler, O Oba, Y Kodeks, P pazar, U bu Wiki, H yardım
- E: yakındaki NPC, taş, kalıntı veya kapıyla etkileşim; M: ses aç/kapat
## Bölgeler
- Yurt (güvenli): Ak Sakal, Demirci, Otağ, Dokuma Tezgâhı, kapı taşı
- Kutlu Otlak: yeni alplar için PvP'siz bölge (Sv 1–14), ilk boss
- Yazık Bozkır: ana saha; Erlik Diyarı: zirve (Sv 38–54), zindan kapıları
## Ölüm
- Ölünce ${f(DEATH_XP_LOSS * 100)}% XP kaybedersin ve Yurt'ta dirilirsin; Kımız ve savunma seçimin ölümü azaltır.`,
`The world is one steppe: a walled Camp (safe) in the middle, camps getting stronger the farther you go (Lv 1 → Lv 48).
## Controls
- Move: W A S D or right-click; attack: Space; skills: 1–6; Kımız: Q
- Panels: I bag, C character, K skills, O Oba, Y Codex, P market, U this Wiki, H help
- E: interact with NPCs, stones, ruins or gates; M: mute
## Regions
- Camp (safe): Elder, Blacksmith, Otağ, Loom, gate stone
- Blessed Meadow: PvP-free zone for new heroes (Lv 1–14), first boss
- Yazık Steppe: main field; Erlik's Realm: endgame (Lv 38–54), dungeon gates
## Death
- You lose ${f(DEATH_XP_LOSS * 100)}% XP and respawn at camp; Kımız and your defence choices reduce deaths.`] },

  { id: 'combat', ic: 'swords', cat: 'play', title: ['Savaş, savunma ve zincir', 'Combat, defence & chains'], body: () => [
`Her yaratık bir hasar türü vurur (Çift el, Bıçak, Büyü); savunman tür başınadır. Karakter panelindeki "tür savunması" ölümünün nedenine göre yükseltilir.
## Seviye farkı
- Kendinden yüksek yaratığa vuruşların azalır (her seviyede −%5, en çok −%65), yaratığın vuruşları artar (+%5, en çok ×2)
- Düşük seviye yaratık az XP ve az ganimet verir
## Skill zinciri (combo)
- Ritüel: ${['nara', 'sarsinti', 'savurma', 'zehir', 'hiddet'].map((s) => t('skill.' + s)).join(' → ')}
- Doğru sırada ${f(COMBO.windowSec)} sn içinde basılan her halka hasarı +%${Math.round(COMBO.bonusPerLink * 100)} artırır (en çok ${COMBO.maxLinks} halka) ve bekleme süresinin %${Math.round(COMBO.cdRefund * 100)}'ini iade eder (yalnızca yaratıklara karşı)
- PvP'de zincir bonusu ×${COMBO.pvpMult}; Tengri Hiddeti zinciri bitirir
- Zincirde sıradaki yetenek çubuğunda sarı parlar`,
`Every mob deals one damage type (Two-hand, Blade, Magic); your defence is per type. Raise it according to what killed you.
## Level gap
- Hitting higher-level mobs is reduced (−5% per level, at most −65%) and they hit you harder (+5%, at most ×2)
- Low-level mobs give little XP and loot
## Skill chains (combo)
- Ritual: ${['nara', 'sarsinti', 'savurma', 'zehir', 'hiddet'].map((s) => t('skill.' + s)).join(' → ')}
- Each correct link within ${f(COMBO.windowSec)} s adds +${Math.round(COMBO.bonusPerLink * 100)}% damage (up to ${COMBO.maxLinks} links) and refunds ${Math.round(COMBO.cdRefund * 100)}% of the cooldown (PvE only)
- In PvP the chain bonus is ×${COMBO.pvpMult}; Wrath ends the chain
- The next skill in the chain glows on the skill bar`] },

  { id: 'skills', ic: 'skills', cat: 'grow', title: ['Yetenekler ve uzmanlık', 'Skills & specialisation'], body: () => [
`${SKILLS.map((s, i) => `| ${i + 1} | ${t('skill.' + s.id)} | Sv ${s.lvl} | ${s.cd} sn | ${f(s.mult)}× |`).join('\n')}
- Her seviye 1 yetenek puanı verir; rütbe yükseltmek puan + akçe ister
- Sv 10'da uzmanlık: Kalkan Alp (dayanıklı) veya Kılıç Alp (hasar)`,
`${SKILLS.map((s, i) => `| ${i + 1} | ${t('skill.' + s.id)} | Lv ${s.lvl} | ${s.cd} s | ${f(s.mult)}× |`).join('\n')}
- Each level gives 1 skill point; ranking up costs a point and gold
- At Lv 10 you pick a specialisation: Shield Alp (tanky) or Sword Alp (damage)`] },

  { id: 'hunt', ic: 'skull', cat: 'grow', title: ['Alp Avı (seviye görevleri)', 'Alp Hunt (level quests)'], body: () => {
    const ex = [2, 5, 10, 20, 30, 45].map((lv) => { const h = huntFor(lv); return `| Sv ${lv} | ${t('mob.' + h.types[0])} ×${h.n[0]} | ${t('mob.' + h.types[1])} ×${h.n[1]} | ${h.item ? 'eşya ' : ''}${h.book ? '+kitap ' : ''}${h.charm ? '+tılsım' : ''} |`; }).join('\n');
    const exe = [2, 5, 10, 20, 30, 45].map((lv) => { const h = huntFor(lv); return `| Lv ${lv} | ${t('mob.' + h.types[0])} ×${h.n[0]} | ${t('mob.' + h.types[1])} ×${h.n[1]} | ${h.item ? 'item ' : ''}${h.book ? '+book ' : ''}${h.charm ? '+charm' : ''} |`; }).join('\n');
    return [`Sv ${HUNT.first}'den başlayarak her seviyede otomatik bir av görevi verilir (sol taraftaki görev kutusunda). İki hedef yaratığı (kamp türlerinden) yeterince keserek tamamlarsın; ödül otomatik verilir ve sıradaki av gelir.
## Örnekler
${ex}
## Ödüller
- %${Math.round(HUNT.xpPct * 100)} XP (Sv 11'de %${Math.round(HUNT.xpPctLvl11 * 100)}); her 5. seviyede eşya; her 10. seviyede 2 kitap + 1 tılsım
- Akçe verilmez (ekonomi dengesi)
## Kurallar
- Hedef yaratık, av seviyesinin en fazla ${HUNT.minMobLvlGap} seviye altında olmalı (düşük seviye kasılamaz)
- Geride kalan av (seviyen avın üstünde) yalnızca %${Math.round(HUNT.latePct * 100)} XP verir, eşya vermez
- "Atla": geride kalan tüm avları geri alınamaz şekilde seviyene getirir
- Son av Sv ${MAX_LEVEL}`,
`Starting at Lv ${HUNT.first}, every level gives an automatic hunt (in the quest box on the left). Kill enough of two target mobs (from camp types); the reward is automatic and the next hunt follows.
## Examples
${exe}
## Rewards
- ${Math.round(HUNT.xpPct * 100)}% XP (${Math.round(HUNT.xpPctLvl11 * 100)}% at Lv 11); an item every 5th level; 2 books + 1 charm every 10th
- No gold (economy balance)
## Rules
- Target mobs must be at most ${HUNT.minMobLvlGap} levels below the hunt level (no farming low-level mobs)
- A late hunt (your level above it) gives only ${Math.round(HUNT.latePct * 100)}% XP and no items
- "Skip" irreversibly brings all late hunts up to your level
- The last hunt is Lv ${MAX_LEVEL}`]; } },

  { id: 'enh', ic: 'weapon', cat: 'grow', title: ['Artı basma (Demirci)', 'Upgrading (Blacksmith)'], body: () => [
`Eşyayı Demirci'de +1'den +9'a yükseltirsin. Her deneme akçe ve cevher ister; yükseldikçe şans düşer, +${UPGRADE_DESTROYS_FROM} ve üstünde başarısızlık eşyayı yok eder.
| hedef | şans | yanar | akçe / cevher (ilvl 10) |
${rates}
## Destekler
- Demirci Kitabı: +${BOOK_BONUS} puan şans
- Tılsım (+5 ve üstü hedefte): başarısızlıkta eşya yanmaz, seviyesi değişmez; tılsım harcanır
- Pazar: kaybettiğin basılmış eşyaların fiyatı oyuncular arasında oluşur
## Efsun
- Eşyalarda en çok 3 efsun satırı olur; Demirci'de yeniden çevrilebilir (hedefli çevirme daha pahalı)
- Şans eşyaları: Efsun Değiştirme Kağıdı, Nazar boncuğu, kostüm şans eşyaları
## Felsefe
Yükselme risk ve ödüldür: yüksek artı çok akçe ister, çoğu eşya yolda yanar; bu sayede pazar ve malzeme ekonomisi canlı kalır.`,
`Upgrade items at the Blacksmith from +1 to +9. Each try costs gold and ore; odds fall as you climb, and from +${UPGRADE_DESTROYS_FROM} a failure destroys the item.
| target | odds | destroys | gold / ore (ilvl 10) |
${rates}
## Boosts
- Blacksmith Book: +${BOOK_BONUS} points odds
- Charm (for +5 and above): on failure the item is not destroyed and keeps its level; the charm is spent
- Market: prices for upgraded items are set between players
## Enchants
- Items carry up to 3 enchant lines; reroll at the Blacksmith (targeted reroll costs more)
- Luck items: Enchant Swap Scroll, evil-eye beads, costume luck items
## Philosophy
Upgrading is risk and reward: high plusses cost a lot and many items burn on the way, which keeps the market and material economy alive.`] },

  { id: 'market', ic: 'akce', cat: 'world', title: ['Pazar, akçe ve Kımız', 'Market, gold & Kımız'], body: () => [
`- Pazar (P): her şey takas edilir; satış vergisi %${Math.round(MARKET.taxPct * 100)}, ilan ücreti %${Math.round(MARKET.listFeePct * 100)} (en az ${MARKET.listFeeMin}), en çok ${MARKET.maxListings} ilan, süre ${MARKET.durationH} saat
- Fiyat tavanı referans değerin ×${MARKET.maxPriceMult} katı; yeni hesaplar için kısa bekleme vardır
- NPC'ye satış düşük fiyatlıdır; asıl değer pazarda oluşur
## Kımız
- Q ile içilir: ${Math.round(KIMIZ.healPct * 100)}% can, ${KIMIZ.healSec} sn boyunca; bekleme ${KIMIZ.cooldownSec} sn; en çok ${KIMIZ.maxStack} adet taşınır
- PvP'de etkisi ×${KIMIZ.pvpMult}; fiyatı pazar değerlerine bağlıdır (sink olarak tasarlandı)`,
`- Market (P): everything is tradable; sales tax ${Math.round(MARKET.taxPct * 100)}%, listing fee ${Math.round(MARKET.listFeePct * 100)}% (min ${MARKET.listFeeMin}), up to ${MARKET.maxListings} listings, ${MARKET.durationH} hours
- Price cap is ×${MARKET.maxPriceMult} the reference value; new accounts wait briefly
- NPC sales pay little; real value forms on the market
## Kımız
- Drink with Q: ${Math.round(KIMIZ.healPct * 100)}% HP over ${KIMIZ.healSec} s; cooldown ${KIMIZ.cooldownSec} s; carry up to ${KIMIZ.maxStack}
- In PvP its effect is ×${KIMIZ.pvpMult}; its price follows market values (designed as a gold sink)`] },

  { id: 'dungeon', ic: 'skull', cat: 'world', title: ['Çatlaklar, bosslar ve zindanlar', 'Rifts, bosses & dungeons'], body: () => [
`## Erlik çatlakları
- Oyuncuların yakınında açılır; içindeki yaratıkları keserek kapatırsın. Katkın oranında ganimet ve Mühür Kırığı düşer
## Saha bossları
- Sabit yerlerde yeniden doğar; canı azalınca (%30) öfkelenir, yer vuruşu önceden işaretlenir. En çok vuran duyurulur ve Yıllık'a yazılır
## Zindanlar (Erlik kapısından)
${Object.values(DUNGEONS).map((d) => `- ${t('map.' + d!.id)}: Sv ${d!.minLv}+, en çok ${d!.partyMax} kişi, giriş ${d!.fee} akçe, günde ${d!.daily} giriş, süre ${Math.round(d!.limitSec / 60)} dk`).join('\n')}
- Zindan boss'u eşya, kitap, tılsım ve yazıt parçası düşürür`,
`## Erlik rifts
- Open near players; clear the mobs inside to seal them. Loot and Seal Shards scale with your contribution
## Field bosses
- Respawn in fixed places; they enrage below 30% HP and telegraph ground slams. The top striker is announced and written into the Annals
## Dungeons (through the Erlik gate)
${Object.values(DUNGEONS).map((d) => `- ${t('map.' + d!.id)}: Lv ${d!.minLv}+, up to ${d!.partyMax} players, ${d!.fee} gold entry, ${d!.daily} runs a day, ${Math.round(d!.limitSec / 60)} min limit`).join('\n')}
- The dungeon boss drops items, books, charms and inscription fragments`] },

  { id: 'rank', ic: 'swords', cat: 'world', title: ['PvP ve rütbe', 'PvP & rank'], body: () => [
`- Yazık Bozkır'da PvP isteğe bağlıdır (bayrak): açıkken yaratıklardan +%${Math.round(PVP_FLAG.bonus * 100)} XP alırsın; PvP'den sonra ${PVP_FLAG.offAfterSec} sn bayrağı kapatamazsın
- Kutlu Otlak ve Yurt'ta PvP yoktur
- Kendi boyundan birini ya da saldırgan olmayan, seni çok (6+ seviye) geçemeyen birini ilk saldıran olarak öldürmek rütbeni düşürür (zalim; 8+ seviye aşağıdaysa çift ceza); yaratık keserek her ${RANK_RECOVER_KILLS} öldürmede rütbe geri kazanılır. Kırmızı adlı bir zalim Yurt'a girerse Şehir Muhafızları vurur
- Duello: /duel isim`,
`- In Yazık Steppe PvP is optional (a flag): while on, mobs give +${Math.round(PVP_FLAG.bonus * 100)}% XP; you can't turn it off for ${PVP_FLAG.offAfterSec} s after PvP
- No PvP in Blessed Meadow or the Camp
- Killing someone of your own tribe, or a non-aggressor at least 6 levels below you, as the first attacker lowers your rank (outlaw; double at 8+ levels); every ${RANK_RECOVER_KILLS} mob kills restore a rank. If a red-named outlaw enters the Camp, the City Guards shoot them
- Duel: /duel name`] },

  { id: 'oba', ic: 'oba', cat: 'world', title: ['Oba, Otağ ve seferler', 'Oba, Otağ & expeditions'], body: () => [
`- Her oyuncu bir Oba'ya (boy topluluğu) bağlıdır. Otağ ve Demirhane binaları bağışlanan cevher, deri ve odunla yükselir; yükseltmeler süre alır
- Binalar zamanla kaynak üretir; Otağ'a gidip toplarsın (üst sınır saat olarak vardır)
- Yoldaşlarını seferlere (1, 4 veya 12 saat) gönderirsin; dönüşte kaynak ve ender eşya getirirler
- Yıllık puanı: Oba bağışları ve sefer sonuçları ileride ortak çağ ilerlemesine eklenebilir`,
`- Every player belongs to an Oba (tribe community). Otağ and Forge upgrade with donated ore, hide and wood; upgrades take time
- Buildings produce resources over time; collect them at the Otağ (capped by hours)
- Send companions on expeditions (1, 4 or 12 hours); they return with resources and rare items
- Annals points: donations and expedition results may feed the shared age progress later`] },

  { id: 'lore', ic: 'stele', cat: 'world', title: ['Hikâye: Yıllık, Çağlar, Kalıntılar', 'Story: Annals, Ages, Ruins'], body: () => [
`Hikâye bir kişiye değil sunucuya aittir. Kodeks (Y) üç katmandır:
## Gizem iplikleri
- Yazıtlar (sunucu çapı), Kurdun Rüyaları, Ak Sakal'ın Sözleri, Balbal Taşları, Mühür Kırıkları, Destan Kalıntıları; hepsi birleşince "Mühürün Dışı" açılır
## Kut Yıllığı
- Boss, çatlak, zindan ilkleri, "sunucuda ilk Sv", yazıt çözümü ve kalıntı okumaları oyuncu adıyla kalıcı yazılır
- Puanlar: boss ${CHRON_PTS.boss}, çatlak ${CHRON_PTS.rift}, zindan ${CHRON_PTS.dungeon}, yazıt ${CHRON_PTS.insc}, kalıntı ${CHRON_PTS.ruin}
## Çağlar
- Eşikler: ${ERA_AT.join(' · ')} puan; sonra her ${ERA_STEP} puanda yeni bir "Gelen Tehdit" çağı (sonsuz)
## Destan Kalıntıları
- Bozkırda ${RUIN_LEVELS.length} harabe; seviye ${RUIN_LEVELS.join(', ')} civarı uzaklıkta. E ile oku; seviyenin en az (kalıntı seviyesi − 2) olması gerekir`,
`The story belongs to the server, not one person. The Codex (Y) has three layers:
## Mystery threads
- Inscriptions (server-wide), the Wolf's Dreams, the Elder's Words, Balbal Stones, Seal Shards, Epic Ruins; together they open "Beyond the Seal"
## Annals of Kut
- Boss, rift and dungeon firsts, "first on server to reach Lv", inscriptions and ruin readings are written permanently with player names
- Points: boss ${CHRON_PTS.boss}, rift ${CHRON_PTS.rift}, dungeon ${CHRON_PTS.dungeon}, inscription ${CHRON_PTS.insc}, ruin ${CHRON_PTS.ruin}
## Ages
- Thresholds: ${ERA_AT.join(' · ')} points; then a new "Coming Threat" age every ${ERA_STEP} points (endless)
## Epic Ruins
- ${RUIN_LEVELS.length} ruins on the steppe, near levels ${RUIN_LEVELS.join(', ')}. Read with E; you need at least (ruin level − 2)`] },

  { id: 'soon', ic: 'wood', cat: 'soon', title: ['Yol haritası (yakında)', 'Roadmap (coming soon)'], body: () => [
`Bunlar henüz oyunda DEĞİL; tasarımı docs/ozellikler/METIN2_WIKI_UYARLAMA.md içinde:
## Göl Avı (balıkçılık)
- Hub gölünün kenarında E ile olta atılır; mini oyun: halka içindeyken 3 doğru tıklama; yem gerekir; balıklar pişirilince kısa süreli güç verir; nadir "Gölün Atası" balığı
## Obanın Günlüğü (günlük görevler)
- Sv 30+, günde 4 görev, ödüller Kımız / tılsım / Yıllık puanı
## Element yazısı
- +7 üstü silaha 6 elementten biri; yüksek akçe maliyeti (akçe sink'i)
## Sonrası
- Kut Taşları (ejderha taşı simyası benzeri), Yoldaş evrimi ve ömrü`,
`These are NOT in the game yet; the design is in docs/ozellikler/METIN2_WIKI_UYARLAMA.md:
## Lake Fishing
- Cast a rod with E at the camp pond; mini-game: 3 correct clicks while the ring is in range; needs bait; cooked fish give short buffs; a rare "Ancestor of the Lake" fish
## Oba Journal (dailies)
- Lv 30+, 4 tasks a day, rewards Kımız / charms / Annals points
## Element script
- One of 6 elements on a +7 weapon; high gold cost (a gold sink)
## Later
- Kut Stones (dragon-stone alchemy style), companion evolution and lifespan`] },
];

export const CATS: Article['cat'][] = ['play', 'grow', 'world', 'soon'];
export const catName = (c: Article['cat']) => t('wiki.cat.' + c);
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
/** Gövde sözdizimini HTML'e çevirir */
export function renderBody(src: string): string {
  const out: string[] = []; let list = false; let tbl: string[] = [];
  const flush = () => { if (list) { out.push('</ul>'); list = false; } if (tbl.length) { out.push(`<table class="wk">${tbl.join('')}</table>`); tbl = []; } };
  for (const line of src.split('\n')) {
    if (line.startsWith('|')) { if (list) flush(); const c = line.split('|').slice(1, -1).map((x) => x.trim()); const head = tbl.length === 0 && /^(hedef|target|\d?\s*$)/.test(c[0]); tbl.push(`<tr>${c.map((x) => `<${head ? 'th' : 'td'}>${esc(x)}</${head ? 'th' : 'td'}>`).join('')}</tr>`); continue; }
    flush();
    if (line.startsWith('## ')) out.push(`<h4>${esc(line.slice(3))}</h4>`);
    else if (line.startsWith('- ')) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${esc(line.slice(2))}</li>`); }
    else if (line.trim()) out.push(`<p>${esc(line)}</p>`);
  }
  flush(); return out.join('');
}
export const articleTitle = (a: Article) => a.title[getLang() === 'tr' ? 0 : 1];
export const articleBody = (a: Article) => a.body()[getLang() === 'tr' ? 0 : 1];
