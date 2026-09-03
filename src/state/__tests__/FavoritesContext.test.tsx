import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { FavoritesProvider, useFavorites } from '../FavoritesContext';
import { MembersProvider, useMembers } from '../MembersContext';

// FavoritesContext artık hesaba bağlı (bkz. FavoritesContext.tsx yorumları), bu yüzden
// testlerde MembersProvider'ı da sarmalayıp önce bir üye ile "giriş yapıyoruz".
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MembersProvider>
    <FavoritesProvider>{children}</FavoritesProvider>
  </MembersProvider>
);

function useHarness() {
  const members = useMembers();
  const favorites = useFavorites();
  return { members, favorites };
}

let emailCounter = 0;

// Girişten sonra FavoritesContext, yeni kullanıcının kayıtlarını AsyncStorage'dan
// asenkron olarak yükler (bkz. FavoritesContext.tsx useEffect). Bu yükleme bitmeden
// toggleVehicle/addComparison çağrılırsa, yükleme sonradan tamamlanıp state'in
// üzerine boş listeyle yazabilir (race condition). Bu yardımcı, bekleyen tüm
// mikro/makro görevlerin tamamlanmasını sağlayarak testleri bu yarıştan korur.
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
  // MembersProvider'ın mount anındaki asenkron üye/oturum yüklemesinin bitmesini
  // bekle; aksi halde biraz aşağıdaki registerMember çağrısı, henüz sürmekte olan
  // o yükleme tarafından ezilebilir.
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

describe('FavoritesContext', () => {
  it('is empty before logging in (misafir modunda kayıt gösterilmemeli)', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    expect(result.current.members.currentUser).toBeNull();
    expect(result.current.favorites.savedVehicles).toEqual([]);
    expect(result.current.favorites.savedComparisons).toEqual([]);
  });

  it('does not persist a toggle while logged out', () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.favorites.toggleVehicle('test-vehicle-guest');
    });

    expect(result.current.favorites.isVehicleSaved('test-vehicle-guest')).toBe(false);
  });

  it('adds a vehicle to favorites when toggled the first time (logged in)', async () => {
    const { result } = await renderLoggedInHarness();

    act(() => {
      result.current.favorites.toggleVehicle('test-vehicle-1');
    });

    expect(result.current.favorites.isVehicleSaved('test-vehicle-1')).toBe(true);
  });

  it('removes a vehicle from favorites when toggled a second time (logged in)', async () => {
    const { result } = await renderLoggedInHarness();

    act(() => {
      result.current.favorites.toggleVehicle('test-vehicle-2');
    });
    expect(result.current.favorites.isVehicleSaved('test-vehicle-2')).toBe(true);

    act(() => {
      result.current.favorites.toggleVehicle('test-vehicle-2');
    });
    expect(result.current.favorites.isVehicleSaved('test-vehicle-2')).toBe(false);
  });

  it('adds and removes a saved comparison (logged in)', async () => {
    const { result } = await renderLoggedInHarness();

    act(() => {
      result.current.favorites.addComparison('motor-a', 'motor-b');
    });
    expect(result.current.favorites.savedComparisons.length).toBeGreaterThan(0);

    const comparisonId = result.current.favorites.savedComparisons[0].id;
    act(() => {
      result.current.favorites.removeComparison(comparisonId);
    });
    expect(result.current.favorites.savedComparisons.find((c) => c.id === comparisonId)).toBeUndefined();
  });

  it('clears all saved vehicles and comparisons (logged in)', async () => {
    const { result } = await renderLoggedInHarness();

    act(() => {
      result.current.favorites.toggleVehicle('test-vehicle-3');
      result.current.favorites.addComparison('motor-a', 'motor-b');
    });

    act(() => {
      result.current.favorites.clearAll();
    });

    expect(result.current.favorites.savedVehicles.length).toBe(0);
    expect(result.current.favorites.savedComparisons.length).toBe(0);
  });

  it('keeps favorites isolated per account', async () => {
    const first = await renderLoggedInHarness();
    act(() => {
      first.result.current.favorites.toggleVehicle('vehicle-owned-by-first-user');
    });
    expect(first.result.current.favorites.isVehicleSaved('vehicle-owned-by-first-user')).toBe(true);

    const second = await renderLoggedInHarness();
    expect(second.result.current.favorites.savedVehicles).toEqual([]);
    expect(second.result.current.favorites.isVehicleSaved('vehicle-owned-by-first-user')).toBe(false);
  });
});
