# KUT — Tengri'nin Kutu

## Tek tıkla oyna

Gereken: [Node.js 22.5+](https://nodejs.org). Sonrası otomatik (kurulum → derleme → yönetici hesabı → sunucu → tarayıcı):

| Sistem | Nasıl |
|---|---|
| Windows | `OYNA.bat` dosyasına çift tıkla |
| macOS | `OYNA.command` dosyasına çift tıkla (ilk seferde sağ tık → Aç) |
| Linux | `./oyna.sh` |
| Hepsi | `npm run play` |

Yönetici hesabı: ad `Yonetici`, parola **ilk çalıştırmada rastgele üretilir**, pencerede yazılır ve yalnız bu bilgisayarda `.data/yonetici-parola.txt` dosyasında durur (seviye 50, 100.000 akçe; sohbete `/gm help`, F2 yönetici paneli). Kapatmak için pencerede Ctrl+C. Port doluysa `PORT=2600 npm run play`.


Türk ve Orta Asya mitolojisinden esinlenen, neşeli ve renkli, **tarayıcıda kurulumsuz** oynanan 3D MMORPG.
Bu depo, [PRD](docs/ACCEPTANCE.md)'nin **Prototip aşaması (Aşama 2)** kapısını sağlayan oynanabilir oyunu içerir:
tek bölge, Alp sınıfı, Metin2 tarzı savaş ve yaratık toplama, ganimet, artı basma, oba (2 bina + yoldaş seferi),
Erlik çatlakları, boylar/PvP/derece, veritabanı kaydı ve çok oyunculu sunucu.

> Teslim raporu: [`docs/TESLIM_RAPORU.md`](docs/TESLIM_RAPORU.md) · Kabul kriterleri: [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) · Kanıtlar: [`docs/evidence/`](docs/evidence)


### Arkadaşlarla oyna (ücretsiz, hesap/kart gerekmez)

`OYNA-ARKADASLA.bat` (Windows) · `OYNA-ARKADASLA.command` (macOS) · `npm run play:share` (hepsi). Normal başlatıcının yaptığına ek olarak Cloudflare Tunnel ile **genel bir adres** açar; pencerede `ARKADAŞLARA VER → https://….trycloudflare.com` yazar. Arkadaşlar adresi açıp **Kayıt ol** der.
- Sunucu senin bilgisayarında çalışır: bilgisayar ve pencere açık olduğu sürece oynanır; veriler (hesaplar, karakterler) bilgisayarında kalır.
- Adres her çalıştırmada değişir. Aynı Wi-Fi'deki arkadaşlar için yerel adres de yazılır (`http://192.168.x.x:2567`).
- Ekonomi ölçümü sonra: `npx tsx scripts/economy-report.ts .data/kut.db 7`
- Diğer barındırma seçenekleri ve ödünleşimleri: `docs/BARINDIRMA.md`

## Hızlı başlangıç

Gereksinim: Node.js ≥ 22.5 (dahili `node:sqlite` kullanılır; ek veritabanı kurulumu gerekmez).

```bash
npm install
npm run build        # istemciyi derler (dist/)
npm start            # sunucu + istemci → http://localhost:2567
```

Geliştirme (canlı yenileme): `npm run dev` → istemci `http://localhost:5173`, sunucu `:2567`.

| Komut | Ne yapar |
|---|---|
| `npm test` | Birim + sunucu entegrasyon testleri (80 test; gerçek Colyseus + gerçek SQLite) |
| `npm run typecheck` | TypeScript tür denetimi |
| `npm run e2e` | Gerçek Chromium ile uçtan uca kanıt; ekran görüntüleri `docs/evidence/` altına yazılır |
| `npm run build` | Tür denetimi + üretim derlemesi |
| `npm run admin` | Yönetici (GM) hesabı yönetimi: `npm run admin -- create <ad> [parola]`, `promote/demote <ad>`, `list` (yalnızca yerelde, doğrudan veritabanına) |
| `npm run sim` | Hızlandırılmış bot denge simülasyonu (tam ≈ 25 dk; `SIM_QUICK=1` ≈ 2 dk) → `docs/balans/sonuc.json`; `npx tsx scripts/make-balance-report.ts` ile [`docs/BALANS_RAPORU.md`](docs/BALANS_RAPORU.md) üretilir |
| `npm run verify` | Hepsi: tür denetimi → derleme → testler → e2e → rapor (kanıtsız kriter varsa hata verir) |

## Yönetici (GM) hesabı ve test

Yönetici rolü **yalnızca yerel komut satırıyla** verilir (oyun içinden, istemciden veya ağdan verilemez; her GM komutu sunucuda rolü yeniden doğrular):

```bash
npm run admin -- create Yonetici sifre123   # seviye 50, 100.000 akçe, rol=admin
npm start                                   # sonra oyuna Yonetici ile gir
```

Oyunda `F2` (veya `/gm yardım`) yönetici panelini açar: seviye/kit/akçe/malzeme verme, ölümsüzlük, bekleme sıfırlama, ışınlanma (`tp hub|rift|stone N|player ad`),
yaratık çağırma, kukla ve DPS ölçümü, çatlak aç/kapat, zaman ileri sarma (oba ve sefer sayaçları), tüm ipuçlarını açma, `stats/ttk/econ` ölçümleri. Her GM işlemi `ledger`'a `gm` olarak yazılır.

## Savunma, boss ve test felsefesi

* **Savunma (Metin2 tarzı):** 5 silah türü (kılıç, çift el, bıçak, yay, büyü çanı), tür savunmaları, vuruş/beceri bloğu, delme; her parçada temel efsun. Karakter paneli (`C`) hepsini gösterir.
* **Saha bosları:** her 10 seviyelik grupta bir boss (alan darbesi, öfke, boss'un hasar türüne karşı savunma efsunlu garanti ganimet, 15 dk'da yeniden doğar); 10·20·30·40·50'de Kut Armağanı; seviye grubuna göre renkli aura.
* **Pazar (`P`):** oyuncular arası ilan/satın alma; %5 vergi + %1 ilan ücreti (akçe sinki), yeni hesap 48 sa ilan veremez, fiyat tavanı; varsayılan görünüm "bana uygun" + "fırsat" sıralaması. **Efsun yenile** (Demirci): rastgele ucuz, istediğini seçmek 6×.
* **Tasarım felsefesi (lamba etkisi):** [`docs/TASARIM_FELSEFESI.md`](docs/TASARIM_FELSEFESI.md), özellik şablonu [`docs/OZELLIK_SABLONU.md`](docs/OZELLIK_SABLONU.md); **150 oyunculu nüfus simülasyonu** ve karakter başına raporlar: [`docs/POPULASYON_RAPORU.md`](docs/POPULASYON_RAPORU.md) (`npx tsx tests/sim/population/run.ts`).
* **Test felsefesi:** [`docs/TEST_FELSEFESI.md`](docs/TEST_FELSEFESI.md) (sokak lambası etkisi) ve PvP eşleşme matrisi: `npx tsx tests/sim/pvp.ts`.

## Haritalar, PvP bayrağı, zindan ve kostüm

* **Haritalar:** tek dünyada üç uzak bölge — **Yazık Bozkır** (ana saha, Sv 1–48), **Kutlu Otlak** (yeni oyuncu bölgesi: Sv 1–14 kamp, ilk boss, PvP yok, Sv 20'den sonra girilmez), **Erlik Diyarı** (zirve: Sv 38–54 kamp, 3 boss, çatlaklar). Yurdun güneydoğusundaki **Kapı Taşı** (`E`) bölgeler arası geçirir; dövüşten sonra 8 sn beklenir.
* **İsteğe bağlı PvP:** sağ üstteki `PvP` düğmesi ya da `/pvp`. İki taraf da bayraklıysa vuruşulur (güvenli bölge, Otlak ve zindan hariç); bayraklıyken yaratıklardan %15 fazla kazanırsın (XP, akçe, eşya düşüşü); kapatmak için PvP'den 30 sn uzak durulur.
* **Zindanlar** (Erlik kampındaki Kapı Taşı): **Demir Madeni** (Sv 41+) ve **Gölge Mağarası** (Sv 46+). 4 kişilik parti (30 sn toplanma) ya da tek başına; giriş ücreti akçe, günde 3 hak; dalgalar + boss; süre sınırlı; boss garanti destansı+ ganimet, kostüm malzemesi ve şans eşyası düşürür.
* **Kostüm** (yurttaki **Dokuma Tezgâhı**, `E`): süreli, minimal özellikli giysi. Tezgâh günlük/haftalık ücretle malzeme dokur → şansa bağlı kostüm üretimi (Şans Boncuğu / Koruyucu Düğüm / Nazar Taşı şansı artırır) → efsunlama, değiştirme, görünüm değiştirme → **efsunlar yalnızca kostüm yaşadığı sürece kalır; akçeyle +1 hafta uzatılır**. Maliyetler seviyeyle ölçeklenir (`shared/costume.ts`).
* Tasarım gerekçeleri ve lamba testi cevapları: [`docs/ozellikler/HARITA_KOSTUM.md`](docs/ozellikler/HARITA_KOSTUM.md). GM: `/gm tp otlak|erlik`, `/gm cos mats|give|expire|loom`.

## Gizem

Oyunun bir sırrı var: *Mühür dışarıdan açıldı.* Beş ayrı sistem birer iplik besler (Kayıp Yazıtlar, Kurdun Rüyaları, Ak Sakal, Balbal Taşları, Mühür Kırıkları);
`Y` kodeksi hepsini toplar. Dört ipliğin ucu birleşince "Mühürün Dışı" açılır — ama dıştaki elin kim olduğu bilerek yazılmamıştır (bkz. [`docs/GIZEM.md`](docs/GIZEM.md)).

Ortam değişkenleri: `PORT` (2567), `KUT_DB` (`.data/kut.db`), `KUT_MAX_PER_LAYER` (150), `KUT_TEST=1` (zaman ileri sarma ucunu açar; yalnızca test).

## Nasıl oynanır

| | |
|---|---|
| Yürü | `WASD` / oklar · yere tıkla · sağ tuşla sürükle: kamera · tekerlek: yakınlaş |
| Saldır | `Boşluk` basılı tut (en yakın yaratığa otomatik) · yaratığa tıkla: hedef seç |
| Yetenekler | `1`–`6` (Kılıç Savurma, Yer Sarsıntısı, **Çağrı Narası**, Tengri Kalkanı, Zehirli Kesik, Tengri Hiddeti) |
| Paneller | `I` çanta · `C` karakter · `K` yetenekler · `O` oba · `Y` yazıtlar · `H` yardım · `E` etkileşim · `Enter` sohbet · `M` ses |

Önce **Ak Sakal** ile konuş (`E`). Yazık Bozkır'da yaratık topla, ganimet yağmurunu topla, **Demirci**'de eşyanı artı bas,
**Otağ**'a kaynak bağışla, bina yükselt, yoldaşlarını sefere gönder. Bozkırda rastgele açılan **Erlik çatlaklarını** kapat.

## Mimari

```
shared/   Oyun kuralları (tek kaynak): formüller, tablolar, dünya üretimi, protokol tipleri
server/   Node.js + Colyseus (yetkili sunucu) + node:sqlite (kalıcılık) · World (savaş, YZ, çatlak, ganimet, oba)
client/   Babylon.js + TypeScript + Vite · toon shader + kontur · HUD/paneller (HTML/CSS) · üretilmiş ses
tests/    unit/ · integration/ (gerçek sunucu + gerçek istemci protokolü) · e2e/ (Chromium)
```

* **Sunucu yetkili:** istemci yalnızca girdi (yön, saldırı, yetenek, RPC) yollar. Hasar, isabet, ganimet, yükseltme sonucu ve
  ekonomi yalnızca sunucuda hesaplanır; her ekonomi işlemi `ledger` tablosuna yazılır.
* **Offline ilerleme:** oba yükseltmesi ve yoldaş seferleri *bitiş zamanı* olarak veritabanına yazılır; sonuç giriş yapıldığında hesaplanır.
* **Katmanlama:** bölge odası `KUT_MAX_PER_LAYER` doluluğunda ikinci katmana bölünür; oymak arkadaşı `/api/layer` ile aynı katmana yönlendirilir.
* **Görsel:** bantlı cel-shade (serin gölge + sıcak ışık), ters-gövde kontur, kilim/tamga motifleri, tepe renkli ilkel parçalardan üretilmiş
  modeller (dış asset yok), parçacık efektleri, bloom + MSAA. Kalite ayarı: Yüksek/Orta/Düşük (düşük FPS'te otomatik düşer).
* **Ses:** WebAudio ile üretilmiş kopuz esintili pentatonik ezgi, davul, höömey benzeri bordo ve efekt sesleri; dış ses dosyası yoktur.
