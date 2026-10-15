# icerik — kurallar

Makine okunur sınırlar (bekçi uygular):

```json
{
  "izinliYollar": [
    "shared/**",
    "server/**",
    "client/**",
    "tests/**",
    "docs/ozellikler/**",
    "docs/**"
  ],
  "yasakliYollar": [
    "tests/sim/population/**"
  ],
  "kapilar": [
    "npm run typecheck",
    "npx vitest run",
    "npm run build"
  ],
  "gunlukKosu": 2,
  "denemeTavani": 2,
  "kapiZamanasimi": 900
}
```

Yeni faucet eklenirse raporun `## Sonuç` bölümünde "Ekonomi notu" olur. Onaysız büyük sistem eklenmez (ANAYASA).
