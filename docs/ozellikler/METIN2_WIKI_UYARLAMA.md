# Metin2 wiki incelemesi → KUT uyarlaması (taslak, onay bekliyor)

Kaynak: tr-wiki.metin2.gameforge.com (Görev Listesi, Av Görevleri, Günlük Görevler, Balıkçılık, Pet Sistemi, Ejderha Taşı Simyası, Element Yazısı). Okunamayanlar: `Objets_de_raffinage` (404), Savaşçı kask/zırh/silah sayfaları (henüz okunmadı), Av Görevleri sayfasının son ~5000 karakteri.

## 1. Av Görevleri → "Alp Avı" (öneri: ilk iş)
Wiki: her seviye atlayışında otomatik verilir; seviye başına 2 hedef yaratık grubu + ödül paketi; seviyesi geride kalan görev en fazla %1 EXP verir; atlanan görev geri gelmez.
KUT: kamp türleri (`campTypesForLevel`) zaten seviyeye bağlı → hedefler kamp türlerinden **türetilir**, elle liste yazılmaz.

| Ayar | Öneri |
|---|---|
| Veriliş | Seviye atlayınca otomatik, Ak Sakal görev kutusunda "Av" satırı |
| Hedef | O seviye bandının 2 yaratık türü, 10–40 adet (seviyeyle artar) |
| Ödül | %15 XP (wiki gibi), her 5 seviyede sınıfa uygun +0 eşya, her 10'da kitap/tılsım |
| Akçe | **Yok ya da ihmal edilebilir** — ekonomi kilitli (mob akçesi %100, Kımız baseline). Akçe eklenirse sim ile yeniden ölçülmeli |
| Geride kalma | Seviye atlanmışsa XP %1; atlama ("Av'ı atla") var, geri alınamaz |

## 2. Günlük görevler → "Obanın Günlüğü"
Wiki: 50. seviyeden itibaren günde 5 görev, ödül rastgele (XP / 5.000 Yang / İksir Sandığı / Cor Draconis), 5'i bitirince Günlük Hediye, 05:00'te sıfırlanır.
KUT: Sv 30+, günde 4 görev (öldür / topla / çatlak kapat / zindan), ödül rastgele (XP, Kımız, tılsım parçası, Yıllık puanı), hepsi bitince Oba hazinesine katkı. Gün sınırı mevcut `dungeonDay` ile aynı. Hikâye bağı: görevler Yıllık'a "obanın günlüğü" olarak yazılır.

## 3. Balıkçılık → "Göl Avı" (öneri: en küçük, bağımsız iş)
Wiki: Sv 30+, olta 5.000 Yang, yem şart (hamur/solucan), su kenarında, minigame: 15 sn içinde daire kırmızıyken 3 doğru tıklama; olta puanla gelişir (başarı %39, başarısızlıkta puanın %10'u gider); balıklar pişirilince buff verir; nadir balık: EXP buff; Altın Ton Balığı: serbest bırak / kes / yem yap seçimi.
KUT uyarlama:
- Yer: hub gölü (`HUB.pond`, r 8.5). Su kenarı halkasında E ile olta atılır.
- Mini oyun: 12 sn, hareket eden halka, 3 doğru tıklama; hata süreyi kısaltır.
- Yem: Hamur (NPC) / Solucan; minik balık tutulan balıklardan yem olur.
- Balık: pişirme = Kamp ateşi (Otağ) üstünde. Buff'lar **Kımız ile çakışmasın**: iyileşme değil, kısa süreli (10 dk) buff: hız, saldırı hızı, kritik; nadir: %XP buff (üst sınır %+20).
- Altın Ton → "Gölün Atası": serbest bırak (Yıllık'a işlenir + herkese kısa buff), kes (nadir malzeme), yem yap.
- Hikâye bağı: nadir balık içinden Mühür kırığı ipucu çıkabilir (balıkçıya özel iplik).
Ekonomi notu: balık satışı pazarda serbest olursa yeni bir akçe kaynağı olur → NPC satış değeri düşük, buff'lar pazarda alınıp satılır (kaynak değil, **sink** olarak kurgulanır).

## 4. Artı basma (referans metin ↔ mevcut)
| Metin2 | KUT'ta şu an | Fark/öneri |
|---|---|---|
| +0…+9, başarısızlıkta yanma/düşme | +9 sınırı, kitap/tılsım | Yanma riski mevcut sistemle uyumlu; yeni mekanik gerekmiyor |
| +4/+6'dan sonra canavar malzemesi | Cevher/deri/odun + kitap | "Ayı Safrası" tarzı mob-özel malzeme: kamp türü → malzeme tablosu (öneri) |
| Kutsama Kağıdı (yanma yok, 1 düşer) | Tılsım benzeri | Aynı işi görüyorsa ayrı eşya ekleme; farkı: tılsım şansı artırır, kağıt yanmayı düşüşe çevirir (öneri) |
| Efsun (5 bonus) | Var (3 satır, yeniden çevirme) | Tamam |
| Element yazısı (+7 silah, 6 element, 3 sevye, madalya + yüksek Yang) | Yok | v1.2 adayı: 6 element (Ateş/Buz/Şimşek/Toprak/Rüzgâr/Karanlık), +7 ve üstü; yüksek akçe **sink** olarak değerli |
| Ejderha Taşı Simyası (7 taş, sınıf/saflık/seviye, set bonusu, çıkarma riski) | Yok | Büyük sistem; "Kut Taşları" olarak sonra |
| Pet (yumurta, evrim, ömür, protein) | Yok (Yoldaş var) | Mevcut Yoldaş sistemine evrim/ömür katmak daha ucuz |

## Önerilen sıra
1. Alp Avı (seviye bağlı otomatik görev) — küçük, ekonomiyi bozmaz
2. Göl Avı (balıkçılık) — bağımsız, gölet hazır
3. Obanın Günlüğü (günlük görev)
4. Element yazısı (sink olarak), sonra Kut Taşları / Yoldaş evrimi

Durum: **Alp Avı ve oyun içi Wiki (U) yapıldı**; Göl Avı, Obanın Günlüğü, Element yazısı beklemede.
