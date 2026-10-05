# KUT — Tasarım felsefesi: sokak lambası etkisi

> Gece sokakta anahtarını arayan adama sorarlar: "Burada mı düşürdün?" — "Hayır, şurada. Ama burada ışık var."

Bu hikâye bir esprinin ötesindedir: **bakması kolay yer ile cevabın olduğu yer aynı yer değildir** ve bu, hem bizim hem oyuncunun davranışını belirler.
Önce test için yazdık ([`TEST_FELSEFESI.md`](TEST_FELSEFESI.md)). Burada **geliştirmenin her aşamasında** kullanacağımız hâli var.

## 1. Üç aktör, hepsi lambanın altında arıyor

| Aktör | Lambanın altı | Cevabın olduğu yer |
|---|---|---|
| **Geliştirici** | Formülle ölçülen, tek sistemli şeyler (ortalama DPS, TTK) | Sistemlerin kesiştiği yerler, uç durumlar (bkz. test felsefesi) |
| **Metrik / rapor** | En kolay sayılan şey (seviye, saatlik XP, giriş sayısı) | Sıkıntı, anlam, takılma, "ödül aralığı" gibi sayması zor şeyler |
| **Oyuncu** | Ekranda en görünür şey: saldırı/savunma sayısı, en yakın kamp, herkesin kullandığı yapı, en kolay tekrar edilebilir eylem | Doğru savunma türü, kendi seviyesine uygun boss, pazarın fırsatı, gizem ipuçları |

Oyuncu **kötü arıyor değil, rasyonel arıyor**: bilgi ve ödül nerede görünürse oraya gider. Oyuncuyu suçlamak yerine **ışığı doğru yere koymalıyız**.

## 2. Tasarım ilkeleri

1. **Aydınlık = doğru olmalı.** Oyuncunun doğal olarak baktığı yerde (isim levhası, ölüm ekranı, eşya ipucu, HUD, sohbet) cevap da bulunmalı. Cevap gizli bir menünün üçüncü sekmesindeyse oyuncu onu *bulamaz* ve "oyun dengesiz" diye düşünür.
2. **En kolay yol, doğru yol olmalı.** Oyuncular en az dirençli yolu seçer. En kolay yol bir sömürüyse (bedava öldürme, kaçarak vurma, kaplumbağa) bu oyuncunun hatası değil bizim hatamızdır. Önce en kolay yolu hesapla, sonra onu ödüllendirilmesi gereken yol yap.
3. **Işık kalabalığı doğurur.** Herkes aynı "en iyi" kampa/yapıya/rotaya akar; bu, o yeri artık en iyi olmaktan çıkarır (Goodhart). Tasarım, ışığı dağıtmalı: yer değiştiren bonus bölgeler, kalabalıkta azalan getiri, her seviye grubunda ikinci bir "cazip" seçenek.
4. **Karanlıkta bırakma, ışık tut.** Önemli bir mekanik (tür savunması, boss uyarısı, pazar) ilk 10 dakikada bile görünür ipucu taşımalı. Oyuncunun kendisinin keşfetmesini istediğimiz şeyler (gizem) bilinçli karanlıktır; bunu **bilerek** yaparız ve "bu karanlık bilinçli mi?" diye sorarız.
5. **Ölçtüğünü hedefleme.** Bir metrik hedef olunca (saatlik XP) iyi bir metrik olmaktan çıkar. Hedefi birden fazla, birbirini dengeleyen ölçüyle koy: hız + sıkıntı + çeşitlilik + ödül aralığı.
6. **Sessiz hataları ara.** Oyuncuların *şikâyet etmediği* ama terk etmesine yol açan şeyler (uzun ödülsüz süre, tekrarlayan ölüm, başarısız artı serisi) en karanlık yerdir. Rapor bunları açıkça arar.
7. **Dar kesitle yetinme: kalabalıkla dene.** 1 bot dengeli görünür, 150 farklı niyetli oyuncu dengesizliği gösterir (kalabalık, sömürü, ekonomi). Bkz. `POPULASYON_RAPORU.md`.

## 3. Her özellik için "Lamba Testi" (geliştirme kontrol listesi)

Yeni bir özellik tasarlarken/eklerken şu yedi soruyu yaz ve cevapla (`docs/OZELLIK_SABLONU.md`):

1. **Oyuncu nereye bakar?** (ilk bakış: HUD, levha, ipucu, ölüm ekranı…) Cevap orada mı?
2. **En kolay yol hangisi?** Tembel/ açgözlü/ çaresiz oyuncu bunu nasıl kullanır? En kolay yol istediğimiz mi?
3. **Herkes oraya giderse ne olur?** (Kalabalık, tükenme, enflasyon.)
4. **Işık sönerse ne olur?** (Bilgi yoksa/yanlış yorumlanırsa oyuncu yanlış sonuç çıkarır mı?)
5. **Yeni oyuncu, 3 saatlik oyuncu, 100 saatlik oyuncu bunu nasıl görür?** (Seviye grupları.)
6. **Sessiz başarısızlık nedir?** (Oyuncu fark etmeden zarar eder / sıkılır.)
7. **Bunu nasıl ölçeriz, ölçü neyi gizler?** (Hangi sayı iyi görünüp kötü bir şey saklayabilir?)

## 4. Oyuna uygulanan örnekler (bu turda yapıldı)

| Karanlık (sorun) | Lamba (çözüm) |
|---|---|
| Oyuncu "öldüm, neden?" diye bakar; tür savunması eşya ipucunun içinde gizliydi | **Ölüm ekranı** artık seni neyin öldürdüğünü, hasar türünü ve o türe karşı savunmanı gösterir; savunmasızsa öneri verir |
| Oyuncu yaratığın hasar türünü bilemez | **İsim levhasında hasar türü etiketi** (Kılıç/Çift el/Bıçak/Yay/Büyü) |
| Boss duyurusu yalnızca ad söylüyordu | Duyuru hasar türünü de söyler: "hazırlığını ona göre yap" |
| Oyuncu ekonomi hakkında bilgisiz (pazarda fiyat?) | Pazar panelinde son fiyat ve "vitrin" sıralaması (ucuzdan pahalıya) |

Henüz uygulanmamış, nüfus simülasyonundan çıkan örnekler: `POPULASYON_RAPORU.md` §Bulgular.

## 5. Oyuncular için neden önemli?

* Kaybolan oyuncu, **ışığın altındaki tek şeyi** (seviye) kovalar ve sıkılır. Ona ikinci, üçüncü bir ışık (boss, pazar, gizem, savunma kurmak) göstermek elde tutmanın en dürüst yoludur.
* Dürüst tasarım: oyuncudan bir şeyi bulmasını bekliyorsak onu **bulunabilir** yapmak bizim borcumuzdur; bulunamayacak şeyi "keşif" diye satmayız.
* Sömürüyü bulan oyuncu ödüllendirilmiş olmaz, **topluluğu cezalandırmış** olur: lamba altındaki en kolay yol sömürü ise dürüst oyuncular kaybeder. Bu yüzden en kolay yolu önce biz kapatırız.
