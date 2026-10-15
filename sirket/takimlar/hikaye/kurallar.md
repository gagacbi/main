# hikaye — kurallar

Makine okunur sınırlar (bekçi uygular):

```json
{
  "izinliYollar": [
    "shared/lore.ts",
    "shared/chronicle.ts",
    "client/src/i18n.ts",
    "client/src/chron.ts",
    "client/src/wiki.ts",
    "docs/ozellikler/HIKAYE.md",
    "docs/GIZEM.md",
    "sirket/hafiza/**",
    "tests/integration/chronicle.test.ts",
    "tests/integration/gm-lore.test.ts"
  ],
  "yasakliYollar": [
    "server/**"
  ],
  "kapilar": [
    "npm run typecheck",
    "npx vitest run tests/integration/chronicle.test.ts tests/integration/gm-lore.test.ts"
  ],
  "gunlukKosu": 3,
  "denemeTavani": 3,
  "kapiZamanasimi": 600
}
```

Hikâye bir kişiye değil sunucuya aittir; "seçilmiş" yok. Yazılı + ortaya çıkan + sonsuz katman (docs/ozellikler/HIKAYE.md).
