import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { PricingProvider, usePricing } from '../PricingContext';
import { DEFAULT_PRICING } from '../../utils/tco';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PricingProvider>{children}</PricingProvider>
);

describe('PricingContext', () => {
  it('starts with the embedded default pricing before any network/storage resolves', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    expect(result.current.pricing).toEqual(DEFAULT_PRICING);
  });

  it('starts with a sensible default annual km value', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    expect(result.current.annualKm).toBe(15000);
  });

  it('updates the annual km value', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    act(() => {
      result.current.setAnnualKm(25000);
    });
    expect(result.current.annualKm).toBe(25000);
  });

  it('merges a partial pricing update without discarding other fields', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    act(() => {
      result.current.updatePricing({ fuelPrices: { ...result.current.pricing.fuelPrices, benzin: 100 } });
    });
    expect(result.current.pricing.fuelPrices.benzin).toBe(100);
    // Diğer yakıt fiyatları etkilenmemeli.
    expect(result.current.pricing.fuelPrices.dizel).toBe(DEFAULT_PRICING.fuelPrices.dizel);
  });

  it('marks the source as custom after a manual update', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    act(() => {
      result.current.updatePricing({ fuelPrices: { ...result.current.pricing.fuelPrices, benzin: 100 } });
    });
    expect(result.current.source).toBe('custom');
  });

  it('resetToDefaults restores the embedded default pricing', () => {
    const { result } = renderHook(() => usePricing(), { wrapper });
    act(() => {
      result.current.updatePricing({ fuelPrices: { ...result.current.pricing.fuelPrices, benzin: 999 } });
    });
    expect(result.current.pricing.fuelPrices.benzin).toBe(999);

    act(() => {
      result.current.resetToDefaults();
    });
    expect(result.current.pricing).toEqual(DEFAULT_PRICING);
    expect(result.current.source).toBe('default');
  });
});
