# Proje Planı: Medieval MMO Survival

## Vizyon
Kendi köyünü kurabildiğin, meslek seçip ilerlediğin, kalıcı dünya ekonomisine katkı sağladığın web tabanlı bir Orta Çağ MMO’su.

## Hedef Kitle
- Hayatta kalma + şehir kurma hayranları (PC ve mobil tarayıcı)
- Uzun soluklu progresyon ve sosyal etkileşim arayan oyuncular
- Hafif-orta ölçekte PvP’yi destekleyen, ancak kooperatif oyun döngüsünü merkeze alan topluluklar

## Başarı Metrikleri
- Günlük aktif kullanıcı (DAU) / 30 gün elde tutma (D30) > %20
- Ortalama oturum süresi 20+ dakika
- Oyuncu başına haftalık görev tamamlama sayısı > 5
- Ekonomi dengesi: Enflasyon/deflasyon oranı ±%10 bandında

## Kapsam (MVP)
- Kalıcı dünya, global saat ve mevsim döngüsü
- Köy inşası: temel yapılar (ev, depo, tarlalar, ahır, atölye)
- Meslekler: çiftçi, çoban, avcı, oduncu, madenci; her biri için temel eylemler
- Kaynak döngüsü: ekim/hasat, besleme/üretim, avlanma/deri, odun/cevher çıkarma
- Temel ekonomi: NPC pazar + oyuncular arası takas, taşıma maliyetleri
- Kooperatif: köy üyeliği, sınırlı izinler, basit rol sistemi
- Hafif PvP: av sahalarında kaynak rekabeti, baskın/çevrimiçi saldırı yok
- Karakter gelişimi: beceri seviyesi, dayanıklılık ve ekipman kalitesi

## Kapsam Dışı (MVP sonrası)
- Geniş ölçekli savaşlar, kale kuşatmaları
- Derin crafting ağaçları ve nadir efsanevi eşya ekonomisi
- Gerçek para ile alışveriş, monetizasyon
- Mobil native istemci (yalnızca web desteklenir)

## Yol Haritası (Özet)
1. **Preproduction (2 hafta)**: Tasarım, prototip arayüz, veri modeli ve altyapı PoC.
2. **Sprint 0 (1 hafta)**: Repo, CI, temel servis çerçevesi, kimlik doğrulama iskeleti.
3. **Sprint 1-2 (2 hafta)**: Dünya saati + mevsim, kaynak düğümleri, envanter & depolar.
4. **Sprint 3 (1 hafta)**: Köy yapıları, yükseltme akışı, üretim kuyruğu.
5. **Sprint 4 (1 hafta)**: Ekonomi (NPC market + takas), taşıma maliyeti, basit vergi.
6. **Soft Launch (2 hafta)**: Balans, stres testi, telemetry, güvenlik sertifikasyonu.

### Çıktılar ve Kilit Tarihler
- **Tasarım Kit’i (Hafta 1 sonu):** Figma wireframe, component library taslağı.
- **Teknik PoC (Hafta 1 sonu):** Tek shard tick demo, basit köy kurma/hasat akışı.
- **Vertical Slice (Hafta 3 sonu):** Kaynak toplama → envanter → pazar satışı uçtan uca oynanabilir.
- **Soft Launch Hazırlığı (Hafta 6 sonu):** Load test raporu, temel anti-cheat kuralları, observability dashboard seti.

## Riskler ve Önlemler
- **Sunucu maliyeti / ölçek**: Otoriter sunucu + bölgesel shard; Docker/K8s ile otomasyon.
- **Ekonomi dengesizliği**: Kapalı beta, telemetry, düzenli wipe opsiyonu.
- **Hile & bot**: Sunucu taraflı doğrulama, hız-limit, davranış analizi, temel anti-cheat hook’ları.
- **İçerik yetersizliği**: Tekrarlanabilir döngüler + sezonluk hedefler, topluluk etkinlikleri.

## Organizasyon
- **Takımlar**: Oyun tasarımı, İstemci (web), Sunucu (services), Platform/DevOps, QA/Telemetri.
- **Çalışma şekli**: 1 haftalık sprint, günlük standup, haftalık demo, kapsamlı playtest.
- **Kalite**: Kod inceleme zorunlu, test piramidi (unit > integration), canary release.

### Karar Mekanizması ve İletişim
- **Teknik kararlar**: Mimari çalışma grubunda öneri dokümanı + asenkron oylama, büyük değişiklikler ADR ile kayıt.
- **Oyun dengesi**: Haftalık playtest sonrası balans notları, ekonomi dashboard verisine göre güncelleme.
- **Risk/incident akışı**: PagerDuty/opsgenie eşleniği, Sev1 için 30 dk içinde aksiyon, post-mortem 24 saat içinde.
