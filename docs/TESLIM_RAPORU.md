# KUT — Teslim Raporu

Tarih: 2026-10-04 · Sürüm: 0.1 (PRD §14 Aşama 2 — **Prototip**) · Dal: `claude/bold-mendel-d9as4v`

## 1. Sonuç

**49/49 kabul kriteri kanıtla sağlandı.**

PRD'de ayrı bir "kabul kriterleri" bölümü yoktur; kriterler PRD §14 Aşama 2 kapı koşulundan ve PRD'nin ölçülebilir ifadelerinden
türetilip [`ACCEPTANCE.md`](ACCEPTANCE.md) olarak yazılmıştır. Aşağıdaki tablo her kriteri **çalıştırılmış** kanıta bağlar.
Kriter→kanıt **eşlemesi** (hangi test/kontrol hangi kriteri kanıtlar) elle yazılmıştır (`scripts/make-report.ts`); ancak her eşleme **otomatik doğrulanır**:
betik, referans verilen testin/kontrolün gerçekten **geçtiğini** ve ekran görüntüsünün var olduğunu denetler. Bir satır kanıtsız veya başarısızsa betik hata verir ve bu rapor "tamam" demez.
Yani tablodaki ✅ işaretleri elle konmaz, koşulmuş sonuçtan gelir.

* Birim + sunucu entegrasyon testleri: **106/106** geçti (gerçek Colyseus sunucusu, gerçek SQLite, gerçek istemci protokolü).
* Tarayıcı uçtan uca kontrolleri: **53/53** geçti (gerçek Chromium, üretim derlemesi, gerçek sunucu).
* Çalıştırma: [`README.md`](../README.md).

## 2. Ne yapıldı

Sıfırdan, bu klasörde, PRD'nin mimarisiyle (Babylon.js + TypeScript + Vite istemci; Node.js + Colyseus sunucu) oynanabilir bir 3D MMORPG prototipi:

