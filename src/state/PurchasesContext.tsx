import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { REVENUECAT_CONFIG, isRevenueCatConfigured } from '../config/purchases';
import { useMembers } from './MembersContext';

// ÖNEMLİ: abonelik/reklamsız durumu BURADA, giriş yapılmış in-app hesaptan
// (MembersContext.currentUser) BAĞIMSIZ olarak cihazda saklanır. Önceki
// tasarımda bu bilgi sadece `currentUser`a bağlıydı (MembersContext.setAdsRemovedUntil
// içeride `if (!currentUser) return;` yapıyordu) — yani kullanıcı uygulamaya
// hiç giriş yapmadan (hesap oluşturmadan) RevenueCat üzerinden abonelik satın
// aldığında, entitlement bilgisi hiçbir yere yazılmıyor, reklamlar satın almaya
// rağmen göstermeye devam ediyordu. Bunu, RevenueCat zaten cihaz/anonim kullanıcı
// bazlı çalıştığı için, in-app login şartı olmadan cihazda kalıcı hale getiriyoruz.
const SUBSCRIPTION_AD_FREE_KEY = 'motorkarne_subscription_ad_free_until';

interface PurchasesContextType {
  monthlyOffering: PurchasesOffering | null;
  isLoading: boolean;
  // Aktif aylık abonelikten kaynaklanan reklamsız bitiş zamanı (epoch ms) — giriş
  // yapılmış bir hesap olmasa bile geçerli. AdsContext bunu okuyarak reklamları gizler.
  subscriptionAdFreeUntil: number | null;
  // Aylık aboneliği satın alma akışını başlatır (mağaza ödeme ekranını açar).
  // Kullanıcı uygulamaya giriş yapmamışsa satın alma BAŞLATILMAZ —
  // requiresLogin: true döner, UI bunu görüp giriş ekranına yönlendirmeli.
  purchaseMonthly: () => Promise<{ success: boolean; error?: string; requiresLogin?: boolean }>;
  // Kullanıcı daha önce satın aldıysa (örn. telefon değiştirdiyse) aboneliği geri yükler.
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const PurchasesContext = createContext<PurchasesContextType>({
  monthlyOffering: null,
  isLoading: false,
  subscriptionAdFreeUntil: null,
  purchaseMonthly: async () => ({ success: false, error: 'PurchasesProvider bulunamadı' }),
  restorePurchases: async () => ({ success: false, error: 'PurchasesProvider bulunamadı' }),
});

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // MembersContext.setAdsRemovedUntil hâlâ (varsa) profil/hesap ekranlarında
  // gösterim için üye kaydına da yazılıyor, ama artık TEK kaynak değil.
  const { currentUser, setAdsRemovedUntil } = useMembers();
  const [monthlyOffering, setMonthlyOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [subscriptionAdFreeUntil, setSubscriptionAdFreeUntil] = useState<number | null>(null);

  // Uygulama açılışında, cihazda önceden kaydedilmiş abonelik bitiş zamanını hemen
  // yükle — RevenueCat ağ isteği tamamlanana kadar reklamlar yanlışlıkla görünmesin.
  useEffect(() => {
    AsyncStorage.getItem(SUBSCRIPTION_AD_FREE_KEY).then((raw) => {
      if (!raw) return;
      const until = parseInt(raw, 10);
      if (!isNaN(until)) setSubscriptionAdFreeUntil(until);
    }).catch(() => {});
  }, []);

  // RevenueCat SDK'sını uygulama açılışında bir kere yapılandır.
  useEffect(() => {
    if (!isRevenueCatConfigured()) {
      setIsLoading(false);
      return; // Henüz gerçek API anahtarları girilmemiş — sessizce devre dışı kal.
    }
    const apiKey = Platform.select({
      android: REVENUECAT_CONFIG.androidApiKey,
      ios: REVENUECAT_CONFIG.iosApiKey,
      default: '',
    });
    if (!apiKey) {
      setIsLoading(false);
      return;
    }
    Purchases.configure({ apiKey });
    setIsConfigured(true);
  }, []);

  // Kullanıcı giriş yaptığında/değiştiğinde RevenueCat'i o kullanıcıya bağla,
  // mevcut abonelik durumunu çek ve satın alınabilir teklifleri yükle.
  useEffect(() => {
    if (!isConfigured) return;

    (async () => {
      setIsLoading(true);
      try {
        if (currentUser) {
          await Purchases.logIn(currentUser.id);
        }
        const offerings = await Purchases.getOfferings();
        if (offerings.current) setMonthlyOffering(offerings.current);

        const customerInfo = await Purchases.getCustomerInfo();
        syncEntitlementToMember(customerInfo);
      } catch (e) {
        // Ağ hatası vb. — sessizce yok say, kullanıcı normal (reklamlı) deneyime devam eder.
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isConfigured, currentUser?.id]);

  // Giriş yapılmış bir hesap olsun ya da olmasın, bu HER ZAMAN çalışır — reklamsız
  // durumun tek gerçek kaynağı burası. `currentUser` varsa ayrıca üye kaydına da
  // (bilgilendirme amaçlı) yazılır, ama artık ads gösterimi buna bağlı değil.
  const syncEntitlementToMember = (customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>) => {
    const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.adFreeEntitlementId];
    const expiresAt = entitlement
      ? (entitlement.expirationDate ? new Date(entitlement.expirationDate).getTime() : null)
      : null;
    const hasEntitlement = !!entitlement;

    // hasEntitlement true ama expiresAt null olabilir (ömür boyu/lifetime erişim) —
    // bu durumda Number.MAX_SAFE_INTEGER kullanarak "süresiz" olarak işaretliyoruz,
    // aksi halde aşağıdaki `> now` kontrolleri onu yanlışlıkla süresi dolmuş sayar.
    const resolvedUntil = hasEntitlement ? (expiresAt ?? Number.MAX_SAFE_INTEGER) : null;

    setSubscriptionAdFreeUntil(resolvedUntil);
    if (resolvedUntil !== null) {
      AsyncStorage.setItem(SUBSCRIPTION_AD_FREE_KEY, String(resolvedUntil)).catch(() => {});
    } else {
      AsyncStorage.removeItem(SUBSCRIPTION_AD_FREE_KEY).catch(() => {});
    }

    // Giriş yapılmış bir hesap varsa profil/hesap ekranlarında gösterim için
    // üye kaydını da güncelle (best-effort, sessizce no-op olabilir).
    setAdsRemovedUntil(expiresAt);
  };

  const purchaseMonthly = async (): Promise<{ success: boolean; error?: string; requiresLogin?: boolean }> => {
    // Kullanıcı uygulamaya giriş yapmadan (hesap oluşturmadan) satın alma akışı
    // başlatılmasın — UI bunu görüp giriş ekranına yönlendirmeli.
    if (!currentUser) {
      return {
        success: false,
        requiresLogin: true,
        error: 'Abonelik satın almak için önce giriş yapmalısınız.',
      };
    }
    if (!monthlyOffering?.availablePackages?.length) {
      return { success: false, error: 'Abonelik şu an satın alınamıyor, lütfen daha sonra tekrar deneyin.' };
    }
    const pkg = monthlyOffering.availablePackages.find(
      (p) => p.product.identifier === REVENUECAT_CONFIG.monthlyProductId
    ) ?? monthlyOffering.availablePackages[0];

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      syncEntitlementToMember(customerInfo);
      return { success: true };
    } catch (e: any) {
      if (e?.userCancelled) return { success: false }; // kullanıcı iptal etti, hata göstermeye gerek yok
      return { success: false, error: 'Satın alma sırasında bir sorun oluştu.' };
    }
  };

  const restorePurchases = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      syncEntitlementToMember(customerInfo);
      const hasEntitlement = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.adFreeEntitlementId];
      return hasEntitlement
        ? { success: true }
        : { success: false, error: 'Bu hesaba bağlı aktif bir abonelik bulunamadı.' };
    } catch {
      return { success: false, error: 'Satın alımlar geri yüklenirken bir sorun oluştu.' };
    }
  };

  return (
    <PurchasesContext.Provider
      value={{ monthlyOffering, isLoading, subscriptionAdFreeUntil, purchaseMonthly, restorePurchases }}
    >
      {children}
    </PurchasesContext.Provider>
  );
};

export const usePurchases = () => useContext(PurchasesContext);
