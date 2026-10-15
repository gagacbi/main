# Endgame Enhancement Economy v1.2 — 30 günlük deney (Simulation Only)

3 seed · 30 gün · 150 oyuncu · kilitli profil (baseline_heavy, KZ 0,09, NPC 0,70, Mob %100, Kımız 0,6) · oranlar 40/32/25/18/12/8 (değiştirilmedi).

> **MATURE_COHORT_ASSUMPTION:** başlangıç seviyesi ≥ 24 olan oyuncular (ortalama 56.0 kişi) **+9 takımla başlıyor** — iki kolda da. Bu yapay bir başlangıç koşuludur; gerçek oyundaki erişilebilirliği temsil etmez. Bu yüzden "olgun +9 kohortu" ile "doğal ilerleyen oyuncular" (ortalama 94.0 kişi) ayrı raporlanır.
Kontrol = +9 tavan, v1.2 = +10…+15 açık. Değerler seed ortalamasıdır.

## 1. +13–+15 gerçekten oluşuyor mu? (deney kolu, oyuncu oranı: ekipmanında ≥+n olan)

**Olgun +9 kohortu**

| Gün | ≥+10 | ≥+11 | ≥+12 | ≥+13 | ≥+14 | +15 |
|---|---|---|---|---|---|---|
| 1 | %12.7 | %0.0 | %0.0 | %0.0 | %0.0 | %0.0 |
| 3 | %28.9 | %7.7 | %1.2 | %0.0 | %0.0 | %0.0 |
| 7 | %48.9 | %25.0 | %7.1 | %0.0 | %0.0 | %0.0 |
| 10 | %52.1 | %34.0 | %14.9 | %0.6 | %0.0 | %0.0 |
| 14 | %53.2 | %43.1 | %28.7 | %1.1 | %0.0 | %0.0 |
| 21 | %55.1 | %49.6 | %39.6 | %8.5 | %0.0 | %0.0 |
| 30 | %58.1 | %52.6 | %43.8 | %15.0 | %4.8 | %0.0 |

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
| %56.0 / %54.9 | %38.9 / %38.5 | %1.8 / %1.4 | %0.3 / %0.0 | %0.3 / %0.0 |

**Deneme ve başarı (deney kolu, seed ortalaması):**

| Hedef | Tasarım şansı | Deneme | Başarı | Gerçek oran | Düşme | Tılsım koruması (≈) |
|---|---|---|---|---|---|---|
| +10 | 40% | 176.0 | 76.0 | %43.2 | 0.0 | — |
| +11 | 32% | 176.0 | 55.0 | %31.3 | 0.0 | — |
| +12 | 25% | 153.7 | 38.7 | %25.2 | 0.0 | — |
| +13 | 18% | 62.7 | 9.0 | %14.4 | 0.0 | 53.7 |
| +14 | 12% | 20.0 | 2.7 | %13.3 | 0.0 | 17.3 |
| +15 | 8% | 4.3 | 0.0 | %0.0 | 0.0 | 4.3 |

- Deneme başına ortalama akçe **78.129**, başarılı yükseltme başına **255.356** · başarısız deneme akçesi 32.14M · demir cevheri 14.585 · Tılsım 87.0 · kitap 561.7.
- Koruma eşyası: olgun kohortta gün sonu stok/oyuncu — Tılsım 749.4 (K) → 707.1, kitap 1401.3 (K) → 1271.4; sunucunun reddettiği deneme (ör. günlük sınır) 437.
- Engel kayıtları: bütçe 33.963 · akçe 3.441 · cevher 330 · riskten vazgeçme 5.568.

## 2. Gerçek sink oluşuyor mu?

| Metrik | Kontrol | v1.2 | Fark |
|---|---|---|---|
| Toplam kaynak | 1583.30M | 1549.58M | -2.1% |
| Toplam sink | 1251.80M | 1261.54M | +0.8% |
| Sink/kaynak | %79.1 | %81.4 | +3.0% |
| Net akçe artışı | 331.50M | 288.04M | -13.1% |
| G30 toplam akçe | 352.64M | 309.17M | -12.3% |
| Medyan bakiye | 1011k | 1033k | +2.2% |
| Üst %10 bakiye | 9168k | 8410k | -8.3% |

