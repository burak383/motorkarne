import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { motors as staticMotors, type Motor } from '../data/catalog';

export interface MotorMutationResult {
  success: boolean;
  error?: string;
}

interface CatalogContextType {
  motors: Motor[];
  getMotorById: (id: string) => Motor | undefined;
  searchMotors: (query: string) => Motor[];
  addMotor: (motor: Motor) => MotorMutationResult;
  updateMotor: (id: string, updates: Partial<Motor>) => MotorMutationResult;
  deleteMotor: (id: string) => void;
}

const STORAGE_KEY = 'motorkarne_motors';

const loadSavedMotors = async (): Promise<Motor[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say, statik veriyle devam et
  }
  return staticMotors;
};

const persistMotors = (motors: Motor[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(motors)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const CatalogContext = createContext<CatalogContextType>({
  motors: staticMotors,
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
  addMotor: () => ({ success: false, error: 'CatalogProvider bulunamadı' }),
  updateMotor: () => ({ success: false, error: 'CatalogProvider bulunamadı' }),
  deleteMotor: () => {},
});

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [motors, setMotors] = useState<Motor[]>(staticMotors);

  useEffect(() => {
    (async () => {
      setMotors(await loadSavedMotors());
    })();
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

  const addMotor = (motor: Motor): MotorMutationResult => {
    if (!motor.id.trim()) {
      return { success: false, error: 'Motor ID zorunludur.' };
    }
    if (motors.some((m) => m.id === motor.id)) {
      return { success: false, error: 'Bu ID ile kayıtlı bir motor zaten var.' };
    }
    setMotors((prev) => {
      const next = [motor, ...prev];
      persistMotors(next);
      return next;
    });
    return { success: true };
  };

  const updateMotor = (id: string, updates: Partial<Motor>): MotorMutationResult => {
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

  const deleteMotor = (id: string) => {
    setMotors((prev) => {
      const next = prev.filter((m) => m.id !== id);
      persistMotors(next);
      return next;
    });
  };

  return (
    <CatalogContext.Provider
      value={{ motors, getMotorById, searchMotors, addMotor, updateMotor, deleteMotor }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => useContext(CatalogContext);
