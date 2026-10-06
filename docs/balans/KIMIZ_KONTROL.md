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
