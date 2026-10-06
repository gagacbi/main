/**
 * Endgame Enhancement Economy v1.1 — YALNIZCA SİMÜLASYON. Oyuna eklenmedi (ENH.v11 varsayılan null).
 * Tasarım önce progression eğrisi olarak tanımlandı; sink hedefine göre ayarlanmadı.
 *
 * Güç:      +9 = %160 (mevcut) → +10…+15 artışı her kademe +20,+22,+24,+26,+28,+30 puan: +15 = %310 (+9'a göre ≈ ×1.19 eşya değeri).
 * Başarı:   +10 %40 · +11 %32 · +12 %25 · +13 %18 · +14 %12 · +15 %8 (demirci kitabı +10 puan).
 * Maliyet:  mevcut formülün devamı: akçe 60·n²·(1+ilvl/6), demir cevheri 2+2n. Yeni malzeme yok.
 * Başarısızlık: +10…+12 → eşya aynı kalır (maliyet kaybolur). +13…+15 → eşya −1 düşer (kırılmaz); Tılsım (+13 ve üstünde) düşmeyi engeller.
 *           Hiçbir kademede yok olma YOK (+9'a kadar süren yatırımın toptan silinmesi hedeflenmedi).
 */
import { UP_PCT, UPGRADE_RATE, upgradeCost as _unused, type EnhOverride } from '../../../shared/game';
void _unused;
const PCT = [...UP_PCT, 180, 202, 226, 252, 280, 310, 310].slice(0, 16);
const RATE = [...UPGRADE_RATE, 40, 32, 25, 18, 12, 8];
export const ENH11: EnhOverride = {
  max: 15, pct: PCT, rate: RATE,
  cost: (t, ilvl) => ({ gold: Math.round(60 * t * t * (1 + ilvl / 6)), ore: 2 + t * 2 }),
  fail: (t) => (t >= 13 ? 'drop' : 'keep'), charmFrom: 13,
};
