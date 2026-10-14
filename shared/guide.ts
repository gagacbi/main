/**
 * Alp Rehberi (Ak Sakal'ın ikinci kitabı): çekirdek öğretici (5 adım) bitince açılan, GÖREV tarzı rehber.
 * Her görev bir sistemi öğretir ve o sistemi gerçekten kullandırır (olay sunucuda sayılır; istemci yalnızca "wiki/pazar açıldı" bildirimi gönderebilir).
 * Görevler seviyeyle açılır ve sırayla ya da paralel yapılabilir; ödüller küçük ve TEK seferliktir (eşya/yem/taş; akçe yalnızca sembolik).
 * Eski kayıtlar için ilk açılışta, koşulu zaten sağlanmış görevler ödülsüz tamamlanmış sayılır (ödül enflasyonu yok).
 */
export type GuideEv = 'skill' | 'equip' | 'hunt' | 'kimiz' | 'fishrod' | 'fishcatch' | 'fisheat' | 'daily' | 'ktfound' | 'ktset' | 'alpha' | 'bosskey' | 'chest' | 'evolve' | 'element' | 'dungeon' | 'wiki' | 'market';
export interface GuideReward { gold?: number; book?: number; charm?: number; frag?: number; kimiz?: number; hamur?: number; solucan?: number; stone?: number }
/** where: görevin yapılacağı yer (pusula oku/uzaklık için); istemci çözer */
export type GuideWhere = 'demirci' | 'otag' | 'fish' | 'aksakal' | 'chest' | 'gate' | 'stele' | 'loom' | null;
export interface GuideTask { id: string; ev: GuideEv; need: number; minLevel: number; after?: string; where: GuideWhere; reward: GuideReward }
export const GUIDE: GuideTask[] = [
  { id: 'wiki', ev: 'wiki', need: 1, minLevel: 1, where: null, reward: { gold: 50 } },
  { id: 'skill', ev: 'skill', need: 8, minLevel: 3, where: null, reward: { gold: 100 } },
  { id: 'equip', ev: 'equip', need: 1, minLevel: 2, where: null, reward: { gold: 60 } },
  { id: 'hunt', ev: 'hunt', need: 1, minLevel: 2, where: null, reward: { book: 1 } },
  { id: 'fishrod', ev: 'fishrod', need: 1, minLevel: 5, where: 'fish', reward: { hamur: 10 } },
  { id: 'fish', ev: 'fishcatch', need: 3, minLevel: 5, after: 'fishrod', where: 'fish', reward: { solucan: 5 } },
  { id: 'fisheat', ev: 'fisheat', need: 1, minLevel: 5, after: 'fish', where: null, reward: { hamur: 10 } },
  { id: 'kimiz', ev: 'kimiz', need: 1, minLevel: 10, where: 'demirci', reward: { kimiz: 2 } },
  { id: 'daily', ev: 'daily', need: 1, minLevel: 10, where: null, reward: { book: 1 } },
  { id: 'market', ev: 'market', need: 1, minLevel: 10, where: null, reward: { gold: 100 } },
  { id: 'alpha', ev: 'alpha', need: 1, minLevel: 12, where: null, reward: { book: 1 } },
  { id: 'ktfound', ev: 'ktfound', need: 1, minLevel: 15, where: null, reward: { stone: 1 } },
  { id: 'ktset', ev: 'ktset', need: 1, minLevel: 15, after: 'ktfound', where: 'demirci', reward: { gold: 300 } },
  { id: 'bosskey', ev: 'bosskey', need: 1, minLevel: 20, where: null, reward: { book: 2 } },
  { id: 'chest', ev: 'chest', need: 1, minLevel: 20, after: 'bosskey', where: 'chest', reward: { frag: 2 } },
  { id: 'evolve', ev: 'evolve', need: 1, minLevel: 20, where: 'otag', reward: { book: 3 } },
  { id: 'element', ev: 'element', need: 1, minLevel: 30, where: 'demirci', reward: { charm: 1 } },
  { id: 'dungeon', ev: 'dungeon', need: 1, minLevel: 41, where: 'gate', reward: { frag: 3 } },
];
export const GUIDE_ACKS: GuideEv[] = ['wiki', 'market'];   // istemcinin bildirebildiği tek olaylar (yalnızca panel açma)
export interface GuideState { done: string[]; prog: Record<string, number>; seen?: boolean }
export const newGuide = (): GuideState => ({ done: [], prog: {} });
export const guideNorm = (g?: GuideState): GuideState => (g && Array.isArray(g.done) && g.prog ? g : newGuide());
export const guideTask = (id: string) => GUIDE.find((t) => t.id === id);
/** görev şu an açık mı (seviye + önkoşul) */
export const guideOpen = (g: GuideState, t: GuideTask, level: number) => !g.done.includes(t.id) && level >= t.minLevel && (!t.after || g.done.includes(t.after));
/** HUD'da gösterilecek en çok n açık görev (seviye sırasıyla) */
export const guideActive = (g: GuideState, level: number, n = 3) => GUIDE.filter((t) => guideOpen(g, t, level)).slice(0, n);
export const guideDoneCount = (g: GuideState) => g.done.filter((id) => !!guideTask(id)).length;
