// Jest ortamı native modüllere erişemediği için (gerçek cihaz/simülatör değil),
// @react-native-async-storage/async-storage paketinin kendi resmi Jest mock'unu
// devreye sokuyoruz. Bu olmadan, AsyncStorage'ı doğrudan ya da dolaylı olarak
// (Context'ler üzerinden) import eden her test dosyası "NativeModule: AsyncStorage
// is null" hatasıyla çöküyor.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-secure-store native modülü Jest ortamında (gerçek cihaz/simülatör olmadığı
// için) kullanılamaz. MembersContext oturum token'ını burada sakladığından basit,
// bellek-içi bir sahte (mock) sürüm tanımlıyoruz — testler gerçek Keychain/Keystore'a
// dokunmadan token okuma/yazma/silme akışını test edebilsin diye.
jest.mock('expo-secure-store', () => {
  let store = {};
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] ?? null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    // Test dosyalarının, testler arasında sızıntı olmaması için oturumları
    // sıfırlayabilmesi için (gerçek expo-secure-store'da böyle bir metot yok).
    __reset: () => {
      store = {};
    },
  };
});

// MembersContext, demo admin hesabının şifresini artık koda sabit yazmak yerine
// EXPO_PUBLIC_ADMIN_PASSWORD ortam değişkeninden okuyor (bkz. src/state/MembersContext.tsx
// içindeki güvenlik notu). Gerçek build'lerde bu değer .env / EAS secret'tan gelir; testlerde
// admin girişini kapsayan senaryoların çalışabilmesi için burada sabit bir test şifresi
// tanımlıyoruz — bu, gerçek uygulamada kullanılan bir şifre DEĞİLDİR.
process.env.EXPO_PUBLIC_ADMIN_PASSWORD = 'admin123';
