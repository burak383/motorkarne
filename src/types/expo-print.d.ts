// GEÇİCİ DOSYA — `npm install` çalıştırdıktan sonra bu dosyayı silebilirsiniz.
// expo-print paketi gerçek tip tanımlarını kendisi getirir; bu dosya sadece
// paket kurulu olmadan geliştirme/derleme yapılabilmesi için minimal bir yer
// tutucudur.
declare module 'expo-print' {
  export interface PrintToFileOptions {
    html: string;
    base64?: boolean;
  }
  export interface PrintToFileResult {
    uri: string;
    numberOfPages?: number;
  }
  export function printToFileAsync(options: PrintToFileOptions): Promise<PrintToFileResult>;
}
