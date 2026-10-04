# KUT — Denge Raporu

Tarih: 2026-10-04 · Veri: `docs/balans/sonuc.json` (tablolar bu veriden üretilir) · Yeniden üretim: `npm run sim`

## 1. Yöntem

* **Başsız donanım** (`tests/sim/rig.ts`): gerçek `World` sınıfı ve gerçek SQLite, sahte saatle 0,1 sn adımlarla sürülür. Bir simüle saat yaklaşık 6–8 sn gerçek süre alır.
* **Bot** (`PlayBot`): kamp seçer, yaklaşır, vurur, yetenekleri duruma göre kullanır, canı azalınca yurda çekilir, 3 dk'da bir demirciye uğrayıp eşya giyer, satar, artı basar, beceri puanı harcar. Yönetici hesabı rolüyle kurulur; uç durum testlerinde `gm level`, `gm kit +9`, `gm maxskills` komutları kullanılır.
* **Çözümsel tablolar** (`tests/sim/analytic.ts`): aynı formüller, "referans yapı" (seviyeye uygun nadir parça, seviyeyle artan güvenli artı).
* Bot verimli oyuncudur. **Gerçek oyuncu 2–3 kat yavaş** düşünülmelidir.

## 2. Hedefler ve sonuç

| Metrik | Hedef | Önce | Sonra |
|---|---|---|---|
| Aynı seviye yaratığı öldürme süresi | 3–5 sn | 0,8–2,1 sn | 2,8–5,3 sn |
| Öldürme başına can kaybı | ≈%5 | %1–1,6 | %4,2–5,9 |
| Bot Sv10 / Sv20 / Sv30 süresi | ≈1 / 6 / 20 sa | 0,15 / 0,5 / 1,8 sa (1 saatte Sv29) | **1,4 / 7,6 / 25 sa** |
| Sv50 (bot) | ≈110 sa | ulaşılamaz biçimde hızlı | ≈97 sa |
| +5 seviye yaratığın bedeli | ≥1,3–1,8× | 1,3–2,5× (yüksek seviyede 1,2×) | seviye farkı eğrisiyle artırıldı |

### Yapılan ayarlar

