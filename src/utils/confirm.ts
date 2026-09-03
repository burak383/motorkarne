import { Alert, Platform } from 'react-native';

// React Native'in Alert.alert() fonksiyonu, çoklu buton (İptal/Onayla) verildiğinde
// react-native-web'de güvenilir çalışmıyor — tıklama bazen doğru butonun onPress'ini
// tetiklemiyor (özellikle "destructive" stildeki onay butonları). Bu yardımcı fonksiyon,
// web'de tarayıcının kendi window.confirm() penceresini kullanıyor, native'de (Android/iOS)
// ise olağan Alert.alert akışına devam ediyor.
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  options?: { confirmText?: string; cancelText?: string }
) {
  if (Platform.OS === 'web') {
    // window.confirm tek bir OK/Cancel sunuyor; title + message'ı birleştirip gösteriyoruz.
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: options?.cancelText ?? 'İptal', style: 'cancel' },
    { text: options?.confirmText ?? 'Onayla', style: 'destructive', onPress: onConfirm },
  ]);
}

// Tek butonlu ("Tamam" deyip devam et) bildirimler için — bu da array söz dizimi
// kullandığından aynı web güvenilirlik sorununu taşıyor.
export function notifyThenProceed(title: string, message: string, onProceed: () => void, okText = 'Tamam') {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onProceed();
    return;
  }

  Alert.alert(title, message, [{ text: okText, onPress: onProceed }]);
}
