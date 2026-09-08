import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_ENDPOINTS } from '../config/api';

// NOT: Üyelik verisi artık TiDB tabanlı bir sunucuda (motorkarne-api) tutuluyor —
// bu dosya eskiden tamamen cihaz-yerel (AsyncStorage) çalışıyordu, şifreler bile
// düz metin olarak cihazda saklanıyordu. Artık: şifreler sunucuda bcrypt ile
// hash'leniyor, oturum bir JWT ("token") ile temsil ediliyor ve bu token
// SecureStore'da (AsyncStorage'dan daha güvenli, şifreli bir depoda) tutuluyor.
//
// Bilerek hâlâ cihaz-yerel kalan tek şeyler: profil fotoğrafı (avatarUri — sunucuda
// görsel depolama altyapısı yok) ve "Reklamsız Deneyim" aboneliğinin bitiş tarihi
// (adsRemovedUntil — asıl doğruluk kaynağı zaten mağaza/RevenueCat, bu sadece hızlı
// bir yerel önbellek). Bu ikisi, hesap id'sine göre ayrı bir AsyncStorage kaydında
// (bkz. extrasKey) tutulup sunucudan gelen profille birleştiriliyor.

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  createdAt: string;
  avatarUri?: string;
  // Google ile mi yoksa e-posta/şifre ile mi kayıt olduğunu belirtir.
  provider?: 'email' | 'google';
  providerId?: string;
  // Yönetici Paneli'ne erişim yetkisi. Sunucudaki hiçbir kayıt bunu true
  // döndürmez — yalnızca aşağıdaki .env tabanlı yerel demo hesabı bu bayrağı taşır.
  isAdmin?: boolean;
  hasRemovedAds?: boolean; // ESKİ ALAN — geriye dönük uyumluluk için duruyor, yeni kodda kullanılmıyor
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
  currentUser: Member | null;
  // Uygulama açılışında, cihazda kayıtlı bir oturum olup olmadığı sunucudan
  // doğrulanana kadar true kalır. Hiçbir ekran şu an bunu zorunlu kılmıyor
  // (currentUser null/dolu kontrolü yeterli) ama ileride bir yüklenme
  // göstergesi eklemek istenirse diye context'te tutuluyor.
  isRestoringSession: boolean;
  registerMember: (input: RegisterInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithProvider: (input: SocialLoginInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<AuthResult>;
  updateCurrentUser: (updates: { fullName?: string; email?: string; phone?: string; avatarUri?: string }) => Promise<AuthResult>;
  setAdsRemovedUntil: (until: number | null) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  resetPassword: (email: string, newPassword: string) => Promise<AuthResult>;
  isEmailTaken: (email: string) => Promise<boolean>;
}

const TOKEN_KEY = 'motorkarne_auth_token';
const CACHED_USER_KEY = 'motorkarne_cached_user';
const LEGACY_MEMBERS_KEY = 'motorkarne_members';
const LEGACY_SESSION_KEY = 'motorkarne_session';
const FETCH_TIMEOUT_MS = 10000;

// Sunucuya hiç istek atılmadan açılan yerel demo yönetici oturumunu işaretlemek
// için kullanılan özel bir "token" değeri — gerçek bir JWT değildir.
const LOCAL_ADMIN_TOKEN = '__local_admin__';

// Demo/mock ortam için varsayılan yönetici hesabı. Gerçek bir uygulamada bu rol
// atamasının bir backend tarafından, güvenli bir şekilde yönetilmesi gerekir —
// burada yalnızca Admin Paneli'ni tamamen erişimsiz bırakmamak için bir demo
// hesabı tanımlanıyor.
//
// GÜVENLİK NOTU: Şifre kodda SABİT DEĞİL — EXPO_PUBLIC_ADMIN_PASSWORD ortam
// değişkeninden okunuyor (bkz. .env.example). Bu değişken tanımlı değilse (örn.
// Play Store'a giden genel yayın build'inde) admin girişi HİÇBİR ZAMAN mümkün
// olmaz ve sunucuya hiç istek atılmaz.
const ADMIN_PASSWORD = process.env.EXPO_PUBLIC_ADMIN_PASSWORD ?? '';
const DEFAULT_ADMIN: Member = {
  id: 'admin-default',
  fullName: 'Yönetici',
  email: 'admin@motorkarne.com',
  createdAt: '01.01.2024',
  isAdmin: true,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Token (SecureStore) ----
async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}
async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Depolama başarısız olursa (çok nadir) sessizce yok say — kullanıcı bir
    // sonraki açılışta tekrar giriş yapmak zorunda kalır, uygulama çökmez.
  }
}

