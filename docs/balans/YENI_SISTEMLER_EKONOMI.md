# Yeni sistemlerin ekonomi doğrulaması (A/B nüfus simülasyonu)

> **Kapsam (dürüst):** Bu belge, son turda eklenen sistemlerin (Göl Avı, Günlük, Element, ek yuva düşüşleri, Kut Taşları, sürü/Sürü Başı, boss anahtarı + sandık, yoldaş evrimi, Alp Rehberi) **bot nüfus simülasyonundaki** ekonomik etkisini ölçer. Kımız `baseline_heavy` kilidi ve "Kımız tüketim davranışı doğrulandı; toplam ekonomi kısmen doğrulandı" ifadesi aynen geçerlidir. Simülasyon gerçek oyuncu davranışı değildir; talep tarafı (balığı kim alır, buf değeri) ve oyuncu önceliklendirmesi **model varsayımıdır**.

## Yöntem
- **Gerçek kod:** dünya, DB, RPC'ler, savaş, ganimet, pazar, Oba aynen çalışır (`tests/sim/population/`); ajanlar yeni sistemleri **gerçek RPC'lerle** kullanır (`newsys.ts`).
- **A/B:** `FEATURES` bayrakları (shared/game.ts) yeni sistemlerin hepsini kodu değiştirmeden kapatır = **kontrol kolu**. Aynı tohum, aynı nüfus (balık botu arketipi iki kolda da çıkarılır: `POP_NOBOT=1`), aynı Kımız profili.
- **Korunum denetimi:** her gün `Δarz = kaynak − sink` muhasebesi tutulur; artık (`resid`) **0** çıktı → hiçbir akçe akışı ledger dışında kalmadı.
- **Kapsam:** 120 oyuncu · 14 gün · dilim 8 dk · 3 tohum (51, 52, 53) × 2 kol.
- **Ajan modeli (varsayım):** isteğe bağlı güç harcaması (Kut Taşı + element + evrim) günlük akçesinin %5–30'u × 1,5 ile sınırlıdır (v1.1 deneyindeki `upBudget`); balık payı arketipe göre günlük dakikanın %2–25'i; buf tüketicileri balığı pazardan ref×1,6'ya kadar öder.

## Simülasyonun bulduğu sorunlar ve düzeltmeleri (denetim günlüğü)
| # | Bulgu (ölçüm) | Düzeltme |
|---|---|---|
| 1 | **Sürü Başı ödülü fazla cömertti**: NPC satışı +%112, toplam kaynak +%39 (60 oyuncu, 3 gün). Sebep: Sürü Başı öldürmelerin %15,4'ü ve eşya şansı %60. | XP ×2,5→×1,8; akçe ×2→×1,5; eşya şansı %60→%12; Kut Taşı %25→%4; HP ×1,8→×1,4. Efor başına ödül ≤ ×1,35 (korkuluk testi). |
| 2 | **Ek yuva düşüşü** NPC satışını +%33 artırdı (eşya akışı). | Düşüş şansı %2,8 → %1,0. |
| 3 | **Kut Taşı saflaştırma toplam sinkin %35'ini yuttu** (14,3M/gün; 150 oyuncuda); bir Kutlu taş zinciri 222 birimdi (~200 saatlik gelir) ve 14 günde hiç kimse Parlak sınıfa çıkamadı. | Maliyet çarpanları ÷8 ([2,6,16,40]→[0,25; 0,75; 2; 5]); zincir ≈ 28 birim; sink %2–6 bandına indi. |
| 4 | **Sürü, acemi bölgesinde yeni oyuncuyu cezalandırdı** (Yeni başlayan ölüm/sa +%44). | Kutlu Otlak'ta sürü çağrısı ve Sürü Başı yok. |
| 5 | **Balıkçılık botu**: sunucu vuruşu doğrulayamaz; en kısa çevrim 2,5 sn (≈ 1400 atış/sa). | `minReelSec` 2,5→4 sn; günlük 200 yakalamadan sonra tutma şansı ×0,4 (yorgunluk). Üst sınır testli. |
| 6 | **Balık pazarı talep yok**: 7225 balık listelendi, 28'i satıldı; bot yem parası bulamayıp durdu. | Tasarım gereği: balık akçe üretmez (kapalı döngü); bot kâr edemiyor. Parti boyutu küçültüldü (4/1). |
| 7 | Ölüm oranı ölçeklenen (dilim dışı) dakikalarda, tek kötü dilimin oranı ×60 büyütüldüğü için yapay şişiyor. | Raporda **gerçek (dilim içi) ölüm/1000 öldürme** ayrıca verilir. |
| 8 | Harness: Alp Avı ve günlük kill ilerlemesi ölçeklenen dakikalarda işlenmiyordu. | `killEquivalent` artık `huntKill` + `daily('kill')` çağırır (iki kolda da). |

