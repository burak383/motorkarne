import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vehicles as staticVehicles, type Vehicle } from '../data/catalog';
import { API_ENDPOINTS } from '../config/api';

const STORAGE_KEY = 'motorkarne_vehicles_cache';
const FETCH_TIMEOUT_MS = 8000;

interface VehicleContextType {
  vehicles: Vehicle[];
  isLoading: boolean;
  isOffline: boolean;
  getVehicleById: (id: string) => Vehicle | undefined;
  getVehiclesByMotor: (motorId: string) => Vehicle[];
  searchVehicles: (query: string) => Vehicle[];
  refresh: () => Promise<void>;
}

// API'den gelen satır (snake_case) -> uygulamanın kullandığı Vehicle şekli (camelCase)
function mapApiVehicle(row: any): Vehicle {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    desc: row.description ?? '',
    score: Number(row.score),
    engine: row.engine ?? '',
    motorId: row.motor_id ?? '',
    img: row.img ?? '',
    note: row.note ?? '',
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const loadCachedVehicles = async (): Promise<Vehicle[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Bozuk önbellek - yok say
  }
  return null;
};

const persistVehicles = (vehicles: Vehicle[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles)).catch(() => {});
};

function searchIn(vehicles: Vehicle[], query: string): Vehicle[] {
  const q = query.toLowerCase().trim();
  if (!q) return vehicles;
  return vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.engine.toLowerCase().includes(q)
  );
}

const VehicleContext = createContext<VehicleContextType>({
  vehicles: staticVehicles,
  isLoading: false,
  isOffline: false,
  getVehicleById: (id) => staticVehicles.find((v) => v.id === id),
  getVehiclesByMotor: (motorId) => staticVehicles.filter((v) => v.motorId === motorId),
  searchVehicles: (query) => searchIn(staticVehicles, query),
  refresh: async () => {},
});

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(staticVehicles);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const loadFromNetwork = async (): Promise<boolean> => {
    try {
      const res = await fetchWithTimeout(API_ENDPOINTS.vehicles);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const mapped: Vehicle[] = data.map(mapApiVehicle);
      setVehicles(mapped);
      persistVehicles(mapped);
      setIsOffline(false);
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const cached = await loadCachedVehicles();
      if (cached) setVehicles(cached);

      const ok = await loadFromNetwork();
      if (!ok) {
        setIsOffline(true);
        if (!cached) setVehicles(staticVehicles);
      }
      setIsLoading(false);
    })();
  }, []);

  // Uygulama arka plandan öne her geldiğinde veriyi tazele (en fazla 60 saniyede bir).
  const lastRefreshRef = useRef<number>(Date.now());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastRefreshRef.current > 60_000) {
          lastRefreshRef.current = now;
          loadFromNetwork();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const getVehicleById = (id: string) => vehicles.find((v) => v.id === id);
  const getVehiclesByMotor = (motorId: string) => vehicles.filter((v) => v.motorId === motorId);
  const searchVehicles = (query: string) => searchIn(vehicles, query);

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        isLoading,
        isOffline,
        getVehicleById,
        getVehiclesByMotor,
        searchVehicles,
        refresh: async () => { await loadFromNetwork(); },
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => useContext(VehicleContext);
