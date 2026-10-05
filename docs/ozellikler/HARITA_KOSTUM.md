# Özellikler: haritalar, isteğe bağlı PvP, zindan, kostüm — Lamba Testi

Bu belge [`OZELLIK_SABLONU.md`](../OZELLIK_SABLONU.md) şablonuyla doldurulmuştur. Üç talebin (kostüm akçe akışı, isteğe bağlı PvP + yeni oyuncu bölgesi, 41–50 için zindan ve alternatif harita) tasarımı, **nüfus simülasyonunda ölçülmeden önce** yazılan "nerede kırılır?" soruları ve sonuçları. Ölçümler: [`POPULASYON_RAPORU.md`](../POPULASYON_RAPORU.md) §6.

## Mimari karar: tek dünyada uzak bölgeler

Her harita ayrı bir oda yerine **aynı World içinde, birbirinden ≥ 300 birim uzak merkezlerde** durur (`shared/maps.ts`). Böylece tek 20 Hz döngü, mevcut protokol ve oyuncu verisi korunur; yeniden bağlanma yok. Bedeli ve önlemleri:

| Risk (kesişim) | Önlem | Kanıt |
|---|---|---|
| Çarpışma ızgarası anahtarı yalnızca ±100 hücrede çalışıyordu → uzak bölgelerde anahtar çakışması | Anahtar ±1000 hücreye genişletildi | `maps.test › stepMove: bölge sınırı` |
| `stepMove` dünya sınırını *merkeze göre* kısıyordu → uzak bölgede oyuncu yurda ışınlanırdı | Sınır ve "yaratık güvenli bölgeye giremez" kuralı **bölgenin kendi merkezine** göre | aynı test |
| Boş bölgedeki ~400 yaratık her tick güncellenirdi | Oyuncusu olmayan bölgede yaratık uyur (yaralılar eve döner ve iyileşir) | `maps.test › boş bölgelerde yaratık güncellenmez` |
| Çatlak yalnızca Bozkır'da açılırdı; Erlik'te açılsa yurt ölçüleriyle yerleşirdi | Çatlak, **içinde oyuncu olan** çatlaklı bölgeyi seçer; bölge ölçüleri kullanılır | `openRift` |
| Pazar/demirci/oba "güvenli bölge" kontrolü artık Otlak kampında da doğru çıkardı (pazarı her yerde açmak) | Yalnızca `inHubTown` | `market.test` (mevcut) |
| Zindanda ölen oyuncu yurda (başka dünya) doğardı | `respawnPoint`: bölgenin kendi güvenli kampı; zindanda Erlik kampı | `dungeon.test › zindanda ölen` |

## 1. Kutlu Otlak (yeni oyuncu bölgesi)

**Amaç:** Yeni oyuncu "oyuncular tarafından avlanma + kalabalık + yüksek seviye yaratık" üçlüsünden korunur; ilk boss ve ilk hedefler orada.

1. *Nereye bakar?* Öğretici ilk adımı ("Kapı Taşı ile Kutlu Otlak'a geç") ve doğduğu yerin yanındaki Kapı Taşı; bölgeye girince **bölge adı + PvP kuralı** toast'ı, HUD'da bölge etiketi, mini harita. → Kural girişte okunur.
2. *En kolay yol?* Otlağı hiç kullanmamak. Kullanmayana ceza yok ama ödül (tehlikesiz XP, boss) yalnızca orada → ışık orada. Sv 20'den sonra girilemez: yüksek seviyeli oyuncunun Otlak'ta "yeni oyuncu avlaması" yolu kapalı.
3. *Herkes giderse?* Kamp sayısı 26; yalnızca Sv ≤ 20 girebildiği için kalabalık sınırlı. Kamp seviyeleri merkezden uzaklıkla 1→14 artar (harita rengiyle okunur).
4. *Işık sönerse?* Kapı Taşı bulunmazsa oyuncu Bozkır'da başlar (eski deneyim, kaybolmaz).
5. *Seviye grupları:* 1 saatlik oyuncu Otlak'ta; Sv 15–20 isteğe bağlı; sonrası Bozkır.
6. *Sessiz başarısızlık:* Otlak'ta öğrenilen alışkanlıkların Bozkır'da (PvP, savunma türü) cezalandırması → Otlak'ta da yaratık hasar türü etiketi ve ölüm ekranı ipucu aynıdır.
7. *Ölçü:* ölüm/sa ve seviye kazancı **A/B** (Otlak açık / kapalı, aynı tohum): bkz. rapor §6.

