# World & Gameplay Tasarımı

## Temel Döngü
1. Kaynak topla (tarla/orman/maden/av)
2. Kaynağı depola veya işle (atölye)
3. Köy yapılarını yükselt, üretim verimini artır
4. Pazarda takas yap, görev/etkinliklerle ilerleme sağlay
5. Mevsimsel değişikliklerle strateji ayarla (verim, hava, hastalık riskleri)

## Meslekler ve Eylemler
- **Çiftçi**: Ekim/hasat, gübreleme, tohum kalite bonusu
- **Çoban**: Besleme, süt/yün/deri toplama, hastalık riski yönetimi
- **Avcı**: İz sürme, tuzak kurma, ok-yay dayanıklılığı, nadir drop tabloları
- **Oduncu**: Ağaç kesme, yeniden dikim, taşıma maliyeti optimizasyonu
- **Madenci**: Cevher çıkarma, damar zorluk seviyesi, ekipman aşınması

### Meslek İlerlemesi
- Seviye 1-5: Temel eylemler, düşük dayanıklılık tüketimi
- Seviye 6-10: Orta zorluk kaynak nodlarına erişim, %5 verim bonusu
- Seviye 11-15: Özel tarifler (tohum/ceket/tuzak), %10 drop kalite bonusu
- Seviye 16+: Bölgesel unvanlar, köy buff’larına katkı, sınırlı PvP avantajları

## İlerleme ve Beceri
- Meslek bazlı XP; seviye atladıkça yeni tarifler/bonuslar
- Dayanıklılık (stamina) tüketimi; yemek ve dinlenme ile yenilenir
- Ekipman kalitesi: dayanıklılık + verim modifiyeri

## Köy ve Yapılar
- Başlangıç alanı: depo + küçük tarla
- **Yapılar**: Ev (nüfus), Depo (kapasite), Tarla (verim), Ahır (hayvancılık slotu), Atölye (üretim tarifleri), Pazar (NPC ticareti)
- Yükseltme maliyeti: kaynak + süre; hızlandırma yok (MVP)
- İzinler: Köy sahibi, yönetici, üye rolleri

## Ekonomi ve Ticaret
- NPC market: arz-talep katsayısına bağlı dinamik fiyatlar (server taraflı)
- Oyuncular arası takas: pazarda ilan/teklif; vergi ve taşıma maliyeti
- Taşıma: yük ağırlığı + mesafe; fazla yük hız ve dayanıklılığı etkiler

## Dünya ve Mevsimler
- Global saat: 24h/4 mevsim; mevsime göre verim ve risk ayarı
- Hava durumu: yağmur, kar, sis; hareket ve verim modifiyerleri
- Kaynak nod yenilenme: mevsim ve yoğunluğa göre respawn

| Mevsim | Verim Çarpanı | Risk | Örnek Etki |
| --- | --- | --- | --- |
| İlkbahar | +10% tarla/orman | Düşük | Ekim hızı +10%, hayvan hastalığı riski -5% |
| Yaz | +5% maden | Orta | Sıcaklık sebebiyle dayanıklılık tüketimi +10% |
| Sonbahar | +15% av/orman | Orta | Yağmur: görüş azalır, ok menzili -5% |
| Kış | -15% tarla, +10% maden | Yüksek | Soğuk: hareket hızı -5%, hastalık riski +10% |

## Sosyal ve İşbirliği
- Köy üyeliği, rol bazlı erişim
- Kooperatif bonuslar: ortak görevler, köy buff’ları
- Hafif rekabet: av/cevher bölgelerinde sınırlı PvP; offline saldırı yok

## Telemetry & LiveOps
- Olay logları: kaynak toplama, market işlemleri, yapı yükseltmeleri
- Alertler: ekonomi enflasyon/deflasyon, hile şüphesi, yüksek gecikme
- Sezonluk hedefler: global görevler, leaderboard reset opsiyonu
