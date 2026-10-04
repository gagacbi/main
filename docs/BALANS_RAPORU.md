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
| Bot Sv10 / Sv20 / Sv30 süresi | ≈1 / 6 / 20 sa | 0,15 / 0,5 / 1,8 sa (1 saatte Sv29) | **1,4 / 7,0 / 23 sa** |
| Sv50 (bot) | ≈110 sa | ulaşılamaz biçimde hızlı | ≈88 sa |
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
10. **Üst sınırlar:** kritik %75, vuruş hızı +%60, can çalma %15, hız +%50.

## 3. İlerleme (bot, Gök Kılıç Alp)

| Seviye | Süre (sa) | Hedef (sa) | Seviyeye kadar öldürme | Kill/sa (o seviye) |
|---|---|---|---|---|
| 5 | 0.18 |  | 89 | 494 |
| 10 | 1.38 | ≈1 | 1.408 | 1.096 |
| 15 | 2.77 |  | 3.237 | 1.323 |
| 20 | 7.04 | ≈6 | 8.912 | 1.328 |
| 25 | 11.56 |  | 15.440 | 1.444 |
| 30 | 23.35 | ≈20 | 28.313 | 1.092 |
| 35 | 33.64 |  | 41.861 | 1.316 |
| 40 | 51.09 | ≈55 | 66.041 | 1.386 |
| 45 | 68.29 |  | 89.036 | 1.337 |

Koşu: 87.73200000000001 simüle saat, 485.8 sn gerçek süre; ulaşılan seviye **50**, 4 ölüm, 136.825 yaratık, artı basma: 82 başarı / 14 başarısız / 0 yok olan.

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
| gok | kalkan | 479 | 2.734 | 247 | 10.858 | 7.4 | 1 | 1 |
| gok | kilic | 659 | 2.062 | 198 | 6.152 | 7.4 | 1 | 1 |
| yer | none | 494 | 2.420 | 214 | 7.590 | 7 | 1 | 1 |
| yer | kalkan | 456 | 2.913 | 263 | 11.910 | 7 | 1 | 1 |
| yer | kilic | 631 | 2.241 | 214 | 7.029 | 7 | 1 | 1 |
| ay | none | 494 | 2.241 | 198 | 6.686 | 7 | 1.12 | 1.4 |
| ay | kalkan | 456 | 2.734 | 247 | 10.858 | 7 | 1.12 | 1.4 |
| ay | kilic | 631 | 2.062 | 198 | 6.152 | 7 | 1.12 | 1.4 |

