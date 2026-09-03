import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bu, gerçek bir "sosyal kanıt" (başka kullanıcıların ne yaptığı) DEĞİLDİR —
// uygulamanın sunucusu olmadığı için böyle bir veri toplanamaz. Bu sadece
// SİZİN cihazınızdaki geçmiş kullanımınızı (hangi motorlara baktınız,
// hangilerini karşılaştırdınız) yerel olarak sayar.
export interface UsageStats {
  [motorId: string]: {
    views: number;
    compares: number;
  };
}

interface UsageStatsContextType {
  stats: UsageStats;
  recordView: (motorId: string) => void;
  recordCompare: (motorId: string) => void;
  getTopMotorIds: (limit: number) => string[];
}

const STORAGE_KEY = 'motorkarne_usage_stats';

const loadSaved = async (): Promise<UsageStats> => {
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

const persist = (stats: UsageStats) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stats)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const UsageStatsContext = createContext<UsageStatsContextType>({
  stats: {},
  recordView: () => {},
  recordCompare: () => {},
  getTopMotorIds: () => [],
});

export const UsageStatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<UsageStats>({});

  useEffect(() => {
    (async () => {
      setStats(await loadSaved());
    })();
  }, []);

  const bump = (motorId: string, field: 'views' | 'compares') => {
    setStats((prev) => {
      const existing = prev[motorId] ?? { views: 0, compares: 0 };
      const next = { ...prev, [motorId]: { ...existing, [field]: existing[field] + 1 } };
      persist(next);
      return next;
    });
  };

  const recordView = (motorId: string) => bump(motorId, 'views');
  const recordCompare = (motorId: string) => bump(motorId, 'compares');

  const getTopMotorIds = (limit: number): string[] => {
    return Object.entries(stats)
      .map(([motorId, s]) => ({ motorId, score: s.views + s.compares * 2 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.motorId);
  };

  return (
    <UsageStatsContext.Provider value={{ stats, recordView, recordCompare, getTopMotorIds }}>
      {children}
    </UsageStatsContext.Provider>
  );
};

export const useUsageStats = () => useContext(UsageStatsContext);
