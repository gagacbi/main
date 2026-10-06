# Uçsuz Hikâye: Kut Yıllığı, Çağlar, Destan Kalıntıları

**İlke:** Dünya hikâyedir. Hikâye bir kişiye değil sunucuya aittir; kimse "seçilmiş" değildir, herkes aynı Yıllık'a yazar.

## Üç katman

| Katman | Ne | Nerede yaşanır |
|---|---|---|
| Yazılı (authored) | Gizem iplikleri (yazıt, rüya, Ak Sakal, balbal, kırık) + **9 Destan Kalıntısı** ("Mühür'den önce ne oldu?") | Kodeks (Y), bozkırdaki harabeler (E ile oku) |
| Ortaya çıkan (emergent) | Boss devrilmeleri, çatlak kapatmaları, zindan ilk bitirişleri, "sunucuda ilk Sv 10/20/30/40/50", yazıt çözümleri — **oyuncu adıyla** | Kodeks › Kut Yıllığı (sunucunun ortak hafızası, kalıcı) |
| Sonsuz (open-ended) | **Çağlar**: Yıllık puanından türer. 0–5 yazılı çağ (Uyanış → Yazı Çağı), sonra her 1500 puanda yeni, deterministik adlı "Gelen Tehdit" çağı (ör. *Kızıl Sürü Çağı*) | Çağ geçişi herkese duyurulur ve Yıllık'a düşer |

## Hissettirme

* Çağ değişince tüm çevrimiçi oyunculara toast + sohbet duyurusu (`sys.era`).
* Kalıntılar bozkırda amber parlar (okununca solar), minimap'te amber elmas; seviyeye göre uzaklaşır → ne kadar uzaklaşırsan o kadar eskiye gidersin.
* Her kalıntı açılış, yerleşik tek cümlelik dokunuş ve cevapsız bir soru bırakır; "dıştaki el" sorusu bilerek yanıtsız.
* Yıllık puanı: boss 10, çatlak 6, zindan 4, yazıt 25, kalıntı 2 — hiçbir tek yol çağı tek başına ilerletmez.

## Teknik

`shared/chronicle.ts` (çağ eşikleri, kalıntı yerleşimi), `server/chronicle.ts` (world kv içinde JSON, 200 kayıt, `firsts` haritası), hook'lar `server/world.ts` (`chron()`: boss, çatlak, yazıt, seviye) ve `server/dungeon.ts` (zindan ilk bitiriş). RPC: `chron`, `ruin`. Test: `tests/integration/chronicle.test.ts`.

## Metin2 felsefesi → KUT eşlemesi ve yapılacaklar listesi (önceliklendirme size ait)

| Metin2 fikri | KUT'ta durum | Öneri |
|---|---|---|
| Dünya hikâyedir, ucu açık | **Bu iş:** Yıllık + sonsuz çağlar | — |
| Toplu kahramanlık | Yıllık ortak puan; çağ herkese ait | Çağa göre bozkır olayı (ör. "Kızıl Sürü" çağında sürü saldırısı) |
| Mob sürüsü, agresif slot, çekme + AoE | Kamplar var; combo/AoE var | **P1:** agresif sürü slotu + çekme (v1.2) |
| Metin taşı dalgaları | Yok (Erlik çatlakları benzer) | P2: taş = çağa bağlı dalga etkinliği |
| Artı basma / efsun riski | +9 sınır, efsun, yeniden çevirme | Tamam; +10…+15 yalnız simülasyonda |
| Pazar / yer değeri / enflasyon | Pazar var; sink kök neden analizi yapıldı | Oyuncu geri bildirimine kadar beklemede |
| Ortalama vs beceri hasarı, sınıf yin-yang | Combo zincirleri eklendi | Sınıf dengesi playtest sonrası |
| Derece / zalim–kahraman | `rank` var (negatif = zalim) | P2: Yıllık'a "zalim" kaydı (`outlaw` türü hazır) |
| Madencilik / işçi sınıfı | Oba kaynakları var | P3 |
| Biyolog günlük teslim görevleri | Yok | **P1 öneri:** Ak Sakal günlük teslim, başarısızlık şansı, kalıcı ödül |
| Boss/zindan anahtarı, sandık, kamp, direnç eşiği | Zindan günlük hak var | P2: anahtar + sandık |
| Ejderha boss görseli | — | Görsel fikir: Erlik bossları için uzun gövde silüeti |

Onaylanmamış büyük sistemler (biyolog, anahtar/sandık, agresif sürüler) bilerek eklenmedi; hangisinin sıradaki olduğunu söyleyin.
