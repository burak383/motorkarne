import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/ads';
import { useAds } from '../state/AdsContext';

// 5 ana sekme ekranının (Keşfet, Katalog, Karşılaştır, Araç Bul, Kaydedilenler)
// altına eklenen sabit banner reklam. Kullanıcının aktif bir "Reklamsız
// Deneyim" aboneliği varsa (bkz. AdsContext), hiçbir şey render etmez.
export default function BannerAdSlot() {
  const { isAdFree, canRequestAds, requestNonPersonalizedAdsOnly } = useAds();

  // GDPR/UMP onay akışı henüz tamamlanmadıysa (bkz. AdsContext) hiçbir reklam isteği atma.
  if (isAdFree || !canRequestAds) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
