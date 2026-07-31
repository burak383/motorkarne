import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
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
  Users,
  ArrowUp,
  Check,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMembers } from '../state/MembersContext';

type Nav = NativeStackNavigationProp<any>;

export default function KayitOlScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { language, t } = useLanguage();
  const { members, registerMember } = useMembers();

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

  const handleRegister = () => {
    if (!consentAccepted) {
      Alert.alert('MotorKarne', 'Devam etmek için Gizlilik Politikası ve KVKK Aydınlatma Metni\'ni onaylamanız gerekir.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('MotorKarne', 'Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    const result = registerMember({ fullName, email, phone, password });

    if (!result.success) {
      Alert.alert('MotorKarne', result.error ?? 'Kayıt oluşturulamadı.');
      return;
    }

    Alert.alert(
      language === 'tr' ? 'Hoş geldiniz!' : 'Welcome!',
      language === 'tr'
        ? `${fullName.trim()}, üyeliğiniz başarıyla oluşturuldu.`
        : `${fullName.trim()}, your membership was created successfully.`,
      [{ text: 'Tamam', onPress: () => nav.navigate('Profil') }]
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
                  Gizlilik Politikası ve KVKK Aydınlatma Metni
                </Text>
                'ni okudum, kabul ediyorum.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.registerBtn} onPress={handleRegister}>
              <UserPlus size={18} color={colors.primaryForeground} />
              <Text style={s.registerBtnText}>{t.registerBtn}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.switchLink} onPress={() => nav.navigate('GirisYap')}>
              <Text style={s.switchLinkText}>{t.haveAccount}</Text>
            </TouchableOpacity>
          </View>

          {/* Kayıtlı üyeler */}
          {members.length > 0 && (
            <View style={s.membersSection}>
              <View style={s.membersHeader}>
                <Users size={16} color={colors.mutedForeground} />
                <Text style={s.membersTitle}>{t.registeredMembers} ({members.length})</Text>
              </View>
              <View style={s.membersList}>
                {members.map((m, i) => (
                  <View key={m.id} style={[s.memberRow, i < members.length - 1 && s.memberRowBorder]}>
                    <View style={s.memberAvatar}>
                      <Text style={s.memberAvatarText}>
                        {m.fullName.trim().charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>{m.fullName}</Text>
                      <Text style={s.memberMeta} numberOfLines={1}>
                        {m.email}
                        {m.phone ? ` • ${m.phone}` : ''}
                      </Text>
                    </View>
                    <Text style={s.memberDate}>{m.createdAt}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
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
    membersSection: { marginHorizontal: 20, marginTop: 24 },
    membersHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    membersTitle: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
    membersList: {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    memberRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: rgba(colors.primary, 0.15),
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarText: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.primary },
    memberName: { fontSize: 13, fontFamily: fonts.body.bold, color: colors.foreground },
    memberMeta: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    memberDate: { fontSize: 10, color: colors.mutedForeground },
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
