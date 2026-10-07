# KUT — Nüfus simülasyonu raporu

Ham veri: `docs/balans/populasyon/ham.json` · **Her karakterin kendi raporu: [`oyuncular/`](balans/populasyon/oyuncular/README.md)** (150 dosya) · Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md)

150 oyuncu · 14 gün · dilim 2 dk (günde 4 dilim) · tohum 7 · gerçek süre 17 dk

## 1. Yöntem ve dürüstlük notları

* **Gerçek kod:** Dünya, veritabanı, RPC'ler, savaş, ganimet, boss, çatlak, PvP, pazar, oba — hepsi sunucunun gerçek kodudur (`tests/sim/population/`). Ağ ve görsel yoktur.
* **150 ayrı oyuncu, 10 arketip** (çekirdek farmcı, gündelik, boss avcısı, çatlak avcısı, PvP avcısı, tüccar, savunma teorisyeni, yeni başlayan, oba/sosyal, sürü izleyen). Her oyuncunun beceri doğruluğu, risk iştahı, bilgi düzeyi ve niyeti ayrı örneklenir. Nüfus yaşça karışıktır (Sv1–48 başlangıç).
* **Zaman hızlandırma (gerçekçilik korunarak):**
  1. Günde **4 gerçek-zamanlı dilim** (gece, sabah, ikindi, akşam; 10'ar dk) çalışır: o dilimde çevrimiçi herkes **aynı dünyada gerçek tick'lerle** oynar → kalabalık, boss, çatlak, PvP, pazar gerçektir.
  2. Dilimler arası **çevrimdışı süre gerçek saat sıçramasıyla** geçer (dinlenmiş XP, rüya, oba üretimi, posta).
  3. Günlük süresinin dilim dışında kalan kısmı, o oyuncunun **ölçülen** farm hızıyla (öldürme/dk, ölüm/dk; ölü/dinlenme süresi dahil) ölçeklenir ve **gerçek ödül tablolarıyla** (`rollDrops`, `addXp`) işlenir.
  4. **Boss, çatlak, PvP ölçeklenmez:** yalnızca gerçek dilimlerde yaşanır. Bu yüzden bu olayların günlük sayıları gerçeğin altındadır; **oranlar ve davranışlar** güvenilirdir, mutlak sayılar değil.
* Başlangıç durumu tohumlanmıştır (seviye, donanım, akçe); "1. günden başlayan sunucu" değil, "birkaç haftalık sunucu" simüle edilir.
* Sınırlar: oyuncu yapay zekâsı gerçek insan değildir; sosyal davranış (parti, sohbet, ticaret pazarlığı) yoktur.

## 2. Sonuçlar

**Seviye dağılımı** (gün 1 / orta / son):

| Gün | Sv1–10 | Sv11–20 | Sv21–30 | Sv31–40 | Sv41–50 |
|---|---|---|---|---|---|
| 1 | 3 | 60 | 42 | 38 | 7 |
| 7 | 0 | 0 | 30 | 44 | 76 |
| 14 | 0 | 0 | 0 | 26 | 124 |

**Arketip karşılaştırması:**

| Arketip | Oyuncu | Seviye kazancı (gün başı) | Ort. ölüm/sa | Ort. ödül/sa | Yok olan eşya | Ort. ayrılma riski | Yüksek riskli % |
|---|---|---|---|---|---|---|---|
| Boss avcısı | 13 | 1.2 | 0.2 | 17.6 | 0 | 0.2 | 0 |
| Gündelik oyuncu | 40 | 1.8 | 0.4 | 20.1 | 0 | 0.1 | 0 |
| PvP avcısı | 7 | 1.2 | 1 | 19.9 | 0 | 0.1 | 0 |
| Çatlak avcısı | 17 | 1.1 | 0.2 | 17.9 | 0 | 0.1 | 0 |
| Çekirdek farmcı | 29 | 1.3 | 0.2 | 17.3 | 0 | 0.1 | 0 |
| Yeni başlayan | 18 | 1.9 | 0.4 | 27.4 | 293 | 1.5 | 0 |
| Oba / sosyal | 7 | 2.1 | 0.2 | 18.2 | 0 | 0 | 0 |
| Tüccar / zanaatkâr | 12 | 1.6 | 0.2 | 13 | 0 | 0 | 0 |
| Sürü izleyen | 4 | 1.7 | 0.1 | 20.3 | 17 | 1.1 | 0 |
| Savunma teorisyeni | 3 | 0.8 | 0.2 | 15.8 | 1 | 0.7 | 0 |

**Ekonomi** (akçe arzı, Gini, pazar):

| Gün | Akçe arzı | Gini | Pazar satış | Pazar hacmi | Vergi | İlan ücreti | Satış/değer |
|---|---|---|---|---|---|---|---|
| 1 | 7.225.184 | 0.728 | 53 | 37.124 | 1.856 | 11.650 | 1.08 |
| 2 | 32.724.151 | 0.599 | 13 | 14.600 | 729 | 676 | 1.13 |
| 3 | 59.514.018 | 0.545 | 12 | 55.036 | 2.753 | 10.882 | 1.56 |
| 4 | 79.332.370 | 0.527 | 33 | 144.800 | 7.243 | 130.950 | 1.14 |
| 5 | 104.580.896 | 0.517 | 5 | 39.768 | 1.989 | 2.603 | 2.05 |
| 6 | 131.158.640 | 0.511 | 10 | 54.765 | 2.739 | 23.379 | 1 |
| 7 | 156.931.435 | 0.5 | 44 | 462.831 | 23.144 | 287.711 | 1.42 |
| 8 | 180.354.904 | 0.508 | 10 | 40.032 | 2.001 | 38.623 | 1 |
| 9 | 201.387.458 | 0.52 | 14 | 57.386 | 2.870 | 37.247 | 1.26 |
| 10 | 224.500.791 | 0.525 | 44 | 342.313 | 17.115 | 430.119 | 1.31 |
| 11 | 255.976.472 | 0.509 | 7 | 51.482 | 2.574 | 19.506 | 1.71 |
| 12 | 286.942.541 | 0.497 | 13 | 56.142 | 2.806 | 56.878 | 0.99 |
| 13 | 310.424.988 | 0.503 | 49 | 543.556 | 27.181 | 467.245 | 1.04 |
| 14 | 337.926.885 | 0.502 | 18 | 117.826 | 5.893 | 118.185 | 1.26 |

**Günlük ortalama kaynak:** 50.598.279 akçe — yaratık %64, NPC satış %22, sefer %14, kilometre taşı %1, gizem %0, boss (altın yağmuru dahil) %0

**Günlük ortalama sink:** 26.535.670 akçe — kostüm: efsun %38, artı basma %25, kostüm: üretim %10, kostüm: uzatma %10, kostüm: şans eşyası %6, üretim %4, kostüm: tezgâh %3, beceri %3, efsun yenileme %1, pazar ilan ücreti %0, zindan ücreti %0, pazar vergisi %0, oba %0

**Sink / kaynak oranı: %52.4** (100'ün çok altı = enflasyon)

Tüccar/zanaatkâr pazar neti: ortalama 25.620 akçe (en iyi 73.326); üretilen 13104 parça, üretim maliyeti 13.736.020 akçe; çanta doluluğundan kaybolan ganimet 12.279.

**Kalabalık ve kamp kullanımı:**

| Kampta eşzamanlı oyuncu | Gözlem | Öldürme/dk (kişi başı) |
|---|---|---|
| 1 | 843 | 28.6 |
| 2-3 | 1528 | 35.9 |
| 4-6 | 1031 | 38.3 |
| 7-10 | 280 | 35.6 |
| 11+ | 113 | 25 |

Kullanılan kamp sayısı 118/42 · en kalabalık 5 kamp: kamp 102 %6, kamp 14 %5, kamp 60 %4, kamp 100 %4, kamp 115 %3 · yoğunlaşma (HHI) 0.018 (1/42=0,024 tam dağılım)

**Boss'lar:**

| Boss | Öldürme (dilimde) | Ort. süre (sn) | Ort. katılımcı | Ölüm/öldürme |
|---|---|---|---|---|
| 1 | 20 | 28.8 | 2.3 | 0 |
| 2 | 39 | 46.7 | 2.6 | 0 |
| 3 | 18 | 43.3 | 2.7 | 0 |
| 4 | 25 | 47.6 | 3.1 | 0 |
| 5 | 21 | 76 | 2.5 | 0 |

Boss öldüren oyuncu: 129/150 (%86); boss avcılarının boss başına dilim öldürmesi 14.8

**Çatlak:** Dilimlerde açılan çatlak 134, kapanan 44 (%33); kapatan oyuncu 130/150

**PvP:** PvP öldürme 260; bunun 61 tanesi (%23) 8+ seviye altındaki oyuncuya (gank); kırmızı adlı oyuncu 0; PvP'de en az 5 kez öldürülüp hiç öldürmeyen 4

**Savunma türleri** (alınan hasar payı ve oyuncuların savunması):

| Hasar türü | Alınan hasar payı | Ortalama savunma % | Savunması ≥%15 olan oyuncu % |
|---|---|---|---|
| kilic | %0 | 3.1 | 2 |
| cift | %14 | 4.7 | 5 |
| bicak | %19 | 4.8 | 3 |
| yay | %0 | 3.3 | 3 |
| buyu | %67 | 11.7 | 45 |

| Grup | Oyuncu | Ölüm/sa | Ana tehdit türüne karşı savunma % | Bloklanan vuruş |
|---|---|---|---|---|
| Savunma bilinçli | 67 | 0.3 | 20.2 | 656 |
| Bilinçsiz | 83 | 0.3 | 4.5 | 344 |

Ana tehdit türüne karşı savunması %10'un altında olup hasarın %40+'ını o türden alan oyuncu: **59/150**

**Mini harita A/B** (aynı nüfus içinde: haritayı — kamp seviyesi rengi + doluluk sayısı — okuyan ve okumayan yeni/gündelik oyuncular):

| Grup | Oyuncu | Ölüm/sa | Ort. ayrılma riski | Yüksek riskli % | Ödül/sa |
|---|---|---|---|---|---|
| Mini haritayı okuyan (yeni+gündelik) | 35 | 0.4 | 0.4 | 0 | 22.2 |
| Okumayan (yeni+gündelik) | 23 | 0.3 | 0.6 | 0 | 22.6 |

**Ayrılma riski** (ödül sıklığı, ölüm oranı, durgunluk, kayıp eşya, zorbalık):

Düşük 146 · orta 4 · **yüksek 0** (toplam 150).

En sık nedenler: # eşya yok oldu (21); # kez oyuncular tarafından öldürüldü (4); # başarısız artı serisi (4)

**Performans:** Ortalama tick+ajan maliyeti 15.5 ms (dilimler: 56); en yoğun dilim 39.9 ms/tick, çevrimiçi 136 oyuncu.

## 2b. Yeni içerik (harita, PvP bayrağı, zindan, kostüm)

**Harita kullanımı:**

| Harita | Oyuncu (≥10 dk oynayan) | Toplam saat | Öldürme/sa | Ölüm/sa (kişi başı) | Notlar |
|---|---|---|---|---|---|
| Kutlu Otlak | 7 | 4.8 | 2140.5 | 0.4 | ort. Sv 38.6 |
| Yazık Bozkır | 150 | 329.9 | 2061.1 | 0.6 | ort. Sv 46.1 |
| Erlik Diyarı | 128 | 280.1 | 1808 | 0.4 | ort. Sv 47.4 |

**Kutlu Otlak A/B** (aynı tohum; yeni oyuncu Otlak'a gitmezse):

| Grup (başlangıç ≤ Sv14) | Oyuncu | Ölüm/sa | Ort. seviye kazancı | Ort. PvP ölümü | Ort. hayal kırıklığı |
|---|---|---|---|---|---|
| Kutlu Otlak açık (varsayılan) | 52 | 0.4 | 34.7 | 0.8 | 30.2 |
| Otlak yok (hepsi Bozkır) | 52 | 0.5 | 34.4 | 2.1 | 32.8 |

**İsteğe bağlı PvP bayrağı:** Bayraklı oyuncu 24/150 (PvP avcısı arketipi hepsi bayraklı; diğer arketiplerde %12). PvP öldürmelerin 260/260'i bayraklılar tarafından. Bayraksızlar yalnızca bayraklılara vurulabildiği için zorbalıktan etkilenmez: bayraksız (PvP avcısı dışı) oyuncuların PvP'de öldürülmesi 0, bayraklılarınki 117. Genel ölüm/sa: bayraksız 0.2 · bayraklı 0.3.

**Zindanlar:**

| Zindan | Başlayan | Kazanılan | Kazanma oranı | Ort. süre (dk, kazanılan) | Ort. parti |
|---|---|---|---|---|---|
| Demir Madeni | 364 | 340 | %93 | 5 | 3.6 |
| Gölge Mağarası | 98 | 85 | %87 | 8 | 3.7 |

Sıraya giren 435 (reddedilen 427); zindan içinde ölüm 232 (başlayan koşu başına 0.5); günlük ortalama zindan ücreti sink'i 46.629 akçe. Erlik'te saha farm hızı ≈ 30.1 öldürme/dk — bir zindan ≈ 22–36 dalga yaratığı + boss (boss ×70–110 deneyim).

**Kostüm (akçe sink'i):**

| Ölçü | Değer |
|---|---|
| Kostümle ilgilenen oyuncu | 70/150 |
| Tezgâh turu / toplama | 571 / 511 |
| Üretim: başarılı / başarısız | 375 / 71 (%84 başarı) |
| Üretilen basamak (Sade/Süslü/Şahane/Hanlık) | 347 / 26 / 2 / 0 |
| Şu an giyili basamak (Sade/Süslü/Şahane/Hanlık) | 37 / 21 / 2 / 0 |
| Uzatma sayısı | 71 |
| Efsun yenileme (kovalayanlar) | 492 |
| Şans eşyası alımı | 355 |
| Günlük ortalama kostüm + zindan sink'i | 17.769.539 akçe (toplam sink'in %67'i) |

Kostüm sink'i kategorilere göre: zindan ücreti 46.629 · kostüm: tezgâh 774.579 · kostüm: üretim 2.712.633 · kostüm: efsun 10.030.473 · kostüm: şans eşyası 1.588.395 · kostüm: uzatma 2.616.831.

## 3. Lamba analizi: ışık nerede, cevap nerede?

Her satır bir tur simülasyonun gösterdiği, **tablolarda aydınlık görünen** ama **gerçekte başka yerde olan** bir bulgudur.

| # | Aydınlık (ilk bakışta görünen) | Gerçek (raporlar gösterdi) | Yapılan |
|---|---|---|---|
| 1 | "PvP açık ama kimse zorla savaşmaz" | Kalabalık kampta alan becerisi karşı boydan oyunculara yan hasar veriyordu; 14 günde 10.473 PvP ölümü, saatte onlarca ölüm | Alan becerisi yalnızca çatışmaya girmiş (hedef seçmiş/saldırmış/düello) oyuncuya işler |
| 2 | Altın girişi "yaratık başına makul" | Günlük kaynak ≈ sink'in 11 katı; para arzı 14 günde 515 milyon (kişi başı 3,4 milyon) | Yaratık altını %45, Sv30 üstü yassılaştırıldı; efsun yenileme sink'i; **tekrarlayan sink hâlâ eksik (§4)** |
| 3 | "Pazar var, ilanlar listeleniyor" | 400 ilanın 397'si +0 çöp; ucuzdan pahalıya sıralama yüzünden değerli ilan hiç görünmüyordu; artı eşyaya bağlı oyunda ham eşya talep görmez | Varsayılan görünüm "bana uygun" + "fırsat" (fiyat/değer) sıralaması; tüccar "al-artı bas-sat" modeli; eski artılı donanım kıdemsizlere satılır |
| 4 | Kamp başına öldürme/dk | Kalabalık yoğunluk bonusu (hızlı yeniden doğuş) **kalabalığı ödüllendiriyordu** (4–6 kişide kişi başı hız tek kişiden yüksek) | Yoğunluk çarpanı yumuşatıldı (0,12/oyuncu, taban 0,4) |
| 5 | "Savunma türleri var, ölüm ekranı ipucu veriyor" | Oyuncunun o savunmaya **ulaşma yolu yoktu** (rastgele düşme) | **Efsun yenileme** (rastgele ucuz, seçerek 6×); savunma bilinçli oyuncular **saatte 2,7 ölüm, bilinçsizler 6,4**; ana tehdide karşı savunma %21 ve %4 |
| 6 | "Rütbe cezası var, PvP cezasız değil" | Cezayı "kurban yaratıkla dövüşüyorsa savaşmayan sayılmaz" kuralı etkisiz kılıyordu: 2.675 öldürmede 1 kırmızı ad | Ceza **ilk saldırana**: karşılık veren aklamaz; çok aşağıdakini avlamak çift ceza; düşük seviye koruması (−10 seviye ×0,25, −20 dokunulmaz) |
| 7 | Boss "öldü" sayıları | 9–11 kişilik sürü boss 5'i 6,8 sn'de öldürüyordu; ayrıca ilk ölçüm hatalıydı (simülasyon boss'a yaklaşamıyordu) | Boss canı vuran oyuncu sayısıyla büyür (+%30/kişi, 8'e kadar) |
| 8 | "Muhafız kırmızı adlıyı korkutur" | Kırmızı ad yurtta doğunca muhafız onu anında öldürüyordu: **ölüm döngüsü, PvP avcısı saatte 105 ölüm** | 8 sn yeniden doğuş koruması (saldırınca biter) |
| 9 | "42 kamp yeter" | Seviye 41–50'de 96 oyuncu, birkaç kamp; en kalabalık iki kamp tüm farm zamanının %43'ü | 64 kamp (41+ seviyede 15); mini haritada kamp seviyesi rengi ve **oyuncu sayısı** (kalabalık bilgisi oyuncunun baktığı yerde): HHI 0,105 → 0,057, haritayı okuyanlarda ölüm −%22 |
| 10 | "Yeni oyuncu aynı kuralla oynar" | Yeni başlayanın ayrılma riski en yüksek (%67–87 yüksek risk); ölümde XP kaybı, PvP ve eşya kaybı üst üste | Sv10 altı ölümde XP kaybı yok, Sv20 altı yarısı; düşük seviye PvP koruması; kamp tehlike renkleri |
| 12 | "Zindan ödülü güzel, zor mu zor" | İlk sürümde 429 koşunun %100'ü kazanıldı (2,4 dk); parti 4 sınırını aşıyordu; ölçümün kendisi de yanlıştı (dilim 10→2 dk kısaltılınca koşular yarıda kesiliyordu, süreler saat atlamalarını sayıyordu) | Parti sınırı; yaratık can ×2,2–2,6, saldırı ×1,6–1,9, boss can ×4–5; koşular dilim bitince tamamlanır; süre kazanma anından ölçülür → Demir %90–95 kazanma, ~5 dk; Gölge %69–77, ~10 dk; koşu başına ~0,6 ölüm |
| 13 | "Kostüm sink'i hedefi tutturdu" | Sink'in büyük kısmı **efsun yenileme kovalaması** (%40); kostümlerin %97'si Sade basamak (Şahane/Hanlık malzemesi darboğaz); ilk sürümde uzatma çok ucuzdu (%4) | Ömür 1 hafta ve bitince yok; uzatma ×1,8 pahalı (Sade 14, Hanlık 190 birim) → uzatma sink'in %10'u; yenileme kâğıt ister; sink/kaynak ≈ %50 (3 tohumda %49,5–50,4) |
| 14 | "Otlak yeni oyuncuyu korur" | Otlak A/B'de ölüm/sa ve seviye kazancı **aynı** (0,9; ~32,8); hayal kırıklığı Otlak'lı grupta biraz yüksek. PvP zaten bayrakla kapandığından Otlak'ın tek başına ölçülür faydası yok | Otlak tutuldu (maliyetsiz, PvP'siz giriş + ilk boss); değeri gerçek oyuncuyla sınanmalı |
| 15 | "Bayraklı oyuncu 7,7 kat daha çok ölüyor" (bayrağı kaldırmak/bonusu %25–30'a çıkarmak için gerekçe) | **Ölçüm hatası**: dilimde tüm nüfus aynı anda çevrimiçi olduğundan oyuncu öldürmeleri gerçek günlük yoğunluktan çok yoğundu ve "farm ölümü" sayılıp günün geri kalanına ölçekleniyordu. Düzeltilince bayraklı çiftçi 0,32 ölüm/sa, bayraksız 0,28; PvP ölümü 0,14/sa ve XP/eşya kaybettirmiyor | Oyuncu öldürmeleri ölçeklenmez; bonus %10 → %15 (XP, akçe, **eşya düşüşü**); bayrak korundu. Bonus %25 denendi: avcı öldürmesi 0,93 → 1,43/sa, ekonomi +%3 — ajanlar teşvike tepki vermediği için gerçek elastikiyet **gerçek oyuncuyla** ölçülmeli |
| 16 | "Kostüm pazarda satılabilsin" | Uzatma maliyeti **sahibin seviyesine** bağlıydı: düşük seviyeli ikinci hesap pahalı kostümü ucuza uzatıp satabilir, sink delinirdi | Maliyet `max(sahip seviyesi, üretim seviyesi)`; giymek basamak seviyesi ister; kalan süre alıcıya aynen geçer; testle kilitli (`sink delinmez`) |
| 17 | "Şahane/Hanlık malzemesi nadir, hepsini %25–40 artır" | Stok verisi: boya 106, nakış 129 (kullanılmıyor), ipek 276, kâğıt 197, lif 2.391 → darboğaz **boya (ve ipek)**, nakış değil | Yalnızca boya (+~%45) ve ipek (%40→%55) artırıldı; Süslü %3–8'den %23–29'a çıktı, Şahane hâlâ uzun hedef (0–2) |
| 11 | Raporun kendi sayıları | **Bizim ölçüm hatalarımız**: ölüm oranı yalnızca "canlı farm süresine" bölündüğü için şişiyordu; boss'a yaklaşma hatası; ilan listesi yalnızca en ucuz 400'ü görüyordu | Ölçüm düzeltildi (toplam süreye bölünür); `TEST_FELSEFESI` §3: *raporları da lambanın altında okumayız* |

## 4. Açık kararlar (önceki turun maddeleri ve durumu)

1. **Altın sink'i** → kostüm sistemi + NPC satış çarpanı 0,7: sink/kaynak %23 → **%46–53** (3 tohum). **Hedef (%80–90) henüz sağlanmadı**: net birikim günde ≈ 24–31 milyon akçe (arz 14 günde 9M → ~340M; medyan oyuncu 1,5M, üst %10 5,5–6,7M). Kostüm, toplam sink'in %57–70'i; kalan boşluk için öneriler: (a) **kımız/şifa içeceği** (savaşta tekrarlayan harcama), (b) **+9 üstü artı kademeleri** (endgame donanım sink'i), (c) pazar vergisi artışı (hacim küçük, etkisi düşük). Güç eğrisini etkilediği için (a)/(b) ürün kararıdır.
2. **PvP zorbalığı** → *İsteğe bağlı bayrak + Kutlu Otlak.* Bayraksızlar PvP'de ölmüyor; bayraklı çiftçinin ek ölüm yükü ihmal edilebilir (§3 #15). Karar verildi: bayrak korunur, bonus %15; kutlu Otlak yeni oyuncu bölgesi olarak PvP'siz kalır (çatışma bölgesi Erlik Diyarı).
3. **Zirve içeriği** → *Erlik Diyarı + 2 zindan eklendi.* Zindan parti ölçeği ve güçlük gerçek oyuncularla ayarlanmalı (botlar zindanı fazla kolay buluyor).
4. **Pazar** yalnızca ekipman taşıyor; kostüm malzemeleri ve şans eşyaları bilinçli olarak takas edilemez (ikincil piyasa istemedik). Gelecekte malzeme pazarı açılabilir.

## 5. Çalıştırma

```bash
POP_N=150 POP_DAYS=14 POP_W=10 POP_SEED=7 npx tsx tests/sim/population/run.ts   # ≈ 8 dk
npx tsx tests/sim/population/report.ts                                          # karakter raporları + docs/POPULASYON_RAPORU.md
POP_NOMAP=1 ...                                                                 # haritayı kimse okumasın (A/B kontrolü)
POP_NOOTLAK=1 POP_OUT=docs/balans/populasyon-ab ...                             # yeni oyuncular Otlak'a gitmesin (A/B)
POP_NOCOS=1 / POP_NOERLIK=1 ...                                                 # kostüm / Erlik olmadan kontrol
```
