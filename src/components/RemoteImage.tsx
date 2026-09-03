import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface RemoteImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  iconSize?: number;
}

// Uzak bir görsel yüklenemediğinde (bozuk/yanlış URL, ağ sorunu, vb.) kırık
// bir resim ikonu yerine sessizce nötr bir yer tutucu gösterir.
// expo-image kullanılıyor: React Native'in temel <Image>'ından farklı olarak
// yönlendirmeleri (redirect) ve HTTP başlıklarını çok daha güvenilir şekilde
// yönetiyor — Wikimedia Commons'un "Special:FilePath" yönlendirme linkleri
// gibi durumlarda gerçek cihazlarda daha tutarlı çalışıyor.
export default function RemoteImage({ uri, style, resizeMode = 'cover', iconSize = 20 }: RemoteImageProps) {
  const { themeColors: colors } = useTheme();
  const [failed, setFailed] = useState(false);

  if (failed || !uri) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.fallback, { backgroundColor: colors.secondary }]}>
        <ImageOff size={iconSize} color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri, headers: { 'User-Agent': 'MotorKarneApp/1.0 (contact: seolen8@gmail.com)' } }}
      style={style}
      contentFit={resizeMode === 'cover' ? 'cover' : resizeMode === 'contain' ? 'contain' : resizeMode === 'stretch' ? 'fill' : resizeMode === 'repeat' ? 'cover' : 'contain'}
      onError={() => setFailed(true)}
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
