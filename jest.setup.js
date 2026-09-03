// Jest ortamı native modüllere erişemediği için (gerçek cihaz/simülatör değil),
// @react-native-async-storage/async-storage paketinin kendi resmi Jest mock'unu
// devreye sokuyoruz. Bu olmadan, AsyncStorage'ı doğrudan ya da dolaylı olarak
// (Context'ler üzerinden) import eden her test dosyası "NativeModule: AsyncStorage
// is null" hatasıyla çöküyor.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// MembersContext, demo admin hesabının şifresini artık koda sabit yazmak yerine
// EXPO_PUBLIC_ADMIN_PASSWORD ortam değişkeninden okuyor (bkz. src/state/MembersContext.tsx
// içindeki güvenlik notu). Gerçek build'lerde bu değer .env / EAS secret'tan gelir; testlerde
// admin girişini kapsayan senaryoların çalışabilmesi için burada sabit bir test şifresi
// tanımlıyoruz — bu, gerçek uygulamada kullanılan bir şifre DEĞİLDİR.
process.env.EXPO_PUBLIC_ADMIN_PASSWORD = 'admin123';
