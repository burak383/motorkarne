import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────
// ÖNEMLİ: Aşağıdaki kimlikler şu an Google'ın RESMİ TEST reklam kimlikleri.
// Bunlar gerçek reklam göstermez, sadece "Test Ad" yazan örnek reklamlar
// gösterir — geliştirme/test aşamasında GÜVENLE kullanılabilir.
//
// Mağazaya göndermeden önce, kendi AdMob hesabından aldığın GERÇEK
// kimliklerle değiştirmen gerekiyor. Gerçek kimlik yerine test kimliğiyle
// yayınlarsan hiç reklam geliri elde edemezsin (ama uygulama çökmez).
//
// Nasıl alınacağı için proje sohbet geçmişindeki talimatlara bak.
// ─────────────────────────────────────────────────────────────────────────

const isProduction = !__DEV__;

// AdMob Uygulama Kimliği (App ID) — app.json'daki plugin yapılandırmasında da kullanılıyor.
export const ADMOB_APP_ID = Platform.select({
  android: 'ca-app-pub-9017194698663463~4519512665', // Gerçek MotorKarne Android App ID
  ios: 'ca-app-pub-3940256099942544~1458002511', // Google test App ID (iOS) — henüz gerçek iOS App ID yok
  default: '',
});

// Her reklam birimi (ad unit) için ayrı bir kimlik gerekiyor.
const TEST_IDS = {
  banner: Platform.select({
    android: 'ca-app-pub-3940256099942544/6300978111',
    ios: 'ca-app-pub-3940256099942544/2934735716',
    default: '',
  })!,
  interstitial: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: '',
  })!,
  rewarded: Platform.select({
    android: 'ca-app-pub-3940256099942544/5224354917',
    ios: 'ca-app-pub-3940256099942544/1712485313',
    default: '',
  })!,
};

// Gerçek AdMob hesabından alınan reklam birimi kimliklerini buraya yapıştır.
// REPLACE_ME olarak kaldığı sürece, uygulama otomatik olarak test kimliklerini kullanır.
const REAL_IDS = {
  banner: Platform.select({ android: 'ca-app-pub-9017194698663463/7738120259', ios: 'REPLACE_ME_IOS_BANNER', default: '' })!,
  interstitial: Platform.select({ android: 'ca-app-pub-9017194698663463/9496507173', ios: 'REPLACE_ME_IOS_INTERSTITIAL', default: '' })!,
  rewarded: Platform.select({ android: 'ca-app-pub-9017194698663463/3991426879', ios: 'REPLACE_ME_IOS_REWARDED', default: '' })!,
};

function resolve(key: keyof typeof TEST_IDS): string {
  const real = REAL_IDS[key];
  const usingReal = isProduction && !real.startsWith('REPLACE_ME');
  return usingReal ? real : TEST_IDS[key];
}

export const AD_UNIT_IDS = {
  banner: resolve('banner'),
  interstitial: resolve('interstitial'),
  rewarded: resolve('rewarded'),
};

// Ayarlar
export const AD_CONFIG = {
  // Geçiş reklamının kaç ekran değişiminde bir gösterileceği (her seferinde göstermek
  // çok rahatsız edici olur — bu sayı, kullanıcı deneyimini dengelemek için var).
  interstitialFrequency: 4,
  // Ödüllü reklam izlendiğinde kaç gün reklamsız kullanım verileceği (aylık).
  rewardedAdFreeDurationDays: 30,
};
