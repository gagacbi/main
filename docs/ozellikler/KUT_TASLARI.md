# Kut Taşları (ejderha taşı simyası esinli)

**Amaç:** Orta/geç oyunda ikinci bir karakter büyütme ekseni + akçe/taş sink'i. Kod: `shared/kuttas.ts`, `server/world.ts` (`kt.*`, `giveStone`), Demirci › Kut Taşları sekmesi.

| Konu | Karar |
|---|---|
| Türler / sınıflar | 6 tür (Alp, Kalkan, Can, Kesin, Çevik, Emen) × 5 sınıf (Ham → Ulu); her tür tek yuva |
| Kaynak | Sv 15+ yaratıkta ~%0,9 (drop seviye eğrisiyle çarpılır), saha boss'unda 1–2 taş (%30 Saf) |
| Saflaştırma | 3 aynı taş + akçe → 1 üst sınıf; şans %70/50/35/22; başarısızlıkta 2 taş yanar |
| Risk | Çıkarma/değiştirmede %70 geri döner, %30 kırılır |
| Set bonusu | 6 yuva dolu: +%2 saldırı/savunma; hepsi Kutlu+: +%3 XP, +%4 can |
| Gücü | Tek parça en çok +%8 saldırı / +%14 can; tam Ulu set ≈ +%8 saldırı +%11 savunma +%14 can +%3 XP (+ setler) |

**Açık noktalar (dürüstçe):** (1) Ekonomi **yeniden simüle edilmedi** — yeni taş akışı ve akçe sink'i canlı geri bildirim/simülasyon turu bekliyor. (2) Taşlar pazarda takas edilmiyor (ilk sürümde bilinçli; botlaşma/aktarım riski). (3) PvP'de de çalışır (küçük yüzdeler); gerekirse PvP etkisi ayrıca kısılabilir. (4) Taşlar için simge/3D modeli yok, renkli baklava göstergesi kullanıldı.

---
# Yoldaş evrimi (aynı turda eklendi)
`COMP_EVO` (shared/game.ts), `oba.evolve` (server/oba.ts), Oba panelindeki yoldaş kartı. Sv 6/12/18 yoldaş → Yiğit/Bahadır/Destan; bedel akçe (seviye ekonomisi birimi ×4/12/30) + 3/8/15 yazıt parçası; her aşama sefer akçesi +%12, eşya şansı +%8, süre −%3; 1. ve 3. aşamada yeni özellik.
**Açık:** sefer kazancı en çok +%36 artar → ekonomi simülasyonu yeniden koşulmadı. "Yoldaş ömrü" yapılmadı (yol haritasında).
