import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { CatalogProvider, useCatalog } from '../CatalogContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CatalogProvider>{children}</CatalogProvider>
);

// CatalogContext, açılışta ve her addMotor/updateMotor/deleteMotor çağrısında gerçek
// Railway API'sine bir ağ isteği (fetch) atmaya çalışıyor. Testlerde gerçek ağa hiç
// çıkmamak için fetch'i her zaman "çevrimdışı" gibi davranacak şekilde mock'luyoruz —
// bu hem testleri hızlandırıyor hem de gerçek sunucunun ayakta olmasına bağımlılığı
// ortadan kaldırıyor. CatalogContext zaten ağ hatasında sessizce yerel/statik veriye
// düşecek şekilde tasarlandığı için, bu mock'lama context'in asıl davranışını değiştirmiyor.
beforeEach(() => {
  global.fetch = jest.fn(() => Promise.reject(new Error('test ortamında ağ devre dışı'))) as any;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// YARIŞ DURUMU NOTU: CatalogProvider mount olduğunda kendi başlangıç bootstrap()'ı
// (önbellek + ağ denemesi, ikisi de başarısız olunca statik veriye geri dönüş) arka
// planda çalışmaya başlıyor. Bu bootstrap tamamlanmadan bir mutasyon (addMotor vb.)
// çağrılırsa, bootstrap'ın geç biten "statik veriye dön" adımı testin eklediği veriyi
// üzerine yazabiliyor. Bu yüzden her mutasyon testinden önce isLoading'in false
// olmasını (bootstrap'ın bittiğini) bekliyoruz.
async function waitForBootstrap(result: { current: ReturnType<typeof useCatalog> }) {
  await waitFor(() => expect(result.current.isLoading).toBe(false));
}

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

  it('rejects adding a motor with a duplicate id', async () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    await waitForBootstrap(result);

    let response: { success: boolean; error?: string } | undefined;
    await act(async () => {
      response = await result.current.addMotor({
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

  it('adds a new motor with a unique id and makes it searchable', async () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    await waitForBootstrap(result);

    await act(async () => {
      await result.current.addMotor({
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

  it('updates an existing motor', async () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    await waitForBootstrap(result);

    await act(async () => {
      await result.current.addMotor({
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

    await act(async () => {
      await result.current.updateMotor('test-motor-update-1', { name: 'Yeni İsim' });
    });

    expect(result.current.getMotorById('test-motor-update-1')?.name).toBe('Yeni İsim');
  });

  it('deletes a motor', async () => {
    const { result } = renderHook(() => useCatalog(), { wrapper });
    await waitForBootstrap(result);

    await act(async () => {
      await result.current.addMotor({
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

    await act(async () => {
      await result.current.deleteMotor('test-motor-delete-1');
    });
    expect(result.current.getMotorById('test-motor-delete-1')).toBeUndefined();
  });
});
