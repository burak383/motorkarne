import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, SlidersHorizontal, ChevronRight, Settings2, List, ArrowUp } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getBrandLogo } from '../data/images';
import RemoteImage from '../components/RemoteImage';
import { useCatalog } from '../state/CatalogContext';

type Nav = NativeStackNavigationProp<any>;

const segments = ['Tümü', 'Sedan', 'SUV', 'Elektrikli', 'Hibrit', 'Ticari'];

type ColorKey = 'success' | 'primary' | 'chart3';

const popularBrands: { name: string; motors: string; tag: string; tagColor: ColorKey; icon: string }[] = [
  {
    name: 'Volkswagen', motors: '1.5 TSI, 1.6 TDI, 2.0 TDI', tag: '24 motor', tagColor: 'success',
    icon: 'EA288 EVO · DSG',
  },
  {
    name: 'Toyota', motors: 'Corolla, Yaris, C-HR', tag: '9 motor', tagColor: 'success',
    icon: '1.8 Hybrid · e-CVT',
  },
  {
    name: 'Renault', motors: 'Clio, Megane, Austral', tag: '14 motor', tagColor: 'primary',
    icon: '1.5 dCi · EDC',
  },
  {
    name: 'Peugeot', motors: '208, 308, 3008', tag: '11 motor', tagColor: 'chart3',
    icon: '1.2 PureTech · EAT8',
  },
];

const alphaBrands: { name: string; motors: string; score: number; status: string; color: ColorKey }[] = [
  { name: 'BMW', motors: 'B48 · B47 · N13 · Prince', score: 7.2, status: 'kontrollü', color: 'chart3' },
  { name: 'Mercedes-Benz', motors: 'M282 · OM654 · M274', score: 8.4, status: 'yüksek konfor', color: 'success' },
  { name: 'Fiat', motors: 'Egea · Doblo · 1.3 Multijet', score: 8.7, status: 'düşük risk', color: 'success' },
  { name: 'Ford', motors: 'Focus · Puma · 1.0 EcoBoost', score: 6.9, status: 'izlenmeli', color: 'chart3' },
  { name: 'Hyundai', motors: 'i20 · Bayon · 1.0 T-GDI', score: 8.1, status: 'düşük risk', color: 'success' },
  { name: 'Škoda', motors: 'Octavia · Kamiq · 1.0 TSI', score: 7.9, status: 'kontrollü', color: 'chart3' },
];

