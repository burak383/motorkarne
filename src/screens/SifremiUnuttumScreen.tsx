import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useMembers } from '../state/MembersContext';

type Nav = NativeStackNavigationProp<any>;

export default function SifremiUnuttumScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { resetPassword, isEmailTaken } = useMembers();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleVerifyEmail = () => {
    if (!isEmailTaken(email)) {
      Alert.alert('MotorKarne', 'Bu e-posta adresiyle kayıtlı bir üyelik bulunamadı.');
      return;
    }
    setEmailVerified(true);
  };

  const handleReset = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('MotorKarne', 'Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }
    const result = resetPassword(email, newPassword);
    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Şifre sıfırlanamadı.');
      return;
    }
    Alert.alert('MotorKarne', 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.', [
      { text: 'Tamam', onPress: () => nav.navigate('GirisYap') },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Şifremi Unuttum</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.introIconBox}>
            <KeyRound size={26} color={colors.primary} />
          </View>
          <Text style={s.introTitle}>Şifrenizi Sıfırlayın</Text>
          <Text style={s.introSub}>
            {emailVerified
              ? 'Hesabınız doğrulandı. Şimdi yeni bir şifre belirleyin.'
              : 'Kayıtlı e-posta adresinizi girin, hesabınızı doğrulayalım.'}
          </Text>
        </View>

        <View style={s.formCard}>
          <View style={s.fieldGroup}>
            <Text style={s.label}>E-Posta</Text>
            <View style={[s.inputBox, emailVerified && s.inputBoxDisabled]}>
              <Mail size={18} color={colors.mutedForeground} />
              <TextInput
                style={s.input}
                placeholder="ornek@eposta.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!emailVerified}
              />
            </View>
          </View>

          {!emailVerified ? (
            <TouchableOpacity style={s.actionBtn} onPress={handleVerifyEmail}>
              <Text style={s.actionBtnText}>Hesabımı Doğrula</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={s.fieldGroup}>
                <Text style={s.label}>Yeni Şifre</Text>
                <View style={s.inputBox}>
                  <Lock size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={s.input}
                    placeholder="En az 6 karakter"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
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
                <Text style={s.label}>Yeni Şifre Tekrar</Text>
                <View style={s.inputBox}>
                  <Lock size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={s.input}
                    placeholder="Şifrenizi tekrar girin"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>

              <TouchableOpacity style={s.actionBtn} onPress={handleReset}>
                <Text style={s.actionBtnText}>Şifreyi Güncelle</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={s.switchLink} onPress={() => nav.navigate('GirisYap')}>
            <Text style={s.switchLinkText}>Giriş ekranına dön</Text>
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
    inputBoxDisabled: { opacity: 0.6 },
    input: { flex: 1, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.foreground },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 50,
      borderRadius: radius,
      backgroundColor: colors.primary,
      marginTop: 4,
    },
    actionBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    switchLink: { alignItems: 'center', marginTop: 14 },
    switchLinkText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  });