Bot koşusu (5 saat, Sv0'dan):

| Boy | Uzmanlık | Seviye | Kill/sa | Ölüm/sa | Can %/öldürme | Sv10 süresi (sa) |
|---|---|---|---|---|---|---|
| gok | kalkan | 19 | 1.432 | 0.8 | 0.9 | 1.32 |
| gok | kilic | 19 | 1.474 | 0.8 | 1.5 | 1.32 |
| yer | kalkan | 19 | 1.409 | 0.6 | 1 | 1.24 |
| yer | kilic | 19 | 1.477 | 0 | 1.5 | 1.30 |
| ay | kalkan | 19 | 1.471 | 0.6 | 0.8 | 1.18 |
| ay | kilic | 19 | 1.513 | 1.2 | 1.2 | 1.25 |

Sonuç: boylar birbirinden %12'den az ayrışıyor. Kılıç Alp ≈%27 DPS kazanıp ≈%8 dayanıklılık kaybediyor; Kalkan Alp ≈%62 etkin can kazanıp ≈%8 DPS kaybediyor. Tek başına PvE'de Kılıç daha hızlıdır; Kalkan'ın değeri sürü çekme, grup ve PvP'dedir.

## 6. Yetenekler

**Sv10** — temel vuruş 247/sn; 5 hedefe tam rotasyon 779/sn (×3.2)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 8.011 | ×1.1 |
| sarsinti | 10 | 1.2 | 2.395 | ×0.3 |
| nara | 12 | 0.35 | 582 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 4.951 | ×0.7 |

**Sv20** — temel vuruş 457/sn; 5 hedefe tam rotasyon 1.894/sn (×4.1)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 16.500 | ×1.2 |
| sarsinti | 10 | 1.2 | 4.958 | ×0.4 |
| nara | 12 | 0.35 | 1.207 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 10.831 | ×0.8 |
| hiddet | 30 | 7 | 9.627 | ×0.7 |

**Sv30** — temel vuruş 659/sn; 5 hedefe tam rotasyon 2.988/sn (×4.5)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 26.379 | ×1.3 |
| sarsinti | 10 | 1.2 | 7.918 | ×0.4 |
| nara | 12 | 0.35 | 1.922 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 18.259 | ×0.9 |
| hiddet | 30 | 7 | 15.399 | ×0.8 |

**Sv40** — temel vuruş 972/sn; 5 hedefe tam rotasyon 5.127/sn (×5.3)

| Yetenek | Bekleme | Çarpan | 30 sn toplam (5 hedef) | Temel vuruşa oranı |
|---|---|---|---|---|
| savurma | 4 | 1.6 | 46.594 | ×1.6 |
| sarsinti | 10 | 1.2 | 13.974 | ×0.5 |
| nara | 12 | 0.35 | 3.395 | ×0.1 |
| kalkan | 20 | 0 | 0 | ×0 |
| zehir | 8 | 0.7 | 33.518 | ×1.1 |
| hiddet | 30 | 7 | 27.179 | ×0.9 |

## 7. PvP

| Sv | Kılıç→Kalkan ölüm (sn) | Kalkan→Kılıç | Kılıç↔Kılıç | PvE denk. (Kılıç→Kalkan) | +9 efsanevi → çıplak ay |
|---|---|---|---|---|---|
| 10 | 23.1 | 18.4 | 13.8 | 8.1 | 4.4 |
| 20 | 30.3 | 22.8 | 17.7 | 10.4 | 5 |
| 30 | 37.5 | 28.1 | 22 | 13.2 | 5.4 |
| 50 | 53.3 | 37.2 | 30.7 | 18.7 | 6.1 |

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
| Sv-3 | 1.581 | 0 | 1.1 | 200.215 | 103.8 |
| Sv-1 | 1.714 | 0 | 1 | 250.503 | 129.9 |
| Sv±0 | 1.817 | 0 | 1.7 | 314.757 | 163.2 |
| Sv+1 | 1.525 | 0.7 | 1.9 | 261.025 | 135.4 |
| Sv+2 | 1.548 | 0 | 3.2 | 326.197 | 169.2 |
| Sv+4 | 996 | 2 | 3.7 | 155.012 | 80.4 |

Sv+1…+2 verimi sıfır seviyeye yakın; Sv+4'te verim yarıya iner. Kendini zorlamanın bedeli var ama keşfe değer; "her zaman en yüksek kampı farm et" stratejisi yok.

## 10. Erlik çatlağı (aynı boydan parti, referans yapı)

| Sv | Oyuncu | Sonuç | Temizleme (sn) | Toplam ölüm | Ödül XP (seviyenin %) |
|---|---|---|---|---|---|
| 20 | 1 | kapandı | 128.7 | 0 | 7.1 |
| 20 | 2 | kapandı | 83.2 | 0 | 7.1 |
| 20 | 3 | kapandı | 71 | 0 | 7.1 |
| 20 | 4 | kapandı | 67.2 | 0 | 7.1 |
| 20 | 6 | kapandı | 59.3 | 0 | 7.1 |
| 40 | 1 | kapandı | 154.9 | 0 | 1.8 |
| 40 | 2 | kapandı | 90.1 | 0 | 1.8 |
| 40 | 3 | kapandı | 81.2 | 0 | 1.8 |
| 40 | 4 | kapandı | 73.3 | 0 | 1.8 |
| 40 | 6 | kapandı | 67.3 | 0 | 1.8 |

## 11. Yönetici hesabı uç durumları

| Sv | Efsanevi +9 takım | Kill/sa | Ölüm | Can %/öldürme | Saldırı | Can |
|---|---|---|---|---|---|---|
| 50 | hayır | 1.649 | 3 | 0.7 | 1.002 | 4.335 |
| 50 | evet | 1.798 | 0 | 0.1 | 2.024 | 7.295 |
| 30 | evet | 1.244 | 0 | 0.4 | 959 | 4.515 |

## 12. Ekonomi

| Sv | Akçe/sa | Kill/sa | +9 (tılsımlı) toplam akçe | Kaç saatlik kazanç |
|---|---|---|---|---|
| 10 | 18.753 | 1.257 | 226.639 | 12.1 |
| 20 | 86.109 | 1.667 | 368.288 | 4.3 |
| 30 | 83.345 | 1.017 | 509.938 | 6.1 |
| 40 | 149.304 | 1.375 | 651.587 | 4.4 |
| 48 | 164.700 | 1.400 | 764.907 | 4.6 |

## 13. Açık sorular ve bilinen sınırlar

1. **Çatlakta boylar arası dost ateşi:** farklı boy oyuncuların AoE'si birbirine PvP olarak işler. Ateşkes alanı mı, açık PvP mi? Karar bekliyor.
2. **Akçe birikimi:** bot 88 saatte ~13 milyon akçe biriktirdi çünkü yalnızca +4'e kadar bastı (tılsım üretimi için oba gerekir; botta yok). Gerçek oyuncu +9 hedefler ve tablodaki saatler (4–12 sa'lık kazanç) bunu sinker olarak gösterir; yine de Sv40+ sonrası akçe sinki zayıf. Sonraki aşamada (pazar, vergi) çözülecek.
3. **Bot sınırları:** oba, sefer, düello, parti taktiği, kalabalık etkisi simüle edilmedi. Sv1–2 çok hızlı (öğretici gereği).
4. **Şifa/iksir yok:** can yalnızca bölgede dinlenerek yenilenir; savaş içi iyileşme (Ay boyu) sonraki aşamada anlam kazanacak.
5. **PVP_COEF (0,35)** için oyun testi verisi yok; çözümsel tablodaki süreler PvE'nin ≈2,3 katıdır.
