import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, NativeSyntheticEvent, NativeScrollEvent,
  Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { confirmAction } from '../utils/confirm';
import {
  BookmarkCheck, ChevronRight, CalendarDays, Clock3,
  GitCompareArrows, BookmarkPlus, Columns3, ArrowUpRight, Compass, ArrowUp, X, Trash2, FileDown,
  Gauge, Wrench, CheckCircle2,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useFavorites } from '../state/FavoritesContext';
import { useMembers } from '../state/MembersContext';
import type { Vehicle, Motor } from '../data/catalog';
import { useVehicles } from '../state/VehicleContext';
import { useAds } from '../state/AdsContext';
import BannerAdSlot from '../components/BannerAdSlot';
import { useCatalog } from '../state/CatalogContext';
import RemoteImage from '../components/RemoteImage';
import { useMaintenance } from '../state/MaintenanceContext';
import { useNotifications } from '../state/NotificationsContext';
import { getMaintenanceStatus, isElectric } from '../utils/maintenance';
import { getRiskInfo } from '../utils/risk';
import { exportComparisonHistoryAsPdf } from '../utils/exportPdf';
import ProfileAvatarButton from '../components/ProfileAvatarButton';

type Nav = NativeStackNavigationProp<any>;

export default function KaydedilenlerScreen() {
  const { getVehicleById } = useVehicles();
  const { registerScreenView } = useAds();
  useFocusEffect(
    React.useCallback(() => {
      registerScreenView();
    }, [])
  );
  const nav = useNavigation<Nav>();
  const { currentUser } = useMembers();
  const { savedVehicles, savedComparisons, toggleVehicle, removeComparison, clearAll } = useFavorites();
  const { getMotorById } = useCatalog();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { getRecord, updateCurrentKm, recordOilChange } = useMaintenance();
  const { addNotification } = useNotifications();

  const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string | null>(null);
  const [kmInput, setKmInput] = useState('');

  const openMaintenance = (vehicleId: string) => {
    const record = getRecord(vehicleId);
    setKmInput(record ? String(record.currentKm) : '');
    setMaintenanceVehicleId(vehicleId);
  };

  const saveKm = (vehicle: Vehicle & { motor?: Motor }) => {
    const km = parseInt(kmInput, 10);
    if (isNaN(km) || km < 0) {
      Alert.alert('MotorKarne', 'Lütfen geçerli bir kilometre değeri girin.');
      return;
    }
    updateCurrentKm(vehicle.id, km);

    if (vehicle.motor && !isElectric(vehicle.motor)) {
      const record = getRecord(vehicle.id);
      const lastOilChangeKm = record?.lastOilChangeKm ?? km;
      const status = getMaintenanceStatus(vehicle.motor, km, lastOilChangeKm);
      if (status.isOverdue) {
        addNotification(
          `${vehicle.name} — Yağ değişimi zamanı geçti`,
          `Son yağ değişiminden bu yana ${status.drivenSinceLastChange.toLocaleString('tr-TR')} km yol yapıldı. En kısa sürede yağ değişimi yaptırın.`
        );
      } else if (status.isNear) {
        addNotification(
          `${vehicle.name} — Yağ değişimine az kaldı`,
          `Bir sonraki yağ değişimine yaklaşık ${status.remainingKm.toLocaleString('tr-TR')} km kaldı.`
        );
      }
    }
    setMaintenanceVehicleId(null);
  };

  const markOilChanged = (vehicle: Vehicle & { motor?: Motor }) => {
    const km = parseInt(kmInput, 10);
    const record = getRecord(vehicle.id);
    const atKm = !isNaN(km) ? km : record?.currentKm;
    if (atKm !== undefined) {
      updateCurrentKm(vehicle.id, atKm);
    }
    recordOilChange(vehicle.id, atKm);
    Alert.alert('MotorKarne', 'Yağ değişimi kaydedildi. Sayaç sıfırlandı.');
    setMaintenanceVehicleId(null);
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    const result = await exportComparisonHistoryAsPdf(savedComparisons, getMotorById);
    setExportingPdf(false);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'PDF dışa aktarılamadı.');
    }
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

  const savedVehicleData = savedVehicles.map((sv) => {
    const v = getVehicleById(sv.vehicleId);
    const motor = v ? getMotorById(v.motorId) : undefined;
    return v ? { ...v, motor, savedAt: sv.savedAt } : null;
  }).filter(Boolean) as (Vehicle & { motor?: Motor; savedAt: string })[];
  const big = savedVehicleData[0];
  const rest = savedVehicleData.slice(1);
  const hasItems = savedVehicleData.length > 0;
  const maintenanceVehicle = maintenanceVehicleId
    ? savedVehicleData.find((v) => v.id === maintenanceVehicleId)
    : undefined;
  // NOT: `|| 0` yerine isNaN kontrolü kullanılıyor — kullanıcı kilometre alanına
  // gerçekten "0" yazdığında (örn. sıfır km'lik yeni bir araç), `||` bunu
  // "boş" sayıp eski kayıtlı kilometreyi göstermeye devam ediyordu.
  const typedKm = parseInt(kmInput, 10);
  const previewKm = !isNaN(typedKm) ? typedKm : (getRecord(maintenanceVehicle?.id ?? '')?.currentKm ?? 0);
  const maintenanceStatus =
    maintenanceVehicle?.motor && !isElectric(maintenanceVehicle.motor)
      ? getMaintenanceStatus(
          maintenanceVehicle.motor,
          previewKm,
          getRecord(maintenanceVehicle.id)?.lastOilChangeKm ?? (!isNaN(typedKm) ? typedKm : 0)
        )
      : null;

  const handleClearAll = () => {
    if (!hasItems && savedComparisons.length === 0) return;
    confirmAction(
      'Tümünü Temizle',
      'Kaydedilen tüm araçlar ve karşılaştırmalar listenizden kaldırılacak. Emin misiniz?',
      () => clearAll(),
      { confirmText: 'Temizle', cancelText: 'Vazgeç' }
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
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
            <View>
              <Text style={s.eyebrow}>{t.kaydedilenlerEyebrow}</Text>
              <Text style={s.title}>{t.kaydedilenlerTitle}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity style={s.editBtn} onPress={handleClearAll}>
                <Trash2 size={16} color={colors.destructive} />
                <Text style={[s.editText, { color: colors.destructive }]}>{t.clearAll}</Text>
              </TouchableOpacity>
              <ProfileAvatarButton />
            </View>
          </View>

          {/* Watchlist */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.sectionTitleLg}>{t.watchlistTitle}</Text>
                <Text style={s.sectionSub}>{t.watchlistSub}</Text>
              </View>
              <View style={s.countBadge}><Text style={s.countText}>{savedVehicleData.length} kayıt</Text></View>
            </View>

            {/* Big card */}
            {big && (() => {
              const bigScore = big.motor?.score ?? big.score;
              const bigRisk = getRiskInfo(bigScore);
              const bigRiskColor = colors[bigRisk.colorKey];
              return (
              <TouchableOpacity style={s.bigCard} activeOpacity={0.9} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: big.motorId })}>
                <View style={s.bigHero}>
                  <View style={[s.riskTag, { backgroundColor: rgba(bigRiskColor, 0.15), borderColor: rgba(bigRiskColor, 0.3) }]}>
                    <Text style={[s.riskTagText, { color: bigRiskColor }]}>{bigRisk.label}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.bigBookmark}
                    onPress={() => {
                      toggleVehicle(big.id);
                      Alert.alert('MotorKarne', `${big.name} listeden kaldırıldı.`);
                    }}
                  >
                    <BookmarkCheck size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.bigMaintenanceBtn}
                    onPress={() => openMaintenance(big.id)}
                  >
                    <Wrench size={14} color={colors.primaryForeground} />
                    <Text style={s.bigMaintenanceBtnText}>{t.kayBakim}</Text>
                  </TouchableOpacity>
                  <RemoteImage uri={big.img} style={s.bigImage} resizeMode="contain" />
                  <View style={[s.bigScoreCircle, { borderColor: bigRiskColor }]}>
                    <Text style={s.bigScoreText}>{bigScore.toFixed(1)}</Text>
                    <Text style={s.bigScoreSub}>/ 10</Text>
                  </View>
                </View>
                <View style={s.bigBody}>
                  <View style={s.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.bigName}>{big.name}</Text>
                      <Text style={s.bigEngine}>{big.engine}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.mutedForeground} />
                  </View>
                  <View style={s.bigFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CalendarDays size={14} color={colors.mutedForeground} />
                      <Text style={s.bigDate}>{t.kayKayitEtiketi}: {big.savedAt}</Text>
                    </View>
                    <Text style={[s.bigNote, { color: bigRiskColor }]}>{big.motor?.note ?? big.note}</Text>
                  </View>
                  {(() => {
                    const record = getRecord(big.id);
                    if (!record || !big.motor || isElectric(big.motor)) return null;
                    const status = getMaintenanceStatus(big.motor, record.currentKm, record.lastOilChangeKm);
                    return (
                      <TouchableOpacity style={s.maintenanceStatusRow} onPress={() => openMaintenance(big.id)}>
                        <Gauge size={13} color={status.isOverdue ? colors.destructive : status.isNear ? colors.chart3 : colors.success} />
                        <Text
                          style={[
                            s.maintenanceStatusText,
                            { color: status.isOverdue ? colors.destructive : status.isNear ? colors.chart3 : colors.mutedForeground },
                          ]}
                        >
                          {status.isOverdue
                            ? `${t.kayYagDegisimiGecti} (${Math.abs(status.remainingKm).toLocaleString('tr-TR')} ${t.kayKmAsildi})`
                            : `${t.kayYagDegisimiKalanKisa} ${status.remainingKm.toLocaleString('tr-TR')} ${t.kayKmKaldi}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </TouchableOpacity>
              );
            })()}

            {/* Small cards row */}
            <View style={s.smallRow}>
              {rest.map((c) => {
                const cScore = c.motor?.score ?? c.score;
                const cRisk = getRiskInfo(cScore);
                const cRiskColor = colors[cRisk.colorKey];
                return (
                <TouchableOpacity key={c.id} style={s.smallCard} activeOpacity={0.9} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: c.motorId })}>
                  <View style={s.smallHero}>
                    <View style={[s.smallRiskTag, { backgroundColor: rgba(cRiskColor, 0.15) }]}>
                      <Text style={[s.smallRiskText, { color: cRiskColor }]}>{cRisk.label}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.smallBookmark}
                      onPress={() => {
                        toggleVehicle(c.id);
                        Alert.alert('MotorKarne', `${c.name} listeden kaldırıldı.`);
                      }}
                    >
                      <X size={12} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.smallMaintenanceBtn}
                      onPress={() => openMaintenance(c.id)}
                    >
                      <Wrench size={11} color={colors.primaryForeground} />
                    </TouchableOpacity>
                    <RemoteImage uri={c.img} style={s.smallImage} resizeMode="contain" />
                    <View style={[s.smallScore, { borderColor: cRiskColor }]}>
                      <Text style={s.smallScoreText}>{cScore.toFixed(1)}</Text>
                      <Text style={s.smallScoreSub}>/ 10</Text>
                    </View>
                  </View>
                  <View style={s.smallBody}>
                    <Text style={s.smallName}>{c.name}</Text>
                    <Text style={s.smallEngine}>{c.engine}</Text>
                    <View style={s.smallFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock3 size={12} color={colors.mutedForeground} />
                        <Text style={s.smallDate}>{c.savedAt}</Text>
                      </View>
                      <Text style={[s.smallNote, { color: cRiskColor }]}>{c.motor?.note ?? c.note}</Text>
                    </View>
                    {(() => {
                      const record = getRecord(c.id);
                      if (!record || !c.motor || isElectric(c.motor)) return null;
                      const status = getMaintenanceStatus(c.motor, record.currentKm, record.lastOilChangeKm);
                      return (
                        <Text
                          style={[
                            s.smallMaintenanceText,
                            { color: status.isOverdue ? colors.destructive : status.isNear ? colors.chart3 : colors.mutedForeground },
                          ]}
                        >
                          {status.isOverdue ? t.kayYagDegisimiGecti : `${t.kayYagDegisimiKalanKisa} ${status.remainingKm.toLocaleString('tr-TR')} ${t.kayKmKaldi}`}
                        </Text>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Saved comparisons */}
          <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <View>
                <Text style={s.sectionTitleLg}>{t.savedComparisonsTitle}</Text>
                <Text style={s.sectionSub}>{t.savedComparisonsSub}</Text>
              </View>
              <Columns3 size={20} color={colors.primary} />
            </View>
            {savedComparisons.length > 0 && (
              <TouchableOpacity
                style={s.exportPdfBtn}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                <FileDown size={15} color={colors.primary} />
                <Text style={s.exportPdfBtnText}>
                  {exportingPdf ? 'PDF hazırlanıyor...' : 'Karşılaştırma Geçmişini PDF Olarak Dışa Aktar'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={{ gap: 12, marginTop: 16 }}>
              {savedComparisons.map((c) => {
                const motorA = getMotorById(c.motorA);
                const motorB = getMotorById(c.motorB);
                return (
                  <TouchableOpacity key={c.id} style={s.compareRow} onPress={() => nav.navigate('Tabs' as any, { screen: 'Karşılaştır' })}>
                    <View style={[s.compareIcon, { backgroundColor: rgba(colors.primary, 0.15) }]}>
                      <GitCompareArrows size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.compareTitle}>{motorA?.name ?? c.motorA} <Text style={{ color: colors.mutedForeground }}>vs</Text> {motorB?.name ?? c.motorB}</Text>
                      <Text style={s.compareDesc}>{t.kayKayitEtiketi}: {c.savedAt}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.compareRemoveBtn}
                      onPress={() => {
                        removeComparison(c.id);
                        Alert.alert('MotorKarne', 'Karşılaştırma listeden kaldırıldı.');
                      }}
                    >
                      <X size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                    <ArrowUpRight size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Empty hint */}
          {!currentUser ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}>
                <BookmarkPlus size={20} color={colors.mutedForeground} />
              </View>
              <Text style={s.emptyTitle}>Kaydedilenleri görmek için giriş yapın</Text>
              <Text style={s.emptyDesc}>
                Kaydettiğiniz araçlar ve karşılaştırmalar hesabınıza bağlı olarak saklanır.
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => nav.navigate('GirisYap' as any)}>
                <Text style={s.emptyBtnText}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.emptyBox, (hasItems || savedComparisons.length > 0) && { display: 'none' }]}>
              <View style={s.emptyIcon}>
                <BookmarkPlus size={20} color={colors.mutedForeground} />
              </View>
              <Text style={s.emptyTitle}>{t.emptyListTitle}</Text>
              <Text style={s.emptyDesc}>
                {t.emptyListDesc}
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => nav.navigate('Tabs' as any)}>
                <Compass size={16} color={colors.primaryForeground} />
                <Text style={s.emptyBtnText}>{t.exploreEngines}</Text>
              </TouchableOpacity>
            </View>
          )}
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

      {/* Bakım Takibi modalı */}
      <Modal
        visible={maintenanceVehicleId !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setMaintenanceVehicleId(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t.kayBakimTakibi}</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setMaintenanceVehicleId(null)}>
                <X size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            {maintenanceVehicle && (
              <>
                <Text style={s.modalVehicleName}>{maintenanceVehicle.name}</Text>

                {maintenanceVehicle.motor && isElectric(maintenanceVehicle.motor) ? (
                  <Text style={s.modalElectricNote}>
                    {t.kayElektrikliNot}
                  </Text>
                ) : null}

                <Text style={s.settingsLabel}>{t.kayGuncelKilometre}</Text>
                <TextInput
                  style={s.settingsInput}
                  value={kmInput}
                  onChangeText={setKmInput}
                  keyboardType="numeric"
                  placeholder="45000"
                  placeholderTextColor={colors.mutedForeground}
                />

                {maintenanceStatus && (
                  <View style={s.maintenanceProgressBox}>
                    <View style={s.rowBetween}>
                      <Text style={s.maintenanceProgressLabel}>
                        {t.kayYagDegisimineKalan}: {maintenanceStatus.isOverdue ? '0' : maintenanceStatus.remainingKm.toLocaleString('tr-TR')} km
                      </Text>
                      <Text style={s.maintenanceProgressLabel}>{maintenanceStatus.intervalKm.toLocaleString('tr-TR')} {t.kayKmAralik}</Text>
                    </View>
                    <View style={s.maintenanceProgressBar}>
                      <View
                        style={[
                          s.maintenanceProgressFill,
                          {
                            width: `${maintenanceStatus.progressRatio * 100}%`,
                            backgroundColor: maintenanceStatus.isOverdue
                              ? colors.destructive
                              : maintenanceStatus.isNear
                              ? colors.chart3
                              : colors.success,
                          },
                        ]}
                      />
                    </View>
                    {maintenanceStatus.isOverdue && (
                      <Text style={[s.maintenanceWarning, { color: colors.destructive }]}>
                        {t.kayYagDegisimiGectiUyari}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity style={s.saveBtn} onPress={() => saveKm(maintenanceVehicle)}>
                  <Text style={s.saveBtnText}>{t.kayKilometreyiKaydet}</Text>
                </TouchableOpacity>

                {maintenanceVehicle.motor && !isElectric(maintenanceVehicle.motor) && (
                  <TouchableOpacity style={s.oilChangeBtn} onPress={() => markOilChanged(maintenanceVehicle)}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={s.oilChangeBtnText}>{t.kayYagDegisimiYaptim}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
      <BannerAdSlot />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  eyebrow: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 24, color: colors.foreground, marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  exportPdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, paddingVertical: 12,
  },
  exportPdfBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  editText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.cardForeground },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground },
  sectionSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.secondary },
  countText: { fontSize: 11, fontFamily: fonts.body.bold, color: colors.secondaryForeground },
  bigCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', marginTop: 16 },
  bigHero: { height: 144, position: 'relative', backgroundColor: rgba(colors.primary, 0.2) },
  riskTag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  riskTagText: { fontSize: 10, fontFamily: fonts.body.bold },
  bigBookmark: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: rgba(colors.background, 0.7), alignItems: 'center', justifyContent: 'center' },
  bigImage: { position: 'absolute', bottom: 0, right: 4, width: 224, height: 128 },
  bigScoreCircle: { position: 'absolute', bottom: 12, left: 12, width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: colors.success, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  bigScoreText: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground, lineHeight: 16 },
  bigScoreSub: { fontSize: 9, fontFamily: fonts.body.bold, color: colors.mutedForeground, marginTop: 2 },
  bigBody: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 14 },
  bigName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, lineHeight: 20 },
  bigEngine: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  bigFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  bigDate: { fontSize: 10, color: colors.mutedForeground },
  bigNote: { fontSize: 10, fontFamily: fonts.body.semibold },
  smallRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  smallCard: { flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
  smallHero: { height: 128, position: 'relative', backgroundColor: rgba(colors.success, 0.15) },
  smallRiskTag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  smallBookmark: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: rgba(colors.background, 0.7), alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  smallRiskText: { fontSize: 10, fontFamily: fonts.body.bold },
  smallImage: { position: 'absolute', bottom: 0, right: -20, width: 176, height: 112 },
  smallScore: { position: 'absolute', bottom: 8, left: 12, width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.success, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  smallScoreText: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, lineHeight: 14 },
  smallScoreSub: { fontSize: 8, color: colors.mutedForeground },
  smallBody: { borderTopWidth: 1, borderTopColor: colors.border, padding: 12 },
  smallName: { fontFamily: fonts.heading.bold, fontSize: 12, color: colors.foreground, lineHeight: 16 },
  smallEngine: { fontSize: 10, color: colors.mutedForeground, marginTop: 4, lineHeight: 16 },
  smallFooter: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 12 },
  smallDate: { fontSize: 9, color: colors.mutedForeground },
  smallNote: { fontSize: 10, fontFamily: fonts.body.semibold, marginTop: 4 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  compareIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  compareTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  compareDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  compareRemoveBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  emptyBox: { marginHorizontal: 20, marginTop: 32, borderRadius: radius, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: rgba(colors.muted, 0.6), paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, marginTop: 12 },
  emptyDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 6, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: 16, paddingVertical: 10, marginTop: 16 },
  emptyBtnText: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.primaryForeground },
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
  bigMaintenanceBtn: {
    position: 'absolute', top: 12, right: 52, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, height: 32, borderRadius: 16, backgroundColor: rgba(colors.primary, 0.9),
  },
  bigMaintenanceBtnText: { fontSize: 11, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  maintenanceStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  maintenanceStatusText: { fontSize: 11, fontFamily: fonts.body.semibold },
  smallMaintenanceBtn: {
    position: 'absolute', top: 8, left: 8, width: 24, height: 24, borderRadius: 12,
    backgroundColor: rgba(colors.primary, 0.9), alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  smallMaintenanceText: { fontSize: 9, fontFamily: fonts.body.semibold, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  modalVehicleName: { fontSize: 13, color: colors.mutedForeground, marginBottom: 16 },
  modalElectricNote: {
    fontSize: 12, color: colors.mutedForeground, backgroundColor: colors.muted, borderRadius: 8,
    padding: 10, marginBottom: 14, lineHeight: 17,
  },
  settingsLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  settingsInput: {
    marginTop: 6, height: 44, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.input, paddingHorizontal: 12, fontSize: 14, color: colors.foreground,
  },
  maintenanceProgressBox: { marginTop: 16 },
  maintenanceProgressLabel: { fontSize: 11, color: colors.mutedForeground },
  maintenanceProgressBar: { height: 8, borderRadius: 4, backgroundColor: colors.secondary, marginTop: 8, overflow: 'hidden' },
  maintenanceProgressFill: { height: '100%', borderRadius: 4 },
  maintenanceWarning: { fontSize: 12, fontFamily: fonts.body.semibold, marginTop: 8 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, marginTop: 20,
  },
  saveBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  oilChangeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius, paddingVertical: 12, marginTop: 10,
  },
  oilChangeBtnText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.success },
});