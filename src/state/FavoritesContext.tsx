import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMembers } from './MembersContext';

export interface SavedVehicle {
  vehicleId: string;
  savedAt: string;
}

export interface SavedComparison {
  id: string;
  motorA: string;
  motorB: string;
  savedAt: string;
}

interface FavoritesContextType {
  savedVehicles: SavedVehicle[];
  savedComparisons: SavedComparison[];
  toggleVehicle: (vehicleId: string) => void;
  isVehicleSaved: (vehicleId: string) => boolean;
  addComparison: (motorA: string, motorB: string) => void;
  removeComparison: (id: string) => void;
  clearAll: () => void;
}

// Kaydedilenler, cihaza değil HESABA bağlıdır: anahtarların sonuna giriş yapan
// üyenin id'si eklenir. Böylece (a) giriş yapılmadan önce liste her zaman boş
// olur ve (b) aynı cihazda farklı hesaplarla giriş yapıldığında her hesap
// yalnızca kendi kaydettiklerini görür.
const VEHICLES_KEY_PREFIX = 'motorkarne_saved_vehicles_';
const COMPARISONS_KEY_PREFIX = 'motorkarne_saved_comparisons_';

async function loadSaved<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say, boş listeyle devam et
  }
  return [];
}

function persist<T>(key: string, value: T) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
}

const FavoritesContext = createContext<FavoritesContextType>({
  savedVehicles: [],
  savedComparisons: [],
  toggleVehicle: () => {},
  isVehicleSaved: () => false,
  addComparison: () => {},
  removeComparison: () => {},
  clearAll: () => {},
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMembers();
  const userId = currentUser?.id ?? null;

  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);

  useEffect(() => {
    if (!userId) {
      // Giriş yapılmamış: kaydedilenler her zaman boştur, diskten bir şey
      // okunmaz (misafir moduna ait ortak/kalıcı bir liste yok).
      setSavedVehicles([]);
      setSavedComparisons([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const [vehicles, comparisons] = await Promise.all([
        loadSaved<SavedVehicle>(VEHICLES_KEY_PREFIX + userId),
        loadSaved<SavedComparison>(COMPARISONS_KEY_PREFIX + userId),
      ]);
      if (!cancelled) {
        setSavedVehicles(vehicles);
        setSavedComparisons(comparisons);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleVehicle = (vehicleId: string) => {
    if (!userId) return; // Kaydetmek için giriş yapılmış olmalı
    setSavedVehicles((prev) => {
      const exists = prev.some((v) => v.vehicleId === vehicleId);
      const next = exists
        ? prev.filter((v) => v.vehicleId !== vehicleId)
        : [...prev, { vehicleId, savedAt: new Date().toLocaleDateString('tr-TR') }];
      persist(VEHICLES_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const isVehicleSaved = (vehicleId: string) => {
    return savedVehicles.some((v) => v.vehicleId === vehicleId);
  };

  const addComparison = (motorA: string, motorB: string) => {
    if (!userId) return; // Kaydetmek için giriş yapılmış olmalı
    const newComp: SavedComparison = {
      id: String(Date.now()),
      motorA,
      motorB,
      savedAt: new Date().toLocaleDateString('tr-TR'),
    };
    setSavedComparisons((prev) => {
      const next = [newComp, ...prev];
      persist(COMPARISONS_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const removeComparison = (id: string) => {
    if (!userId) return;
    setSavedComparisons((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persist(COMPARISONS_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const clearAll = () => {
    setSavedVehicles([]);
    setSavedComparisons([]);
    if (userId) {
      persist(VEHICLES_KEY_PREFIX + userId, []);
      persist(COMPARISONS_KEY_PREFIX + userId, []);
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        savedVehicles,
        savedComparisons,
        toggleVehicle,
        isVehicleSaved,
        addComparison,
        removeComparison,
        clearAll,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
