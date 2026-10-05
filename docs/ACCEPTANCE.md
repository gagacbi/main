# KUT — Kabul Kriterleri (PRD'den türetilmiştir)

PRD'de "kabul kriterleri" başlıklı ayrı bir bölüm yoktur. Bu liste, PRD §14 Aşama 2 (**Prototip**) kapı koşulundan
("Tek bölge, Alp sınıfı, temel savaş ve yaratık toplama, ganimet, eşya yükseltme, basit oba (2 bina, yoldaş seferi),
veritabanına kayıt, çok oyunculu test") ve PRD'nin ölçülebilir ifadelerinden (§2, §5, §7, §8, §12, §13) çıkarılmıştır.
PRD'nin sonraki aşamalara bıraktığı şeyler (Kam/Mergen, kale kuşatması, market, tezgah…) **kapsam dışıdır** ve
`TESLIM_RAPORU.md` içinde gerekçesiyle listelenir. Her kriterin kanıtı `TESLIM_RAPORU.md` tablosunda bağlıdır.

Kanıt türleri: **U** = birim testi, **I** = sunucu entegrasyon testi (gerçek Colyseus + gerçek SQLite), **E** = tarayıcı
uçtan uca testi (gerçek Chromium, ekran görüntüsü / ölçüm), **B** = build ölçümü.

## A. Mimari ve güvenlik (PRD §13)
| # | Kriter | Kanıt |
|---|---|---|
| A1 | İstemci Babylon.js + TypeScript + Vite, sunucu Node.js + Colyseus; tek dil TypeScript | B |
| A2 | Sunucu yetkili: hasar, isabet, ganimet, yükseltme, ekonomi sonuçlarını yalnızca sunucu belirler; istemci yalnızca niyet (girdi) yollar | I |
| A3 | Sunucu yetkili hareket: hız aşımı / ışınlanma denemesi etkisiz kalır | I |
| A4 | İstek hızı sınırlaması vardır ve aşıldığında istekler reddedilir | I |
| A5 | Kalıcı veri: karakter, envanter, oba, sayaçlar veritabanına yazılır; çıkış-giriş sonrası aynen döner | I |
| A6 | Tüm ekonomi işlemleri kayıt defterine (ledger) yazılır | I |
| A7 | Bölge odası kalabalıklaşınca ikinci katmana bölünür; oymak arkadaşı aynı katmana yönlendirilir | I |
| A8 | Parola düz metin saklanmaz; hatalı parola / kopya ad reddedilir | I |
| A9 | 10 eşzamanlı istemci birbirini görür; sunucu tick süresi ölçülür ve bütçe içindedir | I |
| A10 | Başlangıç yükü (sıkıştırılmış) 50 MB altındadır | B |

## B. Savaş ve sınıf (PRD §5)
| # | Kriter | Kanıt |
|---|---|---|
| B1 | Saldırı tuşu basılı tutulunca en yakın düşmana otomatik seri vuruş | I, E |
| B2 | Alp için 6 aktif yetenek, bekleme süreli; alan hasarı ile yaratık grupları tek seferde temizlenir; bekleme sunucuda doğrulanır | I, E |
| B3 | Yetenek kademeleri (M1…G1, P) yetenek puanı + akçe ile yükselir | U, I |
| B4 | Seviye 10'da uzmanlık seçimi: Kalkan Alp / Kılıç Alp, etkileri ölçülebilir biçimde farklıdır | U, I |
| B5 | Durum etkileri: sersemletme, yavaşlatma, zehir, lanet, kalkan çalışır | I |
| B6 | Yaratık toplama: Çağrı Narası yaratıkları çeker; ganimet yağmuru görünür | I, E |
| B7 | Ölüm cezası kuralları bölgeye göre işler (güvenli: yok; riskli: az deneyim kaybı) | I |
| B8 | Hasar formülü PvE ve PvP için ayrı katsayı kullanır | U |

## C. Boylar, PvP, bölgeler (PRD §6)
| # | Kriter | Kanıt |
|---|---|---|
| C1 | 3 boy (Gök/Yer/Ay), karakter oluştururken seçilir; her boyun pasif bonusu ve renk kimliği vardır | U, E |
| C2 | Güvenli bölgede PvP yoktur (yalnızca düello); riskli bölgede PvP açıktır | I |
| C3 | Derece sistemi: kendi boyundan / savaşmayan oyuncuyu öldüren derece kaybeder, adı kırmızı olur, yaratık avlayarak geri kazanır | I |
| C4 | Şehir muhafızları kırmızı adlıya saldırır | I |

## D. İlerleme ve eşya (PRD §7)
| # | Kriter | Kanıt |
|---|---|---|
| D1 | 50 seviye; deneyim eğrisinde her 10 seviyede duvar; seviye sınırı sonrası Kut puanı | U |
| D2 | Dinlenmiş deneyim: çevrimdışıyken birikir, üst sınır ≈1,5 seviye, yaratık deneyimini 2 katlar, obada daha hızlı birikir | U, I |
| D3 | Artı basma +0→+9: PRD tablosundaki oranlar, +5 ve üzeri başarısızlıkta eşya yok olur, +1…+4 korunur; oranlar arayüzde gösterilir | U, I, E |
| D4 | Demirci el kitabı şansı artırır; koruma tılsımı başarısızlıkta eşyayı korur; market/oyun içi eşitliği korunur | U, I |
| D5 | Ganimet kademeleri (sıradan/nadir/destansı/efsanevi), efsunlar; ganimet bireyseldir (başkası görmez) | U, I |
| D6 | Erlik çatlağı: rastgele açılır, dalgalar + bekçi, yakındaki oyuncu sayısına ölçeklenir, otomatik katılım, garanti nadir ganimet | I, E |

## E. Oba (PRD §8)
| # | Kriter | Kanıt |
|---|---|---|
| E1 | Acemi oymak: yeni oyuncu otomatik girer, NPC ak sakal öğretir | I, E |
| E2 | 2 bina (Otağ, Demirhane): yükseltme süresi veritabanında bitiş zamanı olarak tutulur, çevrimdışıyken de ilerler | I |
| E3 | Otağ seviyesi diğer binaların üst sınırını belirler; acemi oba seviye sınırı vardır | U, I |
| E4 | Yoldaş seferleri 1/4/12 saat; sonuç giriş yapıldığında hesaplanır; yoldaş yuvası sınırı | U, I |
| E5 | Katılım puanı (bağış, yükseltme, sefer) ve üretimin puana göre paylaşımı | I |
| E6 | Oba üretimi çevrimdışıyken birikir ve giriş anında toplanır | I |
| E7 | Kayıp Yazıtlar: sunucu çapı parça sayacı, eşik aşılınca yazıt çözülür ve duyurulur | I |

## F. Sanat, ses, arayüz, performans (PRD §12)
| # | Kriter | Kanıt |
|---|---|---|
| F1 | Cel-shade görünüm: bantlı gölgelendirme + kontur çizgisi; PRD paleti (gece mavisi gök, altın bozkır, zümrüt orman, Erlik mor-kızılı) | E |
| F2 | Her boyun ayrı renk kimliği; sınıf/boy kalabalıkta silüetten okunur; büyük kafa/el oranı | E |
| F3 | Yaratık türleri (Tepegöz yavrusu, Albastı, Erlik çırağı, çakal, çatlak bekçisi) ayrı siluetli ve animasyonlu | E |
| F4 | Keçe/deri dokulu panel arayüzü, tamga ikonları, minimal HUD, mini harita | E |
| F5 | Kopuz/davul esintili üretilmiş ses ve efekt sesleri; ses kapatma | E |
| F6 | Türkçe ve İngilizce, çalışma anında değiştirilebilir; Türkçe karakterler doğru görünür | E |
| F7 | Performans: kare süresi ölçülür ve raporlanır (yazılım render'ında alt sınır, bütçe tablosu) | E |

## H. Yönetici hesabı, gizem ve denge (Aşama 2 sonrası ek talep)
| # | Kriter | Kanıt |
|---|---|---|
| H1 | Yönetici (GM) hesabı: rol yalnızca yerel veritabanı/CLI'den gelir, her komut sunucuda doğrulanır; yetkisiz reddedilir; komutlar ledger'a yazılır | I, E |
| H2 | Yönetici paneli (F2 veya `/gm`): 30+ hızlı komut; arayüzden sunucuya gider | I, E |
| H3 | Gizem: 5 ayrı sistemden beslenen ipucu iplikleri ve "Mühürün Dışı"; cevap bilerek yazılmamış | I, doküman |
| H4 | Gizem arayüzü: balbal taşı, rüya ekranı, kodeks | E |
| H5 | Hızlandırılmış bot simülasyonu + çözümsel denge tabloları, belgeli ayarlar | simülasyon, doküman |
| H6 | Denge değişmezleri testle korunur | U |
| H7 | Savunma sistemi: silah türleri, tür savunmaları, blok, delme, temel efsun | U, I, E |
| H8 | Seviye grubu içeriği: saha bossları, kilometre taşı armağanı, aura | I, E |
| H10 | Oyuncular arası pazar (ilan, satın alma, vergi, kısıtlar, posta, korunum) | I |
| H11 | Nüfus simülasyonu: 150 oyuncu, karakter başına rapor, lamba analizi | simülasyon, doküman |
| H9 | Sokak lambası avı: sistemlerin kesiştiği yerlerde arayan testler, PvP eşleşme matrisi, belgelenmiş bulgular | I, doküman |

## G. Kalite kapısı
| # | Kriter | Kanıt |
|---|---|---|
| G1 | `npm run typecheck`, `npm test`, `npm run build` hatasız | U/I/B |
| G2 | Teslim raporu: yapılanlar, kapsam dışı olanlar, bilinen sınırlar, çalıştırma talimatı | doküman |
