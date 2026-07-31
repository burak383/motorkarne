import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Gauge,
  Bell,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Stethoscope,
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  ArrowUp,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScoreRing } from '../components/ScoreRing';
import { useCatalog } from '../state/CatalogContext';
import { getRiskInfo } from '../utils/risk';
import { getVehicleImage, getBrandLogo } from '../data/images';
import RemoteImage from '../components/RemoteImage';
import { useNotifications } from '../state/NotificationsContext';
import { useMembers } from '../state/MembersContext';

type Nav = NativeStackNavigationProp<any>;

const popularBrands = [
  { name: 'Volkswagen', label: 'VW' },
  { name: 'Renault', label: 'Renault' },
  { name: 'Fiat', label: 'Fiat' },
  { name: 'Toyota', label: 'Toyota' },
  { name: 'BMW', label: 'BMW' },
];

const quickFilters = ['Benzin', 'Dizel', 'Hibrit', 'Otomatik', 'SUV', '1.000.000 TL altı'];

const alerts = [
  { title: '1.2 PureTech', desc: '40.000–60.000 km triger riski' },
  { title: 'DSG DQ200', desc: 'Satın alma öncesi kavrama kontrolü' },
];

export default function KesfetScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

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

  const goTab = (tab: string) => nav.navigate('Tabs' as any, { screen: tab });
  const s = useMemo(() => getStyles(colors), [colors]);
  const { motors: catalogMotors } = useCatalog();
  const { unreadCount } = useNotifications();
  const { currentUser } = useMembers();

  const avatarInitials = useMemo(() => {
    if (!currentUser?.fullName) return '?';
    const parts = currentUser.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }, [currentUser?.fullName]);

  const topMotors = catalogMotors.slice(0, 5).map((m) => ({
    id: m.id,
    name: m.name,
    desc: `${m.fuel} • ${m.brands.join(', ')}`,
    score: m.score,
    risk: getRiskInfo(m.score).label,
    color: colors[getRiskInfo(m.score).colorKey],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={s.bg}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={s.logoBox}>
                <Gauge size={20} color={colors.primaryForeground} />
              </View>
              <View>
                <Text style={s.logoTitle}>{t.exploreTitle}</Text>
                <Text style={s.logoSub}>{t.exploreSub}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity style={s.bell} onPress={() => nav.navigate('Bildirimler')} accessibilityRole="button" accessibilityLabel="Bildirimler">
                <Bell size={18} color={colors.cardForeground} />
                {unreadCount > 0 && <View style={s.bellDot} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.avatar} onPress={() => nav.navigate('Profil')} accessibilityRole="button" accessibilityLabel="Profilim">
                <Text style={s.avatarText}>{avatarInitials}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity style={s.searchRow} onPress={() => nav.navigate('AramaSonuclari', { query: searchQuery })}>
              <Search size={20} color={colors.mutedForeground} />
              <TextInput
                style={s.searchPlaceholder}
                placeholder={t.searchPlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={s.searchFilter}>
                <SlidersHorizontal size={16} color={colors.secondaryForeground} />
              </View>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <Text style={[s.popularTag, { color: colors.mutedForeground }]}>{t.popular}</Text>
              {['1.5 TSI', '1.3 TCe', '1.8 Hybrid', '2.0 B48'].map((item) => (
                <TouchableOpacity key={item} onPress={() => nav.navigate('AramaSonuclari', { query: item })}>
                  <Text style={s.popularChip}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Popular brands */}
          <View style={{ marginTop: 28 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <Text style={s.sectionTitle}>{t.popularBrands}</Text>
              <TouchableOpacity onPress={() => goTab('Markalar & Katalog')}>
                <Text style={s.seeAll}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }} style={{ marginTop: 12 }}>
              {popularBrands.map((b) => (
                <TouchableOpacity key={b.name} style={s.brandCard} onPress={() => nav.navigate('AramaSonuclari', { query: b.name })}>
                  <View style={s.brandIconBox}>
                    <RemoteImage uri={getBrandLogo(b.name)} style={s.brandIconImage} resizeMode="contain" />
                  </View>
                  <Text style={s.brandLabel}>{b.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quick filters */}
          <View style={{ marginTop: 28 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <Text style={s.sectionTitle}>{t.quickReview}</Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => nav.navigate('AramaSonuclari')}>
                <Text style={s.seeAll}>{t.all} </Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ marginTop: 12 }}>
              {quickFilters.map((f, i) => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, i === 0 && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => nav.navigate('AramaSonuclari', { query: f })}
                >
                  <Text style={[s.filterChipText, i === 0 && { color: colors.primaryForeground }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Featured review */}
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={[s.rowBetween, { marginBottom: 12 }]}>
              <View>
                <Text style={s.featuredTag}>{t.todayReview}</Text>
                <Text style={s.featuredTitle}>{t.knowBeforeBuy}</Text>
              </View>
              <TouchableOpacity style={s.bookmarkCircle} onPress={() => nav.navigate('Kaydedilenler')}>
                <Bookmark size={16} color={colors.secondaryForeground} />
              </TouchableOpacity>
            </View>

            <View style={s.featuredCard}>
              <View style={s.featuredHero}>
                <View style={s.featuredBadge}>
                  <Text style={s.featuredBadgeText}>2021 • SUV</Text>
                </View>
                <RemoteImage uri={getVehicleImage('peugeot-3008')} style={s.featuredImage} resizeMode="contain" />
                <View style={s.featuredScoreWrap}>
                  <ScoreRing score={6.2} size={64} stroke={3} color={colors.chart3} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={s.scoreLabel}>{t.reliability}</Text>
                    <Text style={[s.scoreValue, { color: colors.chart3 }]}>{t.mediumRiskLevel}</Text>
                  </View>
                </View>
              </View>
              <View style={s.featuredBody}>
                <Text style={s.featuredName}>Peugeot 3008 1.2 PureTech EAT8</Text>
                <View style={s.featuredMetrics}>
                  {[
                    { l: t.fuel, v: t.gasoline },
                    { l: t.transmission, v: 'EAT8' },
                    { l: t.power, v: '130 hp' },
                  ].map((m) => (
                    <View key={m.l} style={s.metricBox}>
                      <Text style={s.metricLabel}>{m.l}</Text>
                      <Text style={s.metricValue}>{m.v}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.featuredWarn}>
                  <AlertTriangle size={16} color={colors.chart3} />
                  <Text style={s.featuredWarnText}>
                    <Text style={{ fontFamily: fonts.body.bold }}>{t.attention}</Text> {t.checkTimingBelt}
                  </Text>
                </View>
                <TouchableOpacity style={s.readBtn} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: 'puretech-eb2dt-130' })}>
                  <Text style={s.readBtnText}>{t.readReview}</Text>
                  <ArrowUpRight size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Top researched motors */}
          <View style={{ marginTop: 32 }}>
            <View style={[s.rowBetween, { paddingHorizontal: 20 }]}>
              <View>
                <Text style={s.sectionTitleLg}>{t.topResearched}</Text>
                <Text style={s.sectionSub}>{t.last7DaysData}</Text>
              </View>
              <TouchableOpacity onPress={() => nav.navigate('AramaSonuclari')}>
                <Text style={s.seeAll}>{t.fullList}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 12, paddingHorizontal: 20 }}>
              <View style={s.motorList}>
                {topMotors.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[s.motorRow, i < topMotors.length - 1 && s.motorRowBorder]}
                    onPress={() => nav.navigate('MotorVeAracDetay', { motorId: m.id })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.motorName}>{m.name}</Text>
                      <Text style={s.motorDesc}>{m.desc}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.motorScore, { color: m.color }]}>{m.score.toFixed(1)}</Text>
                      <Text style={[s.motorRisk, { color: m.color }]}>{m.risk}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Featured alerts */}
          <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
            <Text style={s.sectionTitleLg}>{t.featuredAlerts}</Text>
            <Text style={s.sectionSub}>{t.compiledServiceRisks}</Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {alerts.map((a) => (
                <TouchableOpacity key={a.title} style={s.alertRow} onPress={() => nav.navigate('AramaSonuclari', { query: a.title })}>
                  <View style={s.alertIcon}>
                    <AlertTriangle size={18} color={colors.chart3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertTitle}>{a.title}</Text>
                    <Text style={s.alertDesc}>{a.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ariza Teshisi entry card */}
          <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <TouchableOpacity style={s.diagnosisCard} onPress={() => nav.navigate('ArizaTeshisi')}>
              <View style={s.diagnosisIconBox}>
                <Stethoscope size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.diagnosisTitle}>Motorunda bir belirti mi var?</Text>
                <Text style={s.diagnosisDesc}>"Tıkırtı sesi geliyor" gibi bir belirti seçin, olası kronik sorunu bulalım.</Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Scroll-to-Top Button */}
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

const getStyles = (colors: any) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
    },
    logoBox: {
      width: 40,
      height: 40,
      borderRadius: radius,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoTitle: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground },
    logoSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    bell: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      right: 8,
      top: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.destructive,
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.secondaryForeground },
    searchRow: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
    },
    searchPlaceholder: { flex: 1, fontSize: 14, color: colors.foreground },
    searchFilter: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    popularTag: { fontSize: 12, marginRight: 8, alignSelf: 'center' },
    popularChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 12,
      color: colors.cardForeground,
      marginRight: 8,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 16, color: colors.foreground },
    sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground },
    sectionSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    seeAll: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
    brandCard: { alignItems: 'center', gap: 8, marginRight: 12 },
    brandIconBox: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    brandIconImage: { width: 32, height: 32 },
    brandLabel: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.foreground },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginRight: 8,
    },
    filterChipText: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.cardForeground },
    featuredTag: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
    featuredTitle: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, marginTop: 4 },
    bookmarkCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuredCard: {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    featuredHero: { height: 192, position: 'relative', backgroundColor: rgba(colors.primary, 0.15) },
    featuredBadge: {
      position: 'absolute',
      top: 16,
      left: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuredBadgeText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground },
    featuredImage: {
      position: 'absolute',
      right: -20,
      top: 8,
      width: 288,
      height: 208,
    },
    featuredScoreWrap: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    scoreLabel: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: 'uppercase' },
    scoreValue: { fontSize: 12, fontFamily: fonts.body.semibold, marginTop: 4 },
    featuredBody: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16 },
    featuredName: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
    featuredMetrics: { flexDirection: 'row', gap: 8, marginTop: 12 },
    metricBox: {
      flex: 1,
      borderRadius: 8,
      backgroundColor: colors.muted,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    metricLabel: { fontSize: 10, color: colors.mutedForeground },
    metricValue: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground, marginTop: 4 },
    featuredWarn: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: rgba(colors.chart3, 0.3),
      backgroundColor: rgba(colors.chart3, 0.1),
    },
    featuredWarnText: { fontSize: 12, color: colors.cardForeground, flex: 1, lineHeight: 18 },
    readBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: radius,
      paddingVertical: 12,
      marginTop: 16,
    },
    readBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    motorList: {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    motorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    motorRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    motorName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
    motorDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    motorScore: { fontFamily: fonts.heading.bold, fontSize: 16 },
    motorRisk: { fontSize: 10, fontFamily: fonts.body.semibold, marginTop: 2 },
    alertRow: {
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
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: rgba(colors.chart3, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
    alertDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    diagnosisCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: radius, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, padding: 16,
    },
    diagnosisIconBox: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center', justifyContent: 'center',
    },
    diagnosisTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
    diagnosisDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 17 },
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