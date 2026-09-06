import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShieldCheck, Crown } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, rgba } from '../theme/theme';
import { useAds } from '../state/AdsContext';
import { usePurchases } from '../state/PurchasesContext';
import { isRevenueCatConfigured } from '../config/purchases';

type Nav = NativeStackNavigationProp<any>;

// Ana ekranda gösterilen reklamsız deneyim kartı. Aylık abonelik ile sürekli
// reklamsız olma seçeneğini sunar. Zaten aboneyse, kalan süreyi gösteren bir
// rozete dönüşür. (NOT: "Reklam izle, 30 gün reklamsız kullan" seçeneği
// kaldırıldı — reklamsız kullanım artık yalnızca abonelik ile sağlanıyor.)
export default function RewardedAdPrompt() {
  const { themeColors: colors } = useTheme();
  const s = getStyles(colors);
  const nav = useNavigation<Nav>();
  const { isAdFree, adFreeRemainingLabel } = useAds();
  const { monthlyOffering, isLoading, purchaseMonthly } = usePurchases();

  if (isAdFree) {
    return (
      <View style={[s.card, { borderColor: colors.success ?? '#22c55e' }]}>
        <ShieldCheck size={18} color={colors.success ?? '#22c55e'} />
        <Text style={s.adFreeText}>Reklamsız Abonelik aktif — {adFreeRemainingLabel} kaldı</Text>
      </View>
    );
  }

  const handleSubscribe = async () => {
    if (!isRevenueCatConfigured()) {
      Alert.alert('MotorKarne', 'Abonelik sistemi henüz yapılandırılmadı.');
      return;
    }
    const result = await purchaseMonthly();
    if (result.requiresLogin) {
      Alert.alert(
        'MotorKarne',
        result.error ?? 'Abonelik satın almak için önce giriş yapmalısınız.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => nav.navigate('GirisYap') },
        ]
      );
    } else if (!result.success && result.error) {
      Alert.alert('MotorKarne', result.error);
    } else if (result.success) {
      Alert.alert('MotorKarne', 'Aboneliğiniz aktif! Artık reklamsız kullanabilirsiniz.');
    }
  };

  // Fiyatı mümkünse mağazadan (RevenueCat) gelen yerelleştirilmiş metinle göster,
  // yoksa varsayılan olarak sabit fiyatı göster (mağaza fiyatı her zaman esas alınır).
  const priceLabel =
    monthlyOffering?.availablePackages?.[0]?.product?.priceString ?? '69,90 TL / ay';

  return (
    <View style={{ gap: 8 }}>
      <TouchableOpacity style={[s.card, s.premiumCard]} onPress={handleSubscribe} activeOpacity={0.8} disabled={isLoading}>
        <Crown size={18} color="#F5B400" />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <Text style={s.text}>Sürekli reklamsız ol — {priceLabel}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 20,
      marginTop: 8,
      padding: 12,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: rgba(colors.primary, 0.06),
    },
    premiumCard: {
      backgroundColor: rgba('#F5B400', 0.08),
      borderColor: rgba('#F5B400', 0.4),
    },
    text: { flex: 1, fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground },
    adFreeText: { flex: 1, fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground },
  });
