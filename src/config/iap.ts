import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// Bu ürün kimliğinin (Product ID), Google Play Console'da BİREBİR AYNI
// şekilde bir "Yönetilen ürün" (Managed Product / In-app product) olarak
// oluşturulması gerekiyor — fiyatı da (69,90 TL) orada belirliyorsun.
// Play Console → Uygulaman → Monetize → Products → In-app products
// Nasıl oluşturulacağı için proje sohbet geçmişindeki talimatlara bak.
// ─────────────────────────────────────────────────────────────────────────

export const REMOVE_ADS_PRODUCT_ID = Platform.select({
  android: 'remove_ads_lifetime',
  ios: 'remove_ads_lifetime',
  default: 'remove_ads_lifetime',
})!;

export const REMOVE_ADS_DISPLAY_PRICE = '69,90 TL';
