import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, NativeSyntheticEvent,
  NativeScrollEvent, Modal, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft, History, ChevronDown, ArrowLeftRight, Info, Lightbulb,
  AlertTriangle, ShieldCheck, ArrowUp, X, Search, Share2, Gauge, Wallet, Settings2, RotateCcw,
} from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScoreRing } from '../components/ScoreRing';
import { useFavorites } from '../state/FavoritesContext';
import { useCatalog } from '../state/CatalogContext';
import type { Motor } from '../data/catalog';
import { getRiskInfo, RISK_TIER_ORDER } from '../utils/risk';
import { usePricing } from '../state/PricingContext';
import { estimateTotalCostOfOwnership } from '../utils/tco';

type Nav = NativeStackNavigationProp<any>;

const DEFAULT_MOTOR_A = 'tdi-16-ea288';
const DEFAULT_MOTOR_B = 'dci-15-k9k';

export default function KarsilastirScreen() {
  const nav = useNavigation<Nav>();
  const { addComparison } = useFavorites();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { motors, getMotorById, searchMotors } = useCatalog();

  const [motorAId, setMotorAId] = useState(DEFAULT_MOTOR_A);
  const [motorBId, setMotorBId] = useState(DEFAULT_MOTOR_B);
  const [pickerSlot, setPickerSlot] = useState<'A' | 'B' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const motorA = getMotorById(motorAId) ?? motors[0];
  const motorB = getMotorById(motorBId) ?? motors[1] ?? motors[0];

  const { pricing, annualKm, setAnnualKm, updatePricing, resetToDefaults, source } = usePricing();
  const tcoA = useMemo(() => estimateTotalCostOfOwnership(motorA, annualKm, pricing), [motorA, annualKm, pricing]);
  const tcoB = useMemo(() => estimateTotalCostOfOwnership(motorB, annualKm, pricing), [motorB, annualKm, pricing]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kmInput, setKmInput] = useState(String(annualKm));
  const [benzinInput, setBenzinInput] = useState(String(pricing.fuelPrices.benzin));
  const [dizelInput, setDizelInput] = useState(String(pricing.fuelPrices.dizel));
  const [lpgInput, setLpgInput] = useState(String(pricing.fuelPrices.lpg));
  const [elektrikInput, setElektrikInput] = useState(String(pricing.fuelPrices.elektrikKwh));

  const formatTL = (n: number | null) =>
    n === null ? '—' : `₺${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;

  const openSettings = () => {
    setKmInput(String(annualKm));
    setBenzinInput(String(pricing.fuelPrices.benzin));
    setDizelInput(String(pricing.fuelPrices.dizel));
    setLpgInput(String(pricing.fuelPrices.lpg));
    setElektrikInput(String(pricing.fuelPrices.elektrikKwh));
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    setAnnualKm(parseInt(kmInput, 10) || 15000);
    updatePricing({
      fuelPrices: {
        benzin: parseFloat(benzinInput) || pricing.fuelPrices.benzin,
        dizel: parseFloat(dizelInput) || pricing.fuelPrices.dizel,
        lpg: parseFloat(lpgInput) || pricing.fuelPrices.lpg,
        elektrikKwh: parseFloat(elektrikInput) || pricing.fuelPrices.elektrikKwh,
      },
    });
    setSettingsOpen(false);
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const shareCardRef = useRef<View>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);

  const handleShareImage = async () => {
    if (isSharingImage) return;
    setIsSharingImage(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 0.9 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('MotorKarne', 'Bu cihazda paylaşım özelliği kullanılamıyor.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Karşılaştırmayı Paylaş' });
    } catch (e) {
      Alert.alert('MotorKarne', 'Görsel oluşturulurken bir sorun oluştu.');
    } finally {
      setIsSharingImage(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollTop(e.nativeEvent.contentOffset.y > 200);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSwap = () => {
    setMotorAId(motorBId);
    setMotorBId(motorAId);
  };

  const openPicker = (slot: 'A' | 'B') => {
    setPickerQuery('');
    setPickerSlot(slot);
  };

  const handlePick = (id: string) => {
    if (pickerSlot === 'A') setMotorAId(id);
    else if (pickerSlot === 'B') setMotorBId(id);
    setPickerSlot(null);
  };

  const pickerResults = pickerQuery ? searchMotors(pickerQuery) : motors;

  const scoreWinner = motorA.score === motorB.score ? null : motorA.score > motorB.score ? 'A' : 'B';
  const riskInfoA = getRiskInfo(motorA.score);
  const riskInfoB = getRiskInfo(motorB.score);
  const riskWinner =
    RISK_TIER_ORDER[riskInfoA.tier] === RISK_TIER_ORDER[riskInfoB.tier]
      ? null
      : RISK_TIER_ORDER[riskInfoA.tier] < RISK_TIER_ORDER[riskInfoB.tier]
      ? 'A'
      : 'B';

  const techRows: { label: string; a: string; b: string; aWin: boolean; bWin: boolean }[] = [
    { label: 'Yakıt tipi', a: motorA.fuel, b: motorB.fuel, aWin: false, bWin: false },
    { label: 'Güç', a: motorA.power, b: motorB.power, aWin: false, bWin: false },
    { label: 'Şanzıman', a: motorA.transmission, b: motorB.transmission, aWin: false, bWin: false },
    { label: 'Tork', a: motorA.torque ?? '—', b: motorB.torque ?? '—', aWin: false, bWin: false },
    { label: 'Tüketim', a: motorA.consumption ?? '—', b: motorB.consumption ?? '—', aWin: false, bWin: false },
    {
      label: 'Güvenilirlik skoru',
      a: motorA.score.toFixed(1),
      b: motorB.score.toFixed(1),
      aWin: scoreWinner === 'A',
      bWin: scoreWinner === 'B',
    },
    {
      label: 'Risk seviyesi',
      a: riskInfoA.label,
      b: riskInfoB.label,
      aWin: riskWinner === 'A',
      bWin: riskWinner === 'B',
    },
  ];

  const overallWinner = (() => {
    let aPoints = 0;
    let bPoints = 0;
    if (scoreWinner === 'A') aPoints++;
    if (scoreWinner === 'B') bPoints++;
    if (riskWinner === 'A') aPoints++;
    if (riskWinner === 'B') bPoints++;
    if (aPoints === bPoints) return null;
    return aPoints > bPoints ? motorA : motorB;
  })();

  const recommendationText = overallWinner
    ? `${overallWinner.name}, güvenilirlik skoru ve risk seviyesi açısından öne çıkıyor.`
    : 'İki motor da güvenilirlik açısından birbirine oldukça yakın.';

  const handleSave = () => {
    addComparison(motorAId, motorBId);
    Alert.alert('MotorKarne', 'Karşılaştırma kaydedildi.');
    nav.navigate('Kaydedilenler');
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
          <View style={s.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity style={s.backBtn} onPress={() => nav.navigate('Tabs' as any)}>
                <ArrowLeft size={18} color={colors.cardForeground} />
              </TouchableOpacity>
              <View>
                <Text style={s.eyebrow}>Motor analizi</Text>
                <Text style={s.title}>{t.compareTitle}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={() => nav.navigate('Kaydedilenler')}>
              <History size={18} color={colors.cardForeground} />
            </TouchableOpacity>
          </View>

          {/* Side by side */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={s.sbsRow}>
              <TouchableOpacity style={s.sbsCardActive} onPress={() => openPicker('A')}>
                <View style={[s.rowBetween, { marginBottom: 12 }]}>
                  <View style={[s.sbsTag, { backgroundColor: rgba(colors.primary, 0.15) }]}>
                    <Text style={[s.sbsTagText, { color: colors.primary }]}>A</Text>
                  </View>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </View>
                <Text style={s.sbsName} numberOfLines={1}>{motorA.name}</Text>
                <Text style={s.sbsSub} numberOfLines={1}>{motorA.brands.join(', ')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.swapBtn} onPress={handleSwap} accessibilityRole="button" accessibilityLabel="Motorların yerini değiştir">
                <ArrowLeftRight size={16} color={colors.secondaryForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={s.sbsCard} onPress={() => openPicker('B')}>
                <View style={[s.rowBetween, { marginBottom: 12 }]}>
                  <View style={[s.sbsTag, { backgroundColor: rgba(colors.success, 0.15) }]}>
                    <Text style={[s.sbsTagText, { color: colors.success }]}>B</Text>
                  </View>
                  <ChevronDown size={16} color={colors.mutedForeground} />
                </View>
                <Text style={s.sbsName} numberOfLines={1}>{motorB.name}</Text>
                <Text style={s.sbsSub} numberOfLines={1}>{motorB.brands.join(', ')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.normalized}>
              <Info size={14} color={colors.primary} />
              <Text style={s.normalizedText}>Karşılaştırmak için A veya B kartına dokunun.</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={[s.rowBetween, { marginBottom: 12 }]}>
              <View>
                <Text style={s.sectionTag}>{t.decisionSummary}</Text>
                <Text style={s.sectionTitleLg}>Genel Sonuç</Text>
              </View>
              <View
                style={[
                  s.riskBadge,
                  { backgroundColor: rgba(riskWinner ? colors.success : colors.chart3, 0.15) },
                ]}
              >
                <Text style={[s.riskBadgeText, { color: riskWinner ? colors.success : colors.chart3 }]}>
                  {overallWinner ? `${overallWinner.name} öne çıkıyor` : 'Denk'}
                </Text>
              </View>
            </View>
            <View ref={shareCardRef} collapsable={false} style={{ backgroundColor: colors.background, paddingBottom: 4 }}>
              <View style={s.summaryCard}>
                <View style={s.shareCardBrandRow}>
                  <Gauge size={14} color={colors.primary} />
                  <Text style={s.shareCardBrand}>MotorKarne</Text>
                </View>
                <View style={s.sbsScores}>
                  <View style={[s.sbsScore, { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <ScoreRing score={motorA.score} size={56} stroke={5} color={colors.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={s.scoreName} numberOfLines={1}>{motorA.name}</Text>
                      <Text style={s.scoreLabel}>Güvenilirlik</Text>
                    </View>
                  </View>
                  <View style={s.sbsScore}>
                    <ScoreRing score={motorB.score} size={56} stroke={5} color={colors.success} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={s.scoreName} numberOfLines={1}>{motorB.name}</Text>
                      <Text style={s.scoreLabel}>Güvenilirlik</Text>
                    </View>
                  </View>
                </View>
                <View style={s.recommendation}>
                  <Lightbulb size={16} color={colors.accent} />
                  <Text style={s.recommendationText}>
                    <Text style={{ fontFamily: fonts.body.bold }}>Öneri: </Text>
                    {recommendationText}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={s.shareImageBtn} onPress={handleShareImage} disabled={isSharingImage}>
              <Share2 size={16} color={colors.primary} />
              <Text style={s.shareImageBtnText}>
                {isSharingImage ? 'Görsel hazırlanıyor...' : 'Görsel Olarak Paylaş'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tech table */}
          <View style={{ marginTop: 28 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <View>
                <Text style={s.sectionTag}>{t.techData}</Text>
                <Text style={s.sectionTitleLg}>Yan yana kıyas</Text>
              </View>
            </View>
            <View style={s.table}>
              <View style={[s.tableHeader, s.tableRow3]}>
                <Text style={s.thLeft}>Özellik</Text>
                <Text style={[s.th, { color: colors.primary }]} numberOfLines={1}>A</Text>
                <Text style={[s.th, { color: colors.success }]} numberOfLines={1}>B</Text>
              </View>
              {techRows.map((r, i) => (
                <View key={r.label} style={[s.tableRow3, i < techRows.length - 1 && s.tableRowBorder, { alignItems: 'center' }]}>
                  <Text style={s.tdLeft}>{r.label}</Text>
                  <Text style={[s.td, r.aWin && { color: colors.success, fontFamily: fonts.body.bold }]} numberOfLines={1}>{r.a}</Text>
                  <Text style={[s.td, r.bWin && { color: colors.success, fontFamily: fonts.body.bold }]} numberOfLines={1}>{r.b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Toplam Sahip Olma Maliyeti */}
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.sectionTag}>Yıllık tahmini</Text>
                <Text style={s.sectionTitleLg}>Toplam Sahip Olma Maliyeti</Text>
              </View>
              <TouchableOpacity style={s.tcoSettingsBtn} onPress={openSettings}>
                <Settings2 size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={s.tcoAssumption}>
              {annualKm.toLocaleString('tr-TR')} km/yıl varsayımıyla · Yakıt + MTV (tahmini) + Bakım (tahmini)
            </Text>

            <View style={s.table}>
              <View style={[s.tableHeader, s.tableRow3]}>
                <Text style={s.thLeft}>Kalem</Text>
                <Text style={[s.th, { color: colors.primary }]}>A</Text>
                <Text style={[s.th, { color: colors.success }]}>B</Text>
              </View>
              {[
                { label: 'Yakıt', a: tcoA.fuel, b: tcoB.fuel },
                { label: 'MTV (tahmini)', a: tcoA.mtv, b: tcoB.mtv },
                { label: 'Bakım (tahmini)', a: tcoA.maintenance, b: tcoB.maintenance },
              ].map((row, i) => (
                <View key={row.label} style={[s.tableRow3, s.tableRowBorder, { alignItems: 'center' }]}>
                  <Text style={s.tdLeft}>{row.label}</Text>
                  <Text style={s.td} numberOfLines={1}>{formatTL(row.a)}</Text>
                  <Text style={s.td} numberOfLines={1}>{formatTL(row.b)}</Text>
                </View>
              ))}
              <View style={[s.tableRow3, { alignItems: 'center', backgroundColor: colors.muted }]}>
                <Text style={[s.tdLeft, { fontFamily: fonts.body.bold, color: colors.foreground }]}>Toplam / yıl</Text>
                <Text
                  style={[
                    s.td,
                    { fontFamily: fonts.body.bold },
                    tcoA.total !== null && tcoB.total !== null && tcoA.total < tcoB.total && { color: colors.success },
                  ]}
                  numberOfLines={1}
                >
                  {formatTL(tcoA.total)}
                </Text>
                <Text
                  style={[
                    s.td,
                    { fontFamily: fonts.body.bold },
                    tcoA.total !== null && tcoB.total !== null && tcoB.total < tcoA.total && { color: colors.success },
                  ]}
                  numberOfLines={1}
                >
                  {formatTL(tcoB.total)}
                </Text>
              </View>
            </View>

            <View style={s.tcoDisclaimer}>
              <Info size={13} color={colors.mutedForeground} style={{ marginTop: 1 }} />
              <Text style={s.tcoDisclaimerText}>
                Bu tutarlar kaba birer tahmindir; kasko/sigorta, lastik ve beklenmedik arıza masrafları dahil değildir.
                MTV, aracın 1-3 yaş dilimine göre yaklaşık hesaplanmıştır. Yakıt fiyatlarını ve yıllık kilometrenizi
                {'  '}
                <Text style={{ color: colors.primary, fontFamily: fonts.body.bold }} onPress={openSettings}>
                  ayarlardan
                </Text>
                {' '}güncelleyebilirsiniz.
                {source === 'default' && ' (Şu an gömülü varsayılan fiyatlar kullanılıyor.)'}
                {source === 'remote' && ' (Güncel uzak fiyatlar kullanılıyor.)'}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.sectionTag}>Kontrol listesi</Text>
                <Text style={s.sectionTitleLg}>{t.chronicRisk}</Text>
              </View>
              <ShieldCheck size={20} color={colors.success} />
            </View>

            {[{ motor: motorA, tag: 'A', color: colors.primary }, { motor: motorB, tag: 'B', color: colors.success }].map(
              ({ motor, tag, color }) => (
                <View key={tag} style={s.chronicBlock}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={[s.sbsTag, { backgroundColor: rgba(color, 0.15) }]}>
                      <Text style={[s.sbsTagText, { color }]}>{tag}</Text>
                    </View>
                    <Text style={s.chronicMotorName} numberOfLines={1}>{motor.name}</Text>
                  </View>
                  {motor.chronic.length === 0 ? (
                    <Text style={s.noChronicText}>Bilinen kronik bir sorun kaydedilmemiş.</Text>
                  ) : (
                    <View style={s.table}>
                      {motor.chronic.map((c, i) => (
                        <View
                          key={c.title}
                          style={[
                            s.chronicRow,
                            i < motor.chronic.length - 1 && s.tableRowBorder,
                          ]}
                        >
                          <AlertTriangle size={14} color={colors.chart3} style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.tdLeftBold}>{c.title}</Text>
                            <Text style={s.chronicDesc}>{c.desc}</Text>
                          </View>
                          <View style={[s.riskPill, { backgroundColor: rgba(colors.chart3, 0.15) }]}>
                            <Text style={[s.riskPillText, { color: colors.chart3 }]}>{c.risk}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            )}

            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>Karşılaştırmayı Kaydet</Text>
            </TouchableOpacity>
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

      {/* Motor picker modal */}
      <Modal visible={pickerSlot !== null} animationType="slide" transparent onRequestClose={() => setPickerSlot(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{pickerSlot === 'A' ? 'A' : 'B'} Motoru Seç</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setPickerSlot(null)}>
                <X size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <View style={s.modalSearchBox}>
              <Search size={16} color={colors.mutedForeground} />
              <TextInput
                style={s.modalSearchInput}
                placeholder="Motor, marka veya kod ara..."
                placeholderTextColor={colors.mutedForeground}
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickerResults.map((m: Motor) => (
                <TouchableOpacity key={m.id} style={s.modalRow} onPress={() => handlePick(m.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalRowName} numberOfLines={1}>{m.name}</Text>
                    <Text style={s.modalRowSub} numberOfLines={1}>{m.brands.join(', ')} · {m.fuel}</Text>
                  </View>
                  <Text style={[s.modalRowScore, { color: colors.success }]}>{m.score.toFixed(1)}</Text>
                </TouchableOpacity>
              ))}
              {pickerResults.length === 0 && (
                <Text style={s.modalEmptyText}>Sonuç bulunamadı.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fiyat/km ayarları modalı */}
      <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Maliyet Varsayımları</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setSettingsOpen(false)}>
                <X size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={s.settingsLabel}>Yıllık Kilometre</Text>
              <TextInput
                style={s.settingsInput}
                value={kmInput}
                onChangeText={setKmInput}
                keyboardType="numeric"
                placeholder="15000"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[s.settingsLabel, { marginTop: 16 }]}>Benzin (TL/L)</Text>
              <TextInput style={s.settingsInput} value={benzinInput} onChangeText={setBenzinInput} keyboardType="numeric" />

              <Text style={[s.settingsLabel, { marginTop: 16 }]}>Dizel (TL/L)</Text>
              <TextInput style={s.settingsInput} value={dizelInput} onChangeText={setDizelInput} keyboardType="numeric" />

              <Text style={[s.settingsLabel, { marginTop: 16 }]}>LPG (TL/L)</Text>
              <TextInput style={s.settingsInput} value={lpgInput} onChangeText={setLpgInput} keyboardType="numeric" />

              <Text style={[s.settingsLabel, { marginTop: 16 }]}>Elektrik (TL/kWh)</Text>
              <TextInput style={s.settingsInput} value={elektrikInput} onChangeText={setElektrikInput} keyboardType="numeric" />

              <TouchableOpacity style={s.saveBtn} onPress={saveSettings}>
                <Text style={s.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.resetPricingBtn}
                onPress={() => {
                  resetToDefaults();
                  setSettingsOpen(false);
                }}
              >
                <RotateCcw size={14} color={colors.mutedForeground} />
                <Text style={s.resetPricingBtnText}>Varsayılanlara Dön</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground, marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sbsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sbsCardActive: {
    flex: 1, borderRadius: radius, borderWidth: 1, borderColor: rgba(colors.primary, 0.5),
    backgroundColor: colors.card, padding: 12,
  },
  sbsCard: {
    flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, padding: 12,
  },
  sbsTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  sbsTagText: { fontSize: 10, fontFamily: fonts.body.bold },
  sbsName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, lineHeight: 20 },
  sbsSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 4 },
  swapBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  normalized: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  normalizedText: { fontSize: 11, color: colors.mutedForeground },
  sectionTag: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, marginTop: 4 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: 180 },
  riskBadgeText: { fontSize: 11, fontFamily: fonts.body.bold },
  summaryCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  shareCardBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  shareCardBrand: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.primary, letterSpacing: 0.5 },
  shareImageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, paddingVertical: 12,
  },
  shareImageBtnText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.primary },
  sbsScores: { flexDirection: 'row' },
  sbsScore: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingLeft: 12 },
  scoreName: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.foreground },
  scoreLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 4 },
  recommendation: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: rgba(colors.primary, 0.25), backgroundColor: rgba(colors.primary, 0.1),
  },
  recommendationText: { fontSize: 12, color: colors.cardForeground, flex: 1, lineHeight: 20 },
  table: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', marginTop: 12 },
  tableRow3: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12 },
  tableHeader: { backgroundColor: colors.muted },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  thLeft: { flex: 1.18, fontSize: 10, fontFamily: fonts.body.bold, color: colors.mutedForeground, letterSpacing: 1, textTransform: 'uppercase' },
  th: { flex: 0.8, fontSize: 10, fontFamily: fonts.body.bold, textAlign: 'center' },
  tdLeft: { flex: 1.18, fontSize: 12, color: colors.mutedForeground },
  tdLeftBold: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground },
  td: { flex: 0.8, fontSize: 12, fontFamily: fonts.body.semibold, textAlign: 'center', color: colors.foreground },
  riskPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  riskPillText: { fontSize: 10, fontFamily: fonts.body.bold },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, marginTop: 20,
  },
  saveBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  chronicBlock: { marginTop: 16 },
  chronicMotorName: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.foreground, flex: 1 },
  noChronicText: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  chronicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  chronicDesc: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, lineHeight: 16 },
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
  modalRowName: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.foreground },
  modalRowSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  modalRowScore: { fontSize: 13, fontFamily: fonts.body.bold },
  modalEmptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: 12, paddingVertical: 24 },
  tcoSettingsBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  tcoAssumption: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, marginBottom: 12 },
  tcoDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12 },
  tcoDisclaimerText: { flex: 1, fontSize: 11, color: colors.mutedForeground, lineHeight: 16 },
  settingsLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  settingsInput: {
    marginTop: 6, height: 44, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.input, paddingHorizontal: 12, fontSize: 14, color: colors.foreground,
  },
  resetPricingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, marginBottom: 8, paddingVertical: 8 },
  resetPricingBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
});
