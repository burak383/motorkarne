import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { notifyThenProceed } from '../utils/confirm';
import {
  ArrowLeft, Factory, Settings2, CarFront, Upload,
  CheckCircle2, AlertCircle, FileText, Link2, Save, ArrowUp, ShieldAlert,
} from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMembers } from '../state/MembersContext';
import RemoteImage from '../components/RemoteImage';

type Nav = NativeStackNavigationProp<any>;

const steps = [
  { icon: Factory, label: 'Marka', desc: 'Üretici profili' },
  { icon: Settings2, label: 'Motor ailesi', desc: 'Teknik kayıt' },
  { icon: CarFront, label: 'Model / kasa', desc: 'Versiyon tanımı' },
];

type ColorKey = 'primary' | 'accent' | 'success';

const formTypes: { key: string; label: string; icon: any; color: ColorKey }[] = [
  { key: 'marka', label: 'Marka', icon: Factory, color: 'primary' },
  { key: 'motor', label: 'Motor ailesi', icon: Settings2, color: 'accent' },
  { key: 'model', label: 'Model', icon: CarFront, color: 'success' },
];

const initialRecent: { name: string; desc: string; status: string; statusColor: ColorKey; time: string }[] = [
  { name: 'Renault Austral', desc: 'SUV • 1.3 TCe', status: 'Yayında', statusColor: 'success', time: 'Bugün, 09:42' },
  { name: 'Toyota M20A-FKS', desc: '2.0 Valvematic • 173 hp', status: 'İncelemede', statusColor: 'accent', time: 'Dün, 16:18' },
];

const fieldLabels: Record<string, { name: string; secondary: string; tertiary: string; namePh: string; secondaryPh: string; tertiaryPh: string }> = {
  marka: { name: 'Marka adı', secondary: 'Ülke', tertiary: 'Logo görseli', namePh: 'Örn: Renault', secondaryPh: 'Örn: Fransa', tertiaryPh: 'Görsel URL' },
  motor: { name: 'Motor kodu', secondary: 'Hacim (cc)', tertiary: 'Güç (hp)', namePh: 'Örn: K9K 1.5 dCi', secondaryPh: 'Örn: 1461', tertiaryPh: 'Örn: 110' },
  model: { name: 'Model adı', secondary: 'Kasa tipi', tertiary: 'Model yılı', namePh: 'Örn: Austral', secondaryPh: 'Örn: SUV', tertiaryPh: 'Örn: 2023–2025' },
};

