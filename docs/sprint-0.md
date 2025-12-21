# Sprint 0 (Hafta 1) — Altyapı ve PoC

## Amaçlar
- Monorepo altyapısını kurmak, temel CI ve kod kalitesi araçlarını etkinleştirmek.
- Kimlik doğrulama ve otoriter tick döngüsü için çalışır bir PoC sunmak.
- Paylaşılan tip/proto sözleşmeleriyle servislerin aynı veri modelinde buluşmasını sağlamak.
- Hafta sonu demosunda tek shard + tek kaynak nodu üzerinde canlı tick çıktısı göstermek.

## Çıktılar
- `packages/client`, `packages/server`, `packages/shared` dizinlerine sahip pnpm tabanlı monorepo iskeleti.
- Lint/format/test komutlarını çalıştıran temel CI pipeline (GitHub Actions veya eşleniği).
- Email+şifre kayıt/giriş uçları olan minimal auth servisi (Fastify), in-memory store ve OpenAPI şeması.
- 1 saniyelik tick ile kaynak nodu yenilemeyi loglayan ve WebSocket ile state diff gönderen prototip.
- Player, village, inventory, resource için paylaşılan TypeScript interface/proto dosyaları.

## Plan (Gün Bazlı)
- **Gün 1:** Monorepo kurulumu (pnpm + workspace), ortak tsconfig, eslint/prettier ayarları. CI pipeline iskeleti (lint+test placeholder).
- **Gün 2:** Auth servisi taslağı: Fastify route’ları, OpenAPI şeması, in-memory kullanıcı deposu ve mutlu yol e2e testi.
- **Gün 3:** Paylaşılan tip/proto’lar: player/village/inventory/resource interface’leri; derleme komutu ve tiplerin server/client’a publish’i.
- **Gün 4:** Oyun döngüsü PoC: tek shard world loop, 1s tick, kaynak nodu respawn ve WebSocket state diff log’u.
- **Gün 5:** Demo hazırlığı: CI kırmızı/yeşil akışı doğrulama, PoC sunucusunun docker-compose ile ayağa kalkması, risk/hata listesi.

## Görevler (Detay)
### Repo ve Kalite
- [ ] pnpm workspace, `packages/{client,server,shared}` klasörleri ve kök `package.json` script’leri (lint, test, format, dev).
- [ ] Ortak `tsconfig.base.json` + her paket için referans alan tsconfig’ler.
- [ ] ESLint + Prettier konfigürasyonu, örnek dosyada format doğrulaması, `npm run lint`/`format` script’leri.
- [ ] CI: lint + test job’ları, pnpm cache, örnek jest testi (şimdilik dummy) ve badgenin README’ye eklenmesi.

### Auth Servisi PoC
- [ ] Fastify tabanlı `auth` modülü: `/register`, `/login`, `/me` rotaları; email + şifre validasyonu.
- [ ] In-memory user store (basit array veya Map) + password hash (argon2/bcrypt).
- [ ] OpenAPI/Swagger şeması ve kısa README bölümü.
- [ ] e2e test: mutlu yol kayıt → login → protected endpoint erişimi.

### Paylaşılan Modeller
- [ ] `packages/shared` içinde `types` veya `proto` dizini: `Player`, `Village`, `Inventory`, `ResourceNode` interface’leri.
- [ ] Protobuf alternatifi düşünülüyorsa `pnpm proto:compile` komutu; yoksa ts-interface build’i.
- [ ] Client ve server paketlerinde bu tiplerin import edildiğini gösteren örnek dosya.

### Tick ve WebSocket PoC
- [ ] Tek shard loop: 1s tick scheduler, kaynak nodu respawn (stok + respawn_at güncellemesi) ve log çıktısı.
- [ ] WebSocket endpoint’i: bağlanan kullanıcıya state diff (ör. kaynak nodu stok değeri) gönderimi.
- [ ] Basit latency ölçümü: gönderim süresi ms cinsinden loglansın.
- [ ] `npm run dev:poc` ile gateway/world birleşik demo başlatma komutu.

### Demo ve Hazırlık
- [ ] Docker Compose: Postgres + Redis placeholder; PoC için opsiyonel (in-memory de olabilir) fakat compose dosyası hazır.
- [ ] README veya `docs/sprint-0.md` içinde PoC çalıştırma talimatları.
- [ ] Risk listesi: CI/monorepo bağımlılıkları, tick performansı, WebSocket stabilitesi.

## Definition of Done (Sprint 0)
- CI pipeline kırmızı/yeşil durumda; lint/test başarısız olursa build durur.
- Auth PoC rotaları OpenAPI ile dokümante ve mutlu yol testi otomasyonda geçer.
- Tick PoC logları ve WebSocket diff’leri demo günü canlı gösterilebilir.
- Paylaşılan tipler tek kaynaktan build edilir ve client/server tarafından import edilir.
- Docker Compose ile 5 dakika içinde PoC ortamı ayağa kaldırılabilir (env örnekleri dahil).

## Riskler ve Azaltma
- **pnpm/Nx cache sorunları**: CI’da `pnpm store prune` ve node_modules temizliği; kilit dosyası değişikliklerini inceleme.
- **Tick performansı**: 1s döngüde CPU/memory profilini logla, 100 oyuncuya kadar sahte yük testi planla.
- **WebSocket kopmaları**: Otomatik reconnect ve state resync stratejisi için temel taslak oluştur, timeout/retry logla.
- **Güvenlik**: Weak password/DoS riskleri için rate limit + schema validation (zod) planı; sprint 1’de sertleştirme notu.

## Demo Akışı
1. `pnpm install && pnpm dev:poc` ile PoC sunucusunu başlat.
2. Swagger UI’den kayıt/giriş yap, `/me` endpoint’ini doğrula.
3. WebSocket client (basit CLI veya tarayıcı) ile bağlan; 1s tick loglarını ve gelen state diff mesajlarını göster.
4. Paylaşılan tiplerin hem client hem server kodunda import edildiği örnek dosyayı aç.
5. CI ekranında lint/test job’larının yeşil olduğunu göster.
