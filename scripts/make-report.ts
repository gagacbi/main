import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Teslim raporunu üretir ve her kabul kriterinin kanıtını DOĞRULAR:
 *  - vitest JSON çıktısındaki testler gerçekten geçmiş mi,
 *  - e2e raporundaki kontroller geçmiş mi,
 *  - ekran görüntüsü dosyaları var mı.
 * Herhangi bir kriter kanıtsız veya başarısızsa betik hata koduyla çıkar.
 */
type Ev = { t?: string; e?: string; s?: string; d?: string };
interface Crit { id: string; text: string; ev: Ev[] }
const E = (...ev: Ev[]) => ev;

const CRITERIA: Crit[] = [
  { id: 'A1', text: 'Babylon.js + TypeScript + Vite istemci, Node.js + Colyseus sunucu; tek dil TypeScript', ev: E({ d: 'stack' }) },
  { id: 'A2', text: 'Sunucu yetkili: hasar/ganimet/yükseltme/ekonomi yalnızca sunucuda; istemci yalnızca niyet yollar', ev: E({ t: 'istemci yalnızca yön gönderir' }, { t: 'hasar ve ganimet istemciden verilemez' }, { t: 'öldürme: deneyim + akçe + ganimet' }) },
  { id: 'A3', text: 'Hız aşımı / ışınlanma denemesi etkisiz', ev: E({ t: 'ışınlanma denemesi' }, { t: 'ağ kesilince girdi zaman aşımına' }) },
  { id: 'A4', text: 'İstek hızı sınırlaması', ev: E({ t: 'saniyede çok sayıda RPC' }, { t: 'sohbet sıklığı sınırlanır' }) },
  { id: 'A5', text: 'Kalıcılık: çıkış-giriş ve sunucu yeniden başlatma sonrası veri aynen döner', ev: E({ t: 'çıkış-giriş sonrası karakter' }, { t: 'sunucu yeniden başlasa da' }) },
  { id: 'A6', text: 'Tüm ekonomi işlemleri ledger’a yazılır', ev: E({ t: 'çıkış-giriş sonrası karakter' }, { t: 'satış akçe verir' }, { t: 'RPC üzerinden: demirciye yakın olmak şart' }) },
  { id: 'A7', text: 'Katmanlama ve oymak arkadaşını aynı katmana yönlendirme', ev: E({ t: 'oda dolunca ikinci katman açılır' }) },
  { id: 'A8', text: 'Parola düz metin saklanmaz; hatalı parola/kopya ad reddedilir', ev: E({ t: 'parola düz metin saklanmaz' }, { t: 'aynı hesapla ikinci giriş' }) },
  { id: 'A9', text: '10 eşzamanlı istemci birbirini görür; tick süresi bütçe içinde', ev: E({ t: '10 eşzamanlı istemci' }, { d: 'a9' }) },
  { id: 'A10', text: 'Başlangıç yükü 50 MB altında', ev: E({ d: 'bundle' }) },
  { id: 'B1', text: 'Saldırı basılı tutulunca en yakın düşmana otomatik seri vuruş', ev: E({ t: 'saldırı basılı tutulunca' }, { e: 'B1.otomatik' }) },
  { id: 'B2', text: '6 yetenek, bekleme sunucuda doğrulanır, alan hasarı', ev: E({ t: 'bekleme sunucuda doğrulanır' }, { t: 'alan yeteneği tek seferde' }, { t: '6 aktif yetenek' }, { e: 'B2.alan' }, { e: 'B2.yetenek-temizleme' }, { s: '06c-alan-yetenegi.png' }) },
  { id: 'B3', text: 'Yetenek kademeleri M1…G1, P', ev: E({ t: 'yetenek kademesi' }, { t: 'daha yüksek kademe daha çok hasar' }, { e: 'B3.kademe' }, { s: '10-yetenekler.png' }) },
  { id: 'B4', text: 'Seviye 10 uzmanlık: Kalkan Alp / Kılıç Alp', ev: E({ t: 'seviye 10 öncesi seçilemez' }, { t: 'Kalkan Alp sarsıntıyla' }, { t: 'Kalkan Alp daha dayanıklı' }, { e: 'B4.uzmanlik' }, { s: '09-karakter-uzmanlik.png' }) },
  { id: 'B5', text: 'Durum etkileri: sersemletme, yavaşlatma, zehir, lanet, kalkan', ev: E({ t: 'sersemletme: sersemlemiş yaratık' }, { t: 'zehir: zamanla hasar verir' }, { t: 'Albastı laneti' }, { t: 'Kalkan Alp sarsıntıyla' }, { t: 'Çağrı Narası uzaktaki' }) },
  { id: 'B6', text: 'Yaratık toplama (Çağrı Narası) ve ganimet yağmuru', ev: E({ t: 'Çağrı Narası uzaktaki' }, { e: 'B6.toplama' }, { e: 'B6.ganimet' }, { e: 'B6.ganimet-toplandi' }, { s: '06b-cagri-narasi.png' }, { s: '07-ganimet-yagmuru.png' }) },
  { id: 'B7', text: 'Ölüm cezası bölgeye göre işler', ev: E({ t: 'riskli bölgede yaratığa ölünce' }, { t: 'güvenli bölgede yaratık saldırmaz' }, { e: 'B7.olum-ekrani' }, { e: 'B7.yeniden-dogus' }, { s: '20-olum.png' }) },
  { id: 'B8', text: 'PvE ve PvP için ayrı katsayı', ev: E({ t: 'PvP ayrı katsayı kullanır' }, { t: 'lanet verilen hasarı azaltır' }) },
  { id: 'C1', text: '3 boy, seçim, pasif bonus, renk kimliği', ev: E({ t: 'Gök hız, Yer can+savunma' }, { e: 'C1.boy-secimi' }, { e: 'C1.boy-kaydi' }, { e: 'F2.boy-kimlik' }, { s: '02-karakter-olustur.png' }) },
  { id: 'C2', text: 'Güvenli bölgede PvP yok (yalnızca düello); riskli bölgede açık', ev: E({ t: 'PvP bilinçli başlar' }, { t: 'güvenli bölgede yaratık saldırmaz' }, { t: 'düello: yalnızca güvenli bölgede' }) },
  { id: 'C3', text: 'Derece sistemi: ceza, kırmızı ad, geri kazanma', ev: E({ t: 'derece: kendi boyunu' }, { t: 'kırmızı adlı oyuncu ölünce' }) },
  { id: 'C4', text: 'Şehir muhafızları kırmızı adlıya saldırır', ev: E({ t: 'derece: kendi boyunu' }) },
  { id: 'D1', text: '50 seviye, her 10 seviyede duvar, Kut puanı', ev: E({ t: '50 seviye; her 10 seviyede belirgin duvar' }, { t: 'seviye sınırından sonra deneyim Kut' }, { t: 'yaratık başına gereken sayı' }, { t: 'seviye atlama: deneyim eğrisine göre' }) },
  { id: 'D2', text: 'Dinlenmiş deneyim: birikim, ≈1,5 seviye sınır, 2× deneyim, obada hızlı', ev: E({ t: 'üst sınır ≈ 1,5 seviye' }, { t: 'obada (otağ yakını) daha hızlı' }, { t: 'dinlenmiş deneyim: çevrimdışıyken birikir' }) },
  { id: 'D3', text: 'Artı basma +0→+9, PRD oranları, +5 üstü yok olur, oranlar arayüzde', ev: E({ t: 'oranlar PRD taslağıyla uyumlu' }, { t: 'istatistiksel doğrulama' }, { t: '+1…+4 başarısızlıkta eşya korunur' }, { e: 'D3.oranlar-ui' }, { e: 'D3.basari' }, { e: 'D3.yok-olma' }, { s: '11-demirci-artibasma.png' }) },
  { id: 'D4', text: 'El kitabı şans artırır; koruma tılsımı korur; market/oyun içi eşitliği', ev: E({ t: 'demirci el kitabı +10 puan ekler' }, { t: 'el kitabı serbest, koruma tılsımı Demirhane 2' }, { e: 'D4.kitap' }, { e: 'D4.tilsim' }, { s: '11d-demirci-tilsim-korudu.png' }) },
  { id: 'D5', text: 'Ganimet kademeleri, efsunlar, bireysel ganimet', ev: E({ t: 'kademe dağılımı yaklaşık' }, { t: 'üst kademe aynı seviyede daha güçlü' }, { t: 'ganimet yalnızca vuran oyuncuya görünür' }, { e: 'D5.envanter' }, { s: '08-canta.png' }) },
  { id: 'D6', text: 'Erlik çatlağı: rastgele, dalgalar + bekçi, ölçekleme, otomatik katılım, garanti ganimet', ev: E({ t: 'rastgele zamanda ve yerde açılır' }, { t: 'otomatik katılım: yaklaşınca dalgalar' }, { t: 'zorluk yakındaki oyuncu sayısı' }, { e: 'D6.catlak-acik' }, { e: 'D6.catlak-ui' }, { s: '17-erlik-catlagi-acik.png' }, { s: '18-erlik-catlagi-dalga.png' }) },
  { id: 'E1', text: 'Acemi oymak, otomatik giriş, NPC ak sakal öğretir', ev: E({ t: 'yeni oyuncu boyunun acemi oymağına' }, { t: 'öğretici adımları' }, { e: 'E1.ak-sakal' }, { e: 'E1.oba-paneli' }, { s: '12-ak-sakal.png' }, { s: '13-oba.png' }) },
  { id: 'E2', text: '2 bina; yükseltme bitiş zamanı DB’de, çevrimdışıyken ilerler', ev: E({ t: 'bitiş zamanı veritabanına yazılır' }, { e: 'E2.yukseltme' }, { s: '14-oba-yukseltme.png' }) },
  { id: 'E3', text: 'Otağ diğer binaların sınırını belirler; acemi oba sınırı', ev: E({ t: 'bitiş zamanı veritabanına yazılır' }, { t: 'acemi oba seviye sınırı vardır' }) },
  { id: 'E4', text: 'Yoldaş seferleri 1/4/12 saat, giriş anında hesaplanır, yuva sınırı', ev: E({ t: 'sonuç tohuma bağlı deterministik' }, { t: '1/4/12 saat; erken toplanamaz' }, { t: 'yoldaş yuvası dolunca' }, { e: 'E4.sefer' }, { e: 'E4.sefer-hazir' }, { s: '15b-sefer-odulu.png' }) },
  { id: 'E5', text: 'Katılım puanı ve puana göre paylaşım', ev: E({ t: 'bağış, yükseltme ve sefer katılım puanı' }, { t: 'katılım puanı olmayan üye de pay alır' }) },
  { id: 'E6', text: 'Oba üretimi çevrimdışıyken birikir ve girişte toplanır', ev: E({ t: 'üretim çevrimdışıyken birikir' }) },
  { id: 'E7', text: 'Kayıp Yazıtlar: sunucu çapı sayaç, eşik, duyuru', ev: E({ t: 'sunucu çapı parça sayacı' }, { e: 'E7.yazit' }, { s: '16-yazitlar.png' }) },
  { id: 'F1', text: 'Cel-shade: bantlı gölge + kontur; PRD paleti', ev: E({ e: 'F1.toon' }, { e: 'F1.palet' }, { s: '03-oyun-yurt.png' }, { s: '05-yaratiklar.png' }) },
  { id: 'F2', text: 'Boy renk kimliği; silüetten okunur sınıf/boy', ev: E({ e: 'F2.boy-kimlik' }, { s: '04-boylar-silueti.png' }) },
  { id: 'F3', text: 'Yaratık türleri ayrı siluetli ve animasyonlu', ev: E({ e: 'F3.yaratiklar' }, { e: 'F3.siluet' }, { s: '05-yaratiklar.png' }) },
  { id: 'F4', text: 'Keçe/deri paneller, tamga ikonları, minimal HUD, mini harita', ev: E({ e: 'F4.hud' }, { s: '03-oyun-yurt.png' }, { s: '13-oba.png' }, { s: '11-demirci-artibasma.png' }) },
  { id: 'F5', text: 'Üretilmiş kopuz/davul sesi, efekt sesleri, sessiz mod', ev: E({ e: 'F5.ses' }, { e: 'F5.sessiz' }) },
  { id: 'F6', text: 'Türkçe ve İngilizce, çalışma anında değişir; Türkçe karakterler doğru', ev: E({ e: 'F6.tr' }, { e: 'F6.en' }, { e: 'F6.font' }, { s: '01-giris-tr.png' }, { s: '01b-giris-en.png' }) },
  { id: 'F7', text: 'Performans ölçülür ve raporlanır; 150 ms gecikmede akıcılık', ev: E({ e: 'F7.olcum' }, { t: 'B.gecikme150' }, { d: 'latency' }) },
  { id: 'H1', text: 'Yönetici (GM) hesabı: rol yalnızca yerel veritabanı/CLI’den gelir, her komut sunucuda doğrulanır; yetkisiz reddedilir; tüm komutlar ledger’a yazılır', ev: E({ t: 'rolü olmayan hesap GM komutu çalıştıramaz' }, { t: 'yönetici: level / kit / gold' }, { e: 'H1.yetkisiz-arayuz' }, { e: 'H1.rol' }) },
  { id: 'H2', text: 'Yönetici paneli (F2 / /gm): 30+ hızlı komut, seviye/kit/ölümsüzlük/ışınlanma/zaman ileri sarma/ölçüm; arayüzden sunucuya gider', ev: E({ t: 'GM zaman ilerletme' }, { e: 'H1.panel' }, { e: 'H1.komut' }, { e: 'H1.sohbet-gm' }, { s: '25-yonetici-paneli.png' }) },
  { id: 'H3', text: 'Gizem: 5 ayrı sistemden beslenen ipucu iplikleri (yazıt, rüya, Ak Sakal, balbal taşı, mühür kırığı) ve dördü birleşince açılan “Mühürün Dışı”; cevap bilerek yazılmamış', ev: E({ t: '8 taş deterministik' }, { t: 'uzun süre çevrimdışı kalıp dönen oyuncu' }, { t: 'Ak Sakal: seviye eşiklerinde' }, { t: 'Erlik çatlağı kapanınca mühür kırığı' }, { t: '"Mühürün Dışı"' }, { d: 'gizem' }) },
  { id: 'H4', text: 'Gizem arayüzü: balbal taşı etkileşimi, rüya ekranı, kodeks (iplik sekmeleri, unvanlar)', ev: E({ e: 'H2.tas-okuma' }, { e: 'H3.ruya' }, { e: 'H3.kodeks' }, { s: '22-balbal-tasi-okundu.png' }, { s: '23-kurdun-ruyasi.png' }, { s: '24-kodeks-muhurun-disi.png' }) },
  { id: 'H5', text: 'Hızlandırılmış denge testi: bot simülasyonu (sahte saat, gerçek sunucu kuralları) ve çözümsel tablolar; hasar/bonus/artı basma/boy-uzmanlık/çatlak/ekonomi sayıları belgeli', ev: E({ d: 'balans' }) },
  { id: 'H6', text: 'Denge değişmezleri testle korunur (öldürme süresi, can kaybı, seviye farkı, boy/uzmanlık dengesi, artı basma/tılsım, bonus üst sınırları)', ev: E({ t: 'aynı seviye yaratığı öldürme süresi' }, { t: 'öldürme başına can kaybı' }, { t: '+5 seviye yaratık bedeli artırır' }, { t: 'Kılıç Alp ≥%12 daha çok DPS' }, { t: 'korumasız +7 yaklaşık 8 parça yakar' }, { t: 'en uç yığılma' }) },
  { id: 'H7', text: 'Savunma sistemi (Metin2 tarzı): 5 silah türü, tür savunmaları (kılıç/çift el/bıçak/yay/büyü), vuruş ve beceri bloğu, delme; her parçada temel efsun; yaratık ve oyuncu hasarına sunucuda uygulanır', ev: E({ t: 'tür savunması yalnızca o türü azaltır' }, { t: 'her parçada slotun havuzundan bir temel efsun' }, { t: 'vuruş bloğu: ~%30 vuruş' }, { t: 'kılıç savunması kılıç vuruşunu azaltır' }, { t: 'bloklanan beceri sersemletme' }, { t: 'yaratık vuruşu da bloklanabilir' }, { e: 'H5.savunma-paneli' }, { e: 'H5.temel-efsun' }, { s: '30-karakter-savunmalar.png' }, { s: '31-esya-temel-efsun.png' }) },
  { id: 'H8', text: 'Seviye grubu içeriği: 5 saha bossu (alan darbesi, öfke, savunma türüne göre ganimet, duyuru, yeniden doğuş), 10·20·30·40·50 kilometre taşı armağanı, seviye grubuna göre aura', ev: E({ t: '5 boss deterministik konumda' }, { t: 'öldürülünce katılımcıya garanti destansı' }, { t: 'alan darbesi: önce uyarı halkası' }, { t: 'öfke: can %30 altına' }, { t: 'seviye 10·20·30·40·50’de bir kez' }, { e: 'H5.kilometre-tasi' }, { e: 'H5.saha-bossu' }, { s: '26-kilometre-tasi.png' }, { s: '27-saha-bossu.png' }, { s: '28-boss-alan-darbesi.png' }, { s: '29-seviye-aurasi.png' }) },
  { id: 'H9', text: 'Sokak lambası avı: kolay ölçülen yerde değil, sistemlerin kesiştiği yerde arayan testler — güvenli bölge sınırında menzilli silah, kaçarak vurma, kaynak döngüleri, rastgele işlem fuzz’ı, eşzamanlı istek yarışı, zamanla oynama, sayı uçları ve PvP eşleşme matrisi; bulgular belgelenmiş', ev: E({ t: 'güvenli bölgeden (yay/çan menzili)' }, { t: 'üret → sat döngüsü zarardır' }, { t: 'üret → artı bas → sat döngüsü zarardır' }, { t: 'rastgele işlem fuzz' }, { t: 'aynı eşyayı aynı anda 20 kez satmak' }, { t: 'sık çık-gir dinlenmiş deneyimi artırmaz' }, { t: 'rastgele 3000 yapı' }, { t: 'hiçbir yapı genel kazanma oranında' }, { t: 'her ana yapının en az bir avı' }, { t: 'uzmanlık aynalı düello' }, { d: 'felsefe' }) },
  { id: 'H10', text: 'Oyuncular arası pazar: ilan/satın alma tek işlemde, vergi ve ilan ücreti akçe sinki, yeni hesap kısıtı, fiyat tavanı/tabanı, süre dolumu, çevrimdışı satıcıya posta, para ve eşya korunumu; seviyeye uygun fırsat görünümü', ev: E({ t: 'ilan → satın alma: eşya el değiştirir' }, { t: 'aynı ilanı iki alıcı aynı anda alamaz' }, { t: 'kısıtlar: yeni hesap ilan veremez' }, { t: 'süresi dolan ilan eşyayı' }, { t: 'rastgele alım-satım fuzz' }, { t: 'efsun yenileme' }, { e: 'H5.pazar-paneli' }, { e: 'H5.efsun-yenile' }, { e: 'H5.olum-ipucu' }, { s: '32-pazar.png' }, { s: '33-efsun-yenile.png' }, { s: '34-olum-ipucu.png' }) },
  { id: 'H11', text: 'Nüfus simülasyonu: 150 oyuncu, 10 arketip, 14 gün; gerçek sunucu kodu, gerçek-zamanlı dilimler + ölçekleme; her karakterin kendi raporu; bulgular lamba analiziyle belgelenmiş; çıkan düzeltmeler testle kilitli', ev: E({ d: 'populasyon' }, { t: 'düşük seviye koruması' }, { t: 'PvP cezası ilk saldırana' }, { t: 'kırmızı adlı oyuncu yurtta doğunca' }, { t: 'zirve seviye (41–48) için yeterli kamp' }, { t: 'saha bossu, kendisine vuran' }, { t: 'yeni oyuncu koruması' }, { t: 'kalabalık kamp' }) },
  { id: 'H12', text: 'Çoklu harita: tek dünyada uzak bölgeler (Bozkır, Kutlu Otlak, Erlik Diyarı); bölgeye duyarlı hareket/kamp/boss/çatlak; kapı taşı yolculuğu seviye ve dövüş kurallarıyla; boş bölgede yaratık uykuda', ev: E({ t: 'bölgeler birbirinden ayrık' }, { t: 'Bozkır kampları eskisi gibi' }, { t: 'her boss kendi haritasında' }, { t: 'stepMove: bölge sınırı' }, { t: 'kapı taşı yurdun içinde' }, { t: 'travel: yurttan Otlak' }, { t: 'boş bölgelerde yaratık güncellenmez' }, { e: 'H12.kapi-paneli' }, { e: 'H12.otlak' }, { s: '35-kapi-tasi.png' }, { s: '36-kutlu-otlak.png' }) },
  { id: 'H13', text: 'İsteğe bağlı PvP: yalnızca iki taraf da bayraklıysa vurulur; kapatmak için PvP’den 30 sn uzak durulur; bayraklı %10 fazla kazanır; Kutlu Otlak ve zindan PvP’ye kapalı; yeni oyuncu bölgesi', ev: E({ t: 'varsayılan kapalı' }, { t: 'bayrak kapanışı PvP’den 30 sn sonra' }, { t: 'Otlak ve zindan PvP’ye kapalı' }, { t: 'güvenli bölgede PvP yok (bayraklı olsa da)' }, { t: 'bayraklı alp yaratıklardan %10 fazla XP' }, { e: 'H13.otlak-pvp-yok' }, { e: 'H13.bayrak' }, { e: 'H13.bayrak-kapat' }, { s: '37-pvp-bayragi.png' }) },
  { id: 'H14', text: 'Zindanlar (Demir Madeni Sv41+, Gölge Mağarası Sv46+): ayrı örnek bölgeler, parti toplama, dalgalar + boss, giriş ücreti, günlük hak, süre sınırı, ölüm/ayrılma kuralları, ödül; Erlik Diyarı kapı paneli', ev: E({ t: 'giriş koşulları: seviye, ücret' }, { t: 'tam akış: dalgalar' }, { t: 'günlük hak biter' }, { t: 'zindanda ölen deneyim kaybetmez' }, { t: 'süre dolunca zindan kaybedilir' }, { e: 'H14.zindan-paneli' }, { e: 'H14.zindan-giris' }, { e: 'H14.zindan-cikis' }, { s: '38-erlik-kapi-zindan.png' }, { s: '39-zindan.png' }) },
  { id: 'H15', text: 'Kostüm sistemi: süreli minimal özellikli giysi; Dokuma Tezgâhı (günlük/haftalık ücretli üretim), şansa bağlı üretim + şans eşyaları, efsunlama/değiştirme/görünüm akçe sinki, +1 hafta uzatma (efsunlar yalnızca uzatılırsa kalır); avatarda görünür', ev: E({ t: 'maliyet birimi seviyeyle büyür' }, { t: 'şans: tavan' }, { t: 'kostüm minimal' }, { t: 'tezgâh: gün/hafta' }, { t: 'tezgâha uzaktan' }, { t: 'üretim: malzeme' }, { t: 'üretim koşulları' }, { t: 'giy, efsun ekle' }, { t: 'süre dolunca kostüm' }, { t: 'uzatma: +1 hafta' }, { t: 'uzatma yüklüdür' }, { t: 'şans eşyaları tezgâhtan' }, { t: 'zindan ödülü kostüm' }, { e: 'H15.tezgah-paneli' }, { e: 'H15.kostum-giy' }, { s: '40-dokuma-tezgahi.png' }, { s: '41-kostum-giyili.png' }) },
  { id: 'H16', text: 'Pazar her şeyi takas eder: ekipmanın yanında malzeme, kitap, tılsım, yazıt parçası, kostüm malzemeleri ve şans eşyaları (Efsun Değiştirme Kağıdı dahil) yığın ilanıyla alınıp satılır; vergi/ilan ücreti, fiyat sınırı, iptal/süre dolumu iadesi, korunum', ev: E({ t: 'her mal türü' }, { t: 'sınırlar: fazla adet' }, { t: 'malı kendi alamaz' }, { e: 'H16.pazar-mal' }, { s: '42-pazar-mallar.png' }) },
  { id: 'H17', text: 'Eşya düşme eğrisi: +1…+5 daha üst yaratık daha çok düşürür (+5’te ×1,5), ötesinde azalır, alttaki yaratıkta hızla azalır; kostüm 1 hafta yaşar, bitince yok olur, uzatma yüklüdür, efsun değiştirme kağıt ister', ev: E({ t: 'eğri: +5 en çok' }, { t: 'sunucuda: +5 yaratık' }, { t: 'süre dolunca kostüm devre dışı kalır ve YOK OLUR' }, { t: 'uzatma yüklüdür' }) },
  { id: 'G1', text: 'typecheck, test, build hatasız', ev: E({ d: 'gate' }) },
];