## 2. Sonuç: kontrol ↔ yeni sistemler (son 7 gün ortalaması, [min–max] tohum aralığı)

| Metrik | Kontrol | Yeni sistemler | Fark |
|---|---|---|---|
| Akçe kaynağı / gün | 27.46M [26.89M–28.33M] | 31.61M [30.47M–33.87M] | +15.1% |
| Akçe sink / gün | 23.42M [22.86M–24.28M] | 27.91M [26.60M–29.99M] | +19.2% |
| Sink / kaynak | %85.3 [%85.0–%85.7] | %88.3 [%87.3–%89.1] | +3.6% |
| Net arz artışı / gün | 4.04M [4.03M–4.05M] | 3.69M [3.32M–3.88M] | -8.6% |
| Toplam arz (son gün) | 46.01M [44.84M–47.91M] | 48.78M [46.81M–52.55M] | +6.0% |
| Medyan bakiye (son gün) | 0.26M [0.24M–0.28M] | 0.31M [0.29M–0.35M] | +20.0% |
| Üst %10 bakiye | 0.83M [0.77M–0.86M] | 0.87M [0.81M–0.96M] | +5.7% |
| Gini (son gün) | 0.58 [0.54–0.64] | 0.49 [0.45–0.55] | -15.0% |
| Muhasebe artığı (korunum denetimi, mutlak) | 0 [0–0] | 0 [0–0] | — |

### İlerleme ve güç

| Metrik | Kontrol | Yeni sistemler | Fark |
|---|---|---|---|
| Ortalama seviye (gün 7) | 35.1 [34.9–35.3] | 36.6 [36.0–37.8] | +4.2% |
| Ortalama seviye (son gün) | 41.0 [40.8–41.0] | 42.8 [42.1–43.5] | +4.4% |
| Ölüm / oyuncu-saat | 0.37 [0.21–0.48] | 0.22 [0.19–0.26] | -40.5% |
| Yaratık öldürme / oyuncu-saat | 1186.6 [1154.1–1227.3] | 1204.2 [1152.2–1244.1] | +1.5% |
| Gerçek (dilim içi) ölüm / 1000 öldürme — sürü etkisi | 0.89 [0.43–1.26] | 0.67 [0.52–0.96] | -23.8% |
| Yaratık akçesi / öldürme (son 7 gün) | 38.4 [37.9–39.0] | 42.0 [41.5–42.8] | +9.4% |
| NPC satışı / öldürme (eşya akışı, son 7 gün) | 14.0 [13.5–14.4] | 16.5 [16.1–16.9] | +17.8% |
| Seviye ilerlemesi / gün (ortalama) | 1.29 [1.22–1.35] | 1.42 [1.39–1.47] | +10.3% |
| Ort. net değer (son gün) | 0.39M [0.38M–0.40M] | 0.41M [0.40M–0.44M] | +6.3% |
| Yok olan eşya (toplam) | 118 [86–159] | 135 [105–181] | +14.7% |
| Kımız sink / gün | 17.34M [16.31M–18.54M] | 14.38M [13.45M–15.53M] | -17.1% |

### Yeni akış kalemleri (M/gün, son 7 gün; yeni kolda)

| Kalem | Tür | Akçe / gün | Toplam kaynağa / sinke oranı |
|---|---|---|---|
| sandık | kaynak | 5.9k | %0.02 |
| Kut Taşı saflaştırma | sink | 4.82M | %17.26 |
| element yazısı | sink | 65.6k | %0.24 |
| yoldaş evrimi | sink | 1.16M | %4.16 |
| balık: olta/yem | sink | 0.13M | %0.45 |
| balık: olta geliştirme | sink | 64.0k | %0.23 |

### Benimseme (toplam, yeni kolda, tohum ortalaması)