// ---- Cihaz-yerel profil önbelleği (çevrimdışıyken son bilinen profili göstermek için) ----
async function loadCachedUser(): Promise<Member | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveCachedUser(user: Member | null) {
  if (user) AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user)).catch(() => {});
  else AsyncStorage.removeItem(CACHED_USER_KEY).catch(() => {});
}

// ---- Cihaz-yerel ek alanlar (avatarUri, adsRemovedUntil) — hesap id'sine göre ----
function extrasKey(userId: string) {
  return `motorkarne_local_extras_${userId}`;
}
async function loadExtras(userId: string): Promise<{ avatarUri?: string; adsRemovedUntil?: number }> {
  try {
    const raw = await AsyncStorage.getItem(extrasKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveExtras(userId: string, extras: { avatarUri?: string; adsRemovedUntil?: number }) {
  AsyncStorage.setItem(extrasKey(userId), JSON.stringify(extras)).catch(() => {});
}

// ---- API yardımcıları ----
function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function networkErrorMessage(): string {
  return 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
}

class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    throw new ApiError('NETWORK');
  } finally {
    clearTimeout(timeout);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Gövde boş/JSON değilse (örn. bazı 500 sayfaları) data null kalır.
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Bir sunucu hatası oluştu.', res.status);
  }
  return data;
}

// Eski (sunucu öncesi) sürümde tüm üyelik verisi SADECE cihazda tutuluyordu —
// şifreler bile düz metin olarak. Play Store'daki CANLI kullanıcıları mağdur
// etmemek için: cihazda hâlâ eski bir kayıt varsa, kullanıcıya sormadan bir
// kereliğine sunucuya taşımayı dener. Başarısız olan (örn. o an internet
// yoksa) kayıtlar bir sonraki açılışta tekrar denenmek üzere cihazda kalır.
async function migrateLegacyLocalAccountIfNeeded(): Promise<string | null> {
  let legacyMembers: any[];
  let legacySessionId: string | null;
  try {
    const rawMembers = await AsyncStorage.getItem(LEGACY_MEMBERS_KEY);
    legacyMembers = rawMembers ? JSON.parse(rawMembers) : [];
    legacySessionId = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
  } catch {
    return null;
  }
  if (!Array.isArray(legacyMembers) || legacyMembers.length === 0) return null;

  const remaining: any[] = [];
  let migratedSessionToken: string | null = null;

  for (const m of legacyMembers) {
    if (!m || m.id === 'admin-default') continue; // demo admin hesabı taşınmaz
    try {
      let data: any;
      if (m.provider === 'google' && m.providerId) {
        data = await apiFetch(API_ENDPOINTS.auth.socialLogin, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'google',
            providerId: m.providerId,
            email: m.email,
            fullName: m.fullName,
          }),
        });
      } else if (m.password) {
        data = await apiFetch(API_ENDPOINTS.auth.register, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: m.fullName,
            email: m.email,
            phone: m.phone,
            password: m.password,
          }),
        });
      } else {
        continue; // taşınamayan (şifresiz, sosyal sağlayıcı bilgisi eksik) kayıt
      }
      if (m.id === legacySessionId) {
        migratedSessionToken = data.token;
      }
      if (m.avatarUri || m.adsRemovedUntil) {
        saveExtras(data.user.id, { avatarUri: m.avatarUri, adsRemovedUntil: m.adsRemovedUntil });
      }
    } catch (e: any) {
      // "Bu e-posta zaten kayıtlı" (400) hatası genelde bu hesabın önceki bir
      // açılışta zaten taşındığı anlamına gelir — tekrar denemeye gerek yok.
      // Diğer tüm hatalarda (özellikle ağ hatası) kaydı bir sonraki açılışta
      // tekrar denenmek üzere sakla.
      if (e?.status !== 400) remaining.push(m);
    }
  }

  if (remaining.length > 0) {
    await AsyncStorage.setItem(LEGACY_MEMBERS_KEY, JSON.stringify(remaining)).catch(() => {});
  } else {
    await AsyncStorage.removeItem(LEGACY_MEMBERS_KEY).catch(() => {});
    await AsyncStorage.removeItem(LEGACY_SESSION_KEY).catch(() => {});
  }

  return migratedSessionToken;
}

