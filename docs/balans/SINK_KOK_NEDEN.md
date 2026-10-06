# Sink (akçe yakımı) kök neden analizi

Kaynak veri: kilitli profil kontrol kolu (3 seed × 30 gün × 150 oyuncu, `/tmp/L30C_*`). **Hiçbiri canlı veri değil**; proje yayında değil. Canlı veriye inmek için `scripts/economy-report.ts` (aşağıda).

## 0. Önkabuller düzeltildi

| Önkabul | Gerçek durum |
|---|---|
| "Kımız %58 sink, kırılgan" | %58–60 bir **model sonucu**: `baseline_heavy` + sabit oran 0,09/savaş-dk. Flexible modelde Kımız sink'in ≈%12'siydi. Gerçek payı bilinmiyor (aşağıda duyarlılık). |
| "Orta sınıf eriyor (medyan −%6)" | Alt %50 zaten **gelirinin %97'sini** harcıyor (başa baş). Bu yüzden her zorunlu maliyet onlara dokunur — bulgu doğru, ama v1.3'ün medyan etkisi 3 seed'de gürültü (±%5) içinde olabilir; ayrıca ölçülmedi. |
| "Canlı veri Tılsım'ı ortaya çıkarır" | Doğru yöntem; canlı veri yok. Rapor aracı hazır. |

## 1. Akış dökümü (oyuncu-gün başına, kontrol)

| Kaynak | Akçe | Pay | | Sink | Akçe | Pay |
|---|---|---|---|---|---|---|
| Yaratık | 223k | %63,5 | | Kımız | 166k | %59,8 |
| NPC satış | 73k | %20,8 | | Artı basma (+1…+9) | 33k | %12,0 |
| Sefer | 54k | %15,3 | | Kostüm (toplam) | 67k | %24,3 |
| Kilometre taşı | 1,6k | %0,4 | | Üretim / beceri / efsun yen. | 9k | %3,3 |
| | | | | Pazar ücret+vergi | 1,7k | %0,6 |
| | | | | Zindan ücreti / Oba | 0,4k | 0,1% |
| **Toplam** | **352k** | | | **Toplam** | **278k** | **%79,1** |

Net +74k akçe/oyuncu-gün.

## 2. Kök nedenler

**KN1 — Sink düzeyi tek bir ölçülmemiş parametreye bağlı (Kımız tüketim oranı).** Kımız sink'i oranla doğrusal ölçekleniyor:

| Kımız oranı (savaş-dk başına) | Sink/kaynak |
|---|---|
| 0,03 (oyuncular optimize eder) | %47 |
| 0,045 | %55 |
| 0,06 | %63 |
| **0,09 (kilitli)** | **%79** |
| 0,12 | %95 |

(Davranış geri beslemesi hariç; basit çarpan.) Aralık 47–95%: "sink sorunu var/yok" tartışması şu an bu parametreye indirgeniyor. **Önce gerçek tüketim ölçülmeli.**

**KN2 — Birikim yukarıda ve sink yapısı gerileyici.**

| Bakiye dilimi | Gelir/gün | Gider/gün | Gider/gelir | Net payı |
|---|---|---|---|---|
| Alt %50 | 345k | 337k | %97 | %6,1 |
| %50–80 | 256k | 179k | %70 | %31,3 |
| %80–90 | 410k | 248k | %61 | %21,9 |
| Üst %10 | 641k | 339k | %53 | %40,8 |

Üst %20, net fazlanın %62,7'sini taşıyor; alt %50 başa baş. Yani yeni **zorunlu** bir gider alt yarıyı ezer, üst grubu etkilemez (v1.3 deneyindeki medyan düşüşünün nedeni bu).

**KN3 — İsteğe bağlı sink'lere katılım bir kişilik özelliği; biriktirenler katılmıyor.** Kostüm sink'i: alt %50'nin %90'ı kostümle ilgili, üst %20'nin %0'ı. Not: bu kısmen **seçilim** (kostüme harcayan zaten daha yoksul sıralanır) ve ajan özelliği (`par.cos`); yine de gösteriyor ki fazlayı taşıyan oyuncu tipi için mevcut katalogda cazip bir çıkış yok.

