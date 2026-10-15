# Genel hata ve eksik analizi (2026-10-12)

Yöntem: ölçülebilir kanıt. (1) tam e2e turu, (2) 250 birim/entegrasyon testi, (3) yeni **RPC bulanık test** (46 işlem × bozuk argüman × 8 tohum × 300 tur), (4) yeni **çeviri kapsamı testi** (varlıklardan türetilen anahtarlar), (5) kod okuma. Ölçülemeyen şeyler "ölçülmedi" yazıldı.

## Bulunan ve düzeltilen hatalar
| # | Bulgu | Etki | Düzeltme / kanıt |
|---|---|---|---|
| 1 | `oba.donate` bozuk değeri (`hide: {}`) `NaN`'a çeviriyordu; kontroller `NaN` ile geçiyordu | Bağışçının çantası ve **Oba deposu kalıcı olarak NaN** (tüm oba için kalıcı veri bozulması) | `Number()` + `isFinite` doğrulaması; `tests/integration/rpc-fuzz.test.ts` (8 tohum geçti) |
| 2 | `fish.buy` `n: "abc"` → `NaN` akçe riski | Akçe NaN | `|| 1` korumalı; fuzz kapsamında |
| 3 | Zindan bossları (`boss.10`, `boss.11`) için ad ve duyuru çevirisi yoktu | Arayüzde ham anahtar (`boss.10`) görünüyordu | TR/EN eklendi; `tests/unit/i18n-kapsam.test.ts` |
| 4 | Günlük "yaratık kes" görevi her seviyeden yaratığı sayıyordu | Sv 50 oyuncu başlangıç çakallarıyla görevi bitirebilirdi (kasma) | Yalnızca seviye−10 ve üstü yaratık sayılır; test eklendi |

## Durum tablosu (2026-10-15 güncellemesi)
| # | Bulgu | Durum |
|---|---|---|
| A | Balıkçılıkta vuruşlar istemci beyanı (bot riski) | **Azaltıldı**: tutma şansı (kaçma), `minReelSec` 4 sn, günlük 200 yakalamadan sonra şans ×0,4. Bot sınaması: balık talep olmadan akçeye dönmez (bot 0 satış, yem parası bitince durdu). Kalan risk: balık NPC'ye satılabilir yapılırsa yeniden simüle edilmeli. |
| B | Ekonomi yeniden ölçülmedi | **Ölçüldü** (A/B, 3 tohum × 2 kol × 14 gün): `docs/balans/YENI_SISTEMLER_EKONOMI.md`. Sink/kaynak %85,3 → %88,3 (bant içinde); simülasyon 3 ayar sorunu buldu ve düzeltildi (Sürü Başı ödülü, ek yuva düşüşü, Kut Taşı maliyeti). Sınırlar belgede. |
| C | Dokunmatik/mobil kontrol | **Yapıldı** (joystick, saldırı/E düğmeleri, kamera, panel düzeni, görev şeridi); Chromium dokunmatik emülasyonunda test edildi, **gerçek cihazda denenmedi**. |
| D | Gerçek GPU performansı ölçülmedi | **Açık**. Yeni: Kut Taşı sekmesi ilk açılışta ≤ 30 taş görseli çizer (SwiftShader'da sorun yok, gerçek GPU ölçülmedi). |
| E | Ek yuva görünümü kısmi | **Kapandı**: çizme, bilezik, küpe karakter modelinde (bant malzemesi + kademe taşı); kodlama 45 bit. Not: varsayılan kamera uzaklığında küpe miğferin altında az görünür. |
| F | Öğretici yeni sistemleri anlatmıyor | **Kapandı**: 7 adımlı çekirdek öğretici (hareket, Ak Sakal, savaş, Oba, Demirci) + 18 görevlik **Alp Rehberi**; sunucu doğrulamalı, pusula oklu, mobilde görev şeridi. `docs/ozellikler/ALP_REHBERI.md`. Gerçek yeni oyuncuyla denenmedi. |
| G | Metin2 listesinden yapılmayanlar | Yapıldı: Kut Taşları, Yoldaş evrimi, agresif sürüler + çekme, boss anahtarı + sandık. **Kalan**: metin taşı dalgaları, biyolog tarzı teslim görevi, Yoldaş ömrü. |
| H | Barındırma | **Açık** (7/24 sunucu yok, tünel uçtan uca denenmedi). |
| I | Yeni: Kut Taşı/anahtar pazarda takas edilmiyor | Bilinçli (ilk sürüm). Pazar fiyat dinamiği simüle edilmedi. |
| J | Yeni: oyun içi eğitimde gerçek oyuncu geri bildirimi yok | Açık; görev sayısı/sırası geri bildirimle ayarlanmalı. |

## Sağlam bulunanlar (kanıtla)
- Kalıcılık: 10 sn otomatik kayıt ve SIGINT/SIGTERM'de kapanış kaydı (`server/world.ts`, `server/index.ts`).
- Sohbet ve ad: sohbet metni `esc()` ile kaçışlı, oyuncu adı `NAME_RE` ile kısıtlı; HTML enjeksiyonu yolu bulunmadı.
- Hız sınırı ve 46 RPC işleminin tamamı bozuk argümanla çökmedi; durum değişmezleri (akçe/çanta/eşya/olta alanları sonlu ve ≥0) korundu.
