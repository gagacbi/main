# Oyunu arkadaşlarla oynatma: barındırma seçenekleri

Sunucu: Node 22.5+ (`node:sqlite`), WebSocket, **sürekli çalışan oyun döngüsü** ve **dosya tabanlı veritabanı (SQLite)**. Bu üç gereksinim çoğu "ücretsiz" barındırmayla çakışır.

| Seçenek | Maliyet | Kart gerekir mi | Veri kalıcı mı | Not |
|---|---|---|---|---|
| **A. Kendi bilgisayarın + Cloudflare Tunnel** (`npm run play:share`) — **önerilen** | 0 | Hayır | Evet (kendi diskinde) | Bilgisayar açık olmalı. Hesap/kart yok. Bu ortamda tünel adımı sınanamadı (ağ engeli); ilk çalıştırmada doğrulanır. |
| B. Aynı Wi-Fi (yerel adres) | 0 | Hayır | Evet | Yalnız aynı ağdakiler. `play:share` bunu da yazar. |
| C. Google Compute Engine **e2-micro** (kalıcı ücretsiz katman) | 0 (kota içinde) | **Evet** (fatura hesabı) | Evet (disk) | 7/24 açık sunucu. Yalnızca belirli ABD bölgelerinde ve kota içinde ücretsiz; kart doğrulaması şart, yanlış bölge/aşım ücret doğurur. Kurulum için gcloud ve hesabınız gerekir (bu ortamdan yapılamaz). |
| D. Google Cloud Run | Ücretsiz katman | **Evet** | **Hayır** (kapsayıcı diski geçici) | Boşta sıfıra iner; oyun döngüsü ve SQLite için uygun değil. Önerilmez. |
| E. Render / Koyeb ücretsiz web servisi | 0 | Genelde hayır | **Hayır** (uyuyunca/yeniden dağıtımda sıfırlanır) | ~15 dk boşta uyur, ilk bağlantı yavaş; karakterler kaybolur. Kısa deneme için olur, ölçüm için olmaz. |
| F. Oracle Cloud Always Free | 0 | **Evet** | Evet | Cömert ama kart ve kapasite bulma sorunu. |

**Neden A:** hesap/kart yok, veriler kalıcı (ekonomi ölçümü için gerekli), 2–3 arkadaş için gecikme ve bant genişliği yeterli. **Sınırı:** bilgisayarın açık kalması ve ev internetinin yükleme hızı. 7/24 gerekirse C (kartı kabul ederseniz) tek gerçekçi kalıcı-ücretsiz yol; hazırlamamı isterseniz söyleyin.

## Güvenlik
- Genel adresi açan herkes **Kayıt ol** diyebilir; adresi yalnız arkadaşlara verin (rastgele ve her çalıştırmada değişir).
- Yönetici parolası rastgeledir ve yalnız `.data/yonetici-parola.txt` dosyasındadır; kimseyle paylaşmayın.