export default function VeriYonetimiScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = useMembers();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [formType, setFormType] = useState('marka');
  const [recentEntries, setRecentEntries] = useState(initialRecent);
  const [fieldName, setFieldName] = useState('');
  const [fieldSecondary, setFieldSecondary] = useState('');
  const [fieldTertiary, setFieldTertiary] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);

  const handlePickFile = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Dosya seçebilmek için galeri erişim izni vermeniz gerekmektedir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadedImageUri(result.assets[0].uri);
    }
  };

  const currentFields = fieldLabels[formType];

  const resetForm = () => {
    setFieldName('');
    setFieldSecondary('');
    setFieldTertiary('');
    setSourceUrl('');
    setUploadedImageUri(null);
  };

  const handleFormTypeChange = (key: string) => {
    setFormType(key);
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    nav.navigate('AdminPaneli');
  };

  const handleSave = () => {
    if (!fieldName.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen zorunlu alanı doldurun.');
      return;
    }
    const typeLabel = formTypes.find((f) => f.key === formType)?.label ?? '';
    const desc = [fieldSecondary, fieldTertiary].filter(Boolean).join(' • ') || typeLabel;
    const newEntry = {
      name: fieldName.trim(),
      desc,
      status: 'İncelemede',
      statusColor: 'accent' as ColorKey,
      time: 'Az önce',
    };
    setRecentEntries((prev) => [newEntry, ...prev]);
    resetForm();
    notifyThenProceed(
      'Önizleme eklendi',
      `${newEntry.name} bu listeye eklendi, ancak hiçbir yere kalıcı olarak kaydedilmedi. Kalıcı eklemek için motorkarne-admin panelini kullanın.`,
      () => nav.navigate('AdminPaneli')
    );
  };

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

  if (!currentUser?.isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ShieldAlert size={40} color={colors.destructive} style={{ marginBottom: 16 }} />
          <Text
            style={{
              fontFamily: fonts.heading.bold,
              fontSize: 18,
              color: colors.foreground,
              textAlign: 'center',
            }}
          >
            Erişim Yetkiniz Yok
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 19,
            }}
          >
            Bu sayfayı görüntülemek için yönetici hesabıyla giriş yapmanız gerekir.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              height: 48,
              paddingHorizontal: 24,
              borderRadius: radius,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => nav.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Geri Dön"
          >
            <Text style={{ fontFamily: fonts.body.bold, fontSize: 14, color: colors.primaryForeground }}>
              Geri Dön
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => nav.navigate('AdminPaneli')}
              accessibilityRole="button"
              accessibilityLabel="Geri"
            >
              <ArrowLeft size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>{t.dataEntryEyebrow}</Text>
              <Text style={s.title}>{t.dataManagementTitle}</Text>
            </View>
          </View>

          {/* UYARI: Bu formdaki "Kaydet" işlemi hiçbir yere (ne cihaz depolamasına ne
              backend'e) kalıcı yazmıyor — yalnızca bu ekranın altındaki "Son Eklenenler"
              listesini bu oturum için güncelliyor. Kalıcı katalog değişikliği için
              motorkarne-admin (harici masaüstü panel) kullanılmalı. */}
          <View style={{ marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <ShieldAlert size={18} color={colors.accent} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.mutedForeground }}>
              Buradaki "Kaydet" yalnızca bir önizleme oluşturur; hiçbir yere kalıcı olarak
              yazılmaz ve uygulamayı kapattığında kaybolur. Kalıcı katalog değişikliği için
              motorkarne-admin panelini kullanın.
            </Text>
          </View>

          {/* Stepper */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={s.stepperCard}>
              {steps.map((st, i) => {
                const Icon = st.icon;
                return (
                  <View key={st.label} style={s.stepItem}>
                    <View style={[s.stepIcon, i === 0 && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      <Icon size={18} color={i === 0 ? colors.primaryForeground : colors.mutedForeground} />
                    </View>
                    <View style={{ marginTop: 8 }}>
                      <Text style={[s.stepLabel, i === 0 && { color: colors.foreground }]}>{st.label}</Text>
                      <Text style={s.stepDesc}>{st.desc}</Text>
                    </View>
                    {i < steps.length - 1 && <View style={s.stepConnector} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Form type tabs */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={s.tabRow}>
              {formTypes.map((f) => {
                const Icon = f.icon;
                const active = formType === f.key;
                const fColor = colors[f.color];
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.tabBtn, active && { backgroundColor: rgba(fColor, 0.15), borderColor: fColor }]}
                    onPress={() => handleFormTypeChange(f.key)}
                  >
                    <Icon size={16} color={active ? fColor : colors.mutedForeground} />
                    <Text style={[s.tabBtnText, active && { color: fColor }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Form fields */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={s.formCard}>
              <Text style={s.formTitle}>{formType === 'marka' ? 'Marka Bilgileri' : formType === 'motor' ? 'Motor Ailesi Bilgileri' : 'Model Bilgileri'}</Text>

              {/* Field: Name */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>{currentFields.name}</Text>
                <View style={s.fieldInput}>
                  <TextInput
                    style={s.fieldPlaceholder}
                    placeholder={currentFields.namePh}
                    placeholderTextColor={colors.mutedForeground}
                    value={fieldName}
                    onChangeText={setFieldName}
                  />
                </View>
              </View>

              {/* Field: Country/Displacement */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>{currentFields.secondary}</Text>
                <View style={s.fieldInput}>
                  <TextInput
                    style={s.fieldPlaceholder}
                    placeholder={currentFields.secondaryPh}
                    placeholderTextColor={colors.mutedForeground}
                    value={fieldSecondary}
                    onChangeText={setFieldSecondary}
                  />
                </View>
              </View>

              {/* Field: Logo/Power/Year */}
              <View style={s.field}>
                <Text style={s.fieldLabel}>{currentFields.tertiary}</Text>
                <View style={s.fieldInput}>
                  <TextInput
                    style={s.fieldPlaceholder}
                    placeholder={currentFields.tertiaryPh}
                    placeholderTextColor={colors.mutedForeground}
                    value={fieldTertiary}
                    onChangeText={setFieldTertiary}
                  />
                </View>
              </View>

              {/* Upload zone */}
              <TouchableOpacity style={s.uploadZone} onPress={handlePickFile}>
                {uploadedImageUri ? (
                  <>
                    <RemoteImage uri={uploadedImageUri} style={s.uploadPreview} resizeMode="cover" />
                    <Text style={s.uploadDesc}>Değiştirmek için dokunun</Text>
                  </>
                ) : (
                  <>
                    <View style={s.uploadIconBox}>
                      <Upload size={20} color={colors.mutedForeground} />
                    </View>
                    <Text style={s.uploadTitle}>Dosya yükle</Text>
                    <Text style={s.uploadDesc}>Görsel seçmek için dokunun</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Source meta */}
              <View style={s.sourceBox}>
                <View style={s.sourceRow}>
                  <Link2 size={16} color={colors.primary} />
                  <Text style={s.sourceLabel}>Kaynak bağlantısı</Text>
                </View>
                <View style={s.sourceInput}>
                  <TextInput
                    style={s.fieldPlaceholder}
                    placeholder="https://..."
                    placeholderTextColor={colors.mutedForeground}
                    value={sourceUrl}
                    onChangeText={setSourceUrl}
                  />
                </View>
              </View>
            </View>

            {/* Save / cancel */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                <Text style={s.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Save size={16} color={colors.primaryForeground} />
                <Text style={s.saveBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent entries */}
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitleLg}>{t.recentRecordsTitle}</Text>
              <TouchableOpacity onPress={() => nav.navigate('AdminPaneli' as never)}>
                <Text style={s.seeAll}>Tümünü gör</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 12, marginTop: 12 }}>
              {recentEntries.map((r, idx) => (
                <View key={`${r.name}-${idx}`} style={s.recentCard}>
                  <View style={[s.recentIcon, { backgroundColor: rgba(colors.primary, 0.15) }]}>
                    <FileText size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentName}>{r.name}</Text>
                    <Text style={s.recentDesc}>{r.desc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} color={colors[r.statusColor]} />
                      <Text style={[s.recentStatus, { color: colors[r.statusColor] }]}>{r.status}</Text>
                    </View>
                    <Text style={s.recentTime}>{r.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Validation note */}
          <View style={s.validationBox}>
            <AlertCircle size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.validationTitle}>Doğrulama gerekli</Text>
              <Text style={s.validationDesc}>Yeni kayıtlar yayına alınmadan önce editör onayından geçer. Kaynak doğrulama süreci 24–48 saat sürebilir.</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontFamily: fonts.body.bold, color: colors.primary, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: fonts.heading.bold, fontSize: 20, color: colors.foreground, marginTop: 4 },
  stepperCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { flex: 1, position: 'relative' },
  stepIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 12, fontFamily: fonts.body.bold, color: colors.mutedForeground },
  stepDesc: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  stepConnector: { position: 'absolute', top: 18, left: '60%', right: '-40%', height: 1, backgroundColor: colors.border },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  tabBtnText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground },
  formCard: { borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  formTitle: { fontFamily: fonts.heading.bold, fontSize: 16, color: colors.foreground, marginBottom: 16 },
  field: { marginTop: 12 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground, marginBottom: 6 },
  fieldInput: { height: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 14, justifyContent: 'center' },
  fieldPlaceholder: { fontSize: 14, color: colors.mutedForeground },
  uploadZone: { marginTop: 16, borderRadius: radius, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: rgba(colors.muted, 0.5), paddingVertical: 24, alignItems: 'center' },
  uploadPreview: { width: 96, height: 72, borderRadius: 8, marginBottom: 8 },
  uploadIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground, marginTop: 12 },
  uploadDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  sourceBox: { marginTop: 16 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sourceLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.foreground },
  sourceInput: { height: 48, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 14, justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.cardForeground },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius, backgroundColor: colors.primary, paddingVertical: 14 },
  saveBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleLg: { fontFamily: fonts.heading.bold, fontSize: 18, color: colors.foreground },
  seeAll: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  recentIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground },
  recentDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  recentStatus: { fontSize: 10, fontFamily: fonts.body.bold },
  recentTime: { fontSize: 9, color: colors.mutedForeground, marginTop: 4 },
  validationBox: { marginHorizontal: 20, marginTop: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius, borderWidth: 1, borderColor: rgba(colors.accent, 0.3), backgroundColor: rgba(colors.accent, 0.1) },
  validationTitle: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.foreground },
  validationDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
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