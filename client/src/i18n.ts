import { TIER_KEYS, type Item } from '@shared/game';

export type Lang = 'tr' | 'en';
let lang: Lang = (() => { try { return (localStorage.getItem('kut.lang') as Lang) || (navigator.language.startsWith('en') ? 'en' : 'tr'); } catch { return 'tr'; } })();
export const getLang = () => lang;
export function setLang(l: Lang) { lang = l; try { localStorage.setItem('kut.lang', l); } catch { /* */ } document.documentElement.lang = l; }

/** [Türkçe, English] */
const D: Record<string, [string, string]> = {
  // — genel —
  'ui.title': ['KUT', 'KUT'],
  'ui.tagline': ['Tengri\'nin bahşettiği kutu ile bozkırı kurtar!', 'Save the steppe with the Kut Tengri granted you!'],
  'ui.login': ['Giriş yap', 'Log in'], 'ui.create': ['Yeni alp yarat', 'Create a new hero'], 'ui.back': ['Geri', 'Back'], 'ui.play': ['Maceraya başla', 'Start the adventure'],
  'ui.name': ['Karakter adı', 'Character name'], 'ui.password': ['Parola', 'Password'], 'ui.chooseBoy': ['Boyunu seç', 'Choose your tribe'], 'ui.class': ['Sınıf', 'Class'],
  'ui.connecting': ['Bağlanıyor…', 'Connecting…'], 'ui.loading': ['Dünya yükleniyor…', 'Loading the world…'], 'ui.close': ['Kapat', 'Close'], 'ui.ok': ['Tamam', 'OK'], 'ui.cancel': ['Vazgeç', 'Cancel'],
  'ui.newhere': ['İlk kez mi geliyorsun?', 'First time here?'], 'ui.have': ['Hesabın var mı?', 'Have an account?'],
  'ui.lang': ['Dil', 'Language'], 'ui.sound': ['Ses', 'Sound'], 'ui.quality': ['Grafik', 'Graphics'], 'ui.q.high': ['Yüksek', 'High'], 'ui.q.medium': ['Orta', 'Medium'], 'ui.q.low': ['Düşük', 'Low'],
  'ui.level': ['Sv', 'Lv'], 'ui.rested': ['Dinlenmiş', 'Rested'], 'ui.xp': ['Deneyim', 'Experience'], 'ui.kut': ['Kut puanı', 'Kut points'], 'ui.gold': ['Akçe', 'Akçe'],
  'ui.hp': ['Can', 'HP'], 'ui.dead': ['Yenildin', 'You were defeated'], 'ui.respawn': ['Yurda dön', 'Return to camp'], 'ui.respawnIn': ['{n} sn sonra yurda dönebilirsin', 'You can return in {n}s'],
  'ui.interact': ['Konuş / Kullan', 'Talk / Use'], 'ui.press': ['{k} tuşu', 'Press {k}'],
  'ui.equipped': ['Kuşanılmış', 'Equipped'], 'ui.bag': ['Çanta', 'Bag'], 'ui.empty': ['Boş', 'Empty'], 'ui.equip': ['Kuşan', 'Equip'], 'ui.unequip': ['Çıkar', 'Unequip'], 'ui.sell': ['Sat', 'Sell'], 'ui.select': ['Seç', 'Select'],
  'ui.stats': ['Özellikler', 'Stats'], 'ui.atk': ['Saldırı', 'Attack'], 'ui.def': ['Savunma', 'Defense'], 'ui.crit': ['Kritik', 'Crit'], 'ui.aspd': ['Saldırı hızı', 'Attack speed'], 'ui.mspd': ['Hareket', 'Move speed'],
  'ui.leech': ['Can çalma', 'Life steal'], 'ui.spell': ['Beceri gücü', 'Skill power'], 'ui.xpb': ['Deneyim bonusu', 'XP bonus'], 'ui.rank': ['Derece', 'Rank'], 'ui.points': ['Katılım puanı', 'Contribution'],
  'ui.skillpts': ['Yetenek puanı', 'Skill points'], 'ui.cd': ['Bekleme', 'Cooldown'], 'ui.locked': ['Seviye {n}', 'Level {n}'], 'ui.upgrade': ['Yükselt', 'Upgrade'],
  'ui.rate': ['Başarı şansı', 'Success chance'], 'ui.cost': ['Maliyet', 'Cost'], 'ui.useBook': ['Demirci el kitabı kullan (+%10)', 'Use Smith\'s Handbook (+10%)'], 'ui.useCharm': ['Koruma tılsımı kullan', 'Use Protection Charm'],
  'ui.onFail': ['Başarısızlıkta', 'On failure'], 'ui.failKeep': ['Yalnızca malzeme gider, eşya korunur', 'Only materials are lost; the item is kept'], 'ui.failDestroy': ['EŞYA YOK OLUR (tılsım koruyabilir)', 'ITEM IS DESTROYED (a charm can protect it)'],
  'ui.rateTable': ['Artı basma oranları', 'Upgrade rates'], 'ui.chooseItem': ['Yükseltmek için bir eşya seç', 'Pick an item to upgrade'], 'ui.craft': ['Üretim', 'Crafting'],
  'ui.craft.book': ['Demirci el kitabı', 'Smith\'s Handbook'], 'ui.craft.charm': ['Koruma tılsımı', 'Protection Charm'], 'ui.craft.gear': ['Nadir eşya', 'Rare gear'],
  'ui.smith': ['Demirci', 'Blacksmith'], 'ui.help': ['Yardım', 'Help'], 'ui.settings': ['Ayarlar', 'Settings'], 'ui.inventory': ['Çanta (I)', 'Inventory (I)'], 'ui.character': ['Karakter (C)', 'Character (C)'],
  'ui.skills': ['Yetenekler (K)', 'Skills (K)'], 'ui.obaPanel': ['Oba (O)', 'Camp (O)'], 'ui.inscr': ['Kayıp Yazıtlar (Y)', 'Lost Inscriptions (Y)'],
  'ui.ping': ['Gecikme', 'Ping'], 'ui.online': ['Çevrimiçi', 'Online'], 'ui.layer': ['Katman', 'Layer'], 'ui.zone': ['Bölge', 'Zone'],
  'ui.chat.ph': ['Mesaj yaz… (Enter)', 'Type a message… (Enter)'], 'ui.chat.near': ['Yakın', 'Near'], 'ui.chat.boy': ['Boy', 'Tribe'], 'ui.chat.oymak': ['Oymak', 'Clan'],
  'ui.chat.hint': ['/w ad mesaj: fısılda · /duel ad: düello (yurtta)', '/w name text: whisper · /duel name: duel (in camp)'],
  'ui.duel': ['Düello', 'Duel'], 'ui.accept': ['Kabul et', 'Accept'], 'ui.target': ['Hedef', 'Target'],
  'ui.tut': ['Ak Sakal\'ın görevleri', 'Elder\'s tasks'], 'ui.done': ['Tamamlandı', 'Done'],
  'ui.chooseSpec': ['Uzmanlığını seç', 'Choose your specialization'], 'ui.specNote': ['Seçim kalıcıdır.', 'This choice is permanent.'],
  'ui.mute': ['Sesi kapat', 'Mute'], 'ui.unmute': ['Sesi aç', 'Unmute'],
  'ui.fps': ['KS', 'FPS'],
  // — boylar / sınıf —
  'boy.gok': ['Gök Boyu', 'Sky Tribe'], 'boy.yer': ['Yer Boyu', 'Earth Tribe'], 'boy.ay': ['Ay Boyu', 'Moon Tribe'],
  'boy.gok.sym': ['Kartal · Tengri', 'Eagle · Tengri'], 'boy.yer.sym': ['Bozkurt · Yer-Su', 'Grey Wolf · Yer-Su'], 'boy.ay.sym': ['Geyik · Ay Ata', 'Deer · Ay Ata'],
  'boy.gok.bonus': ['+%6 hareket, +%5 saldırı hızı', '+6% move speed, +5% attack speed'], 'boy.yer.bonus': ['+%8 can, +%8 savunma', '+8% HP, +8% defense'], 'boy.ay.bonus': ['+%7 beceri gücü, +%40 şifa', '+7% skill power, +40% healing'],
  'class.alp': ['Alp', 'Alp'], 'class.alp.desc': ['Yakın dövüş savaşçısı. Seviye 10\'da Kalkan Alp ya da Kılıç Alp olur.', 'Melee warrior. At level 10 becomes a Shield Alp or Blade Alp.'],
  'class.kam': ['Kam', 'Kam'], 'class.mergen': ['Mergen', 'Mergen'], 'class.soon': ['Sonraki aşamada', 'Coming in a later stage'],
  'spec.none': ['Alp', 'Alp'], 'spec.kalkan': ['Kalkan Alp', 'Shield Alp'], 'spec.kilic': ['Kılıç Alp', 'Blade Alp'],
  'spec.kalkan.desc': ['Tank: +%22 can, +%25 savunma, %12 az hasar, güçlü kalkan, sarsıntıyla provokasyon.', 'Tank: +22% HP, +25% defense, 12% less damage, stronger shield, taunting quake.'],
  'spec.kilic.desc': ['Hasar: +%16 saldırı, +%12 hız, +%20 alan, hızlı yaratık temizleme.', 'Damage: +16% attack, +12% speed, +20% area, fast mob clearing.'],
  // — beceriler —
  'skill.savurma': ['Kılıç Savurma', 'Blade Sweep'], 'skill.savurma.d': ['Çevrendeki herkese keskin bir savurma.', 'A sharp sweep hitting everything around you.'],
  'skill.sarsinti': ['Yer Sarsıntısı', 'Earth Quake'], 'skill.sarsinti.d': ['Alan hasarı ve sersemletme.', 'Area damage and stun.'],
  'skill.nara': ['Çağrı Narası', 'Rallying Roar'], 'skill.nara.d': ['Uzaktaki yaratıkları yanına çeker ve yavaşlatır. Toplamak için!', 'Pulls faraway creatures to you and slows them. Perfect for pulling!'],
  'skill.kalkan': ['Tengri Kalkanı', 'Tengri\'s Shield'], 'skill.kalkan.d': ['Hasar emen koruyucu kalkan.', 'A protective shield that absorbs damage.'],
  'skill.zehir': ['Zehirli Kesik', 'Venom Cut'], 'skill.zehir.d': ['Alan içinde zamanla hasar veren zehir.', 'Poison dealing damage over time in an area.'],
  'skill.hiddet': ['Tengri Hiddeti', 'Wrath of Tengri'], 'skill.hiddet.d': ['Gökten inen devasa alan darbesi.', 'A colossal strike from the sky.'],
  'skill.rank': ['Kademe', 'Rank'],
  // — durumlar —
  'st.stun': ['Sersem', 'Stunned'], 'st.slow': ['Yavaş', 'Slowed'], 'st.poison': ['Zehirli', 'Poisoned'], 'st.curse': ['Lanetli', 'Cursed'], 'st.shield': ['Kalkanlı', 'Shielded'],
  // — yaratıklar / bölge / NPC —
  'mob.tepegoz': ['Tepegöz Yavrusu', 'Tepegöz Cub'], 'mob.albasti': ['Albastı', 'Albastı'], 'mob.erlik': ['Erlik Çırağı', 'Erlik\'s Apprentice'], 'mob.cakal': ['Kara Çakal', 'Dark Jackal'], 'mob.bekci': ['Çatlak Bekçisi', 'Rift Guardian'],
  'zone.safe': ['Boy Yurdu (güvenli)', 'Tribe Camp (safe)'], 'zone.risky': ['Yazık Bozkır (riskli)', 'Yazık Steppe (risky)'],
  'npc.aksakal': ['Ak Sakal', 'The Elder'], 'npc.demirci': ['Demirci Tepegöz Usta', 'Smith Master'], 'npc.guard': ['Şehir Muhafızı', 'City Guard'], 'npc.stele': ['Yazıt Taşı', 'Inscription Stone'], 'npc.otag': ['Otağ', 'The Otağ'],
  'rift.name': ['Erlik Çatlağı', 'Erlik Rift'], 'rift.wave': ['Dalga {n}/3', 'Wave {n}/3'], 'rift.boss': ['Çatlak Bekçisi', 'Rift Guardian'], 'rift.idle': ['Yaklaş ve çatlağı kapat!', 'Approach to close the rift!'],
  'rift.dir': ['Çatlak', 'Rift'],
  // — eşya —
  'slot.weapon': ['Silah', 'Weapon'], 'slot.armor': ['Zırh', 'Armor'], 'slot.helmet': ['Miğfer', 'Helmet'], 'slot.amulet': ['Tılsım', 'Amulet'],
  'item.weapon.0': ['Demir Kılıç', 'Iron Sword'], 'item.weapon.1': ['Tunç Kılıç', 'Bronze Sword'], 'item.weapon.2': ['Çelik Kılıç', 'Steel Sword'], 'item.weapon.3': ['Halka Kabzalı Kılıç', 'Ring-hilt Sword'], 'item.weapon.4': ['Tengri Kılıcı', 'Sword of Tengri'],
  'item.armor.0': ['Keçe Zırh', 'Felt Armor'], 'item.armor.1': ['Deri Zırh', 'Leather Armor'], 'item.armor.2': ['Pullu Zırh', 'Scale Armor'], 'item.armor.3': ['Zincir Zırh', 'Chain Armor'], 'item.armor.4': ['Altın Zırh', 'Golden Armor'],
  'item.helmet.0': ['Keçe Börk', 'Felt Börk'], 'item.helmet.1': ['Deri Börk', 'Leather Börk'], 'item.helmet.2': ['Demir Miğfer', 'Iron Helm'], 'item.helmet.3': ['Tunç Miğfer', 'Bronze Helm'], 'item.helmet.4': ['Kartal Miğferi', 'Eagle Helm'],
  'item.amulet.0': ['Taş Tılsım', 'Stone Charm'], 'item.amulet.1': ['Boncuk Tılsım', 'Bead Charm'], 'item.amulet.2': ['Gümüş Tılsım', 'Silver Charm'], 'item.amulet.3': ['Altın Tılsım', 'Gold Charm'], 'item.amulet.4': ['Tamga Tılsımı', 'Tamga Amulet'],
  'tier.0': ['Sıradan', 'Common'], 'tier.1': ['Nadir', 'Rare'], 'tier.2': ['Destansı', 'Epic'], 'tier.3': ['Efsanevi', 'Legendary'],
  'tierp.0': ['', ''], 'tierp.1': ['Gümüşlü ', 'Silvered '], 'tierp.2': ['Ulu ', 'Grand '], 'tierp.3': ['Tengri\'nin ', 'Tengri\'s '],
  'ench.crit': ['Kritik şansı', 'Crit chance'], 'ench.aspd': ['Saldırı hızı', 'Attack speed'], 'ench.mspd': ['Hareket hızı', 'Move speed'], 'ench.hpPct': ['Can', 'HP'], 'ench.atkPct': ['Saldırı', 'Attack'], 'ench.defPct': ['Savunma', 'Defense'], 'ench.leech': ['Can çalma', 'Life steal'], 'ench.xpPct': ['Deneyim', 'XP'],
  'mat.ore': ['Demir cevheri', 'Iron ore'], 'mat.hide': ['Deri', 'Hide'], 'mat.wood': ['Odun', 'Wood'], 'mat.book': ['Demirci el kitabı', 'Smith\'s Handbook'], 'mat.charm': ['Koruma tılsımı', 'Protection Charm'], 'mat.frag': ['Yazıt parçası', 'Inscription fragment'], 'mat.gold': ['Akçe', 'Akçe'],
  'ui.lvlReq': ['Gereken seviye', 'Required level'], 'ui.ilvl': ['Eşya seviyesi', 'Item level'], 'ui.price': ['Satış', 'Sell price'],
  // — oba —
  'oba.title': ['Oba', 'Camp'], 'oba.members': ['Üye', 'Members'], 'oba.npc': ['Başkan', 'Leader'], 'oba.novice': ['Acemi oymak: bina seviyesi {n} ile sınırlı', 'Novice clan: buildings capped at level {n}'],
  'bld.otag': ['Otağ', 'Otağ'], 'bld.demir': ['Demirhane', 'Smithy'], 'bld.otag.d': ['Obanın merkezi: diğer binaların üst sınırı, yoldaş yuvası ve üye sınırı.', 'Heart of the camp: caps other buildings, companion slots and member limit.'],
  'bld.demir.d': ['Silah, zırh ve demirci el kitabı üretimi; koruma tılsımı için seviye 2.', 'Crafts gear and Smith\'s Handbooks; level 2 for Protection Charms.'],
  'oba.level': ['Seviye', 'Level'], 'oba.upgrading': ['Yükseltiliyor', 'Upgrading'], 'oba.finish': ['Bitiş', 'Done in'], 'oba.build': ['Yükselt', 'Upgrade'], 'oba.maxed': ['Üst sınır', 'Maxed'],
  'oba.storage': ['Ortak ambar', 'Shared storage'], 'oba.donate': ['Bağışla', 'Donate'], 'oba.donate.d': ['Bağış katılım puanı kazandırır.', 'Donations earn contribution points.'],
  'oba.prod': ['Üretim', 'Production'], 'oba.perHour': ['/saat', '/hour'], 'oba.pending': ['Toplanmayı bekleyen', 'Ready to collect'], 'oba.collect': ['Üretimi topla', 'Collect production'], 'oba.share': ['Payın', 'Your share'], 'oba.cap': ['En çok {n} saatlik birikir', 'Accumulates up to {n}h'],
  'oba.companions': ['Yoldaşlar', 'Companions'], 'oba.slots': ['Yuva', 'Slots'], 'oba.send': ['Sefere gönder', 'Send out'], 'oba.hours': ['{n} saat', '{n}h'], 'oba.returns': ['Dönüş', 'Returns'], 'oba.collectExp': ['Ödülü al', 'Claim reward'],
  'oba.busy': ['Seferde', 'On expedition'], 'oba.ready': ['Dönüş yaptı!', 'Returned!'], 'oba.idle': ['Hazır', 'Ready'],
  'oba.loot': ['Sefer ödülü', 'Expedition rewards'],
  'trait.gozupek': ['Gözü pek', 'Fearless'], 'trait.tuccar': ['Tüccar ruhlu', 'Merchant soul'], 'trait.sansli': ['Şanslı', 'Lucky'], 'trait.cevik': ['Çevik', 'Nimble'],
  'trait.gozupek.d': ['Sefer ganimeti daha değerli', 'Better expedition loot'], 'trait.tuccar.d': ['+%40 akçe', '+40% akçe'], 'trait.sansli.d': ['Yazıt parçası şansı 2×', '2× fragment chance'], 'trait.cevik.d': ['Seferleri %15 kısaltır', '15% shorter expeditions'],
  'ccls.alp': ['Alp', 'Alp'], 'ccls.kam': ['Kam', 'Kam'], 'ccls.mergen': ['Mergen', 'Mergen'],
  // — yazıtlar —
  'insc.title': ['Kayıp Yazıtlar', 'Lost Inscriptions'], 'insc.progress': ['Sunucu çapı parça sayısı', 'Server-wide fragment count'], 'insc.locked': ['Henüz çözülmedi', 'Not yet deciphered'],
  'insc.hint': ['Yazıt parçaları yaratık, çatlak ve yoldaş seferlerinden düşer. Tüm sunucu birlikte çözer.', 'Fragments drop from creatures, rifts and expeditions. The whole server deciphers them together.'],
  'insc.1': ['«Mühür içeriden kırılmadı. Dışarıdan, gökten bir el kilidi kendi anahtarıyla açtı.»', '"The seal was not broken from within. A hand from the sky opened the lock with its own key."'],
  'insc.2': ['«Ak sakallar sustukları için değil, hatırlamak istemedikleri için sır tutar. Kurt rüyada konuşur; uyanıkken kimse dinlemez.»', '"The Elders keep secrets not from silence but from the wish to forget. The wolf speaks in dreams, for no one listens awake."'],
  'insc.3': ['«Tengri kutu\'yu çok kişiye verdi; çünkü kapıyı açan el de, kapatacak el de tek bir alpın gücünü aşar.»', '"Tengri gave the Kut to many, for the hand that opened the door and the hand that shuts it exceed a single Alp."'],
  // — öğretici —
  'tut.0': ['Yazık Bozkır\'da yaratık yen', 'Defeat creatures on the steppe'], 'tut.1': ['Obaya kaynak bağışla (Otağ\'a yaklaş, O)', 'Donate resources to the camp (near the Otağ, O)'], 'tut.2': ['Bir bina yükselt (Otağ → O)', 'Upgrade a building (Otağ → O)'],
  'tut.3': ['Bir yoldaşı sefere gönder', 'Send a companion on an expedition'], 'tut.4': ['Demirciye git ve bir eşyayı yükselt (E)', 'Visit the Smith and upgrade an item (E)'], 'tut.end': ['Tüm görevler bitti. Sıra sende, alp!', 'All tasks complete. Go forth, Alp!'],
  'elder.hello': ['Hoş geldin, evladım. Mühür çatladı ve bozkıra yaramaz yaratıklar taştı. Tengri sana kut bahşetti; boyun için savaş, obanı büyüt!', 'Welcome, child. The seal has cracked and mischievous creatures spill onto the steppe. Tengri granted you Kut; fight for your tribe and grow your camp!'],
  'elder.tip1': ['Boşluk tuşunu basılı tut: en yakın yaratığa vurursun. 1–6 tuşları yetenekleri kullanır.', 'Hold Space to strike the nearest creature. Keys 1–6 use your skills.'],
  'elder.tip2': ['Çağrı Narası (3) ile yaratıkları topla, sonra alan yetenekleriyle tek seferde temizle.', 'Pull creatures with Rallying Roar (3) then clear them with area skills.'],
  'elder.tip3': ['Bozkırda zaman zaman Erlik çatlakları açılır. Yakın ol, otomatik katılırsın.', 'Erlik rifts open on the steppe now and then. Get close and you join automatically.'],
  'elder.tip4': ['Çevrimdışıyken de oba üretir, yoldaşlar sefere devam eder, dinlenmiş deneyim birikir.', 'While you are away your camp produces, companions keep exploring and rested XP builds up.'],
  'elder.talk': ['Ak Sakal ile konuş', 'Talk to the Elder'],
  // — yardım —
  'help.title': ['Nasıl oynanır', 'How to play'],
  'help.move': ['WASD / Oklar: yürü · Sağ tuş sürükle: kamera · Tekerlek: yakınlaş', 'WASD / Arrows: move · Right-drag: camera · Wheel: zoom'],
  'help.fight': ['Boşluk (basılı tut): otomatik saldırı · 1–6: yetenekler · Tıkla: hedef seç', 'Space (hold): auto-attack · 1–6: skills · Click: target'],
  'help.panels': ['I çanta · C karakter · K yetenekler · O oba · Y yazıtlar · E etkileşim · Enter sohbet', 'I bag · C character · K skills · O camp · Y inscriptions · E interact · Enter chat'],
  'help.zones': ['Yurt güvenli. Bozkırda PvP açıktır; kendi boyundan ya da savaşmayan birini öldürürsen derecen düşer ve adın kırmızı olur.', 'The camp is safe. PvP is open on the steppe; killing your own tribe or a non-combatant lowers your rank and turns your name red.'],
  // — sistem iletileri —
  'sys.levelup': ['Seviye atladın! Yeni seviye: {lvl}', 'Level up! You are now level {lvl}'], 'sys.spec_ready': ['Uzmanlık seçebilirsin! (K)', 'You can pick a specialization! (K)'],
  'sys.tut_done': ['Ak Sakal\'ın görevi tamamlandı, ödül aldın!', 'Elder\'s task complete, reward received!'],
  'sys.rank_down': ['Derecen düştü ({rank}). Adın kırmızı, muhafızlar sana saldıracak!', 'Your rank dropped ({rank}). Your name is red; guards will attack you!'],
  'sys.rank_up': ['Derecen yükseldi.', 'Your rank improved.'], 'sys.xp_lost': ['Ölümde {xp} deneyim kaybettin.', 'You lost {xp} XP on death.'],
  'sys.item_lost': ['Bir eşyanı düşürdün!', 'You dropped an item!'], 'sys.bag_full': ['Çanta dolu!', 'Bag is full!'],
  'sys.duel_invite': ['{name} seni düelloya çağırıyor.', '{name} challenges you to a duel.'], 'sys.duel_start': ['{name} ile düello başladı!', 'Duel with {name} started!'],
  'sys.duel_won': ['Düelloyu kazandın!', 'You won the duel!'], 'sys.duel_lost': ['Düelloyu kaybettin.', 'You lost the duel.'], 'sys.no_player': ['Oyuncu bulunamadı.', 'Player not found.'],
  'sys.rift_open': ['Bozkırda bir Erlik çatlağı açıldı! Yurttan {d} birim uzakta.', 'An Erlik rift opened on the steppe! {d} units from camp.'], 'sys.rift_closed': ['Çatlak kapandı! Ganimetin yağıyor.', 'The rift is sealed! Loot rains down.'],
  'sys.inscription': ['Yazıt {n} çözüldü! Sunucu birlikte bir sırrı açığa çıkardı. (Y)', 'Inscription {n} deciphered! The server uncovered a secret together. (Y)'],
  'sys.welcome': ['KUT\'a hoş geldin! Ak Sakal ile konuşarak başla.', 'Welcome to KUT! Start by talking to the Elder.'],
  'sys.loot': ['{what}', '{what}'],
  // — hatalar —
  'err.bad_name': ['Ad 3–16 harf/rakam olmalı.', 'Name must be 3–16 letters/digits.'], 'err.bad_password': ['Parola en az 4 karakter olmalı.', 'Password needs at least 4 characters.'],
  'err.name_taken': ['Bu ad alınmış.', 'That name is taken.'], 'err.no_account': ['Böyle bir hesap yok.', 'No such account.'], 'err.wrong_password': ['Parola yanlış.', 'Wrong password.'],
  'err.too_many_attempts': ['Çok fazla deneme. Biraz bekle.', 'Too many attempts. Please wait.'], 'err.bad_boy': ['Geçersiz boy.', 'Invalid tribe.'], 'err.duplicate': ['Hesabına başka yerden girildi.', 'Your account logged in elsewhere.'],
  'err.too_far': ['Çok uzaktasın.', 'Too far away.'], 'err.dead': ['Yenikken yapamazsın.', 'Cannot do that while defeated.'], 'err.no_item': ['Eşya bulunamadı.', 'Item not found.'],
  'err.level_low': ['Seviyen yetersiz (gereken: {lvl}).', 'Level too low (need {lvl}).'], 'err.bag_full': ['Çanta dolu.', 'Bag is full.'], 'err.no_gold': ['Akçen yetmiyor.', 'Not enough akçe.'],
  'err.no_ore': ['Demir cevherin yetmiyor.', 'Not enough iron ore.'], 'err.no_book': ['Demirci el kitabın yok.', 'No Smith\'s Handbook.'], 'err.no_charm': ['Koruma tılsımın yok.', 'No Protection Charm.'],
  'err.charm_useless': ['Tılsım +5 ve üzeri hedefte işe yarar.', 'Charms only matter for +5 and above.'], 'err.max_up': ['Eşya zaten +9.', 'Item is already +9.'], 'err.no_materials': ['Malzeme yetersiz.', 'Not enough materials.'],
  'err.demir_low': ['Demirhane seviye {lvl} olmalı.', 'Smithy must be level {lvl}.'], 'err.bad_slot': ['Geçersiz yuva.', 'Invalid slot.'], 'err.spec_set': ['Uzmanlık zaten seçildi.', 'Specialization already chosen.'],
  'err.bad_spec': ['Geçersiz uzmanlık.', 'Invalid specialization.'], 'err.no_skill_points': ['Yetenek puanın yok.', 'No skill points.'], 'err.max_rank': ['Yetenek üst kademede.', 'Skill is at max rank.'],
  'err.too_soon': ['Biraz bekle.', 'Wait a moment.'], 'err.duel_safe_only': ['Düello yalnızca güvenli bölgede.', 'Duels are only in the safe zone.'], 'err.no_invite': ['Bekleyen davet yok.', 'No pending invite.'],
  'err.bad_amount': ['Geçersiz miktar.', 'Invalid amount.'], 'err.not_enough': ['Çantanda yeterince yok.', 'Not enough in your bag.'], 'err.upgrade_busy': ['Başka bir yükseltme sürüyor.', 'Another upgrade is in progress.'],
  'err.novice_cap': ['Acemi oba sınırı.', 'Novice camp limit.'], 'err.otag_cap': ['Önce Otağ\'ı yükselt.', 'Upgrade the Otağ first.'], 'err.oba_short': ['Ortak ambarda yeterli kaynak yok.', 'Not enough resources in shared storage.'],
  'err.bad_hours': ['Geçersiz süre.', 'Invalid duration.'], 'err.no_companion': ['Yoldaş yok.', 'No such companion.'], 'err.comp_busy': ['Yoldaş zaten seferde.', 'Companion is already away.'],
  'err.slots_full': ['Yoldaş yuvaları dolu.', 'Companion slots are full.'], 'err.no_expedition': ['Sefer bulunamadı.', 'Expedition not found.'], 'err.exp_not_done': ['Sefer henüz bitmedi.', 'Expedition not finished yet.'],
  'err.rate_limited': ['Çok hızlı! Biraz yavaşla.', 'Too fast! Slow down.'], 'err.internal': ['Beklenmeyen hata.', 'Unexpected error.'], 'err.bad_op': ['Geçersiz işlem.', 'Invalid action.'], 'err.no_player': ['Oyuncu bulunamadı.', 'Player not found.'],
  'err.net': ['Sunucuya ulaşılamadı.', 'Could not reach the server.'], 'err.disconnected': ['Bağlantı koptu.', 'Disconnected.'], 'err.webgl': ['Tarayıcın WebGL desteklemiyor.', 'Your browser does not support WebGL.'],
  // — sonuçlar —
  'up.success': ['Başarılı! +{n}', 'Success! +{n}'], 'up.fail': ['Başarısız. Malzeme gitti, eşya korundu.', 'Failed. Materials lost, item kept.'], 'up.failCharm': ['Başarısız ama tılsım eşyayı korudu!', 'Failed, but the charm saved the item!'],
  'up.destroyed': ['Eşya yok oldu…', 'The item was destroyed…'], 'craft.ok': ['Üretildi!', 'Crafted!'], 'sold': ['Satıldı: +{n} akçe', 'Sold: +{n} akçe'],
  'loot.item': ['{name} bulundu!', 'Found {name}!'], 'loot.gold': ['+{n} akçe', '+{n} akçe'],
  'dmg.blocked': ['Emildi', 'Absorbed'],
};

export function t(key: string, p?: Record<string, string | number>): string {
  const e = D[key];
  let s = e ? e[lang === 'tr' ? 0 : 1] : key;
  if (p) for (const k of Object.keys(p)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(p[k]));
  return s;
}
export const hasKey = (k: string) => k in D;
export const itemName = (it: Pick<Item, 'slot' | 'band' | 'tier'>) => t(`tierp.${it.tier}`) + t(`item.${it.slot}.${it.band}`);
export const tierName = (tier: number) => t(`tier.${tier}`);
export const tierKey = (tier: number) => TIER_KEYS[tier];
export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h > 0 ? `${h}${lang === 'tr' ? 'sa' : 'h'} ${m}${lang === 'tr' ? 'dk' : 'm'}` : m > 0 ? `${m}${lang === 'tr' ? 'dk' : 'm'} ${x}${lang === 'tr' ? 'sn' : 's'}` : `${x}${lang === 'tr' ? 'sn' : 's'}`;
}
export const num = (n: number) => Math.round(n).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