* **Dünya:** kilim desenli plazalı Boy Yurdu (güvenli) + Yazık Bozkır (riskli; Erlik'e yaklaştıkça mor-kızıl çatlaklı); ağaçlar, kayalar, çiçekler,
  otağ/yurtlar, demirhane, yazıt taşı, üç boyun bayrağı, muhafız postları, gece mavisi→altın ufuk gökyüzü, dağlar, bulutlar.
* **Savaş (Alp):** basılı tutarak otomatik seri vuruş, 6 yetenek (alan hasarı, sersemletme, **Çağrı Narası ile yaratık toplama**, kalkan, zehir, ulu vuruş),
  M1→P kademeleri, seviye 10'da Kalkan Alp / Kılıç Alp, 5 durum etkisi, kritik, can çalma, ganimet yağmuru.
* **Yaratıklar:** Tepegöz yavrusu, Albastı, Erlik çırağı, kara çakal ve Çatlak Bekçisi; her biri ayrı siluette ve animasyonlu; kamp/aggro/leash YZ'si.
* **Erlik çatlakları:** rastgele açılır, üç dalga + bekçi, yakındaki oyuncu sayısı/seviyesine ölçeklenir, otomatik katılım, garanti nadir+ ganimet.
* **Boylar / PvP / derece:** Gök-Yer-Ay (pasif bonus, renk kimliği), güvenli bölgede PvP yok (düello hariç), riskli bölgede açık, derece/kırmızı ad/muhafız.
* **İlerleme ve eşya:** 50 seviye (her 10'da duvar), Kut puanı, dinlenmiş deneyim, 4 kademe eşya + efsun, **+0→+9 artı basma** (PRD oranları arayüzde), demirci el kitabı, koruma tılsımı, üretim.
* **Oba:** acemi oymak + NPC ak sakal öğretici, Otağ + Demirhane, ortak ambar, bağış → katılım puanı, üretim paylaşımı, **çevrimdışı ilerleyen** yükseltmeler,
  yoldaş seferleri (1/4/12 sa), **Kayıp Yazıtlar** (sunucu çapı parça sayacı + yazıt çözme).
* **Sunucu:** yetkili hareket/savaş/ekonomi, hız sınırlama, scrypt parola, `ledger` kayıt defteri, SQLite kalıcılığı, katmanlama, oymak yönlendirme.
* **Görsel/ses/arayüz:** özel toon shader (bantlı ışık, serin gölge, kenar parlaması, sis) + ters-gövde kontur, bloom/MSAA, parçacık/halka/ışın efektleri;
  keçe-deri-kilim temalı arayüz, tamga ikonları, mini harita, Türkçe/İngilizce; WebAudio ile üretilmiş kopuz/davul/höömey esintili müzik ve efekt sesleri.
  Dış model/doku/ses dosyası yoktur: tüm modeller, dokular, ikonlar ve sesler kodla üretilir (yalnızca Fredoka ve Nunito yazı tipleri, SIL OFL lisanslı `@fontsource` paketleriyle gelir).

## 3. Kabul kriterleri ve kanıtları

| # | Kriter | Durum | Kanıt |
|---|---|---|---|
| **A1** | Babylon.js + TypeScript + Vite istemci, Node.js + Colyseus sunucu; tek dil TypeScript | ✅ | Bağımlılıklar: @babylonjs/core ^9.29.0, colyseus.js ^0.16.22, @colyseus/core ^0.16.26, vite ^8.3.2, typescript 5.9; `tsc --noEmit` çıkış=0 |
| **A2** | Sunucu yetkili: hasar/ganimet/yükseltme/ekonomi yalnızca sunucuda; istemci yalnızca niyet yollar | ✅ | Test: A2/A3 sunucu yetkili hareket > istemci yalnızca yön gönderir; hız sunucuda sabittir (aşırı büyük vektör hızlandırmaz)<br>Test: A2/A3 sunucu yetkili hareket > hasar ve ganimet istemciden verilemez (bilinmeyen RPC reddedilir)<br>Test: B1 otomatik seri vuruş > öldürme: deneyim + akçe + ganimet yalnızca vuran oyuncuya görünür (bireysel ganimet) |
| **A3** | Hız aşımı / ışınlanma denemesi etkisiz | ✅ | Test: A2/A3 sunucu yetkili hareket > ışınlanma denemesi: sahte konum mesajları ve NaN/Infinity girdileri yok sayılır<br>Test: A2/A3 sunucu yetkili hareket > ağ kesilince girdi zaman aşımına uğrar ve karakter durur |
| **A4** | İstek hızı sınırlaması | ✅ | Test: A4 hız sınırlaması > saniyede çok sayıda RPC yollayan istemcinin fazlası reddedilir<br>Test: A4 hız sınırlaması > sohbet sıklığı sınırlanır |
| **A5** | Kalıcılık: çıkış-giriş ve sunucu yeniden başlatma sonrası veri aynen döner | ✅ | Test: A5/A6 kalıcılık ve kayıt defteri > çıkış-giriş sonrası karakter, envanter ve sayaçlar aynen döner; işlemler ledger’a yazılır<br>Test: A5 sunucu yeniden başlasa da veri veritabanından gelir |
| **A6** | Tüm ekonomi işlemleri ledger’a yazılır | ✅ | Test: A5/A6 kalıcılık ve kayıt defteri > çıkış-giriş sonrası karakter, envanter ve sayaçlar aynen döner; işlemler ledger’a yazılır<br>Test: D4/D5 üretim, kuşanma, ganimet > satış akçe verir (kayıt altında), kuşanılmış eşya satılamaz<br>Test: D3 artı basma > RPC üzerinden: demirciye yakın olmak şart, kaynak yetersizse reddedilir, sonuçta oranlar döner |
| **A7** | Katmanlama ve oymak arkadaşını aynı katmana yönlendirme | ✅ | Test: oda dolunca ikinci katman açılır; oymak arkadaşı için arkadaşının katmanı önerilir |
| **A8** | Parola düz metin saklanmaz; hatalı parola/kopya ad reddedilir | ✅ | Test: A8 kimlik doğrulama > parola düz metin saklanmaz; hatalı parola ve kopya ad reddedilir<br>Test: A8 kimlik doğrulama > aynı hesapla ikinci giriş eskisini düşürür |
| **A9** | 10 eşzamanlı istemci birbirini görür; tick süresi bütçe içinde | ✅ | Test: A9 çoklu istemci > 10 eşzamanlı istemci birbirini görür; tick süresi bütçe içinde<br>Ölçüm: 10 istemci, 0 yaratık, tick ort. **0.63 ms**, maks. 5.74 ms (bütçe 50 ms @ 20 Hz) |
| **A10** | Başlangıç yükü 50 MB altında | ✅ | Ölçüm: ilk yük (index.html + JS + CSS) ham 6.79 MB, gzip **1.52 MB**; yazı tipleri 0.14 MB; dist toplam 7.45 MB (sınır 50 MB) |
| **B1** | Saldırı basılı tutulunca en yakın düşmana otomatik seri vuruş | ✅ | Test: B1 otomatik seri vuruş > saldırı basılı tutulunca en yakın düşmana vurur; bırakınca durur; ödül sunucuda verilir<br>E2E `B1.otomatik`: Yalnızca Space basılı (yetenek yok): 4/4 yaratığa otomatik hedefleme+yaklaşma+seri vuruş, öldü; deneyim +92 |
| **B2** | 6 yetenek, bekleme sunucuda doğrulanır, alan hasarı | ✅ | Test: B2/B6 yetenekler, alan hasarı, toplama > bekleme sunucuda doğrulanır; seviye kapısı vardır<br>Test: B2/B6 yetenekler, alan hasarı, toplama > alan yeteneği tek seferde yaratık grubunu vurur<br>Test: B3/B4/B8 yetenek, uzmanlık, PvP katsayısı > 6 aktif yetenek; kademe etiketleri M1…G1, P<br>E2E `B2.alan`: Kılıç Savurma tek seferde 7/7 yaratığa vurdu<br>E2E `B2.yetenek-temizleme`: Çağrı Narası + Savurma + Sarsıntı + Tengri Hiddeti: 7/7 yaratık yetenekle temizlendi<br>Ekran görüntüsü: [06c-alan-yetenegi.png](evidence/06c-alan-yetenegi.png) |
| **B3** | Yetenek kademeleri M1…G1, P | ✅ | Test: B2/B6 yetenekler, alan hasarı, toplama > B3 yetenek kademesi: puan + akçe harcar, M1→M2→…→P; kapılar çalışır<br>Test: B2/B6 yetenekler, alan hasarı, toplama > daha yüksek kademe daha çok hasar verir<br>E2E `B3.kademe`: Savurma M1→M2 (kademe=2), puan + akçe harcandı<br>Ekran görüntüsü: [10-yetenekler.png](evidence/10-yetenekler.png) |
| **B4** | Seviye 10 uzmanlık: Kalkan Alp / Kılıç Alp | ✅ | Test: B4 uzmanlık (seviye 10) > seviye 10 öncesi seçilemez; seçim kalıcı; etkiler ölçülebilir<br>Test: B4 uzmanlık (seviye 10) > Kalkan Alp sarsıntıyla yaratıkları provoke eder; kalkan beceri hasar emer<br>Test: B3/B4/B8 yetenek, uzmanlık, PvP katsayısı > Kalkan Alp daha dayanıklı, Kılıç Alp daha çok hasar verir ve daha hızlı vurur<br>E2E `B4.uzmanlik`: Kılıç Alp seçildi, sunucu doğruladı, model/istatistik değişti<br>Ekran görüntüsü: [09-karakter-uzmanlik.png](evidence/09-karakter-uzmanlik.png) |
| **B5** | Durum etkileri: sersemletme, yavaşlatma, zehir, lanet, kalkan | ✅ | Test: B5 durum etkileri > sersemletme: sersemlemiş yaratık hareket etmez ve saldırmaz<br>Test: B5 durum etkileri > zehir: zamanla hasar verir<br>Test: B5 durum etkileri > Albastı laneti: lanetli oyuncunun hasarı azalır; kalkan ve yavaşlatma bayrakları görünür<br>Test: B4 uzmanlık (seviye 10) > Kalkan Alp sarsıntıyla yaratıkları provoke eder; kalkan beceri hasar emer<br>Test: B2/B6 yetenekler, alan hasarı, toplama > Çağrı Narası uzaktaki yaratıkları çeker ve yavaşlatır (yaratık toplama) |
| **B6** | Yaratık toplama (Çağrı Narası) ve ganimet yağmuru | ✅ | Test: B2/B6 yetenekler, alan hasarı, toplama > Çağrı Narası uzaktaki yaratıkları çeker ve yavaşlatır (yaratık toplama)<br>E2E `B6.toplama`: Çağrı Narası: 7/7 yaratık 5 birim içine çekildi<br>E2E `B6.ganimet`: Ganimet yağmuru: aynı anda ekranda en çok 2 ganimet nesnesi (yalnızca vuran oyuncuya görünür)<br>E2E `B6.ganimet-toplandi`: Ganimet mıknatısı: akçe 5000→5026<br>Ekran görüntüsü: [06b-cagri-narasi.png](evidence/06b-cagri-narasi.png)<br>Ekran görüntüsü: [07-ganimet-yagmuru.png](evidence/07-ganimet-yagmuru.png) |
| **B7** | Ölüm cezası bölgeye göre işler | ✅ | Test: B7 ölüm cezası ve bölge kuralları > riskli bölgede yaratığa ölünce az deneyim kaybı; yurda doğar<br>Test: B7 ölüm cezası ve bölge kuralları > güvenli bölgede yaratık saldırmaz, oyuncu oyuncuya hasar veremez<br>E2E `B7.olum-ekrani`: Ölüm ekranı gösterildi; riskli bölgede küçük deneyim kaybı: xp=0<br>E2E `B7.yeniden-dogus`: Yurda dönüldü (güvenli bölge)<br>Ekran görüntüsü: [20-olum.png](evidence/20-olum.png) |
| **B8** | PvE ve PvP için ayrı katsayı | ✅ | Test: B3/B4/B8 yetenek, uzmanlık, PvP katsayısı > PvP ayrı katsayı kullanır<br>Test: B3/B4/B8 yetenek, uzmanlık, PvP katsayısı > lanet verilen hasarı azaltır |
| **C1** | 3 boy, seçim, pasif bonus, renk kimliği | ✅ | Test: C1 boy bonusları > Gök hız, Yer can+savunma, Ay büyü gücü+şifa<br>E2E `C1.boy-secimi`: Karakter oluştururken 3 boy seçilebilir (Gök/Yer/Ay), sınıf: Alp<br>E2E `C1.boy-kaydi`: Sunucu kaydı: boy=ay ad=Bozkurt926<br>E2E `F2.boy-kimlik`: Üç boy (Gök mavi-beyaz kartal tüyü, Yer yeşil-kahve kurt kulağı, Ay gümüş-mor geyik boynuzu) aynı sahnede, ayrı siluet<br>Ekran görüntüsü: [02-karakter-olustur.png](evidence/02-karakter-olustur.png) |
| **C2** | Güvenli bölgede PvP yok (yalnızca düello); riskli bölgede açık | ✅ | Test: C2/C3/C4 PvP, derece, muhafız, düello > riskli bölgede farklı boyun oyuncusu alan yeteneğiyle vurulur; aynı boy vurulmaz (açık hedef olmadan)<br>Test: B7 ölüm cezası ve bölge kuralları > güvenli bölgede yaratık saldırmaz, oyuncu oyuncuya hasar veremez<br>Test: C2/C3/C4 PvP, derece, muhafız, düello > düello: yalnızca güvenli bölgede, kabul ile başlar, ölümle bitmez |
| **C3** | Derece sistemi: ceza, kırmızı ad, geri kazanma | ✅ | Test: C2/C3/C4 PvP, derece, muhafız, düello > derece: kendi boyunu veya savaşmayan oyuncuyu öldüren derece kaybeder, adı kırmızı olur, muhafız vurur, yaratık avlayarak geri kazanır<br>Test: C2/C3/C4 PvP, derece, muhafız, düello > kırmızı adlı oyuncu ölünce eşya düşürebilir; kırmızıyı öldüren ceza almaz |
| **C4** | Şehir muhafızları kırmızı adlıya saldırır | ✅ | Test: C2/C3/C4 PvP, derece, muhafız, düello > derece: kendi boyunu veya savaşmayan oyuncuyu öldüren derece kaybeder, adı kırmızı olur, muhafız vurur, yaratık avlayarak geri kazanır |
| **D1** | 50 seviye, her 10 seviyede duvar, Kut puanı | ✅ | Test: D1 seviye ve deneyim eğrisi > 50 seviye; her 10 seviyede belirgin duvar<br>Test: D1/D2 ilerleme: kut puanı, dinlenmiş deneyim > seviye sınırından sonra deneyim Kut puanına döner ve istatistiği kalıcı artırır<br>Test: D1 seviye ve deneyim eğrisi > yaratık başına gereken sayı seviyeyle büyür (grind hissi)<br>Test: D1/D2 ilerleme: kut puanı, dinlenmiş deneyim > seviye atlama: deneyim eğrisine göre atlar, yetenek puanı verir, canı doldurur |
| **D2** | Dinlenmiş deneyim: birikim, ≈1,5 seviye sınır, 2× deneyim, obada hızlı | ✅ | Test: D2 dinlenmiş deneyim > üst sınır ≈ 1,5 seviye<br>Test: D2 dinlenmiş deneyim > obada (otağ yakını) daha hızlı birikir<br>Test: D1/D2 ilerleme: kut puanı, dinlenmiş deneyim > dinlenmiş deneyim: çevrimdışıyken birikir, 1,5 seviyede kapanır, yaratık deneyimini 2 katlar; yurtta daha hızlı |
| **D3** | Artı basma +0→+9, PRD oranları, +5 üstü yok olur, oranlar arayüzde | ✅ | Test: D3/D4 artı basma tablosu (PRD §7) > oranlar PRD taslağıyla uyumlu: +1…+4 %100–%80, +5/+6 %65/%50, +7/+8 %35/%20, +9 %10<br>Test: D3 artı basma > istatistiksel doğrulama: her hedef seviyede başarı oranı PRD tablosuna uyar<br>Test: D3 artı basma > +1…+4 başarısızlıkta eşya korunur (yalnızca malzeme gider); +5 ve üstünde eşya yok olur<br>E2E `D3.oranlar-ui`: Arayüzde gösterilen oranlar PRD tablosu: 100, 90, 85, 80, 65, 50, 35, 20, 10% (+1…+9)<br>E2E `D3.basari`: Yükseltme başarılı (+4→+5): ✦ Başarılı! +5<br>E2E `D3.yok-olma`: Tılsımsız başarısızlıkta (+5 hedefi) eşya yok oldu<br>Ekran görüntüsü: [11-demirci-artibasma.png](evidence/11-demirci-artibasma.png) |
| **D4** | El kitabı şans artırır; koruma tılsımı korur; market/oyun içi eşitliği | ✅ | Test: D3 artı basma > D4 demirci el kitabı +10 puan ekler; koruma tılsımı yok olmayı engeller; kitap/tılsım tüketilir<br>Test: D4/D5 üretim, kuşanma, ganimet > Demirhane: el kitabı serbest, koruma tılsımı Demirhane 2. seviyeyi ister (oyun içinde kazanılabilir)<br>E2E `D4.kitap`: Demirci el kitabı: %65 + %10 = 75% (65% +10)<br>E2E `D4.tilsim`: Koruma tılsımı: 🛡 Başarısız ama tılsım eşyayı korudu! (eşya +5 olarak korundu, tılsım tüketildi)<br>Ekran görüntüsü: [11d-demirci-tilsim-korudu.png](evidence/11d-demirci-tilsim-korudu.png) |
| **D5** | Ganimet kademeleri, efsunlar, bireysel ganimet | ✅ | Test: D5 ganimet kademeleri ve efsunlar > kademe dağılımı yaklaşık beklenen oranlarda, efsun sayısı kademeye eşit<br>Test: D5 ganimet kademeleri ve efsunlar > üst kademe aynı seviyede daha güçlü<br>Test: B1 otomatik seri vuruş > öldürme: deneyim + akçe + ganimet yalnızca vuran oyuncuya görünür (bireysel ganimet)<br>E2E `D5.envanter`: Çanta paneli 8 eşya hücresi, kademe renkli (sıradan/nadir/destansı/efsanevi)<br>Ekran görüntüsü: [08-canta.png](evidence/08-canta.png) |
| **D6** | Erlik çatlağı: rastgele, dalgalar + bekçi, ölçekleme, otomatik katılım, garanti ganimet | ✅ | Test: D6 Erlik çatlağı > rastgele zamanda ve yerde açılır; oyunculara duyurulur; riskli bölgededir<br>Test: D6 Erlik çatlağı > otomatik katılım: yaklaşınca dalgalar başlar; 3 dalga + bekçi; kapanınca katılımcıya garanti nadir+ ganimet<br>Test: D6 Erlik çatlağı > zorluk yakındaki oyuncu sayısı ve seviyesine ölçeklenir<br>E2E `D6.catlak-acik`: Çatlak açık ve bekliyor (durum=0); oyuncu 22 birim uzakta, pusula oku ve harita işareti görünür<br>E2E `D6.catlak-ui`: Çatlak çubuğu görünür, dalga=1, durum=1; parti kurmadan otomatik katılım<br>Ekran görüntüsü: [17-erlik-catlagi-acik.png](evidence/17-erlik-catlagi-acik.png)<br>Ekran görüntüsü: [18-erlik-catlagi-dalga.png](evidence/18-erlik-catlagi-dalga.png) |
| **E1** | Acemi oymak, otomatik giriş, NPC ak sakal öğretir | ✅ | Test: E1 acemi oymak ve ak sakal > yeni oyuncu boyunun acemi oymağına otomatik girer; NPC ak sakal ve 2 yoldaş yuvası vardır<br>Test: E1 acemi oymak ve ak sakal > öğretici adımları sırayla ilerler ve ödül verir<br>E2E `E1.ak-sakal`: Ak Sakal diyaloğu ve oba öğretici görevleri<br>E2E `E1.oba-paneli`: Oba paneli: Otağ + Demirhane, ortak ambar, yoldaşlar<br>Ekran görüntüsü: [12-ak-sakal.png](evidence/12-ak-sakal.png)<br>Ekran görüntüsü: [13-oba.png](evidence/13-oba.png) |
| **E2** | 2 bina; yükseltme bitiş zamanı DB’de, çevrimdışıyken ilerler | ✅ | Test: E2/E3 bina yükseltme > bitiş zamanı veritabanına yazılır, çevrimdışıyken de ilerler; Demirhane Otağ seviyesini aşamaz<br>E2E `E2.yukseltme`: Otağ yükseltmesi başladı; bitiş zamanı DB’de: 2026-10-04T22:37:57.800Z; öğretici adımı=3<br>Ekran görüntüsü: [14-oba-yukseltme.png](evidence/14-oba-yukseltme.png) |
| **E3** | Otağ diğer binaların sınırını belirler; acemi oba sınırı | ✅ | Test: E2/E3 bina yükseltme > bitiş zamanı veritabanına yazılır, çevrimdışıyken de ilerler; Demirhane Otağ seviyesini aşamaz<br>Test: E2/E3 bina yükseltme > acemi oba seviye sınırı vardır |
| **E4** | Yoldaş seferleri 1/4/12 saat, giriş anında hesaplanır, yuva sınırı | ✅ | Test: E4 yoldaş seferleri > sonuç tohuma bağlı deterministik; tüccar ruhlu daha çok akçe verir<br>Test: E4 yoldaş seferleri > 1/4/12 saat; erken toplanamaz; süre dolunca giriş sırasında hesaplanır; yuva sınırı<br>Test: E4 yoldaş seferleri > yoldaş yuvası dolunca yeni sefer reddedilir; Çevik yoldaş seferi kısaltır<br>E2E `E4.sefer`: Yoldaş 1 saatlik sefere gönderildi (bitiş zamanı kayıtlı)<br>E2E `E4.sefer-hazir`: Süre dolunca sefer ödülü hazır (giriş anında hesaplanır)<br>Ekran görüntüsü: [15b-sefer-odulu.png](evidence/15b-sefer-odulu.png) |
| **E5** | Katılım puanı ve puana göre paylaşım | ✅ | Test: E5/E6 katılım puanı ve üretim > bağış, yükseltme ve sefer katılım puanı kazandırır; üretim çevrimdışıyken birikir ve puana göre paylaşılır<br>Test: E5/E6 katılım puanı ve üretim > katılım puanı olmayan üye de pay alır (solo oyuncu mahrum kalmaz) |
| **E6** | Oba üretimi çevrimdışıyken birikir ve girişte toplanır | ✅ | Test: E5/E6 katılım puanı ve üretim > bağış, yükseltme ve sefer katılım puanı kazandırır; üretim çevrimdışıyken birikir ve puana göre paylaşılır |
| **E7** | Kayıp Yazıtlar: sunucu çapı sayaç, eşik, duyuru | ✅ | Test: E7 Kayıp Yazıtlar > sunucu çapı parça sayacı: eşik aşılınca yazıt çözülür ve tüm oyunculara duyurulur<br>E2E `E7.yazit`: Sunucu çapı 40 parça eşiği aşıldı: 1 yazıt çözüldü (“n, gökten bir el kilidi kendi anahtarıyla açtı.»”), tüm oyunculara duyuruldu=true<br>Ekran görüntüsü: [16-yazitlar.png](evidence/16-yazitlar.png) |
| **F1** | Cel-shade: bantlı gölge + kontur; PRD paleti | ✅ | E2E `F1.toon`: Toon materyal=60, kontur ağı=313, toplam ShaderMaterial=99<br>E2E `F1.palet`: Sahnede 136 ayrı (3-bit) renk kovası: canlı palet<br>Ekran görüntüsü: [03-oyun-yurt.png](evidence/03-oyun-yurt.png)<br>Ekran görüntüsü: [05-yaratiklar.png](evidence/05-yaratiklar.png) |
| **F2** | Boy renk kimliği; silüetten okunur sınıf/boy | ✅ | E2E `F2.boy-kimlik`: Üç boy (Gök mavi-beyaz kartal tüyü, Yer yeşil-kahve kurt kulağı, Ay gümüş-mor geyik boynuzu) aynı sahnede, ayrı siluet<br>Ekran görüntüsü: [04-boylar-silueti.png](evidence/04-boylar-silueti.png) |
| **F3** | Yaratık türleri ayrı siluetli ve animasyonlu | ✅ | E2E `F3.yaratiklar`: Tepegöz yavrusu, Albastı, Erlik çırağı, çakal ve çatlak bekçisi sahnede: tepegoz, albasti, erlik, cakal, bekci<br>E2E `F3.siluet`: 5 ayrı model imzası (parça sayısı + boy)<br>Ekran görüntüsü: [05-yaratiklar.png](evidence/05-yaratiklar.png) |
| **F4** | Keçe/deri paneller, tamga ikonları, minimal HUD, mini harita | ✅ | E2E `F4.hud`: HUD: can/xp, 6 yetenek, mini harita, sohbet, görev; 16 SVG ikon<br>Ekran görüntüsü: [03-oyun-yurt.png](evidence/03-oyun-yurt.png)<br>Ekran görüntüsü: [13-oba.png](evidence/13-oba.png)<br>Ekran görüntüsü: [11-demirci-artibasma.png](evidence/11-demirci-artibasma.png) |
| **F5** | Üretilmiş kopuz/davul sesi, efekt sesleri, sessiz mod | ✅ | E2E `F5.ses`: AudioContext=running, çıkış tepe enerjisi=6.73 (kopuz/davul/bordo üretimi)<br>E2E `F5.sessiz`: M tuşu: sessiz=true, kazanç=0.00019918938050977886, sessizlikte enerji=0.000 |
| **F6** | Türkçe ve İngilizce, çalışma anında değişir; Türkçe karakterler doğru | ✅ | E2E `F6.tr`: Giriş ekranı Türkçe: KUTTengri'nin bahşettiği kutu ile bozkırı kurtar! Karakter adı Parola Giriş yap İlk kez mi<br>E2E `F6.en`: Dil düğmesiyle çalışma anında İngilizce: KUTSave the steppe with the Kut Tengri granted you! Character name Pas<br>E2E `F6.font`: Fredoka/Nunito (latin-ext) yazı tipleri yüklendi: 12 yüz<br>Ekran görüntüsü: [01-giris-tr.png](evidence/01-giris-tr.png)<br>Ekran görüntüsü: [01b-giris-en.png](evidence/01b-giris-en.png) |
| **F7** | Performans ölçülür ve raporlanır; 150 ms gecikmede akıcılık | ✅ | E2E `F7.olcum`: Kare başına JS/CPU maliyeti=2.05 ms; aktif mesh=162/234; üçgen=933354; (yazılım rasterleştirmede FPS=10)<br>Test: B.gecikme150: 150 ms gidiş-dönüş gecikmede tahmin sapması sınırlı, ışınlanma yok, sunucu yetkili kalır<br>Ölçüm (150 ms RTT, gerçek sunucu + istemci tahmin kodu): en büyük tahmin sapması **1.22 birim** (hız 7 b/sn × RTT ≈ 1.05), ışınlanma 0, durunca sapma 0, ilk karede tepki 0.117 birim |
| **H1** | Yönetici (GM) hesabı: rol yalnızca yerel veritabanı/CLI’den gelir, her komut sunucuda doğrulanır; yetkisiz reddedilir; tüm komutlar ledger’a yazılır | ✅ | Test: H1 yönetici yetkisi > rolü olmayan hesap GM komutu çalıştıramaz; rol yalnızca veritabanından gelir<br>Test: H1 yönetici yetkisi > yönetici: level / kit / gold / give / item / god / heal / dummy+dps çalışır ve kaydedilir<br>E2E `H1.yetkisiz-arayuz`: Rolü olmayan hesapta GM düğmesi yok, F2 yönetici panelini açmaz<br>E2E `H1.rol`: Yönetici hesabı "Yonetici904": rol=admin, GM düğmesi görünür, HUD etiketi var |
| **H2** | Yönetici paneli (F2 / /gm): 30+ hızlı komut, seviye/kit/ölümsüzlük/ışınlanma/zaman ileri sarma/ölçüm; arayüzden sunucuya gider | ✅ | Test: H1 yönetici yetkisi > GM zaman ilerletme + oba komutu: bitmemiş yükseltme ve seferler anında tamamlanır<br>E2E `H1.panel`: F2 ile yönetici paneli açıldı (30+ hızlı komut)<br>E2E `H1.komut`: GM komutları sunucuda uygulandı: sv=25, kuşanılan=4, atk=718<br>E2E `H1.sohbet-gm`: Sohbetten /gm komutu çalıştı (altın=927, bağlantı: , kapalı=false)<br>Ekran görüntüsü: [25-yonetici-paneli.png](evidence/25-yonetici-paneli.png) |
| **H3** | Gizem: 5 ayrı sistemden beslenen ipucu iplikleri (yazıt, rüya, Ak Sakal, balbal taşı, mühür kırığı) ve dördü birleşince açılan “Mühürün Dışı”; cevap bilerek yazılmamış | ✅ | Test: H2 gizem: balbal taşları > 8 taş deterministik; yakındaysan ipucu + akçe, uzaksan reddedilir, 8. taş 7 taş ister<br>Test: H3 gizem: rüyalar, Ak Sakal, mühür kırıkları, birleşme > uzun süre çevrimdışı kalıp dönen oyuncu sıradaki rüyayı görür; beşte durur; kalıcıdır<br>Test: H3 gizem: rüyalar, Ak Sakal, mühür kırıkları, birleşme > Ak Sakal: seviye eşiklerinde yeni söz; yakında olmak şart<br>Test: H3 gizem: rüyalar, Ak Sakal, mühür kırıkları, birleşme > Erlik çatlağı kapanınca mühür kırığı düşer; 1., 3., 6. kırıkta yeni ipucu<br>Test: H3 gizem: rüyalar, Ak Sakal, mühür kırıkları, birleşme > "Mühürün Dışı": dört ipliğin ucu birleşince açılır ve kalıcıdır; yarım ilerleme açmaz<br>Tasarım belgesi: [docs/GIZEM.md](../GIZEM.md) |
| **H4** | Gizem arayüzü: balbal taşı etkileşimi, rüya ekranı, kodeks (iplik sekmeleri, unvanlar) | ✅ | E2E `H2.tas-okuma`: Taşa yaklaşınca "E" ipucu: “EBalbal Taşı”; okununca kart: “nmış: «Gök dokuz kat. Sekizi kapalıdır.»”<br>E2E `H3.ruya`: Rüya ekranı yazı yazı belirdi, "Uyan" ile ipucu kaydedildi<br>E2E `H3.kodeks`: Kodeks: 27/27 ipucu; "Mühürün Dışı" açıldı ve metni gösteriyor<br>Ekran görüntüsü: [22-balbal-tasi-okundu.png](evidence/22-balbal-tasi-okundu.png)<br>Ekran görüntüsü: [23-kurdun-ruyasi.png](evidence/23-kurdun-ruyasi.png)<br>Ekran görüntüsü: [24-kodeks-muhurun-disi.png](evidence/24-kodeks-muhurun-disi.png) |
| **H5** | Hızlandırılmış denge testi: bot simülasyonu (sahte saat, gerçek sunucu kuralları) ve çözümsel tablolar; hasar/bonus/artı basma/boy-uzmanlık/çatlak/ekonomi sayıları belgeli | ✅ | Bot ilerleme koşusu: 87.73200000000001 simüle saat → Sv50 (485.8 sn gerçek süre). Rapor: [BALANS_RAPORU.md](../BALANS_RAPORU.md), ham veri: [sonuc.json](../balans/sonuc.json) |
| **H6** | Denge değişmezleri testle korunur (öldürme süresi, can kaybı, seviye farkı, boy/uzmanlık dengesi, artı basma/tılsım, bonus üst sınırları) | ✅ | Test: denge: savaş temposu (referans yapı) > aynı seviye yaratığı öldürme süresi 2,5–6 sn (hiçbir seviyede anlık ölüm ya da sünme yok)<br>Test: denge: savaş temposu (referans yapı) > öldürme başına can kaybı %3,5–7 (savaş her seviyede küçük bir bedel ister)<br>Test: denge: savaş temposu (referans yapı) > +5 seviye yaratık bedeli artırır (≥1,3×; Sv30’a kadar ≥1,8×)<br>Test: denge: boy ve uzmanlık > Kılıç Alp ≥%15 daha çok DPS, Kalkan Alp ≥%40 daha çok etkin can: ikisi de seçilmeye değer<br>Test: denge: artı basma ve tılsım > korumasız +7 yaklaşık 8 parça yakar; tılsımla hiç parça yok olmaz<br>Test: denge: bonus hesapları ve üst sınırlar > en uç yığılma (4 efsanevi +9 + tüm efsunlar) kritik/vuruş hızı/çalma üst sınırını aşmaz |
| **G1** | typecheck, test, build hatasız | ✅ | `tsc --noEmit` çıkış=0; vitest 106/106 geçti; dist/ derlendi (96 dosya) |

## 4. Ölçümler

* **Paket boyutu (A10):** ilk yük gzip **1.52 MB** (ham 6.79 MB) + yazı tipleri 0.14 MB; toplam dist 7.45 MB. PRD hedefi 50 MB altı.
* **Sunucu (A9):** tablodaki A9 satırı; 10 eşzamanlı istemci, 20 Hz tick.
* **Performans (F7):** kare başına JS/CPU maliyeti **2.05 ms** (60 FPS bütçesi 16,7 ms); aktif mesh 162/234; çizilen üçgen ≈ 933.354; yazılım rasterleştirmede (SwiftShader) ölçülen FPS ≈ 10. Ortamda GPU yoktur; ekran görüntüleri ve FPS yazılım rasterleştirmede (SwiftShader) alınmıştır.
  Gerçek GPU'da bu CPU maliyeti 60 FPS bütçesinin (16,7 ms) altında kalır; ancak **gerçek donanımda 60/30 FPS ölçümü bu ortamda yapılamadı** (bkz. §6).
* **Gecikme (PRD §5, 150 ms):** 150 ms gidiş-dönüş yapay gecikmede yürürken tahmin sapması en çok **1.22 birim**, durunca **0.00 birim**. İstemci girdiyi anında tahmin eder, sunucu yetkili kalır.

## 5. Kapsam dışı bırakılanlar (PRD'nin sonraki aşamaları)

Prototip kapısı "tek bölge, Alp, temel savaş, ganimet, artı basma, basit oba, kayıt, küçük çok oyunculu test" dedi. PRD'nin kendisi şunları sonraki aşamalara bırakır; **yapılmadı**:

| Konu | PRD referansı | Neden kapsam dışı |
|---|---|---|
| Kam ve Mergen sınıfları, 6 uzmanlık | §5, §14 Aşama 3 | Vertical slice aşaması |
| Kale kuşatmaları, Savaş bölgesi, 9 kale, nüfus dengesi | §6, §14 Aşama 4 | Erken erişim aşaması |
| Zindanlar, dünya boss'u | §10, §14 Aşama 3–4 | Vertical slice / erken erişim |
| Tezgah, vergi, market, EP kuponu, oto av, premium | §9, §11 | PRD: "Market prototip aşamasında yoktur" |
| Parti, arkadaş, evlilik, oymak yönetimi/rol yetkileri | §10, §14 Aşama 3 | Vertical slice (acemi oymak + sohbet var) |
| Ahır/Kartal yuvası/Kam çadırı/Ambar/Kuşatma atölyesi, sürü yetiştirme | §8 | Prototip "2 bina" der; yalnızca Otağ + Demirhane |
| 48 saat ticaret sınırı, davranış analizi, 2 aşamalı doğrulama | §9, §13 | Ticaret yok; bot önlemlerinden hız sınırı + sunucu yetkisi yapıldı |
| PostgreSQL + Redis, çok makineli bölge dağıtımı | §13 | Yerelde SQLite (bkz. §6) |
| Steam paketleme, özel müzik/seslendirme, mobil | §2, §12 | PRD kapsam dışı / gelir sonrası |

## 6. Bilinen sınırlar ve dürüst notlar

1. **Gerçek GPU'da FPS ölçülemedi.** Bu ortamda yalnızca yazılım rasterleştirmeli Chromium var. Raporlanan FPS bu yüzden düşüktür; güvenilir olan ölçüm kare başına CPU maliyeti ve sahne karmaşıklığıdır. Kalite otomatiği düşük FPS'te grafiği kendiliğinden düşürür (e2e'de `?autoq=0` ile kapatılır).
2. **Veritabanı SQLite (`node:sqlite`).** PRD PostgreSQL + Redis der. Yerel geliştirme/prototip için kurulumsuz çalışması seçildi; tüm erişim `server/db.ts` arkasındadır, geçiş tek dosyadır. Katmanlar arası sohbet/oymak yönlendirme tek süreçte bellekten yapılır.
3. **Colyseus 0.16 hattı.** npm'de `colyseus.js` için `latest` 0.16.22, `@colyseus/core` için `latest` 0.18.18'dir (sürüm hatları denk değil). Tel uyumunu garanti etmek için sunucu da `@colyseus/core@0.16` hattına sabitlendi; 0.18 çekirdeği bu istemciyle **denenmedi**. Durum senkronu Colyseus şeması yerine kendi anlık görüntü/olay protokolümüzle (AOI süzmeli, bireysel ganimetli) yapılır.
4. **Denge sayıları taslaktır.** PRD de oranları "taslak" ilan eder. Artı basma oranları PRD tablosuna birebir uyar; hasar/deneyim eğrileri ise elle ayarlandı ve oynanarak ince ayar ister.
5. **Zamanlayıcılar gerçek zamanlıdır** (bina 5 dk × seviye, seferler 1/4/12 sa). Testlerde `KUT_TEST=1` ile sunucu saati ileri sarılır; üretimde bu uç kapalıdır.
6. **Görsel strateji farkı:** PRD hazır low-poly paketleri önerir; burada sıfır bütçe ve lisans riski için tüm modeller kodla (ilkel parçalardan) üretildi. Tek stile uyum bu sayede garantilidir; elle modellenmiş sanat kalitesi değildir.
7. **Tek oda = tek harita:** 150 oyuncu/katman hedefi katmanlamayla doğrulandı (küçük sınırla); 150+ oyuncuyla yük testi yapılmadı (10 istemci ölçüldü).
8. **Dokunmatik/mobil yok** (PRD kapsam dışı).

## 7. Ekran görüntüleri (`docs/evidence/`)

- [`01-giris-tr.png`](evidence/01-giris-tr.png)
- [`01b-giris-en.png`](evidence/01b-giris-en.png)
- [`02-karakter-olustur.png`](evidence/02-karakter-olustur.png)
- [`03-oyun-yurt.png`](evidence/03-oyun-yurt.png)
- [`04-boylar-silueti.png`](evidence/04-boylar-silueti.png)
- [`05-yaratiklar.png`](evidence/05-yaratiklar.png)
- [`06a-yaratik-grubu.png`](evidence/06a-yaratik-grubu.png)
- [`06b-cagri-narasi.png`](evidence/06b-cagri-narasi.png)
- [`06c-alan-yetenegi.png`](evidence/06c-alan-yetenegi.png)
- [`06d-tengri-hiddeti.png`](evidence/06d-tengri-hiddeti.png)
- [`07-ganimet-yagmuru.png`](evidence/07-ganimet-yagmuru.png)
- [`07b-ganimet-toplandi.png`](evidence/07b-ganimet-toplandi.png)
- [`08-canta.png`](evidence/08-canta.png)
- [`09-karakter-uzmanlik.png`](evidence/09-karakter-uzmanlik.png)
- [`10-yetenekler.png`](evidence/10-yetenekler.png)
- [`11-demirci-artibasma.png`](evidence/11-demirci-artibasma.png)
- [`11b-demirci-kitap-tilsim.png`](evidence/11b-demirci-kitap-tilsim.png)
- [`11c-demirci-basari.png`](evidence/11c-demirci-basari.png)
- [`11d-demirci-tilsim-korudu.png`](evidence/11d-demirci-tilsim-korudu.png)
- [`11e-demirci-yok-oldu.png`](evidence/11e-demirci-yok-oldu.png)
- [`12-ak-sakal.png`](evidence/12-ak-sakal.png)
- [`13-oba.png`](evidence/13-oba.png)
- [`14-oba-yukseltme.png`](evidence/14-oba-yukseltme.png)
- [`15-oba-sefer-dondu.png`](evidence/15-oba-sefer-dondu.png)
- [`15b-sefer-odulu.png`](evidence/15b-sefer-odulu.png)
- [`16-yazitlar.png`](evidence/16-yazitlar.png)
- [`17-erlik-catlagi-acik.png`](evidence/17-erlik-catlagi-acik.png)
- [`18-erlik-catlagi-dalga.png`](evidence/18-erlik-catlagi-dalga.png)
- [`19-erlik-catlagi-savas.png`](evidence/19-erlik-catlagi-savas.png)
- [`20-olum.png`](evidence/20-olum.png)
- [`21-yeniden-dogus.png`](evidence/21-yeniden-dogus.png)
- [`22-balbal-tasi-okundu.png`](evidence/22-balbal-tasi-okundu.png)
- [`22a-balbal-tasi.png`](evidence/22a-balbal-tasi.png)
- [`23-kurdun-ruyasi.png`](evidence/23-kurdun-ruyasi.png)
- [`24-kodeks-muhurun-disi.png`](evidence/24-kodeks-muhurun-disi.png)
- [`24a-kodeks-yazitlar.png`](evidence/24a-kodeks-yazitlar.png)
- [`24b-kodeks-taslar.png`](evidence/24b-kodeks-taslar.png)
- [`25-yonetici-paneli.png`](evidence/25-yonetici-paneli.png)

Ham veri: [`e2e-report.json`](evidence/e2e-report.json), [`vitest.json`](evidence/vitest.json), [`metrics-a9.json`](evidence/metrics-a9.json).

## 8. Raporu yeniden üretmek

```bash
npm run build
npx vitest run --reporter=json --outputFile=docs/evidence/vitest.json
npm run e2e                       # docs/evidence/*.png + e2e-report.json
npx tsx scripts/make-report.ts    # bu raporu üretir; kanıtsız kriter varsa hata verir
```
