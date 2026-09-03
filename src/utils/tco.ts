import type { Motor } from '../data/catalog';
import { getRiskInfo } from './risk';

export interface PricingConfig {
  fuelPrices: {
    benzin: number;
    dizel: number;
    lpg: number;
    elektrikKwh: number;
  };
  mtvBrackets: {
    upTo1_3: number;
    upTo1_6: number;
    upTo1_8: number;
    upTo2_0: number;
    above2_0: number;
    elektrikli: number;
  };
  maintenanceBase: {
    benzin: number;
    dizel: number;
    hibrit: number;
    elektrik: number;
    lpg: number;
  };
}

// Uzak yapılandırma çekilemediğinde kullanılan, uygulamaya gömülü son bilinen değerler.
// Bu değerler periyodik olarak (bkz. docs/pricing.json) güncellenmelidir.
export const DEFAULT_PRICING: PricingConfig = {
  fuelPrices: { benzin: 66, dizel: 75, lpg: 32, elektrikKwh: 2.8 },
  mtvBrackets: { upTo1_3: 6903, upTo1_6: 12028, upTo1_8: 21252, upTo2_0: 32000, above2_0: 55000, elektrikli: 7000 },
  maintenanceBase: { benzin: 9000, dizel: 12000, hibrit: 8000, elektrik: 5000, lpg: 9500 },
};

function classifyFuelCategory(fuel: string): 'benzin' | 'dizel' | 'hibrit' | 'elektrik' | 'lpg' {
  // NOT: aynı Türkçe 'İ' sorunu burada da geçerli, bkz. utils/maintenance.ts'teki
  // aynı isimli fonksiyondaki açıklama.
  const f = fuel.replace(/İ/g, 'I').toLowerCase();
  if (f.includes('elektrik')) return 'elektrik';
  if (f.includes('lpg')) return 'lpg';
  if (f.includes('hibrit') || f.includes('hybrid')) return 'hibrit';
  if (f.includes('dizel')) return 'dizel';
  return 'benzin';
}

// Motor adından silindir hacmini (örn. "1.5 TSI" -> 1.5) çıkarmaya çalışır.
export function extractDisplacement(motorName: string): number | null {
  const match = motorName.match(/(\d[.,]\d)/);
  if (!match) return null;
  return parseFloat(match[1].replace(',', '.'));
}

export function estimateAnnualFuelCost(motor: Motor, annualKm: number, pricing: PricingConfig): number | null {
  if (!motor.consumption) return null;
  const consumptionMatch = motor.consumption.match(/(\d+[.,]?\d*)/);
  if (!consumptionMatch) return null;
  const per100km = parseFloat(consumptionMatch[1].replace(',', '.'));
  const category = classifyFuelCategory(motor.fuel);

  const pricePerUnit =
    category === 'elektrik'
      ? pricing.fuelPrices.elektrikKwh
      : category === 'dizel'
      ? pricing.fuelPrices.dizel
      : category === 'lpg'
      ? pricing.fuelPrices.lpg
      : pricing.fuelPrices.benzin; // benzin ve hibrit benzin fiyatından hesaplanır

  return (per100km / 100) * annualKm * pricePerUnit;
}

export function estimateMTV(motor: Motor, pricing: PricingConfig): number {
  const category = classifyFuelCategory(motor.fuel);
  if (category === 'elektrik') return pricing.mtvBrackets.elektrikli;

  const displacement = extractDisplacement(motor.name) ?? 1.6;
  if (displacement <= 1.3) return pricing.mtvBrackets.upTo1_3;
  if (displacement <= 1.6) return pricing.mtvBrackets.upTo1_6;
  if (displacement <= 1.8) return pricing.mtvBrackets.upTo1_8;
  if (displacement <= 2.0) return pricing.mtvBrackets.upTo2_0;
  return pricing.mtvBrackets.above2_0;
}

export function estimateAnnualMaintenance(motor: Motor, pricing: PricingConfig): number {
  const category = classifyFuelCategory(motor.fuel);
  const base = pricing.maintenanceBase[category];
  const riskInfo = getRiskInfo(motor.score);
  const multiplier =
    riskInfo.tier === 'low' ? 1.0 : riskInfo.tier === 'medium' ? 1.2 : riskInfo.tier === 'high' ? 1.5 : 2.0;
  return base * multiplier;
}

export interface TcoBreakdown {
  fuel: number | null;
  mtv: number;
  maintenance: number;
  total: number | null;
}

export function estimateTotalCostOfOwnership(motor: Motor, annualKm: number, pricing: PricingConfig): TcoBreakdown {
  const fuel = estimateAnnualFuelCost(motor, annualKm, pricing);
  const mtv = estimateMTV(motor, pricing);
  const maintenance = estimateAnnualMaintenance(motor, pricing);
  return {
    fuel,
    mtv,
    maintenance,
    total: fuel === null ? null : fuel + mtv + maintenance,
  };
}