- **+10…+15 sink / toplam kaynak: %3.0** · **+10…+15 sink / toplam sink: %3.7** (toplam 46.30M).

**İkame (kalem grupları, Kontrol → v1.2):**

| Kalem | Kontrol | v1.2 | Fark |
|---|---|---|---|
| +10…+15 (yeni) | 0.00M | 46.30M | — |
| Kostüm (tezgâh/üretim/efsun/uzatma/görünüm) | 298.90M | 274.56M | -8.1% |
| Şans eşyası | 4.18M | 3.55M | -15.2% |
| Kımız | 748.82M | 739.26M | -1.3% |
| Artı basma (+1…+9) | 150.04M | 148.08M | -1.3% |
| Diğer (beceri, efsun yenileme, üretim, pazar, zindan…) | 49.86M | 49.78M | -0.1% |

- Net sink farkı 9.74M / doğrudan +10…+15 sink 46.30M → ikame/yer değiştirme ≈ **36.57M** (pozitif: diğer harcamalar azaldı).

## 3. Güç yoğunlaşması (oyuncu gücü = saldırı × azami can)

**Tüm nüfus**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 3.13 → 3.48 | 2.57 → 2.78 |
| 10 | 2.67 → 2.97 | 2.27 → 2.41 |
| 14 | 2.13 → 2.38 | 1.82 → 1.97 |
| 21 | 1.84 → 2.10 | 1.58 → 1.71 |
| 30 | 1.73 → 2.04 | 1.49 → 1.62 |

**Olgun +9 kohortu**

| Gün | Üst %1 / medyan (K → v1.1) | Üst %10 / medyan (K → v1.1) |
|---|---|---|
| 7 | 1.75 → 1.84 | 1.52 → 1.59 |
| 10 | 1.60 → 1.64 | 1.40 → 1.43 |
| 14 | 1.57 → 1.65 | 1.37 → 1.46 |
| 21 | 1.55 → 1.75 | 1.35 → 1.51 |
| 30 | 1.50 → 1.83 | 1.31 → 1.53 |

_Üst %1, 150 oyuncuda 1–2 oyuncu (kohortta 1) olduğundan gürültülüdür; üst %10 daha güvenilirdir._

## 4. Combat (son gün ekipmanından / tüm koşudan)

| Metrik | Kontrol | v1.2 | Fark |
|---|---|---|---|
| PvP TTK orta bant→orta bant (sn) | 31.2 | 32.5 | +4.5% |
| PvP TTK üst %10→orta bant (sn) | 23.9 | 23.6 | -1.0% |
| PvP TTK orta bant→üst %10 (sn) | 43.5 | 42.1 | -3.2% |
| Boss TTK (sn) | 27.7 | 27.2 | -1.7% |
| Zindan kazanma | %94.6 | %94.6 | +0.0% |
| Ölüm/saat (tüm nüfus) | 0.31 | 0.29 | -8.6% |

## 5. Profil kırılımı (deney kolu, olgun kohort, gün sonu)

| Grup | Oyuncu | Deneme/oyuncu | Düşme/oyuncu | Ort. en yüksek +n | Harcanan akçe/oyuncu |
|---|---|---|---|---|---|
| risk iştahı düşük (<0,33) | 59 | 9.6 | 0.0 | 9.4 | 633.795 |
| risk iştahı orta | 56 | 9.6 | 0.0 | 9.1 | 760.510 |
| risk iştahı yüksek (≥0,67) | 53 | 12.7 | 0.0 | 10.2 | 1.111.905 |
| bütçe oranı düşük (<0,13) | 53 | 7.2 | 0.0 | 9.1 | 532.304 |
| bütçe oranı orta | 66 | 10.5 | 0.0 | 9.6 | 865.777 |
| bütçe oranı yüksek (≥0,22) | 49 | 14.4 | 0.0 | 10.0 | 1.093.063 |