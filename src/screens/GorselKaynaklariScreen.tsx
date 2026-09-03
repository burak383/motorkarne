import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ExternalLink, ImageIcon } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<any>;

const CREDITS: { category: string; note: string }[] = [
  {
    category: 'Marka logoları',
    note: 'Peugeot, Citroën, Fiat, Volkswagen, Škoda, Renault, Dacia, Toyota, Honda, Hyundai, Kia, Ford, BMW, Mercedes-Benz, Chery, TOGG, BYD, Opel, Nissan, Audi, Mazda, MG, Suzuki, Volvo, Tesla, Alfa Romeo, Seat, Mini, DS, Lexus, Land Rover, Jeep ve Cupra logoları Wikimedia Commons üzerinden alınmıştır.',
  },
  {
    category: 'Motor bölmesi fotoğrafı',
    note: '"Opel Corsa-e engine bay seen from front" — Wikimedia Commons, CC BY-SA 4.0 lisansı ile paylaşılmıştır.',
  },
  {
    category: 'Şanzıman fotoğrafı',
    note: '"TREMEC TR-6070 7-speed manual transmission" — Wikimedia Commons.',
  },
];

export default function GorselKaynaklariScreen() {
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
          <Text style={s.headerTitle}>Görsel Kaynakları</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.introIconBox}>
            <ImageIcon size={24} color={colors.primary} />
          </View>
          <Text style={s.introText}>
            Bu uygulamadaki marka logoları ve teknik fotoğraflar, Wikimedia Commons'ın ücretsiz/özgür
            lisanslı medya deposundan alınmıştır. Bazı görseller Creative Commons (CC BY / CC BY-SA)
            lisansı ile paylaşılmıştır ve bu lisanslar kaynağın belirtilmesini gerektirir.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {CREDITS.map((c) => (
            <View key={c.category} style={s.card}>
              <Text style={s.cardTitle}>{c.category}</Text>
              <Text style={s.cardNote}>{c.note}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.linkRow}
          onPress={() => Linking.openURL('https://commons.wikimedia.org')}
        >
          <ExternalLink size={16} color={colors.primary} />
          <Text style={s.linkText}>commons.wikimedia.org</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Marka isimleri ve logoları ilgili şirketlere ait tescilli markalardır; burada yalnızca
          tanımlama amacıyla, bilgilendirici bir katalog uygulaması kapsamında kullanılmaktadır.
        </Text>
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
    introBox: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      alignItems: 'center',
    },
    introIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    introText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
    card: {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    cardTitle: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.foreground, marginBottom: 4 },
    cardNote: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 20,
    },
    linkText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.primary },
    disclaimer: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 16,
      marginHorizontal: 32,
      lineHeight: 16,
    },
  });
