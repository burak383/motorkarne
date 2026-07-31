import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const VEHICLES_KEY = 'motorkarne_saved_vehicles';
const COMPARISONS_KEY = 'motorkarne_saved_comparisons';

const DEFAULT_VEHICLES: SavedVehicle[] = [
  { vehicleId: 'peugeot-3008', savedAt: '12.06.2024' },
  { vehicleId: 'vw-golf-8', savedAt: '18.06.2024' },
];

const DEFAULT_COMPARISONS: SavedComparison[] = [
  { id: '1', motorA: 'puretech-eb2dt-130', motorB: 'tsi-15-evo', savedAt: '14.06.2024' },
];

async function loadSaved<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say, varsayılanla devam et
  }
  return fallback;
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
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>(DEFAULT_VEHICLES);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>(DEFAULT_COMPARISONS);

  useEffect(() => {
    (async () => {
      const [vehicles, comparisons] = await Promise.all([
        loadSaved(VEHICLES_KEY, DEFAULT_VEHICLES),
        loadSaved(COMPARISONS_KEY, DEFAULT_COMPARISONS),
      ]);
      setSavedVehicles(vehicles);
      setSavedComparisons(comparisons);
    })();
  }, []);

  const toggleVehicle = (vehicleId: string) => {
    setSavedVehicles((prev) => {
      const exists = prev.some((v) => v.vehicleId === vehicleId);
      const next = exists
        ? prev.filter((v) => v.vehicleId !== vehicleId)
        : [...prev, { vehicleId, savedAt: new Date().toLocaleDateString('tr-TR') }];
      persist(VEHICLES_KEY, next);
      return next;
    });
  };

  const isVehicleSaved = (vehicleId: string) => {
    return savedVehicles.some((v) => v.vehicleId === vehicleId);
  };

  const addComparison = (motorA: string, motorB: string) => {
    const newComp: SavedComparison = {
      id: String(Date.now()),
      motorA,
      motorB,
      savedAt: new Date().toLocaleDateString('tr-TR'),
    };
    setSavedComparisons((prev) => {
      const next = [newComp, ...prev];
      persist(COMPARISONS_KEY, next);
      return next;
    });
  };

  const removeComparison = (id: string) => {
    setSavedComparisons((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persist(COMPARISONS_KEY, next);
      return next;
    });
  };

  const clearAll = () => {
    setSavedVehicles([]);
    setSavedComparisons([]);
    persist(VEHICLES_KEY, []);
    persist(COMPARISONS_KEY, []);
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
