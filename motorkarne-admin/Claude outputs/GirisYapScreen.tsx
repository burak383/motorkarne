import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMembers } from '../state/MembersContext';
import { useGoogleSignIn, useAppleSignIn } from '../utils/socialAuth';
import { isGoogleAuthConfigured } from '../config/auth';

type Nav = NativeStackNavigationProp<any>;

export default function GirisYapScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors, mode } = useTheme();
  const { t } = useLanguage();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { login, loginWithProvider } = useMembers();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSocialSuccess = async (profile: Parameters<typeof loginWithProvider>[0]) => {
    const result = await loginWithProvider(profile);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? t.loginFailed);
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

  // Apple App Store İnceleme Kuralı 4.8: Google gibi üçüncü taraf bir giriş
  // servisi sunuluyorsa, "Sign in with Apple" da eşdeğer bir seçenek olarak
  // sunulmak ZORUNDA — bu yüzden sadece iOS'ta gösteriliyor (Android'de
  // expo-apple-authentication zaten kullanılamaz).
  const { promptAsync: promptApple } = useAppleSignIn(
    (profile) => handleSocialSuccess(profile),
    handleSocialError
  );

  const handleLogin = async () => {
    const result = await login(email, password);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? t.loginFailed);
      return;
    }
    nav.navigate('Profil');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t.loginHeader}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.introIconBox}>
            <LogIn size={26} color={colors.primary} />
          </View>
          <Text style={s.introTitle}>{t.loginHeadline}</Text>
          <Text style={s.introSub}>{t.loginSub}</Text>
        </View>

        <View style={s.formCard}>
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
            <Text style={s.label}>{t.password}</Text>
            <View style={s.inputBox}>
              <Lock size={18} color={colors.mutedForeground} />
              <TextInput
                style={s.input}
                placeholder="Şifreniz"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
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

          <TouchableOpacity style={s.loginBtn} onPress={handleLogin}>
            <LogIn size={18} color={colors.primaryForeground} />
            <Text style={s.loginBtnText}>{t.loginBtn}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.forgotLink} onPress={() => nav.navigate('SifremiUnuttum')}>
            <Text style={s.forgotLinkText}>Şifremi Unuttum</Text>
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

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                mode === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius}
              style={s.appleBtn}
              onPress={promptApple}
            />
          )}

          <TouchableOpacity style={s.switchLink} onPress={() => nav.navigate('KayitOl')}>
            <Text style={s.switchLinkText}>{t.noAccount}</Text>
          </TouchableOpacity>
        </View>
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
    loginBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: radius,
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    loginBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    switchLink: { alignItems: 'center', marginTop: 14 },
    switchLinkText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
    forgotLink: { alignItems: 'center', marginTop: 12 },
    forgotLinkText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
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
    appleBtn: { height: 48, borderRadius: radius, marginTop: 10 },
  });