const MembersContext = createContext<MembersContextType>({
  currentUser: null,
  isRestoringSession: true,
  registerMember: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  login: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  loginWithProvider: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  logout: async () => {},
  deleteAccount: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  updateCurrentUser: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  setAdsRemovedUntil: () => {},
  changePassword: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  resetPassword: async () => ({ success: false, error: 'MembersProvider bulunamadı' }),
  isEmailTaken: async () => false,
});

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  // Her istekte SecureStore'u tekrar okumamak için token'ın bir kopyası bellekte tutulur.
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      // Cihazda eski (sunucu öncesi) kayıt varsa taşımayı dene; bir oturum
      // taşındıysa döndürülen token'ı doğrudan kullan.
      let migratedToken: string | null = null;
      try {
        migratedToken = await migrateLegacyLocalAccountIfNeeded();
      } catch {
        // Taşıma sırasında beklenmeyen bir hata olursa akışı bozma.
      }

      const cached = await loadCachedUser();
      if (cached) setCurrentUser(cached);

      const token = migratedToken ?? (await getToken());
      if (!token) {
        setIsRestoringSession(false);
        return;
      }
      if (migratedToken) await setToken(migratedToken);

      if (token === LOCAL_ADMIN_TOKEN) {
        if (ADMIN_PASSWORD) {
          tokenRef.current = token;
          setCurrentUser(DEFAULT_ADMIN);
          saveCachedUser(DEFAULT_ADMIN);
        } else {
          // Bu build'de admin şifresi tanımlı değil (örn. Play Store yayın
          // build'i) — eskiden kalma yerel admin oturumunu geçersiz say.
          await setToken(null);
          saveCachedUser(null);
          setCurrentUser(null);
        }
        setIsRestoringSession(false);
        return;
      }

      tokenRef.current = token;
      try {
        const data = await apiFetch(API_ENDPOINTS.auth.me, { headers: authHeader(token) });
        const extras = await loadExtras(data.user.id);
        const merged = { ...data.user, ...extras };
        setCurrentUser(merged);
        saveCachedUser(merged);
      } catch (e: any) {
        if (e?.status === 401) {
          // Token geçersiz/süresi dolmuş — oturumu kapat.
          tokenRef.current = null;
          await setToken(null);
          saveCachedUser(null);
          setCurrentUser(null);
        }
        // Ağ hatasıysa (çevrimdışı) yukarıda yüklenen önbellek profilini
        // ekranda bırakıyoruz; bir sonraki başarılı bağlantıda doğrulanır.
      }
      setIsRestoringSession(false);
    })();
  }, []);

  const registerMember = async (input: RegisterInput): Promise<AuthResult> => {
    try {
      const data = await apiFetch(API_ENDPOINTS.auth.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      tokenRef.current = data.token;
      await setToken(data.token);
      setCurrentUser(data.user);
      saveCachedUser(data.user);
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'Kayıt oluşturulamadı.' };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    // Yerel demo admin girişi: eşleşirse sunucuya HİÇ istek atılmadan yerel bir
    // yönetici oturumu açılır (bkz. yukarıdaki güvenlik notu).
    if (
      ADMIN_PASSWORD &&
      email.trim().toLowerCase() === DEFAULT_ADMIN.email &&
      password === ADMIN_PASSWORD
    ) {
      tokenRef.current = LOCAL_ADMIN_TOKEN;
      await setToken(LOCAL_ADMIN_TOKEN);
      setCurrentUser(DEFAULT_ADMIN);
      saveCachedUser(DEFAULT_ADMIN);
      return { success: true };
    }

    try {
      const data = await apiFetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      tokenRef.current = data.token;
      await setToken(data.token);
      const extras = await loadExtras(data.user.id);
      const merged = { ...data.user, ...extras };
      setCurrentUser(merged);
      saveCachedUser(merged);
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'E-posta veya şifre hatalı.' };
    }
  };

  // Google ile giriş: e-postaya göre mevcut bir üye varsa onu kullanır (aynı
  // e-postayla e-posta/şifre yöntemiyle kayıt olunmuşsa hesaplar sunucu
  // tarafında birleşir), yoksa sosyal profil bilgisiyle yeni bir üye oluşturur.
  const loginWithProvider = async (input: SocialLoginInput): Promise<AuthResult> => {
    try {
      const data = await apiFetch(API_ENDPOINTS.auth.socialLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      tokenRef.current = data.token;
      await setToken(data.token);
      const extras = await loadExtras(data.user.id);
      // Google profilindeki fotoğraf, bu hesap için ilk defa görülüyorsa (daha
      // önce elle bir avatar ayarlanmadıysa) yerel önbelleğe de yazılır.
      const nextExtras = extras.avatarUri ? extras : { ...extras, avatarUri: input.avatarUri };
      if (!extras.avatarUri && input.avatarUri) saveExtras(data.user.id, nextExtras);
      const merged = { ...data.user, ...nextExtras };
      setCurrentUser(merged);
      saveCachedUser(merged);
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'Giriş başarısız oldu.' };
    }
  };

  const logout = async (): Promise<void> => {
    tokenRef.current = null;
    await setToken(null);
    saveCachedUser(null);
    setCurrentUser(null);
  };

  const deleteAccount = async (): Promise<AuthResult> => {
    const token = tokenRef.current;
    const userId = currentUser?.id;

    if (token && token !== LOCAL_ADMIN_TOKEN) {
      try {
        await apiFetch(API_ENDPOINTS.auth.me, { method: 'DELETE', headers: authHeader(token) });
      } catch (e: any) {
        if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
        // Sunucuda kayıt zaten yoksa (404 vb.) bile yerel oturumu temizlemeye devam ediyoruz.
      }
    }

    await logout();
    if (userId) AsyncStorage.removeItem(extrasKey(userId)).catch(() => {});
    return { success: true };
  };

  const updateCurrentUser = async (updates: {
    fullName?: string;
    email?: string;
    phone?: string;
    avatarUri?: string;
  }): Promise<AuthResult> => {
    if (!currentUser) {
      return { success: false, error: 'Önce giriş yapmalısınız.' };
    }

    // avatarUri sunucuya hiç gönderilmiyor — sunucuda görsel depolama altyapısı
    // yok, bu alan bilerek yalnızca bu cihazda tutuluyor.
    const keys = Object.keys(updates);
    if (updates.avatarUri !== undefined && keys.length === 1) {
      const extras = await loadExtras(currentUser.id);
      saveExtras(currentUser.id, { ...extras, avatarUri: updates.avatarUri });
      const merged = { ...currentUser, avatarUri: updates.avatarUri };
      setCurrentUser(merged);
      saveCachedUser(merged);
      return { success: true };
    }

    const token = tokenRef.current;
    if (!token || token === LOCAL_ADMIN_TOKEN) {
      // Yerel yönetici hesabının profili sunucuda tutulmuyor; değişiklik yalnızca
      // ekranda anlık görünür, kalıcı değildir (bir sonraki girişte .env'deki
      // sabit değerlere döner).
      const merged = { ...currentUser, ...updates };
      setCurrentUser(merged);
      return { success: true };
    }

    if (updates.fullName !== undefined && !updates.fullName.trim()) {
      return { success: false, error: 'Ad Soyad alanı zorunludur.' };
    }
    if (updates.email !== undefined && !EMAIL_REGEX.test(updates.email.trim())) {
      return { success: false, error: 'Geçerli bir e-posta adresi girin.' };
    }

    try {
      const data = await apiFetch(API_ENDPOINTS.auth.me, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader(token) },
        body: JSON.stringify(updates),
      });
      const extras = await loadExtras(data.user.id);
      const merged = { ...data.user, ...extras };
      setCurrentUser(merged);
      saveCachedUser(merged);
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'Bilgiler kaydedilemedi.' };
    }
  };

  // Satın alma (ya da "Satın Alımları Geri Yükle") başarılı olduğunda çağrılır;
  // giriş yapılmış kullanıcının aylık reklamsız abonelik bitiş tarihini işler.
  // Bilerek yalnızca cihazda tutulur (bkz. dosya başındaki not) — until = null
  // verilirse abonelik kaldırılır (örn. RevenueCat "expired" bildirirse).
  const setAdsRemovedUntil = (until: number | null) => {
    if (!currentUser) return;
    saveExtras(currentUser.id, { avatarUri: currentUser.avatarUri, adsRemovedUntil: until ?? undefined });
    const merged = { ...currentUser, adsRemovedUntil: until ?? undefined };
    setCurrentUser(merged);
    saveCachedUser(merged);
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    const token = tokenRef.current;
    if (!token || token === LOCAL_ADMIN_TOKEN) {
      return { success: false, error: 'Yerel yönetici hesabının şifresi .env dosyasından değiştirilir.' };
    }
    if (newPassword.trim().length < 6) {
      return { success: false, error: 'Yeni şifre en az 6 karakter olmalı.' };
    }
    try {
      await apiFetch(API_ENDPOINTS.auth.mePassword, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader(token) },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'Şifre değiştirilemedi.' };
    }
  };

  // GÜVENLİK NOTU: Bu uç nokta e-postanın gerçekten o kişiye ait olduğunu
  // doğrulamaz (kod/link göndermez) — sadece e-posta + yeni şifre alır. Bu,
  // uygulamanın önceki cihaz-yerel sürümündeki davranışın aynısıdır (bkz.
  // SifremiUnuttumScreen.tsx içindeki güvenlik notu). Gerçek bir doğrulama için
  // backend'e bir e-posta gönderme servisi (örn. SendGrid) ve tek kullanımlık
  // kod/link akışı eklenmesi gerekir.
  const resetPassword = async (email: string, newPassword: string): Promise<AuthResult> => {
    try {
      await apiFetch(API_ENDPOINTS.auth.resetPassword, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      return { success: true };
    } catch (e: any) {
      if (e?.message === 'NETWORK') return { success: false, error: networkErrorMessage() };
      return { success: false, error: e?.message ?? 'Şifre sıfırlanamadı.' };
    }
  };

  const isEmailTaken = async (email: string): Promise<boolean> => {
    const data = await apiFetch(
      `${API_ENDPOINTS.auth.checkEmail}?email=${encodeURIComponent(email.trim().toLowerCase())}`
    );
    return !!data.taken;
  };

  return (
    <MembersContext.Provider
      value={{
        currentUser,
        isRestoringSession,
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
