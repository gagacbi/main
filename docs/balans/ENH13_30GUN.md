# Endgame Enhancement Economy v1.3 — 30 günlük deney (Simulation Only)

3 seed · 30 gün · 150 oyuncu · kilitli profil (baseline_heavy, KZ 0,09, NPC 0,70, Mob %100, Kımız 0,6) · oranlar 40/32/25/18/12/8 (değiştirilmedi).

> **MATURE_COHORT_ASSUMPTION:** başlangıç seviyesi ≥ 24 olan oyuncular (ortalama 56.0 kişi) **+9 takımla başlıyor** — iki kolda da. Bu yapay bir başlangıç koşuludur; gerçek oyundaki erişilebilirliği temsil etmez. Bu yüzden "olgun +9 kohortu" ile "doğal ilerleyen oyuncular" (ortalama 94.0 kişi) ayrı raporlanır.
Kontrol = +9 tavan, v1.3 = +10…+15 açık. Değerler seed ortalamasıdır.

## 1. +13–+15 gerçekten oluşuyor mu? (deney kolu, oyuncu oranı: ekipmanında ≥+n olan)

**Olgun +9 kohortu**

| Gün | ≥+10 | ≥+11 | ≥+12 | ≥+13 | ≥+14 | +15 |
|---|---|---|---|---|---|---|
| 1 | %7.7 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 3 | %25.5 | %6.5 | %0.0 | %0.0 | %0.0 | %0.0 |
| 7 | %43.8 | %17.5 | %7.3 | %0.0 | %0.0 | %0.0 |
| 10 | %41.9 | %28.9 | %12.5 | %1.8 | %0.7 | %0.0 |
| 14 | %45.0 | %34.5 | %21.7 | %8.5 | %1.9 | %0.0 |
| 21 | %48.0 | %40.8 | %30.6 | %18.7 | %6.0 | %0.7 |
| 30 | %49.1 | %44.3 | %36.0 | %26.5 | %13.4 | %3.0 |

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

**Doğal ilerleyenlerin erişimi (30. gün, ekipmanında ≥+n olan oran; Kontrol / deney):**

| ≥+5 | ≥+6 | ≥+7 | ≥+8 | ≥+9 |
|---|---|---|---|---|
| %56.0 / %56.7 | %38.9 / %38.5 | %1.8 / %1.4 | %0.3 / %0.0 | %0.3 / %0.0 |

**Deneme ve başarı (deney kolu, seed ortalaması):**

| Hedef | Tasarım şansı | Deneme | Başarı | Gerçek oran | Düşme | Tılsım koruması (≈) |
|---|---|---|---|---|---|---|
| +10 | 40% | 178.0 | 68.7 | %38.6 | 0.0 | — |
| +11 | 32% | 150.0 | 46.3 | %30.9 | 0.0 | — |
| +12 | 25% | 118.0 | 30.7 | %26.0 | 0.0 | — |
| +13 | 18% | 93.0 | 17.3 | %18.6 | 0.0 | 75.7 |
| +14 | 12% | 47.7 | 7.3 | %15.4 | 0.0 | 40.3 |
| +15 | 8% | 26.7 | 1.7 | %6.3 | 0.0 | 25.0 |

- Deneme başına ortalama akçe **96.149**, başarılı yükseltme başına **342.857** · başarısız deneme akçesi 42.43M · demir cevheri 15.471 · Tılsım 0.0 · kitap 0.0.
- Koruma eşyası: olgun kohortta gün sonu stok/oyuncu — Tılsım 749.4 (K) → 625.8, kitap 1401.3 (K) → 1466.4; sunucunun reddettiği deneme (ör. günlük sınır) 640.
- Engel kayıtları: bütçe 35.013 · akçe 3.066 · cevher 325 · riskten vazgeçme 0.

## 2. Gerçek sink oluşuyor mu?

