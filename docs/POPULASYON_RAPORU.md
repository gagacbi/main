# KUT — Nüfus simülasyonu raporu

Ham veri: `docs/balans/populasyon/ham.json` · **Her karakterin kendi raporu: [`oyuncular/`](balans/populasyon/oyuncular/README.md)** (150 dosya) · Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md)

150 oyuncu · 14 gün · dilim 10 dk (günde 4 dilim) · tohum 7 · gerçek süre 25 dk

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
| 1 | 9 | 53 | 45 | 36 | 7 |
| 7 | 0 | 0 | 36 | 43 | 71 |
| 14 | 0 | 0 | 0 | 45 | 105 |

**Arketip karşılaştırması:**

| Arketip | Oyuncu | Seviye kazancı (gün başı) | Ort. ölüm/sa | Ort. ödül/sa | Yok olan eşya | Ort. ayrılma riski | Yüksek riskli % |
|---|---|---|---|---|---|---|---|
| Boss avcısı | 13 | 1.2 | 0.8 | 18.8 | 0 | 0.3 | 0 |
| Gündelik oyuncu | 40 | 1.7 | 0.8 | 22.4 | 0 | 0.1 | 0 |
| PvP avcısı | 7 | 1 | 5.6 | 16.9 | 0 | 0.6 | 0 |
| Çatlak avcısı | 17 | 1.1 | 0.4 | 19 | 0 | 0 | 0 |
| Çekirdek farmcı | 29 | 1.4 | 1.2 | 19.1 | 1 | 0.1 | 0 |
| Yeni başlayan | 18 | 1.8 | 1.1 | 30.8 | 389 | 1.5 | 0 |
| Oba / sosyal | 7 | 1.9 | 0.2 | 22.7 | 0 | 0 | 0 |
| Tüccar / zanaatkâr | 12 | 1.5 | 0.1 | 19.1 | 0 | 0 | 0 |
| Sürü izleyen | 4 | 1.6 | 0.2 | 22.3 | 18 | 1.5 | 0 |
| Savunma teorisyeni | 3 | 0.8 | 0.1 | 18.1 | 1 | 0 | 0 |

**Ekonomi** (akçe arzı, Gini, pazar):

| Gün | Akçe arzı | Gini | Pazar satış | Pazar hacmi | Vergi | İlan ücreti | Satış/değer |
|---|---|---|---|---|---|---|---|
| 1 | 9.327.028 | 0.701 | 52 | 40.246 | 2.012 | 10.679 | 1.09 |
| 2 | 37.273.185 | 0.583 | 5 | 2.571 | 128 | 210 | 1.03 |
| 3 | 65.717.340 | 0.538 | 3 | 3.204 | 161 | 2.829 | 1.11 |
| 4 | 91.313.595 | 0.524 | 4 | 24.619 | 1.231 | 13.248 | 2.36 |
| 5 | 115.232.131 | 0.514 | 5 | 30.873 | 1.544 | 629 | 2.43 |
| 6 | 141.757.006 | 0.513 | 0 | 0 | 0 | 3.063 | 0 |
| 7 | 169.204.350 | 0.51 | 3 | 3.099 | 155 | 13.489 | 0.91 |
| 8 | 193.823.912 | 0.501 | 1 | 22.552 | 1.128 | 1.314 | 5.46 |
| 9 | 220.720.433 | 0.494 | 2 | 1.765 | 89 | 2.766 | 0.91 |
| 10 | 253.054.178 | 0.489 | 0 | 0 | 0 | 13.201 | 0 |
| 11 | 282.973.412 | 0.496 | 0 | 0 | 0 | 2.252 | 0 |
| 12 | 314.322.696 | 0.497 | 0 | 0 | 0 | 2.326 | 0 |
| 13 | 342.448.971 | 0.493 | 0 | 0 | 0 | 12.143 | 0 |
| 14 | 371.962.089 | 0.49 | 0 | 0 | 0 | 2.776 | 0 |

**Günlük ortalama kaynak:** 52.897.288 akçe — yaratık %56, NPC satış %32, sefer %11, kilometre taşı %1, gizem %0, boss (altın yağmuru dahil) %0

**Günlük ortalama sink:** 26.403.407 akçe — kostüm: efsun %53, artı basma %27, kostüm: üretim %7, üretim %4, kostüm: tezgâh %3, beceri %3, kostüm: şans eşyası %2, efsun yenileme %1, zindan ücreti %0, kostüm: uzatma %0, pazar ilan ücreti %0, oba %0, pazar vergisi %0

