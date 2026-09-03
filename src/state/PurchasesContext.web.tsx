import React, { createContext, useContext } from 'react';

// Web'de RevenueCat/Play Billing native SDK'sı çalışmıyor — aynı ".web.tsx"
// mantığıyla zararsız bir sahte sürüm.
interface PurchasesContextType {
  monthlyOffering: any | null;
  isLoading: boolean;
  purchaseMonthly: () => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string }>;
}

const PurchasesContext = createContext<PurchasesContextType>({
  monthlyOffering: null,
  isLoading: false,
  purchaseMonthly: async () => ({ success: false, error: 'Abonelik satın alma web\'de desteklenmiyor, lütfen mobil uygulamayı kullanın.' }),
  restorePurchases: async () => ({ success: false, error: 'Bu özellik web\'de desteklenmiyor.' }),
});

export const PurchasesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <PurchasesContext.Provider value={{
    monthlyOffering: null,
    isLoading: false,
    purchaseMonthly: async () => ({ success: false, error: 'Abonelik satın alma web\'de desteklenmiyor, lütfen mobil uygulamayı kullanın.' }),
    restorePurchases: async () => ({ success: false, error: 'Bu özellik web\'de desteklenmiyor.' }),
  }}>{children}</PurchasesContext.Provider>;
};

export const usePurchases = () => useContext(PurchasesContext);