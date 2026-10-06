# Endgame Enhancement Economy v1.1 — 30 günlük deney (Simulation Only)

3 seed · 30 gün · 150 oyuncu · kilitli profil (baseline_heavy, KZ 0,09, NPC 0,70, Mob %100, Kımız 0,6) · oranlar 40/32/25/18/12/8 (değiştirilmedi).

> **MATURE_COHORT_ASSUMPTION:** başlangıç seviyesi ≥ 24 olan oyuncular (ortalama 56.0 kişi) **+9 takımla başlıyor** — iki kolda da. Bu yapay bir başlangıç koşuludur; gerçek oyundaki erişilebilirliği temsil etmez. Bu yüzden "olgun +9 kohortu" ile "doğal ilerleyen oyuncular" (ortalama 94.0 kişi) ayrı raporlanır.
Kontrol = +9 tavan, v1.1 = +10…+15 açık. Değerler seed ortalamasıdır.

## 1. +13–+15 gerçekten oluşuyor mu? (deney kolu, oyuncu oranı: ekipmanında ≥+n olan)

**Olgun +9 kohortu**

| Gün | ≥+10 | ≥+11 | ≥+12 | ≥+13 | ≥+14 | +15 |
|---|---|---|---|---|---|---|
| 1 | %14.2 | %1.1 | %0.0 | %0.0 | %0.0 | %0.0 |
| 3 | %33.1 | %11.1 | %1.7 | %0.0 | %0.0 | %0.0 |
| 7 | %53.9 | %35.6 | %21.4 | %5.5 | %0.6 | %0.0 |
| 10 | %55.0 | %43.0 | %29.3 | %11.5 | %4.2 | %1.2 |
| 14 | %56.1 | %50.2 | %40.2 | %15.1 | %7.3 | %1.8 |
| 21 | %57.4 | %51.3 | %46.7 | %26.0 | %15.2 | %6.7 |
| 30 | %58.0 | %53.1 | %50.1 | %33.7 | %22.8 | %16.4 |

**Doğal ilerleyen oyuncular**

| Gün | ≥+10 | ≥+11 | ≥+12 | ≥+13 | ≥+14 | +15 |
|---|---|---|---|---|---|---|
| 1 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 3 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 7 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 10 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 14 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 21 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 30 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |

Kontrol kolunda (+9 tavan) ≥+10 oranı tanım gereği %0.

**Deneme ve başarı (deney kolu, seed ortalaması):**

| Hedef | Tasarım şansı | Deneme | Başarı | Gerçek oran | Düşme | Tılsım koruması (≈) |
|---|---|---|---|---|---|---|
| +10 | 40% | 138.7 | 71.7 | %51.7 | 0.0 | — |
| +11 | 32% | 132.7 | 54.3 | %41.0 | 0.0 | — |
| +12 | 25% | 135.3 | 48.7 | %36.0 | 0.0 | — |
| +13 | 18% | 96.7 | 23.7 | %24.5 | 1.3 | 71.7 |
| +14 | 12% | 61.3 | 14.3 | %23.4 | 0.0 | 47.0 |
| +15 | 8% | 57.0 | 10.0 | %17.5 | 0.0 | 47.0 |

- Deneme başına ortalama akçe **58.326**, başarılı yükseltme başına **162.841** · başarısız deneme akçesi 23.27M · demir cevheri 16.124 · Tılsım 213.7 · kitap 584.3.
- Engel kayıtları: bütçe 25.943 · akçe 3.291 · cevher 347 · riskten vazgeçme 10.887.

## 2. Gerçek sink oluşuyor mu?

| Metrik | Kontrol | v1.1 | Fark |
|---|---|---|---|
| Toplam kaynak | 1583.30M | 1573.84M | -0.6% |
| Toplam sink | 1251.80M | 1271.93M | +1.6% |
| Sink/kaynak | %79.1 | %80.8 | +2.3% |
| Net akçe artışı | 331.50M | 301.91M | -8.9% |
| G30 toplam akçe | 352.64M | 323.04M | -8.4% |
| Medyan bakiye | 1011k | 1053k | +4.1% |
| Üst %10 bakiye | 9168k | 8458k | -7.8% |

