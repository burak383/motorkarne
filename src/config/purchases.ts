// ─────────────────────────────────────────────────────────────────────────
// RevenueCat, uygulama içi satın alma (abonelik) altyapısını yönetiyor.
// Aşağıdaki değerleri kendi RevenueCat hesabından almanız gerekiyor —
// nasıl alınacağı için proje sohbet geçmişindeki adım adım talimatlara bak.
// ─────────────────────────────────────────────────────────────────────────

export const REVENUECAT_CONFIG = {
  // RevenueCat Dashboard → Project Settings → API Keys içinden alınan,
  // platforma özel genel (public) API anahtarı.
  androidApiKey: 'goog_HEDQLVGmbfkdnkwVbVJmDZMqVXx',
  iosApiKey: 'REPLACE_ME_REVENUECAT_IOS_KEY',

  // RevenueCat'te tanımladığın "Entitlement" kimliği — kullanıcının
  // "reklamsız" ayrıcalığına sahip olup olmadığını bu kimlikle kontrol ediyoruz.
  adFreeEntitlementId: 'reklamsiz',

  // Google Play Console'da oluşturduğun aylık abonelik ürününün kimliği
  // (RevenueCat'e de aynı kimlikle bağlanmış olmalı).
  monthlyProductId: 'motorkarne_reklamsiz_aylik',
};

export function isRevenueCatConfigured(): boolean {
  return (
    !REVENUECAT_CONFIG.androidApiKey.startsWith('REPLACE_ME') ||
    !REVENUECAT_CONFIG.iosApiKey.startsWith('REPLACE_ME')
  );
}
