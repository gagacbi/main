/**
 * KUT gizemi: "Mühür dışarıdan açıldı." Beş ipliği ayrı sistemler besler; hiçbir iplik tek başına gerçeği vermez.
 *  insc  : Kayıp Yazıtlar    — sunucu çapı, topluluk birlikte çözer
 *  dream : Kurdun Rüyaları   — uzun süre çevrimdışı kalıp dönen oyuncuya, sırayla
 *  elder : Ak Sakal          — seviye eşiklerinde, yalnızca ona gidenlere
 *  stone : Balbal Taşları    — bozkıra dağılmış 8 taş, gezen bulur
 *  shard : Mühür Kırıkları   — Erlik çatlaklarını kapatanlara düşer
 * Dört ipliğin ucu birleşince "Mühürün Dışı" açılır; ama "dıştaki el" sorusunun yanıtı bilerek yazılmamıştır.
 */
export type Thread = 'insc' | 'dream' | 'elder' | 'stone' | 'shard' | 'truth';
export const THREADS: Thread[] = ['insc', 'dream', 'elder', 'stone', 'shard', 'truth'];
export const THREAD_SIZE: Record<Thread, number> = { insc: 5, dream: 5, elder: 5, stone: 8, shard: 3, truth: 1 };
/** oyuncuya ait iplikler (insc sunucu çapıdır, oyuncu verisinde tutulmaz) */
export const clueId = (t: Thread, n: number) => `${t}.${n}`;

export const DREAM_MIN_HOURS = 4; // bu kadar çevrimdışı kalıp dönünce bir sonraki rüya görülür
export const ELDER_LEVELS = [3, 8, 14, 20, 28];
export const SHARD_AT = [1, 3, 6]; // toplam kırık sayısı eşikleri
export const STONE_REWARD_GOLD = 40;
export const CLUE_GOLD = 60;
export const STONE_LAST_NEEDS = 7;

/** Gizem ilerlemesi (ipucu sayısı) → "Mühürün Dışı" açılır mı? En az 4 ipliğin ucu yeterince ilerlemeli. */
export function truthUnlocked(clues: readonly string[], inscUnlocked: number): boolean {
  const c = (t: Thread) => clues.filter((x) => x.startsWith(t + '.')).length;
  const ok = [inscUnlocked >= 2, c('dream') >= 2, c('elder') >= 2, c('stone') >= 3, c('shard') >= 1];
  return ok.filter(Boolean).length >= 4;
}

/** Unvanlar: bir ipliği tamamlayanlara */
export const TITLES: Partial<Record<Thread, string>> = { dream: 'title.dream', elder: 'title.elder', stone: 'title.stone', shard: 'title.shard', truth: 'title.truth' };
export function titlesOf(clues: readonly string[]): string[] {
  return (Object.keys(TITLES) as Thread[]).filter((t) => clues.filter((x) => x.startsWith(t + '.')).length >= THREAD_SIZE[t]).map((t) => TITLES[t]!);
}
