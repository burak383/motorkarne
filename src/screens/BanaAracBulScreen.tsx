import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, NativeSyntheticEvent,
  NativeScrollEvent, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Sparkles, ChevronDown, ChevronRight, ArrowUp, X, Search, RotateCcw, Info,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Vehicle, Motor } from '../data/catalog';
import { useVehicles } from '../state/VehicleContext';
import { useAds } from '../state/AdsContext';
import BannerAdSlot from '../components/BannerAdSlot';
import { useCatalog } from '../state/CatalogContext';
import { getBrandLogo } from '../data/images';
import RemoteImage from '../components/RemoteImage';
import { getRiskInfo, type RiskTier } from '../utils/risk';
import ProfileAvatarButton from '../components/ProfileAvatarButton';

type Nav = NativeStackNavigationProp<any>;
type FilterField = 'marka' | 'model' | 'yakit' | 'vites' | 'risk' | null;

const FUEL_BUCKETS = ['Benzin', 'Dizel', 'Hibrit', 'Elektrik', 'LPG'];
const TRANSMISSION_BUCKETS = ['Manuel', 'Otomatik'];
const RISK_BUCKETS: { label: string; tier: RiskTier }[] = [
  { label: 'Çok Yüksek Risk', tier: 'very-high' },
  { label: 'Yüksek Risk', tier: 'high' },
  { label: 'Orta Risk', tier: 'medium' },
  { label: 'Düşük Risk', tier: 'low' },
];

function classifyFuel(fuel: string): string {
  const f = fuel.toLowerCase();
  if (f.includes('elektrik')) return 'Elektrik';
  if (f.includes('lpg')) return 'LPG';
  if (f.includes('hibrit') || f.includes('hybrid')) return 'Hibrit';
  if (f.includes('dizel')) return 'Dizel';
  return 'Benzin';
}

function matchesTransmission(transmission: string, bucket: string): boolean {
  const t = transmission.toLowerCase();
  if (bucket === 'Manuel') return t.includes('manuel');
  const autoKeywords = ['otomatik', 'dct', 'dsg', 'cvt', 'tronic', 'edc', 'amt', 'eat', 'robotize', 'tek ileri', 'kademeli'];
  return autoKeywords.some((k) => t.includes(k));
}

