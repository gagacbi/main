# Backlog (İlk 2 Sprint)

Tahminler T-shirt sizing (S/M/L/XL) bazındadır.

## Sprint 0 (Hafta 1) — Altyapı ve PoC
- Detaylı gün bazlı plan ve demo akışı için `docs/sprint-0.md` dosyasına bakın.
- [ ] Repo altyapısı: monorepo yapısı (packages: client, server, shared) (M) — **DoD:** paketler arası shared bağımlılıkları çalışır, pnpm/nx/lerna seçimi dokümante edilir.
- [ ] TypeScript config + lint/format (M) — **DoD:** eslint+prettier script’leri CI’da kırmızı/yeşil rapor üretir.
- [ ] CI pipeline: lint + test placeholder (S) — **DoD:** main branch’a push için zorunlu, örnek jest testinin geçtiği görülür.
- [ ] Auth iskeleti: email+şifre kayıt/giriş API taslağı (M) — **DoD:** OpenAPI şeması, in-memory user store, happy-path e2e testi.
- [ ] Temel domain modelleri ve paylaşılan proto/schema’lar (L) — **DoD:** player, village, inventory, resource proto/interface’leri derlenir.
- [ ] Oyun döngüsü PoC: tek shard, tek kaynak nodu, otoriter tick (L) — **DoD:** 1 saniyelik tick ile kaynak yenileme log’lanır, WebSocket ile state diff gönderimi.

## Sprint 1 (Hafta 2) — Çekirdek Sistemler
- [ ] Dünya Saati & Mevsim servisi: global timer, mevsim verisi yayını (M) — **DoD:** dünya saati WebSocket yayınında yer alır, mevsim değişiminde event log üretilir.
- [ ] Kaynak nodları: respawn süreleri, zorluk parametreleri, yakınlık isteği (M) — **DoD:** API’den node listesi döner, respawn sonrası stok güncellemesi telemetry’de görünür.
- [ ] Envanter & Depo: ekleme/çıkarma API, kapasite kontrolü (M) — **DoD:** ekleme/çıkarma işlemleri kapasite aşımlarında hata döner, unit test’ler kritik path’i kapsar.
- [ ] Köy kurma akışı: yeni köy oluşturma, başlangıç kaynak paketleri (M) — **DoD:** yeni oyuncu için köy kaydı DB’de açılır, başlangıç deposu dolu gelir.
- [ ] Basit UI prototip: harita görünümü + köy ekranı wireframe (S) — **DoD:** Figma linki veya statik React prototipi repo’da bulunur.
- [ ] Telemetry temel: oyun içi event log pipeline’ı (S) — **DoD:** en az 3 olay tipi (resource gather, inventory change, login) için log akışı kaydedilir.

## Sprint 2 (Hafta 3) — Ekonomi ve İlerleme
- [ ] Yapı yükseltme: queue, süre, kaynak maliyeti, hızlandırma yok (M) — **DoD:** yapı seviyeleri DB’de güncellenir, ilerleme yüzdesi API’de raporlanır.
- [ ] Meslek ilerlemesi: beceri XP kazanımı, tier kilitleri (M) — **DoD:** XP kazancı log’lanır, tier kilidi açıldığında yeni tarif API’de görünür.
- [ ] Ekonomi v1: NPC market fiyatlarının server tabanlı hesaplanması (M) — **DoD:** fiyat formülü dokümante, fiyat dalgalanması telemetri grafiğine düşer.
- [ ] Tüccar/takas UI: teklif oluşturma, filtreleme, basit dengeleme (M) — **DoD:** en az create/list/accept akışları için UI kablo maketi ve API entegrasyonu.
- [ ] Reconnect ve state resync stratejisi (S) — **DoD:** bağlantı koptuktan sonra 5 sn içinde state diff ile senkronizasyon sağlanır, test kaydı mevcut.

## Mimari İşler (Devamlı)
- [ ] Telemetry dashboard’ları (Grafana) (M)
- [ ] Rate limit, IP throttle, request schema doğrulama (M)
- [ ] Load/stress test senaryoları (L)

## Notlar
- Her sprint sonunda oynanabilir build + dahili playtest hedeflenir.
- Balance değişiklikleri için feature flag + config dosyası yaklaşımı önerilir.
