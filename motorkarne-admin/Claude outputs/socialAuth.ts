import { useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { GOOGLE_AUTH_CONFIG } from '../config/auth';

export interface SocialProfile {
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  fullName: string;
  avatarUri?: string;
}

// ---------- GOOGLE ----------
// ÖNEMLİ: Daha önce burada expo-auth-session/providers/google (tarayıcı üzerinden
// genel bir OAuth yönlendirme akışı) kullanılıyordu. Google, "Android"/"iOS" tipi
// OAuth istemcilerini artık yalnızca kendi native Google Sign-In SDK'sıyla
// kullanılmak üzere kabul ediyor — tarayıcı tabanlı manuel redirect akışıyla
// kullanıldığında "Hata 400: invalid_request / OAuth 2.0 politikasına uymuyor"
// hatası veriyor (SHA-1/paket adı doğru kayıtlı olsa bile). Bu yüzden native
// @react-native-google-signin/google-signin kütüphanesine geçtik — bu, Android
// istemcisini paket adı + SHA-1 imzasından otomatik tanıyor, redirect_uri
// derdi yok.
let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // Burada bilerek Android/iOS istemci kimlikleri DEĞİL, "Web application" tipi
    // istemci kimliği (webClientId) veriliyor — native SDK dönen idToken'ın
    // doğrulanabilir olması için bunu istiyor; Android tarafı ayrıca kendi native
    // yapılandırmasından (paket adı + SHA-1) otomatik doğrulanıyor.
    webClientId: GOOGLE_AUTH_CONFIG.webClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export function useGoogleSignIn(onSuccess: (profile: SocialProfile) => void, onError: (message: string) => void) {
  useEffect(() => {
    ensureGoogleConfigured();
  }, []);

  const promptAsync = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: any = await GoogleSignin.signIn();

      // Kütüphanenin farklı sürümleri farklı yanıt şekli döndürebiliyor
      // (v11+ { type, data } sarmalı kullanıyor, önceki sürümler düz obje) —
      // ikisini de destekliyoruz.
      if (response?.type === 'cancelled') return; // kullanıcı vazgeçti, hata gösterme

      const user = response?.data?.user ?? response?.user;
      if (!user?.email) {
        onError('Google hesabınızdan e-posta bilgisi alınamadı.');
        return;
      }
      onSuccess({
        provider: 'google',
        providerId: user.id,
        email: user.email,
        fullName: user.name ?? user.email,
        avatarUri: user.photo ?? undefined,
      });
    } catch (e: any) {
      if (
        e?.code === statusCodes.SIGN_IN_CANCELLED ||
        e?.code === statusCodes.IN_PROGRESS
      ) {
        return; // kullanıcı iptal etti ya da zaten devam eden bir giriş var — sessiz geç
      }
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError('Bu cihazda Google Play Hizmetleri bulunamadı.');
        return;
      }
      // TANI AMAÇLI LOG: Alert.alert() logcat'e hiçbir şey yazmıyor, bu yüzden
      // gerçek hata objesini (code/message) görebilmek için console.error ile
      // "MK_GOOGLE_SIGNIN_ERROR" etiketiyle de logluyoruz — bir sorun çıkarsa
      // `adb logcat | Select-String "MK_GOOGLE_SIGNIN_ERROR"` ile görülebilir.
      // Kullanıcıya ise artık ham hata kodu/mesajı DEĞİL, sade bir mesaj
      // gösteriliyor (bkz. aşağıdaki onError çağrısı).
      try {
        const extraKeys = Object.getOwnPropertyNames(e || {}).filter(
          (k) => !['code', 'message', 'name', 'stack'].includes(k)
        );
        const extra: Record<string, any> = {};
        extraKeys.forEach((k) => {
          try {
            extra[k] = (e as any)[k];
          } catch {}
        });
        console.error(
          'MK_GOOGLE_SIGNIN_ERROR',
          JSON.stringify({ code: e?.code, message: e?.message, name: e?.name, extra })
        );
      } catch (logErr) {
        console.error('MK_GOOGLE_SIGNIN_ERROR', 'stringify başarısız', String(e));
      }
      onError('Google girişi başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  // Eski AuthSession tabanlı arayüzle uyumlu kalmak için `request` alanını
  // sabit `true` döndürüyoruz — ekranlardaki `disabled={!googleRequest}`
  // kontrolü bu sayede hiçbir değişiklik gerekmeden çalışmaya devam ediyor.
  return { request: true, promptAsync };
}

// ---------- APPLE ----------
// Apple, App Store İnceleme Kuralı 4.8 uyarınca: bir uygulama üçüncü taraf bir
// giriş servisi (burada Google) sunuyorsa, eşdeğer bir seçenek olarak
// "Sign in with Apple"ı da sunmak ZORUNDA — aksi halde uygulama reddedilir.
//
// ÖNEMLİ İNCELİK: Apple, e-posta ve ad-soyad bilgisini SADECE bu uygulamaya
// karşı yapılan İLK yetkilendirmede döndürüyor — kullanıcı ikinci kez "Apple
// ile Devam Et"e bastığında bu alanlar her zaman null geliyor (Apple'ın kendi
// tasarımı, bir hata değil). Bu yüzden ilk seferde SecureStore'a önbelleğe
// alıyoruz; sonraki girişlerde oradan okuyup sunucuya (her seferinde e-posta/ad
// isteyen /api/auth/social-login uç noktasına) gönderiyoruz.
const APPLE_PROFILE_CACHE_PREFIX = 'motorkarne_apple_profile_';

export function useAppleSignIn(onSuccess: (profile: SocialProfile) => void, onError: (message: string) => void) {
  const promptAsync = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const providerId = credential.user;
      const cacheKey = APPLE_PROFILE_CACHE_PREFIX + providerId;

      let email = credential.email ?? undefined;
      let fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim()
        : '';

      if (email || fullName) {
        try {
          await SecureStore.setItemAsync(cacheKey, JSON.stringify({ email, fullName }));
        } catch {
          // Önbelleğe yazılamazsa sessiz geç — bir sonraki girişte tekrar denenir.
        }
      } else {
        try {
          const cached = await SecureStore.getItemAsync(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            email = parsed.email;
            fullName = parsed.fullName;
          }
        } catch {
          // Bozuk/okunamayan önbellek — aşağıdaki eksik-bilgi kontrolüne düşer.
        }
      }

      if (!email || !fullName) {
        onError(
          'Bu Apple hesabıyla daha önce giriş yapmışsınız ama gerekli bilgiler bu cihazda bulunamadı. ' +
            'Ayarlar > Apple Kimliği > Oturum Açma ve Güvenlik > MotorKarne için erişimi kaldırıp tekrar deneyin.'
        );
        return;
      }

      onSuccess({ provider: 'apple', providerId, email, fullName });
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return; // kullanıcı iptal etti, hata gösterme
      try {
        console.error('MK_APPLE_SIGNIN_ERROR', JSON.stringify({ code: e?.code, message: e?.message }));
      } catch {
        console.error('MK_APPLE_SIGNIN_ERROR', String(e));
      }
      onError('Apple ile giriş başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  return { promptAsync };
}
