import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowUp,
  Check,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMembers } from '../state/MembersContext';
import { useGoogleSignIn } from '../utils/socialAuth';
import { isGoogleAuthConfigured } from '../config/auth';
import { notifyThenProceed } from '../utils/confirm';

type Nav = NativeStackNavigationProp<any>;

export default function KayitOlScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { language, t } = useLanguage();
  const { registerMember, loginWithProvider } = useMembers();

  const handleSocialSuccess = async (profile: Parameters<typeof loginWithProvider>[0]) => {
    const result = await loginWithProvider(profile);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Giriş başarısız oldu.');
      return;
    }
    nav.navigate('Profil');
  };
  const handleSocialError = (message: string) => {
    Alert.alert('MotorKarne', message);
  };

  const { request: googleRequest, promptAsync: promptGoogle } = useGoogleSignIn(
    (profile) => handleSocialSuccess(profile),
    handleSocialError
  );

  const handleGooglePress = () => {
    if (!isGoogleAuthConfigured()) {
      Alert.alert('MotorKarne', 'Google ile giriş henüz yapılandırılmadı.');
      return;
    }
    promptGoogle();
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowScrollTop(e.nativeEvent.contentOffset.y > 200);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const handleRegister = async () => {
    if (!consentAccepted) {
      Alert.alert('MotorKarne', 'Devam etmek için Gizlilik Politikası, KVKK Aydınlatma Metni ve Kullanım Şartları\'nı onaylamanız gerekir.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('MotorKarne', 'Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    const result = await registerMember({ fullName, email, phone, password });

    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Kayıt oluşturulamadı.');
      return;
    }

    notifyThenProceed(
      language === 'tr' ? 'Hoş geldiniz!' : 'Welcome!',
      language === 'tr'
        ? `${fullName.trim()}, üyeliğiniz başarıyla oluşturuldu.`
        : `${fullName.trim()}, your membership was created successfully.`,
      () => nav.navigate('Profil')
    );

    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setConsentAccepted(false);
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
            <Text style={s.headerTitle}>{t.signupHeader}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={s.introBox}>
            <View style={s.introIconBox}>
              <UserPlus size={26} color={colors.primary} />
            </View>
            <Text style={s.introTitle}>{t.signupHeadline}</Text>
            <Text style={s.introSub}>
{t.signupSub}
            </Text>
          </View>

          {/* Form Kartı */}
          <View style={s.formCard}>
            <Text style={s.cardTitle}>{t.membershipInfo}</Text>

            <View style={s.fieldGroup}>
              <Text style={s.label}>{t.fullName}</Text>
              <View style={s.inputBox}>
                <User size={18} color={colors.mutedForeground} />
                <TextInput
                  style={s.input}
                  placeholder="Adınız Soyadınız"
                  placeholderTextColor={colors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>{t.email}</Text>
              <View style={s.inputBox}>
                <Mail size={18} color={colors.mutedForeground} />
                <TextInput
                  style={s.input}
                  placeholder="ornek@eposta.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>{t.phoneOptional}</Text>
              <View style={s.inputBox}>
                <Phone size={18} color={colors.mutedForeground} />
                <TextInput
                  style={s.input}
                  placeholder="+90 5xx xxx xx xx"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>{t.password}</Text>
              <View style={s.inputBox}>
                <Lock size={18} color={colors.mutedForeground} />
                <TextInput
                  style={s.input}
                  placeholder="En az 6 karakter"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  {showPassword ? (
                    <EyeOff size={18} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.label}>{t.confirmPassword}</Text>
              <View style={s.inputBox}>
                <Lock size={18} color={colors.mutedForeground} />
                <TextInput
                  style={s.input}
                  placeholder="Şifrenizi tekrar girin"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              style={s.consentRow}
              activeOpacity={0.8}
              onPress={() => setConsentAccepted((v) => !v)}
            >
              <View style={[s.checkbox, consentAccepted && s.checkboxChecked]}>
                {consentAccepted && <Check size={14} color={colors.primaryForeground} />}
              </View>
              <Text style={s.consentText}>
                <Text onPress={() => nav.navigate('GizlilikPolitikasi')} style={s.consentLink}>
                  Gizlilik Politikası, KVKK Aydınlatma Metni ve Kullanım Şartları
                </Text>
                'nı okudum, kabul ediyorum.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.registerBtn} onPress={handleRegister}>
              <UserPlus size={18} color={colors.primaryForeground} />
              <Text style={s.registerBtnText}>{t.registerBtn}</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>veya</Text>
              <View style={s.dividerLine} />
            </View>

            <TouchableOpacity
              style={[s.socialBtn, s.googleBtn]}
              onPress={handleGooglePress}
              disabled={!googleRequest}
            >
              <Text style={s.googleBtnText}>G</Text>
              <Text style={s.socialBtnText}>Google ile devam et</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.switchLink} onPress={() => nav.navigate('GirisYap')}>
              <Text style={s.switchLinkText}>{t.haveAccount}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity
            style={s.scrollTopBtn}
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
    introBox: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 20 },
    introIconBox: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    introTitle: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground, textAlign: 'center' },
    introSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 19,
    },
    formCard: {
      marginHorizontal: 20,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
    },
    cardTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground, marginBottom: 16 },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground, marginBottom: 6 },
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
    input: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
    consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    consentText: { flex: 1, fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
    consentLink: { color: colors.primary, fontFamily: fonts.body.semibold },
    registerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: radius,
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    registerBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    switchLink: { alignItems: 'center', marginTop: 14 },
    switchLinkText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body.semibold },
    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      height: 48,
      borderRadius: radius,
      marginTop: 10,
      borderWidth: 1,
    },
    googleBtn: { backgroundColor: colors.card, borderColor: colors.border },
    googleBtnText: { fontSize: 16, fontFamily: fonts.heading.bold, color: '#4285F4' },
    socialBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground },
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
  });
