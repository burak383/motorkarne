import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { VehicleProvider, useVehicles } from '../VehicleContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <VehicleProvider>{children}</VehicleProvider>
);

describe('VehicleContext', () => {
  it('finds a known seed vehicle by id', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    // Statik veriden (ağ/önbellek gelmeden önceki ilk render) gelen bilinen bir araç.
    const vehicle = result.current.vehicles[0];
    expect(vehicle).toBeDefined();
    const found = result.current.getVehicleById(vehicle.id);
    expect(found?.id).toBe(vehicle.id);
  });

  it('returns undefined for an unknown vehicle id', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    expect(result.current.getVehicleById('bulunmayan-arac-id')).toBeUndefined();
  });

  it('getVehiclesByMotor only returns vehicles matching that motor', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    const sample = result.current.vehicles[0];
    const matches = result.current.getVehiclesByMotor(sample.motorId);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((v) => v.motorId === sample.motorId)).toBe(true);
  });

  it('getVehiclesByMotor returns an empty array for an unknown motor id', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    expect(result.current.getVehiclesByMotor('bulunmayan-motor-id')).toEqual([]);
  });

  it('searchVehicles matches by brand name case-insensitively', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    const sample = result.current.vehicles[0];
    const query = sample.brand.toLowerCase();
    const matches = result.current.searchVehicles(query);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((v) => v.id === sample.id)).toBe(true);
  });

  it('searchVehicles returns all vehicles for an empty query', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    expect(result.current.searchVehicles('').length).toBe(result.current.vehicles.length);
  });

  it('searchVehicles returns an empty array for a query matching nothing', () => {
    const { result } = renderHook(() => useVehicles(), { wrapper });
    expect(result.current.searchVehicles('zzz-hicbir-eslesme-yok-zzz')).toEqual([]);
  });
});
