import React, { createContext, useContext } from 'react';

// Web'de AdMob native SDK'sı çalışmıyor (react-native-google-mobile-ads native-only
// bir kütüphane) — bu yüzden web platformunda tamamen zararsız, sahte bir sürüm
// kullanıyoruz. Metro, dosya adındaki ".web.tsx" uzantısını görünce web derlemesinde
// otomatik olarak bu dosyayı, native derlemede ise AdsContext.tsx'i kullanır.
interface AdsContextType {
  isAdFree: boolean;
  isSubscriptionAdFree: boolean;
  adFreeRemainingLabel: string;
  registerScreenView: () => void;
  showRewardedAd: () => Promise<boolean>;
  isRewardedAdReady: boolean;
}

const AdsContext = createContext<AdsContextType>({
  isAdFree: true, // web'de reklam gösterilmediği için "reklamsız" kabul ediyoruz
  isSubscriptionAdFree: false,
  adFreeRemainingLabel: '',
  registerScreenView: () => {},
  showRewardedAd: async () => false,
  isRewardedAdReady: false,
});

export const AdsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AdsContext.Provider value={{
    isAdFree: true,
    isSubscriptionAdFree: false,
    adFreeRemainingLabel: '',
    registerScreenView: () => {},
    showRewardedAd: async () => false,
    isRewardedAdReady: false,
  }}>{children}</AdsContext.Provider>;
};

export const useAds = () => useContext(AdsContext);