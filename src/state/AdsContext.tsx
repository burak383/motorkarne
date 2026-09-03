import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  AdsConsent,
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS, AD_CONFIG } from '../config/ads';
import { usePurchases } from './PurchasesContext';

const AD_FREE_UNTIL_KEY = 'motorkarne_ad_free_until'; // ödüllü reklamdan gelen geçici süre (cihaz-yerel)

interface AdsContextType {
  isAdFree: boolean;
  isSubscriptionAdFree: boolean; // aylık abonelikten mi kaynaklanıyor (bilgilendirme metni için)
  adFreeRemainingLabel: string; // örn. "18 saat" ya da "27 gün"
  registerScreenView: () => void;
  showRewardedAd: () => Promise<boolean>;
  isRewardedAdReady: boolean;
  // GDPR/UMP: Kullanıcının onay akışı tamamlanıp reklam istenebilir mi (AB/İngiltere'de
  // onay formu gösterilmeden veya reddedilmişse false kalır). Onay tamamlanana kadar
  // hiçbir reklam (banner/geçiş/ödüllü) istenmemeli — bkz. aşağıdaki useEffect.
  canRequestAds: boolean;
  // Kullanıcı kişiselleştirilmiş reklamlara onay vermediyse (ya da henüz bilinmiyorsa,
  // güvenli taraf) true — reklam isteklerinde requestNonPersonalizedAdsOnly olarak kullanılır.
  requestNonPersonalizedAdsOnly: boolean;
}

const AdsContext = createContext<AdsContextType>({
  isAdFree: false,
  isSubscriptionAdFree: false,
  adFreeRemainingLabel: '',
  registerScreenView: () => {},
  showRewardedAd: async () => false,
  isRewardedAdReady: false,
  canRequestAds: false,
  requestNonPersonalizedAdsOnly: true,
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

  const [rewardedAdFreeUntil, setRewardedAdFreeUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isRewardedAdReady, setIsRewardedAdReady] = useState(false);

  const screenViewCount = useRef(0);
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const isInterstitialLoaded = useRef(false);
  const rewardedRef = useRef<RewardedAd | null>(null);
  const rewardEarnedRef = useRef(false);

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

  // Cihazda daha önce ödüllü reklamdan kazanılmış bir "reklamsız süre" var mı diye kontrol et.
  useEffect(() => {
    AsyncStorage.getItem(AD_FREE_UNTIL_KEY).then((raw) => {
      if (raw) {
        const until = parseInt(raw, 10);
        if (!isNaN(until) && until > Date.now()) setRewardedAdFreeUntil(until);
      }
    });
  }, []);

  // Kalan süre etiketinin (saat/gün) güncel kalması için periyodik tazeleme.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const isRewardedAdFreeActive = rewardedAdFreeUntil !== null && rewardedAdFreeUntil > now;
  const isSubscriptionAdFree = subscriptionUntil !== null && subscriptionUntil > now;
  const isAdFree = isRewardedAdFreeActive || isSubscriptionAdFree;

  // İki kaynaktan hangisi daha uzun süre kalıyorsa onu göster (kullanıcıya en iyimser bilgiyi ver).
  const activeUntil = isSubscriptionAdFree && (!isRewardedAdFreeActive || subscriptionUntil! > rewardedAdFreeUntil!)
    ? subscriptionUntil
    : (isRewardedAdFreeActive ? rewardedAdFreeUntil : null);
  const adFreeRemainingLabel = activeUntil ? formatRemaining(activeUntil - now) : '';

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

  // ---- Ödüllü reklamı önceden yükle ----
  const loadRewarded = () => {
    const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
      requestNonPersonalizedAdsOnly,
    });
    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsRewardedAdReady(true);
    });
    const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      rewardEarnedRef.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setIsRewardedAdReady(false);
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      if (rewardEarnedRef.current) {
        const until = Date.now() + AD_CONFIG.rewardedAdFreeDurationDays * 24 * 60 * 60 * 1000;
        setRewardedAdFreeUntil(until);
        AsyncStorage.setItem(AD_FREE_UNTIL_KEY, String(until)).catch(() => {});
        rewardEarnedRef.current = false;
      }
      loadRewarded();
    });
    ad.load();
    rewardedRef.current = ad;
  };

  const adsInitializedRef = useRef(false);
  useEffect(() => {
    // GDPR onayı netleşmeden (canRequestAds === false) hiçbir reklam isteği atma.
    // Bir kere başlatıldıktan sonra tekrar tetiklenmesin diye ref ile kilitliyoruz —
    // loadInterstitial/loadRewarded kapanış sonrası kendi kendini zaten yeniden yüklüyor.
    if (!canRequestAds || adsInitializedRef.current) return;
    adsInitializedRef.current = true;
    loadInterstitial();
    loadRewarded();
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

  const showRewardedAd = async (): Promise<boolean> => {
    if (!isRewardedAdReady || !rewardedRef.current) return false;
    try {
      await rewardedRef.current.show();
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AdsContext.Provider
      value={{
        isAdFree,
        isSubscriptionAdFree,
        adFreeRemainingLabel,
        registerScreenView,
        showRewardedAd,
        isRewardedAdReady,
        canRequestAds,
        requestNonPersonalizedAdsOnly,
      }}
    >
      {children}
    </AdsContext.Provider>
  );
};

export const useAds = () => useContext(AdsContext);
