import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { REVENUECAT_CONFIG, isRevenueCatConfigured } from '../config/purchases';
import { useMembers } from './MembersContext';

// NOT: Apple App Store İnceleme Kuralı 5.1.1(v) uyarınca, hesaba özgü olmayan bir
// uygulama içi satın alma ürünü (bu abonelik yalnızca reklamları kaldırıyor, hesaba
// özel bir içerik/özellik değil) satın alınmadan önce kullanıcı kaydı ZORUNLU
// KILINAMAZ. Önceden burada `purchaseMonthly` giriş yapılmamışsa satın almayı
// başlatmadan `requiresLogin: true` döndürüyordu — Apple bunu 20 Eylül 2026'da
// reddetti ("kullanıcıların kişisel bilgilerini kaydetmelerini gerektirdiğini
// fark ettik"). Artık misafir (giriş yapmamış) kullanıcılar da doğrudan satın
// alabiliyor; RevenueCat bu durumda kendi anonim cihaz kimliğini kullanıyor ve
// kullanıcı daha sonra hesap oluşturup giriş yaparsa (Purchases.logIn), bu satın
// alma otomatik olarak o hesaba aktarılıyor (RevenueCat'in "alias" mekanizması).
//
// Bu nedenle "reklamsız" durumunun cihazdaki hızlı-açılış önbelleği (RevenueCat'in
// ağ isteği sonuçlanana kadar gösterilecek geçici değer) iki ayrı anahtarda
// tutulur: giriş yapılmışsa hesaba özel anahtarda (aynı cihazdaki farklı bir
// hesaba "reklamsız" durumun sızmaması için), giriş yapılmamışsa cihaza özel
// tek bir anahtarda.
const SUBSCRIPTION_AD_FREE_KEY_PREFIX = 'motorkarne_subscription_ad_free_until_';
const DEVICE_SUBSCRIPTION_AD_FREE_KEY = 'motorkarne_subscription_ad_free_until_device';

interface PurchasesContextType {
  monthlyOffering: PurchasesOffering | null;
  isLoading: boolean;
  // Aktif aylık abonelikten kaynaklanan reklamsız bitiş zamanı (epoch ms) — giriş
  // yapılmış bir hesap olmasa bile geçerli. AdsContext bunu okuyarak reklamları gizler.
  subscriptionAdFreeUntil: number | null;
  // Aylık aboneliği satın alma akışını başlatır (mağaza ödeme ekranını açar).
  // Giriş yapılmamış (misafir) kullanıcılar da satın alabilir — Apple Guideline
  // 5.1.1(v) hesaba özgü olmayan satın almalar için kayıt zorunluluğuna izin
  // vermiyor. `requiresLogin` alanı geriye dönük uyumluluk için hâlâ mevcut ama
  // artık hiçbir zaman true dönmüyor.
  purchaseMonthly: () => Promise<{ success: boolean; error?: string; requiresLogin?: boolean }>;
  // Kullanıcı daha önce satın aldıysa (örn. telefon değiştirdiyse) aboneliği geri yükler.
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
  // Hesap silinirken çağrılır: yalnızca bu hesabın cihazdaki YEREL reklamsız-durum
  // önbelleğini kaldırır. NOT: RevenueCat/Google Play'deki gerçek aboneliği iptal
  // ETMEZ — bu, mağaza aboneliği yönetim ekranından ayrıca yapılmalı (bkz.
  // delete-account.html'deki aynı açıklama).
  clearLocalAdFreeCache: () => void;
}

