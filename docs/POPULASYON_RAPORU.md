# KUT — Nüfus simülasyonu raporu

Ham veri: `docs/balans/populasyon/ham.json` · **Her karakterin kendi raporu: [`oyuncular/`](balans/populasyon/oyuncular/README.md)** (150 dosya) · Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md)

150 oyuncu · 14 gün · dilim 2 dk (günde 4 dilim) · tohum 7 · gerçek süre 29 dk

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
| 1 | 8 | 52 | 47 | 35 | 8 |
| 7 | 0 | 0 | 26 | 51 | 73 |
| 14 | 0 | 0 | 0 | 29 | 121 |

**Arketip karşılaştırması:**

| Arketip | Oyuncu | Seviye kazancı (gün başı) | Ort. ölüm/sa | Ort. ödül/sa | Yok olan eşya | Ort. ayrılma riski | Yüksek riskli % |
|---|---|---|---|---|---|---|---|
| Boss avcısı | 13 | 1.2 | 0.9 | 17.5 | 0 | 0 | 0 |
| Gündelik oyuncu | 40 | 1.8 | 1 | 20.6 | 0 | 0.1 | 3 |
| PvP avcısı | 7 | 1 | 7.5 | 19.1 | 2 | 0.9 | 0 |
| Çatlak avcısı | 17 | 1.1 | 0.4 | 18.8 | 0 | 0.1 | 0 |
| Çekirdek farmcı | 29 | 1.4 | 0.7 | 16.7 | 0 | 0.1 | 0 |
| Yeni başlayan | 18 | 1.9 | 1.2 | 29.1 | 344 | 1.5 | 0 |
| Oba / sosyal | 7 | 2 | 0.2 | 20 | 0 | 0.1 | 0 |
| Tüccar / zanaatkâr | 12 | 1.6 | 0.1 | 14.2 | 0 | 0 | 0 |
| Sürü izleyen | 4 | 1.8 | 0.3 | 20.1 | 19 | 1.1 | 0 |
| Savunma teorisyeni | 3 | 0.8 | 0.2 | 14.2 | 0 | 0 | 0 |

**Ekonomi** (akçe arzı, Gini, pazar):

| Gün | Akçe arzı | Gini | Pazar satış | Pazar hacmi | Vergi | İlan ücreti | Satış/değer |
|---|---|---|---|---|---|---|---|
| 1 | 9.428.902 | 0.687 | 55 | 40.737 | 2.038 | 11.101 | 1.07 |
| 2 | 42.023.058 | 0.569 | 8 | 18.640 | 931 | 474 | 1.74 |
| 3 | 71.520.969 | 0.532 | 24 | 70.461 | 3.523 | 12.252 | 1.32 |
| 4 | 100.156.287 | 0.522 | 36 | 165.073 | 8.256 | 174.807 | 1.37 |
| 5 | 133.942.769 | 0.522 | 5 | 15.039 | 753 | 1.545 | 1.63 |
| 6 | 168.442.948 | 0.518 | 9 | 44.186 | 2.209 | 25.812 | 1.03 |
| 7 | 194.512.428 | 0.509 | 44 | 236.802 | 11.844 | 292.818 | 1.01 |
| 8 | 224.486.396 | 0.514 | 9 | 43.743 | 2.187 | 16.507 | 1.34 |
| 9 | 253.123.232 | 0.506 | 14 | 95.733 | 4.787 | 32.015 | 1.34 |
| 10 | 272.493.285 | 0.505 | 45 | 375.329 | 18.767 | 451.695 | 1.11 |
| 11 | 308.046.698 | 0.509 | 16 | 87.955 | 4.398 | 44.333 | 1.3 |
| 12 | 344.791.929 | 0.503 | 11 | 71.227 | 3.562 | 48.011 | 0.99 |
| 13 | 372.993.715 | 0.502 | 44 | 396.876 | 19.845 | 420.823 | 1.22 |
| 14 | 397.833.659 | 0.513 | 20 | 121.189 | 6.059 | 127.422 | 1.21 |

**Günlük ortalama kaynak:** 56.393.454 akçe — yaratık %59, NPC satış %28, sefer %13, kilometre taşı %1, gizem %0, boss (altın yağmuru dahil) %0

**Günlük ortalama sink:** 28.051.558 akçe — kostüm: efsun %40, artı basma %25, kostüm: uzatma %10, kostüm: üretim %8, kostüm: şans eşyası %7, üretim %4, kostüm: tezgâh %3, beceri %2, efsun yenileme %1, pazar ilan ücreti %0, zindan ücreti %0, pazar vergisi %0, oba %0

