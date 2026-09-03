import { getRiskInfo, RISK_TIER_ORDER } from '../risk';

describe('getRiskInfo', () => {
  it('classifies scores below 6 as very-high risk', () => {
    expect(getRiskInfo(0).tier).toBe('very-high');
    expect(getRiskInfo(5).tier).toBe('very-high');
    expect(getRiskInfo(5.9).tier).toBe('very-high');
  });

  it('classifies the 6-6.9 range as high risk', () => {
    expect(getRiskInfo(6).tier).toBe('high');
    expect(getRiskInfo(6.5).tier).toBe('high');
    expect(getRiskInfo(6.99).tier).toBe('high');
  });

  it('classifies the 7-7.9 range as medium risk', () => {
    expect(getRiskInfo(7).tier).toBe('medium');
    expect(getRiskInfo(7.5).tier).toBe('medium');
    expect(getRiskInfo(7.99).tier).toBe('medium');
  });

  it('classifies 8 and above as low risk', () => {
    expect(getRiskInfo(8).tier).toBe('low');
    expect(getRiskInfo(9).tier).toBe('low');
    expect(getRiskInfo(10).tier).toBe('low');
  });

  it('returns the correct color key for each tier', () => {
    expect(getRiskInfo(5).colorKey).toBe('destructive');
    expect(getRiskInfo(6).colorKey).toBe('chart3');
    expect(getRiskInfo(7).colorKey).toBe('primary');
    expect(getRiskInfo(8).colorKey).toBe('success');
  });

  it('returns a Turkish label for each tier', () => {
    expect(getRiskInfo(5).label).toBe('Çok Yüksek Risk');
    expect(getRiskInfo(6).label).toBe('Yüksek Risk');
    expect(getRiskInfo(7).label).toBe('Orta Risk');
    expect(getRiskInfo(8).label).toBe('Düşük Risk');
  });
});

describe('RISK_TIER_ORDER', () => {
  it('orders tiers from best (low) to worst (very-high)', () => {
    expect(RISK_TIER_ORDER.low).toBeLessThan(RISK_TIER_ORDER.medium);
    expect(RISK_TIER_ORDER.medium).toBeLessThan(RISK_TIER_ORDER.high);
    expect(RISK_TIER_ORDER.high).toBeLessThan(RISK_TIER_ORDER['very-high']);
  });
});
