# Kımız kontrol koşusu (aynı tohum, yalnızca Kımız açık/kapalı)

150 oyuncu · 14 gün · dilim 2 dk · tohumlar 7, 8, 9 · Kımız birim fiyatı 0,6 · diğer tüm parametreler aynı (`POP_NOKIMIZ=1` kontrol).
Üretim: `tests/sim/population/multi.ts` (ham veri `/tmp` koşularından; yeniden üretim komutları `docs/POPULASYON_RAPORU.md` §5).

| Metrik (3 tohum ortalaması) | Kımızsız | Kımız 0,6 | Fark |
|---|---|---|---|
| Sink/kaynak | %52,8 | %57,5 | **+4,7 puan** (tohum başına +3,0 / +4,5 / +6,8) |
| Kaynak/gün | 55,6M | 54,7M | −0,9M |
| Sink/gün | 29,4M | 31,5M | +2,1M |
| Kımız sink/gün | — | 3,9M | |
| Net akçe artışı/gün | 26,2M | 23,2M | −3,0M |
| Medyan bakiye G7 → G14 | 0,77M → 1,37M | 0,67M → 1,27M | −0,1M |
| Üst %10 bakiye | 6,0M | 5,6M | −0,4M |
| Toplam akçe G14 | 334,6M | 298,8M | −35,8M (−%10,7) |
| Zindan kazanma | %85 | %89 | +4 puan |
| Bayraklı çiftçi ölüm/sa | 0,69 | 0,65 | gürültü içinde |

**Okuma:** Kımız'ın gerçek marjinal katkısı ≈ +4,7 puan (tek başına bakınca görünen +3,9M sink'in yalnızca ~%54'ü net: kalan kısım kostüm efsun/şans eşyası harcamalarının yerine geçti — simülasyon ajanları rezerv/bütçe kurallarıyla harcıyor, talep sınırlı değil bütçe sınırlı). Medyan bakiye düşmüyor (G7→G14 artıyor). Zindan kazanma Kımız ile hafif artıyor, PvP davranışı tohum gürültüsünün içinde.

## Mevcut sink kalemleri (son 7 gün ortalaması, M/gün)

| Kalem | Kımızsız | Kımız 0,6 |
|---|---|---|
| Kostüm: efsun | 11,1 | 9,6 |
| Artı basma | 6,1 | 5,9 |
| Kostüm: uzatma | 4,6 | 4,3 |
| Kostüm: üretim | 3,8 | 4,7 |
| Kımız | 0 | 3,9 |
| Kostüm: şans eşyası | 1,6 | 0,7 |
| Üretim (demirci) | 1,0 | 0,9 |
| Kostüm: tezgâh | 0,9 | 0,9 |
| Pazar ilan ücreti | 0,2 | 0,2 |
| Zindan ücreti | 0,1 | 0,1 |
| Pazar vergisi | ~0,0 | ~0,0 |

**Pazar:** günde ≈ 20–32 satış, hacim 0,1–0,3M/gün, vergi ≈ 0,01M/gün → vergiyi artırmak sink olarak **anlamsız** (5 katı bile ~0,05M). **Zindan ücreti:** ≈ 0,1M/gün (sink'in %0,4'ü); anlamlı olması için ücretin ~50 kat artması gerekir (giriş başına ~2,5 maliyet birimi) — oyuncuyu zindandan caydırır, kullanıcı kuralıyla çelişir.

# Kaynak tarafı deneyi (NPC satış çarpanı ve yaratık akçesi, 3 tohum 7/8/9, Kımız 0,6)

Kontrol: NPC 0,70 · yaratık %100. A: NPC 0,50. B: yaratık %85. Üretim: `tests/sim/population/compare.ts`.

| Metrik | kontrol (n=3) | A_npc0.5 (n=3) | Fark A_npc0.5 | B_mob85 (n=3) | Fark B_mob85 |
|---|---|---|---|---|---|
| Sink/kaynak | %57.5 | %57.8 | +0.3 puan | %58.2 | +0.6 puan |
| Kaynak/gün | 54.7M | 51.7M | -3.0M | 49.7M | -5.0M |
| Sink/gün | 31.5M | 29.9M | -1.6M | 28.9M | -2.5M |
| Net akçe artışı/gün | 23.2M | 21.8M | -1.4M | 20.8M | -2.4M |
| Toplam akçe G14 | 298.8M | 280.4M | -18.4M | 266.4M | -32.4M |
| Medyan bakiye G7 → G14 | 0.7M → 1.3M | 0.6M → 1.2M | — | 0.6M → 1.1M | — |
| Üst %10 bakiye | 5.6M | 5.1M | -0.5M | 4.9M | -0.7M |
| NPC satışından kaynak/gün | 11.6M | 8.4M | -3.2M | 11.7M | 0.1M |
| Yaratık akçesinden kaynak/gün | 34.6M | 34.9M | 0.4M | 29.6M | -5.0M |
| Sefer kaynağı/gün | 8.2M | 8.1M | -0.1M | 8.1M | -0.1M |
| Boss+çatlak kaynağı/gün | 0.0M | 0.0M | 0.0M | 0.0M | 0.0M |
| Kımız sink/gün | 3.9M | 3.7M | -0.2M | 3.5M | -0.4M |
| Kostüm sink/gün | 19.6M | 18.2M | -1.3M | 17.9M | -1.7M |
| Şans eşyası sink/gün | 0.7M | 0.7M | 0.0M | 0.7M | -0.0M |
| Artı basma sink/gün | 5.9M | 5.9M | -0.1M | 5.5M | -0.5M |
| Zindan kazanma | %89 | %89 | 0 puan | %91 | 3 puan |
| Bayraklı çiftçi ölüm/sa | 0.65 | 0.48 | -0.17 | 0.52 | -0.13 |

Tohum başına sink/kaynak: kontrol: 58.5 / 58.0 / 56.1 · A_npc0.5: 60.2 / 57.8 / 55.4 · B_mob85: 59.6 / 58.8 / 56.0

**Okuma:** kaynak kısıldığında sink da neredeyse orantılı düştü (kaynak −3,0M → sink −1,6M; −5,0M → −2,5M), bu yüzden sink/kaynak oranı kıpırdamadı (%57,5 → %57,8 / %58,2). Simülasyon ajanları harcamayı gelire/bakiyeye orantılı yapıyor (bütçe kuralları); kısılan gelir yalnızca ekonomiyi küçülttü: net birikim −1,4M / −2,4M, G14 toplam akçe −%6 / −%11, medyan G14 1,3M → 1,2M / 1,1M. İki kalemin tek başına oran elastikiyeti ≈ 0.