export default function MarkalarKatalogScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { motors } = useCatalog();
  const brandCount = useMemo(
    () => new Set(motors.flatMap((m) => m.brands)).size,
    [motors]
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(0);

  const handleSegmentPress = (i: number) => {
    setActiveSegmentIdx(i);
    if (i === 0) return;
    nav.navigate('AramaSonuclari', { query: segments[i] });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y > 200) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={s.bg}
          contentContainerStyle={{ paddingBottom: 128 }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.eyebrow}>{t.katalogEyebrow}</Text>
                <Text style={s.title}>{t.katalogTitle}</Text>
                <Text style={s.subtitle}>{t.katalogSubtitle}</Text>
              </View>
              <TouchableOpacity style={s.iconBtn} onPress={() => nav.navigate('AramaSonuclari')}>
                <SlidersHorizontal size={20} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.searchRow} onPress={() => nav.navigate('AramaSonuclari')}>
              <Search size={20} color={colors.mutedForeground} />
              <Text style={s.searchPlaceholder}>{t.katalogSearchPh}</Text>
              <View style={s.shortcut}><Text style={s.shortcutText}>⌘ K</Text></View>
            </TouchableOpacity>
          </View>

          {/* Segment bar */}
          <View style={s.segmentBar}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.segmentLabel}>{t.katalogSectionLabel}</Text>
                <Text style={s.segmentTitle}>{t.katalogSectionTitle}</Text>
              </View>
              <Text style={s.segmentMeta}>{brandCount} marka • {motors.length} Motor</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 12 }}>
              {segments.map((seg, i) => (
                <TouchableOpacity
                  key={seg}
                  style={[s.segChip, i === activeSegmentIdx && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => handleSegmentPress(i)}
                >
                  <Text style={[s.segChipText, i === activeSegmentIdx && { color: colors.primaryForeground }]}>
                    {seg}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Popular brands grid */}
          <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.popularTag}>{t.katalogPopularTag}</Text>
                <Text style={s.sectionTitleLg}>{t.katalogPopularTitle}</Text>
              </View>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => nav.navigate('AramaSonuclari')}>
                <Text style={s.seeAll}>Tümünü gör </Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={s.grid}>
              {popularBrands.map((b) => (
                <TouchableOpacity key={b.name} style={s.brandCard} onPress={() => nav.navigate('AramaSonuclari', { query: b.name })}>
                  <View style={[s.brandGlow, { backgroundColor: rgba(colors.primary, 0.1) }]} />
                  <View style={s.rowBetween}>
                    <View style={s.brandLogoBox}>
                      <RemoteImage uri={getBrandLogo(b.name)} style={s.brandLogo} resizeMode="contain" />
                    </View>
                    <View style={[s.motorCount, { backgroundColor: rgba(colors[b.tagColor], 0.15) }]}>
                      <Text style={[s.motorCountText, { color: colors[b.tagColor] }]}>{b.tag}</Text>
                    </View>
                  </View>
                  <Text style={s.brandName}>{b.name}</Text>
                  <Text style={s.brandMotors}>{b.motors}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <Settings2 size={14} color={colors.primary} />
                    <Text style={s.brandIconText}>{b.icon}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Alpha list */}
          <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.sectionTitleLg}>{t.katalogAlphaTitle}</Text>
                <Text style={s.sectionSub}>{t.katalogAlphaSub}</Text>
              </View>
              <TouchableOpacity style={s.viewBtn} onPress={() => nav.navigate('AramaSonuclari')}>
                <List size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <View style={s.alphaList}>
              {alphaBrands.map((b, i) => (
                <TouchableOpacity
                  key={b.name}
                  style={[s.alphaRow, i < alphaBrands.length - 1 && s.alphaRowBorder]}
                  onPress={() => nav.navigate('AramaSonuclari', { query: b.name })}
                >
                  <View style={s.alphaLogoBox}>
                    <RemoteImage uri={getBrandLogo(b.name)} style={s.alphaLogo} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.alphaName}>{b.name}</Text>
                    <Text style={s.alphaMotors} numberOfLines={1}>{b.motors}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.alphaScore, { color: colors[b.color] }]}>{b.score.toFixed(1)} / 10</Text>
                    <Text style={s.alphaStatus}>{b.status}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity
            style={[s.scrollTopBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
            onPress={scrollToTop}
            accessibilityRole="button"
            accessibilityLabel="Yukarı kaydır"
            activeOpacity={0.8}
          >
            <ArrowUp size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.primary, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 24, color: colors.foreground, marginTop: 4 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
  iconBtn: {
    width: 44, height: 44, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  searchRow: {
    height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16,
    borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, marginTop: 20,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: colors.mutedForeground },
  shortcut: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.secondary },
  shortcutText: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.secondaryForeground },
  segmentBar: {
    borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card, paddingVertical: 16, paddingHorizontal: 20,
  },
  segmentLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground, letterSpacing: 1, textTransform: 'uppercase' },
  segmentTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground, marginTop: 4 },
  segmentMeta: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  segChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary,
  },
  segChipText: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.secondaryForeground },
  popularTag: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, marginTop: 4 },
  sectionSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  seeAll: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  brandCard: {
    flex: 1, minWidth: '46%', minHeight: 182, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, padding: 16, position: 'relative', overflow: 'hidden',
  },
  brandGlow: { position: 'absolute', right: -32, top: -32, width: 112, height: 112, borderRadius: 56 },
  brandLogoBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 40, height: 40 },
  motorCount: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  motorCountText: { fontSize: 10, fontFamily: fonts.body.bold },
  brandName: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground, marginTop: 16 },
  brandMotors: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
  brandIconText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.cardForeground },
  viewBtn: {
    width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  alphaList: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', marginTop: 16 },
  alphaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  alphaRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  alphaLogoBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  alphaLogo: { width: 32, height: 32 },
  alphaName: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground },
  alphaMotors: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  alphaScore: { fontSize: 12, fontFamily: fonts.body.bold },
  alphaStatus: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  scrollTopBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 99,
  },
});