1. **Yaratık canı** ×2,3–3,7 (`mobHp`); öldürme 1 sn yerine 3–5 sn.
2. **Yaratık saldırısı** ikinci dereceden terim eklendi (`+0,045·L²`); yüksek seviyede oyuncu savunması hızlı büyüdüğü için can kaybı %1'e düşüyordu.
3. **Deneyim eğrisi** `28·L^2,95`; kamp seviyesi sınırı 24 → 48 (Sv24 sonrası oyuncuya uygun yaratık kalmıyordu).
4. **Seviye farkı** (`lvlDiffOut/In`): yüksek seviye yaratığa hasar azalır, yaratığın vuruşu artar.
5. **Yetenekler:** Tengri Hiddeti çarpanı 3,8 → 7 (saniye başına Zehirli Kesik'in üçte biriydi); zehir hasarı 0,28 → 0,2.
6. **Ay boyu** büyü bonusu %7 → %12 (DPS'e katkısı yoktu).
7. **Ölüm cezası** %6 → %10 deneyim.
8. **Çatlak:** ödül XP ×20 → ×80 (seviyenin %2'siydi), altın ×22 → ×30; dalgalar arası 7 sn mola ve %25 can; ekstra oyuncu başına +1 yaratık (+2 değil); Bekçi can 14→16, saldırı 1,7→2,8.
9. **Tılsım maliyeti** 200 akçe/14 cevher/6 deri → 900/24/12 (artık +9 akçesinin ~%5'i).
10. **Üst sınırlar:** kritik %75, vuruş hızı +%60, can çalma %20, hız +%50, tür savunması %40, vuruş bloğu %35, beceri bloğu %30, delme %40.

### İkinci tur: savunma sistemi ve PvP (sokak lambası avı, bkz. `TEST_FELSEFESI.md`)

11. **Savunma sistemi (Metin2 tarzı):** 5 silah türü (kılıç, çift el, bıçak, yay, büyü çanı), tür savunmaları, vuruş ve beceri bloğu, delme, her parçada slota göre temel efsun. Yaratıklar da türlüdür (Tepegöz=çift el, Albastı/Erlik=büyü, Çakal=bıçak).
12. **Delme** bloğu ve tür savunmasını yok sayar ve **+%25 delici hasar** verir; aksi hâlde savunma yığmak baskındı.
13. **Güvenli bölgeden yaratığa vurulamaz** (menzilli silahla bedava öldürme açığı); **menzilli silah yürürken otomatik vuruş yapamaz** (kaçarak vurmada kill başına hasar −%89'du).
14. **PvP uzmanlık dengesi:** aynı donanımla Kalkan Alp aynalı düelloları %92–100 kazanıyordu. Kalkan sağlamlık bonusları kısıldı (can %22→%8, savunma %25→%8, hasar azaltma %12→%6), Kılıç Alp'in avantajları ayarlandı, uzmanlığa özel `pvpTaken` çarpanı (Kalkan +%10, yalnızca oyuncudan gelen hasarda) ve Tengri Kalkanı emilimi (%35→%18, kalkan çarpanı 1,6→1,2) düşürüldü.
15. **Silah türü dengesi:** çift el (+%4 saldırı, −%12 hız), bıçak (−%6 saldırı, +%18 hız, +4 kritik), yay (−%9 saldırı, menzil 8,5), çan (−%8 saldırı, +%30 büyü, menzil 6,5). Yer boyu bonusu %8→%5 can, %8→%4 savunma.
16. **Saha bosları** (5 adet), **kilometre taşı armağanları** ve **seviye grubu auraları** (retention içeriği; ölçümü §10b).

## 3. İlerleme (bot, Gök Kılıç Alp)

| Seviye | Süre (sa) | Hedef (sa) | Seviyeye kadar öldürme | Kill/sa (o seviye) |
|---|---|---|---|---|
| 5 | 0.14 |  | 83 | 594 |
| 10 | 1.42 | ≈1 | 1.465 | 1.083 |
| 15 | 2.81 |  | 3.332 | 1.340 |
| 20 | 7.56 | ≈6 | 9.453 | 1.289 |
| 25 | 12.58 |  | 16.179 | 1.339 |
| 30 | 25.02 | ≈20 | 29.344 | 1.058 |
| 35 | 35.65 |  | 43.365 | 1.319 |
| 40 | 55.69 | ≈55 | 70.685 | 1.364 |
| 45 | 75.93 |  | 96.095 | 1.255 |

Koşu: 96.898 simüle saat, 638 sn gerçek süre; ulaşılan seviye **50**, 3 ölüm, 149.179 yaratık, artı basma: 95 başarı / 11 başarısız / 0 yok olan.

## 4. Savaş tempo ve güç eğrisi (çözümsel)

\* ÖS = öldürme süresi.

| Sv | Saldırı | Savunma | Can | ÖS* (sn) | Can %/öldürme | 4'lü sürü ölüm (sn) | +5 yaratık ÖS | +5 can %/öldürme | Seviye için öldürme |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 22 | 16 | 234 | 2.8 | 4.8 | 14.5 | 12.9 | 85.3 | 2 |
| 5 | 57 | 36 | 476 | 3.1 | 5.7 | 13.6 | 8.3 | 36.1 | 65 |
| 10 | 109 | 66 | 810 | 3.3 | 5.7 | 14.4 | 7 | 23.2 | 278 |
| 15 | 157 | 94 | 1.126 | 3.6 | 5.9 | 15.5 | 7.2 | 20.2 | 635 |
| 20 | 218 | 129 | 1.499 | 3.9 | 5.5 | 17.5 | 7.2 | 17.1 | 1.135 |
| 25 | 284 | 169 | 1.900 | 4.1 | 5.2 | 19.7 | 7.3 | 14.7 | 1.774 |
| 30 | 342 | 198 | 2.241 | 4.5 | 5.5 | 20.4 | 7.8 | 14.7 | 2.552 |
| 35 | 424 | 242 | 2.681 | 4.7 | 5.1 | 22.7 | 7.9 | 13 | 3.466 |
| 40 | 537 | 300 | 3.259 | 4.6 | 4.2 | 27 | 7.6 | 10.4 | 4.516 |
| 45 | 613 | 337 | 3.639 | 4.9 | 4.5 | 27.7 | 8 | 10.5 | 5.701 |
| 50 | 688 | 373 | 4.021 | 5.3 | 4.7 | 28.3 | 8.5 | 10.8 | 7.020 |

**Güç eğrisi:** çıplak / referans yapı / +9 efsanevi (aynı seviye).

| Sv | Çıplak DPS | Referans DPS | +9 efsanevi DPS | Referans/çıplak | +9/referans | Çıplak can | Referans can | +9 can |
|---|---|---|---|---|---|---|---|---|
| 1 | 24 | 44 | 110 | ×1.9 | ×2.5 | 150 | 234 | 477 |
| 5 | 55 | 106 | 290 | ×1.9 | ×2.7 | 286 | 476 | 1.024 |
| 10 | 92 | 194 | 508 | ×2.1 | ×2.6 | 456 | 810 | 1.710 |
| 15 | 124 | 268 | 738 | ×2.2 | ×2.8 | 626 | 1.126 | 2.394 |
| 20 | 153 | 356 | 965 | ×2.3 | ×2.7 | 796 | 1.499 | 3.079 |
| 25 | 179 | 447 | 1199 | ×2.5 | ×2.7 | 966 | 1.900 | 3.763 |
| 30 | 205 | 518 | 1440 | ×2.5 | ×2.8 | 1.136 | 2.241 | 4.448 |
| 35 | 226 | 621 | 1678 | ×2.7 | ×2.7 | 1.306 | 2.681 | 5.134 |
| 40 | 246 | 767 | 1923 | ×3.1 | ×2.5 | 1.476 | 3.259 | 5.818 |
| 45 | 265 | 848 | 2174 | ×3.2 | ×2.6 | 1.646 | 3.639 | 6.503 |
| 50 | 283 | 922 | 2434 | ×3.3 | ×2.6 | 1.816 | 4.021 | 7.187 |

## 5. Boy ve uzmanlık (Sv30, referans yapı)

\*\* Etkin can = can ÷ (yaratık vuruşunun savunma sonrası payı).

| Boy | Uzmanlık | DPS | Can | Savunma | Etkin can** | Hız | Büyü | Şifa |
|---|---|---|---|---|---|---|---|---|
| gok | none | 518 | 2.241 | 198 | 6.686 | 7.4 | 1 | 1 |
| gok | kalkan | 489 | 2.420 | 214 | 8.075 | 7.4 | 1 | 1 |
| gok | kilic | 638 | 2.151 | 198 | 6.418 | 7.4 | 1 | 1 |
| yer | none | 494 | 2.353 | 206 | 7.196 | 7 | 1 | 1 |
| yer | kalkan | 466 | 2.532 | 222 | 8.671 | 7 | 1 | 1 |
| yer | kilic | 611 | 2.263 | 206 | 6.921 | 7 | 1 | 1 |
| ay | none | 494 | 2.241 | 198 | 6.686 | 7 | 1.12 | 1.4 |
| ay | kalkan | 466 | 2.420 | 214 | 8.075 | 7 | 1.12 | 1.4 |
| ay | kilic | 611 | 2.151 | 198 | 6.418 | 7 | 1.12 | 1.4 |

Bot koşusu (5 saat, Sv0'dan):

| Boy | Uzmanlık | Seviye | Kill/sa | Ölüm/sa | Can %/öldürme | Sv10 süresi (sa) |
|---|---|---|---|---|---|---|
| gok | kalkan | 19 | 1.394 | 1.8 | 1.1 | 1.45 |
| gok | kilic | 19 | 1.471 | 0.2 | 1.2 | 1.26 |
| yer | kalkan | 19 | 1.376 | 1.4 | 1.2 | 1.38 |
| yer | kilic | 19 | 1.486 | 0.4 | 1 | 1.23 |
| ay | kalkan | 19 | 1.393 | 0.8 | 1.2 | 1.26 |
| ay | kilic | 19 | 1.441 | 1 | 1.2 | 1.23 |

Sonuç: boylar birbirinden %12'den az ayrışıyor. Kılıç Alp ≈%27 DPS kazanıp ≈%8 dayanıklılık kaybediyor; Kalkan Alp ≈%62 etkin can kazanıp ≈%8 DPS kaybediyor. Tek başına PvE'de Kılıç daha hızlıdır; Kalkan'ın değeri sürü çekme, grup ve PvP'dedir.

## 6. Yetenekler

**Sv10** — temel vuruş 241/sn; 5 hedefe tam rotasyon 763/sn (×3.2)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 7.853 | ×1.1 |
| sarsinti | 10 | 1.2 | 2.364 | ×0.3 |
| nara | 12 | 0.35 | 568 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 4.880 | ×0.7 |

**Sv20** — temel vuruş 442/sn; 5 hedefe tam rotasyon 1.856/sn (×4.2)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 16.219 | ×1.2 |
| sarsinti | 10 | 1.2 | 4.878 | ×0.4 |
| nara | 12 | 0.35 | 1.181 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 10.675 | ×0.8 |
| hiddet | 30 | 7 | 9.471 | ×0.7 |

**Sv30** — temel vuruş 638/sn; 5 hedefe tam rotasyon 2.934/sn (×4.6)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 26.011 | ×1.4 |
| sarsinti | 10 | 1.2 | 7.803 | ×0.4 |
| nara | 12 | 0.35 | 1.895 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 17.986 | ×0.9 |
| hiddet | 30 | 7 | 15.165 | ×0.8 |

**Sv40** — temel vuruş 941/sn; 5 hedefe tam rotasyon 5.036/sn (×5.4)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 45.920 | ×1.6 |
| sarsinti | 10 | 1.2 | 13.772 | ×0.5 |
| nara | 12 | 0.35 | 3.353 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 33.027 | ×1.2 |
| hiddet | 30 | 7 | 26.780 | ×0.9 |

## 7. PvP — eşleşme matrisi

12 yapı (eşit bütçe: 7 efsun; Sv30'da +4 destansı) her yapıyla iki yönde ve 3 tohumla düello eder (`tests/sim/pvp.ts`). Açık dünya PvP'si, PVP_COEF = 0,35.

| Yapı | Sv20 (+3) kazanma % | Sv30 (+4) kazanma % | Sv40 (+5) kazanma % | Sv50 (+6) kazanma % |
|---|---|---|---|---|
| Dengeli Kılıç | 74 | 71 | 68 | 56 |
| Ağır Çift El | 65 | 68 | 73 | 48 |
| Hızlı Bıçak | 59 | 52 | 45 | 47 |
| Yay (Ay) | 56 | 56 | 67 | 67 |
| Büyü Çanı (Ay) | 50 | 55 | 53 | 58 |
| Kalkan Alp (Yer) | 47 | 56 | 59 | 77 |
| Blok Kalesi (Yer) | 30 | 35 | 48 | 45 |
| Kılıç Savunmalı Kalkan | 39 | 41 | 36 | 38 |
| Delici Kılıç (Gök) | 58 | 58 | 65 | 62 |
| Büyü Savunmalı (Ay) | 5 | 5 | 5 | 14 |
| Cam Top: Saf Saldırı | 62 | 55 | 45 | 50 |
| Emici: Can Çalma | 55 | 50 | 35 | 38 |

Ortalama düello süresi: Sv20: 16.2 sn · Sv30: 19.5 sn · Sv40: 22.4 sn · Sv50: 25.5 sn.

Sv30 — satırdaki yapının sütundaki yapıya karşı kazanma %'si:

|  | Dengeli | Ağır | Hızlı | Yay Ay | Büyü Ay | Kalkan Yer | Blok Yer | Kılıç | Delici Gök | Büyü Ay | Cam | Emici: |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Dengeli Kılıç** | — | 83 | 83 | 67 | 50 | 83 | 50 | 17 | 67 | 100 | 100 | 83 |
| **Ağır Çift El** | 17 | — | 67 | 83 | 50 | 33 | 100 | 100 | 50 | 100 | 83 | 67 |
| **Hızlı Bıçak** | 17 | 33 | — | 17 | 33 | 33 | 67 | 100 | 67 | 100 | 50 | 50 |
| **Yay (Ay)** | 33 | 17 | 83 | — | 67 | 33 | 50 | 100 | 67 | 100 | 17 | 50 |
| **Büyü Çanı (Ay)** | 50 | 50 | 67 | 33 | — | 50 | 67 | 100 | 33 | 83 | 50 | 17 |
| **Kalkan Alp (Yer)** | 17 | 67 | 67 | 67 | 50 | — | 67 | 17 | 17 | 100 | 67 | 83 |
| **Blok Kalesi (Yer)** | 50 | 0 | 33 | 50 | 33 | 33 | — | 17 | 0 | 100 | 17 | 50 |
| **Kılıç Savunmalı Kalkan** | 83 | 0 | 0 | 0 | 0 | 83 | 83 | — | 33 | 100 | 0 | 67 |
| **Delici Kılıç (Gök)** | 33 | 50 | 33 | 33 | 67 | 83 | 100 | 67 | — | 100 | 33 | 33 |
| **Büyü Savunmalı (Ay)** | 0 | 0 | 0 | 0 | 17 | 0 | 0 | 0 | 0 | — | 33 | 0 |
| **Cam Top: Saf Saldırı** | 0 | 17 | 50 | 83 | 50 | 33 | 83 | 100 | 67 | 67 | — | 50 |
| **Emici: Can Çalma** | 17 | 33 | 50 | 50 | 83 | 17 | 50 | 33 | 67 | 100 | 50 | — |

Okuma: hiçbir yapı baskın değil ve doğrusal sıralama yok; her ana yapının bir avı ve bir rakibi var (örn. kılıç savunmalı kalkan, kılıç türü vuranlara karşı güçlü; bıçak/çift el/yay ona karşı üstün). **Büyü Savunmalı** yapı yalnızca büyü türünü kestiği için PvP'de niş kalır; asıl değeri büyü boss'larında ve büyü hasarlı bölgelerdedir (bkz. `TEST_FELSEFESI.md` §3).

## 8. Artı basma (beklenen maliyet, Markov)

Oranlar PRD tablosuna birebir uyar ve değiştirilmedi.

| Parça ilvl | Strateji | Hedef | Beklenen deneme | Akçe | Cevher | Kitap | Tılsım | Yok olan parça |
|---|---|---|---|---|---|---|---|---|
| 20 | düz | +4 | 4.5 | 9.368 | 33 | 0 | 0 | 0 |
| 20 | düz | +7 | 57.3 | 229.389 | 518 | 0 | 0 | 7.8 |
| 20 | düz | +9 | 2914.9 | 12.478.561 | 26.908 | 0 | 0 | 437.4 |
| 20 | kitap | +4 | 4.2 | 8.385 | 30 | 4.2 | 0 | 0 |
| 20 | kitap | +7 | 31.4 | 136.486 | 293 | 31.4 | 0 | 3.9 |
| 20 | kitap | +9 | 545.4 | 2.657.397 | 5.275 | 545.4 | 0 | 81.3 |
| 20 | tılsım | +4 | 4.5 | 9.368 | 33 | 0 | 0 | 0 |
| 20 | tılsım | +7 | 10.9 | 74.488 | 125 | 0 | 6.4 | 0 |
| 20 | tılsım | +9 | 25.9 | 368.288 | 415 | 0 | 21.4 | 0 |
| 20 | kitap+tılsım | +4 | 4.2 | 8.385 | 30 | 4.2 | 0 | 0 |
| 20 | kitap+tılsım | +7 | 9.4 | 60.963 | 104 | 9.4 | 5.2 | 0 |
| 20 | kitap+tılsım | +9 | 17.7 | 221.730 | 264 | 17.7 | 13.6 | 0 |
| 40 | düz | +4 | 4.5 | 16.575 | 33 | 0 | 0 | 0 |
| 40 | düz | +7 | 57.3 | 405.842 | 518 | 0 | 0 | 7.8 |
| 40 | düz | +9 | 2914.9 | 22.077.455 | 26.908 | 0 | 0 | 437.4 |
| 40 | kitap | +4 | 4.2 | 14.836 | 30 | 4.2 | 0 | 0 |
| 40 | kitap | +7 | 31.4 | 241.475 | 293 | 31.4 | 0 | 3.9 |
| 40 | kitap | +9 | 545.4 | 4.701.549 | 5.275 | 545.4 | 0 | 81.3 |
| 40 | tılsım | +4 | 4.5 | 16.575 | 33 | 0 | 0 | 0 |
| 40 | tılsım | +7 | 10.9 | 131.787 | 125 | 0 | 6.4 | 0 |
| 40 | tılsım | +9 | 25.9 | 651.587 | 415 | 0 | 21.4 | 0 |
| 40 | kitap+tılsım | +4 | 4.2 | 14.836 | 30 | 4.2 | 0 | 0 |
| 40 | kitap+tılsım | +7 | 9.4 | 107.858 | 104 | 9.4 | 5.2 | 0 |
| 40 | kitap+tılsım | +9 | 17.7 | 392.291 | 264 | 17.7 | 13.6 | 0 |

Bulgular: korumasız +9 fiilen imkânsız (~2.900 deneme, ~437 yok olan parça); tılsımla ~26 deneme; kitap tek başına yarıdan azı. Tılsım ucuz olunca yok olma riski anlamsızlaşacağı için maliyeti artırıldı.

## 9. Risk / ödül (Sv20 referans oyuncu, hedef kamp seviyesi)

| Kamp seviyesi | Kill/sa | Ölüm/sa | Can %/öldürme | XP/sa | XP/sa (seviyenin %) |
|---|---|---|---|---|---|
| Sv-3 | 1.587 | 0 | 1.3 | 194.772 | 101 |
| Sv-1 | 1.714 | 0 | 1.2 | 249.795 | 129.5 |
| Sv±0 | 1.794 | 0 | 1.4 | 284.359 | 147.5 |
| Sv+1 | 1.619 | 0.7 | 2.8 | 283.723 | 147.1 |
| Sv+2 | 1.347 | 0.7 | 5.1 | 275.421 | 142.8 |
| Sv+4 | 1.013 | 0 | 3.1 | 201.296 | 104.4 |

Sv+1…+2 verimi sıfır seviyeye yakın; Sv+4'te verim yarıya iner. Kendini zorlamanın bedeli var ama keşfe değer; "her zaman en yüksek kampı farm et" stratejisi yok.

## 10. Erlik çatlağı (aynı boydan parti, referans yapı)

| Sv | Oyuncu | Sonuç | Temizleme (sn) | Toplam ölüm | Ödül XP (seviyenin %) |
|---|---|---|---|---|---|
| 20 | 1 | kapandı | 122.6 | 0 | 7.1 |
| 20 | 2 | kapandı | 80.3 | 0 | 7.1 |
| 20 | 3 | kapandı | 72.1 | 0 | 7.1 |
| 20 | 4 | kapandı | 67.2 | 0 | 7.1 |
| 20 | 6 | kapandı | 61.5 | 0 | 7.1 |
| 40 | 1 | kapandı | 131.8 | 0 | 1.8 |
| 40 | 2 | kapandı | 90.1 | 0 | 1.8 |
| 40 | 3 | kapandı | 79.7 | 0 | 1.8 |
| 40 | 4 | kapandı | 76.2 | 0 | 1.8 |
| 40 | 6 | kapandı | 65.1 | 0 | 1.8 |

## 10b. Saha bosları (referans yapı, bot)

| Boss | Sv | Oyuncu | Sonuç | Süre (sn) | Ölüm | En düşük can % |
|---|---|---|---|---|---|---|
| 1 | 9 | 1 | öldü | 130.7 | 3 | 3 |
| 1 | 9 | 2 | öldü | 57.3 | 2 | 4 |
| 1 | 9 | 4 | öldü | 22.3 | 0 | 28 |
| 2 | 19 | 1 | öldü | 75.9 | 1 | 2 |
| 2 | 19 | 2 | öldü | 37.1 | 0 | 1 |
| 2 | 19 | 4 | öldü | 19.9 | 0 | 48 |
| 3 | 29 | 1 | öldü | 97.7 | 1 | 1 |
| 3 | 29 | 2 | öldü | 60 | 1 | 3 |
| 3 | 29 | 4 | öldü | 22.8 | 0 | 47 |
| 4 | 39 | 1 | öldü | 118 | 1 | 1 |
| 4 | 39 | 2 | öldü | 65.7 | 1 | 2 |
| 4 | 39 | 4 | öldü | 27.3 | 0 | 38 |
| 5 | 48 | 1 | öldü | 122.3 | 1 | 3 |
| 5 | 48 | 2 | öldü | 60 | 0 | 4 |
| 5 | 48 | 4 | öldü | 30 | 0 | 52 |

Tek kişi boss'u kıl payı kazanır (en düşük can %1–10, bazen 1 ölüm); üç kişilik parti rahat kazanır. Boss ganimeti: garanti destansı+ parça (boss'un hasar türüne karşı savunma efsunlu), 2–3 kitap, %45 tılsım, 3 yazıt parçası, altın; yeniden doğuş 15 dk.

## 11. Yönetici hesabı uç durumları

| Sv | Efsanevi +9 takım | Kill/sa | Ölüm | Can %/öldürme | Saldırı | Can |
|---|---|---|---|---|---|---|
| 50 | hayır | 1.570 | 3 | 0.9 | 793 | 3.978 |
| 50 | evet | 1.811 | 0 | 0.1 | 1.990 | 7.338 |
| 30 | evet | 1.259 | 0 | 0.3 | 938 | 4.541 |

## 12. Ekonomi

| Sv | Akçe/sa | Kill/sa | +9 (tılsımlı) toplam akçe | Kaç saatlik kazanç |
|---|---|---|---|---|
| 10 | -895 | 1.276 | 226.639 | 226639.1 |
| 20 | 68.542 | 1.514 | 368.288 | 5.4 |
| 30 | 76.328 | 989 | 509.938 | 6.7 |
| 40 | 132.227 | 1.177 | 651.587 | 4.9 |
| 48 | 170.227 | 1.424 | 764.907 | 4.5 |

## 13. Açık sorular ve bilinen sınırlar

1. **Çatlakta boylar arası dost ateşi:** farklı boy oyuncuların AoE'si birbirine PvP olarak işler. Ateşkes alanı mı, açık PvP mi? Karar bekliyor.
2. **Akçe birikimi:** bot ~90 saatte on milyonlarca akçe biriktirdi çünkü yalnızca +4'e kadar bastı (tılsım üretimi için oba gerekir; botta yok). Gerçek oyuncu +9 hedefler ve tablodaki saatler (4–12 sa'lık kazanç) bunu sinker olarak gösterir; yine de Sv40+ sonrası akçe sinki zayıf. Sonraki aşamada (pazar, vergi) çözülecek.
3. **Bot sınırları:** oba, sefer, düello, parti taktiği, kalabalık etkisi simüle edilmedi. Sv1–2 çok hızlı (öğretici gereği).
4. **Şifa/iksir yok:** can yalnızca bölgede dinlenerek yenilenir; savaş içi iyileşme (Ay boyu) sonraki aşamada anlam kazanacak.
5. **PVP_COEF (0,35)** için oyun testi verisi yok; çözümsel tablodaki süreler PvE'nin ≈2,3 katıdır.
