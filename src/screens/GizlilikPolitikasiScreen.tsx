import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ShieldCheck, ExternalLink } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type Nav = NativeStackNavigationProp<any>;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Toplanan Bilgiler',
    body:
      'Üye olurken ad-soyad, e-posta adresi ve isteğe bağlı telefon numaranız MotorKarne\'nın sunucusunda ' +
      'güvenli şekilde saklanır; şifreniz asla düz metin olarak tutulmaz, geri döndürülemeyecek şekilde ' +
      '(hash\'lenerek) saklanır. MotorKarne bu bilgileri yalnızca hesabınızı oluşturmak, giriş yapmanızı ' +
      'sağlamak ve favori/karşılaştırma listelerinizi sizinle ilişkilendirmek için kullanır.',
  },
  {
    title: '2. Verilerin Saklanması',
    body:
      'Hesap bilgileriniz (ad, e-posta, telefon, şifre) MotorKarne\'nın kendi sunucusunda, şifrelenmiş bir ' +
      'bağlantı üzerinden saklanır; bu sayede farklı cihazlardan aynı hesapla giriş yapabilirsiniz. Profil ' +
      'fotoğrafınız ve reklamsız deneyim aboneliğinize dair yerel önbellek gibi bazı bilgiler ise yalnızca ' +
      'kullandığınız cihazda tutulur. Favoriler ve karşılaştırmalar cihazınızda saklanır. Verileriniz, ' +
      'yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.',
  },
  {
    title: '3. KVKK Kapsamında Haklarınız',
    body:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca; verilerinizin işlenip işlenmediğini öğrenme, ' +
      'işlenmişse buna ilişkin bilgi talep etme, verilerinizin düzeltilmesini veya silinmesini isteme haklarına sahipsiniz. ' +
      'Hesabınızı ve verilerinizi Profil ekranından istediğiniz zaman silebilirsiniz. Tam KVKK Aydınlatma Metni\'ne ' +
      'aşağıdaki bağlantıdan ulaşabilirsiniz.',
  },
  {
    title: '4. İletişim',
    body:
      'Verilerinizle ilgili sorularınız için uygulama içindeki "Hakkında" bölümünden bize ulaşabilirsiniz.',
  },
];

const FULL_DOCS = [
  { label: 'Gizlilik Politikası (tam metin)', url: 'https://burak383.github.io/motorkarne/privacy-policy.html' },
  { label: 'KVKK Aydınlatma Metni (tam metin)', url: 'https://burak383.github.io/motorkarne/kvkk-aydinlatma-metni.html' },
  { label: 'Kullanım Şartları', url: 'https://burak383.github.io/motorkarne/terms-of-service.html' },
];

export default function GizlilikPolitikasiScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gizlilik Politikası</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.introIconBox}>
            <ShieldCheck size={24} color={colors.primary} />
          </View>
          <Text style={s.introText}>
            Bu sayfa, MotorKarne'nin kişisel verilerinizi nasıl topladığını, sakladığını ve kullandığını
            özetler. Hukuki olarak eksiksiz metinlere aşağıdaki "Tam Metinler" bölümünden ulaşabilirsiniz.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {SECTIONS.map((sec) => (
            <View key={sec.title} style={s.card}>
              <Text style={s.cardTitle}>{sec.title}</Text>
              <Text style={s.cardBody}>{sec.body}</Text>
            </View>
          ))}

          <View style={s.card}>
            <Text style={s.cardTitle}>Tam Metinler</Text>
            <Text style={[s.cardBody, { marginBottom: 10 }]}>
              Yukarıdaki bölümler kısa bir özettir. Hukuki olarak eksiksiz metinlere aşağıdan ulaşabilirsiniz:
            </Text>
            {FULL_DOCS.map((doc) => (
              <TouchableOpacity
                key={doc.url}
                style={s.docLinkRow}
                onPress={() => Linking.openURL(doc.url)}
                accessibilityRole="button"
                accessibilityLabel={doc.label}
              >
                <Text style={s.docLinkText}>{doc.label}</Text>
                <ExternalLink size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
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
    introBox: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      alignItems: 'center',
    },
    introIconBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    introText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
    card: {
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    cardTitle: { fontFamily: fonts.body.bold, fontSize: 14, color: colors.foreground, marginBottom: 6 },
    cardBody: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20 },
    docLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    docLinkText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.primary, flex: 1 },
  });