| Davranış | Değer |
|---|---|
| Kut Taşı takma | 798.0 |
| Kut Taşı saflaştırma (deneme) | 7526.7 |
| … başarılı | 5070.3 |
| Taş kırılması (çıkarma/değiştirme) | 108.7 |
| Sandık açma | 148.3 |
| … bronz / gümüş / altın | 14.0 / 31.7 / 102.7 |
| Yoldaş evrimi | 121.0 |
| Element ekleme | 3.0 |
| Element yükseltme (deneme) | 29.7 |
| Balık atışı (insan) | 129180.7 |
| Balık atışı (bot) | 0.0 |
| Balık yakalama (insan) | 96251.3 |
| Balık yakalama (bot) | 0.0 |
| Pazarda listelenen balık | 5644.0 |
| Pazardan alınan balık | 3.3 |
| Yenen balık (oturum başı) | 1003.0 |
| Yenen balık (ölçeklenen dk) | 3649.3 |
| Son gün: takılı Kut Taşı yuvası (oyuncu başı) | 3.62 / 6 |
| Son gün: en yüksek takılı sınıf ≥ Parlak(2) olan oyuncu | 42.5% |
| Son gün: evrim aşaması ≥1 yoldaşı olan oyuncu | 23.9% |

### Balıkçılık getirisi (insan ve bot)

| Grup | Balık-saat | Atış/saat | Yakalama/saat | Tutma oranı | Referans değer/saat (akçe, ref fiyatla) |
|---|---|---|---|---|---|
| İnsan (balık payı olan) | 1085.8 | 356.9 | 265.9 | %74.5 | 22.7k |
| Bot (makro, 3/3 vuruş) | 0.0 | 0.0 | 0.0 | %0.0 | 0 |

Pazarda balık satışı: 0.2 işlem/gün, 170 akçe/gün hacim · Dönem sonu satılmamış balık stoğu (nüfus toplamı): 90.2k adet.

Karşılaştırma — yaratık akçesi / oyuncu-saat (ort., botsuz; kontrol / yeni): 36.9k / 40.0k.

### Arketip bazında seviye kazancı ve ölüm (yeni sistemler kolu, kontrole oranla)

| Arketip | Seviye/gün (kontrol → yeni) | Ölüm/saat (kontrol → yeni) | Bakiye medyanı son gün (kontrol → yeni) |
|---|---|---|---|
| Yeni başlayan | 1.52 → 1.67 | 0.64 → 0.35 | 32.3k → 74.1k |
| Gündelik oyuncu | 1.36 → 1.49 | 0.21 → 0.21 | 0.33M → 0.40M |
| Oba / sosyal | 1.10 → 1.46 | 0.14 → 0.10 | 0.28M → 0.40M |
| Çekirdek farmcı | 1.50 → 1.61 | 0.16 → 0.12 | 0.79M → 0.68M |
| Tüccar / zanaatkâr | 0.99 → 1.04 | 0.08 → 0.06 | 3.7k → 4.5k |
| Boss avcısı | 1.20 → 1.21 | 0.16 → 0.17 | 0.48M → 0.65M |
| PvP avcısı | 1.12 → 1.27 | 2.44 → 1.02 | 0.45M → 0.41M |
| Sürü izleyen | 1.48 → 1.70 | 0.19 → 0.24 | 0.40M → 0.52M |
| Çatlak avcısı | 1.22 → 1.36 | 0.16 → 0.15 | 0.68M → 0.57M |
| Savunma teorisyeni | 1.17 → 1.36 | 0.14 → 0.14 | 0.40M → 0.55M |


## 3. Ayar geçmişi (aynı kontrol kolu, tohum ortalaması)
| Sürüm | Kaynak/gün | Sink/gün | Sink/kaynak | NPC satışı/öldürme | Toplam sinkte Kut Taşı |
|---|---|---|---|---|---|
| v1 (ilk hâl; 150 oyuncu, 2 tohum) | +%1 | **+%21** | %78 → **%93** | +%26 | **%35** |
| v2 (Kut Taşı ÷8, bütçe; 3 tohum) | +%14,7 | +%18,7 | %85,3 → 88,3 | +%30,8 | %16,9 |
| **v3 (yayımlanan: eşya şansı kısıldı; 3 tohum)** | **+%15,1** | **+%19,2** | **%85,3 → 88,3** | **+%17,8** | **%17,3** |

v1 ve v2/v3 farklı nüfus büyüklüğüyle koşuldu (150/120 oyuncu); kıyas her kolun kendi kontrolüne göredir.

