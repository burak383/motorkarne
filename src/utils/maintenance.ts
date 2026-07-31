import type { Motor } from '../data/catalog';

function classifyFuelCategory(fuel: string): 'benzin' | 'dizel' | 'hibrit' | 'elektrik' | 'lpg' {
  const f = fuel.toLowerCase();
  if (f.includes('elektrik')) return 'elektrik';
  if (f.includes('lpg')) return 'lpg';
  if (f.includes('hibrit') || f.includes('hybrid')) return 'hibrit';
  if (f.includes('dizel')) return 'dizel';
  return 'benzin';
}

// Yakıt tipine göre genel/tipik yağ değişimi aralığı (km).
// Elektrikli araçlarda motor yağı değişimi kavramı yoktur — bunun yerine
// genel periyodik bakım aralığı kullanılır.
export function getOilChangeIntervalKm(motor: Motor): number {
  const category = classifyFuelCategory(motor.fuel);
  switch (category) {
    case 'dizel':
      return 15000;
    case 'hibrit':
      return 12000;
    case 'elektrik':
      return 20000; // genel periyodik bakım (fren, lastik, batarya kontrolü vb.)
    case 'lpg':
      return 10000;
    default:
      return 10000;
  }
}

export function isElectric(motor: Motor): boolean {
  return classifyFuelCategory(motor.fuel) === 'elektrik';
}

export interface MaintenanceStatus {
  intervalKm: number;
  drivenSinceLastChange: number;
  remainingKm: number;
  isOverdue: boolean;
  isNear: boolean; // 1000 km ve altı kaldıysa
  progressRatio: number; // 0 (yeni değişildi) - 1 (tam zamanı)
}

export function getMaintenanceStatus(
  motor: Motor,
  currentKm: number,
  lastOilChangeKm: number
): MaintenanceStatus {
  const intervalKm = getOilChangeIntervalKm(motor);
  const drivenSinceLastChange = Math.max(0, currentKm - lastOilChangeKm);
  const remainingKm = intervalKm - drivenSinceLastChange;
  return {
    intervalKm,
    drivenSinceLastChange,
    remainingKm,
    isOverdue: remainingKm <= 0,
    isNear: remainingKm > 0 && remainingKm <= 1000,
    progressRatio: Math.min(1, Math.max(0, drivenSinceLastChange / intervalKm)),
  };
}
