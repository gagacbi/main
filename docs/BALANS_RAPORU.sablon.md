# KUT — Denge Raporu

Tarih: {{TARIH}} · Veri: `docs/balans/sonuc.json` (tablolar bu veriden üretilir) · Yeniden üretim: `npm run sim`

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

{{ILERLEME}}

## 4. Savaş tempo ve güç eğrisi (çözümsel)

\* ÖS = öldürme süresi.

{{DUEL}}

**Güç eğrisi:** çıplak / referans yapı / +9 efsanevi (aynı seviye).

{{POWER}}

## 5. Boy ve uzmanlık (Sv30, referans yapı)

\*\* Etkin can = can ÷ (yaratık vuruşunun savunma sonrası payı).

{{BOYSPEC}}

Bot koşusu (5 saat, Sv0'dan):

{{VARIANTS}}

Sonuç: boylar birbirinden %12'den az ayrışıyor. Kılıç Alp ≈%27 DPS kazanıp ≈%8 dayanıklılık kaybediyor; Kalkan Alp ≈%62 etkin can kazanıp ≈%8 DPS kaybediyor. Tek başına PvE'de Kılıç daha hızlıdır; Kalkan'ın değeri sürü çekme, grup ve PvP'dedir.

## 6. Yetenekler

{{SKILLS}}

## 7. PvP

{{PVP}}

## 8. Artı basma (beklenen maliyet, Markov)

Oranlar PRD tablosuna birebir uyar ve değiştirilmedi.

{{UPG}}

Bulgular: korumasız +9 fiilen imkânsız (~2.900 deneme, ~437 yok olan parça); tılsımla ~26 deneme; kitap tek başına yarıdan azı. Tılsım ucuz olunca yok olma riski anlamsızlaşacağı için maliyeti artırıldı.

## 9. Risk / ödül (Sv20 referans oyuncu, hedef kamp seviyesi)

{{OFFSETS}}

Sv+1…+2 verimi sıfır seviyeye yakın; Sv+4'te verim yarıya iner. Kendini zorlamanın bedeli var ama keşfe değer; "her zaman en yüksek kampı farm et" stratejisi yok.

## 10. Erlik çatlağı (aynı boydan parti, referans yapı)

{{RIFT}}

## 11. Yönetici hesabı uç durumları

{{ADMIN}}

## 12. Ekonomi

{{ECON}}

## 13. Açık sorular ve bilinen sınırlar

1. **Çatlakta boylar arası dost ateşi:** farklı boy oyuncuların AoE'si birbirine PvP olarak işler. Ateşkes alanı mı, açık PvP mi? Karar bekliyor.
2. **Akçe birikimi:** bot 88 saatte ~13 milyon akçe biriktirdi çünkü yalnızca +4'e kadar bastı (tılsım üretimi için oba gerekir; botta yok). Gerçek oyuncu +9 hedefler ve tablodaki saatler (4–12 sa'lık kazanç) bunu sinker olarak gösterir; yine de Sv40+ sonrası akçe sinki zayıf. Sonraki aşamada (pazar, vergi) çözülecek.
3. **Bot sınırları:** oba, sefer, düello, parti taktiği, kalabalık etkisi simüle edilmedi. Sv1–2 çok hızlı (öğretici gereği).
4. **Şifa/iksir yok:** can yalnızca bölgede dinlenerek yenilenir; savaş içi iyileşme (Ay boyu) sonraki aşamada anlam kazanacak.
5. **PVP_COEF (0,35)** için oyun testi verisi yok; çözümsel tablodaki süreler PvE'nin ≈2,3 katıdır.
