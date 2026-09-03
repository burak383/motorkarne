import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, NativeSyntheticEvent, NativeScrollEvent, Share, TextInput, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { confirmAction } from '../utils/confirm';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft, Share2, Bookmark, ShieldCheck, Plus, Minus, Check, X, Image as ImageIcon,
  AlertTriangle, Info, ArrowUp, Star, Tag, ExternalLink, MapPin,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScoreRing } from '../components/ScoreRing';
import RemoteImage from '../components/RemoteImage';
import { useVehicles } from '../state/VehicleContext';
import { useCatalog } from '../state/CatalogContext';
import { getRiskInfo } from '../utils/risk';
import { buildListingSearchUrls } from '../utils/listings';
import { buildNearbyServiceUrl, buildIssueServiceUrl } from '../utils/nearby';
import { ENGINE_BAY_IMAGE as ENGINE_BAY, TRANSMISSION_IMAGE, getVehicleImage } from '../data/images';
import { useFavorites } from '../state/FavoritesContext';
import { useReviews } from '../state/ReviewsContext';
import { useNotifications } from '../state/NotificationsContext';
import { useUsageStats } from '../state/UsageStatsContext';
import { useMembers } from '../state/MembersContext';

type Nav = NativeStackNavigationProp<any>;

export default function MotorVeAracDetayScreen() {
  const { getVehiclesByMotor } = useVehicles();
  const nav = useNavigation<Nav>();
  const route = useRoute();
  const [tab, setTab] = useState(0);
  const { toggleVehicle, isVehicleSaved } = useFavorites();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const tabs = [t.tabProsCons, t.chronicIssues, t.tabTransmission, t.tabReviews];

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

  const params = route.params as { motorId?: string } | undefined;
  const motorId = params?.motorId ?? 'puretech-eb2dt-130';
  const { recordView } = useUsageStats();

  useEffect(() => {
    recordView(motorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorId]);

  const { getMotorById } = useCatalog();
  const motor = getMotorById(motorId);
  const compatibleVehicles = getVehiclesByMotor(motorId);
  const compatibleVehicle = compatibleVehicles[0];

  const { getReviewsForMotor, getAverageRating, addReview } = useReviews();
  const { addNotification } = useNotifications();
  const { currentUser } = useMembers();
  const motorReviews = getReviewsForMotor(motorId);
  const averageRating = getAverageRating(motorId);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotoUri, setReviewPhotoUri] = useState<string | null>(null);

  const handlePickReviewPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('MotorKarne', 'Fotoğraf ekleyebilmek için galeri izni gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) {
      setReviewPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmitReview = () => {
    if (!currentUser) {
      confirmAction(
        'MotorKarne',
        'Yorum yapabilmek için giriş yapmanız gerekir.',
        () => nav.navigate('GirisYap'),
        { confirmText: 'Giriş Yap', cancelText: 'Vazgeç' }
      );
      return;
    }
    const result = addReview({
      motorId,
      userId: currentUser.id,
      userName: currentUser.fullName,
      rating: reviewRating,
      comment: reviewComment,
      photoUri: reviewPhotoUri ?? undefined,
    });
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Yorum eklenemedi.');
      return;
    }

    const isFollowed = compatibleVehicles.some((v) => isVehicleSaved(v.id));
    const reviewBelongsToSomeoneElse = result.review?.userId !== currentUser.id;
    if (isFollowed && motor && reviewBelongsToSomeoneElse) {
      addNotification(
        `${motor.name} için yeni bir yorum eklendi`,
        `${currentUser.fullName}: "${reviewComment.length > 80 ? reviewComment.slice(0, 80) + '…' : reviewComment}"`
      );
    }

    setReviewComment('');
    setReviewRating(5);
    setReviewPhotoUri(null);
  };

  const handleShare = async () => {
    if (!motor) return;
    const deepLink = `motorkarne://motor/${motorId}`;
    try {
      await Share.share({
        message:
          `${motor.name} (${motor.code}) — MotorKarne\n` +
          `Skor: ${motor.score.toFixed(1)} / 10 · ${getRiskInfo(motor.score).label}\n` +
          `${motor.brands.join(', ')}\n` +
          `${deepLink}`,
      });
    } catch (e) {
      Alert.alert('MotorKarne', 'Paylaşım sırasında bir sorun oluştu.');
    }
  };

  const riskInfo = motor ? getRiskInfo(motor.score) : null;
  const mainColor = riskInfo ? colors[riskInfo.colorKey] : colors.chart3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.bg}>
        {/* Sticky header */}
        <View style={s.stickyHeader}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
              <ArrowLeft size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={s.iconBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Paylaş">
                <Share2 size={18} color={colors.cardForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={compatibleVehicle?.id && isVehicleSaved(compatibleVehicle.id) ? 'Listeden kaldır' : 'Garaja kaydet'}
                onPress={() => {
                  if (!currentUser) {
                    confirmAction(
                      'MotorKarne',
                      'Araçları garajınıza kaydedebilmek için giriş yapmanız gerekir.',
                      () => nav.navigate('GirisYap'),
                      { confirmText: 'Giriş Yap', cancelText: 'Vazgeç' }
                    );
                    return;
                  }
                  if (compatibleVehicle?.id) {
                    const wasSaved = isVehicleSaved(compatibleVehicle.id);
                    toggleVehicle(compatibleVehicle.id);
                    Alert.alert('MotorKarne', wasSaved ? 'Listeden kaldırıldı.' : 'Araç garajınıza kaydedildi!');
                  }
                }}>
                <Bookmark size={18} color={compatibleVehicle?.id && isVehicleSaved(compatibleVehicle.id) ? colors.primary : colors.cardForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={s.eyebrow}>{motor?.brands.join(' • ')}</Text>
            <Text style={s.title}>{motor?.name ?? 'Motor Detayı'}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Hero */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={s.heroBox}>
              <RemoteImage
                uri={compatibleVehicle ? getVehicleImage(compatibleVehicle.id) : ENGINE_BAY}
                style={s.heroImage}
                resizeMode="cover"
              />
              <View style={s.heroOverlay} />
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>{motor?.fuel}</Text>
              </View>
              <View style={s.heroCode}>
                <Text style={s.heroCodeLabel}>{t.motDetayMotorKodu}</Text>
                <Text style={s.heroCodeValue}>{motor?.code}</Text>
              </View>
              <View style={s.heroScoreRow}>
                <ScoreRing score={motor?.score ?? 7.0} size={76} stroke={6} color={mainColor} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={s.heroScoreLabel}>{t.reliabilityScore}</Text>
                  <Text style={[s.heroScoreValue, { color: mainColor }]}>{riskInfo?.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Spec grid */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={s.specGrid}>
              <View style={s.specBox}>
                <Text style={s.specLabel}>{t.power}</Text>
                <Text style={s.specValue}>{motor?.power}</Text>
              </View>
              <View style={s.specBox}>
                <Text style={s.specLabel}>{t.fuel}</Text>
                <Text style={s.specValue}>{motor?.fuel}</Text>
              </View>
              <View style={s.specBox}>
                <Text style={s.specLabel}>{t.transmission}</Text>
                <Text style={s.specValue}>{motor?.transmission}</Text>
              </View>
            </View>
          </View>

          {/* Quick decision */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={[s.quickDecisionBox, { borderColor: rgba(mainColor, 0.35), backgroundColor: rgba(mainColor, 0.1) }]}>
              <View style={s.quickDecisionHeader}>
                <View style={[s.quickIcon, { backgroundColor: rgba(mainColor, 0.15) }]}>
                  <ShieldCheck size={20} color={mainColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.quickTag, { color: mainColor }]}>{t.motDetayHizliKararNotu}</Text>
                  <Text style={s.quickText}>{motor?.note}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={{ marginTop: 28 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 4 }}>
              {tabs.map((t, i) => (
                <TouchableOpacity
                  key={t}
                  style={[s.tab, i === tab && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
                  onPress={() => setTab(i)}
                >
                  <Text style={[s.tabText, i === tab && { color: colors.primary, fontFamily: fonts.body.bold }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Pros / Cons */}
          {tab === 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <View style={s.proConRow}>
              <View style={[s.proConCard, { borderColor: rgba(colors.success, 0.3) }]}>
                <View style={s.proConHeader}>
                  <View style={[s.proConIcon, { backgroundColor: rgba(colors.success, 0.15) }]}>
                    <Plus size={18} color={colors.success} />
                  </View>
                  <Text style={s.proConTitle}>{t.strengths}</Text>
                </View>
                {motor?.pros.map((p) => (
                  <View key={p} style={s.proConItem}>
                    <Check size={14} color={colors.success} />
                    <Text style={s.proConItemText}>{p}</Text>
                  </View>
                ))}
              </View>
              <View style={[s.proConCard, { borderColor: rgba(colors.destructive, 0.3) }]}>
                <View style={s.proConHeader}>
                  <View style={[s.proConIcon, { backgroundColor: rgba(colors.destructive, 0.15) }]}>
                    <Minus size={18} color={colors.destructive} />
                  </View>
                  <Text style={s.proConTitle}>{t.weaknesses}</Text>
                </View>
                {motor?.cons.map((c) => (
                  <View key={c} style={s.proConItem}>
                    <X size={14} color={colors.destructive} />
                    <Text style={s.proConItemText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          )}

          {/* Chronic issues */}
          {tab === 1 && motor?.chronic && motor.chronic.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
              <View style={s.rowBetween}>
                <View>
                  <Text style={s.sectionTag}>{t.motDetayOncelikliKontrol}</Text>
                  <Text style={s.sectionTitleLg}>{t.chronicIssues}</Text>
                </View>
                <View style={[s.countBadge, { backgroundColor: rgba(colors.destructive, 0.15) }]}>
                  <Text style={[s.countBadgeText, { color: colors.destructive }]}>{motor.chronic.length} başlık</Text>
                </View>
              </View>
              {motor.chronic.map((c, i) => (
                <View key={c.title} style={[s.chronicCard, { borderColor: rgba(colors.destructive, 0.35) }]}>
                  <View style={s.chronicHeader}>
                    <View style={[s.chronicIcon, { backgroundColor: rgba(colors.destructive, 0.15) }]}>
                      <AlertTriangle size={20} color={colors.destructive} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={[s.rowBetween, { alignItems: 'flex-start' }]}>
                        <Text style={s.chronicTitle}>{c.title}</Text>
                        <View style={[s.riskPill, { backgroundColor: rgba(colors.destructive, 0.15) }]}>
                          <Text style={[s.riskPillText, { color: colors.destructive }]}>{c.risk}</Text>
                        </View>
                      </View>
                      <Text style={s.chronicDesc}>{c.desc}</Text>
                    </View>
                  </View>
                  {c.solution && (
                    <View style={s.solutionBox}>
                      <Text style={s.solutionLabel}>{t.motDetayOnerilenCozum}</Text>
                      <Text style={s.solutionText}>{c.solution}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={s.findMechanicBtn}
                    onPress={() => Linking.openURL(buildIssueServiceUrl(motor.brands[0], c.title))}
                  >
                    <MapPin size={13} color={colors.primary} />
                    <Text style={s.findMechanicBtnText}>{t.motDetayUstaBul}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {tab === 1 && (!motor?.chronic || motor.chronic.length === 0) && (
            <View style={{ paddingHorizontal: 20, marginTop: 28, alignItems: 'center' }}>
              <ShieldCheck size={28} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={s.emptyTabText}>{t.motDetayKronikYok}</Text>
            </View>
          )}

          {/* Transmission */}
          {tab === 2 && (
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <View style={s.specGrid}>
                <View style={s.specBox}>
                  <Text style={s.specLabel}>{t.motDetaySanzimanTipi}</Text>
                  <Text style={s.specValue}>{motor?.transmission}</Text>
                </View>
                <View style={s.specBox}>
                  <Text style={s.specLabel}>{t.power}</Text>
                  <Text style={s.specValue}>{motor?.power}</Text>
                </View>
                <View style={s.specBox}>
                  <Text style={s.specLabel}>{t.karTork}</Text>
                  <Text style={s.specValue}>{motor?.torque ?? '—'}</Text>
                </View>
              </View>
              <View style={s.engineBayBox}>
                <RemoteImage uri={TRANSMISSION_IMAGE} style={s.engineBayImage} resizeMode="cover" />
              </View>
            </View>
          )}

          {/* Reviews */}
          {tab === 3 && (
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              {averageRating !== null && (
                <View style={s.avgRatingRow}>
                  <Star size={18} color={colors.chart3} fill={colors.chart3} />
                  <Text style={s.avgRatingText}>
                    {averageRating.toFixed(1)} / 5 · {motorReviews.length} yorum
                  </Text>
                </View>
              )}

              <View style={s.reviewFormBox}>
                <Text style={s.reviewFormLabel}>{t.motDetayPuaniniz}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity key={n} onPress={() => setReviewRating(n)}>
                      <Star
                        size={24}
                        color={colors.chart3}
                        fill={n <= reviewRating ? colors.chart3 : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.reviewInput}
                  placeholder={t.motDetayYorumPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                />
                {reviewPhotoUri ? (
                  <View style={s.reviewPhotoPreviewBox}>
                    <Image source={{ uri: reviewPhotoUri }} style={s.reviewPhotoPreview} />
                    <TouchableOpacity style={s.reviewPhotoRemoveBtn} onPress={() => setReviewPhotoUri(null)}>
                      <X size={14} color={colors.primaryForeground} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.reviewAddPhotoBtn} onPress={handlePickReviewPhoto}>
                    <ImageIcon size={15} color={colors.primary} />
                    <Text style={s.reviewAddPhotoBtnText}>Fotoğraf Ekle</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.reviewSubmitBtn} onPress={handleSubmitReview}>
                  <Text style={s.reviewSubmitBtnText}>{t.motDetayYorumuGonder}</Text>
                </TouchableOpacity>
              </View>

              {motorReviews.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 24 }}>
                  <Info size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={s.emptyTabText}>{t.motDetayYorumYok}</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 20 }}>
                  {motorReviews.map((r) => (
                    <View key={r.id} style={s.reviewCard}>
                      <View style={s.rowBetween}>
                        <Text style={s.reviewUserName}>{r.userName}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              size={12}
                              color={colors.chart3}
                              fill={n <= r.rating ? colors.chart3 : 'transparent'}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={s.reviewComment}>{r.comment}</Text>
                      {r.photoUri && (
                        <Image source={{ uri: r.photoUri }} style={s.reviewCardPhoto} resizeMode="cover" />
                      )}
                      <Text style={s.reviewDate}>{r.createdAt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Compatible Vehicles */}
          {compatibleVehicles.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
              <Text style={s.sectionTitleLg}>{t.compatibleVehicles}</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {compatibleVehicles.map((v) => (
                  <View key={v.id} style={s.compCard}>
                    <Text style={s.compName}>{v.name}</Text>
                    <Text style={s.compDesc}>{v.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* İkinci El Piyasası */}
          {compatibleVehicle && (
            <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
              <View style={s.listingCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={s.listingIconBox}>
                    <Tag size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listingTitle}>{t.motDetaySatisSorusu}</Text>
                    <Text style={s.listingDesc}>
                      {t.motDetayIlanAciklama}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <TouchableOpacity
                    style={s.listingBtn}
                    onPress={() => Linking.openURL(buildListingSearchUrls(compatibleVehicle).arabam)}
                  >
                    <Text style={s.listingBtnText}>{t.motDetayArabamGor}</Text>
                    <ExternalLink size={14} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.listingBtn}
                    onPress={() => Linking.openURL(buildListingSearchUrls(compatibleVehicle).sahibinden)}
                  >
                    <Text style={s.listingBtnText}>{t.motDetaySahibindenGor}</Text>
                    <ExternalLink size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Yakındaki Yetkili Servisler */}
          {motor && (
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
              <TouchableOpacity
                style={s.listingCard}
                onPress={() => Linking.openURL(buildNearbyServiceUrl(motor.brands[0]))}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={s.listingIconBox}>
                    <MapPin size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listingTitle}>{t.motDetayYakinServisler}</Text>
                    <Text style={s.listingDesc}>
                      {motor.brands[0]} {t.motDetayYakinServislerAciklama}
                    </Text>
                  </View>
                  <ExternalLink size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Engine bay */}
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <View>
              <Text style={s.sectionTag}>{t.motDetayTeknikRehber}</Text>
              <Text style={s.sectionTitleLg}>{t.engineStructureTitle}</Text>
            </View>
            <View style={s.engineBayBox}>
              <RemoteImage uri={ENGINE_BAY} style={s.engineBayImage} resizeMode="cover" />
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
  stickyHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: rgba(colors.background, 0.95),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.primary, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground, marginTop: 4 },
  heroBox: { height: 208, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100, backgroundColor: rgba(colors.background, 0.9) },
  heroBadge: { position: 'absolute', top: 16, left: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: rgba(colors.background, 0.75), borderWidth: 1, borderColor: rgba('#ffffff', 0.15) },
  heroBadgeText: { fontSize: 11, fontFamily: fonts.body.bold, color: colors.foreground },
  heroCode: { position: 'absolute', bottom: 16, left: 16 },
  heroCodeLabel: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: 'uppercase' },
  heroCodeValue: { fontFamily: fonts.heading.bold, fontSize: 18, color: '#ffffff', marginTop: 4 },
  heroScoreRow: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  heroScoreLabel: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.mutedForeground, letterSpacing: 1, textTransform: 'uppercase' },
  heroScoreValue: { fontSize: 12, fontFamily: fonts.body.bold, marginTop: 4 },
  specGrid: { flexDirection: 'row', gap: 8 },
  specBox: { flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  specLabel: { fontSize: 10, color: colors.mutedForeground },
  specValue: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.foreground, marginTop: 4 },
  quickDecisionBox: { borderRadius: radius, borderWidth: 1, padding: 16 },
  quickDecisionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickTag: { fontSize: 10, fontFamily: fonts.body.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  quickText: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground, marginTop: 4, lineHeight: 20 },
  tab: { paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  proConRow: { flexDirection: 'row', gap: 12 },
  proConCard: { flex: 1, borderRadius: radius, borderWidth: 1, backgroundColor: colors.card, padding: 16 },
  proConHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proConIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  proConTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  proConItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  proConItemText: { fontSize: 12, color: colors.foreground, flex: 1, lineHeight: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTag: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.primary, letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, marginTop: 4 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countBadgeText: { fontSize: 10, fontFamily: fonts.body.bold },
  chronicCard: { borderRadius: radius, borderWidth: 1, backgroundColor: colors.card, padding: 16, marginTop: 12 },
  chronicHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  chronicIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chronicTitle: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground, flex: 1, lineHeight: 20 },
  riskPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  riskPillText: { fontSize: 10, fontFamily: fonts.body.bold },
  chronicDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 8, lineHeight: 20 },
  solutionBox: { borderRadius: 8, backgroundColor: colors.muted, padding: 12, marginTop: 16 },
  solutionLabel: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.mutedForeground, letterSpacing: 1, textTransform: 'uppercase' },
  solutionText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground, marginTop: 4, lineHeight: 20 },
  findMechanicBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  findMechanicBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  engineBayBox: { height: 200, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden', marginTop: 12 },
  engineBayImage: { width: '100%', height: '100%' },
  compCard: { padding: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  compName: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  compDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  listingCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  listingIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: rgba(colors.primary, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  listingTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground },
  listingDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 17 },
  listingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
    paddingVertical: 12,
  },
  listingBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  emptyTabText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
  avgRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  avgRatingText: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.foreground },
  reviewFormBox: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  reviewFormLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  reviewInput: {
    marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input,
    padding: 12, fontSize: 13, color: colors.foreground, minHeight: 72, textAlignVertical: 'top',
  },
  reviewSubmitBtn: { marginTop: 12, borderRadius: radius, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' },
  reviewSubmitBtnText: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  reviewAddPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', paddingVertical: 10,
  },
  reviewAddPhotoBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  reviewPhotoPreviewBox: { marginTop: 10, position: 'relative', alignSelf: 'flex-start' },
  reviewPhotoPreview: { width: 80, height: 80, borderRadius: 8 },
  reviewPhotoRemoveBtn: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.destructive, alignItems: 'center', justifyContent: 'center',
  },
  reviewCardPhoto: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
  reviewCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14 },
  reviewUserName: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.foreground },
  reviewComment: { fontSize: 12, color: colors.foreground, marginTop: 6, lineHeight: 18 },
  reviewDate: { fontSize: 10, color: colors.mutedForeground, marginTop: 8 },
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