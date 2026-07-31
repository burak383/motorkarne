import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { FavoritesProvider, useFavorites } from '../FavoritesContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);

describe('FavoritesContext', () => {
  it('adds a vehicle to favorites when toggled the first time', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleVehicle('test-vehicle-1');
    });

    expect(result.current.isVehicleSaved('test-vehicle-1')).toBe(true);
  });

  it('removes a vehicle from favorites when toggled a second time', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleVehicle('test-vehicle-2');
    });
    expect(result.current.isVehicleSaved('test-vehicle-2')).toBe(true);

    act(() => {
      result.current.toggleVehicle('test-vehicle-2');
    });
    expect(result.current.isVehicleSaved('test-vehicle-2')).toBe(false);
  });

  it('adds and removes a saved comparison', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.addComparison('motor-a', 'motor-b');
    });
    expect(result.current.savedComparisons.length).toBeGreaterThan(0);

    const comparisonId = result.current.savedComparisons[0].id;
    act(() => {
      result.current.removeComparison(comparisonId);
    });
    expect(result.current.savedComparisons.find((c) => c.id === comparisonId)).toBeUndefined();
  });

  it('clears all saved vehicles and comparisons', () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    act(() => {
      result.current.toggleVehicle('test-vehicle-3');
      result.current.addComparison('motor-a', 'motor-b');
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.savedVehicles.length).toBe(0);
    expect(result.current.savedComparisons.length).toBe(0);
  });
});
