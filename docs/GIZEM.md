# KUT — Gizem Kitabı (tasarım belgesi, **spoiler içerir**)

> Bu belge ekibin içindir. Oyuncu yalnızca ipuçlarını bulur; hiçbir yerde "cevap" yazmaz.

## 1. Tek cümlelik sır

**Mühür içeriden kırılmadı; dışarıdan, gökten bir el kilidi kendi anahtarıyla açtı.**
Oyuncuya "Erlik kaçtı, mührü kır" anlatılır. Gerçekte Erlik bir tutsak değil **bekçidir**; kapının ardında ondan eski bir açlık uyur.
Kut, bir ödül değil, **anahtarın dişleridir**: her alp bilmeden bir diş taşır. Anahtar tamamlanırsa kapı kapanmaz — *bir kez, bir yöne açılır.*

## 2. Üç soru, bir boşluk

| Soru | Oyun içi yanıt (ipucundan çıkarılabilir) |
|---|---|
| Kut neden çok kişiye verildi? | Anahtar çok parçalı. |
| Ak sakallar ne saklıyor? | Kapının hangi yanında durduklarını. |
| Kurt kim? | Kapıyı kapatıp içeride kalan ilk alp. |
| **Dıştaki el kimin?** | **Bilerek yazılmadı** (`truth.1` son cümlesi: "Bu satır henüz yazılmadı."). |

Boşluk bir eksik değil, bir **tasarım kaldıracıdır**: sonraki aşamalardaki kale kuşatmaları, Kam/Mergen sınıfları ve boy savaşı bu cümleyi
yazma hakkı olarak sunulabilir (bkz. §6). Dokunulmaz kural: cevap, oyuncuların *seçimiyle* yazılır; anlatıcı vermez.

## 3. İpliklerin ayrı sistemlerden beslenmesi

Her iplik **farklı bir oyun sisteminin** ödülüdür; hiçbiri tek başına gerçeği vermez, hepsi birbirini tamamlar.

| İplik | Besleyen sistem | Kural (`shared/lore.ts`) | Boyut | Sahibi |
|---|---|---|---|---|
| **Kayıp Yazıtlar** `insc` | Yaratık/çatlak/sefer yazıt parçaları (`frag`) | Sunucu çapı eşik 40·120·300·700·1500 parça | 5 | Tüm sunucu (birlikte çözülür) |
| **Kurdun Rüyaları** `dream` | Çevrimdışı kalıp dönmek | ≥ 4 saat çevrimdışı → sıradaki rüya (`pendingDream`), "Uyan" ile kaydedilir | 5 | Oyuncu |
| **Ak Sakal'ın Sözleri** `elder` | Seviye ve NPC ziyareti | Sv 3·8·14·20·28'de Ak Sakal'la konuş | 5 | Oyuncu |
| **Balbal Taşları** `stone` | Keşif (bozkıra dağılmış 8 taş, yurttan uzaklaştıkça) | 8. taş yalnızca diğer 7'yi bulana açılır | 8 | Oyuncu |
| **Mühür Kırıkları** `shard` | Erlik çatlağı kapatmak | Toplam kırık 1·3·6'da ipucu | 3 | Oyuncu |
| **Mühürün Dışı** `truth` | Birleşme | En az **4/5** ipliğin ucu yeterince ilerlemiş (insc≥2, dream≥2, elder≥2, stone≥3, shard≥1) | 1 | Oyuncu |

Neden bu dağılım? Yalnız oynayan (taş + Ak Sakal), sosyal oynayan (yazıt), uzun süre ayrılıp dönen (rüya) ve çatlak avcısı (kırık)
oyuncu **aynı sırrın farklı yüzünü** bulur; ipuçlarını birbirine anlatmak (sohbet/oymak) doğal sosyal döngü olur.
Dört iplik koşulu bilinçli: kimse tek yolu zorunlu olarak izlemez, ama kimse de her yola girmeden gerçeğe varamaz.

Ödüller küçük tutuldu (ipucu başına 60 akçe, taş başına 40 akçe + unvan): gizem **ekonomiyi bozmaz**, merakı ödüllendirir.
Unvanlar: Rüya Yürüyen, Sırların Dinleyicisi, Taş Okuyucu, Kırık Toplayıcı, ve `truth` için "Mühür Tanığı".

## 4. Ton ve motifler

