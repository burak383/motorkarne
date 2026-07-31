import React, { useState } from 'react';
import { Image, View, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
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
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
