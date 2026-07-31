import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  // NOT for production use: bu demo/mock bir üyelik akışıdır, gerçek bir backend'e
  // bağlı değildir. Şifreler düz metin olarak yalnızca cihaz üzerinde tutulur.
  password: string;
  createdAt: string;
  avatarUri?: string;
  // Yönetici Paneli'ne erişim yetkisi. Yeni kayıt olan üyeler asla admin
  // olarak işaretlenmez; bu yalnızca aşağıdaki varsayılan hesapla veya
  // ileride eklenecek gerçek bir yetkilendirme akışıyla verilir.
  isAdmin?: boolean;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface MembersContextType {
  members: Member[];
  currentUser: Member | null;
  registerMember: (input: RegisterInput) => AuthResult;
  login: (email: string, password: string) => AuthResult;
  logout: () => void;
  deleteAccount: () => void;
  updateCurrentUser: (updates: { fullName?: string; email?: string; phone?: string; avatarUri?: string }) => AuthResult;
  resetPassword: (email: string, newPassword: string) => AuthResult;
  isEmailTaken: (email: string, excludeId?: string) => boolean;
}

const MEMBERS_KEY = 'motorkarne_members';
const SESSION_KEY = 'motorkarne_session';

// Demo/mock ortam için varsayılan yönetici hesabı. Gerçek bir uygulamada bu
// rol atamasının bir backend tarafından, güvenli bir şekilde yönetilmesi
// gerekir — burada yalnızca Admin Paneli'ni tamamen erişimsiz bırakmamak
// için sabit bir demo hesabı tanımlanıyor.
const DEFAULT_ADMIN: Member = {
  id: 'admin-default',
  fullName: 'Yönetici',
  email: 'admin@motorkarne.com',
  password: 'admin123',
  createdAt: '01.01.2024',
  isAdmin: true,
};

const ensureAdmin = (members: Member[]): Member[] => {
  const hasAdmin = members.some((m) => m.id === DEFAULT_ADMIN.id);
  return hasAdmin ? members : [DEFAULT_ADMIN, ...members];
};

const loadSavedMembers = async (): Promise<Member[]> => {
  try {
    const raw = await AsyncStorage.getItem(MEMBERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return ensureAdmin(parsed);
    }
  } catch (e) {
    // Bozuk veri varsa sessizce yok say, boş listeyle devam et
  }
  return ensureAdmin([]);
};

const persistMembers = (members: Member[]) => {
  AsyncStorage.setItem(MEMBERS_KEY, JSON.stringify(members)).catch(() => {
    // Depolama kotası dolu vb. durumlarda sessizce yok say
  });
};

const loadSavedSessionId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch (e) {
    return null;
  }
};

const persistSessionId = (id: string | null) => {
  const op = id ? AsyncStorage.setItem(SESSION_KEY, id) : AsyncStorage.removeItem(SESSION_KEY);
  op.catch(() => {
    // yok say
  });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MembersContext = createContext<MembersContextType>({
  members: [],
  currentUser: null,
  registerMember: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  login: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  logout: () => {},
  deleteAccount: () => {},
  updateCurrentUser: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  resetPassword: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  isEmailTaken: () => false,
});

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() => ensureAdmin([]));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [savedMembers, savedSessionId] = await Promise.all([
        loadSavedMembers(),
        loadSavedSessionId(),
      ]);
      setMembers(savedMembers);
      setCurrentUserId(savedSessionId);
    })();
  }, []);

  const currentUser = members.find((m) => m.id === currentUserId) ?? null;

  const isEmailTaken = (email: string, excludeId?: string) => {
    const normalized = email.trim().toLowerCase();
    return members.some((m) => m.email.toLowerCase() === normalized && m.id !== excludeId);
  };

  const registerMember = (input: RegisterInput): AuthResult => {
    const fullName = input.fullName.trim();
    const email = input.email.trim();
    const phone = input.phone?.trim();

    if (!fullName) {
      return { success: false, error: 'Ad Soyad alanı zorunludur.' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Geçerli bir e-posta adresi girin.' };
    }
    if (isEmailTaken(email)) {
      return { success: false, error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' };
    }
    if (input.password.length < 6) {
      return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
    }

    const newMember: Member = {
      id: `${Date.now()}`,
      fullName,
      email,
      phone,
      password: input.password,
      createdAt: new Date().toLocaleDateString('tr-TR'),
    };

    setMembers((prev) => {
      const next = [newMember, ...prev];
      persistMembers(next);
      return next;
    });

    setCurrentUserId(newMember.id);
    persistSessionId(newMember.id);

    return { success: true };
  };

  const login = (email: string, password: string): AuthResult => {
    const normalized = email.trim().toLowerCase();
    const match = members.find((m) => m.email.toLowerCase() === normalized);

    if (!match || match.password !== password) {
      return { success: false, error: 'E-posta veya şifre hatalı.' };
    }

    setCurrentUserId(match.id);
    persistSessionId(match.id);
    return { success: true };
  };

  const logout = () => {
    setCurrentUserId(null);
    persistSessionId(null);
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    const idToDelete = currentUser.id;
    setMembers((prev) => {
      const next = prev.filter((m) => m.id !== idToDelete);
      persistMembers(next);
      return next;
    });
    setCurrentUserId(null);
    persistSessionId(null);
  };

  const updateCurrentUser = (updates: { fullName?: string; email?: string; phone?: string; avatarUri?: string }): AuthResult => {
    if (!currentUser) {
      return { success: false, error: 'Önce giriş yapmalısınız.' };
    }
    const nextEmail = updates.email?.trim() ?? currentUser.email;
    if (updates.email !== undefined && !EMAIL_REGEX.test(nextEmail)) {
      return { success: false, error: 'Geçerli bir e-posta adresi girin.' };
    }
    if (updates.email !== undefined && isEmailTaken(nextEmail, currentUser.id)) {
      return { success: false, error: 'Bu e-posta adresiyle zaten bir üyelik mevcut.' };
    }

    setMembers((prev) => {
      const next = prev.map((m) =>
        m.id === currentUser.id
          ? {
              ...m,
              fullName: updates.fullName?.trim() ?? m.fullName,
              email: nextEmail,
              phone: updates.phone !== undefined ? updates.phone.trim() : m.phone,
              avatarUri: updates.avatarUri !== undefined ? updates.avatarUri : m.avatarUri,
            }
          : m
      );
      persistMembers(next);
      return next;
    });

    return { success: true };
  };

  const resetPassword = (email: string, newPassword: string): AuthResult => {
    const normalized = email.trim().toLowerCase();
    const match = members.find((m) => m.email.toLowerCase() === normalized);

    if (!match) {
      return { success: false, error: 'Bu e-posta adresiyle kayıtlı bir üyelik bulunamadı.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
    }

    setMembers((prev) => {
      const next = prev.map((m) => (m.id === match.id ? { ...m, password: newPassword } : m));
      persistMembers(next);
      return next;
    });

    return { success: true };
  };

  return (
    <MembersContext.Provider
      value={{
        members,
        currentUser,
        registerMember,
        login,
        logout,
        deleteAccount,
        updateCurrentUser,
        resetPassword,
        isEmailTaken,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => useContext(MembersContext);
