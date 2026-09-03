import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { MaintenanceProvider, useMaintenance } from '../MaintenanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MaintenanceProvider>{children}</MaintenanceProvider>
);

describe('MaintenanceContext', () => {
  it('returns undefined for a vehicle with no record', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    expect(result.current.getRecord('unknown-vehicle')).toBeUndefined();
  });

  it('creates a new record on first updateCurrentKm call', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-1', 5000);
    });
    const record = result.current.getRecord('vehicle-1');
    expect(record?.currentKm).toBe(5000);
  });

  it('defaults lastOilChangeKm to currentKm when a record is first created', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-2', 8000);
    });
    expect(result.current.getRecord('vehicle-2')?.lastOilChangeKm).toBe(8000);
  });

  it('preserves lastOilChangeKm on subsequent km updates', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-3', 8000);
    });
    act(() => {
      result.current.updateCurrentKm('vehicle-3', 9500);
    });
    const record = result.current.getRecord('vehicle-3');
    expect(record?.currentKm).toBe(9500);
    expect(record?.lastOilChangeKm).toBe(8000);
  });

  it('recordOilChange updates lastOilChangeKm to the current km by default', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-4', 12000);
    });
    act(() => {
      result.current.recordOilChange('vehicle-4');
    });
    expect(result.current.getRecord('vehicle-4')?.lastOilChangeKm).toBe(12000);
  });

  it('recordOilChange accepts an explicit km value', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-5', 12000);
    });
    act(() => {
      result.current.recordOilChange('vehicle-5', 11800);
    });
    expect(result.current.getRecord('vehicle-5')?.lastOilChangeKm).toBe(11800);
  });

  it('recordOilChange on a non-existent vehicle is a no-op', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.recordOilChange('never-created-vehicle');
    });
    expect(result.current.getRecord('never-created-vehicle')).toBeUndefined();
  });

  it('removeRecord deletes an existing record', () => {
    const { result } = renderHook(() => useMaintenance(), { wrapper });
    act(() => {
      result.current.updateCurrentKm('vehicle-6', 3000);
    });
    expect(result.current.getRecord('vehicle-6')).toBeDefined();

    act(() => {
      result.current.removeRecord('vehicle-6');
    });
    expect(result.current.getRecord('vehicle-6')).toBeUndefined();
  });
});
