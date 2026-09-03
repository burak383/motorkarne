import {
  extractDisplacement,
  estimateAnnualFuelCost,
  estimateMTV,
  estimateAnnualMaintenance,
  estimateTotalCostOfOwnership,
  DEFAULT_PRICING,
} from '../tco';
import type { Motor } from '../../data/catalog';

function mockMotor(overrides: Partial<Motor>): Motor {
  return {
    id: 'test-motor',
    name: '1.5 TSI 150 hp',
    code: 'TST',
    brands: ['TestBrand'],
    fuel: 'Benzin',
    power: '150 hp',
    consumption: '6.0 L/100km',
    transmission: 'Manuel',
    score: 7,
    risk: 'Orta',
    riskLevel: 'medium',
    note: '',
    pros: [],
    cons: [],
    chronic: [],
    ...overrides,
  };
}

describe('extractDisplacement', () => {
  it('extracts a decimal displacement from a motor name', () => {
    expect(extractDisplacement('1.5 TSI 150 hp')).toBe(1.5);
    expect(extractDisplacement('2.0 TDI 190 hp')).toBe(2.0);
  });

  it('handles comma as decimal separator', () => {
    expect(extractDisplacement('1,6 HDi 115 hp')).toBe(1.6);
  });

  it('returns null when no displacement pattern is found', () => {
    expect(extractDisplacement('Elektrik Motoru 218 hp')).toBeNull();
  });
});

describe('estimateAnnualFuelCost', () => {
  it('returns null when the motor has no consumption data', () => {
    const motor = mockMotor({ consumption: undefined });
    expect(estimateAnnualFuelCost(motor, 15000, DEFAULT_PRICING)).toBeNull();
  });

  it('calculates fuel cost using the benzin price for a petrol motor', () => {
    const motor = mockMotor({ fuel: 'Benzin', consumption: '6.0 L/100km' });
    const cost = estimateAnnualFuelCost(motor, 10000, DEFAULT_PRICING);
    // 6L/100km * 10.000 km = 600L * 66 TL = 39.600 TL
    expect(cost).toBeCloseTo(600 * DEFAULT_PRICING.fuelPrices.benzin, 1);
  });

  it('calculates fuel cost using the dizel price for a diesel motor', () => {
    const motor = mockMotor({ fuel: 'Dizel', consumption: '5.0 L/100km' });
    const cost = estimateAnnualFuelCost(motor, 20000, DEFAULT_PRICING);
    // 5L/100km * 20.000 km = 1000L * 75 TL
    expect(cost).toBeCloseTo(1000 * DEFAULT_PRICING.fuelPrices.dizel, 1);
  });

  it('calculates fuel cost using the electricity price for an EV', () => {
    const motor = mockMotor({ fuel: 'Elektrik', consumption: '17.5 kWh/100km' });
    const cost = estimateAnnualFuelCost(motor, 10000, DEFAULT_PRICING);
    expect(cost).toBeCloseTo(1750 * DEFAULT_PRICING.fuelPrices.elektrikKwh, 1);
  });

  it('calculates fuel cost using the LPG price when fuel type mentions LPG', () => {
    const motor = mockMotor({ fuel: 'Benzin/LPG', consumption: '8.0 L/100km' });
    const cost = estimateAnnualFuelCost(motor, 10000, DEFAULT_PRICING);
    expect(cost).toBeCloseTo(800 * DEFAULT_PRICING.fuelPrices.lpg, 1);
  });
});

describe('estimateMTV', () => {
  it('applies the elektrikli bracket for electric motors regardless of name', () => {
    const motor = mockMotor({ name: 'Elektrik Motoru 218 hp', fuel: 'Elektrik' });
    expect(estimateMTV(motor, DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.elektrikli);
  });

  it('applies the correct bracket for each displacement range', () => {
    expect(estimateMTV(mockMotor({ name: '1.0 TCe' }), DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.upTo1_3);
    expect(estimateMTV(mockMotor({ name: '1.5 TSI' }), DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.upTo1_6);
    expect(estimateMTV(mockMotor({ name: '1.8 TFSI' }), DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.upTo1_8);
    expect(estimateMTV(mockMotor({ name: '2.0 TDI' }), DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.upTo2_0);
    expect(estimateMTV(mockMotor({ name: '3.0 V6' }), DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.above2_0);
  });

  it('falls back to the 1.6 bracket when displacement cannot be parsed from the name', () => {
    const motor = mockMotor({ name: 'Boosterjet Turbo' });
    expect(estimateMTV(motor, DEFAULT_PRICING)).toBe(DEFAULT_PRICING.mtvBrackets.upTo1_6);
  });
});

describe('estimateAnnualMaintenance', () => {
  it('applies a 1.0x multiplier for low-risk motors', () => {
    const motor = mockMotor({ fuel: 'Benzin', score: 8.5 });
    expect(estimateAnnualMaintenance(motor, DEFAULT_PRICING)).toBeCloseTo(DEFAULT_PRICING.maintenanceBase.benzin * 1.0, 1);
  });

  it('applies a 2.0x multiplier for very-high-risk motors', () => {
    const motor = mockMotor({ fuel: 'Benzin', score: 4.0 });
    expect(estimateAnnualMaintenance(motor, DEFAULT_PRICING)).toBeCloseTo(DEFAULT_PRICING.maintenanceBase.benzin * 2.0, 1);
  });

  it('uses the correct base cost for each fuel category', () => {
    expect(estimateAnnualMaintenance(mockMotor({ fuel: 'Dizel', score: 8.5 }), DEFAULT_PRICING))
      .toBeCloseTo(DEFAULT_PRICING.maintenanceBase.dizel, 1);
    expect(estimateAnnualMaintenance(mockMotor({ fuel: 'Elektrik', score: 8.5 }), DEFAULT_PRICING))
      .toBeCloseTo(DEFAULT_PRICING.maintenanceBase.elektrik, 1);
  });
});

describe('estimateTotalCostOfOwnership', () => {
  it('sums fuel, MTV, and maintenance into a total', () => {
    const motor = mockMotor({ fuel: 'Benzin', consumption: '6.0 L/100km', name: '1.5 TSI', score: 8 });
    const result = estimateTotalCostOfOwnership(motor, 10000, DEFAULT_PRICING);
    expect(result.total).toBeCloseTo((result.fuel ?? 0) + result.mtv + result.maintenance, 1);
  });

  it('returns a null total when fuel cost cannot be calculated', () => {
    const motor = mockMotor({ consumption: undefined });
    const result = estimateTotalCostOfOwnership(motor, 10000, DEFAULT_PRICING);
    expect(result.fuel).toBeNull();
    expect(result.total).toBeNull();
    // MTV ve bakım maliyeti yine de hesaplanabilir olmalı.
    expect(result.mtv).toBeGreaterThan(0);
    expect(result.maintenance).toBeGreaterThan(0);
  });
});
