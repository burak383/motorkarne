import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CatalogProvider, useCatalog } from '../CatalogContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CatalogProvider>{children}</CatalogProvider>
);

describe('CatalogContext', () => {
  it('finds a known seed motor by id', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    const motor = result.current.getMotorById('tdi-16-ea288');
    expect(motor).toBeDefined();
    expect(motor?.name).toBeTruthy();
  });

  it('returns undefined for an unknown motor id', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    expect(result.current.getMotorById('bulunmayan-motor-id')).toBeUndefined();
  });

  it('searchMotors matches by brand name case-insensitively', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    const matches = result.current.searchMotors('volkswagen');
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every((m) => m.brands.some((b) => b.toLowerCase().includes('volkswagen')))
    ).toBe(true);
  });

  it('searchMotors returns all motors for an empty query', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    expect(result.current.searchMotors('').length).toBe(result.current.motors.length);
  });

  it('rejects adding a motor with a duplicate id', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });

    let response: { success: boolean; error?: string } | undefined;
    act(() => {
      response = result.current.addMotor({
        id: 'tdi-16-ea288',
        name: 'Çakışan Motor',
        code: 'X',
        brands: ['Test'],
        fuel: 'Dizel',
        power: '100 hp',
        transmission: 'Manuel',
        score: 5,
        risk: 'Orta',
        riskLevel: 'medium',
        note: '',
        pros: [],
        cons: [],
        chronic: [],
      });
    });

    expect(response?.success).toBe(false);
  });

  it('adds a new motor with a unique id and makes it searchable', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });

    act(() => {
      result.current.addMotor({
        id: 'test-motor-unique-1',
        name: 'Test Motor 1.0',
        code: 'TEST1',
        brands: ['TestBrand'],
        fuel: 'Benzin',
        power: '90 hp',
        transmission: 'Manuel',
        score: 7,
        risk: 'İyi',
        riskLevel: 'low',
        note: 'test',
        pros: [],
        cons: [],
        chronic: [],
      });
    });

    expect(result.current.getMotorById('test-motor-unique-1')).toBeDefined();
    expect(result.current.searchMotors('TestBrand').length).toBe(1);
  });

  it('updates an existing motor', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });

    act(() => {
      result.current.addMotor({
        id: 'test-motor-update-1',
        name: 'Eski İsim',
        code: 'U1',
        brands: ['X'],
        fuel: 'Benzin',
        power: '100 hp',
        transmission: 'Manuel',
        score: 6,
        risk: 'Orta',
        riskLevel: 'medium',
        note: '',
        pros: [],
        cons: [],
        chronic: [],
      });
    });

    act(() => {
      result.current.updateMotor('test-motor-update-1', { name: 'Yeni İsim' });
    });

    expect(result.current.getMotorById('test-motor-update-1')?.name).toBe('Yeni İsim');
  });

  it('deletes a motor', () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });

    act(() => {
      result.current.addMotor({
        id: 'test-motor-delete-1',
        name: 'Silinecek Motor',
        code: 'D1',
        brands: ['X'],
        fuel: 'Benzin',
        power: '100 hp',
        transmission: 'Manuel',
        score: 6,
        risk: 'Orta',
        riskLevel: 'medium',
        note: '',
        pros: [],
        cons: [],
        chronic: [],
      });
    });
    expect(result.current.getMotorById('test-motor-delete-1')).toBeDefined();

    act(() => {
      result.current.deleteMotor('test-motor-delete-1');
    });
    expect(result.current.getMotorById('test-motor-delete-1')).toBeUndefined();
  });
});