| Metrik | Kontrol | v1.3 | Fark |
|---|---|---|---|
| Toplam kaynak | 1583.30M | 1564.09M | -1.2% |
| Toplam sink | 1251.80M | 1287.34M | +2.8% |
| Sink/kaynak | %79.1 | %82.3 | +4.1% |
| Net akçe artışı | 331.50M | 276.75M | -16.5% |
| G30 toplam akçe | 352.64M | 297.88M | -15.5% |
| Medyan bakiye | 1011k | 950k | -6.0% |
| Üst %10 bakiye | 9168k | 8043k | -12.3% |

- **+10…+15 sink / toplam kaynak: %3.8** · **+10…+15 sink / toplam sink: %4.6** (toplam 58.97M).

**İkame (kalem grupları, Kontrol → v1.3):**

| Kalem | Kontrol | v1.3 | Fark |
|---|---|---|---|
| +10…+15 (yeni) | 0.00M | 58.97M | — |
| Kostüm (tezgâh/üretim/efsun/uzatma/görünüm) | 298.90M | 280.72M | -6.1% |
| Şans eşyası | 4.18M | 3.18M | -24.1% |
| Kımız | 748.82M | 745.63M | -0.4% |
| Artı basma (+1…+9) | 150.04M | 149.46M | -0.4% |
| Diğer (beceri, efsun yenileme, üretim, pazar, zindan…) | 49.86M | 49.38M | -0.9% |

- Net sink farkı 35.54M / doğrudan +10…+15 sink 58.97M → ikame/yer değiştirme ≈ **23.43M** (pozitif: diğer harcamalar azaldı).

## 3. Güç yoğunlaşması (oyuncu gücü = saldırı × azami can)

**Tüm nüfus**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 3.13 → 3.36 | 2.57 → 2.69 |
| 10 | 2.67 → 2.74 | 2.27 → 2.23 |
| 14 | 2.13 → 2.29 | 1.82 → 1.89 |
| 21 | 1.84 → 2.01 | 1.58 → 1.66 |
| 30 | 1.73 → 1.86 | 1.49 → 1.56 |

**Olgun +9 kohortu**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 1.75 → 1.87 | 1.52 → 1.55 |
| 10 | 1.60 → 1.65 | 1.40 → 1.41 |
| 14 | 1.57 → 1.64 | 1.37 → 1.40 |
| 21 | 1.55 → 1.68 | 1.35 → 1.40 |
| 30 | 1.50 → 1.65 | 1.31 → 1.41 |

_Üst %1, 150 oyuncuda 1–2 oyuncu (kohortta 1) olduğundan gürültülüdür; üst %10 daha güvenilirdir._

## 4. Combat (son gün ekipmanından / tüm koşudan)

| Metrik | Kontrol | v1.3 | Fark |
|---|---|---|---|
| PvP TTK orta bant→orta bant (sn) | 31.2 | 31.0 | -0.7% |
| PvP TTK üst %10→orta bant (sn) | 23.9 | 23.2 | -2.8% |
| PvP TTK orta bant→üst %10 (sn) | 43.5 | 41.5 | -4.5% |
| Boss TTK (sn) | 27.7 | 27.4 | -0.9% |
| Zindan kazanma | %94.6 | %95.3 | +0.8% |
| Ölüm/saat (tüm nüfus) | 0.31 | 0.31 | -2.9% |

## 5. Profil kırılımı (deney kolu, olgun kohort, gün sonu)

| Grup | Oyuncu | Deneme/oyuncu | Düşme/oyuncu | Ort. en yüksek +n | Harcanan akçe/oyuncu |
|---|---|---|---|---|---|
| risk iştahı düşük (<0,33) | 59 | 10.1 | 0.0 | 9.2 | 940.728 |
| risk iştahı orta | 56 | 10.0 | 0.0 | 8.9 | 938.802 |
| risk iştahı yüksek (≥0,67) | 53 | 12.9 | 0.0 | 9.8 | 1.298.840 |
| bütçe oranı düşük (<0,13) | 53 | 7.6 | 0.0 | 8.6 | 644.844 |
| bütçe oranı orta | 66 | 11.6 | 0.0 | 9.4 | 1.167.701 |
| bütçe oranı yüksek (≥0,22) | 49 | 13.7 | 0.0 | 9.9 | 1.340.192 |