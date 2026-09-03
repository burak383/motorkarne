import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { motors as staticMotors, type Motor } from '../data/catalog';
import { API_ENDPOINTS } from '../config/api';

export interface MotorMutationResult {
  success: boolean;
  error?: string;
}

interface CatalogContextType {
  motors: Motor[];
  isLoading: boolean;
  isOffline: boolean;
  getMotorById: (id: string) => Motor | undefined;
  searchMotors: (query: string) => Motor[];
  addMotor: (motor: Motor) => Promise<MotorMutationResult>;
  updateMotor: (id: string, updates: Partial<Motor>) => Promise<MotorMutationResult>;
  deleteMotor: (id: string) => Promise<MotorMutationResult>;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = 'motorkarne_motors_cache';
const FETCH_TIMEOUT_MS = 8000;

// API'den gelen satır (snake_case) -> uygulamanın kullandığı Motor şekli (camelCase)
function mapApiMotor(row: any): Motor {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    brands: row.brands ?? [],
    fuel: row.fuel,
    power: row.power,
    torque: row.torque ?? undefined,
    transmission: row.transmission,
    consumption: row.consumption ?? undefined,
    score: Number(row.score),
    risk: row.risk,
    riskLevel: row.risk_level,
    note: row.note,
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    chronic: row.chronic ?? [],
    imageUrl: row.image_url ?? undefined,
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

const loadCachedMotors = async (): Promise<Motor[] | null> => {
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

const persistMotors = (motors: Motor[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(motors)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const CatalogContext = createContext<CatalogContextType>({
  motors: staticMotors,
  isLoading: false,
  isOffline: false,
  getMotorById: (id) => staticMotors.find((m) => m.id === id),
  searchMotors: (query) => {
    const q = query.toLowerCase().trim();
    if (!q) return staticMotors;
    return staticMotors.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.brands.some((b) => b.toLowerCase().includes(q)) ||
        m.fuel.toLowerCase().includes(q)
    );
  },
  addMotor: async () => ({ success: false, error: 'CatalogProvider bulunamadı' }),
  updateMotor: async () => ({ success: false, error: 'CatalogProvider bulunamadı' }),
  deleteMotor: async () => ({ success: false, error: 'CatalogProvider bulunamadı' }),
  refresh: async () => {},
});

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // İlk render'da statik veriyle başla (boş ekran görünmesin), API/önbellek gelince güncelle.
  const [motors, setMotors] = useState<Motor[]>(staticMotors);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const loadFromNetwork = async (): Promise<boolean> => {
    try {
      const res = await fetchWithTimeout(API_ENDPOINTS.motors);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const mapped: Motor[] = data.map(mapApiMotor);
      setMotors(mapped);
      persistMotors(mapped);
      setIsOffline(false);
      return true;
    } catch (e) {
      return false;
    }
  };

  const bootstrap = async () => {
    setIsLoading(true);
    // Önce önbellekteki veriyi hemen göster (varsa) - kullanıcı beklemesin.
    const cached = await loadCachedMotors();
    if (cached) setMotors(cached);

    // Arka planda ağdan güncel veriyi çekmeyi dene.
    const ok = await loadFromNetwork();
    if (!ok) {
      setIsOffline(true);
      if (!cached) setMotors(staticMotors); // Hiç önbellek de yoksa gömülü veriye düş
    }
    setIsLoading(false);
  };

  useEffect(() => {
    bootstrap();
  }, []);

  // Uygulama arka plandan öne her geldiğinde veriyi tazele (en fazla 60 saniyede bir,
  // gereksiz sık istek atmamak için) — admin panelde yapılan değişiklikler böylece
  // kullanıcı uygulamaya geri döndüğünde otomatik görünür.
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

  const getMotorById = (id: string) => motors.find((m) => m.id === id);

  const searchMotors = (query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return motors;
    return motors.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.brands.some((b) => b.toLowerCase().includes(q)) ||
        m.fuel.toLowerCase().includes(q)
    );
  };

  const addMotor = async (motor: Motor): Promise<MotorMutationResult> => {
    if (!motor.id.trim()) {
      return { success: false, error: 'Motor ID zorunludur.' };
    }
    if (motors.some((m) => m.id === motor.id)) {
      return { success: false, error: 'Bu ID ile kayıtlı bir motor zaten var.' };
    }
    // Önce cihazda (iyimser güncelleme), sonra ağdan senkronize etmeyi dene.
    setMotors((prev) => {
      const next = [motor, ...prev];
      persistMotors(next);
      return next;
    });
    const ok = await loadFromNetwork(); // Sunucu tarafı kaydı admin panel yapıyor; burada sadece güncel listeyi tazeliyoruz
    return { success: true, error: ok ? undefined : 'Cihazda kaydedildi, ancak sunucuyla senkronize edilemedi (çevrimdışı).' };
  };

  const updateMotor = async (id: string, updates: Partial<Motor>): Promise<MotorMutationResult> => {
    if (!motors.some((m) => m.id === id)) {
      return { success: false, error: 'Motor bulunamadı.' };
    }
    setMotors((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...updates } : m));
      persistMotors(next);
      return next;
    });
    return { success: true };
  };

  const deleteMotor = async (id: string): Promise<MotorMutationResult> => {
    setMotors((prev) => {
      const next = prev.filter((m) => m.id !== id);
      persistMotors(next);
      return next;
    });
    return { success: true };
  };

  return (
    <CatalogContext.Provider
      value={{
        motors,
        isLoading,
        isOffline,
        getMotorById,
        searchMotors,
        addMotor,
        updateMotor,
        deleteMotor,
        refresh: async () => { await loadFromNetwork(); },
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => useContext(CatalogContext);
