# KUT — Test felsefesi: sokak lambası etkisi

> Geceleyin anahtarını kaybeden adam, anahtarı kaybettiği karanlık yerde değil, sokak lambasının altında arar: *"Burası aydınlık."*
> Oyun testinde de aynı hata yapılır: **ölçmesi kolay yer ile cevabın olduğu yer aynı yer değildir.**

## 1. Bizim lambamız neydi?

İlk denge turunda ölçtüğümüz şeyler şunlardı: ortalama DPS, öldürme süresi, seviye başına süre, artı basma beklenen maliyeti.
Hepsi **formülle ölçülebilir, tek sistemli, tek oyuncu tipli** şeylerdi. Aydınlıktı, tablolar güzeldi (`BALANS_RAPORU.md` §2–§12).

Cevap ise orada değildi. Yeni mekanikleri (savunma, blok, silah türü, menzilli silah, boss) ekleyip **sistemlerin kesiştiği yerlerde** aradığımızda bulduklarımız:

| # | Bulgu | Nerede saklanıyordu | Ortalama tabloda görünür müydü? | Düzeltme | Kalıcı test |
|---|---|---|---|---|---|
| 1 | **Güvenli bölgeden menzilli silahla yaratık kesme**: yay (8,5 menzil) ile yurdun içinde dururken bölge dışındaki yaratığa vurulabiliyordu; yaratık karşılık veremediği için bedava öldürme | "menzilli silah" × "güvenli bölgede yaratık saldırmaz" kuralı | Hayır (DPS aynı) | `canHitMob`: güvenli bölgedeki oyuncu yaratığa vuramaz (kukla/yönetici hariç) | `hunt.test.ts › av 1` |
| 2 | **Kaçarak vurma**: yay/çan ile yürüyerek vurunca öldürme başına alınan hasar 41 → 4,7 (−%89) | "menzilli silah" × "yürürken otomatik vuruş" | Hayır (öldürme hızı benzer) | Menzilli silah yürürken otomatik vuruş yapamaz (`RANGED_MIN_RANGE`) | `tests/sim/kiting.ts` ölçümü; `balance.test.ts` |
| 3 | **Kalkan Alp PvP tekeli**: aynı boy, aynı donanımla kalkan, kılıcı düellolarda %92–100 yeniyordu | "uzmanlık" × "PvP süresi uzun ve deterministik" (küçük güç farkı kesin sonuç olur) | Hayır (PvE'de dengeli görünüyordu, çözümsel güç çarpımı 1,06) | Uzmanlığa özel `pvpTaken` çarpanı (PvE'yi etkilemez); sağlamlık bonusları kısıldı | `pvp-matrix.test.ts › uzmanlık aynalı düello` |
| 4 | **Kalkan emilimi düelloyu belirliyordu**: tek bir beceri azami canın %46'sını emiyordu (30 sn'lik düelloda iki kez) | "beceri" × "kısa PvP" | Hayır | `SHIELD_ABSORB` 0,35 → 0,18, kalkan çarpanı 1,6 → 1,2 | `pvp-matrix.test.ts` |
| 5 | **Savunma yığma**: tür savunması + blok + kalkan, tüm yapıları %98 yeniyordu; sonuçlar 0/100 uçlarındaydı (doğrusal sıralama, taş-kağıt-makas yok) | "savunma türleri" × "uzmanlık" × "PvP katsayısı" | Hayır | Tavanlar (tür %40, vuruş bloğu %35, beceri bloğu %30), delme güçlendirildi (+%25 delici hasar), efsun aralıkları düşürüldü | `pvp-matrix.test.ts › her ana yapının avı ve rakibi var` |
| 6 | **Çatlak dalgalarında nefes yok**: üç dalga + bekçi arka arkaya; parti büyüdükçe kişi başı ölüm artıyordu | "çatlak" × "parti ölçeği" | Kısmen (tek kişide fark edilmez) | Dalga arası 7 sn mola + %25 can | `rift.test.ts` (güncellendi) |
| 7 | **Çatlakta boylar arası dost ateşi**: karşı boyun alan becerisi öldürüyordu | "çatlak ortak olay" × "açık PvP" | Hayır | Karar: açık PvP kalır (tasarım kararı), testte aynı boy parti kullanılır | `balance.ts` açıklaması |
| 8 | **Bot ölümleri anlamsız çıkıyordu**: gerçek neden "kaynağı belirsiz" ölümdü (dost ateşi) | ölçüm hatası | — | Ölüm nedenini kaydeden ölçüm | `tests/sim/rift-trace.ts` |

