import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  // NOT for production use: bu demo/mock bir üyelik akışıdır, gerçek bir backend'e
  // bağlı değildir. Şifreler düz metin olarak yalnızca cihaz üzerinde tutulur.
  // Google/Facebook ile giriş yapan üyelerde password boş string olur (kullanılmaz).
  password: string;
  createdAt: string;
  avatarUri?: string;
  // Google/Facebook ile mi yoksa e-posta/şifre ile mi kayıt olduğunu belirtir.
  provider?: 'email' | 'google' | 'facebook';
  providerId?: string;
  // Yönetici Paneli'ne erişim yetkisi. Yeni kayıt olan üyeler asla admin
  // olarak işaretlenmez; bu yalnızca aşağıdaki varsayılan hesapla veya
  // ileride eklenecek gerçek bir yetkilendirme akışıyla verilir.
  isAdmin?: boolean;
  // Kullanıcı "Reklamları Kaldır" satın alımını (69,90 TL, tek seferlik) yaptı mı.
  // NOT: Bu bayrak yalnızca cihazda tutulur (gerçek bir backend'e senkronize
  // edilmez); kullanıcı uygulamayı silip yeniden kurarsa ya da başka bir
  // cihazda giriş yaparsa "Satın Alımları Geri Yükle" (Restore Purchases)
  // akışıyla mağazadan (Google Play) tekrar doğrulanması gerekir.
  hasRemovedAds?: boolean; // ESKİ ALAN — geriye dönük uyumluluk için duruyor, yeni kodda kullanılmıyor
  // Aylık "Reklamsız Deneyim" aboneliğinin ne zamana kadar aktif olduğu (Unix ms).
  // Abonelik yenilenmezse bu tarih geçince reklamlar otomatik geri döner.
  adsRemovedUntil?: number;
}

export interface SocialLoginInput {
  provider: 'google';
  providerId: string;
  email: string;
  fullName: string;
  avatarUri?: string;
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
  loginWithProvider: (input: SocialLoginInput) => AuthResult;
  logout: () => void;
  deleteAccount: () => void;
  updateCurrentUser: (updates: { fullName?: string; email?: string; phone?: string; avatarUri?: string }) => AuthResult;
  setAdsRemovedUntil: (until: number | null) => void;
  changePassword: (currentPassword: string, newPassword: string) => AuthResult;
  resetPassword: (email: string, newPassword: string) => AuthResult;
  isEmailTaken: (email: string, excludeId?: string) => boolean;
}

const MEMBERS_KEY = 'motorkarne_members';
const SESSION_KEY = 'motorkarne_session';

// Demo/mock ortam için varsayılan yönetici hesabı. Gerçek bir uygulamada bu
// rol atamasının bir backend tarafından, güvenli bir şekilde yönetilmesi
// gerekir — burada yalnızca Admin Paneli'ni tamamen erişimsiz bırakmamak
// için bir demo hesabı tanımlanıyor.
//
// GÜVENLİK NOTU: Şifre artık kodda SABİT DEĞİL — EXPO_PUBLIC_ADMIN_PASSWORD ortam
// değişkeninden okunuyor (bkz. .env.example). Bu değişken tanımlı değilse (örn. Play
// Store'a giden genel yayın build'inde) admin hesabı HİÇ oluşturulmaz; yani hiç kimse
// (decompile edilmiş bir APK'dan sabit "admin123" şifresini bulup) admin girişi
// yapamaz. Kendi cihazında/geliştirme build'inde admin paneline erişmek istiyorsan
// `.env` dosyana kendi belirlediğin bir şifreyi yaz.
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? '';

const DEFAULT_ADMIN: Member = {
  id: 'admin-default',
  fullName: 'Yönetici',
  email: 'admin@motorkarne.com',
  password: ADMIN_PASSWORD,
  createdAt: '01.01.2024',
  isAdmin: true,
};

