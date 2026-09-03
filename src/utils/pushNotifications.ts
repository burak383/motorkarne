import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Uygulama açıkken bile bildirimin gerçekten görünmesini sağlar
// (varsayılan davranışta ön planda bildirimler gösterilmeyebilir).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionRequested) return false;
    permissionRequested = true;
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch (e) {
    // İzin isteği başarısız olursa (örn. desteklenmeyen platform), sessizce yok say
    return false;
  }
}

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Genel Bildirimler',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
  }).catch(() => {
    // yok say
  });
}

// Gerçek bir OS bildirimi planlar. Uygulama kapalı/arka planda olsa bile
// (cihaz bildirimlere izin verdiği sürece) kullanıcıya ulaşır.
export async function sendPushNotification(title: string, body: string): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // hemen gönder
    });
  } catch (e) {
    // Bildirim gönderilemezse uygulama akışını bozmasın diye sessizce yok say
  }
}
