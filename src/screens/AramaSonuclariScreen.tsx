import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft, Search, X, ArrowDownUp, ChevronDown, SlidersHorizontal,
  Settings2, Fuel, BadgeCheck, AlertTriangle, AlertCircle, CheckCircle, ArrowUp,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { searchVehicles } from '../data/catalog';
import { useCatalog } from '../state/CatalogContext';
import { getRiskInfo } from '../utils/risk';

type Nav = NativeStackNavigationProp<any>;

const filterTabs = ['Tüm sonuçlar', 'Skor 8+', 'Otomatik', 'Dizel', 'Benzin'];

export default function AramaSonuclariScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
  
  const initialQuery = (route.params as any)?.query ?? '';
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);

  React.useEffect(() => {
    if ((route.params as any)?.query !== undefined) {
      setSearchQuery((route.params as any)?.query);
    }
  }, [(route.params as any)?.query]);

  const { searchMotors } = useCatalog();
  const [sortMode, setSortMode] = useState<'relevance' | 'score-desc' | 'score-asc'>('relevance');
  const [activeFilterIdx, setActiveFilterIdx] = useState(0);

  const sortLabels: Record<typeof sortMode, string> = {
    relevance: 'En alakalı',
    'score-desc': 'Skor: Yüksek',
    'score-asc': 'Skor: Düşük',
  };

  const cycleSort = () => {
    setSortMode((m) => (m === 'relevance' ? 'score-desc' : m === 'score-desc' ? 'score-asc' : 'relevance'));
  };

  const resetFilters = () => {
    setActiveFilterIdx(0);
    setSortMode('relevance');
  };

  const applyFilter = (list: ReturnType<typeof searchMotors>) => {
    switch (activeFilterIdx) {
      case 1:
        return list.filter((m) => m.score >= 8);
      case 2:
        return list.filter((m) => !m.transmission.toLowerCase().includes('manuel'));
      case 3:
        return list.filter((m) => m.fuel.toLowerCase().includes('dizel'));
      case 4:
        return list.filter((m) => m.fuel.toLowerCase().includes('benzin'));
      default:
        return list;
    }
  };

  const applySort = (list: ReturnType<typeof searchMotors>) => {
    if (sortMode === 'score-desc') return [...list].sort((a, b) => b.score - a.score);
    if (sortMode === 'score-asc') return [...list].sort((a, b) => a.score - b.score);
    return list;
  };

  const filteredMotors = applySort(applyFilter(searchMotors(searchQuery)));
  const filteredVehicles = searchVehicles(searchQuery);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.bg}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
                <ArrowLeft size={20} color={colors.cardForeground} />
              </TouchableOpacity>
              <View>
                <Text style={s.eyebrow}>{t.searchEyebrow}</Text>
                <Text style={s.title}>{t.searchResultsTitle}</Text>
              </View>
            </View>
            <View style={s.searchActive}>
              <Search size={20} color={colors.primary} />
              <TextInput
                style={s.searchText}
                placeholder={t.searchPh}
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity style={s.clearBtn} onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
                  <X size={16} color={colors.secondaryForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={[s.rowBetween, { paddingHorizontal: 20, marginTop: 24 }]}>
            <View>
              <Text style={s.statLabel}>Veritabanında</Text>
              <Text style={s.statValue}>{filteredMotors.length + filteredVehicles.length} {t.matchesFound}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={s.sortBtn} onPress={cycleSort}>
                <ArrowDownUp size={16} color={colors.primary} />
                <Text style={s.sortText}>{sortLabels[sortMode]}</Text>
                <ChevronDown size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={s.filterBtn} onPress={resetFilters}>
                <SlidersHorizontal size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 16 }}>
            {filterTabs.map((f, i) => (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, i === activeFilterIdx && { backgroundColor: rgba(colors.primary, 0.15), borderColor: colors.primary }]}
                onPress={() => setActiveFilterIdx(i)}
              >
                <Text style={[s.filterChipText, i === activeFilterIdx && { color: colors.primary }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Motors section */}
          <View style={{ marginTop: 28 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <View>
                <Text style={s.sectionTag}>{t.engineFamily}</Text>
                <Text style={s.sectionTitleLg}>{t.engines} <Text style={{ color: colors.mutedForeground }}>({filteredMotors.length})</Text></Text>
              </View>
              <Text style={s.sectionMeta}>Teknik kayıt</Text>
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
              <View style={s.motorList}>
                {filteredMotors.map((m, i) => {
                  const riskInfo = getRiskInfo(m.score);
                  const mainColor = colors[riskInfo.colorKey];
                  const WarnIcon = riskInfo.tier === 'low' ? CheckCircle : riskInfo.tier === 'medium' ? AlertTriangle : AlertCircle;

                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[s.motorCard, i < filteredMotors.length - 1 && s.motorCardBorder]}
                      onPress={() => nav.navigate('MotorVeAracDetay', { motorId: m.id })}
                    >
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                        <View style={[s.motorIcon, { backgroundColor: rgba(mainColor, 0.15) }]}>
                          <Settings2 size={18} color={mainColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={s.rowBetween}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.motorName}>{m.name}</Text>
                              <Text style={s.motorBrands}>{m.brands.join(' • ')}</Text>
                            </View>
                            <View style={[s.motorScoreBox, { backgroundColor: rgba(mainColor, 0.15) }]}>
                              <Text style={[s.motorScore, { color: mainColor }]}>{m.score.toFixed(1)}</Text>
                              <Text style={[s.motorRisk, { color: mainColor }]}>{riskInfo.label}</Text>
                            </View>
                          </View>
                          <View style={s.motorMetaRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Fuel size={14} color={colors.mutedForeground} />
                              <Text style={s.motorMetaText}>{m.fuel}</Text>
                            </View>
                            <View style={s.sep} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <BadgeCheck size={14} color={colors.mutedForeground} />
                              <Text style={s.motorMetaText}>{m.transmission}</Text>
                            </View>
                          </View>
                          <View style={[s.noteBox, { borderColor: rgba(mainColor, 0.3), backgroundColor: rgba(mainColor, 0.1) }]}>
                            <WarnIcon size={16} color={mainColor} />
                            <Text style={s.noteText}>
                              <Text style={{ fontFamily: fonts.body.bold, color: colors.foreground }}>Karar notu:</Text> {m.note}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Vehicles section */}
          <View style={{ marginTop: 32 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <View>
                <Text style={s.sectionTag}>{t.compatibleModels}</Text>
                <Text style={s.sectionTitleLg}>{t.vehicles} <Text style={{ color: colors.mutedForeground }}>({filteredVehicles.length})</Text></Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 12, gap: 12 }}>
              {filteredVehicles.map((v) => (
                <TouchableOpacity key={v.id} style={s.vehicleCard} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: v.motorId })}>
                  <View style={s.vehicleScoreCircle}>
                    <Text style={s.vehicleScore}>{v.score.toFixed(1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.vehicleName}>{v.name}</Text>
                    <Text style={s.vehicleDesc}>{v.desc}</Text>
                    <Text style={s.vehicleEngine}>{v.engine}</Text>
                  </View>
                  <Text style={s.vehicleNote} numberOfLines={2}>{v.note}</Text>
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
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground, marginTop: 2 },
  searchActive: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: radius, borderWidth: 1, borderColor: rgba(colors.primary, 0.6), backgroundColor: colors.input, marginTop: 20 },
  searchText: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
  clearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: colors.mutedForeground },
  statValue: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, marginTop: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  sortText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.cardForeground },
  filterBtn: { width: 40, height: 40, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  filterChipText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.cardForeground },
  sectionTag: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, marginTop: 4 },
  sectionMeta: { fontSize: 12, color: colors.mutedForeground },
  motorList: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  motorCard: { paddingHorizontal: 16, paddingVertical: 16 },
  motorCardBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  motorIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  motorName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  motorBrands: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  motorScoreBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'flex-end' },
  motorScore: { fontFamily: fonts.heading.bold, fontSize: 14 },
  motorRisk: { fontSize: 9, fontFamily: fonts.body.semibold, marginTop: 2 },
  motorMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  motorMetaText: { fontSize: 11, color: colors.mutedForeground },
  sep: { width: 1, height: 12, backgroundColor: colors.border },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  noteText: { fontSize: 12, color: colors.foreground, flex: 1, lineHeight: 18 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  vehicleScoreCircle: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  vehicleScore: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  vehicleName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  vehicleDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  vehicleEngine: { fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  vehicleNote: { fontSize: 10, color: colors.mutedForeground, maxWidth: 100, textAlign: 'right', lineHeight: 16 },
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