## 4. Sömürü sınaması: balıkçı botu
`POP_ONLY=balikci`, 20 bot, 6 gün, tüm sistemler açık (kontrolde bot normal farm yapar):
- Bot 1518 atış / 1261 yakalama yaptı (≈ 105 dk — yem parası bitince durdu); **94 ilan, 0 satış**; medyan akçe 4. Balık talep olmadan akçeye dönmez: botun kendini finanse etmesi imkânsız. Kontrolde aynı arketip farm yaparak 6 günde medyan akçesini 114k → 1,17M'ye çıkardı.
- Talep varsayımı karşıtı (what-if): referans fiyattan sınırsız alıcı olsaydı bot saatte ≈ 630 yakalama × ≈ 100 akçe ≈ 63k akçe/sa üretirdi (normal farm ≈ 40k/sa). Bu yüzden: `minReelSec` 4 sn, günlük 200 yakalamadan sonra şans ×0,4 (24 saatlik makro günde ≈ 6k yakalama ile sınırlı). **Gelecekte balığı NPC'ye satılabilir yapmak bu denetimi geçersiz kılar; önce yeniden simüle edilmeli.**

## 5. Analitik korkuluklar (tests/unit/newsys-balance.test.ts)
Ham taş/saat ve süre (Kut Taşı), efor başına ödül (Sürü Başı ≤ ×1,35), sandık akçesi, balık bot üst sınırı, evrim bedeli, Günlük/Rehber ödülü, **canlıda tüm bayrakların açık olması**: sabitler bu bantların dışına çıkarsa test düşer.

## 6. Bilinen sınırlar (açıkça)
1. **Talep modeli varsayımdır**: balık alıcıları (buf tüketicileri) ve hepsinin akçe önceliği (güç harcaması bütçesi %5–30 × 1,5) ölçülmüş oyuncu davranışı değildir; Kut Taşı sinki (%17) bu bütçeye bağlı üst sınırdır.
2. **Kut Taşı hız**: 14 günde oyuncuların %42,5'i Parlak (2) ve %9,4'ü Kutlu (3) sınıfı taşı takabildi; Ulu (4) hiç. Bilinçli uzun vade; gerçek oyuncuyla doğrulanmadı.
3. **İlerleme +%10/gün**: büyük kısmı Günlük XP ödülünden (%12 × görev) ve Sürü Başı XP'sinden; ayrı ayrı ölçülmedi (yalnızca toplam). İlk canlı geri bildirimde `DAILY.xpPct` kısılabilir.
4. **Element** çok az kullanıldı (3 ekleme): +7 silah koşulu ajanlarda nadir; sink etkisi ölçülemedi.
5. **Sandık yolculuğu** modellenmedi (ajan sandığa ışınlanır); sandık akçesi önemsiz (%0,02) ama eşya/Kut Taşı/parça girişi sayıldı.
6. **Sürü çağrısı botlarda "çekme" yapılamadığı için ceza ölçümü yukarı yönlü yanlı** (insan çekerek daha az ölür). Güç sistemleri (Kut Taşı, evrim) ölümü azalttığı için net ölüm azaldı (−%24); yalnızca sürü kolu (diğerleri kapalı) +%34 ölüm üretiyordu.
7. Pazar fiyat dinamiği (fiyat çöküşü) modellenmedi; eşya akışı +%18 pazara baskı yapar.
8. Korunum artığı 0 olsa da bu, akışların **ledger'a doğru yazıldığını** kanıtlar, davranış gerçekliğini değil.

## 7. Yeniden koşmak için
```
# kontrol
POP_CONTROL=1 POP_NOBOT=1 POP_N=120 POP_DAYS=14 POP_W=8 POP_SEED=51 POP_SPEND=baseline_heavy POP_KZ_RATE=0.09 POP_OUT=/tmp/ab/ctrl npx tsx tests/sim/population/run.ts
# yeni sistemler
POP_NOBOT=1 POP_N=120 POP_DAYS=14 POP_W=8 POP_SEED=51 POP_SPEND=baseline_heavy POP_KZ_RATE=0.09 POP_OUT=/tmp/ab/new npx tsx tests/sim/population/run.ts
# rapor
CTRL="/tmp/ab/ctrl" NEW="/tmp/ab/new" npx tsx tests/sim/population/newsys-report.ts docs/balans/YENI_SISTEMLER_EKONOMI.rapor.md
```
Tek sistem ablasyonu: `POP_OFF=kt,packs,...` (bayraklar: daily, extraDrops, kt, packs, chest, evo, fish, element). Sürü sabitleri: `POP_PACK="cakal=12,alphaHp=1.4,..."`.