const PurchasesContext = createContext<PurchasesContextType>({
  monthlyOffering: null,
  isLoading: false,
  subscriptionAdFreeUntil: null,
  purchaseMonthly: async () => ({ success: false, error: 'PurchasesProvider bulunamadı' }),
  restorePurchases: async () => ({ success: false, error: 'PurchasesProvider bulunamadı' }),
  clearLocalAdFreeCache: () => {},
});

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // MembersContext.setAdsRemovedUntil hâlâ (varsa) profil/hesap ekranlarında
  // gösterim için üye kaydına da yazılıyor, ama artık TEK kaynak değil.
  const { currentUser, setAdsRemovedUntil } = useMembers();
  const [monthlyOffering, setMonthlyOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [subscriptionAdFreeUntil, setSubscriptionAdFreeUntil] = useState<number | null>(null);

  // Uygulama açılışında (veya hesap değiştiğinde), önceden kaydedilmiş abonelik
  // bitiş zamanını hemen yükle — RevenueCat ağ isteği tamamlanana kadar reklamlar
  // yanlışlıkla görünmesin. Giriş yapılmışsa HESABA özel anahtar, yapılmamışsa
  // (misafir) CİHAZA özel anahtar okunur — bkz. yukarıdaki not.
  useEffect(() => {
    let cancelled = false;
    const key = currentUser
      ? SUBSCRIPTION_AD_FREE_KEY_PREFIX + currentUser.id
      : DEVICE_SUBSCRIPTION_AD_FREE_KEY;
    AsyncStorage.getItem(key).then((raw) => {
      if (cancelled) return;
      if (!raw) {
        setSubscriptionAdFreeUntil(null);
        return;
      }
      const until = parseInt(raw, 10);
      setSubscriptionAdFreeUntil(!isNaN(until) ? until : null);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

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
    // Giriş yapılmışsa HESABA özel anahtara, yapılmamışsa (misafir satın alma —
    // bkz. yukarıdaki not) CİHAZA özel anahtara yazılır. Böylece aynı cihazdaki
    // farklı bir hesaba "reklamsız" durum sızmaz, ama misafir satın alımı da
    // sonraki açılışlarda anında (ağ beklemeden) doğru gösterilir.
    const key = currentUser ? SUBSCRIPTION_AD_FREE_KEY_PREFIX + currentUser.id : DEVICE_SUBSCRIPTION_AD_FREE_KEY;
    if (resolvedUntil !== null) {
      AsyncStorage.setItem(key, String(resolvedUntil)).catch(() => {});
    } else {
      AsyncStorage.removeItem(key).catch(() => {});
    }

    // Giriş yapılmış bir hesap varsa profil/hesap ekranlarında gösterim için
    // üye kaydını da güncelle (best-effort, sessizce no-op olabilir).
    setAdsRemovedUntil(expiresAt);
  };

  const purchaseMonthly = async (): Promise<{ success: boolean; error?: string; requiresLogin?: boolean }> => {
    // ÖNEMLİ (Apple Guideline 5.1.1(v)): Bu satın alma hesaba özgü bir içerik/özellik
    // değil (yalnızca reklamları kaldırıyor), bu yüzden önceden burada olduğu gibi
    // giriş yapılmadan satın almanın engellenmesi Apple tarafından reddedildi.
    // Misafir kullanıcılar da doğrudan satın alabilir; RevenueCat kendi anonim
    // cihaz kimliğini kullanır ve kullanıcı sonradan hesap oluşturursa satın alma
    // otomatik olarak o hesaba aktarılır (bkz. dosya başındaki not).
    if (!monthlyOffering?.availablePackages?.length) {
      return { success: false, error: 'Abonelik şu an satın alınamıyor, lütfen daha sonra tekrar deneyin.' };
    }
    const pkg = monthlyOffering.availablePackages.find(
      (p) => p.product.identifier === REVENUECAT_CONFIG.monthlyProductId
    ) ?? monthlyOffering.availablePackages[0];

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      syncEntitlementToMember(customerInfo);
      // ÖNEMLİ: Satın alma işlemi (ödeme) başarıyla tamamlanmış olabilir ama bu,
      // RevenueCat'in "reklamsiz" entitlement'ını mutlaka aktif döndüreceği
      // anlamına gelmez (örn. üründen entitlement'a yanlış eşleme, dashboard
      // yapılandırma hatası). Önceden burada entitlement kontrol edilmeden
      // doğrudan success:true dönülüyordu — bu da kullanıcıya "Aboneliğiniz
      // aktif!" mesajı gösterilmesine rağmen reklamların gösterilmeye devam
      // etmesine yol açabiliyordu. restorePurchases'daki gibi burada da
      // entitlement'ın gerçekten aktif olduğunu doğruluyoruz.
      const hasEntitlement = !!customerInfo.entitlements.active[REVENUECAT_CONFIG.adFreeEntitlementId];
      if (!hasEntitlement) {
        return {
          success: false,
          error:
            'Ödeme alındı ancak reklamsız ayrıcalık henüz etkinleşmedi. Lütfen birkaç dakika sonra "Satın Alımları Geri Yükle" seçeneğini deneyin; sorun devam ederse destek ile iletişime geçin.',
        };
      }
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

  const clearLocalAdFreeCache = () => {
    if (!currentUser) return;
    setSubscriptionAdFreeUntil(null);
    AsyncStorage.removeItem(SUBSCRIPTION_AD_FREE_KEY_PREFIX + currentUser.id).catch(() => {});
  };

  return (
    <PurchasesContext.Provider
      value={{ monthlyOffering, isLoading, subscriptionAdFreeUntil, purchaseMonthly, restorePurchases, clearLocalAdFreeCache }}
    >
      {children}
    </PurchasesContext.Provider>
  );
};

export const usePurchases = () => useContext(PurchasesContext);
