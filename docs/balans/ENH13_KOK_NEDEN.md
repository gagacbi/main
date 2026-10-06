# +10…+15 — kök neden analizi ve v1.3 (Simulation Only)

Oyuna eklenmedi. `ENH.v11` geçersiz kılma kancası varsayılan `null`; ekleme kararı ayrıdır.

## 1. Teşhis (v1.1 / v1.2 30 günlük verisinden)

| # | Kök neden | Kanıt | Etki |
|---|---|---|---|
| 1 | **Güç eğrisi aritmetik hatası.** v1.1 belgesinde "+15 ≈ +9'a göre ×1,19" yazıldı. Gerçek: (1+3,10)/(1+1,60) = **×1,58**. | Mikro-model: v1.1 4 slot ortalaması ×1,57; ajan koşusu üst %10/medyan 1,49 → 1,75. | Güç yoğunlaşması. Başarı oranı/maliyet ayarı bunu çözmez. |
| 2 | **Koruma eşyası arzı sınırsız.** Tılsım %0,6 mob drop'u; kitap drop + üretim. | Olgun oyuncuda medyan stok **1 107 Tılsım, 1 122 kitap**; kullanım günde ≤2. | Düşme kuralı etkisiz (düşme sayısı 0); kitap bonusu gerçek oranları +10 puan şişirdi. Adet artırmak işe yaramaz. |
| 3 | **Maliyet ölçeği gelire göre çok küçük.** | Olgun oyuncu medyan geliri **547k akçe/gün**; +10…+15 harcaması 14k/gün = gelirin %2,6'sı. | Sink olmaktan çok uzak (%3,7); asıl sink Kımız (%60). |

Yan bulgular: günlük deneme sınırı (1 vs 2/gün) sonucu değiştirmiyor, çünkü bağlayıcı olan akçe bütçesi (yalnızca çok zengin oyuncuyu sınırlar). "Pity" (başarısızlık sayacı) zaman dağılımını sıkıştırmıyor (silah +13 günü p10/p90: 25/120 → 23/109); yayılımı **bütçe farkı** belirliyor, şans değil → pity eklenmedi.

Açık soru (bu tasarımın dışında): yayındaki +9 sisteminde de Tılsım stoku bu kadar büyükse +5…+9 "yok olma" kuralı pratikte etkisizdir. Gerçek oyuncu öldürme hızı simülasyondakinden (≈2 180/saat) çok daha düşük olabilir; **gerçek veriyle teyit edilmeli**, değiştirilmedi.

## 2. Mikro-model (`tests/sim/population/enh-micro.ts`, saniyeler)

Tek oyuncu, 4 slot hepsi +9 başlangıç (MATURE_COHORT_ASSUMPTION), ilvl 42, günlük gelir lognormal (medyan 547k), enhancement bütçesi gelirin %5–30'u, 180 gün, 4 000 oyuncu.

| Kural | ağırlık +15 (30g/60g/90g/180g) | ≥+13 (30g/60g/90g) | Güç çarpanı (ort./p90/p10)* | +15 başına akçe (ort.) | Sink/gelir (ort.) | Takım ≥+13 (180g) | Silah +13 günü p10/p50/p90 |
|---|---|---|---|---|---|---|---|
| v1.1 (abundant Tılsım/kitap) | %15 / %54 / %75 / %95 | %68 / %93 / %98 | ×1.57 / ×1.58 / ×1.55 | 6883k | %7 | %100 | 11/22/54 |
| v1.2 | %0 / %1 / %5 / %30 | %31 / %69 / %85 | ×1.43 / ×1.55 / ×1.33 | 27263k | %17 | %87 | 19/41/102 |
| v1.3 (düz eğri, pity yok) | %0 / %0 / %2 / %20 | %17 / %55 / %75 | ×1.14 / ×1.17 / ×1.11 | 30545k | %17 | %81 | 25/53/120 |
| v1.3 + pity(+2/fail) | %0 / %1 / %6 / %39 | %23 / %64 / %81 | ×1.15 / ×1.19 / ×1.12 | 25643k | %17 | %87 | 23/46/109 |

*Güç çarpanı = 4 slot ortalama eşya çarpanı / +9 eşya çarpanı.

## 3. v1.3 (önerilen aday)

| Kural | Değer |
|---|---|
| Başarı şansı | 40 / 32 / 25 / 18 / 12 / 8 (değişmedi) |
| Güç eğrisi | +9 %160 → +10…+15: 168, 176, 184, 192, 200, **210** (+9'a göre ×1,19) |
| Maliyet çarpanı | +10 ×1,0 · +11 ×1,2 · +12 ×1,5 · +13 ×2,0 · +14 ×2,8 · +15 ×4,0 (taban formül: 60·n²·(1+ilvl/6), cevher 2+2n) |
| Başarısızlık | Eşya kalır; düşme/yok olma yok; Tılsım gerekmez, kitap bonusu yok (drop arzına bağımlılık kalktı) |
| Günlük sınır | hedef ≥ +12 için oyuncu başına 2 deneme (UTC+3 günü, sunucu doğrulamalı) — yalnızca çok zengin oyuncuyu sınırlar |

Hedefler ve mikro-model sonucu: güç çarpanı ×1,14 (hedef ≤ ×1,20) · silah +15: 90. günde %2, 180. günde %20 · silah +13 medyan 53. gün · sink/gelir %17 (bütçe %5–30 dağılımı ortalaması).

## 4. Doğrulama

Ajan simülasyonu (3 seed, 30 gün, aynı kohort): bkz. `ENH13_30GUN.md` (üretildikten sonra).
