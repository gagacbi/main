# gorsel — kurallar

Makine okunur sınırlar (bekçi uygular):

```json
{
  "izinliYollar": [
    "client/**",
    "tests/e2e/**",
    "tests/perf/**",
    "docs/KREDILER.md",
    "scripts/gen-icons.mjs",
    "package.json"
  ],
  "yasakliYollar": [
    "server/**",
    "shared/**"
  ],
  "kapilar": [
    "npm run typecheck",
    "npm run build",
    "ONLY=paneller npm run e2e"
  ],
  "gunlukKosu": 3,
  "denemeTavani": 3,
  "kapiZamanasimi": 900
}
```

Her görsel değişiklik ekran görüntüsüyle (`docs/evidence/`) kanıtlanır. Dış varlık kullanılırsa lisansı `docs/KREDILER.md`'ye yazılır.