**KN4 — Sabit fiyatlı katalog gelir ölçeğinin 1–3 derece altında.** Zindan ücreti 900/2 200 (gelirin %0,2–0,4'ü), beceri `250·rank²` (rank≤6: ≤9k), Oba `300·n²`, pazar vergisi %5 (hacim çok düşük). Endgame geliri 547k/gün.

**KN5 — Pazar sağlığı.** Satış adedi 107–130/gün (gün 1) → 5–19/gün (gün 30); fiyat/ref ≈1,0 (fiyat sınırları + ölü pazar yüzünden enflasyon görünmüyor). Arz 19M → 363M. Yani biriken akçe **atıl**, enflasyon sinyali **gizleniyor**, tehlike yokluğu anlamına gelmiyor. (Kısmen ajan pazar modelinin sonucu olabilir.)

## 3. Gereken yakım büyüklüğü

Kımız oranı 0,045 ise bandı (%80) tutturmak için **+86k akçe/oyuncu-gün** (kaynağın %24,6'sı) gerekir. Üst %20'nin net fazlası 162–302k/gün; yalnızca onlara yönelik sink 432k/gün çekmek zorunda → **mümkün değil**. Sonuç: pesimist Kımız senaryosunda %80–90 bandı yeni sink'lerle tutturulamaz; hedef metrik gözden geçirilmeli (enflasyon = pazar fiyat endeksi ve atıl-akçe oranı).

## 4. Yeni sink ilkeleri

1. **İsteğe bağlı ve ödüllü** (ceza değil): akçe → içerik/konfor/statü.
2. **Gelirle ölçeklenen** fiyat (sabit liste değil); alt %50'ye zorunlu yük yok.
3. **Optimizasyona dayanıklı:** savaş verimliliğine bağlı tüketim değil.
4. Biriktirenlerin **ilgisini çekecek** katalog (KN3).

## 5. Aday sink'ler (uygulanmadı)

| Aday | Ölçeklenme | Zorunlu mu | Not |
|---|---|---|---|
| Ek zindan/çatlak/boss hakkı satın alma (artan fiyat, günlük tavan) | gelir | hayır | Akçe→içerik; ödüllü |
| Oba hazinesi: kolektif yükseltmeler (sonsuz kademe, fiyat gelirle ölçekli) | gelir | hayır | Sosyal; mevcut Oba sink'i %0 |
| Vitrinli ilan / pazar bilet (isteğe bağlı) | hacim | hayır | Pazar canlılığı da gerekir |
| Statü: unvan/rozet/prestij kostüm basamağı | sabit-yüksek | hayır | Biriktirenlere hitap |
| Geçit ücreti (bölgeler arası seyahat) | seviye | yarı | Zorunluya yaklaşır; küçük tutulmalı |
| Dayanıklılık/tamir | seviye | evet | **Önerilmez** (alt %50'yi ezer) |

## 6. Gerçek veriye inme

`scripts/economy-report.ts <db.sqlite> [gün]` → kaynak/sink dökümü, bakiye dilimlerine göre birikim (KN2), Tılsım/kitap/Kımız stokları, +n dağılımı, yok olan eşya, pazar satış hızı. Yayındaki veya simülasyon (`POP_DBDUMP=…`) veritabanında çalışır. Eksik: **oyuncu-saat** (oyun içi süre kaydı yok) → Kımız/savaş-dk **ölçülemiyor**; telemetriye "savaşta geçen süre" ve "Kımız kullanımı" sayacı eklenmeli (KN1'in çözümü).

## 7. Önerilen sıra

1. Telemetri: savaş süresi + Kımız kullanımı sayacı (KN1'i kapatır). Karar: eklensin mi?
2. Adayları simülasyonda prototiple (önce "ek içerik hakkı" ve "Oba hazinesi"), katılımı **arketip dağılımına** göre modelle.
3. Hedef metriği yeniden tanımla (sink/kaynak yerine atıl-akçe oranı + pazar fiyat endeksi).
