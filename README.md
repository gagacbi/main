# Medieval MMO Survival Project

Web tabanlı bir Orta Çağ temalı hayatta kalma MMO projesi için vizyon, kapsam ve yürütme planı. Bu repo, geliştirme ekipleri için yol haritasını, yüksek seviye mimariyi ve erken sprint görevlerini içerir. Artık basit bir tek oyunculu PoC ile oynanabilir ilk prototip de eklendi.

## Neden
Oyuncuların kendi köylerini kurup tarım, hayvancılık, avcılık ve ticaretle hayatta kaldığı kalıcı bir dünya kurmayı hedefliyoruz. Ekonomik döngü, mevsimsel kaynak yönetimi ve kooperatif/rekabetçi sosyal etkileşimler oyunun temelini oluşturacak.

## İçerikler
- `index.html`, `styles.css`, `src/`: Tarayıcıda çalışan tek oyunculu hayatta kalma PoC (hareket, kaynak toplama, tarla ve kuyu inşası).
- `docs/project-plan.md`: Vizyon, hedefler, hedef kitle ve başarı metrikleri.
- `docs/architecture.md`: Önerilen teknik yığın, modüler mimari, veri model taslakları ve tick akış örnekleri.
- `docs/backlog.md`: İlk 3 sprint için DoD tanımlarıyla yapılacaklar ve kabaca tahminler.
- `docs/world-design.md`: Oyun döngüsü, meslekler, ilerleme ve ekonomi ilkeleri.
- `docs/sprint-0.md`: Sprint 0 (Hafta 1) için ayrıntılı altyapı ve PoC planı, gün bazlı görevler ve DoD.

## Hızlı Başlangıç (PoC)
1. Depoyu yerel diske alın ve kök dizindeki `index.html` dosyasını tarayıcıda açın (yerel file:// ile çalışır).
2. WASD veya ok tuşlarıyla hareket edin. `Kaynak Topla` (G) ile hücrenin kaynaklarını toplayın.
3. `Tarla Kur` (F) için 2 Odun ve 2 Lif toplayın, `Kuyu Aç` (Q) için 3 Taş bulun. `Dinlen` (R) 1 yemek tüketerek enerjiyi tazeler.
4. Açlık ve susuzluk sıfırlanırsa can kaybedersiniz; kuyudan su çekerek (aynı hücredeyken otomatik) veya dereden toplayarak hayatta kalın.

## Planlama Aşaması
1. `docs/project-plan.md` dosyasını okuyarak vizyona ve kapsam sınırlarına hakim olun.
2. `docs/world-design.md` içindeki döngüler ve meslekler doğrultusunda feature listelerini gözden geçirin.
3. `docs/architecture.md`’deki teknoloji yığını ve modülleri ekiplerle eşleştirin.
4. `docs/backlog.md`’deki Sprint 0 ve Sprint 1 görevlerini iş emrine çevirin.

## Lisans
Tüm içerik taslak niteliğindedir; gerçek oyuna geçerken telif, altyapı ve güvenlik ihtiyaçları ayrıca değerlendirilmelidir.