const OUT = 'docs/evidence';
const j = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null);
const vt = j<{ testResults: { assertionResults: { ancestorTitles: string[]; title: string; status: string }[] }[]; numTotalTests: number; numPassedTests: number; numFailedTests: number }>(`${OUT}/vitest.json`);
const e2e = j<{ at: string; results: { id: string; ok: boolean; detail: string }[]; metrics: Record<string, unknown> }>(`${OUT}/e2e-report.json`);
const lat2 = j<{ rttMs: number; speed: number; maxPredictionError: number; settledError: number; snaps: number; firstFrameMove: number }>(`${OUT}/metrics-latency.json`);
const a9 = j<{ clients: number; tickAvgMs: number; tickMaxMs: number; budgetMs: number; tickHz: number; mobs: number }>(`${OUT}/metrics-a9.json`);
if (!vt || !e2e) { console.error('vitest.json veya e2e-report.json eksik'); process.exit(2); }
const tests = vt.testResults.flatMap((f) => f.assertionResults.map((a) => ({ name: [...a.ancestorTitles, a.title].join(' > '), ok: a.status === 'passed' })));

// derleme / paket boyutu
function walk(d: string): string[] { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
const dist = existsSync('dist') ? walk('dist') : [];
const raw = dist.reduce((s, f) => s + statSync(f).size, 0);
const entry = dist.filter((f) => /index-.*\.(js|css)$|index\.html$/.test(f));
const html = readFileSync('dist/index.html', 'utf8');
const usedFonts = [...html.matchAll(/href="([^"]+\.woff2?)"/g)].length;
const initial = dist.filter((f) => /\.(js|css|html)$/.test(f) && (/index-/.test(f) || f.endsWith('index.html'))); void entry; void usedFonts;
const initialRaw = initial.reduce((s, f) => s + statSync(f).size, 0);
const initialGz = initial.reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0);
const fontBytes = dist.filter((f) => /\.woff2$/.test(f)).reduce((s, f) => s + statSync(f).size, 0);
const mb = (n: number) => (n / 1048576).toFixed(2) + ' MB';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
const tsc = spawnSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], { encoding: 'utf8' });

