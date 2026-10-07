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

/**
 * v1.2 — v1.1'in 30 günlük sonucuna (docs/balans/ENH11_30GUN.md) karşı tasarım düzeltmesi. YALNIZCA SİMÜLASYON.
 * Bulgu: Tılsım ve kitap mob drop'u olarak birikiyor (olgun oyuncuda gün sonu ≈750 Tılsım, ≈1400 kitap); adet artırmak kısıtlamaz.
 * Aynı: başarı oranları 40/32/25/18/12/8, başarısızlık kuralı (+13…+15 düşme, Tılsım korur), güç eğrisi.
 * Değişen:
 *   1. Demirci kitabı +10…+15'te bonus VERMEZ (v1.1: +10 puan) → tablo oranları gerçek oran olur.
 *   2. Koruma (Tılsım) +13…+15'te ek akçe bedeli ister: deneme akçesinin %60'ı (Tılsım tek başına kısıt değil).
 *   3. Akçe maliyet çarpanı: +10 ×1,0 · +11 ×1,15 · +12 ×1,3 · +13 ×1,6 · +14 ×2,1 · +15 ×3,0.
 *   4. Günlük sınır: hedef ≥ +12 olan denemeler oyuncu başına günde 2 (sunucu doğrulamalı, UTC+3 günü).
 */
const MULT: Record<number, number> = { 10: 1, 11: 1.15, 12: 1.3, 13: 1.6, 14: 2.1, 15: 3.0 };
export const ENH12: EnhOverride = {
  ...ENH11, bookBonus: 0, protectFee: 0.6, dailyCap: { from: 12, n: 2 },
  cost: (t, ilvl) => ({ gold: Math.round(60 * t * t * (1 + ilvl / 6) * (MULT[t] ?? 1)), ore: 2 + t * 2 }),
};

/**
 * v1.3 — kök neden çözümü (docs/balans/ENH13_KOK_NEDEN.md). YALNIZCA SİMÜLASYON.
 * Kök nedenler: (1) güç eğrisi: v1.1/v1.2 +15 = +9'a göre ×1,58 (belgedeki "×1,19" aritmetik hataydı) → yoğunlaşma;
 *               (2) Tılsım/kitap mob drop'u olarak sınırsız → koruma ve bonus kuralları etkisiz;
 *               (3) maliyet ölçeği: +10…+15 harcaması olgun oyuncu gelirinin %2,6'sı.
 * Değişen: düz güç eğrisi (+9 %160 → +15 %210 = +9'a göre ×1,19), kitap bonusu yok, koruma/Tılsım yok (başarısızlıkta eşya kalır, düşme yok),
 *          maliyet çarpanı +10 ×1,0 · +11 ×1,2 · +12 ×1,5 · +13 ×2,0 · +14 ×2,8 · +15 ×4,0 (+15 aşaması en pahalı), günlük sınır: hedef ≥+12 için 2 deneme.
 * Aynı: başarı oranları 40/32/25/18/12/8.
 */
const MULT3: Record<number, number> = { 10: 1, 11: 1.2, 12: 1.5, 13: 2.0, 14: 2.8, 15: 4.0 };
export const ENH13: EnhOverride = {
  ...ENH11, pct: [...UP_PCT, 168, 176, 184, 192, 200, 210], bookBonus: 0, charmFrom: 99, fail: () => 'keep', dailyCap: { from: 12, n: 2 },
  cost: (t, ilvl) => ({ gold: Math.round(60 * t * t * (1 + ilvl / 6) * (MULT3[t] ?? 1)), ore: 2 + t * 2 }),
};
