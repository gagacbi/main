# KUT — Nüfus simülasyonu raporu

Ham veri: `docs/balans/populasyon/ham.json` · **Her karakterin kendi raporu: [`oyuncular/`](balans/populasyon/oyuncular/README.md)** (150 dosya) · Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md)

150 oyuncu · 14 gün · dilim 10 dk (günde 4 dilim) · tohum 7 · gerçek süre 8 dk

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
| 1 | 22 | 45 | 49 | 22 | 12 |
| 7 | 0 | 2 | 50 | 37 | 61 |
| 14 | 0 | 0 | 12 | 49 | 89 |

**Arketip karşılaştırması:**

| Arketip | Oyuncu | Seviye kazancı (gün başı) | Ort. ölüm/sa | Ort. ödül/sa | Yok olan eşya | Ort. ayrılma riski | Yüksek riskli % |
|---|---|---|---|---|---|---|---|
| Boss avcısı | 8 | 1 | 0.5 | 14.9 | 0 | 0.8 | 0 |
| Gündelik oyuncu | 32 | 1.5 | 6.3 | 21.8 | 0 | 2.4 | 31 |
| Tüccar / zanaatkâr | 17 | 1.5 | 2 | 19.1 | 0 | 0.9 | 0 |
| Sürü izleyen | 6 | 1.7 | 6.2 | 23.1 | 28 | 3.3 | 33 |
| Yeni başlayan | 24 | 1.6 | 15 | 28.2 | 379 | 4.8 | 67 |
| Savunma teorisyeni | 8 | 0.8 | 0.6 | 15.5 | 0 | 0.8 | 0 |
| Çekirdek farmcı | 21 | 1.4 | 0.5 | 14.4 | 0 | 0.4 | 0 |
| PvP avcısı | 11 | 1 | 8 | 16.8 | 0 | 2 | 9 |
| Çatlak avcısı | 16 | 1.1 | 0.9 | 14.2 | 0 | 0.5 | 0 |
| Oba / sosyal | 7 | 1.5 | 1.6 | 20.1 | 0 | 1.1 | 0 |

**Ekonomi** (akçe arzı, Gini, pazar):

| Gün | Akçe arzı | Gini | Pazar satış | Pazar hacmi | Vergi | İlan ücreti | Satış/değer |
|---|---|---|---|---|---|---|---|
| 1 | 7.216.835 | 0.747 | 42 | 28.473 | 1.425 | 10.831 | 1.06 |
| 2 | 32.004.606 | 0.64 | 5 | 35.301 | 1.765 | 416 | 3.99 |
| 3 | 63.585.047 | 0.591 | 2 | 8.547 | 427 | 3.089 | 2.66 |
| 4 | 98.718.880 | 0.565 | 6 | 90.238 | 4.511 | 13.388 | 5.33 |
| 5 | 135.842.019 | 0.549 | 8 | 64.103 | 3.204 | 1.922 | 2.94 |
| 6 | 174.468.978 | 0.537 | 3 | 2.054 | 104 | 2.773 | 0.87 |
| 7 | 209.476.232 | 0.524 | 1 | 26.498 | 1.325 | 15.368 | 5.98 |
| 8 | 240.123.904 | 0.514 | 1 | 18.732 | 937 | 2.222 | 5.47 |
| 9 | 268.707.149 | 0.502 | 2 | 21.008 | 1.050 | 2.925 | 3.37 |
| 10 | 299.243.163 | 0.49 | 0 | 0 | 0 | 14.984 | 0 |
| 11 | 328.238.882 | 0.478 | 2 | 28.365 | 1.419 | 2.412 | 4.85 |
| 12 | 356.268.801 | 0.468 | 2 | 2.040 | 103 | 2.158 | 0.78 |
| 13 | 386.424.214 | 0.461 | 1 | 989 | 49 | 13.797 | 0.84 |
| 14 | 416.512.450 | 0.454 | 0 | 0 | 0 | 2.409 | 0 |

**Günlük ortalama kaynak:** 38.753.953 akçe — yaratık %54, NPC satış %30, sefer %15, kilometre taşı %1, gizem %0, boss (altın yağmuru dahil) %0

