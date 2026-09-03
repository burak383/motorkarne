import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Compass, ImageIcon, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<any>;

const APP_VERSION = '1.0.0';

export default function HakkindaScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Hakkında</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.logoBox}>
            <Compass size={28} color={colors.primaryForeground} />
          </View>
          <Text style={s.appName}>MotorKarne</Text>
          <Text style={s.appVersion}>Sürüm {APP_VERSION}</Text>
          <Text style={s.appDesc}>
            Türkiye pazarındaki motorları ve araçları keşfetmenize, karşılaştırmanıza ve güvenilirlik
            verilerine göre bilinçli kararlar almanıza yardımcı olan akıllı bir araç araştırma uygulaması.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <TouchableOpacity style={s.linkRow} onPress={() => nav.navigate('GizlilikPolitikasi')}>
            <ShieldCheck size={18} color={colors.primary} />
            <Text style={s.linkText}>Gizlilik Politikası</Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={s.linkRow} onPress={() => nav.navigate('GorselKaynaklari')}>
            <ImageIcon size={18} color={colors.primary} />
            <Text style={s.linkText}>Görsel Kaynakları</Text>
            <ChevronRight size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>MotorKarne © 2024–2026. Tüm hakları saklıdır.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerTitle: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    introBox: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 24 },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    appName: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground },
    appVersion: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    appDesc: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 19,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    linkText: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
    footer: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 24,
    },
  });
