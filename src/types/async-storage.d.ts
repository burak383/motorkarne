// GEÇİCİ DOSYA — `npm install` çalıştırdıktan sonra bu dosyayı silebilirsiniz.
// @react-native-async-storage/async-storage paketi gerçek tip tanımlarını
// kendisi getirir; bu dosya sadece paket kurulu olmadan geliştirme/derleme
// yapılabilmesi için minimal bir yer tutucudur.
declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<readonly string[]>;
    multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]>;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}
