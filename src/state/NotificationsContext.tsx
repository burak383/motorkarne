import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, body: string) => void;
  markAllRead: () => void;
}

const STORAGE_KEY = 'motorkarne_notifications';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'welcome',
    title: "MotorKarne'ya hoş geldiniz",
    body: 'Motorları keşfedin, karşılaştırın ve favori araçlarınızı kaydedin.',
    createdAt: new Date().toLocaleDateString('tr-TR'),
    read: false,
  },
];

const loadSaved = async (): Promise<AppNotification[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say
  }
  return DEFAULT_NOTIFICATIONS;
};

const persist = (items: AppNotification[]) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    (async () => {
      setNotifications(await loadSaved());
    })();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (title: string, body: string) => {
    const newItem: AppNotification = {
      id: String(Date.now()),
      title,
      body,
      createdAt: new Date().toLocaleDateString('tr-TR'),
      read: false,
    };
    setNotifications((prev) => {
      const next = [newItem, ...prev];
      persist(next);
      return next;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persist(next);
      return next;
    });
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
