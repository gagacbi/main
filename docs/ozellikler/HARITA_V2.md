# Harita v2: büyük dünya ve surlu köy

Oyuncu geri bildirimi: "harita çok küçük, köy merkezi ve yaratıklar iç içe". Ölçü örneği: Metin2'nin 768–1024 m'lik ana haritaları.

## Ölçek

| | v1 | v2 |
|---|---|---|
| Bozkır yarıçapı (`WORLD_R`) | 160 | **480** (alan ×9; 7 m/sn ile kenardan kenara ≈ 2 dk) |
| Köy / güvenli bölge (`HUB_R`) | 36 | **84** (sur yarıçapı 80, meydan 24) |
| Kutlu Otlak | r105 | r170 |
| Erlik Diyarı | r150 | r320 |
| Bozkır kampı | 64 kamp, aralık 21 | **112 kamp**, aralık 44 (yarıçap başına yoğunluk ≈ ⅓) |
| Ağaç / kaya | 260 / 120 | ≈1 200 (%70'i koru kümesi) / 340 |

Seviye mesafesi köy dışından (sv 1) haritanın kenarına (sv 48) doğrusal (`campLevel`, `levelDist`): seviye başına ≈8 m (eskiden 2,5 m). Bosslar, balbal taşları ve çatlaklar aynı ölçeğe taşındı. **Çatlak** bölgedeki bir oyuncunun 90–160 birim çevresinde açılır (büyük haritada keşfedilebilirlik); oyuncu yoksa bölgede rastgele.

## Köy yerleşimi (`HUB`, `genHubObstacles`)

- Merkezde 24 yarıçaplı **taş meydan** (koyu gri kesme taş + kilim halkaları, ateş çukuru, bordür, fenerler).
- Dört yönde (D/B/K/G) **kesme taş yol** surdaki kapılara; kapılardan dışarı 250 birimlik toprak ana yollar (kamp, ağaç, kaya, boss, taş bu şeritten uzak: `roadDist`).
- 80 yarıçaplı **sur** (çarpışmalı, kiremit şeritli, dişli), kapı yanlarında 8 **kule** ve iki katlı kapı kemerleri.
- Mahalleler: Otağ ve Ak Sakal (batı), Demirhane ve Demirci (doğu), stel (kuzey), spawn ve Kapı Taşı (güney); 14 süs yurdu; 6 **pazar tezgâhı** (doğu yol); **Dokuma Tezgâhı** pazar yanında; **gölet** (kum kıyı, taş, nilüfer); sakura (pembe) bahçeler.
- 14 muhafız: iç halka 6 + sur kapılarında 8.

## Düzeltmeler (aynı oturumda)

| Sorun | Neden | Çözüm |
|---|---|---|
| Yeniden doğunca karakter görünmez | Oyuncu görünümü ölümden ~1 sn sonra siliniyor, doğunca geri kurulmuyordu (`dyingT` sıfırlanmıyordu) | Görünüm silinmez; doğunca ölüm durumu sıfırlanır (`tests/perf/revive.ts`) |
| Siyah dev nesneler (kapı, taşlar, tezgâh) | `addOutline` kopyası ana ağın konum/dönüşünü miras alıp ebeveyninkini bir kez daha uyguluyordu | Kontur yerel dönüşümü sıfırlanır |
| Köyde sürekli ölüm | Kırmızı adlı (derece < 0) oyuncuyu muhafızlar saniyede %30 vuruyor; ölünce yine köyde doğuyordu | Kırmızı adlı güvenli bölge dışında doğar; GM ve doğma korumasındakine ateş yok; neden sohbette açıklanır (`tests/integration/guards.test.ts`) |
| Kasma | Dev birleşik ağlar hep çiziliyordu; karakter başına 400 üçgenlik küçük küreler | Parçalama + LOD, küçük kürelerde düşük segment, uzak karakterde kontur kapalı |

Üçgen sayısı (köy görünümü, yaratıksız): 1,02 M → 0,56 M (yeni köy dahil).

## Bilinen / yapılmayan

- Nüfus simülasyonu ekonomi sonuçları **eski haritada** koşuldu. Yürüme mesafesi ×3 olduğu için kamp ziyareti ve gelir dağılımı değişebilir; yeniden kalibrasyon gerekir.
- Haritada hâlâ yalnız ana yollar var; ara yol/nehir/dağ geçidi, ek kasaba ve hızlı yolculuk noktaları yok.
- Gerçek GPU'da FPS ölçülemedi (yazılım rasterleştirme); kanıt üçgen/çizim sayıları.
