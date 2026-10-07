# Metin2 wiki → KUT hikâyesi: uyarlama notları

Kaynak: Metin2 TR wiki (Görev Listesi, Av Görevleri, Balıkçılık, Ejderha Taşı Simyası, Element Yazısı). Pet sayfası bulunamadı (404); Silahlar/Zırhlar/Kasklar sayfaları yalnızca sınıf indeksi içeriyor (ayrıntı alt sayfalarda) — bu üçü için mevcut KUT sistemi (`WEAPON_MODS`, tür savunmaları, efsun) esas alındı, yeni kural eklenmedi.
Hikâye ilkesi (bkz. `HIKAYE.md`): dünya sunucuya aittir, kimse "seçilmiş" değildir; Mühür dışarıdan açıldı, "dıştaki el" yanıtsızdır. Aşağıdaki her sistem bu çerçeveye oturtuldu.

| Metin2 | Wiki'nin özü | KUT karşılığı (hikâye) | Durum |
|---|---|---|---|
| Görev Listesi | NPC'lerin istekleri; seviye dilimleri (1-30…), günlük görevler, 24 saatte sıfırlanır | **Ak Sakal** yurdun tek görev vereni; dilimler = çağlar. Günlük olanlar "Ocak Nöbeti" (ileride) | Av dileği ✔; günlük: öneri |
| Av Görevleri | Her seviyede otomatik; N tuşu; atlanan geri gelmez; 5–100 av; ödül %15 XP, 60+ para; seviye aşılırsa %1 | **Av Dilekleri**: Ak Sakal "Bozkır ışığın geri dönsün" der; her seviye (Sv 2+) bir dilek; ödül aynı oranlar; her 10. seviyede Tılsım + El Kitabı | **Uygulandı** (`shared/hunt.ts`) |
| Balıkçılık | Sv 30+, olta 5.000 yang, yem, 15 sn'de 3 tık, nadir balık = buff, Altın Orkinos | **Gölet** (yurtta `HUB.pond`): Balık = Tengri'nin gözyaşı; Altın Sazan = Kut işareti. Buff'lar Kımız ile aynı kanaldan (mevcut buff altyapısı) | Öneri (P2) |
| Evcil hayvan (Pet) | (sayfa bulunamadı) | **Yoldaş Kuş/Kurt**: Boz Kurt yavrusu — oba yoldaşlarından ayrı, savaşta pasif bonus; besleme = Kımız | Öneri (P3), veri yok |
| Ejderha Taşı Simyası | 7 taş, sınıf/saflık/seviye, 6'lı set bonusu, ham madde günlük görevden | **Balbal Taşları** zaten 8 gizem taşı; simya için ayrı: **Gök Kırıkları** (7 renk = 7 boy simgesi), 6'lı set = boy bonusu. Gizem iplikleriyle karıştırılmaz | Öneri (P3) |
| Element Yazısı | Silaha +7'de 6 element, madalya + yang, 3 seviye, kaldır/değiştir yazısı | **Yazıt Mühürü**: Gök/Yer/Ay boylarının üç unsuru + Ateş/Buz/Gölge; silaha +7'de; efsun satırı olarak `EnchKey` genişlemesi; yeniden çevirme (`REROLL`) maliyet modeli kullanılabilir | Öneri (P2) |
| Silah/zırh/kask | sınıf bazlı listeler | Mevcut: 5 hasar türü + tür savunması + efsun; kask/zırh/amulet slotları | Değişiklik yok |

## Av Dilekleri — tasarım (uygulanan)

* **Verilme:** her seviye atlayışta kendiliğinden (Sv 2–50). Bekleyenler en eskiden başlayarak tek tek görünür; sayaç "N dilek daha bekliyor".
* **Hedef:** o seviyenin bozkır kamp türlerinden ilk ikisi (`campTypesForLevel`); sayı `10 + 1,5×(Sv−2)` ve yarısı (Sv 2: 10+5; Sv 50: 82+41). Yaratık seviyesi dilek seviyesinin 5'ten fazla altındaysa **sayılmaz** (düşük seviye kasma dileği doldurmasın).
* **Ödül:** dilek seviyesinin deneyim gereksinimi × %15; oyuncu 5+ seviye ilerideyse %1 ("ödül yaşlanır"). Sv 10+ ek akçe (ortalama yaratık akçesinin yarısı). Her 10. seviye: +1 Tılsım, +1 El Kitabı.
* **Atlama:** geri gelmez (wiki ile aynı) — oyuncu dürüstçe uyarılır (düğme etiketi: "Atla (geri gelmez)").
* **Lamba testi** (`TASARIM_FELSEFESI.md`): ışık = HUD görev kutusu (oyuncunun zaten baktığı yer); en kolay yol = kendi seviyesinde av yapmak (istenen); herkes aynı kampa akarsa mevcut `campRespawnMult` kalabalık cezası devreye girer; sessiz hata = dilek birikip görünmemesi → sayaç gösterilir.
* **Kayıt:** `PlayerData.hunt = { done: number[], prog: number[] }` (eski kayıtlarda yok; sorunsuz başlar). RPC: `hunt.skip`. Defter: `hunt.done`, `hunt.skip`.
* **Test:** `tests/integration/hunt-wish.test.ts`.

## Sıradaki önerilerin kısa tasarımı (onay bekliyor)

1. **Balıkçılık (Gölet):** yurtta göletten E ile oltayı at; 15 sn pencere, balık halkasına 3 doğru tık (sunucu zamanlı doğrular, istemci süsü); olta seviyesi deneyimle 20'ye kadar, 2. seviyeden itibaren %39 başarı; yem = Hamur/Solucan (Solucan balıktan çıkar → kapalı döngü). Ürün: Kımız gibi geçici buff (hız/saldırı) ve nadir "Altın Sazan" → Tılsım/Kostüm malzemesi. Ekonomi: malzeme `goods` pazarına girer, satış fiyat sınırı mevcut `marketPriceBounds`.
2. **Yazıt Mühürü (element):** `Item.el?: { k, lv }`; silah +7 ve üstü; ücret akçe + Kut puanı (madalya yerine); kaldır/değiştir pahalıdır (çevirme gibi `rerollCost` modeli). Yaratık/oyuncu üzerinde 'üstünlük' etkisi yeni hasar türü matrisi gerektirir → önce `pvp-matrix` testleriyle denge.
3. **Günlük "Ocak Nöbeti":** Ak Sakal'dan 24 saatte bir teslim görevleri (zindan günlük hakkı altyapısı `dun.day` ile aynı desen).
4. **Pet ve Gök Kırıkları:** kaynak sayfa eksik/uzun vadeli; talep gelince.
