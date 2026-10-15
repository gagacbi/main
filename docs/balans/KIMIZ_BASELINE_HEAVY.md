# Harcama modeli doğrulaması ve kilitli profil (Kımız v3 / `baseline_heavy`)

> **Doğrulama kapsamı (bilerek ayrı tutulur):** Kımız *tüketim davranışı* doğrulandı. *Toplam ekonominin* davranışı **kısmen** doğrulandı:
> Kımız dışı harcamalar (kostüm, artı basma, beceri…) hâlâ gelirle birlikte hareket ediyor. Bu belge "ekonomi doğrulandı" demez.

## Modeller

| Model | Anlam |
|---|---|
| `flexible_proportional` | Eski kontrol: harcama bakiye/gelirle orantılı. |
| `baseline_heavy` | Önce aktivitenin zorunlu gideri (Kımız = savaş dk × temel oran, küçük varyans), isteğe bağlı harcama kalandan. Bakiye yetmezse borç yok: eksik loglanır, ajan daha temkinli oynar. Yapay günlük sabit ödeme **yok**. |

## Davranış testi (seed 7, 150 oyuncu, 3 gün, son 2 gün)

Gelir %70/100/130 (oran ayarsız, 0,12): Kımız tüketimi/oyuncu-saat **6,11 → 6,89 → 7,09** (değişim ≈ %16); flexible: 1,32 → 2,01 (≈ %52).
Denenip **atılan** ölçüm yolları: v1 (oran gerçek kullanımdan ölçülür) ve v2 (oran talepten ölçülür) geri besleme nedeniyle gelire bağımlı çıktı (2,8→5,7 ve 4,2→9,5). Kalıcı çözüm: oran **sabit parametre** (`POP_KZ_RATE`).

## Kalibrasyon (`POP_KZ_RATE`)

Stok kısıtı olmadan ölçülen savaş-dakikası başına içme (bol bakiye): normal 0,088 · ağır içerik 0,879 (örnek yalnızca 121 savaş-dk) · ağırlıklı ort. ≈ 0,109. **Seçilen: 0,09.** Flexible modelin tüketimi hedef alınmadı (o model zaten elastik).
Ağır içerik çarpanı **1,3 olarak bırakıldı** (ölçüm ≈ 10×; payı küçük, ekonomi hedefini tutturmak için değiştirilmedi). Gerçek oyuncu verisiyle yeniden kalibre edilecek.

## Kalibre Control / A / B (seed 7, 3 gün, son 2 gün)

| Senaryo | Kaynak | Sink/oyuncu-saat | Sink/kaynak | Kımız tüketimi/saat | Kımız dışı sink/saat |
|---|---|---|---|---|---|
| Control (NPC 0,70 / Mob %100) | 84,0M | 67,3k | %66,0 | 5,38 | 29,6k |
| A (NPC 0,50) | 76,7M (−%8,6) | 63,2k (−%6,1) | %67,5 | 5,28 | 27,4k (−%7,4) |
| B (Mob %85) | 73,7M (−%12,2) | 62,9k (−%6,5) | %70,4 | 5,39 | 26,0k (−%12,2) |

Okuma: Kımız kendi davranışını koruyor; toplam sink "−%2–3" ölçütünü karşılamadı (−%6), çünkü Kımız dışı harcamalar kaynakla orantılı düşüyor. Kaynak azaltımı **uygulanmıyor**.

## Kilitli profil (+10…+15 deneyi için)

| Parametre | Değer |
|---|---|
| `POP_SPEND` | `baseline_heavy` |
| `POP_KZ_RATE` | 0,09 |
| NPC satış / yaratık akçesi | 0,70 / %100 |
| Kımız fiyatı | 0,6 |
| Ağır içerik çarpanı | 1,3 (değişmez) |
| `POP_WEALTH` | 20 (tohum bakiyesi; doğrulama koşularıyla aynı) |

Takip metriği: Kımız eksiği (A/B'de +%27). Tek kısa koşudan "oyuncu deneyimi bozuldu" sonucu çıkarılmıyor.
