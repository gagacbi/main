# KUT — Nüfus simülasyonu raporu

Ham veri: `docs/balans/populasyon/ham.json` · **Her karakterin kendi raporu: [`oyuncular/`](balans/populasyon/oyuncular/README.md)** (150 dosya) · Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md)

{{META}}

## 1. Yöntem ve dürüstlük notları

* **Gerçek kod:** Dünya, veritabanı, RPC'ler, savaş, ganimet, boss, çatlak, PvP, pazar, oba — hepsi sunucunun gerçek kodudur (`tests/sim/population/`). Ağ ve görsel yoktur.
* **150 ayrı oyuncu, 10 arketip** (çekirdek farmcı, gündelik, boss avcısı, çatlak avcısı, PvP avcısı, tüccar, savunma teorisyeni, yeni başlayan, oba/sosyal, sürü izleyen). Her oyuncunun beceri doğruluğu, risk iştahı, bilgi düzeyi ve niyeti ayrı örneklenir. Nüfus yaşça karışıktır (Sv1–48 başlangıç).
* **Zaman hızlandırma (gerçekçilik korunarak):**
  1. Günde **4 gerçek-zamanlı dilim** (gece, sabah, ikindi, akşam; 10'ar dk) çalışır: o dilimde çevrimiçi herkes **aynı dünyada gerçek tick'lerle** oynar → kalabalık, boss, çatlak, PvP, pazar gerçektir.
  2. Dilimler arası **çevrimdışı süre gerçek saat sıçramasıyla** geçer (dinlenmiş XP, rüya, oba üretimi, posta).
  3. Günlük süresinin dilim dışında kalan kısmı, o oyuncunun **ölçülen** farm hızıyla (öldürme/dk, ölüm/dk; ölü/dinlenme süresi dahil) ölçeklenir ve **gerçek ödül tablolarıyla** (`rollDrops`, `addXp`) işlenir.
  4. **Boss, çatlak, PvP ölçeklenmez:** yalnızca gerçek dilimlerde yaşanır. Bu yüzden bu olayların günlük sayıları gerçeğin altındadır; **oranlar ve davranışlar** güvenilirdir, mutlak sayılar değil.
* Başlangıç durumu tohumlanmıştır (seviye, donanım, akçe); "1. günden başlayan sunucu" değil, "birkaç haftalık sunucu" simüle edilir.
* Sınırlar: oyuncu yapay zekâsı gerçek insan değildir; sosyal davranış (parti, sohbet, ticaret pazarlığı) yoktur.

## 2. Sonuçlar

**Seviye dağılımı** (gün 1 / orta / son):

{{LEVELS}}

**Arketip karşılaştırması:**

{{ARCH}}

**Ekonomi** (akçe arzı, Gini, pazar):

{{ECON}}

{{FLOW}}

{{MKT2}}

**Kalabalık ve kamp kullanımı:**

{{CROWD}}

{{CAMPS}}

**Boss'lar:**

{{BOSS}}

{{BOSSPLAY}}

**Çatlak:** {{RIFT}}

**PvP:** {{PVP}}

**Savunma türleri** (alınan hasar payı ve oyuncuların savunması):

{{DEF}}

{{DEFCMP}}

**Mini harita A/B** (aynı nüfus içinde: haritayı — kamp seviyesi rengi + doluluk sayısı — okuyan ve okumayan yeni/gündelik oyuncular):

{{MAPAB}}

**Ayrılma riski** (ödül sıklığı, ölüm oranı, durgunluk, kayıp eşya, zorbalık):

{{CHURN}}

**Performans:** {{PERF}}

## 2b. Yeni içerik (harita, PvP bayrağı, zindan, kostüm)

**Harita kullanımı:**

{{MAPUSE}}

**Kutlu Otlak A/B** (aynı tohum; yeni oyuncu Otlak'a gitmezse):

{{OTLAKAB}}

**İsteğe bağlı PvP bayrağı:** {{FLAG}}

**Zindanlar:**

{{DUN}}

**Kostüm (akçe sink'i):**

{{COS}}

## 3. Lamba analizi: ışık nerede, cevap nerede?

Her satır bir tur simülasyonun gösterdiği, **tablolarda aydınlık görünen** ama **gerçekte başka yerde olan** bir bulgudur.

| # | Aydınlık (ilk bakışta görünen) | Gerçek (raporlar gösterdi) | Yapılan |
|---|---|---|---|
| 1 | "PvP açık ama kimse zorla savaşmaz" | Kalabalık kampta alan becerisi karşı boydan oyunculara yan hasar veriyordu; 14 günde 10.473 PvP ölümü, saatte onlarca ölüm | Alan becerisi yalnızca çatışmaya girmiş (hedef seçmiş/saldırmış/düello) oyuncuya işler |
| 2 | Altın girişi "yaratık başına makul" | Günlük kaynak ≈ sink'in 11 katı; para arzı 14 günde 515 milyon (kişi başı 3,4 milyon) | Yaratık altını %45, Sv30 üstü yassılaştırıldı; efsun yenileme sink'i; **tekrarlayan sink hâlâ eksik (§4)** |
| 3 | "Pazar var, ilanlar listeleniyor" | 400 ilanın 397'si +0 çöp; ucuzdan pahalıya sıralama yüzünden değerli ilan hiç görünmüyordu; artı eşyaya bağlı oyunda ham eşya talep görmez | Varsayılan görünüm "bana uygun" + "fırsat" (fiyat/değer) sıralaması; tüccar "al-artı bas-sat" modeli; eski artılı donanım kıdemsizlere satılır |
| 4 | Kamp başına öldürme/dk | Kalabalık yoğunluk bonusu (hızlı yeniden doğuş) **kalabalığı ödüllendiriyordu** (4–6 kişide kişi başı hız tek kişiden yüksek) | Yoğunluk çarpanı yumuşatıldı (0,12/oyuncu, taban 0,4) |
| 5 | "Savunma türleri var, ölüm ekranı ipucu veriyor" | Oyuncunun o savunmaya **ulaşma yolu yoktu** (rastgele düşme) | **Efsun yenileme** (rastgele ucuz, seçerek 6×); savunma bilinçli oyuncular **saatte 2,7 ölüm, bilinçsizler 6,4**; ana tehdide karşı savunma %21 ve %4 |
| 6 | "Rütbe cezası var, PvP cezasız değil" | Cezayı "kurban yaratıkla dövüşüyorsa savaşmayan sayılmaz" kuralı etkisiz kılıyordu: 2.675 öldürmede 1 kırmızı ad | Ceza **ilk saldırana**: karşılık veren aklamaz; çok aşağıdakini avlamak çift ceza; düşük seviye koruması (−10 seviye ×0,25, −20 dokunulmaz) |
| 7 | Boss "öldü" sayıları | 9–11 kişilik sürü boss 5'i 6,8 sn'de öldürüyordu; ayrıca ilk ölçüm hatalıydı (simülasyon boss'a yaklaşamıyordu) | Boss canı vuran oyuncu sayısıyla büyür (+%30/kişi, 8'e kadar) |
| 8 | "Muhafız kırmızı adlıyı korkutur" | Kırmızı ad yurtta doğunca muhafız onu anında öldürüyordu: **ölüm döngüsü, PvP avcısı saatte 105 ölüm** | 8 sn yeniden doğuş koruması (saldırınca biter) |
| 9 | "42 kamp yeter" | Seviye 41–50'de 96 oyuncu, birkaç kamp; en kalabalık iki kamp tüm farm zamanının %43'ü | 64 kamp (41+ seviyede 15); mini haritada kamp seviyesi rengi ve **oyuncu sayısı** (kalabalık bilgisi oyuncunun baktığı yerde): HHI 0,105 → 0,057, haritayı okuyanlarda ölüm −%22 |
| 10 | "Yeni oyuncu aynı kuralla oynar" | Yeni başlayanın ayrılma riski en yüksek (%67–87 yüksek risk); ölümde XP kaybı, PvP ve eşya kaybı üst üste | Sv10 altı ölümde XP kaybı yok, Sv20 altı yarısı; düşük seviye PvP koruması; kamp tehlike renkleri |
| 12 | "Zindan ödülü güzel, zor mu zor" | İlk sürümde 429 koşunun %100'ü kazanıldı (2,4 dk); parti 4 sınırını aşıyordu; ölçümün kendisi de yanlıştı (dilim 10→2 dk kısaltılınca koşular yarıda kesiliyordu, süreler saat atlamalarını sayıyordu) | Parti sınırı; yaratık can ×2,2–2,6, saldırı ×1,6–1,9, boss can ×4–5; koşular dilim bitince tamamlanır; süre kazanma anından ölçülür → Demir %90–95 kazanma, ~5 dk; Gölge %69–77, ~10 dk; koşu başına ~0,6 ölüm |
| 13 | "Kostüm sink'i hedefi tutturdu" | Sink'in büyük kısmı **efsun yenileme kovalaması** (%40); kostümlerin %97'si Sade basamak (Şahane/Hanlık malzemesi darboğaz); ilk sürümde uzatma çok ucuzdu (%4) | Ömür 1 hafta ve bitince yok; uzatma ×1,8 pahalı (Sade 14, Hanlık 190 birim) → uzatma sink'in %10'u; yenileme kâğıt ister; sink/kaynak ≈ %50 (3 tohumda %49,5–50,4) |
| 14 | "Otlak yeni oyuncuyu korur" | Otlak A/B'de ölüm/sa ve seviye kazancı **aynı** (0,9; ~32,8); hayal kırıklığı Otlak'lı grupta biraz yüksek. PvP zaten bayrakla kapandığından Otlak'ın tek başına ölçülür faydası yok | Otlak tutuldu (maliyetsiz, PvP'siz giriş + ilk boss); değeri gerçek oyuncuyla sınanmalı |
| 11 | Raporun kendi sayıları | **Bizim ölçüm hatalarımız**: ölüm oranı yalnızca "canlı farm süresine" bölündüğü için şişiyordu; boss'a yaklaşma hatası; ilan listesi yalnızca en ucuz 400'ü görüyordu | Ölçüm düzeltildi (toplam süreye bölünür); `TEST_FELSEFESI` §3: *raporları da lambanın altında okumayız* |

## 4. Açık kararlar (önceki turun maddeleri ve durumu)

1. **Tekrarlayan altın sink'i** → *Kostüm sistemi eklendi* (§2b): sink/kaynak %23 → ≈ %50. Kostüm 1 hafta yaşar, bitince efsunlarıyla yok olur; uzatma yüklüdür. Kalan karar: Şahane/Hanlık basamağa ulaşan çok az oyuncu var (malzeme darboğazı) — ya zindan/tezgâh malzeme düşüşünü artırmak ya da bu basamakları "uzun hedef" olarak bırakmak.
2. **PvP zorbalığı** → *İsteğe bağlı bayrak + Otlak eklendi.* Bayraksızlar PvP'de hiç ölmüyor; bayraklı çiftçiler çok ölüyor (bayrak %10 bonus için pahalı görünüyor). Karar: bonusu artırmak mı (gerçek oyuncu bayrağı daha çok açar), yoksa PvP'yi avcılara bırakmak mı?
3. **Zirve içeriği** → *Erlik Diyarı + 2 zindan eklendi.* Zindan parti ölçeği ve güçlük gerçek oyuncularla ayarlanmalı (botlar zindanı fazla kolay buluyor).
4. **Pazar** yalnızca ekipman taşıyor; kostüm malzemeleri ve şans eşyaları bilinçli olarak takas edilemez (ikincil piyasa istemedik). Gelecekte malzeme pazarı açılabilir.

## 5. Çalıştırma

```bash
POP_N=150 POP_DAYS=14 POP_W=10 POP_SEED=7 npx tsx tests/sim/population/run.ts   # ≈ 8 dk
npx tsx tests/sim/population/report.ts                                          # karakter raporları + docs/POPULASYON_RAPORU.md
POP_NOMAP=1 ...                                                                 # haritayı kimse okumasın (A/B kontrolü)
POP_NOOTLAK=1 POP_OUT=docs/balans/populasyon-ab ...                             # yeni oyuncular Otlak'a gitmesin (A/B)
POP_NOCOS=1 / POP_NOERLIK=1 ...                                                 # kostüm / Erlik olmadan kontrol
```
