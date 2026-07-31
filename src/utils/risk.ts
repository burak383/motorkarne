export type RiskTier = 'very-high' | 'high' | 'medium' | 'low';

export interface RiskInfo {
  tier: RiskTier;
  label: string;
  // theme.ts renk anahtarı: destructive (kırmızı) / chart3 (turuncu) / primary (mavi) / success (yeşil)
  colorKey: 'destructive' | 'chart3' | 'primary' | 'success';
}

/**
 * Uygulama genelinde tek, tutarlı risk politikası.
 * Skor < 6            -> Çok Yüksek Risk (kırmızı)
 * 6 <= Skor < 7        -> Yüksek Risk (turuncu)
 * 7 <= Skor < 8        -> Orta Risk (mavi)
 * Skor >= 8            -> Düşük Risk (yeşil)
 */
export function getRiskInfo(score: number): RiskInfo {
  if (score < 6) return { tier: 'very-high', label: 'Çok Yüksek Risk', colorKey: 'destructive' };
  if (score < 7) return { tier: 'high', label: 'Yüksek Risk', colorKey: 'chart3' };
  if (score < 8) return { tier: 'medium', label: 'Orta Risk', colorKey: 'primary' };
  return { tier: 'low', label: 'Düşük Risk', colorKey: 'success' };
}

// KarsilastirScreen gibi "hangisi daha iyi" karşılaştırmaları için sıralama yardımcı fonksiyonu.
export const RISK_TIER_ORDER: Record<RiskTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
  'very-high': 3,
};