## 2. İsteğe bağlı PvP bayrağı

1. *Nereye bakar?* Sağ üstte kalıcı `PvP: Açık/Kapalı` düğmesi, rakibin isim levhasında ⚔ işareti ve kırmızı nokta; bölge PvP'ye kapalıysa düğme "Kapalı" ve pasif.
2. *En kolay yol?* Bayrağı hiç açmamak (güvenli). Açmak için neden var? **%10 yaratık XP/akçe bonusu** + PvP avcısına av. Açgözlü oyuncu bonus için açar, avcı da onları bulur: bu rızaya dayalı bir risk-ödül.
3. *Herkes açarsa?* Eski "açık PvP" durumuna döner; bonus herkese gittiği için bayrağın avantajı kalmaz — simülasyon bunu ölçer (bayraklı payı).
4. *Işık sönerse?* Bayrağı açık unutan: `sys.pvp_on` mesajı ve düğme rengi; kapatma PvP'den 30 sn sonra (bayrak "kaçış" aracı olmasın).
5. *Seviye grupları:* yeni oyuncu varsayılan kapalı; Otlak/zindan zaten kapalı.
6. *Sessiz başarısızlık:* "Neden vuramıyorum?" — rakip bayraksız. Hedefe yüzü dönük ipucu: isim levhasında ⚔ yoksa PvP yok.
7. *Ölçü:* PvP ölümlerinde bayrak dağılımı; bayraksız oyuncuların PvP ölümü (0 olmalı), gank payı.

Rütbe cezası: bayraklı alp rızaen savaşır, ceza yalnızca aynı boydan ya da ≥ 6 seviye aşağıdan öldürene.

## 3. Erlik Diyarı ve zindanlar (Sv 38–54)

