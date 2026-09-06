import { useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_AUTH_CONFIG } from '../config/auth';

export interface SocialProfile {
  provider: 'google';
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
