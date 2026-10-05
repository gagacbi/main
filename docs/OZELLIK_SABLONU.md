# Özellik şablonu — Lamba Testi ile

Yeni bir özellik eklemeden önce bu şablonu doldurun (PR/commit açıklamasına ya da `docs/ozellikler/` altına). Felsefe: [`TASARIM_FELSEFESI.md`](TASARIM_FELSEFESI.md).

```
## Özellik: <ad>
Amaç (oyuncu için ne değişiyor?):

### Lamba Testi
1. Oyuncu nereye bakar? (HUD / isim levhası / ölüm ekranı / eşya ipucu / sohbet / pazar vitrini)  → Cevap orada mı?
2. En kolay yol hangisi? Tembel, açgözlü ve çaresiz oyuncu bunu nasıl kullanır? İstediğimiz yol mu?
3. Herkes oraya giderse ne olur? (kalabalık, tükenme, enflasyon, fiyat çökmesi)
4. Işık sönerse? (bilgi eksik/yanlışsa oyuncu hangi yanlış sonuca varır?)
5. Yeni / 3 saatlik / 100 saatlik oyuncu bunu nasıl görür?
6. Sessiz başarısızlık: oyuncu fark etmeden neyi kaybeder ya da sıkılır?
7. Nasıl ölçeriz; ölçü neyi gizleyebilir?

### Nüfus simülasyonu
- Hangi arketip bu özelliği bozmaya çalışır?  (tests/sim/population/archetypes.ts)
- Hangi karakter raporunda iz bırakır?

### Kanıt
- Birim/entegrasyon testi:
- Nüfus raporu bulgusu:
```
