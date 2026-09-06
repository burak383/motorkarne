import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { MaintenanceProvider, useMaintenance } from '../MaintenanceContext';
import { MembersProvider, useMembers } from '../MembersContext';

// MaintenanceContext artık hesaba bağlı (bkz. MaintenanceContext.tsx yorumları — aynı
// FavoritesContext deseni), bu yüzden testlerde MembersProvider'ı da sarmalayıp önce
// bir üye ile "giriş yapıyoruz". Aksi halde updateCurrentKm/recordOilChange/removeRecord
// hiçbir şey yapmadan sessizce no-op döner (giriş yapılmamış kabul edilir).
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MembersProvider>
    <MaintenanceProvider>{children}</MaintenanceProvider>
  </MembersProvider>
);

function useHarness() {
  const members = useMembers();
  const maintenance = useMaintenance();
  return { members, maintenance };
}

let emailCounter = 0;

// Girişten sonra MaintenanceContext, yeni kullanıcının kayıtlarını AsyncStorage'dan
// asenkron olarak yükler (bkz. MaintenanceContext.tsx useEffect). Bu yükleme bitmeden
// updateCurrentKm çağrılırsa, yükleme sonradan tamamlanıp state'in üzerine boş
// objeyle yazabilir (race condition). Bu yardımcı, bekleyen tüm mikro/makro
// görevlerin tamamlanmasını sağlayarak testleri bu yarıştan korur (bkz. aynı
// yardımcının FavoritesContext.test.tsx'teki hâli).
async function flushPendingEffects() {
  await act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderLoggedInHarness() {
  const rendered = renderHook(() => useHarness(), { wrapper });
  await flushPendingEffects();

  const email = `test-${++emailCounter}@example.com`;

  await act(async () => {
    rendered.result.current.members.registerMember({
      fullName: 'Test User',
      email,
      password: 'password123',
    });
  });

  await waitFor(() => {
    expect(rendered.result.current.members.currentUser).not.toBeNull();
  });

  await flushPendingEffects();

  return rendered;
}

describe('MaintenanceContext', () => {
  it('returns undefined for a vehicle with no record', async () => {
    const { result } = await renderLoggedInHarness();
    expect(result.current.maintenance.getRecord('unknown-vehicle')).toBeUndefined();
  });

  it('does not persist a km update while logged out (misafir modunda kayıt tutulmamalı)', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-guest', 5000);
    });

    expect(result.current.maintenance.getRecord('vehicle-guest')).toBeUndefined();
  });

  it('creates a new record on first updateCurrentKm call', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-1', 5000);
    });
    const record = result.current.maintenance.getRecord('vehicle-1');
    expect(record?.currentKm).toBe(5000);
  });

  it('defaults lastOilChangeKm to currentKm when a record is first created', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-2', 8000);
    });
    expect(result.current.maintenance.getRecord('vehicle-2')?.lastOilChangeKm).toBe(8000);
  });

  it('preserves lastOilChangeKm on subsequent km updates', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-3', 8000);
    });
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-3', 9500);
    });
    const record = result.current.maintenance.getRecord('vehicle-3');
    expect(record?.currentKm).toBe(9500);
    expect(record?.lastOilChangeKm).toBe(8000);
  });

  it('recordOilChange updates lastOilChangeKm to the current km by default', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-4', 12000);
    });
    act(() => {
      result.current.maintenance.recordOilChange('vehicle-4');
    });
    expect(result.current.maintenance.getRecord('vehicle-4')?.lastOilChangeKm).toBe(12000);
  });

  it('recordOilChange accepts an explicit km value', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-5', 12000);
    });
    act(() => {
      result.current.maintenance.recordOilChange('vehicle-5', 11800);
    });
    expect(result.current.maintenance.getRecord('vehicle-5')?.lastOilChangeKm).toBe(11800);
  });

  it('recordOilChange on a non-existent vehicle is a no-op', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.recordOilChange('never-created-vehicle');
    });
    expect(result.current.maintenance.getRecord('never-created-vehicle')).toBeUndefined();
  });

  it('removeRecord deletes an existing record', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-6', 3000);
    });
    expect(result.current.maintenance.getRecord('vehicle-6')).toBeDefined();

    act(() => {
      result.current.maintenance.removeRecord('vehicle-6');
    });
    expect(result.current.maintenance.getRecord('vehicle-6')).toBeUndefined();
  });

  it('keeps maintenance records isolated per account', async () => {
    const first = await renderLoggedInHarness();
    act(() => {
      first.result.current.maintenance.updateCurrentKm('vehicle-owned-by-first-user', 4200);
    });
    expect(first.result.current.maintenance.getRecord('vehicle-owned-by-first-user')?.currentKm).toBe(4200);

    const second = await renderLoggedInHarness();
    expect(second.result.current.maintenance.getRecord('vehicle-owned-by-first-user')).toBeUndefined();
  });

  it('clearAll removes every record for the current account', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.maintenance.updateCurrentKm('vehicle-7', 1000);
    });
    expect(result.current.maintenance.getRecord('vehicle-7')).toBeDefined();

    act(() => {
      result.current.maintenance.clearAll();
    });
    expect(result.current.maintenance.getRecord('vehicle-7')).toBeUndefined();
    expect(result.current.maintenance.records).toEqual({});
  });
});
