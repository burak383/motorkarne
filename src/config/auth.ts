// Google ile giriş için gerekli istemci kimlikleri.
// Aşağıdaki değerleri kendi Google Cloud hesabından aldığın gerçek kimliklerle
// değiştirmen gerekiyor. Adım adım nasıl alınacağı için proje sohbet
// geçmişindeki talimatlara bak.
// NOT: Facebook ile giriş kaldırıldı — yalnızca Google destekleniyor.

export const GOOGLE_AUTH_CONFIG = {
  // Google Cloud Console -> APIs & Services -> Credentials içinden alınan
  // "OAuth 2.0 Client IDs" değerleri.
  webClientId: '842233451260-knkca96ickmiafnpr6cb2jq5s335chq6.apps.googleusercontent.com',
  iosClientId: '842233451260-do785s23pk79h67ev7d3r2o704oopt25.apps.googleusercontent.com',
  androidClientId: '842233451260-svsj738qq9mumi8dtvg3c0eg1ba28vlg.apps.googleusercontent.com',
};

export function isGoogleAuthConfigured(): boolean {
  return !GOOGLE_AUTH_CONFIG.webClientId.startsWith('REPLACE_ME');
}