export default function BanaAracBulScreen() {
  const { vehicles: catalogVehicles } = useVehicles();
  const { registerScreenView } = useAds();
  useFocusEffect(
    React.useCallback(() => {
      registerScreenView();
    }, [])
  );
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { getMotorById } = useCatalog();

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedFuel, setSelectedFuel] = useState<string | null>(null);
  const [selectedTransmission, setSelectedTransmission] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<FilterField>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollTop(e.nativeEvent.contentOffset.y > 200);
  };
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const brandOptions = useMemo(
    () => Array.from(new Set(catalogVehicles.map((v) => v.brand))).sort((a, b) => a.localeCompare(b, 'tr')),
    []
  );

  const modelOptions = useMemo(() => {
    const list = selectedBrand ? catalogVehicles.filter((v) => v.brand === selectedBrand) : catalogVehicles;
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [selectedBrand]);

  const selectedModel = selectedModelId ? catalogVehicles.find((v) => v.id === selectedModelId) : undefined;

  const handleSelectBrand = (brand: string | null) => {
    setSelectedBrand(brand);
    // Marka değişince artık geçerli olmayan bir model seçiliyse temizle
    if (brand && selectedModel && selectedModel.brand !== brand) {
      setSelectedModelId(null);
    }
    setPickerField(null);
  };

  const handleSelectModel = (vehicle: Vehicle) => {
    setSelectedModelId(vehicle.id);
    setSelectedBrand(vehicle.brand);
    setPickerField(null);
  };

  const resetFilters = () => {
    setSelectedBrand(null);
    setSelectedModelId(null);
    setSelectedFuel(null);
    setSelectedTransmission(null);
    setSelectedRisk(null);
  };

  const results = useMemo(() => {
    const riskTier = selectedRisk ? RISK_BUCKETS.find((r) => r.label === selectedRisk)?.tier : null;
    return catalogVehicles
      .map((v) => ({ vehicle: v, motor: getMotorById(v.motorId) }))
      .filter((x): x is { vehicle: Vehicle; motor: Motor } => !!x.motor)
      .filter(({ vehicle, motor }) => {
        if (selectedBrand && vehicle.brand !== selectedBrand) return false;
        if (selectedModelId && vehicle.id !== selectedModelId) return false;
        if (selectedFuel && classifyFuel(motor.fuel) !== selectedFuel) return false;
        if (selectedTransmission && !matchesTransmission(motor.transmission, selectedTransmission)) return false;
        if (riskTier && getRiskInfo(motor.score).tier !== riskTier) return false;
        return true;
      })
      .sort((a, b) => b.motor.score - a.motor.score);
  }, [selectedBrand, selectedModelId, selectedFuel, selectedTransmission, selectedRisk, getMotorById]);

  const activeFilterCount = [selectedBrand, selectedModelId, selectedFuel, selectedTransmission, selectedRisk].filter(Boolean).length;

  const openPicker = (field: FilterField) => {
    setPickerQuery('');
    setPickerField(field);
  };

  const brandPickerResults = useMemo(
    () => brandOptions.filter((b) => b.toLowerCase().includes(pickerQuery.toLowerCase())),
    [brandOptions, pickerQuery]
  );
  const modelPickerResults = useMemo(
    () => modelOptions.filter((v) => v.name.toLowerCase().includes(pickerQuery.toLowerCase())),
    [modelOptions, pickerQuery]
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={s.bg}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 }}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>{t.bulTitle}</Text>
                <Text style={s.title}>{t.bulHeadline}</Text>
                <Text style={s.subtitle}>{t.bulSubtitle}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={s.sparkleBtn}>
                  <Sparkles size={20} color={colors.primary} />
                </View>
                <ProfileAvatarButton />
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {/* Marka */}
            <TouchableOpacity style={s.filterRow} onPress={() => openPicker('marka')}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>{t.bulMarka}</Text>
                <Text style={s.filterValue}>{selectedBrand ?? t.all}</Text>
              </View>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Model */}
            <TouchableOpacity style={s.filterRow} onPress={() => openPicker('model')}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>{t.bulModel}</Text>
                <Text style={s.filterValue}>{selectedModel?.name ?? t.all}</Text>
              </View>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Yakıt Türü */}
            <TouchableOpacity style={s.filterRow} onPress={() => openPicker('yakit')}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>{t.bulYakitTuru}</Text>
                <Text style={s.filterValue}>{selectedFuel ?? t.all}</Text>
              </View>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Vites Türü */}
            <TouchableOpacity style={s.filterRow} onPress={() => openPicker('vites')}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>{t.bulVitesTuru}</Text>
                <Text style={s.filterValue}>{selectedTransmission ?? t.all}</Text>
              </View>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Sanayi Toleransı */}
            <TouchableOpacity style={s.filterRow} onPress={() => openPicker('risk')}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>{t.bulSanayiToleransi}</Text>
                <Text style={s.filterValue}>{selectedRisk ?? t.all}</Text>
              </View>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {activeFilterCount > 0 && (
              <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
                <RotateCcw size={14} color={colors.mutedForeground} />
                <Text style={s.resetBtnText}>{t.bulFiltreleriSifirla} ({activeFilterCount})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <View style={s.rowBetween}>
              <Text style={s.resultsTitle}>{t.bulEslesenAraclar}</Text>
              <Text style={s.resultsCount}>{results.length} {t.bulSonuc}</Text>
            </View>

            {results.length === 0 ? (
              <View style={s.emptyBox}>
                <Info size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={s.emptyText}>{t.bulBosSonuc}</Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 16 }}>
                {results.map(({ vehicle, motor }) => (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={s.resultCard}
                    onPress={() => nav.navigate('MotorVeAracDetay', { motorId: vehicle.motorId })}
                  >
                    <View style={s.resultLogoBox}>
                      <RemoteImage uri={getBrandLogo(vehicle.brand)} style={s.resultLogo} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.resultName} numberOfLines={1}>{vehicle.name}</Text>
                      <Text style={s.resultEngine} numberOfLines={1}>{vehicle.engine}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.resultScore, { color: colors[getRiskInfo(motor.score).colorKey] }]}>{motor.score.toFixed(1)}</Text>
                      <Text style={[s.resultRisk, { color: colors[getRiskInfo(motor.score).colorKey] }]} numberOfLines={1}>{getRiskInfo(motor.score).label}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
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

      {/* Picker modal */}
      <Modal visible={pickerField !== null} animationType="slide" transparent onRequestClose={() => setPickerField(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {pickerField === 'marka' && t.bulMarkaSec}
                {pickerField === 'model' && t.bulModelSec}
                {pickerField === 'yakit' && t.bulYakitTuruSec}
                {pickerField === 'vites' && t.bulVitesTuruSec}
                {pickerField === 'risk' && t.bulSanayiToleransiSec}
              </Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setPickerField(null)}>
                <X size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            {(pickerField === 'marka' || pickerField === 'model') && (
              <View style={s.modalSearchBox}>
                <Search size={16} color={colors.mutedForeground} />
                <TextInput
                  style={s.modalSearchInput}
                  placeholder={pickerField === 'marka' ? t.bulMarkaAra : t.bulModelAra}
                  placeholderTextColor={colors.mutedForeground}
                  value={pickerQuery}
                  onChangeText={setPickerQuery}
                  autoFocus
                />
              </View>
            )}

            <ScrollView style={{ maxHeight: 380 }}>
              {/* Tümü seçeneği */}
              <TouchableOpacity
                style={s.modalRow}
                onPress={() => {
                  if (pickerField === 'marka') handleSelectBrand(null);
                  if (pickerField === 'model') { setSelectedModelId(null); setPickerField(null); }
                  if (pickerField === 'yakit') { setSelectedFuel(null); setPickerField(null); }
                  if (pickerField === 'vites') { setSelectedTransmission(null); setPickerField(null); }
                  if (pickerField === 'risk') { setSelectedRisk(null); setPickerField(null); }
                }}
              >
                <Text style={s.modalRowName}>{t.all}</Text>
              </TouchableOpacity>

              {pickerField === 'marka' && brandPickerResults.map((b) => (
                <TouchableOpacity key={b} style={s.modalRow} onPress={() => handleSelectBrand(b)}>
                  <View style={s.modalLogoBox}>
                    <RemoteImage uri={getBrandLogo(b)} style={s.modalLogo} resizeMode="contain" />
                  </View>
                  <Text style={s.modalRowName}>{b}</Text>
                </TouchableOpacity>
              ))}

              {pickerField === 'model' && modelPickerResults.map((v) => (
                <TouchableOpacity key={v.id} style={s.modalRow} onPress={() => handleSelectModel(v)}>
                  <View style={s.modalLogoBox}>
                    <RemoteImage uri={getBrandLogo(v.brand)} style={s.modalLogo} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalRowName}>{v.name}</Text>
                    <Text style={s.modalRowSub}>{v.engine}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {pickerField === 'yakit' && FUEL_BUCKETS.map((f) => (
                <TouchableOpacity key={f} style={s.modalRow} onPress={() => { setSelectedFuel(f); setPickerField(null); }}>
                  <Text style={s.modalRowName}>{f}</Text>
                </TouchableOpacity>
              ))}

              {pickerField === 'vites' && TRANSMISSION_BUCKETS.map((v) => (
                <TouchableOpacity key={v} style={s.modalRow} onPress={() => { setSelectedTransmission(v); setPickerField(null); }}>
                  <Text style={s.modalRowName}>{v}</Text>
                </TouchableOpacity>
              ))}

              {pickerField === 'risk' && RISK_BUCKETS.map((r) => (
                <TouchableOpacity key={r.label} style={s.modalRow} onPress={() => { setSelectedRisk(r.label); setPickerField(null); }}>
                  <Text style={s.modalRowName}>{r.label}</Text>
                </TouchableOpacity>
              ))}

              {pickerField === 'marka' && brandPickerResults.length === 0 && (
                <Text style={s.modalEmptyText}>{t.bulSonucBulunamadi}</Text>
              )}
              {pickerField === 'model' && modelPickerResults.length === 0 && (
                <Text style={s.modalEmptyText}>{t.bulSonucBulunamadi}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <BannerAdSlot />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 25, color: colors.foreground, marginTop: 8 },
  subtitle: { fontSize: 14, color: colors.mutedForeground, marginTop: 6 },
  sparkleBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14,
  },
  filterLabel: { fontSize: 11, fontFamily: fonts.body.semibold, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterValue: { fontFamily: fonts.heading.bold, fontSize: 15, color: colors.foreground, marginTop: 4 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  resetBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  resultsTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
  resultsCount: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, padding: 12,
  },
  resultLogoBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  resultLogo: { width: 30, height: 30 },
  resultName: { fontFamily: fonts.body.bold, fontSize: 14, color: colors.foreground },
  resultEngine: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  resultScore: { fontSize: 14, fontFamily: fonts.body.bold },
  resultRisk: { fontSize: 10, color: colors.mutedForeground, marginTop: 2, maxWidth: 90 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: radius,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 12, marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 13, color: colors.foreground },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalLogoBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  modalLogo: { width: 24, height: 24 },
  modalRowName: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.foreground },
  modalRowSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  modalEmptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: 12, paddingVertical: 24 },
});
