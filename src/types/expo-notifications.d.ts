// GEÇİCİ DOSYA — `npm install` çalıştırdıktan sonra bu dosyayı silebilirsiniz.
// expo-notifications paketi gerçek tip tanımlarını kendisi getirir; bu dosya
// sadece paket kurulu olmadan geliştirme/derleme yapılabilmesi için minimal
// bir yer tutucudur.
declare module 'expo-notifications' {
  export interface NotificationRequestInput {
    content: {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
      sound?: boolean | string;
    };
    trigger: { seconds: number } | null;
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    granted: boolean;
  }

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(): Promise<PermissionResponse>;
  export function scheduleNotificationAsync(request: NotificationRequestInput): Promise<string>;
  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }): void;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: { name: string; importance?: number; vibrationPattern?: number[]; lightColor?: string }
  ): Promise<void>;
  export const AndroidImportance: { DEFAULT: number; HIGH: number; MAX: number };
}