**Sink / kaynak oranı: %49.7** (100'ün çok altı = enflasyon)

Tüccar/zanaatkâr pazar neti: ortalama 15.007 akçe (en iyi 79.739); üretilen 13510 parça, üretim maliyeti 14.186.900 akçe; çanta doluluğundan kaybolan ganimet 13.780.

**Kalabalık ve kamp kullanımı:**

| Kampta eşzamanlı oyuncu | Gözlem | Öldürme/dk (kişi başı) |
|---|---|---|
| 1 | 911 | 29.1 |
| 2-3 | 1532 | 36.6 |
| 4-6 | 1038 | 39 |
| 7-10 | 308 | 36.2 |
| 11+ | 62 | 26.6 |

Kullanılan kamp sayısı 119/42 · en kalabalık 5 kamp: kamp 102 %6, kamp 60 %4, kamp 14 %4, kamp 100 %3, kamp 107 %2 · yoğunlaşma (HHI) 0.018 (1/42=0,024 tam dağılım)

**Boss'lar:**

| Boss | Öldürme (dilimde) | Ort. süre (sn) | Ort. katılımcı | Ölüm/öldürme |
|---|---|---|---|---|
| 1 | 16 | 40.3 | 2.4 | 0 |
| 2 | 37 | 43.4 | 3.2 | 0 |
| 3 | 25 | 43.7 | 1.9 | 0 |
| 4 | 25 | 67.5 | 3.7 | 0 |
| 5 | 20 | 93.9 | 2.9 | 0 |

Boss öldüren oyuncu: 133/150 (%89); boss avcılarının boss başına dilim öldürmesi 15.8

**Çatlak:** Dilimlerde açılan çatlak 143, kapanan 38 (%27); kapatan oyuncu 116/150

**PvP:** PvP öldürme 485; bunun 213 tanesi (%44) 8+ seviye altındaki oyuncuya (gank); kırmızı adlı oyuncu 2; PvP'de en az 5 kez öldürülüp hiç öldürmeyen 4

**Savunma türleri** (alınan hasar payı ve oyuncuların savunması):

| Hasar türü | Alınan hasar payı | Ortalama savunma % | Savunması ≥%15 olan oyuncu % |
|---|---|---|---|
| kilic | %0 | 3.7 | 3 |
| cift | %15 | 4.8 | 7 |
| bicak | %19 | 4.5 | 3 |
| yay | %0 | 3.4 | 1 |
| buyu | %66 | 11.1 | 40 |

| Grup | Oyuncu | Ölüm/sa | Ana tehdit türüne karşı savunma % | Bloklanan vuruş |
|---|---|---|---|---|
| Savunma bilinçli | 67 | 1.3 | 20.7 | 831 |
| Bilinçsiz | 83 | 0.9 | 3.8 | 390 |

Ana tehdit türüne karşı savunması %10'un altında olup hasarın %40+'ını o türden alan oyuncu: **68/150**

**Mini harita A/B** (aynı nüfus içinde: haritayı — kamp seviyesi rengi + doluluk sayısı — okuyan ve okumayan yeni/gündelik oyuncular):

| Grup | Oyuncu | Ölüm/sa | Ort. ayrılma riski | Yüksek riskli % | Ödül/sa |
|---|---|---|---|---|---|
| Mini haritayı okuyan (yeni+gündelik) | 35 | 0.7 | 0.4 | 0 | 23.3 |
| Okumayan (yeni+gündelik) | 23 | 1.6 | 0.7 | 4 | 23.1 |

**Ayrılma riski** (ödül sıklığı, ölüm oranı, durgunluk, kayıp eşya, zorbalık):

Düşük 143 · orta 6 · **yüksek 1** (toplam 150).

En sık nedenler: # eşya yok oldu (21); saatte # ölüm (4); # kez oyuncular tarafından öldürüldü (4); # başarısız artı serisi (1)

**Performans:** Ortalama tick+ajan maliyeti 25.6 ms (dilimler: 56); en yoğun dilim 59.4 ms/tick, çevrimiçi 135 oyuncu.

## 2b. Yeni içerik (harita, PvP bayrağı, zindan, kostüm)

**Harita kullanımı:**

| Harita | Oyuncu (≥10 dk oynayan) | Toplam saat | Öldürme/sa | Ölüm/sa (kişi başı) | Notlar |
|---|---|---|---|---|---|
| Kutlu Otlak | 27 | 10 | 2166.3 | 1.8 | ort. Sv 38.7 |
| Yazık Bozkır | 149 | 364.7 | 2115 | 1.1 | ort. Sv 45.9 |
| Erlik Diyarı | 128 | 302 | 1861.3 | 0.8 | ort. Sv 47.3 |

**Kutlu Otlak A/B** (aynı tohum; yeni oyuncu Otlak'a gitmezse):

| Grup (başlangıç ≤ Sv14) | Oyuncu | Ölüm/sa | Ort. seviye kazancı | Ort. PvP ölümü | Ort. hayal kırıklığı |
|---|---|---|---|---|---|
| Kutlu Otlak açık (varsayılan) | 52 | 1.1 | 34.4 | 2 | 47.6 |
| Otlak yok (hepsi Bozkır) | 52 | 1 | 34.3 | 1.8 | 43 |

**İsteğe bağlı PvP bayrağı:** Bayraklı oyuncu 24/150 (PvP avcısı arketipi hepsi bayraklı; diğer arketiplerde %12). PvP öldürmelerin 485/485'i bayraklılar tarafından. Bayraksızlar yalnızca bayraklılara vurulabildiği için zorbalıktan etkilenmez: bayraksız (PvP avcısı dışı) oyuncuların PvP'de öldürülmesi 0, bayraklılarınki 212. Genel ölüm/sa: bayraksız 0.3 · bayraklı 2.3.

**Zindanlar:**

| Zindan | Başlayan | Kazanılan | Kazanma oranı | Ort. süre (dk, kazanılan) | Ort. parti |
|---|---|---|---|---|---|
| Demir Madeni | 339 | 321 | %95 | 5.1 | 3.8 |
| Gölge Mağarası | 51 | 35 | %69 | 10 | 3.6 |

Sıraya giren 425 (reddedilen 430); zindan içinde ölüm 228 (başlayan koşu başına 0.6); günlük ortalama zindan ücreti sink'i 45.893 akçe. Erlik'te saha farm hızı ≈ 31 öldürme/dk — bir zindan ≈ 22–36 dalga yaratığı + boss (boss ×70–110 deneyim).

**Kostüm (akçe sink'i):**

| Ölçü | Değer |
|---|---|
| Kostümle ilgilenen oyuncu | 70/150 |
| Tezgâh turu / toplama | 577 / 517 |
| Üretim: başarılı / başarısız | 288 / 66 (%81 başarı) |
| Üretilen basamak (Sade/Süslü/Şahane/Hanlık) | 276 / 12 / 0 / 0 |
| Şu an giyili basamak (Sade/Süslü/Şahane/Hanlık) | 50 / 9 / 0 / 0 |
| Uzatma sayısı | 68 |
| Efsun yenileme (kovalayanlar) | 513 |
| Şans eşyası alımı | 431 |
| Günlük ortalama kostüm + zindan sink'i | 18.916.120 akçe (toplam sink'in %67'i) |

Kostüm sink'i kategorilere göre: zindan ücreti 45.893 · kostüm: tezgâh 780.589 · kostüm: şans eşyası 2.027.426 · kostüm: üretim 2.110.076 · kostüm: efsun 11.227.160 · kostüm: uzatma 2.724.978.

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
| 11 | Raporun kendi sayıları | **Bizim ölçüm hatalarımız**: ölüm oranı yalnızca "canlı farm süresine" bölündüğü için şişiyordu; boss'a yaklaşma hatası; ilan listesi yalnızca en ucuz 400'ü görüyordu | Ölçüm düzeltildi (toplam süreye bölünür); `TEST_FELSEFESI` §3: *raporları da lambanın altında okumayız* |

## 4. Açık kararlar (önceki turun maddeleri ve durumu)

1. **Tekrarlayan altın sink'i** → *Kostüm sistemi eklendi* (§2b): sink/kaynak %23 → ≈ %50. Kostüm 1 hafta yaşar, bitince efsunlarıyla yok olur; uzatma yüklüdür. Kalan karar: Şahane/Hanlık basamağa ulaşan çok az oyuncu var (malzeme darboğazı) — ya zindan/tezgâh malzeme düşüşünü artırmak ya da bu basamakları "uzun hedef" olarak bırakmak.
2. **PvP zorbalığı** → *İsteğe bağlı bayrak + Otlak eklendi.* Bayraksızlar PvP'de hiç ölmüyor; bayraklı çiftçiler çok ölüyor (bayrak %10 bonus için pahalı görünüyor). Karar: bonusu artırmak mı (gerçek oyuncu bayrağı daha çok açar), yoksa PvP'yi avcılara bırakmak mı?
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
