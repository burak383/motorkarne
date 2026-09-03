import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  type Product,
  type Purchase,
} from 'react-native-iap';
import { REMOVE_ADS_PRODUCT_ID } from '../config/iap';
import { useMembers } from './MembersContext';

interface PurchaseResult {
  success: boolean;
  error?: string;
}

interface PurchaseContextType {
  isReady: boolean;
  product: Product | null;
  isPurchasing: boolean;
  purchaseRemoveAds: () => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
}

const PurchaseContext = createContext<PurchaseContextType>({
  isReady: false,
  product: null,
  isPurchasing: false,
  purchaseRemoveAds: async () => ({ success: false, error: 'PurchaseProvider bulunamadı' }),
  restorePurchases: async () => ({ success: false, error: 'PurchaseProvider bulunamadı' }),
});

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAdsRemoved, currentUser } = useMembers();
  const [isReady, setIsReady] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const purchaseUpdateSub = useRef<{ remove: () => void } | null>(null);
  const purchaseErrorSub = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initConnection();
        const products = await getProducts({ skus: [REMOVE_ADS_PRODUCT_ID] });
        if (mounted && products.length > 0) setProduct(products[0]);
        if (mounted) setIsReady(true);
      } catch (e) {
        // Mağaza bağlantısı kurulamadı (örn. Expo Go'da test ediliyor, ya da
        // ürün Play Console'da henüz oluşturulmadı) — sessizce devam ediyoruz,
        // satın alma butonu "hazır değil" durumunda kalır.
        if (mounted) setIsReady(false);
      }
    })();

    // Satın alma tamamlandığında (onaylandığında) tetiklenir.
    purchaseUpdateSub.current = purchaseUpdatedListener(async (purchase: Purchase) => {
      if (purchase.productId === REMOVE_ADS_PRODUCT_ID) {
        setAdsRemoved(true);
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (e) {
          // İşlemi bitirme hatası kritik değil, kullanıcı zaten reklamsız durumu kazandı.
        }
      }
      setIsPurchasing(false);
    });

    purchaseErrorSub.current = purchaseErrorListener(() => {
      setIsPurchasing(false);
    });

    return () => {
      mounted = false;
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
      endConnection();
    };
  }, []);

  const purchaseRemoveAds = async (): Promise<PurchaseResult> => {
    if (!currentUser) {
      return { success: false, error: 'Satın alım yapabilmek için önce giriş yapmalısınız.' };
    }
    if (!isReady || !product) {
      return { success: false, error: 'Mağaza şu an hazır değil, birkaç saniye sonra tekrar dene.' };
    }
    setIsPurchasing(true);
    try {
      await requestPurchase(
        Platform.OS === 'ios' ? { sku: REMOVE_ADS_PRODUCT_ID } : { skus: [REMOVE_ADS_PRODUCT_ID] }
      );
      // Sonuç purchaseUpdatedListener üzerinden asenkron olarak gelecek.
      return { success: true };
    } catch (e: any) {
      setIsPurchasing(false);
      if (e?.code === 'E_USER_CANCELLED') {
        return { success: false, error: 'İşlem iptal edildi.' };
      }
      return { success: false, error: 'Satın alma sırasında bir sorun oluştu.' };
    }
  };

  // Kullanıcı uygulamayı yeniden kurduğunda ya da başka bir cihazda giriş
  // yaptığında, Google Play'in hesabında kayıtlı olan satın alımı bulup
  // reklamsız durumunu geri yükler.
  const restorePurchases = async (): Promise<PurchaseResult> => {
    if (!currentUser) {
      return { success: false, error: 'Önce giriş yapmalısınız.' };
    }
    try {
      const purchases = await getAvailablePurchases();
      const found = purchases.some((p) => p.productId === REMOVE_ADS_PRODUCT_ID);
      if (found) {
        setAdsRemoved(true);
        return { success: true };
      }
      return { success: false, error: 'Bu hesapla ilişkili bir satın alım bulunamadı.' };
    } catch (e) {
      return { success: false, error: 'Satın alımlar geri yüklenirken bir sorun oluştu.' };
    }
  };

  return (
    <PurchaseContext.Provider value={{ isReady, product, isPurchasing, purchaseRemoveAds, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => useContext(PurchaseContext);
