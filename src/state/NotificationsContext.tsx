import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPushNotification } from '../utils/pushNotifications';
import { useMembers } from './MembersContext';

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
  // Hesap silinirken çağrılır: bu hesabın bildirim geçmişini diskten de
  // kalıcı olarak kaldırır.
  clearAll: () => void;
}

// Bildirimler, cihaza değil HESABA bağlıdır: anahtarın sonuna giriş yapan
// üyenin id'si eklenir. Böylece farklı hesaplarla giriş yapıldığında her
// hesap yalnızca kendi bildirim geçmişini görür (bkz. FavoritesContext).
const STORAGE_KEY_PREFIX = 'motorkarne_notifications_';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'welcome',
    title: "MotorKarne'ya hoş geldiniz",
    body: 'Motorları keşfedin, karşılaştırın ve favori araçlarınızı kaydedin.',
    createdAt: new Date().toLocaleDateString('tr-TR'),
    read: false,
  },
];

const loadSaved = async (key: string): Promise<AppNotification[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say
  }
  return null;
};

const persist = (key: string, items: AppNotification[]) => {
  AsyncStorage.setItem(key, JSON.stringify(items)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useMembers();
  const userId = currentUser?.id ?? null;

  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    if (!userId) {
      // Giriş yapılmamış: sadece hoş geldin bildirimi gösterilir, hiçbir
      // hesabın bildirim geçmişi diskten okunmaz veya karışmaz.
      setNotifications(DEFAULT_NOTIFICATIONS);
      return;
    }

    let cancelled = false;
    (async () => {
      const saved = await loadSaved(STORAGE_KEY_PREFIX + userId);
      if (!cancelled) setNotifications(saved ?? DEFAULT_NOTIFICATIONS);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
      if (userId) persist(STORAGE_KEY_PREFIX + userId, next);
      return next;
    });
    // Uygulama içi listeye ek olarak gerçek bir OS bildirimi de gönder
    // (kullanıcı izin verdiyse; vermediyse sessizce yok sayılır).
    sendPushNotification(title, body).catch(() => {
      // yok say
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      if (userId) persist(STORAGE_KEY_PREFIX + userId, next);
      return next;
    });
  };

  const clearAll = () => {
    if (!userId) return;
    setNotifications(DEFAULT_NOTIFICATIONS);
    AsyncStorage.removeItem(STORAGE_KEY_PREFIX + userId).catch(() => {});
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
