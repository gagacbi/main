import { BOOK_BONUS, COMBO, DEATH_XP_LOSS, KIMIZ, MARKET, PVP_FLAG, RANK_RECOVER_KILLS, SKILLS, UPGRADE_DESTROYS_FROM, UPGRADE_RATE, upgradeCost, MAX_LEVEL } from '@shared/game';
import { DUNGEONS } from '@shared/dungeon';
import { ERA_AT, ERA_STEP, CHRON_PTS, RUIN_LEVELS } from '@shared/chronicle';
import { HUNT, huntFor } from '@shared/hunt';
import { FISH, FISH_DEFS } from '@shared/fishing';
import { EL, EL_KEYS } from '@shared/element';
import { DAILY } from '@shared/daily';
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

  { id: 'element', ic: 'weapon', cat: 'grow', title: ['Element yazısı (silah)', 'Element scripts (weapons)'], body: () => [
`Demirci’de ${EL.minUp} ve üstü silaha 6 elementten biri eklenir: ${EL_KEYS.map((k) => t('el.' + k)).join(', ')}.
## Etki
- Güç 1–${EL.addMax} arasında rastgele gelir, sonra en çok ${EL.maxPower}’e yükseltilir
- Yaratığın zayıf olduğu elementte hasar güç başına +%${EL.weakPerPower * 100} (en çok +%${Math.round(EL.maxPower * EL.weakPerPower * 100)}), diğerlerinde +%${EL.neutralPerPower * 100}. PvP’de etkisi yoktur
## Zayıflıklar
${(Object.keys(EL.weak) as import('@shared/game').MobType[]).filter((m) => EL.weak[m].length).map((m) => `- ${t('mob.' + m)}: ${EL.weak[m].map((k) => t('el.' + k)).join(', ')}`).join('\n')}
## Maliyet (akçe sink’i)
- Ekleme: +9 artı basma maliyetinin %60’ı; değiştirme: iki katı (güç korunur); yükseltme: güce bağlı, başarı %${Math.round(EL.raiseRate(0) * 100)}→%${Math.round(EL.raiseRate(20) * 100)}
- Başarısız yükseltmede eşya kaybolmaz, yalnızca akçe gider`,
`At the Blacksmith a weapon at ${EL.minUp} or higher can take one of 6 elements: ${EL_KEYS.map((k) => t('el.' + k)).join(', ')}.
## Effect
- Power rolls 1–${EL.addMax}, then can be raised up to ${EL.maxPower}
- Against creatures weak to the element, damage rises +${EL.weakPerPower * 100}% per power (max +${Math.round(EL.maxPower * EL.weakPerPower * 100)}%), otherwise +${EL.neutralPerPower * 100}%. No effect in PvP
## Weaknesses
${(Object.keys(EL.weak) as import('@shared/game').MobType[]).filter((m) => EL.weak[m].length).map((m) => `- ${t('mob.' + m)}: ${EL.weak[m].map((k) => t('el.' + k)).join(', ')}`).join('\n')}
## Cost (a gold sink)
- Add: 60% of the +9 upgrade cost; change: double (power kept); raise: scales with power, success ${Math.round(EL.raiseRate(0) * 100)}%→${Math.round(EL.raiseRate(20) * 100)}%
- A failed raise never destroys the item; only the gold is lost`] },

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

  { id: 'fish', ic: 'rod', cat: 'grow', title: ['Göl Avı (balıkçılık)', 'Lake Fishing'], body: () => [
`Yurt’taki gölün kıyısında (E ile "Göl") olta atılır. En az Sv ${FISH.minLevel} gerekir.
## Ekipman
- Olta ${FISH.rodPrice} akçe; yem şart: Hamur ${FISH.bait.hamur}, Solucan ${FISH.bait.solucan} akçe (solucan nadir balık şansını ikiye katlar)
- Olta puanla gelişir (en çok seviye ${FISH.rodMax}): yakalanan balıkta %${Math.round(FISH.ptsChance * 100)} şansla +1 puan. Geliştirme akçe ister; başarısızlıkta puanın %${Math.round(FISH.rodFailLose * 100)}’u gider. Yüksek olta, vuruş bölgesini genişletir ve nadir balık şansını artırır
## Zamanlama oyunu
- ${FISH.gameSec} sn içinde çizgi yeşil bölgedeyken tıkla (veya Boşluk): ${FISH.hitsNeeded} isabet balığı yakalar; ıska ${FISH.missPenaltySec} sn götürür
- Hangi balığın geleceği atışta sunucuca belirlenir; ${FISH.minReelSec} sn dolmadan çekilen olta geçersizdir
- Üç isabet kesin yakalama değildir: balık iğneyi tutmuş olmalı. Tutma şansı sıradan balıkta ~%${Math.round(FISH.catch.common*100)}, nadirde ~%${Math.round(FISH.catch.rare*100)}, Ata Balığı’nda ~%${Math.round(FISH.catch.ata*100)}; her olta seviyesi +%${(FISH.catch.rodBonus*100).toFixed(1)}, solucan +%${Math.round(FISH.catch.solucan*100)}, şans yemi +%${Math.round(FISH.catch.luck*100)} ekler (üst sınır %${Math.round(FISH.catch.max*100)}). Balık kaçarsa yem gider; yine de %${Math.round(FISH.catch.escapePtsChance*100)} şansla +1 olta puanı alınır
- Ayıkla: elindeki balığı ayıklarsan %${Math.round(FISH.clean.solucan*100)} Solucan, %${Math.round(FISH.clean.kilcik*100)} Kılçık (boş) çıkar, kalanında balık elinden kayar
## Balıklar
${FISH_DEFS.filter((f) => f.id !== 'ata').map((f) => `- ${t('fish.' + f.id)}${f.rare ? ' (nadir)' : ''}: ${f.cleanse ? t('fish.cleanse') : f.buff ? `${t('fish.buff.' + f.buff.k, { v: f.buff.v })}, ${Math.round(f.buff.sec / 60)} dk` : ''}`).join('\n')}
- Gölün Atası (çok nadir): serbest bırak (herkese ${FISH.ancestorBuffSec / 60} dk +%${FISH.ancestorXpPct} XP, Yıllık’a yazılır), kes (3 yazıt parçası + 1 tılsım) ya da yem yap (sonraki ${FISH.luckCasts} atışta nadir ×${FISH.luckMult})
## Pişirme ve pazar
- Balık yalnızca Yurt’ta pişirilip yenir; güçler iyileştirme değildir (Kımız ile çakışmaz). Balıklar Pazar’da takas edilir
- Balıkçılıktan akçe kazanılmaz: olta, yem ve geliştirme akçe harcatır`,
`Cast a rod at the shore of the Camp lake (E: "Lake"). Requires Lv ${FISH.minLevel}.
## Gear
- Rod ${FISH.rodPrice} akçe; bait is required: Dough ${FISH.bait.hamur}, Worm ${FISH.bait.solucan} akçe (worms double rare-fish odds)
- The rod levels up with points (max level ${FISH.rodMax}): a catch gives +1 point with ${Math.round(FISH.ptsChance * 100)}% chance. Upgrading costs akçe; a failure loses ${Math.round(FISH.rodFailLose * 100)}% of your points. A higher rod widens the hit zone and raises rare-fish odds
## Timing game
- Within ${FISH.gameSec} s, click (or Space) while the marker is in the green zone: ${FISH.hitsNeeded} hits land the fish; a miss costs ${FISH.missPenaltySec} s
- The fish is decided on the server at the cast; a line reeled before ${FISH.minReelSec} s is void
- Three hits are not a guaranteed catch: the fish must hold the hook. Base hold chance ~${Math.round(FISH.catch.common*100)}% common, ~${Math.round(FISH.catch.rare*100)}% rare, ~${Math.round(FISH.catch.ata*100)}% Ancestor Fish; each rod level +${(FISH.catch.rodBonus*100).toFixed(1)}%, worm +${Math.round(FISH.catch.solucan*100)}%, luck bait +${Math.round(FISH.catch.luck*100)}% (cap ${Math.round(FISH.catch.max*100)}%). If it escapes the bait is lost, but you still get +1 rod point with ${Math.round(FISH.catch.escapePtsChance*100)}% chance
- Clean: cleaning a fish gives a Worm (${Math.round(FISH.clean.solucan*100)}%), bones (${Math.round(FISH.clean.kilcik*100)}%, nothing), otherwise it slips away
## Fish
${FISH_DEFS.filter((f) => f.id !== 'ata').map((f) => `- ${t('fish.' + f.id)}${f.rare ? ' (rare)' : ''}: ${f.cleanse ? t('fish.cleanse') : f.buff ? `${t('fish.buff.' + f.buff.k, { v: f.buff.v })}, ${Math.round(f.buff.sec / 60)} min` : ''}`).join('\n')}
- Ancestor of the Lake (very rare): release it (everyone gets +${FISH.ancestorXpPct}% XP for ${FISH.ancestorBuffSec / 60} min, written in the Annals), cut it (3 inscription fragments + 1 charm) or use it as bait (rare ×${FISH.luckMult} for the next ${FISH.luckCasts} casts)
## Cooking & market
- Fish are cooked and eaten only in the Camp; buffs are not healing (no overlap with Kımız). Fish trade on the Market
- Fishing earns no gold: rod, bait and upgrades are gold sinks`] },

  { id: 'daily', ic: 'daily', cat: 'grow', title: ['Obanın Günlüğü (günlük görevler)', 'Oba Journal (daily tasks)'], body: () => [
`Sv ${DAILY.minLevel}’dan itibaren her gün ${DAILY.count} görev gelir (J). Gün sınırı zindan günüyle aynıdır.
## Görevler
- Yaratık kes (her zaman), ardından havuzdan: malzeme topla, balık tut, Alp Avı tamamla, çatlak kapat; Sv 41+ zindan bitir
## Ödüller
- Her görev için rastgele: XP (seviye ihtiyacının %${Math.round(DAILY.xpPct * 100)}’i), Kımız ×${DAILY.rewardKimiz}, Demirci kitabı ×${DAILY.rewardBook} ya da kostüm lifi ×${DAILY.rewardLif}
- Dördü bitince Günlük Hediye: Kımız ×${DAILY.gift.kimiz} + ${DAILY.gift.book} kitap
- Ödüller görev biter bitmez otomatik verilir. Akçe ve tılsım verilmez`,
`From Lv ${DAILY.minLevel} you get ${DAILY.count} tasks a day (J). The day boundary matches the dungeon day.
## Tasks
- Defeat creatures (always), then from a pool: gather materials, catch fish, complete an Alp Hunt, seal a rift; Lv 41+: clear a dungeon
## Rewards
- Random per task: XP (${Math.round(DAILY.xpPct * 100)}% of the level requirement), Kımız ×${DAILY.rewardKimiz}, Smith’s Handbook ×${DAILY.rewardBook} or costume fibre ×${DAILY.rewardLif}
- Finishing all four gives the Daily Gift: Kımız ×${DAILY.gift.kimiz} + ${DAILY.gift.book} handbooks
- Rewards are granted automatically when a task ends. No gold or charms`] },

  { id: 'soon', ic: 'wood', cat: 'soon', title: ['Yol haritası (yakında)', 'Roadmap (coming soon)'], body: () => [
`Bunlar henüz oyunda DEĞİL; tasarımı docs/ozellikler/METIN2_WIKI_UYARLAMA.md içinde:
## Sonrası
- Kut Taşları (ejderha taşı simyası benzeri), Yoldaş evrimi ve ömrü, kalan çizgi ikonların yenilenmesi`,
`These are NOT in the game yet; the design is in docs/ozellikler/METIN2_WIKI_UYARLAMA.md:
## Later
- Kut Stones (dragon-stone alchemy style), companion evolution and lifespan, refreshing the remaining line icons`] },
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
