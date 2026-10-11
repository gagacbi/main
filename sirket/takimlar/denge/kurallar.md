# denge — kurallar

Makine okunur sınırlar (bekçi uygular):

```json
{
  "izinliYollar": [
    "tests/sim/**",
    "docs/balans/**",
    "scripts/economy-report.ts",
    "scripts/make-balance-report.ts"
  ],
  "yasakliYollar": [
    "shared/game.ts",
    "shared/goods.ts",
    "server/**",
    "client/**"
  ],
  "kapilar": [
    "npm run typecheck",
    "npx vitest run tests/unit"
  ],
  "gunlukKosu": 2,
  "denemeTavani": 2,
  "kapiZamanasimi": 600
}
```

Ekonomi parametreleri ANAYASA'da kilitlidir. Bu takım önerir, `icerik` takımı insan onayıyla uygular.