- **+10…+15 sink / toplam kaynak: %2.3** · **+10…+15 sink / toplam sink: %2.9** (toplam 36.26M).

**İkame (kalem grupları, Kontrol → v1.1):**

| Kalem | Kontrol | v1.1 | Fark |
|---|---|---|---|
| +10…+15 (yeni) | 0.00M | 36.26M | — |
| Kostüm (tezgâh/üretim/efsun/uzatma/görünüm) | 298.90M | 288.84M | -3.4% |
| Şans eşyası | 4.18M | 2.74M | -34.5% |
| Kımız | 748.82M | 744.15M | -0.6% |
| Artı basma (+1…+9) | 150.04M | 149.98M | -0.0% |
| Diğer (beceri, efsun yenileme, üretim, pazar, zindan…) | 49.86M | 49.95M | +0.2% |

- Net sink farkı 20.13M / doğrudan +10…+15 sink 36.26M → ikame/yer değiştirme ≈ **16.13M** (pozitif: diğer harcamalar azaldı).

## 3. Güç yoğunlaşması (oyuncu gücü = saldırı × azami can)

**Tüm nüfus**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 3.13 → 3.45 | 2.57 → 2.85 |
| 10 | 2.67 → 2.90 | 2.27 → 2.40 |
| 14 | 2.13 → 2.56 | 1.82 → 2.03 |
| 21 | 1.84 → 2.41 | 1.58 → 1.84 |
| 30 | 1.73 → 2.40 | 1.49 → 1.75 |

**Olgun +9 kohortu**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 1.75 → 1.76 | 1.52 → 1.61 |
| 10 | 1.60 → 1.67 | 1.40 → 1.48 |
| 14 | 1.57 → 1.79 | 1.37 → 1.49 |
| 21 | 1.55 → 1.90 | 1.35 → 1.55 |
| 30 | 1.50 → 2.06 | 1.31 → 1.62 |

_Üst %1, 150 oyuncuda 1–2 oyuncu (kohortta 1) olduğundan gürültülüdür; üst %10 daha güvenilirdir._

## 4. Combat (son gün ekipmanından / tüm koşudan)

| Metrik | Kontrol | v1.1 | Fark |
|---|---|---|---|
| PvP TTK medyan→medyan (sn) | 23.3 | 25.9 | +11.2% |
| PvP TTK üst %10→medyan (sn) | 19.1 | 18.1 | -5.5% |
| PvP TTK medyan→üst %10 (sn) | 40.8 | 45.2 | +10.8% |
| Boss TTK (sn) | 27.7 | 27.2 | -1.9% |
| Zindan kazanma | %94.6 | %95.1 | +0.5% |
| Ölüm/saat (tüm nüfus) | 0.31 | 0.30 | -5.3% |

## 5. Profil kırılımı (deney kolu, olgun kohort, gün sonu)

| Grup | Oyuncu | Deneme/oyuncu | Düşme/oyuncu | Ort. en yüksek +n | Harcanan akçe/oyuncu |
|---|---|---|---|---|---|
| risk iştahı düşük (<0,33) | 59 | 8.3 | 0.1 | 10.0 | 427.371 |
| risk iştahı orta | 56 | 10.3 | 0.0 | 9.6 | 603.229 |
| risk iştahı yüksek (≥0,67) | 53 | 15.0 | 0.0 | 11.1 | 939.289 |
| bütçe oranı düşük (<0,13) | 53 | 8.1 | 0.1 | 9.4 | 453.323 |
| bütçe oranı orta | 66 | 11.6 | 0.0 | 10.5 | 682.223 |
| bütçe oranı yüksek (≥0,22) | 49 | 13.7 | 0.0 | 10.8 | 810.717 |