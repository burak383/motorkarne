import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VehicleMaintenanceRecord {
  vehicleId: string;
  currentKm: number;
  lastOilChangeKm: number;
  lastUpdated: string; // ISO tarih
}

interface MaintenanceContextType {
  records: Record<string, VehicleMaintenanceRecord>;
  getRecord: (vehicleId: string) => VehicleMaintenanceRecord | undefined;
  updateCurrentKm: (vehicleId: string, currentKm: number) => void;
  recordOilChange: (vehicleId: string, atKm?: number) => void;
  removeRecord: (vehicleId: string) => void;
}

const STORAGE_KEY = 'motorkarne_maintenance';

const MaintenanceContext = createContext<MaintenanceContextType>({
  records: {},
  getRecord: () => undefined,
  updateCurrentKm: () => {},
  recordOilChange: () => {},
  removeRecord: () => {},
});

const loadSaved = async (): Promise<Record<string, VehicleMaintenanceRecord>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say
  }
  return {};
};

const persist = (records: Record<string, VehicleMaintenanceRecord>) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<Record<string, VehicleMaintenanceRecord>>({});

  useEffect(() => {
    (async () => {
      setRecords(await loadSaved());
    })();
  }, []);

  const getRecord = (vehicleId: string) => records[vehicleId];

  const updateCurrentKm = (vehicleId: string, currentKm: number) => {
    setRecords((prev) => {
      const existing = prev[vehicleId];
      const next = {
        ...prev,
        [vehicleId]: {
          vehicleId,
          currentKm,
          // Kayıt ilk kez oluşturuluyorsa, son yağ değişiminin de şu an yapıldığını varsay
          // (kullanıcı isterse bunu daha sonra "Yağ Değişimi Yaptım" ile düzeltebilir).
          lastOilChangeKm: existing?.lastOilChangeKm ?? currentKm,
          lastUpdated: new Date().toISOString(),
        },
      };
      persist(next);
      return next;
    });
  };

  const recordOilChange = (vehicleId: string, atKm?: number) => {
    setRecords((prev) => {
      const existing = prev[vehicleId];
      if (!existing) return prev;
      const km = atKm ?? existing.currentKm;
      const next = {
        ...prev,
        [vehicleId]: { ...existing, lastOilChangeKm: km, lastUpdated: new Date().toISOString() },
      };
      persist(next);
      return next;
    });
  };

  const removeRecord = (vehicleId: string) => {
    setRecords((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      persist(next);
      return next;
    });
  };

  return (
    <MaintenanceContext.Provider value={{ records, getRecord, updateCurrentKm, recordOilChange, removeRecord }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);
