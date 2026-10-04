# KUT — Teslim Raporu

Tarih: {{TARIH}} · Sürüm: 0.1 (PRD §14 Aşama 2 — **Prototip**) · Dal: `claude/bold-mendel-d9as4v`

## 1. Sonuç

{{DURUM}}

PRD'de ayrı bir "kabul kriterleri" bölümü yoktur; kriterler PRD §14 Aşama 2 kapı koşulundan ve PRD'nin ölçülebilir ifadelerinden
türetilip [`ACCEPTANCE.md`](ACCEPTANCE.md) olarak yazılmıştır. Aşağıdaki tablo her kriteri **çalıştırılmış** kanıta bağlar.
Tablo elle yazılmış değildir: `scripts/make-report.ts` her satırdaki testin/kontrolün gerçekten **geçtiğini** ve ekran görüntüsünün var olduğunu
doğrular; bir satır kanıtsızsa betik hata verir ve bu rapor "tamam" demez.

* Birim + sunucu entegrasyon testleri: **{{TESTLER}}** geçti (gerçek Colyseus sunucusu, gerçek SQLite, gerçek istemci protokolü).
* Tarayıcı uçtan uca kontrolleri: **{{E2E}}** geçti (gerçek Chromium, üretim derlemesi, gerçek sunucu).
* Çalıştırma: [`README.md`](../README.md).

## 2. Ne yapıldı

Sıfırdan, bu klasörde, PRD'nin mimarisiyle (Babylon.js + TypeScript + Vite istemci; Node.js + Colyseus sunucu) oynanabilir bir 3D MMORPG prototipi:

