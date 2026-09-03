import { getOilChangeIntervalKm, isElectric, getMaintenanceStatus } from '../maintenance';
import type { Motor } from '../../data/catalog';

function mockMotor(fuel: string): Motor {
  return {
    id: 'test-motor',
    name: 'Test Motor',
    code: 'TST',
    brands: ['TestBrand'],
    fuel,
    power: '100 hp',
    transmission: 'Manuel',
    score: 7,
    risk: 'Orta',
    riskLevel: 'medium',
    note: '',
    pros: [],
    cons: [],
    chronic: [],
  };
}

describe('getOilChangeIntervalKm', () => {
  it('returns the correct interval for each fuel category', () => {
    expect(getOilChangeIntervalKm(mockMotor('Dizel'))).toBe(15000);
    expect(getOilChangeIntervalKm(mockMotor('Hibrit Benzin'))).toBe(12000);
    expect(getOilChangeIntervalKm(mockMotor('Elektrik'))).toBe(20000);
    expect(getOilChangeIntervalKm(mockMotor('Benzin/LPG'))).toBe(10000);
    expect(getOilChangeIntervalKm(mockMotor('Benzin'))).toBe(10000);
  });

  it('is case-insensitive when classifying fuel type', () => {
    expect(getOilChangeIntervalKm(mockMotor('DİZEL'))).toBe(15000);
  });
});

describe('isElectric', () => {
  it('returns true only for electric motors', () => {
    expect(isElectric(mockMotor('Elektrik'))).toBe(true);
    expect(isElectric(mockMotor('Hibrit Benzin'))).toBe(false);
    expect(isElectric(mockMotor('Benzin'))).toBe(false);
  });
});

describe('getMaintenanceStatus', () => {
  it('reports not overdue when well within the interval', () => {
    const motor = mockMotor('Benzin'); // 10.000 km aralık
    const status = getMaintenanceStatus(motor, 5000, 0);
    expect(status.drivenSinceLastChange).toBe(5000);
    expect(status.remainingKm).toBe(5000);
    expect(status.isOverdue).toBe(false);
    expect(status.isNear).toBe(false);
  });

  it('reports isNear when 1000 km or less remains', () => {
    const motor = mockMotor('Benzin');
    const status = getMaintenanceStatus(motor, 9500, 0);
    expect(status.remainingKm).toBe(500);
    expect(status.isNear).toBe(true);
    expect(status.isOverdue).toBe(false);
  });

  it('reports isOverdue when the interval has been exceeded', () => {
    const motor = mockMotor('Benzin');
    const status = getMaintenanceStatus(motor, 11000, 0);
    expect(status.remainingKm).toBeLessThanOrEqual(0);
    expect(status.isOverdue).toBe(true);
  });

  it('clamps drivenSinceLastChange to zero if currentKm is before lastOilChangeKm', () => {
    const motor = mockMotor('Benzin');
    const status = getMaintenanceStatus(motor, 1000, 5000);
    expect(status.drivenSinceLastChange).toBe(0);
    expect(status.progressRatio).toBe(0);
  });

  it('clamps progressRatio between 0 and 1', () => {
    const motor = mockMotor('Benzin'); // 10.000 km aralık
    const overdueStatus = getMaintenanceStatus(motor, 50000, 0);
    expect(overdueStatus.progressRatio).toBe(1);

    const freshStatus = getMaintenanceStatus(motor, 0, 0);
    expect(freshStatus.progressRatio).toBe(0);
  });
});