1. *Nereye bakar?* Erlik kampındaki Kapı Taşı paneli: ücret, günlük kalan hak, parti durumu ("2 alp, 18 sn sonra başlar"), seviye şartı.
2. *En kolay yol?* Her gün 3 hak × boss = en hızlı XP/ödül. **Hak sınırı + ücret** (900/2.200 akçe) onu "ucuz bedava" olmaktan çıkarır; solo giriş açık (parti şart değil), ama parti ölçeği (can +%40/kişi) tek kişiyi cezalandırmaz.
3. *Herkes giderse?* 6 eşzamanlı örnek/zindan; dolarsa ücret iade ("tüm odalar dolu"). Parti toplama penceresi 30 sn.
4. *Işık sönerse?* Zindan içinde HUD çubuğu: dalga sayacı, kalan süre, çıkış düğmesi. Ölen oyuncu Erlik kampında doğar (deneyim kaybı yok: ücret + hak zaten bedel).
5. *Seviye grupları:* Sv 38–40 Erlik kampı; 41+ Demir Madeni; 46+ Gölge Mağarası.
6. *Sessiz başarısızlık:* parti toplanırken kapıdan ayrılan ücret kaybetmez (iade, ledger'da `dungeon.refund`); çevrimdışı kalan oyuncu kamp kapısında uyanır; süre dolunca zindan "kaybedildi", ücret iade edilmez (bilinçli).
7. *Ölçü:* kazanma oranı, ort. süre, koşu başına ölüm, günlük zindan sink'i; "bir zindan kaç dakikalık farma eşit?"

## 4. Kostüm (akçe sink'i)

Kullanıcı talebi: *kostüm süreli; efsunlama ve değiştirme akçeyle; efsunları korumak için akçeyle +1 hafta uzatma; minimal özellik; tezgâhta günlük/haftalık akçeyle üretilen malzeme; şansa bağlı üretim; şans eşyaları; yüksek sink.*

Tasarım ilkesi: **güç değil bağlılık satın alınır.** Tek kostüm yuvası, bütün satırlar normal efsun aralığının %40–60'ı (en iyi kostüm bile bir parça efsunundan zayıf; test: `kostüm minimal`).

| Aşama | Kural | Neden sink |
|---|---|---|
| Tezgâh | Günlük tur 1 birim akçe/24 sa; haftalık tur 5 birim/7 gün (7 tur). Çıktı rastgele: lif/boya/ipek/nakış + nadir şans eşyası | Her gün tekrarlanan küçük harcama; çevrimdışıyken de çalışır (bitiş zaman damgası) |
| Üretim | Basamak Sade/Süslü/Şahane/Hanlık: akçe 4/12/35/90 birim + malzeme; başarı %85/60/38/18; her başarısızlıkta +%4 "şans payı" (tavan +%25); **başarısızlıkta malzeme ve akçe gider** | Beklenen deneme sayısı yüksek → yüksek sink; payı tavan olduğu için umutsuz değil |
| Şans eşyaları | Boncuk +%8 (en çok 3), Düğüm başarısızlıkta malzemenin %60'ı geri, Nazar efsunda iki zarın iyisi. Tezgâhtan akçeyle (6/14/10 birim), tezgâh/zindan düşüşü | Şansı akçeyle satın alma da sink; ücretsiz yol (zindan/tezgâh) yavaş |
| Efsunlama | Satır ekle (4×(1+satır)), tümünü değiştir, tek satır değiştir; her yenileme sonrakini %15 pahalı yapar; görünüm değiştirme 3 birim | Kovalama döngüsü; maliyet artışı sonsuz kovalamayı kısar |
| Süre ve uzatma | 14 gün; **süre dolunca efsunlar da gider**; +1 hafta: Sade 1,5 · Süslü 4 · Şahane 10 · Hanlık 24 birim × (1+0,2×satır); en çok 4 hafta ileri; süresi dolunca 3 gün tolerans, 2× | Yatırım (efsun) ne kadar büyükse uzatma o kadar pahalı → sürekli akış; tek seferde yıllık satın alma yok |

Birim: `costUnit(seviye) = 40·seviye^1,6` (Sv10 ≈ 1,6 bin, Sv30 ≈ 9 bin, Sv45 ≈ 18 bin akçe). Maliyet oyuncunun o seviyedeki gelirine oranla sabit kalır; kostüm düşük seviyede ucuz, zirvede pahalı.

1. *Nereye bakar?* Tezgâh paneli: her kartta kalan süre (son 2 gün kırmızı), uzatma düğmesinde fiyat, "başarı şansı %" ve "şans payı". Süre dolmaya yakın sohbet uyarısı (`sys.cos_soon`).
2. *En kolay yol?* Hiç ilgilenmemek (kayıpsız) ya da yalnızca en ucuz kostümü tutmak. Tehlike: **ucuz basamak + tek satır + uzatma** kalıbı en kârlı "bakım". İstenen: ilgili oyuncu kendini uzatma ödemeye bağlı hisseder, ilgisiz oyuncu bundan zarar görmez.
3. *Herkes ilgilenirse?* Sink/kaynak oranını yükseltir (hedef); tersine enflasyon fiyatları artırmaz çünkü maliyet seviyeye bağlı sabit birimdir. Kostüm takas edilemez (pazara konmaz) → ikincil fiyat çöküşü yok.
4. *Işık sönerse?* Süresini unutan oyuncu efsunları kaybeder: uyarı + 3 gün tolerans + panelde "kurtar" düğmesi.
5. *Seviye grupları:* Sv 1–11 yalnızca Sade; Sv 12 Süslü; Sv 28 Şahane; Sv 42 Hanlık.
6. *Sessiz başarısızlık:* Üretim başarısızlıkları oyuncuyu küstürür → şans payı, düğüm, boncuk; sonuç metni "bir sonraki deneme biraz daha şanslı".
7. *Ölçü:* sink/kaynak oranı, kostüm sink'inin payı, ilgilenen oyuncunun gelirine oranı (ölçü: "gelir/sink toplamı" bir oranı gizler — tek tek karakter raporlarında bakılır).
