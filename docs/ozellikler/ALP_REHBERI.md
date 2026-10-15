# Alp Rehberi — görev tarzı yeni oyuncu eğitimi

**Sorun (analiz F):** Öğretici 5 adımdı (Otlak, bağış, bina, sefer, yükseltme); Kut Taşı, sandık, balıkçılık, günlük görev, evrim gibi sistemler oyuncuya kendiliğinden gösterilmiyordu; hareket/etkileşim hiç anlatılmıyordu.

## Yapı
1. **Çekirdek öğretici (7 adım, sırayla):** `move` (25 m yürü; W A S D / tıkla / joystick) → `elder` (Ak Sakal'a git, E) → `kill` (Otlak, saldırı + yetenekler) → `donate` → `build` → `expedition` → `upgrade`. İlk iki adım "nasıl oynanır"ı, kalanlar Oba ve Demirci'yi öğretir. Her adımın pusula oku vardır.
2. **Alp Rehberi (18 görev, paralel):** çekirdek bitince Ak Sakal'ın "ikinci kitabı" açılır. Görev kutusunda en çok 3 açık görev görünür; başlığa tıklayınca (ya da Ak Sakal paneli → Alp Rehberi →) tam liste açılır: ne için, nerede, ödül.
   - Wiki, yetenek, eşya giyme, Alp Avı, olta + 3 balık + pişirme, Kımız, Günlük, Pazar, Sürü Başı, Kut Taşı kazan/tak, boss anahtarı, sandık, yoldaş evrimi, element, zindan.
   - Seviye kilidi + önkoşul (olta → balık → pişirme; taş → takma; boss anahtarı → sandık).
3. **Sunucu doğrulamalı:** olaylar sunucuda sayılır (`World.guide`). İstemcinin bildirebildiği tek olaylar `wiki` ve `pazar` panelinin açılması (`tut.ack`, beyaz liste).
4. **Ödül enflasyonu yok:** ödüller küçük ve tek seferlik (kitap, yem, parça, 1 Kut Taşı, 1 tılsım; toplam akçe 610). Eski kayıtlarda koşulu zaten sağlanmış görevler **ödülsüz** tamamlanmış sayılır (`guideSync`).
5. **Göç:** eski 5 adımlı öğretici kayıtları 2 adım kayar (`tut.v = 2`); yeni karakter başa döner.

## Doğrulama
- `tests/integration/guide.test.ts` (8): veri bütünlüğü, çekirdek öncesi sayılmama, tek sefer ödül, önkoşul, seviye kilidi, ack beyaz listesi, eski kayıt eşitleme, olay bağları, hareket adımı ve göç.
- e2e S10: görev kutusunda Rehber, pusula oku, panel, wiki ack.
- RPC fuzz: `tut.ack` ve `guide` durum değişmezleri.

## Açık
- Rehber **gerçek yeni oyuncuyla denenmedi**; görev sırası/sayısı geri bildirimle ayarlanır.
- Mobilde görev kutusu gizli (alan yok): rehber yalnızca Ak Sakal panelinden ve `J`/`U` yolundan görünür. Mobil için ayrı kompakt görünüm yapılmadı.
- Bölge/yer anlatımı yalnızca pusula oku + metin; haritada işaret yok.