Dikkat: 1–5'in **hiçbiri** ortalama DPS/TTK tablolarında görünmüyordu. Ölçümü kolay yere bakmaya devam etseydik "denge mükemmel" derdik.

## 2. İlkeler

1. **"Nerede kırılır?" listesi, "nerede ölçebilirim?" listesinden önce gelir.** Her yeni mekanik için şu kesişimleri yaz: eski kurallarla çarpışma, bölge sınırları, zaman, eşzamanlılık, kaynak döngüleri, sayı uçları, **oyuncu stratejileri** (kaçarak vurma, kaplumbağa, nişancı, hesap spam'i).
2. **Gerçekten önemli olanı ölç.** Ortalama DPS yerine eşleşme sonucu; ortalama kazanç yerine kar döngüsü; ortalama hız yerine uç sayı.
3. **Nokta yerine matris.** 12 yapı × 12 yapı × iki yön × birkaç tohum (`tests/sim/pvp.ts`, 3 sn'de koşar). Tek yapıya bakmak baskınlığı göstermez; satırın hepsi gösterir.
4. **Düşman bot yaz.** İşbirlikçi bot (`PlayBot`) oyunu oynar; **kaçan, keskin nişancı, kaplumbağa** bot oyunu kırmaya çalışır.
5. **Değişmezleri özellik testine çevir.** 4000 rastgele işlem sonunda akçe ≥ 0 ve tam sayı, çanta ≤ 30, eşya kimlikleri benzersiz, istatistikler sonlu (`hunt.test.ts › av 2, av 5`).
6. **Zamanı ve sırayı oyna.** 360 kez çık-gir, ≥4 saat eşiği, 20 eşzamanlı satış/artı isteği (`av 3, av 4`).
7. **Bulunan her hata kalıcı test olur** (tablodaki son sütun). Hata önce başarısız testle yakalanır, sonra düzeltilir.
8. **Sonuçlar 0/100 ise ayar bozuktur.** Taş-kağıt-makas dokusu (her yapının avı ve rakibi var) test edilir; doğrusal sıralama baskın yapıyı gösterir.

## 3. Hâlâ karanlıkta olanlar (dürüst liste)

* **İnsan davranışı:** bot verimli oynar; gerçek oyuncunun hataları, sosyal sömürüleri, birlikte hareket eden gruplar ölçülmedi.
* **Çok oyunculu ölçek:** 150 oyunculu katmanda kalabalık etkileşimi (aggro dağılımı, boss'a eşzamanlı saldırı) denenmedi.
* **Ağ düzeyi sömürüler:** gecikme/tahmin farkından yararlanma yalnızca 150 ms RTT'de ölçüldü.
* **Ekonomi derinliği:** pazar/vergi/ticaret yok; Sv40+ altın sinki zayıf (bkz. `BALANS_RAPORU.md` §13).
* **Savunma değeri PvE'de seyrek:** karma kamplarda tür savunması hissedilmiyor (ölçüldü: fark gürültü içinde); değeri boss'larda (tek hasar türü) ve PvP'de. Bu bilinçli bir tasarım yönü olarak belgelendi; ihtiyaç olursa bölgelere tek türlü kamplar eklenebilir.
* **Uç durum:** yönetici hesabı güvenli bölge kuralını atlar (test kolaylığı); bu istisna avlarda **yönetici olmayan** hesapla sınanır.

## 4. Nasıl çalıştırılır

```bash
npx vitest run tests/integration/hunt.test.ts tests/integration/pvp-matrix.test.ts   # av + matris değişmezleri
npx tsx tests/sim/pvp.ts                                                              # PvP matrisi → docs/balans/pvp.json
npx tsx tests/sim/kiting.ts                                                           # kaçarak vurma ölçümü
```
