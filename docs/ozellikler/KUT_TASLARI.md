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

---
# Agresif sürüler ve çekme (aynı turda)
`PACK` (shared/game.ts), `World.alertPack` / `campMobs` (server/world.ts), `F.ALPHA` + `howl` olayı (istemci: halka + "!" + ses). Yaratık hedef bulunca ya da ilk darbeyi alınca yakındaki (çağrı yarıçapı türe göre: Çakal 16, Albastı/Erlik 9, Tepegöz 7) hedefsiz kamp arkadaşları gelir; zincirleme YOK → kenardaki yaratığı uzaktan çekip sürüyü bölmek mümkün. Kampın ilk yaratığı (≥4'lük kamplarda) Sürü Başı: 1,8× can, 1,15× saldırı, tüm kampı çağırır; ödül ×2,5 XP, ek akçe, üst katman eşya şansı %60, Kut Taşı %25.
**Açık:** zorluk/ekonomi etkisi simüle edilmedi (alfa XP/ödül faucet; sürü çağrısı solo av hızını düşürür). Mevcut bot simülasyonu testleri geçti ama çağrı davranışını ölçmüyor.

---
# Boss anahtarı ve sandık (aynı turda)
`shared/chest.ts`, `chest.open` RPC, Me.keys, Kut Sandığı paneli, 3D sandık modeli (her saha bossunun inine). Boss ölünce ödül hakkı olan herkese bossun sınıfında (Bronz ≤Sv19, Gümüş ≤Sv39, Altın) bir anahtar; sandık aynı/yüksek sınıf anahtarla açılır (en düşük yeterli harcanır). Ganimet: akçe (boss akçesinin ~%24–64'ü), üst katman eşya (yere düşer), Kut Taşı şansı %35/55/85, kitap, tılsım, parça. Anahtarlar pazarda takas edilmez.
**Açık:** ekonomi simülasyonu yok (yeni faucet: sandık akçesi + eşya + taş); zindan içinde sandık yok (zindan bossu anahtarı veriyor); anahtar HUD göstergesi yalnızca sandık panelinde.

# Balıkçılık tutma şansı (aynı turda)
Metin2 viki'sinde yüzde yoktur (3 isabet yalnızca "şans" verir, bilinmeyen eşya = başarısızlık, olta puanı yine kazanılabilir, balık ayıklanınca solucan/kılçık çıkar). Kut'ta: tutma şansı sıradan %82, nadir %55, Ata %30 + olta seviyesi başına %1,5 (en çok +%15) + solucan %5 + şans yemi %10 (üst sınır %95). Sonuç atışta sunucuca belirlenir; kaçarsa yem gider, %15 olta puanı. Balık Ayıkla: %40 solucan, %40 kılçık, %20 kaçar. Bot riski: isabet sayısı hâlâ istemci bildirimli ama kaçma olasılığı kazancı sınırlar (ölçülmedi).

# Dokunmatik kontrol (aynı turda)
`client/src/ui/touch.ts`: joystick, basılı tutulan saldırı düğmesi, E düğmesi, 1 parmak kamera, 2 parmak yakınlaştırma, panel/beceri çubuğu mobil düzeni. Chromium 844×390 dokunmatik emülasyonunda test edildi (e2e T1–T5). **Gerçek cihazda denenmedi**; görev kutusu mobilde gizli.
