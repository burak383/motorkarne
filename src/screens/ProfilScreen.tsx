import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Image,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  Edit3,
  Check,
  X,
  Bookmark,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  Globe,
  ArrowUp,
  ImageIcon,
  Trash2,
  Info,
  Download,
  KeyRound,
  Crown,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMembers } from '../state/MembersContext';
import { usePurchases } from '../state/PurchasesContext';
import { useFavorites } from '../state/FavoritesContext';
import { useReviews } from '../state/ReviewsContext';
import { useMaintenance } from '../state/MaintenanceContext';
import { useNotifications } from '../state/NotificationsContext';
import { useAds } from '../state/AdsContext';
import { confirmAction } from '../utils/confirm';
import AdFreeCard from '../components/AdFreeCard';

type Nav = NativeStackNavigationProp<any>;

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';

export default function ProfilScreen() {
  const nav = useNavigation<Nav>();
  const { mode, toggleTheme, themeColors: colors } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { currentUser, updateCurrentUser, changePassword, logout, deleteAccount } = useMembers();
  const { restorePurchases, clearLocalAdFreeCache } = usePurchases();
  const { savedVehicles, savedComparisons, clearAll: clearFavorites } = useFavorites();
  const { reviews, deleteReviewsByUser } = useReviews();
  const { clearAll: clearMaintenance } = useMaintenance();
  const { clearAll: clearNotifications } = useNotifications();
  const { clearRewardedBonus } = useAds();
  const s = useMemo(() => getStyles(colors), [colors]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  const handleChangePassword = async () => {
    if (newPasswordInput !== confirmPasswordInput) {
      Alert.alert('MotorKarne', 'Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }
    const result = await changePassword(currentPasswordInput, newPasswordInput);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Şifre değiştirilemedi.');
      return;
    }
    Alert.alert('MotorKarne', 'Şifreniz başarıyla değiştirildi.');
    closePasswordModal();
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollTop(e.nativeEvent.contentOffset.y > 200);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const handleStartEdit = () => {
    if (!currentUser) return;
    setTempName(currentUser.fullName);
    setTempEmail(currentUser.email);
    setTempPhone(currentUser.phone ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    const result = await updateCurrentUser({ fullName: tempName, email: tempEmail, phone: tempPhone });
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Bilgiler kaydedilemedi.');
      return;
    }
    setIsEditing(false);
    Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', t.save);
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri erişim izni vermeniz gerekmektedir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      await updateCurrentUser({ avatarUri: result.assets[0].uri });
    }
  };

  const handleRestorePurchases = async () => {
    const result = await restorePurchases();
    if (result.success) {
      Alert.alert('MotorKarne', 'Aboneliğiniz başarıyla geri yüklendi.');
    } else {
      Alert.alert('MotorKarne', result.error ?? 'Geri yüklenecek bir satın alma bulunamadı.');
    }
  };

  const handleLogout = () => {
    confirmAction(
      t.logout,
      language === 'tr' ? 'Çıkış yapmak istediğinize emin misiniz?' : 'Are you sure you want to log out?',
      async () => {
        await logout();
        setIsEditing(false);
      },
      { confirmText: t.logout, cancelText: t.cancel }
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      'Hesabı Sil',
      'Hesabınız ve tüm bilgileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?',
      async () => {
        // ÖNEMLİ: MembersContext.deleteAccount() yalnızca üye kaydını (ad/e-posta/
        // şifre) siler — favoriler, karşılaştırmalar, bakım kayıtları, bildirimler,
        // ödüllü reklam bonusu, yerel abonelik önbelleği ve yorumlar AYRI context'lerde
        // hesap id'sine göre saklanıyor. Bunlar temizlenmezse gizlilik politikasının
        // vaat ettiğinin aksine (bkz. docs/delete-account.html) hesap "silindikten"
        // sonra da cihazda öksüz veri olarak kalırdı. Bu yüzden hepsi, currentUser
        // hâlâ geçerliyken (aşağıdaki deleteAccount() çağrısından ÖNCE) tek tek
        // temizleniyor.
        if (currentUser) {
          clearFavorites();
          clearMaintenance();
          clearNotifications();
          clearRewardedBonus();
          clearLocalAdFreeCache();
          deleteReviewsByUser(currentUser.id);
        }
        await deleteAccount();
        setIsEditing(false);
      },
      { confirmText: 'Hesabımı Sil', cancelText: t.cancel }
    );
  };

  const handleExportData = async () => {
    const myReviews = currentUser ? reviews.filter((r) => r.userId === currentUser.id) : [];
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile: currentUser
        ? {
            fullName: currentUser.fullName,
            email: currentUser.email,
            phone: currentUser.phone ?? null,
            createdAt: currentUser.createdAt,
          }
        : null,
      savedVehicles,
      savedComparisons,
      myReviews,
    };

    try {
      await Share.share({
        title: 'MotorKarne Verilerim',
        message: JSON.stringify(exportPayload, null, 2),
      });
    } catch (e) {
      Alert.alert('MotorKarne', 'Veriler dışa aktarılırken bir sorun oluştu.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
              <ArrowLeft size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{t.profile}</Text>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Pressable
                style={s.langBtn}
                onPress={() => toggleLanguage()}
                accessibilityRole="button"
                accessibilityLabel="Dili değiştir"
              >
                <Globe size={14} color={colors.primary} />
                <Text style={s.langText}>{language.toUpperCase()}</Text>
              </Pressable>

              <Pressable
                style={s.iconBtn}
                onPress={() => toggleTheme()}
                accessibilityRole="button"
                accessibilityLabel={mode === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
              >
                {mode === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
              </Pressable>

              {currentUser && !isEditing && (
                <TouchableOpacity style={s.iconBtn} onPress={handleStartEdit} accessibilityRole="button" accessibilityLabel="Profili düzenle">
                  <Edit3 size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {currentUser ? (
            <>
              {/* Profil Fotoğrafı */}
              <View style={s.avatarContainer}>
                <View style={s.avatarWrapper}>
                  <Image source={{ uri: currentUser.avatarUri ?? DEFAULT_AVATAR }} style={s.avatarImage} />
                  <TouchableOpacity style={s.cameraBtn} onPress={handlePickAvatar} accessibilityRole="button" accessibilityLabel="Profil fotoğrafını değiştir">
                    <Camera size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={s.profileName}>{currentUser.fullName}</Text>
                <Text style={s.profileSub}>{mode === 'dark' ? t.darkModeActive : t.lightModeActive}</Text>
              </View>

              <AdFreeCard />

              {/* Form Kartı */}
              <View style={s.formCard}>
                <Text style={s.cardTitle}>{t.personalInfo}</Text>

                <View style={s.fieldGroup}>
                  <Text style={s.label}>{t.fullName}</Text>
                  <View style={[s.inputBox, isEditing && s.inputBoxActive]}>
                    <User size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={s.input}
                      value={isEditing ? tempName : currentUser.fullName}
                      onChangeText={setTempName}
                      editable={isEditing}
                    />
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.label}>{t.email}</Text>
                  <View style={[s.inputBox, isEditing && s.inputBoxActive]}>
                    <Mail size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={s.input}
                      value={isEditing ? tempEmail : currentUser.email}
                      onChangeText={setTempEmail}
                      editable={isEditing}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.label}>{t.phone}</Text>
                  <View style={[s.inputBox, isEditing && s.inputBoxActive]}>
                    <Phone size={18} color={colors.mutedForeground} />
                    <TextInput
                      style={s.input}
                      value={isEditing ? tempPhone : currentUser.phone ?? ''}
                      onChangeText={setTempPhone}
                      editable={isEditing}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {isEditing && (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => setIsEditing(false)}>
                      <X size={16} color={colors.cardForeground} />
                      <Text style={s.cancelBtnText}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                      <Check size={16} color={colors.primaryForeground} />
                      <Text style={s.saveBtnText}>{t.save}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={s.loggedOutBox}>
              <View style={s.loggedOutIcon}>
                <User size={28} color={colors.mutedForeground} />
              </View>
              <Text style={s.loggedOutTitle}>Giriş yapılmadı</Text>
              <Text style={s.loggedOutSub}>
                Profilinizi görüntülemek ve düzenlemek için giriş yapın ya da yeni bir üyelik oluşturun.
              </Text>
              <TouchableOpacity style={s.loginCta} onPress={() => nav.navigate('GirisYap')}>
                <LogIn size={18} color={colors.primaryForeground} />
                <Text style={s.loginCtaText}>Giriş Yap</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.signupCta} onPress={() => nav.navigate('KayitOl')}>
                <UserPlus size={18} color={colors.primary} />
                <Text style={s.signupCtaText}>Yeni Üye Kaydı</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Hızlı Menü */}
          <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 12 }}>
            <TouchableOpacity style={s.menuRow} onPress={() => nav.navigate('Kaydedilenler' as never)}>
              <Bookmark size={18} color={colors.primary} />
              <Text style={s.menuText}>{t.saved}</Text>
            </TouchableOpacity>

            {currentUser?.isAdmin && (
              <TouchableOpacity style={s.menuRow} onPress={() => nav.navigate('AdminPaneli' as never)}>
                <Shield size={18} color={colors.accent} />
                <Text style={s.menuText}>{t.admin}</Text>
              </TouchableOpacity>
            )}

            {currentUser ? (
              <>
                <TouchableOpacity
                  style={s.menuRow}
                  onPress={() => setPasswordModalOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Şifre değiştir"
                >
                  <KeyRound size={18} color={colors.primary} />
                  <Text style={s.menuText}>Şifre Değiştir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.menuRow}
                  onPress={handleExportData}
                  accessibilityRole="button"
                  accessibilityLabel="Verilerimi dışa aktar"
                >
                  <Download size={18} color={colors.primary} />
                  <Text style={s.menuText}>Verilerimi Dışa Aktar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.menuRow} onPress={handleRestorePurchases}>
                  <Crown size={18} color={colors.primary} />
                  <Text style={s.menuText}>Satın Alımları Geri Yükle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.dangerMenuRow} onPress={handleLogout}>
                  <LogOut size={18} color={colors.destructive} />
                  <Text style={s.dangerMenuText}>{t.logout}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.dangerMenuRow} onPress={handleDeleteAccount}>
                  <Trash2 size={18} color={colors.destructive} />
                  <Text style={s.dangerMenuText}>Hesabımı Sil</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={s.menuRow} onPress={() => nav.navigate('GirisYap')}>
                <LogIn size={18} color={colors.primary} />
                <Text style={s.menuText}>Giriş Yap</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.menuRow} onPress={() => nav.navigate('GorselKaynaklari')}>
              <ImageIcon size={18} color={colors.mutedForeground} />
              <Text style={s.menuText}>Görsel Kaynakları</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.menuRow} onPress={() => nav.navigate('Hakkinda')}>
              <Info size={18} color={colors.mutedForeground} />
              <Text style={s.menuText}>Hakkında</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity style={s.scrollTopBtn} onPress={scrollToTop}
            accessibilityRole="button"
            accessibilityLabel="Yukarı kaydır" activeOpacity={0.8}>
            <ArrowUp size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={passwordModalOpen} animationType="slide" transparent onRequestClose={closePasswordModal}>
        <View style={s.pwModalOverlay}>
          <View style={s.pwModalSheet}>
            <View style={s.pwModalHeader}>
              <Text style={s.pwModalTitle}>Şifre Değiştir</Text>
              <TouchableOpacity style={s.pwModalCloseBtn} onPress={closePasswordModal}>
                <X size={18} color={colors.cardForeground} />
              </TouchableOpacity>
            </View>

            <Text style={s.pwLabel}>Mevcut Şifre</Text>
            <TextInput
              style={s.pwInput}
              value={currentPasswordInput}
              onChangeText={setCurrentPasswordInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              placeholder="Mevcut şifreniz"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[s.pwLabel, { marginTop: 14 }]}>Yeni Şifre</Text>
            <TextInput
              style={s.pwInput}
              value={newPasswordInput}
              onChangeText={setNewPasswordInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[s.pwLabel, { marginTop: 14 }]}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={s.pwInput}
              value={confirmPasswordInput}
              onChangeText={setConfirmPasswordInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              placeholder="Yeni şifrenizi tekrar girin"
              placeholderTextColor={colors.mutedForeground}
            />

            <TouchableOpacity style={s.pwSaveBtn} onPress={handleChangePassword}>
              <Text style={s.pwSaveBtnText}>Şifreyi Güncelle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    langBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    langText: { fontFamily: fonts.body.bold, fontSize: 12, color: colors.foreground },
    avatarContainer: { alignItems: 'center', marginVertical: 20 },
    avatarWrapper: { position: 'relative' },
    avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.primary },
    cameraBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: colors.primary,
      borderColor: colors.background,
    },
    profileName: { fontFamily: fonts.heading.bold, fontSize: 18, marginTop: 12, color: colors.foreground },
    profileSub: { fontSize: 12, marginTop: 2, color: colors.mutedForeground },
    formCard: {
      marginHorizontal: 20,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
    },
    cardTitle: { fontFamily: fonts.heading.bold, fontSize: 16, marginBottom: 16, color: colors.foreground },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 12, fontFamily: fonts.body.semibold, marginBottom: 6, color: colors.mutedForeground },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 48,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
    },
    inputBoxActive: { borderColor: colors.primary },
    input: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    cancelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    cancelBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.cardForeground },
    saveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: radius,
      backgroundColor: colors.primary,
    },
    saveBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    menuRow: {
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
    menuText: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
    dangerMenuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: rgba(colors.destructive, 0.3),
      backgroundColor: colors.card,
    },
    dangerMenuText: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.destructive },
    loggedOutBox: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 24,
      alignItems: 'center',
    },
    loggedOutIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: rgba(colors.mutedForeground, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    loggedOutTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
    loggedOutSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 18,
      lineHeight: 19,
    },
    loginCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 48,
      borderRadius: radius,
      backgroundColor: colors.primary,
      width: '100%',
    },
    loginCtaText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    signupCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 48,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 10,
      width: '100%',
    },
    signupCtaText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primary },
    scrollTopBtn: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 99,
    },
    pwModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pwModalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
    },
    pwModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    pwModalTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground },
    pwModalCloseBtn: {
      width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    },
    pwLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
    pwInput: {
      marginTop: 6, height: 46, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.input, paddingHorizontal: 14, fontSize: 14, color: colors.foreground,
    },
    pwSaveBtn: {
      marginTop: 20, borderRadius: radius, backgroundColor: colors.primary,
      paddingVertical: 14, alignItems: 'center',
    },
    pwSaveBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  });
