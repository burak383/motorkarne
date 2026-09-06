import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, { AdsConsent, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_CONFIG } from '../config/ads';
import { usePurchases } from './PurchasesContext';
import { useMembers } from './MembersContext';

// NOT: "Reklam izle, 30 gün reklamsız kullan" özelliği kaldırıldı — artık
// reklamsız kullanım yalnızca aylık abonelik üzerinden sağlanıyor. Eski
// sürümlerde bu bonusun hesaba özel diske yazıldığı anahtar öneki; artık yeni
// bir bonus kazandırılmıyor, yalnızca hesap silinirken varsa eski/artık
// kalıntı kaydı temizlemek için kullanılıyor (bkz. clearRewardedBonus).
const LEGACY_AD_FREE_UNTIL_KEY_PREFIX = 'motorkarne_ad_free_until_';

interface AdsContextType {
  isAdFree: boolean;
  isSubscriptionAdFree: boolean; // aylık abonelikten mi kaynaklanıyor (bilgilendirme metni için)
  adFreeRemainingLabel: string; // örn. "18 saat" ya da "27 gün"
  registerScreenView: () => void;
  // GDPR/UMP: Kullanıcının onay akışı tamamlanıp reklam istenebilir mi (AB/İngiltere'de
  // onay formu gösterilmeden veya reddedilmişse false kalır). Onay tamamlanana kadar
  // hiçbir reklam (banner/geçiş) istenmemeli — bkz. aşağıdaki useEffect.
  canRequestAds: boolean;
  // Kullanıcı kişiselleştirilmiş reklamlara onay vermediyse (ya da henüz bilinmiyorsa,
  // güvenli taraf) true — reklam isteklerinde requestNonPersonalizedAdsOnly olarak kullanılır.
  requestNonPersonalizedAdsOnly: boolean;
  // Hesap silinirken çağrılır: bu hesabın (varsa eski) ödüllü reklam bonusu
  // kaydını diskten kalıcı olarak kaldırır.
  clearRewardedBonus: () => void;
}

const AdsContext = createContext<AdsContextType>({
  isAdFree: false,
  isSubscriptionAdFree: false,
  adFreeRemainingLabel: '',
  registerScreenView: () => {},
  canRequestAds: false,
  requestNonPersonalizedAdsOnly: true,
  clearRewardedBonus: () => {},
});

function formatRemaining(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} gün`;
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  return `${hours} saat`;
}

export const AdsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ÖNEMLİ: abonelik durumu artık PurchasesContext'ten, giriş yapılmış in-app
  // hesaptan (MembersContext) BAĞIMSIZ olarak okunuyor. Önceden bu değer
  // currentUser.adsRemovedUntil'e bağlıydı — kullanıcı uygulamaya hiç giriş
  // yapmadan (hesap oluşturmadan) abonelik satın aldığında bu alan hiç
  // güncellenmiyor, reklamlar satın almaya rağmen gösterilmeye devam ediyordu.
  const { subscriptionAdFreeUntil } = usePurchases();
  const subscriptionUntil = subscriptionAdFreeUntil;

  const { currentUser } = useMembers();
  const userId = currentUser?.id ?? null;

  const [now, setNow] = useState(Date.now());

  const screenViewCount = useRef(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const isInterstitialLoaded = useRef(false);

  // ---- GDPR/UMP: reklam SDK'sını başlatmadan/reklam istemeden ÖNCE onay akışını çalıştır ----
  // AB/İngiltere/İsviçre'deki kullanıcılara Google'ın UMP (User Messaging Platform) formu
  // otomatik gösterilir; diğer bölgelerde gatherConsent() hızlıca "gerekli değil" döner.
  // Onay tamamlanmadan (ya da gerekmediği netleşmeden) hiçbir reklam istenmemeli — bu yüzden
  // aşağıdaki `canRequestAds` false olduğu sürece interstitial/rewarded/banner hiç yüklenmez.
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [requestNonPersonalizedAdsOnly, setRequestNonPersonalizedAdsOnly] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await AdsConsent.gatherConsent();
      } catch (e) {
        // Kullanıcı formu kapattı, ağ hatası vb. — yine de aşağıda mevcut onay bilgisiyle devam ediyoruz.
      }

      let allowed = false;
      try {
        const info = await AdsConsent.getConsentInfo();
        allowed = info.canRequestAds;
      } catch (e) {
        allowed = false;
      }
      if (cancelled) return;
      setCanRequestAds(allowed);

      if (allowed) {
        await mobileAds().initialize();
        try {
          const choices = await AdsConsent.getUserChoices();
          if (!cancelled) setRequestNonPersonalizedAdsOnly(choices?.selectPersonalisedAds !== true);
        } catch (e) {
          if (!cancelled) setRequestNonPersonalizedAdsOnly(true); // bilinmiyorsa güvenli taraf
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Kalan süre etiketinin (saat/gün) güncel kalması için periyodik tazeleme.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const isSubscriptionAdFree = subscriptionUntil !== null && subscriptionUntil > now;
  const isAdFree = isSubscriptionAdFree;

  const adFreeRemainingLabel = isSubscriptionAdFree ? formatRemaining(subscriptionUntil! - now) : '';

  // ---- Geçiş reklamını önceden yükle ----
  const loadInterstitial = () => {
    const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly,
    });
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded.current = false;
      unsubscribeLoaded();
      unsubscribeClosed();
      loadInterstitial();
    });
    ad.load();
    interstitialRef.current = ad;
  };

  const adsInitializedRef = useRef(false);
  useEffect(() => {
    // GDPR onayı netleşmeden (canRequestAds === false) hiçbir reklam isteği atma.
    // Bir kere başlatıldıktan sonra tekrar tetiklenmesin diye ref ile kilitliyoruz —
    // loadInterstitial kapanış sonrası kendi kendini zaten yeniden yüklüyor.
    if (!canRequestAds || adsInitializedRef.current) return;
    adsInitializedRef.current = true;
    loadInterstitial();
  }, [canRequestAds]);

  const registerScreenView = () => {
    if (isAdFree) return;
    screenViewCount.current += 1;
    if (screenViewCount.current >= AD_CONFIG.interstitialFrequency) {
      screenViewCount.current = 0;
      if (isInterstitialLoaded.current && interstitialRef.current) {
        interstitialRef.current.show().catch(() => {});
      }
    }
  };

  // "Reklam izle, 30 gün reklamsız kullan" özelliği kaldırıldığı için artık yeni
  // bir bonus kazandırılmıyor — bu yalnızca hesap silinirken varsa ESKİ
  // sürümlerden kalma diskteki kaydı temizlemek için tutuluyor.
  const clearRewardedBonus = () => {
    if (!userId) return;
    AsyncStorage.removeItem(LEGACY_AD_FREE_UNTIL_KEY_PREFIX + userId).catch(() => {});
  };

  return (
    <AdsContext.Provider
      value={{
        isAdFree,
        isSubscriptionAdFree,
        adFreeRemainingLabel,
        registerScreenView,
        canRequestAds,
        requestNonPersonalizedAdsOnly,
        clearRewardedBonus,
      }}
    >
      {children}
    </AdsContext.Provider>
  );
};

export const useAds = () => useContext(AdsContext);