**Sink / kaynak oranı: %49.9** (100'ün çok altı = enflasyon)

Tüccar/zanaatkâr pazar neti: ortalama 5.237 akçe (en iyi 22.876); üretilen 13371 parça, üretim maliyeti 13.992.790 akçe; çanta doluluğundan kaybolan ganimet 26.527.

**Kalabalık ve kamp kullanımı:**

| Kampta eşzamanlı oyuncu | Gözlem | Öldürme/dk (kişi başı) |
|---|---|---|
| 1 | 1108 | 29.5 |
| 2-3 | 1712 | 36.4 |
| 4-6 | 1008 | 39.4 |
| 7-10 | 400 | 35.4 |
| 11+ | 73 | 26.5 |

Kullanılan kamp sayısı 124/42 · en kalabalık 5 kamp: kamp 102 %6, kamp 60 %4, kamp 14 %4, kamp 114 %3, kamp 100 %3 · yoğunlaşma (HHI) 0.017 (1/42=0,024 tam dağılım)

**Boss'lar:**

| Boss | Öldürme (dilimde) | Ort. süre (sn) | Ort. katılımcı | Ölüm/öldürme |
|---|---|---|---|---|
| 1 | 21 | 27.9 | 2 | 0 |
| 2 | 42 | 51.5 | 2.4 | 0 |
| 3 | 22 | 51.1 | 2.5 | 0 |
| 4 | 25 | 70.3 | 4 | 0 |
| 5 | 16 | 52.4 | 2.1 | 0 |

Boss öldüren oyuncu: 141/150 (%94); boss avcılarının boss başına dilim öldürmesi 22

**Çatlak:** Dilimlerde açılan çatlak 163, kapanan 38 (%23); kapatan oyuncu 112/150

**PvP:** PvP öldürme 527; bunun 182 tanesi (%35) 8+ seviye altındaki oyuncuya (gank); kırmızı adlı oyuncu 0; PvP'de en az 5 kez öldürülüp hiç öldürmeyen 3

**Savunma türleri** (alınan hasar payı ve oyuncuların savunması):

| Hasar türü | Alınan hasar payı | Ortalama savunma % | Savunması ≥%15 olan oyuncu % |
|---|---|---|---|
| kilic | %0 | 3.2 | 1 |
| cift | %16 | 4.8 | 5 |
| bicak | %20 | 5.4 | 9 |
| yay | %0 | 3.1 | 2 |
| buyu | %64 | 11.4 | 44 |

| Grup | Oyuncu | Ölüm/sa | Ana tehdit türüne karşı savunma % | Bloklanan vuruş |
|---|---|---|---|---|
| Savunma bilinçli | 67 | 1.1 | 20.8 | 857 |
| Bilinçsiz | 83 | 0.9 | 3.6 | 445 |

Ana tehdit türüne karşı savunması %10'un altında olup hasarın %40+'ını o türden alan oyuncu: **63/150**

**Mini harita A/B** (aynı nüfus içinde: haritayı — kamp seviyesi rengi + doluluk sayısı — okuyan ve okumayan yeni/gündelik oyuncular):

| Grup | Oyuncu | Ölüm/sa | Ort. ayrılma riski | Yüksek riskli % | Ödül/sa |
|---|---|---|---|---|---|
| Mini haritayı okuyan (yeni+gündelik) | 35 | 0.4 | 0.4 | 0 | 24.8 |
| Okumayan (yeni+gündelik) | 23 | 1.5 | 0.6 | 0 | 25.4 |

**Ayrılma riski** (ödül sıklığı, ölüm oranı, durgunluk, kayıp eşya, zorbalık):

Düşük 143 · orta 7 · **yüksek 0** (toplam 150).

En sık nedenler: # eşya yok oldu (22); # kez oyuncular tarafından öldürüldü (3); saatte # ölüm (3); # gün üst üste ilerleme yok (1)

**Performans:** Ortalama tick+ajan maliyeti 4.5 ms (dilimler: 56); en yoğun dilim 7.8 ms/tick, çevrimiçi 135 oyuncu.

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
| 11 | Raporun kendi sayıları | **Bizim ölçüm hatalarımız**: ölüm oranı yalnızca "canlı farm süresine" bölündüğü için şişiyordu; boss'a yaklaşma hatası; ilan listesi yalnızca en ucuz 400'ü görüyordu | Ölçüm düzeltildi (toplam süreye bölünür); `TEST_FELSEFESI` §3: *raporları da lambanın altında okumayız* |

## 4. Açık kararlar (oyun tasarımı — geliştirici/ürün sahibi vermeli)

1. **Tekrarlayan altın sink'i yok.** Zirve oyuncular günde yüz binlerce akçe kazanıp harcayacak yer bulamıyor (sink/kaynak ≈ %23). Artı basma ve efsun yenileme **bir kereliktir**. Seçenekler (her biri tasarım kararıdır): (a) **şifa içeceği** (kımız) — savaşta tekrarlayan harcama, boss/çatlak/PvP dengesini etkiler; (b) **teçhizat bakımı** (ölüm/kullanımla aşınma); (c) **binek** ve **kostüm/aura** (güç vermeyen, tek seferlik ama pahalı); (d) **pazar vergisi** oranı artırıp ticareti teşvik. Öneri: önce (c)+(d), sonra (a).
2. **PvP zorbalığı** azaldı (korumalar + ceza) ama sürüyor (gank payı ≈ %74; en az 5 kez öldürülüp hiç öldürmeyen 35–68 oyuncu). Seçenekler: ödül avı (bounty), PvP bayrağı (isteğe bağlı açma), yeni oyuncu bölgesi.
3. **Zirve seviye içeriği:** 64 kamp kalabalığı azalttı ama Sv41–50 oyuncuların çoğu tek bölgede. İkinci bölge/zindan (PRD Aşama 3–4) gerekli.
4. **Pazar** yalnızca ekipman taşıyor. Malzeme/kitap/tılsım ticareti gelecekte talep yaratabilir (artıya bağlı eşya ham ekipmanı değersizleştiriyor).

## 5. Çalıştırma

```bash
POP_N=150 POP_DAYS=14 POP_W=10 POP_SEED=7 npx tsx tests/sim/population/run.ts   # ≈ 8 dk
npx tsx tests/sim/population/report.ts                                          # karakter raporları + docs/POPULASYON_RAPORU.md
POP_NOMAP=1 ...                                                                 # haritayı kimse okumasın (A/B kontrolü)
```
