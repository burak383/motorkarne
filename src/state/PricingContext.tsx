import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PRICING, type PricingConfig } from '../utils/tco';

// Buraya kendi GitHub Pages linkinizi koyun (docs/pricing.json'ı yayınladıktan sonra).
// Örnek: 'https://kullaniciadi.github.io/motorkarne/pricing.json'
// Boş/geçersiz bırakılırsa veya çekilemezse, uygulama aşağıdaki gömülü varsayılanlara
// (DEFAULT_PRICING) sessizce düşer — hiçbir zaman çökmez veya hata göstermez.
const REMOTE_PRICING_URL = 'https://burak383.github.io/motorkarne/pricing.json';

const STORAGE_KEY = 'motorkarne_pricing_overrides';
const REMOTE_CACHE_KEY = 'motorkarne_pricing_remote_cache';

interface PricingContextType {
  pricing: PricingConfig;
  annualKm: number;
  setAnnualKm: (km: number) => void;
  updatePricing: (partial: Partial<PricingConfig>) => void;
  resetToDefaults: () => void;
  source: 'remote' | 'cached' | 'default' | 'custom';
  lastFetchAttempt: string | null;
}

const PricingContext = createContext<PricingContextType>({
  pricing: DEFAULT_PRICING,
  annualKm: 15000,
  setAnnualKm: () => {},
  updatePricing: () => {},
  resetToDefaults: () => {},
  source: 'default',
  lastFetchAttempt: null,
});

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [annualKm, setAnnualKmState] = useState(15000);
  const [source, setSource] = useState<'remote' | 'cached' | 'default' | 'custom'>('default');
  const [lastFetchAttempt, setLastFetchAttempt] = useState<string | null>(null);
  const [hasUserOverride, setHasUserOverride] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Kullanıcının kendi girdiği özel değerler var mı? (her şeyin önceliği bunda)
      try {
        const savedOverride = await AsyncStorage.getItem(STORAGE_KEY);
        const savedKm = await AsyncStorage.getItem(STORAGE_KEY + '_km');
        if (savedKm) setAnnualKmState(Number(savedKm) || 15000);
        if (savedOverride) {
          setPricing(JSON.parse(savedOverride));
          setSource('custom');
          setHasUserOverride(true);
          return; // kullanıcı özel değer girdiyse uzak veriyi ezmesin
        }
      } catch (e) {
        // yok say
      }

      // 2. Uzak yapılandırmayı çekmeyi dene (placeholder URL hâlâ ayarlanmadıysa hiç deneme)
      if (REMOTE_PRICING_URL.includes('REPLACE_ME')) {
        setSource('default');
        return;
      }
      try {
        const response = await fetch(REMOTE_PRICING_URL);
        setLastFetchAttempt(new Date().toISOString());
        if (response.ok) {
          const remote = await response.json();
          if (remote?.fuelPrices && remote?.mtvBrackets && remote?.maintenanceBase) {
            const merged: PricingConfig = {
              fuelPrices: { ...DEFAULT_PRICING.fuelPrices, ...remote.fuelPrices },
              mtvBrackets: { ...DEFAULT_PRICING.mtvBrackets, ...remote.mtvBrackets },
              maintenanceBase: { ...DEFAULT_PRICING.maintenanceBase, ...remote.maintenanceBase },
            };
            setPricing(merged);
            setSource('remote');
            AsyncStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(merged)).catch(() => {});
            return;
          }
        }
        throw new Error('invalid remote payload');
      } catch (e) {
        // 3. Uzak veri çekilemedi: daha önce önbelleğe alınmış bir kopya var mı?
        try {
          const cached = await AsyncStorage.getItem(REMOTE_CACHE_KEY);
          if (cached) {
            setPricing(JSON.parse(cached));
            setSource('cached');
            return;
          }
        } catch (e2) {
          // yok say
        }
        // 4. Hiçbiri yoksa: gömülü varsayılanlarla devam (zaten başlangıç state'i)
        setSource('default');
      }
    })();
  }, []);

  const setAnnualKm = (km: number) => {
    setAnnualKmState(km);
    AsyncStorage.setItem(STORAGE_KEY + '_km', String(km)).catch(() => {});
  };

  const updatePricing = (partial: Partial<PricingConfig>) => {
    setPricing((prev) => {
      const next: PricingConfig = {
        fuelPrices: { ...prev.fuelPrices, ...partial.fuelPrices },
        mtvBrackets: { ...prev.mtvBrackets, ...partial.mtvBrackets },
        maintenanceBase: { ...prev.maintenanceBase, ...partial.maintenanceBase },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    setSource('custom');
    setHasUserOverride(true);
  };

  const resetToDefaults = () => {
    setPricing(DEFAULT_PRICING);
    setSource('default');
    setHasUserOverride(false);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return (
    <PricingContext.Provider
      value={{ pricing, annualKm, setAnnualKm, updatePricing, resetToDefaults, source, lastFetchAttempt }}
    >
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = () => useContext(PricingContext);
