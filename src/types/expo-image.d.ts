// GEÇİCİ DOSYA — `npm install` çalıştırdıktan sonra bu dosyayı silebilirsiniz.
// expo-image paketi gerçek tip tanımlarını kendisi getirir; bu dosya sadece
// paket kurulu olmadan geliştirme/derleme yapılabilmesi için minimal bir yer
// tutucudur.
declare module 'expo-image' {
  import type { ComponentType } from 'react';
  import type { StyleProp, ImageStyle } from 'react-native';

  export interface ImageSource {
    uri?: string;
    headers?: Record<string, string>;
  }

  export interface ImageProps {
    source?: ImageSource | string | number | null;
    style?: StyleProp<ImageStyle>;
    contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    transition?: number | { duration?: number };
    onError?: (event: any) => void;
    onLoad?: (event: any) => void;
    placeholder?: any;
    cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  }

  export const Image: ComponentType<ImageProps>;
}