const detailOf = (e: Ev): { ok: boolean; label: string } => {
  if (e.t) { const m = tests.filter((x) => x.name.includes(e.t!)); return { ok: m.length > 0 && m.every((x) => x.ok), label: `Test: ${m[0]?.name ?? '— BULUNAMADI —'}` }; }
  if (e.e) { const r = e2e.results.find((x) => x.id === e.e); return { ok: !!r && r.ok, label: `E2E \`${e.e}\`: ${r?.detail ?? '— BULUNAMADI —'}` }; }
  if (e.s) { const ok = existsSync(`${OUT}/${e.s}`); return { ok, label: `Ekran görüntüsü: [${e.s}](evidence/${e.s})` }; }
  switch (e.d) {
    case 'stack': { const ok = ['@babylonjs/core', 'colyseus.js', '@colyseus/core', 'vite', 'typescript'].every((k) => k in deps) && tsc.status === 0; return { ok, label: `Bağımlılıklar: @babylonjs/core ${deps['@babylonjs/core']}, colyseus.js ${deps['colyseus.js']}, @colyseus/core ${deps['@colyseus/core']}, vite ${deps['vite']}, typescript ${deps['typescript']}; \`tsc --noEmit\` çıkış=${tsc.status}` }; }
    case 'latency': return { ok: !!lat2 && lat2.snaps === 0 && lat2.maxPredictionError < 2.5, label: lat2 ? `Ölçüm (150 ms RTT, gerçek sunucu + istemci tahmin kodu): en büyük tahmin sapması **${lat2.maxPredictionError} birim** (hız ${lat2.speed} b/sn × RTT ≈ ${(lat2.speed * 0.15).toFixed(2)}), ışınlanma ${lat2.snaps}, durunca sapma ${lat2.settledError}, ilk karede tepki ${lat2.firstFrameMove} birim` : 'ölçüm yok' };
    case 'a9': return { ok: !!a9 && a9.tickAvgMs < a9.budgetMs / 5, label: a9 ? `Ölçüm: ${a9.clients} istemci, ${a9.mobs} yaratık, tick ort. **${a9.tickAvgMs} ms**, maks. ${a9.tickMaxMs} ms (bütçe ${a9.budgetMs} ms @ ${a9.tickHz} Hz)` : 'ölçüm yok' };
    case 'bundle': return { ok: initialRaw + fontBytes < 50 * 1048576, label: `Ölçüm: ilk yük (index.html + JS + CSS) ham ${mb(initialRaw)}, gzip **${mb(initialGz)}**; yazı tipleri ${mb(fontBytes)}; dist toplam ${mb(raw)} (sınır 50 MB)` };
    case 'felsefe': { const ok = existsSync('docs/TEST_FELSEFESI.md'); return { ok, label: 'Belge: [TEST_FELSEFESI.md](../TEST_FELSEFESI.md) (bulgu tablosu, ilkeler, karanlıkta kalanlar)' }; }
    case 'populasyon': { const pp = j<{ meta: { N: number; DAYS: number }; agents: unknown[] }>('docs/balans/populasyon/ham.json'); const files = existsSync('docs/balans/populasyon/oyuncular') ? readdirSync('docs/balans/populasyon/oyuncular').filter((f) => f.endsWith('.md') && f !== 'README.md').length : 0; const ok = !!pp && pp.agents.length >= 100 && files >= 100 && existsSync('docs/POPULASYON_RAPORU.md'); return { ok, label: pp ? `${pp.meta.N} oyuncu × ${pp.meta.DAYS} gün; ${files} karakter raporu: [oyuncular/](../balans/populasyon/oyuncular/README.md); toplu rapor: [POPULASYON_RAPORU.md](../POPULASYON_RAPORU.md)` : 'docs/balans/populasyon/ham.json yok' }; }
    case 'gizem': { const ok = existsSync('docs/GIZEM.md'); return { ok, label: 'Tasarım belgesi: [docs/GIZEM.md](../GIZEM.md)' }; }
    case 'balans': { const b = j<{ progression: { level: number; simHours: number; wallS: number } }>('docs/balans/sonuc.json'); const ok = !!b && existsSync('docs/BALANS_RAPORU.md') && b.progression.level >= 50; return { ok, label: b ? `Bot ilerleme koşusu: ${b.progression.simHours} simüle saat → Sv${b.progression.level} (${b.progression.wallS} sn gerçek süre). Rapor: [BALANS_RAPORU.md](../BALANS_RAPORU.md), ham veri: [sonuc.json](../balans/sonuc.json)` : 'docs/balans/sonuc.json yok (npm run sim)' }; }
    case 'gate': { const ok = tsc.status === 0 && vt.numFailedTests === 0 && dist.length > 0; return { ok, label: `\`tsc --noEmit\` çıkış=${tsc.status}; vitest ${vt.numPassedTests}/${vt.numTotalTests} geçti; dist/ derlendi (${dist.length} dosya)` }; }
  }
  return { ok: false, label: '?' };
};

