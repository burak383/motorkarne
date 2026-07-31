// GEÇİCİ DOSYA — `npm install` çalıştırdıktan sonra bu dosyayı silebilirsiniz.
// react-native-view-shot ve expo-sharing paketleri gerçek tip tanımlarını
// kendileri getirir; bu dosya sadece paketler kurulu olmadan
// geliştirme/derleme yapılabilmesi için minimal bir yer tutucudur.
declare module 'react-native-view-shot' {
  import type { RefObject } from 'react';
  export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri';
  }
  export function captureRef<T = unknown>(
    view: RefObject<T> | T,
    options?: CaptureOptions
  ): Promise<string>;
  const ViewShot: any;
  export default ViewShot;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(
    url: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string }
  ): Promise<void>;
}