**Günlük ortalama sink:** 9.073.598 akçe — artı basma %82, üretim %8, beceri %8, efsun yenileme %2, pazar ilan ücreti %0, oba %0, pazar vergisi %0

**Sink / kaynak oranı: %23.4** (100'ün çok altı = enflasyon)

Tüccar/zanaatkâr pazar neti: ortalama 14.435 akçe (en iyi 44.215); üretilen 10295 parça, üretim maliyeti 10.239.270 akçe; çanta doluluğundan kaybolan ganimet 21.824.

**Kalabalık ve kamp kullanımı:**

| Kampta eşzamanlı oyuncu | Gözlem | Öldürme/dk (kişi başı) |
|---|---|---|
| 1 | 761 | 29.6 |
| 2-3 | 1268 | 37.7 |
| 4-6 | 816 | 40 |
| 7-10 | 175 | 35.2 |
| 11+ | 1094 | 16.7 |

Kullanılan kamp sayısı 64/42 · en kalabalık 5 kamp: kamp 14 %16, kamp 60 %15, kamp 15 %2, kamp 34 %2, kamp 57 %2 · yoğunlaşma (HHI) 0.057 (1/42=0,024 tam dağılım)

**Boss'lar:**

| Boss | Öldürme (dilimde) | Ort. süre (sn) | Ort. katılımcı | Ölüm/öldürme |
|---|---|---|---|---|
| 1 | 29 | 28.4 | 2 | 0 |
| 2 | 45 | 56 | 4.6 | 0.1 |
| 3 | 24 | 52.8 | 2.3 | 0 |
| 4 | 27 | 46.1 | 6.7 | 0 |
| 5 | 26 | 38.1 | 6.3 | 0 |

Boss öldüren oyuncu: 132/150 (%88); boss avcılarının boss başına dilim öldürmesi 20.9

**Çatlak:** Dilimlerde açılan çatlak 152, kapanan 42 (%28); kapatan oyuncu 138/150

**PvP:** PvP öldürme 2678; bunun 1991 tanesi (%74) 8+ seviye altındaki oyuncuya (gank); kırmızı adlı oyuncu 11; PvP'de en az 5 kez öldürülüp hiç öldürmeyen 68

**Savunma türleri** (alınan hasar payı ve oyuncuların savunması):

| Hasar türü | Alınan hasar payı | Ortalama savunma % | Savunması ≥%15 olan oyuncu % |
|---|---|---|---|
| kilic | %0 | 3.8 | 3 |
| cift | %23 | 4.3 | 3 |
| bicak | %21 | 4.8 | 3 |
| yay | %0 | 4.2 | 2 |
| buyu | %56 | 10.1 | 35 |

| Grup | Oyuncu | Ölüm/sa | Ana tehdit türüne karşı savunma % | Bloklanan vuruş |
|---|---|---|---|---|
| Savunma bilinçli | 53 | 2.7 | 21.1 | 681 |
| Bilinçsiz | 97 | 6.4 | 4.2 | 986 |

Ana tehdit türüne karşı savunması %10'un altında olup hasarın %40+'ını o türden alan oyuncu: **25/150**

**Mini harita A/B** (aynı nüfus içinde: haritayı — kamp seviyesi rengi + doluluk sayısı — okuyan ve okumayan yeni/gündelik oyuncular):

| Grup | Oyuncu | Ölüm/sa | Ort. ayrılma riski | Yüksek riskli % | Ödül/sa |
|---|---|---|---|---|---|
| Mini haritayı okuyan (yeni+gündelik) | 23 | 8.6 | 3 | 35 | 23.3 |
| Okumayan (yeni+gündelik) | 33 | 11.1 | 3.7 | 55 | 25.4 |

**Ayrılma riski** (ödül sıklığı, ölüm oranı, durgunluk, kayıp eşya, zorbalık):

Düşük 60 · orta 61 · **yüksek 29** (toplam 150).

En sık nedenler: # kez oyuncular tarafından öldürüldü (68); saatte # ölüm (38); # eşya yok oldu (29); # gün üst üste ilerleme yok (13); # başarısız artı serisi (2)

**Performans:** Ortalama tick+ajan maliyeti 1.4 ms (dilimler: 56); en yoğun dilim 2.4 ms/tick, çevrimiçi 135 oyuncu.

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
