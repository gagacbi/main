# Mimari ve Teknoloji Yığını

## Hedefler
- Web tarayıcıda oynanabilir, düşük gecikmeli, otoriter sunucu modeli
- Yatay ölçeklenebilir servisler + shard/instance bölünmesi
- Veri bütünlüğü ve hile önleme: tüm kritik hesaplamalar sunucu tarafında

## Önerilen Yığın
- **İstemci**: React + TypeScript, Zustand (state), React Query (network cache), WebGL/Canvas tabanlı hafif render; Vite build.
- **Sunucu**: Node.js + TypeScript, Fastify (HTTP), Colyseus benzeri custom otoriter oyun döngüsü (WebSocket), Redis pub/sub.
- **Veri**: PostgreSQL (kalıcı), Redis (oturum & geçici state), S3 uyumlu object storage (harita verisi/asset).
- **İletişim**: WebSocket (realtime), REST/GraphQL (meta veriler), gRPC (servis-içi).
- **Altyapı**: Docker, Kubernetes, Nginx Ingress, Grafana + Prometheus, Loki + Tempo (observability).
- **Kimlik**: JWT + Refresh token, OAuth2 (opsiyonel), Rate limiting + IP throttle.

## Modüler Bileşenler
- **Gateway**: Kimlik doğrulama, rate limit, WebSocket upgrade, shard yönlendirme.
- **World Service**: Dünya saati, mevsim, kaynak yenilenmesi, spawn kuralları.
- **Village Service**: Yapı yerleşimi, yükseltme, üretim kuyruğu, izin/rol kontrolü.
- **Character Service**: Envanter, beceri puanı, dayanıklılık, ekipman durability.
- **Economy Service**: NPC market fiyatlandırması, oyuncular arası takas, vergi/taşıma maliyeti.
- **Combat/Encounter Service**: Av sahası instance yönetimi, hasar hesaplama, drop tablosu.
- **Telemetry/Anti-Cheat**: Etkinlik logları, hız-limit analizi, anti-cheat hook’ları.

### Bileşen Sınırları ve Akışlar
- **İstemci → Gateway → World Service**: Oturum açan oyuncu için shard seçimi yapılır, WebSocket kanalı açılır, world tick event’leri aktarılır.
- **İstemci → Gateway → Village Service**: Köy yerleşimi, yapı yükseltme ve üretim kuyruğu komutları bu servis tarafından otoriter şekilde doğrulanır.
- **İstemci → Gateway → Economy Service**: NPC fiyat sorguları ve oyuncular arası teklif işlemleri burada sonuçlanır; ödeme akışları Combat veya Village state’lerini günceller.
- **Servis → Telemetry**: Tüm servisler event bus üzerinden log’ları gönderir; anti-cheat uyarıları ayrıca alert kanalına düşer.

## Veritabanı Taslağı
- `players(id, account_id, name, level, stamina, created_at)`
- `villages(id, owner_player_id, name, shard_id, x, y, storage_id)`
- `buildings(id, village_id, type, level, status, started_at, finishes_at)`
- `inventories(id, owner_type, owner_id, capacity)`
- `inventory_items(id, inventory_id, item_type, qty, durability)`
- `resources_nodes(id, shard_id, type, x, y, respawn_at, difficulty)`
- `trades(id, seller_id, buyer_id, item_type, qty, price, status)`
- `skills(id, player_id, skill, xp)`

## Oyun Döngüsü (Sunucu Tarafı)
1. **Tick Scheduler**: 1s/2s tick ile kaynak yenileme, üretim kuyruğu güncelleme
2. **Komut Kuyruğu**: İstemci aksiyonları (ör. ekim, avlanma) doğrulanır ve deterministik işlenir.
3. **Durum Yayını**: Oyuncuya ait state diff’leri ve yakın köy/alan bilgileri yayınlanır.
4. **Anti-cheat**: Hız/konum sapmaları, makro paterni, olağan dışı kaynak üretimi uyarıları.

### Tick Örnek Akışı
- **T0:** Tick başlar; world clock mevsim/saat günceller, hava durumu seed’lenir.
- **T0+50ms:** Kuyruktaki istemci komutları (ekim, avlanma, taşıma) sırayla doğrulanır, DB/Redis güncellemeleri yapılır.
- **T0+200ms:** Kaynak nod respawn kontrolü yapılır; uygun nod’lar yeniden stoklanır.
- **T0+400ms:** Envanter kapasitesi aşan durumlar temizlenir, overflow hataları kuyruğa yazılır.
- **T0+600ms:** State diff hesaplanır ve oyuncu/party yakınındaki köy ve alanlar için toplu yayın yapılır.

## Deploy & Çevrim
- **Ortamlar**: Dev → Staging → Prod; her biri için ayrı Postgres/Redis.
- **CI/CD**: Lint + test → build → container image → deploy (ArgoCD/Flux). Feature branch preview env önerilir.
- **Gözlemlenebilirlik**: Prometheus metric’leri (tick süresi, mesaj gecikmesi), Grafana dashboard, distributed tracing.

### Yerel Geliştirme Notları
- Docker Compose ile Postgres + Redis + MinIO ayaklandırılır.
- `make dev` veya `npm run dev` hedefi gateway + world + village servislerini hot-reload ile başlatır.
- Fixture verisi (ör. başlangıç kaynak paketleri, mevsim katsayıları) `.yaml` dosyaları ile yüklenir.

## Güvenlik
- Zorunlu HTTPS, HSTS
- JWT imza rotasyonu, refresh token blacklist
- Rate limit + IP reputation
- WebSocket message schema doğrulama (zod/io-ts)
- RBAC: oyuncu rolleri, köy izinleri (ör. depo açma, yapı inşa, market erişimi)

## İstemci Yapı Taşları
- **UI Katmanları**: Dünya haritası (tile-based), köy görünümü, karakter paneli, market/teklif ekranı.
- **Durum Yönetimi**: Session store, world slice (mevcut shard, saat, hava), village slice (binalar, üretim), character slice (envanter, beceri).
- **Çevrimdışı Dayanıklılık**: Önbelleğe alınan veri, yeniden bağlanma stratejisi, eylem kuyruğu tekrar gönderimi.

## Ölçeklendirme Stratejisi
- Shard başına oyuncu limiti, shard transferi için kuyruk
- Bölgesel veri merkezleri, latency bazlı yönlendirme
- Dünya servislerinin stateless tasarımı, Redis + Postgres üzerinden paylaşılan state
