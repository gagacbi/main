# altyapi — kurallar

Makine okunur sınırlar (bekçi uygular):

```json
{
  "izinliYollar": [
    "server/**",
    "shared/protocol.ts",
    "tests/**",
    "scripts/**",
    "package.json",
    "vitest.config.ts",
    "vite.config.ts"
  ],
  "yasakliYollar": [
    "shared/game.ts"
  ],
  "kapilar": [
    "npm run typecheck",
    "npx vitest run"
  ],
  "gunlukKosu": 3,
  "denemeTavani": 3,
  "kapiZamanasimi": 900
}
```

Gerçek GPU ve ağ ölçümü bu ortamda yapılamaz; ölçülemeyen şey raporda "ölçülmedi" yazar.
