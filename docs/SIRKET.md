# Şirket (yalnızca denetim): dağıtıcı · bekçi · masa · hafıza

**Karar (kullanıcı):** geliştirme normal akışta sürer; şirket zorunlu bir iş akışı DEĞİL. Takımlar yalnızca denetleyici olarak kullanılır: `npm run sirket:bekci -- <id>` kapıları (typecheck, test, derleme, e2e) ve rapor biçimini denetler. Takımlar arası mesajlaşma kuralı bir ilke olarak yazılıdır; bekçi bunu dosya düzeyinde zorlamaz.

Esin: "Sıfırdan Ajanlar" şirket mimarisi (verdiğiniz üç slayt). **Videoyu izleyemedim** (bu ortamdan erişilemiyor); aşağıdaki tasarım yalnızca slaytlardaki şemaya dayanır.

| Slayt | KUT'ta karşılığı |
|---|---|
| ANAYASA.md (her koşu önce okur) | `sirket/ANAYASA.md`: yayın düğmesi insanda, kaynaksız sayı yok, kilitli ekonomi kararları |
| DAĞITICI (kuyruk → koşu, LLM çağırmaz, tavanları uygular) | `sirket/bin/dagitici.mjs`: sıradaki işi seçer, günlük/takım koşu tavanı ve deneme tavanını uygular, `calisma/<id>.brief.md` yazar |
| TAKIMLAR (takim.md, kurallar.md, durum.json, defter.md) | `sirket/takimlar/{denge,gorsel,altyapi,icerik,hikaye}/`; `kurallar.md` içindeki json bloğu izinli/yasaklı yollar ve kapılardır |
| BEKÇİ (her koşuyu denetler: kabul → masa, red → kuyruk) | `sirket/bin/bekci.mjs`: yol sınırı, rapor biçimi, "SAYI ⇒ KAYNAK", kapılar (typecheck/test/derleme/e2e) |
| MASA → SEN (sabah tek liste, evet/hayır) | `sirket/masa/<gün>.jsonl` + `sirket/bin/masa.mjs` (`evet`/`hayir`) |
| GRAF = HAFIZA (sayfa = düğüm, [[link]] = kenar) | `sirket/hafiza/*.md` (frontmatter: tur/durum/guncelleme/kaynak) + `sirket/bin/hafiza.mjs` (graf, kırık bağlantı, öksüz sayfa) |
| "Takımlar birbirine mesaj atmaz" | Takımlar yalnızca dosya yazar/okur: `kuyruk/`, `calisma/`, `hafiza/`, `defter.md` |

## Kullanım
```
npm run sirket                       # kuyruk ve tavan özeti
npm run sirket:ekle -- --takim gorsel --baslik "…" --istek "…" [--oncelik 2]
npm run sirket:sonraki               # iş emri üretir: sirket/calisma/<id>.brief.md
   → bir Claude Code oturumu (ya da siz) brief'i okuyup işi yapar, calisma/<id>.rapor.md yazar
npm run sirket:bekci -- <id>         # KABUL (masaya) ya da RED (kuyruğa, gerekçeyle)
npm run sirket:masa                  # bekleyen onaylar;  npm run sirket:masa -- evet|hayir <id> ["neden"]
npm run sirket:hafiza                # hafıza grafı + dizin
```
Başka projeye taşımak: `node sirket/bin/kur.mjs ../baska-proje takim1 takim2` (bağımlılıksız, yalnızca Node).

## Dürüst sınırlar
- **Arka planda kendi kendine çalışmaz.** Dağıtıcı ve bekçi betiktir; işi yapan ajanı (Claude Code oturumu) siz ya da bir zamanlanmış görev başlatır. Bu depoda henüz zamanlanmış görev **kurulmadı**; kurulursa (ör. her gece bir oturum `sirket:sonraki` → işi yap → `sirket:bekci`) bunun için sizin onayınız gerekir.
- **Bekçi "farklı aileden" bir model değil, deterministik kapılardır** (tip denetimi, testler, yol sınırı, rapor biçimi). Anlamsal incelemeyi (ör. başka bir model/ajanla kod gözden geçirme) bir kapı komutu olarak eklemek mümkün, ama henüz yok.
- Bekçi "sayı doğru mu" bilmez; yalnızca sayının kaynak gösterdiğini zorlar.
- Gerçek GPU ölçümü, ağ gerektiren işler ve canlı oyuncu verisi gerektiren kararlar insana kalır (`askida`).
- Kapılar uzundur (tüm vitest ≈ 75 sn, e2e dakikalar); `kapiZamanasimi` ile sınırlanır.

## Başlangıç kuyruğu (kodlanmadı, yalnızca iş emri olarak bekliyor)
`npm run sirket` ile görün: ekonomi simülasyonunu yeniden koş (denge), kalan ikonlar (gorsel), GPU ölçüm rehberi (altyapi), Kut Taşları taslağı (icerik), Yıllık/Wiki metinleri (hikaye).