* **Kar yağıyor ama soğuk değil** — rüya hep aynı açılış: huzurlu, ürkütücü.
* **Dokuz kat gök, sekiz kapalı** (Taş 1): Türk-Altay kozmolojisi (dokuz kat gök) ile "kapı" aynı sayıya bağlanır.
* **Gözsüz ak sakallar** (Rüya 4): unutmak bir yeminin son hâlidir. Ak Sakal NPC'si "konuşamam" der — onun bildiği, oyuncunun bulduğundan fazladır.
* **Boş son taş** (Taş 8): "Yazıyı sen yazacaksın." Oyuncuya doğrudan hitap eden tek an.
* **Ay Ata kapıyı gördü, gözlerini kapadı; bu yüzden gece vardır** (Taş 7): Ay boyunun kökeni; boylar arası gerilimin tohumu.
* Kırıklardaki **tamga**: Kut'un üzerindeki imza ile aynı → "dışarıdaki el, Kut'u da yaratan el". Kut ödül mü, kelepçe mi?

## 5. Çelişkiler bilerek bırakıldı

* Ak Sakal (elder.1): "Çatlamak içeriden bir iştir. Ben başka bir şey gördüm." ↔ Yazıt 1: dışarıdan açıldı. (Ak Sakal gördü mü, sezdi mi?)
* Kurt (Rüya 5): "Parçaları toplama. Ya da topla; ama neyi tamamladığını bil." ↔ Yazıt 5: tamamlanırsa kapı bir yöne açılır.
* Ak Sakal (elder.5): çatlakları kapattıkça Erlik güçleniyor mu zayıflıyor mu? — oyun bunu **ölçülebilir** bırakır (çatlak sayacı sunucu çapı); sonraki aşamada gerçek bir etkiye bağlanabilir.

## 6. Sonraki aşamalar için kancalar (yapılmadı; tasarım notu)

1. **Kam sınıfı** (Aşama 3): rüya ve kurtla doğal bağ. Kam, kurdun rüyasını *isteyerek* görebilir (çevrimdışı şartı yerine ritüel) — `dream` ipliği ikinci anlatıcı kazanır.
2. **Kale kuşatmaları** (Aşama 4): kale başına bir "diş" (anahtar 12 dişli: Taş 4). Kale sahibi boy, dişin sahibi olur; **dişleri kim toplarsa kapıyı o yöne açar** → cevap oyuncu seçimi.
3. **Mühür Kırığı çatlakları**: çatlak sayacı eşiğine (ör. sunucu çapı 10.000 kapama) ulaşınca dünya olayı: kapı bir an aralanır, `truth.2`.
4. **Ak Sakal'ın yemini**: `elder` ipliğinin 6. satırı ancak üç boyun da ipliği tamamladıysa — üç boyun sırrı ortaklaşa açması gerekir.
5. **Erlik'in diyaloğu**: Erlik'i yenmek ilk kez konuşturur: "Ben bekçiydim." Seçimi: öldür / bırak (sunucu çapı oy).

## 6.1 Değişmez kurallar (yazarlar için)

* "Dıştaki el kimin?" yanıtı **hiçbir NPC tarafından söylenmez**; ipucu metinlerinde kimlik/ad/cinsiyet belirtilmez.
* Yeni ipucu eklemek `shared/lore.ts` + `client/src/i18n.ts` + `THREAD_SIZE` günceller; `tests/integration/gm-lore.test.ts` boyut/eşik değişmezlerini yakalar.
* İpucu kimlikleri `insc.N`, `dream.N`, `elder.N`, `stone.N`, `shard.N`, `truth.N` biçimindedir; oyuncu verisinde `clues[]` olarak saklanır, eski kayıtlar `d.clues ??= []` ile taşınır.

## 7. Test ve kanıt

* Sunucu tarafı: `tests/integration/gm-lore.test.ts` (taş konumları belirlenimli, 8. taşın kilidi, rüya sınırı 5, Ak Sakal eşikleri, kırık eşikleri, `truth` açılışı, eski kayıt taşıma).
* Tarayıcı: `tests/e2e/run.ts` bölüm "gizem" → ekran görüntüleri `22-balbal-tasi-okundu`, `23-kurdun-ruyasi`, `24-kodeks-muhurun-disi`.
* Yönetici hesabıyla hızlı doğrulama: `/gm clue hepsi`, `/gm dream`, `/gm tp stone N`, `/gm frag 1500`.
