// Seçili game-icons.net simgelerini (CC BY 3.0) istemci için küçük bir modüle çıkarır.
//   npm run gen:icons   (devDependency: @iconify-json/game-icons)
import { readFileSync, writeFileSync } from 'node:fs';
const src = JSON.parse(readFileSync('node_modules/@iconify-json/game-icons/icons.json', 'utf8')).icons;
const NAMES = `rusty-sword broadsword katana shining-sword rune-sword ancient-sword wood-axe stone-axe battle-axe war-axe sharp-axe magic-axe fire-axe
bone-knife plain-dagger broad-dagger cloak-dagger sacrificial-dagger curvy-knife bow-arrow crossbow lightning-bow wood-stick wood-club crystal-wand wizard-staff crescent-staff skull-staff orb-wand lunar-wand
leather-armor armor-vest chest-armor layered-armor spiked-armor ninja-armor wooden-helmet light-helm viking-helmet samurai-helmet warlord-helmet horned-helm crested-helmet
primitive-necklace tribal-pendant gem-pendant emerald-necklace gem-necklace intricate-necklace ore animal-hide wood-pile log coins spell-book charm crystal-cluster round-potion standing-potion health-potion milk-carton waterskin jug
gladius machete two-handed-sword zeus-sword stiletto trench-knife bowie-knife pocket-bow chain-mail breastplate abdominal-armor spiked-shoulder-armor robe centurion-helmet spartan-helmet overlord-helm pearl-necklace necklace ankh rune-stone evil-eyes eye-of-horus
axe-swing earth-crack megaphone viking-shield thunder-struck sword-slice quake-stomp wolf-howl tribal-shield lightning-storm snake-bite tipi compass character stone-tablet skull-crossed-bones crown trophy hourglass sword-clash portal
round-shield bordered-shield spiked-shield dragon-shield leather-boot fur-boot metal-boot steeltoe-boots greaves bracer bracers gauntlet earrings drop-earrings pearl-earring crystal-earrings
tropical-fish clownfish double-fish school-of-fish flatfish angler-fish crab porcupinefish whale-tail sliced-bread earth-worm scroll-unfurled fish-bucket seahorse
fishing-pole fishing-hook fish-cooked sword-slice shield poison-bottle lightning-storm shouting earth-spit knapsack backpack crossed-swords skills open-book`.split(/\s+/).filter(Boolean);
const out = {}; const miss = [];
for (const n of NAMES) { const i = src[n]; if (!i) { miss.push(n); continue; } out[n] = i.body.replace(/<\/?g[^>]*>/g, '').trim(); }
writeFileSync('client/src/ui/gameicons.generated.ts', `/* OTOMATİK ÜRETİLDİ (scripts/gen-icons.mjs). Kaynak: game-icons.net — Lorc, Delapouite ve diğerleri, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). */\nexport const GI: Record<string, string> = ${JSON.stringify(out)};\n`);
console.log(Object.keys(out).length, 'simge', miss.length ? 'YOK: ' + miss.join(',') : '');
