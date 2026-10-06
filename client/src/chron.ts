import { ERA_AT, THREAT_A, THREAT_B, eraStartPts, threatName, type ChronEntry } from '@shared/chronicle';
import { DUNGEON_IDS } from '@shared/dungeon';
import { FIELD_BOSS } from '@shared/game';
import { getLang, t } from './i18n';

export { eraStartPts };
export interface ChronView { entries: ChronEntry[]; pts: number; era: number; firsts: Record<string, string>; eraAt: number[]; ruins: number }

const TH_EN = [['Crimson', 'Black', 'Iron', 'Silent', 'Rotten', 'Silver', 'Ember', 'Pale'], ['Wind', 'Swarm', 'Shadow', 'Star', 'Earth', 'Wolf', 'Water', 'Gate']];
/** Sabit çağlarda t('era.N'), sonsuz çağlarda deterministik "Kızıl Sürü Çağı" */
export function eraName(n: number): string {
  if (n < ERA_AT.length) return t('era.' + n);
  const [a, b] = threatName(n);
  return getLang() === 'tr' ? `${THREAT_A[a]} ${THREAT_B[b]} ${t('era.suffix')}` : `${t('era.suffix')} of the ${TH_EN[0][a]} ${TH_EN[1][b]}`;
}
export function eraText(n: number): string { return n < ERA_AT.length ? t('era.' + n + '.d') : t('era.endless', { name: eraName(n) }); }

export function chronAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000)); if (s < 90) return t('chron.now');
  const m = Math.round(s / 60); if (m < 90) return t('chron.min', { n: m }); const h = Math.round(m / 60); if (h < 36) return t('chron.hour', { n: h }); return t('chron.day', { n: Math.round(h / 24) });
}
export function chronLine(e: ChronEntry): string {
  switch (e.k) {
    case 'boss': return t(e.b ? 'chron.boss.first' : 'chron.boss', { who: e.who, boss: t(FIELD_BOSS.list[e.a - 1]?.[2] ?? 'boss.1') });
    case 'rift': return t('chron.rift', { who: e.who, a: e.a });
    case 'dungeon': return t('chron.dungeon', { who: e.who, d: t('map.' + (DUNGEON_IDS[e.a] ?? 'demir')) });
    case 'level': return t('chron.level', { who: e.who, a: e.a });
    case 'insc': return t('chron.insc', { who: e.who, a: e.a });
    case 'ruin': return t('chron.ruin', { who: e.who, a: e.a });
    case 'era': return t('chron.era', { name: eraName(e.a) });
    default: return e.who;
  }
}
