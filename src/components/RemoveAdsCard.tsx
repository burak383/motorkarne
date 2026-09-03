import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ShieldCheck, ShieldOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, rgba } from '../theme/theme';
import { useMembers } from '../state/MembersContext';
import { usePurchase } from '../state/PurchaseContext';
import { REMOVE_ADS_DISPLAY_PRICE } from '../config/iap';

// Profil ekranında, giriş yapmış kullanıcıya gösterilen "Reklamları Kaldır"
// satın alma kartı. Kullanıcı zaten satın aldıysa, bunun yerine bir onay
// rozeti ve "Satın Alımları Geri Yükle" bağlantısı gösterilir.
export default function RemoveAdsCard() {
  const { themeColors: colors } = useTheme();
  const s = getStyles(colors);
  const { currentUser } = useMembers();
  const { isReady, isPurchasing, purchaseRemoveAds, restorePurchases } = usePurchase();

  if (!currentUser) return null;

  if (currentUser.hasRemovedAds) {
    return (
      <View style={[s.card, { borderColor: colors.success ?? '#22c55e' }]}>
        <ShieldCheck size={20} color={colors.success ?? '#22c55e'} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Reklamlar Kaldırıldı</Text>
          <Text style={s.sub}>Kalıcı olarak reklamsız kullanıyorsunuz. Teşekkürler!</Text>
        </View>
      </View>
    );
  }

  const handlePurchase = async () => {
    const result = await purchaseRemoveAds();
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Satın alma başlatılamadı.');
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    Alert.alert('MotorKarne', result.success ? 'Satın alımınız geri yüklendi.' : (result.error ?? 'Geri yüklenecek bir satın alım bulunamadı.'));
  };

  return (
    <View style={s.card}>
      <ShieldOff size={20} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Reklamları Kaldır</Text>
        <Text style={s.sub}>Tek seferlik ödeme, tüm reklamları kalıcı olarak kaldırır.</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity style={s.buyBtn} onPress={handlePurchase} disabled={!isReady || isPurchasing}>
            {isPurchasing ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={s.buyBtnText}>{REMOVE_ADS_DISPLAY_PRICE} — Satın Al</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={s.restoreText}>Geri Yükle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 14,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: rgba(colors.primary, 0.06),
    },
    title: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground },
    sub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, lineHeight: 16 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
    buyBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius,
      minWidth: 130,
      alignItems: 'center',
    },
    buyBtnText: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    restoreText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground, textDecorationLine: 'underline' },
  });
