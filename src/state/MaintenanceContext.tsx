import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMembers } from './MembersContext';

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
  // Hesap silinirken çağrılır: bu hesaba ait tüm bakım kayıtlarını diskten de
  // kalıcı olarak kaldırır (yalnızca in-memory state'i boşaltmakla kalmaz).
  clearAll: () => void;
}

// Kilometre/bakım kayıtları, cihaza değil HESABA bağlıdır: anahtarın sonuna
// giriş yapan üyenin id'si eklenir. Böylece (a) giriş yapılmadan önce kayıt
// tutulmaz ve (b) aynı cihazda farklı hesaplarla giriş yapıldığında her hesap
// yalnızca kendi araçlarının bakım bilgisini görür (bkz. FavoritesContext).
const STORAGE_KEY_PREFIX = 'motorkarne_maintenance_';

const MaintenanceContext = createContext<MaintenanceContextType>({
  records: {},
  getRecord: () => undefined,
  updateCurrentKm: () => {},
  recordOilChange: () => {},
  removeRecord: () => {},
  clearAll: () => {},
});

const loadSaved = async (key: string): Promise<Record<string, VehicleMaintenanceRecord>> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say
  }
  return {};
};

const persist = (key: string, records: Record<string, VehicleMaintenanceRecord>) => {
  AsyncStorage.setItem(key, JSON.stringify(records)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMembers();
  const userId = currentUser?.id ?? null;

  const [records, setRecords] = useState<Record<string, VehicleMaintenanceRecord>>({});

  useEffect(() => {
    if (!userId) {
      // Giriş yapılmamış: bakım kayıtları her zaman boştur, diskten bir şey
      // okunmaz (misafir moduna ait ortak/kalıcı bir kayıt yok).
      setRecords({});
      return;
    }

    let cancelled = false;
    (async () => {
      const saved = await loadSaved(STORAGE_KEY_PREFIX + userId);
      if (!cancelled) setRecords(saved);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const getRecord = (vehicleId: string) => records[vehicleId];

  const updateCurrentKm = (vehicleId: string, currentKm: number) => {
    if (!userId) return; // Kaydetmek için giriş yapılmış olmalı
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
      persist(STORAGE_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const recordOilChange = (vehicleId: string, atKm?: number) => {
    if (!userId) return;
    setRecords((prev) => {
      const existing = prev[vehicleId];
      if (!existing) return prev;
      const km = atKm ?? existing.currentKm;
      const next = {
        ...prev,
        [vehicleId]: { ...existing, lastOilChangeKm: km, lastUpdated: new Date().toISOString() },
      };
      persist(STORAGE_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const removeRecord = (vehicleId: string) => {
    if (!userId) return;
    setRecords((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      persist(STORAGE_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const clearAll = () => {
    if (!userId) return;
    setRecords({});
    AsyncStorage.removeItem(STORAGE_KEY_PREFIX + userId).catch(() => {});
  };

  return (
    <MaintenanceContext.Provider value={{ records, getRecord, updateCurrentKm, recordOilChange, removeRecord, clearAll }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => useContext(MaintenanceContext);