* **Dünya:** kilim desenli plazalı Boy Yurdu (güvenli) + Yazık Bozkır (riskli; Erlik'e yaklaştıkça mor-kızıl çatlaklı); ağaçlar, kayalar, çiçekler,
  otağ/yurtlar, demirhane, yazıt taşı, üç boyun bayrağı, muhafız postları, gece mavisi→altın ufuk gökyüzü, dağlar, bulutlar.
* **Savaş (Alp):** basılı tutarak otomatik seri vuruş, 6 yetenek (alan hasarı, sersemletme, **Çağrı Narası ile yaratık toplama**, kalkan, zehir, ulu vuruş),
  M1→P kademeleri, seviye 10'da Kalkan Alp / Kılıç Alp, 5 durum etkisi, kritik, can çalma, ganimet yağmuru.
* **Yaratıklar:** Tepegöz yavrusu, Albastı, Erlik çırağı, kara çakal ve Çatlak Bekçisi; her biri ayrı siluette ve animasyonlu; kamp/aggro/leash YZ'si.
* **Erlik çatlakları:** rastgele açılır, üç dalga + bekçi, yakındaki oyuncu sayısı/seviyesine ölçeklenir, otomatik katılım, garanti nadir+ ganimet.
* **Boylar / PvP / derece:** Gök-Yer-Ay (pasif bonus, renk kimliği), güvenli bölgede PvP yok (düello hariç), riskli bölgede açık, derece/kırmızı ad/muhafız.
* **İlerleme ve eşya:** 50 seviye (her 10'da duvar), Kut puanı, dinlenmiş deneyim, 4 kademe eşya + efsun, **+0→+9 artı basma** (PRD oranları arayüzde), demirci el kitabı, koruma tılsımı, üretim.
* **Oba:** acemi oymak + NPC ak sakal öğretici, Otağ + Demirhane, ortak ambar, bağış → katılım puanı, üretim paylaşımı, **çevrimdışı ilerleyen** yükseltmeler,
  yoldaş seferleri (1/4/12 sa), **Kayıp Yazıtlar** (sunucu çapı parça sayacı + yazıt çözme).
* **Sunucu:** yetkili hareket/savaş/ekonomi, hız sınırlama, scrypt parola, `ledger` kayıt defteri, SQLite kalıcılığı, katmanlama, oymak yönlendirme.
* **Görsel/ses/arayüz:** özel toon shader (bantlı ışık, serin gölge, kenar parlaması, sis) + ters-gövde kontur, bloom/MSAA, parçacık/halka/ışın efektleri;
  keçe-deri-kilim temalı arayüz, tamga ikonları, mini harita, Türkçe/İngilizce; WebAudio ile üretilmiş kopuz/davul/höömey esintili müzik ve efekt sesleri.
  Dış asset yoktur: tüm modeller, dokular, ikonlar ve sesler kodla üretilir.

## 3. Kabul kriterleri ve kanıtları

| # | Kriter | Durum | Kanıt |
|---|---|---|---|
{{TABLO}}

## 4. Ölçümler

* **Paket boyutu (A10):** {{BOYUT}}. PRD hedefi 50 MB altı.
* **Sunucu (A9):** tablodaki A9 satırı; 10 eşzamanlı istemci, 20 Hz tick.
* **Performans (F7):** {{PERF}}. Ortamda GPU yoktur; ekran görüntüleri ve FPS yazılım rasterleştirmede (SwiftShader) alınmıştır.
  Gerçek GPU'da bu CPU maliyeti 60 FPS bütçesinin (16,7 ms) altında kalır; ancak **gerçek donanımda 60/30 FPS ölçümü bu ortamda yapılamadı** (bkz. §6).
* **Gecikme (PRD §5, 150 ms):** {{GECIKME}}. İstemci girdiyi anında tahmin eder, sunucu yetkili kalır.

## 5. Kapsam dışı bırakılanlar (PRD'nin sonraki aşamaları)

Prototip kapısı "tek bölge, Alp, temel savaş, ganimet, artı basma, basit oba, kayıt, küçük çok oyunculu test" dedi. PRD'nin kendisi şunları sonraki aşamalara bırakır; **yapılmadı**:

| Konu | PRD referansı | Neden kapsam dışı |
|---|---|---|
| Kam ve Mergen sınıfları, 6 uzmanlık | §5, §14 Aşama 3 | Vertical slice aşaması |
| Kale kuşatmaları, Savaş bölgesi, 9 kale, nüfus dengesi | §6, §14 Aşama 4 | Erken erişim aşaması |
| Zindanlar, dünya boss'u | §10, §14 Aşama 3–4 | Vertical slice / erken erişim |
| Tezgah, vergi, market, EP kuponu, oto av, premium | §9, §11 | PRD: "Market prototip aşamasında yoktur" |
| Parti, arkadaş, evlilik, oymak yönetimi/rol yetkileri | §10, §14 Aşama 3 | Vertical slice (acemi oymak + sohbet var) |
| Ahır/Kartal yuvası/Kam çadırı/Ambar/Kuşatma atölyesi, sürü yetiştirme | §8 | Prototip "2 bina" der; yalnızca Otağ + Demirhane |
| 48 saat ticaret sınırı, davranış analizi, 2 aşamalı doğrulama | §9, §13 | Ticaret yok; bot önlemlerinden hız sınırı + sunucu yetkisi yapıldı |
| PostgreSQL + Redis, çok makineli bölge dağıtımı | §13 | Yerelde SQLite (bkz. §6) |
| Steam paketleme, özel müzik/seslendirme, mobil | §2, §12 | PRD kapsam dışı / gelir sonrası |

## 6. Bilinen sınırlar ve dürüst notlar

1. **Gerçek GPU'da FPS ölçülemedi.** Bu ortamda yalnızca yazılım rasterleştirmeli Chromium var. Raporlanan FPS bu yüzden düşüktür; güvenilir olan ölçüm kare başına CPU maliyeti ve sahne karmaşıklığıdır. Kalite otomatiği düşük FPS'te grafiği kendiliğinden düşürür (e2e'de `?autoq=0` ile kapatılır).
2. **Veritabanı SQLite (`node:sqlite`).** PRD PostgreSQL + Redis der. Yerel geliştirme/prototip için kurulumsuz çalışması seçildi; tüm erişim `server/db.ts` arkasındadır, geçiş tek dosyadır. Katmanlar arası sohbet/oymak yönlendirme tek süreçte bellekten yapılır.
3. **Colyseus 0.16 hattı.** `colyseus.js` 0.16 ile tel uyumlu olması için sunucu `@colyseus/core@0.16` (legacy hat) kullanır; en yeni 0.18 çekirdeği bu istemciyle eşleşmedi. Durum senkronu Colyseus şeması yerine kendi anlık görüntü/olay protokolümüzle (AOI süzmeli, bireysel ganimetli) yapılır.
4. **Denge sayıları taslaktır.** PRD de oranları "taslak" ilan eder. Artı basma oranları PRD tablosuna birebir uyar; hasar/deneyim eğrileri ise elle ayarlandı ve oynanarak ince ayar ister.
5. **Zamanlayıcılar gerçek zamanlıdır** (bina 5 dk × seviye, seferler 1/4/12 sa). Testlerde `KUT_TEST=1` ile sunucu saati ileri sarılır; üretimde bu uç kapalıdır.
6. **Görsel strateji farkı:** PRD hazır low-poly paketleri önerir; burada sıfır bütçe ve lisans riski için tüm modeller kodla (ilkel parçalardan) üretildi. Tek stile uyum bu sayede garantilidir; elle modellenmiş sanat kalitesi değildir.
7. **Tek oda = tek harita:** 150 oyuncu/katman hedefi katmanlamayla doğrulandı (küçük sınırla); 150+ oyuncuyla yük testi yapılmadı (10 istemci ölçüldü).
8. **Dokunmatik/mobil yok** (PRD kapsam dışı).

## 7. Ekran görüntüleri (`docs/evidence/`)

{{GALERI}}

Ham veri: [`e2e-report.json`](evidence/e2e-report.json), [`vitest.json`](evidence/vitest.json), [`metrics-a9.json`](evidence/metrics-a9.json).

## 8. Raporu yeniden üretmek

```bash
npm run build
npx vitest run --reporter=json --outputFile=docs/evidence/vitest.json
npm run e2e                       # docs/evidence/*.png + e2e-report.json
npx tsx scripts/make-report.ts    # bu raporu üretir; kanıtsız kriter varsa hata verir
```