let failed = 0; const rows: string[] = [];
for (const c of CRITERIA) {
  const evs = c.ev.map(detailOf); const ok = evs.length > 0 && evs.every((x) => x.ok); if (!ok) failed++;
  rows.push(`| **${c.id}** | ${c.text} | ${ok ? '✅' : '❌'} | ${evs.map((x) => `${x.ok ? '' : '❌ '}${x.label}`).join('<br>')} |`);
}

const shots = readdirSync(OUT).filter((f) => f.endsWith('.png')).sort();
const perf = (e2e.metrics.perf ?? {}) as { fps?: number; meshes?: number; active?: number; tris?: number; cpuMs?: number };
const lat = lat2 ?? { maxPredictionError: 0, settledError: 0 };

const md = readFileSync('docs/TESLIM_RAPORU.sablon.md', 'utf8')
  .replace('{{TARIH}}', new Date().toISOString().slice(0, 10))
  .replace('{{DURUM}}', failed === 0 ? `**${CRITERIA.length}/${CRITERIA.length} kabul kriteri kanıtla sağlandı.**` : `**${CRITERIA.length - failed}/${CRITERIA.length} kriter sağlandı; ${failed} kriter kanıtsız/başarısız.**`)
  .replace('{{TABLO}}', rows.join('\n'))
  .replace('{{TESTLER}}', `${vt.numPassedTests}/${vt.numTotalTests}`)
  .replace('{{E2E}}', `${e2e.results.filter((r) => r.ok).length}/${e2e.results.length}`)
  .replace('{{PERF}}', `kare başına JS/CPU maliyeti **${perf.cpuMs ?? '?'} ms** (60 FPS bütçesi 16,7 ms); aktif mesh ${perf.active}/${perf.meshes}; çizilen üçgen ≈ ${Math.round(perf.tris ?? 0).toLocaleString('tr-TR')}; yazılım rasterleştirmede (SwiftShader) ölçülen FPS ≈ ${perf.fps}`)
  .replace('{{GECIKME}}', `150 ms gidiş-dönüş yapay gecikmede yürürken tahmin sapması en çok **${(lat.maxPredictionError ?? 0).toFixed(2)} birim**, durunca **${(lat.settledError ?? 0).toFixed(2)} birim**`)
  .replace('{{BOYUT}}', `ilk yük gzip **${mb(initialGz)}** (ham ${mb(initialRaw)}) + yazı tipleri ${mb(fontBytes)}; toplam dist ${mb(raw)}`)
  .replace('{{GALERI}}', shots.map((s) => `- [\`${s}\`](evidence/${s})`).join('\n'));
writeFileSync('docs/TESLIM_RAPORU.md', md);
console.log(`Rapor yazıldı. Kriter: ${CRITERIA.length - failed}/${CRITERIA.length} ✅`);
for (const c of CRITERIA) { const evs = c.ev.map(detailOf); if (!evs.every((x) => x.ok)) console.log('KANITSIZ', c.id, evs.filter((x) => !x.ok).map((x) => x.label).join(' | ')); }
process.exit(failed ? 1 : 0);
