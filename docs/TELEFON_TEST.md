# Telefondan yönetici olarak test (uzaktan)

## Neden bulut ortamından (Claude oturumundan) bağlanamıyorsun?
Claude'un çalıştığı bulut kutusu **yalnızca dışarıya** (izin listeli bir vekil sunucu üzerinden) konuşabilir; dışarıdan o kutuya gelen hiçbir bağlantı kabul edilmez ve tünel hizmetlerinin adresleri (trycloudflare, loca.lt, serveo, ngrok…) ile `cloudflared` indirme adresi (GitHub releases) bu ağ politikasında kapalıdır. Yani sorun oyunda ya da Cloudflare'de değil, **kutunun ağ politikasında**: oradan genel bir URL üretilemez. Aynı tünel kendi bilgisayarında sorunsuz çalışır.

## Senin yapacakların (bilgisayarda 1 komut, telefonda 1 adres)
1. Bilgisayarında (Node 22.5+): `git clone` → depoyu aç, dalı seç: `git checkout claude/bold-mendel-d9as4v`
2. `npm run play:share`
   - İlk seferde kurulum + derleme + yönetici hesabı + Cloudflare tünelini kendisi yapar (birkaç dakika).
   - Çıktıdaki **"ARKADAŞLARA VER → https://….trycloudflare.com"** adresini telefondan aç.
   - Tünel kurulamazsa aynı Wi-Fi'da `npm run play` ve çıktıdaki `http://<LAN-ip>:2567` adresi.
3. Telefonda giriş: ad **Yonetici**, parola → bilgisayardaki `.data/yonetici-parola.txt` (komut çıktısında da yazar).

## Telefonda ne var
- Ekranın altında ortada kırmızı **YÖNETİCİ** düğmesi (yalnız admin hesapta) → tek dokunuşla panel.
- Panelin en üstündeki yeşil **★ Test paketi**: öğreticiyi atlar, Sv 25, +9 kit, 20.000 akçe, kitap/tılsım/yazıt verir, canı doldurur.
- Altında tek dokunuşluk kısayollar (ışınlanma, boss, zaman, çakal sürüsü, tüm ipuçları…). Komut satırı `a; b; c` biçiminde birden çok komut kabul eder.

## Test listesi (sırayla)
| # | Ne | Beklenen |
|---|----|----------|
| 1 | Sanal joystick ile yürü, saldırı/E düğmeleri | Karakter hareket eder, saldırır |
| 2 | İki parmakla yakınlaştır, tek parmakla kamerayı çevir | Kamera tepki verir |
| 3 | YÖNETİCİ → ★ Test paketi | Seviye 25, eşyalar gelir |
| 4 | G (Alp Rehberi) | Görev listesi, pusula oku |
| 5 | Balık tut → Ayıkla | Tutma şansa bağlı |
| 6 | Çakal ×10 / Albastı ×6 çağır, birine vur | Sürü yardıma gelir |
| 7 | Boss 1'e git, anahtarı düşür, sandığı aç | Anahtar + sandık akışı |
| 8 | Kut Taşı (Demirci) | Taş tak/rafine et |
| 9 | Yeni hesap aç (Kayıt ol) ve öğreticiyi yap | 7 adım görev akışı |

## Dürüst notlar
- Dokunmatik kontroller yalnızca Chromium dokunmatik emülasyonunda sınandı; **gerçek cihazda ilk kez sen deniyorsun**. Takılan yeri (model, tarayıcı, ekran boyutu) yaz, düzeltirim.
- Gerçek GPU başarımı ölçülmedi.
- Bilgisayar ve komut penceresi açık kaldıkça oynanır; adres her çalıştırmada değişir.
