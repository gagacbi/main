# Genel hata ve eksik analizi (2026-10-12)

Yöntem: ölçülebilir kanıt. (1) tam e2e turu, (2) 250 birim/entegrasyon testi, (3) yeni **RPC bulanık test** (46 işlem × bozuk argüman × 8 tohum × 300 tur), (4) yeni **çeviri kapsamı testi** (varlıklardan türetilen anahtarlar), (5) kod okuma. Ölçülemeyen şeyler "ölçülmedi" yazıldı.

## Bulunan ve düzeltilen hatalar
| # | Bulgu | Etki | Düzeltme / kanıt |
|---|---|---|---|
| 1 | `oba.donate` bozuk değeri (`hide: {}`) `NaN`'a çeviriyordu; kontroller `NaN` ile geçiyordu | Bağışçının çantası ve **Oba deposu kalıcı olarak NaN** (tüm oba için kalıcı veri bozulması) | `Number()` + `isFinite` doğrulaması; `tests/integration/rpc-fuzz.test.ts` (8 tohum geçti) |
| 2 | `fish.buy` `n: "abc"` → `NaN` akçe riski | Akçe NaN | `|| 1` korumalı; fuzz kapsamında |
| 3 | Zindan bossları (`boss.10`, `boss.11`) için ad ve duyuru çevirisi yoktu | Arayüzde ham anahtar (`boss.10`) görünüyordu | TR/EN eklendi; `tests/unit/i18n-kapsam.test.ts` |
| 4 | Günlük "yaratık kes" görevi her seviyeden yaratığı sayıyordu | Sv 50 oyuncu başlangıç çakallarıyla görevi bitirebilirdi (kasma) | Yalnızca seviye−10 ve üstü yaratık sayılır; test eklendi |

## Açık bulgular (düzeltilmedi; karar/ölçüm gerekiyor)
| # | Bulgu | Risk | Öneri |
|---|---|---|---|
| A | **Balıkçılıkta vuruşlar istemci beyanı**: sunucu yalnızca süreyi doğrular (≥2,5 sn) | Bot, 1,5 sn bekleme ile dakikada ~15 balık yakalayabilir (balık pazar malı; arz enflasyonu). Akçe faucet'i yok | Vuruş zamanlarını sunucuda tohumlu desenle doğrula (bot yine hesaplayabilir, ama hız ve bellek tavanı koyar); balık başına günlük tavan |
| B | **Ekonomi yeniden ölçülmedi**: ek yuvalar, Göl Avı, Günlük, Element eklendi; simülasyon botları ek yuvaları kullanmıyor | Yeni faucet (Kımız, kitap, XP) ve sink'ler (olta, yem, element) net etkisi bilinmiyor; "toplam ekonomi kısmen doğrulandı" durumu sürüyor | Nüfus simülasyonu + botlara ek yuva/balık/günlük davranışı; canlı telemetri (`scripts/economy-report.ts`) |
| C | **Dokunmatik/mobil kontrol yok** | Telefonda oynanamaz | Sanal joystick + skill düğmeleri (ayrı iş) |
| D | Gerçek GPU performansı ölçülmedi | İlk çanta açılışında ≤160 eşya görseli çizilebilir; kuşanma değişiminde model yeniden kurulur; kalabalık sahne | Tarayıcı konsolu ölçüm betiği (kuyrukta iş emri) |
| E | Ek yuva görünümü kısmi | Yalnızca kalkan karakterde görünür; çizme/bilezik/küpe yok | Çizme ve bilezik için model parçası |
| F | Öğretici yeni sistemleri anlatmıyor | Ak Sakal görevleri 5 adım; Wiki (U), Günlük (J), Göl, Element keşfe bağlı | Öğretici adımı veya Ak Sakal diyaloğu |
| G | Metin2 geri bildirim listesinden yapılmayanlar | Agresif sürü + çekme, metin taşı dalgaları, boss anahtarı/sandık, biyolog tarzı teslim görevi, Kut Taşları, Yoldaş evrimi | `docs/ozellikler/METIN2_WIKI_UYARLAMA.md` |
| H | Barındırma yalnızca kendi bilgisayar + tünel | 7/24 sunucu yok; Cloudflare tünel adımı uçtan uca denenmedi | `docs/BARINDIRMA.md` |

## Sağlam bulunanlar (kanıtla)
- Kalıcılık: 10 sn otomatik kayıt ve SIGINT/SIGTERM'de kapanış kaydı (`server/world.ts`, `server/index.ts`).
- Sohbet ve ad: sohbet metni `esc()` ile kaçışlı, oyuncu adı `NAME_RE` ile kısıtlı; HTML enjeksiyonu yolu bulunmadı.
- Hız sınırı ve 46 RPC işleminin tamamı bozuk argümanla çökmedi; durum değişmezleri (akçe/çanta/eşya/olta alanları sonlu ve ≥0) korundu.
