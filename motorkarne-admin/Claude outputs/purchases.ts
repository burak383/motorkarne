import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// RevenueCat, uygulama içi satın alma (abonelik) altyapısını yönetiyor.
// Aşağıdaki değerleri kendi RevenueCat hesabından almanız gerekiyor —
// nasıl alınacağı için proje sohbet geçmişindeki adım adım talimatlara bak.
// ─────────────────────────────────────────────────────────────────────────

export const REVENUECAT_CONFIG = {
  // RevenueCat Dashboard → Project Settings → API Keys içinden alınan,
  // platforma özel genel (public) API anahtarı.
  androidApiKey: 'goog_HEDQLVGmbfkdnkwVbVJmDZMqVXx',
  iosApiKey: 'appl_LbSGMpRjiVlUvZemojbPNaeyxEW',

  // RevenueCat'te tanımladığın "Entitlement" kimliği — kullanıcının
  // "reklamsız" ayrıcalığına sahip olup olmadığını bu kimlikle kontrol ediyoruz.
  // ÖNEMLİ: Bu değer, RevenueCat Dashboard → Entitlements sayfasındaki
  // "Identifier" sütunuyla BİREBİR aynı olmalı. Önceden burada 'reklamsiz'
  // yazıyordu ama dashboard'daki gerçek kimlik "MotorKarne Pro" imiş — bu
  // uyuşmazlık yüzünden satın alma/reklam izleme başarılı olsa bile
  // customerInfo.entitlements.active['reklamsiz'] hiçbir zaman bulunamıyor,
  // reklamsız durum hiç aktifleşmiyordu (abonelik alınsa da reklamlar
  // gösterilmeye devam ediyordu).
  adFreeEntitlementId: 'MotorKarne Pro',

  // Google Play Console'da oluşturduğun aylık abonelik ürününün kimliği
  // (RevenueCat'e de aynı kimlikle bağlanmış olmalı).
  monthlyProductId: 'motorkarne_reklamsiz_aylik',
};

// ÖNEMLİ: Sadece MEVCUT platformun anahtarı kontrol edilir. Önceden burada
// `||` kullanılıyordu — Android anahtarı gerçek olduğu için bu, iOS anahtarı
// hâlâ "REPLACE_ME_..." yer tutucusuyken bile iOS'ta true dönüyordu ve
// PurchasesContext bu yer tutucu string'i doğrudan native RevenueCat SDK'sına
// (Purchases.configure) geçiriyordu.
export function isRevenueCatConfigured(platform: 'ios' | 'android' = Platform.OS as 'ios' | 'android'): boolean {
  const key = platform === 'ios' ? REVENUECAT_CONFIG.iosApiKey : REVENUECAT_CONFIG.androidApiKey;
  return !key.startsWith('REPLACE_ME');
}