const ensureAdmin = (members: Member[]): Member[] => {
  // Şifre yapılandırılmamışsa admin hesabını hiç eklemiyoruz (bkz. yukarıdaki not).
  if (!ADMIN_PASSWORD) {
    return members.filter((m) => m.id !== DEFAULT_ADMIN.id);
  }
  const hasAdmin = members.some((m) => m.id === DEFAULT_ADMIN.id);
  if (!hasAdmin) return [DEFAULT_ADMIN, ...members];
  // Zaten varsa, .env'deki güncel şifreyle senkron tut (kalıcı depoda eski şifre kalmasın).
  return members.map((m) => (m.id === DEFAULT_ADMIN.id ? { ...m, password: ADMIN_PASSWORD } : m));
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
  loginWithProvider: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  logout: () => {},
  deleteAccount: () => {},
  updateCurrentUser: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  setAdsRemovedUntil: () => {},
  changePassword: () => ({ success: false, error: 'MembersProvider bulunamadı' }),
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
    // ÖNEMLİ: Şifrenin başında/sonunda klavye/otomatik tamamlama kaynaklı
    // fark edilmeyen bir boşluk kalırsa (secureTextEntry nedeniyle kullanıcı
    // bunu göremez), kayıt sırasında eşleşen şifre daha sonra girişte
    // eşleşmeyebilir ("E-posta veya şifre hatalı" hatası). Bu yüzden şifreyi
    // baştan/sondan boşluklardan arındırıyoruz (aradaki boşluklara dokunulmaz).
    const trimmedPassword = input.password.trim();
    if (trimmedPassword.length < 6) {
      return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
    }

    const newMember: Member = {
      id: `${Date.now()}`,
      fullName,
      email,
      phone,
      password: trimmedPassword,
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
    const trimmedPassword = password.trim();
    const match = members.find((m) => m.email.toLowerCase() === normalized);

    // Google/Facebook ile oluşturulmuş hesapların şifresi yok (bkz. yukarıdaki
    // loginWithProvider — password: ''). Böyle bir hesapla e-posta/şifre formundan
    // giriş denenirse önceden genel "E-posta veya şifre hatalı." mesajı gösteriliyordu
    // — bu, kullanıcıyı hesabının var olduğunu ama şifresini unuttuğunu düşünmeye
    // sevk edip kafa karıştırıyordu. Bu hesabın nasıl oluşturulduğunu açıkça belirtip
    // doğru giriş yöntemine yönlendiriyoruz.
    if (match && match.password === '' && match.provider && match.provider !== 'email') {
      const providerLabel = match.provider === 'google' ? 'Google' : 'Facebook';
      return {
        success: false,
        error: `Bu hesap ${providerLabel} ile oluşturulmuş, şifresi yok. Lütfen "${providerLabel} ile devam et" seçeneğini kullanın.`,
      };
    }

    if (!match || match.password !== trimmedPassword) {
      return { success: false, error: 'E-posta veya şifre hatalı.' };
    }

    setCurrentUserId(match.id);
    persistSessionId(match.id);
    return { success: true };
  };

  // Google/Facebook ile giriş: e-postaya göre mevcut bir üye varsa onu kullanır
  // (aynı e-postayla e-posta/şifre yöntemiyle kayıt olunmuşsa hesaplar birleşir),
  // yoksa sosyal profil bilgisiyle yeni bir üye oluşturur. Şifre gerekmez.
  const loginWithProvider = (input: SocialLoginInput): AuthResult => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = members.find((m) => m.email.toLowerCase() === normalizedEmail);

    if (existing) {
      setCurrentUserId(existing.id);
      persistSessionId(existing.id);
      return { success: true };
    }

    const newMember: Member = {
      id: `${input.provider}-${input.providerId}`,
      fullName: input.fullName,
      email: input.email,
      password: '',
      createdAt: new Date().toLocaleDateString('tr-TR'),
      avatarUri: input.avatarUri,
      provider: input.provider,
      providerId: input.providerId,
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
    // registerMember boş bir Ad Soyad'ı reddediyor, ama burada aynı kontrol
    // yoktu — kullanıcı profil düzenlerken adı boşaltıp kaydedebiliyordu.
    if (updates.fullName !== undefined && !updates.fullName.trim()) {
      return { success: false, error: 'Ad Soyad alanı zorunludur.' };
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

  // Satın alma (ya da "Satın Alımları Geri Yükle") başarılı olduğunda çağrılır;
  // giriş yapılmış kullanıcının hesabına aylık reklamsız abonelik bitiş tarihini işler.
  // until = null verilirse abonelik kaldırılır (örn. RevenueCat "expired" bildirirse).
  const setAdsRemovedUntil = (until: number | null) => {
    if (!currentUser) return;
    setMembers((prev) => {
      const next = prev.map((m) => (m.id === currentUser.id ? { ...m, adsRemovedUntil: until ?? undefined } : m));
      persistMembers(next);
      return next;
    });
  };

  const changePassword = (currentPassword: string, newPassword: string): AuthResult => {
    if (!currentUser) {
      return { success: false, error: 'Önce giriş yapmalısınız.' };
    }
    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    if (currentUser.password !== trimmedCurrent) {
      return { success: false, error: 'Mevcut şifreniz yanlış.' };
    }
    if (trimmedNew.length < 6) {
      return { success: false, error: 'Yeni şifre en az 6 karakter olmalı.' };
    }
    if (trimmedNew === trimmedCurrent) {
      return { success: false, error: 'Yeni şifre, mevcut şifreyle aynı olamaz.' };
    }

    setMembers((prev) => {
      const next = prev.map((m) => (m.id === currentUser.id ? { ...m, password: trimmedNew } : m));
      persistMembers(next);
      return next;
    });

    return { success: true };
  };

  const resetPassword = (email: string, newPassword: string): AuthResult => {
    const normalized = email.trim().toLowerCase();
    const trimmedNew = newPassword.trim();
    const match = members.find((m) => m.email.toLowerCase() === normalized);

    if (!match) {
      return { success: false, error: 'Bu e-posta adresiyle kayıtlı bir üyelik bulunamadı.' };
    }
    if (trimmedNew.length < 6) {
      return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
    }

    setMembers((prev) => {
      const next = prev.map((m) => (m.id === match.id ? { ...m, password: trimmedNew } : m));
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
        loginWithProvider,
        logout,
        deleteAccount,
        updateCurrentUser,
        setAdsRemovedUntil,
        changePassword,
        resetPassword,
        isEmailTaken,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
};

export const useMembers = () => useContext(MembersContext);
