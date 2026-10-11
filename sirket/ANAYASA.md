# ANAYASA — KUT geliştirme şirketi

Her koşu önce bunu okur. Yayın düğmesi insanın; kaynaksız sayı yok; bekçi koşuyu yazan ajandan bağımsızdır.

## Kurallar
1. **Yayın düğmesi insanda.** Takımlar kod yazar, bekçi denetler, `masa` listesine düşer. Oyuna "yayınlama" (ana dala birleştirme, PR, sunucuya alma) insan "evet" dedikten sonradır.
2. **Kaynaksız sayı yok.** Raporda her sayısal iddia `SAYI: ... KAYNAK: dosya/komut/commit` biçiminde yazılır. Bekçi `KAYNAK:` eksik satırı reddeder.
3. **Takımlar birbirine mesaj atmaz; dosya yazar, okuyan okur.** Başka takıma iş gerekirse kuyruğa yeni iş yazılır (`dagitici.mjs ekle --takim <hedef> --kimden <iş-id>`); sırayı ve tavanı dağıtıcı belirler. Başka takımın dosyası, kendi `kurallar.md`'si, anayasa, `bin/` ve `masa/` düzenlenmez. Bekçi bunu **mühürle** zorlar: koşu başında korunan dosyaların özeti alınır, sonunda değişen varsa koşu reddedilir. Kalıcı bilgi `hafiza/` sayfasına yazılır.
4. **Dağıtıcı LLM çağırmaz**; kuyruktan sıradaki işi seçer, tavanları uygular (günlük koşu, deneme tavanı). Tavan aşılırsa iş `askida` olur ve insana kalır.
5. **Bekçi her koşuyu denetler:** izinli/yasaklı yollar, kapılar (typecheck, test, derleme, e2e), rapor biçimi. Kabul → `masa/<gün>.jsonl`, red → kuyruk (neden notlanır).
6. **Dürüst rapor:** geçmeyen test, atlanan adım, ölçülemeyen şey açıkça yazılır. "Çalışıyor" demek için kanıt gerekir.

## Kilitli kararlar (değiştirilemez; değişiklik insan onayı ister)
- **Ekonomi:** `baseline_heavy` Kımız modeli kilitli (POP_KZ_RATE=0.09, NPC satış 0.70, mob akçesi %100, Kımız fiyatı 0.6, ağır içerik çarpanı 1.3). Ekonomi hedefini tutturmak için Kımız oranı veya çarpanı yükseltilmez.
- **Doğrulama dili:** "Kımız tüketim davranışı doğrulandı; toplam ekonomi kısmen doğrulandı." Bunun ötesi iddia edilmez.
- **+10…+15 artı basma** yalnızca simülasyondadır; oyunda sınır +9.
- **Sink prototipleri** (içerik erişimi, Oba hazinesi, metrik yeniden tanımı) oyuncu geri bildirimine kadar beklemede.
- Raporlar Türkçe, tablolu; yeni akçe kaynağı (faucet) eklenirse ekonomi notuna yazılır.

## Çalışma düzeni
- Dal: yalnızca atanmış geliştirme dalı. PR yalnızca insan isterse.
- Commit ayrıntılı, kanıtlı (test sayısı, ekran görüntüsü yolu).
- Büyük, onaysız sistem eklenmez; önce `docs/ozellikler/` altında taslak, insan seçer.
