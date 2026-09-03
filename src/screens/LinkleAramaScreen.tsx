import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Link2, AlertCircle, ChevronRight, Search } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useCatalog } from '../state/CatalogContext';
import { useVehicles } from '../state/VehicleContext';
import { getRiskInfo } from '../utils/risk';
import { parseListingText, fetchListingText, looksLikeUrl, type ParsedListingInfo } from '../utils/listingParser';
import type { Motor } from '../data/catalog';

type Nav = NativeStackNavigationProp<any>;

export default function LinkleAramaScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { searchMotors, getMotorById } = useCatalog();
  const { searchVehicles } = useVehicles();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedListingInfo | null>(null);
  const [modelMotors, setModelMotors] = useState<Motor[]>([]);
  const [candidates, setCandidates] = useState<Motor[]>([]);
  const [searched, setSearched] = useState(false);

  // İlandan çıkarılan araç MODELİNE göre (marka + model adı, ör. "Ford Focus"
  // ya da BMW'de rozet "320i") katalogdaki `vehicles` listesinden bu modele
  // ait araç kayıtlarını bulup, onların bağlı olduğu motorları getirir. Bu,
  // sadece marka + hacim/kod eşleştirmesine (rankCandidates) göre çok daha
  // isabetli — çünkü doğrudan "bu model gerçekte hangi motorları kullandı"
  // bilgisine (vehicles tablosundaki motorId bağlantılarına) dayanıyor.
  const findModelMotors = (info: ParsedListingInfo): Motor[] => {
    if (!info.brand || !info.model) return [];
    const brandLower = info.brand.toLowerCase();
    const matches = searchVehicles(info.model).filter((v) => v.brand.toLowerCase() === brandLower);
    const motorIds = Array.from(new Set(matches.map((v) => v.motorId).filter(Boolean)));
    return motorIds.map((id) => getMotorById(id)).filter((m): m is Motor => !!m);
  };

  const rankCandidates = (info: ParsedListingInfo, exclude: Set<string> = new Set()): Motor[] => {
    const brandQuery = info.brand ?? '';
    let pool = brandQuery ? searchMotors(brandQuery) : [];
    if (pool.length === 0 && info.engineHint) {
      pool = searchMotors(info.engineHint);
    }
    pool = pool.filter((m) => !exclude.has(m.id));

    const hint = (info.engineHint ?? '').toLowerCase();
    const fuel = (info.fuel ?? '').toLowerCase();

    const scored = pool.map((m) => {
      let rank = 0;
      const nameCode = `${m.name} ${m.code}`.toLowerCase();
      if (hint && nameCode.includes(hint.split(' ')[0])) rank += 2;
      if (hint && nameCode.includes(hint)) rank += 3;
      if (fuel && m.fuel.toLowerCase().includes(fuel)) rank += 2;
      return { m, rank };
    });

    scored.sort((a, b) => b.rank - a.rank || b.m.score - a.m.score);
    return scored.slice(0, 6).map((x) => x.m);
  };

  const handleAnalyze = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    setParsed(null);
    setModelMotors([]);
    setCandidates([]);
    setSearched(true);

    let textToParse = trimmed;

    if (looksLikeUrl(trimmed)) {
      const result = await fetchListingText(trimmed);
      if (result.success && result.text) {
        textToParse = result.text;
      } else {
        setErrorMsg(
          `${result.error ?? 'Bu siteye otomatik erişim şu an mümkün değil.'} sahibinden.com gibi siteler otomatik erişimi engelliyor olabilir (arabam.com genelde çalışır) — ilan sayfasındaki başlık, fiyat, km, yıl ve motor bilgisini kopyalayıp aynı kutuya yapıştırıp tekrar dene.`
        );
        setLoading(false);
        return;
      }
    }

    const info = parseListingText(textToParse);
    setParsed(info);
    const modelMatches = findModelMotors(info);
    setModelMotors(modelMatches);
    setCandidates(rankCandidates(info, new Set(modelMatches.map((m) => m.id))));
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
          <ArrowLeft size={20} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>İlan Linkinden Ara</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.inputBox}>
          <Link2 size={16} color={colors.mutedForeground} />
          <TextInput
            style={s.textInput}
            placeholder="arabam.com ilan linkini, sahibinden.com ilan metnini veya herhangi bir ilan linkini/metnini buraya yapıştırın"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={s.analyzeBtn} onPress={handleAnalyze} disabled={loading || !input.trim()}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Search size={16} color={colors.primaryForeground} />
              <Text style={s.analyzeBtnText}>Bilgileri Getir</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.hintText}>
          Not: arabam.com gibi bazı ilan siteleri linkten doğrudan çekilebiliyor. sahibinden.com ise otomatik (bot)
          erişimi genelde engelliyor. Link çekimi başarısız olursa, ilan sayfasındaki başlık/fiyat/km/yıl/motor
          bilgisini kopyalayıp aynı kutuya yapıştır — sonuç aynı şekilde işlenir.
        </Text>

        {errorMsg && (
          <View style={s.errorBox}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text style={s.errorText}>{errorMsg}</Text>
          </View>
        )}

        {parsed && (
          <View style={s.parsedCard}>
            <Text style={s.parsedCardTitle}>Ayrıştırılan İlan Bilgisi</Text>
            <View style={s.chipRow}>
              {parsed.brand && <Chip label={parsed.brand} colors={colors} />}
              {parsed.model && <Chip label={parsed.model} colors={colors} />}
              {parsed.engineHint && <Chip label={parsed.engineHint} colors={colors} />}
              {parsed.fuel && <Chip label={parsed.fuel} colors={colors} />}
              {parsed.transmission && <Chip label={parsed.transmission} colors={colors} />}
              {parsed.year && <Chip label={parsed.year} colors={colors} />}
              {parsed.km && <Chip label={parsed.km} colors={colors} />}
              {parsed.price && <Chip label={parsed.price} colors={colors} />}
            </View>
            {!parsed.brand && !parsed.engineHint && (
              <Text style={s.parsedWarning}>
                Marka veya motor bilgisi net şekilde tespit edilemedi. İlan metnindeki motor/marka bilgisinin (örn.
                "BMW 320i" veya "1.6 TDI") metinde net görünür olduğundan emin ol.
              </Text>
            )}
          </View>
        )}

        {modelMotors.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={s.sectionTitle}>
              {parsed?.brand} {parsed?.model} İçin Katalogdaki Motorlar
            </Text>
            <Text style={s.sectionSubtitle}>
              Bu, sadece hacim/yakıt eşleştirmesi değil — katalogda bu modelin gerçekte kullandığı kayıtlı motorlar.
              Aynı model birden fazla motor seçeneğiyle satıldıysa hepsi listelenir, ilanındaki motor koduna en yakın
              olanı seç.
            </Text>
            {modelMotors.map((m) => (
              <MotorCard key={m.id} m={m} colors={colors} s={s} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: m.id })} />
            ))}
          </View>
        )}

        {candidates.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={s.sectionTitle}>{modelMotors.length > 0 ? 'Diğer Olası Eşleşmeler' : 'Eşleşen Olası Motorlar'}</Text>
            <Text style={s.sectionSubtitle}>
              İlan bilgisine göre marka/hacim/yakıt eşleştirmesiyle bulunan olası motorlar; kesin model yılına göre
              farklılık gösterebilir, sana en yakın olanı seç.
            </Text>
            {candidates.map((m) => (
              <MotorCard key={m.id} m={m} colors={colors} s={s} onPress={() => nav.navigate('MotorVeAracDetay', { motorId: m.id })} />
            ))}
          </View>
        )}

        {searched && !loading && !errorMsg && candidates.length === 0 && modelMotors.length === 0 && parsed && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>
              Katalogda eşleşen bir motor bulunamadı. Marka, model ve motor bilgisini (örn. "Ford Focus 1.6 TDI",
              "BMW 320i") içeren daha net bir metin yapıştırmayı dene.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={{ backgroundColor: rgba(colors.primary, 0.12), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 6, marginBottom: 6 }}>
      <Text style={{ color: colors.primary, fontFamily: fonts.body.semibold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function MotorCard({ m, colors, s, onPress }: { m: Motor; colors: any; s: any; onPress: () => void }) {
  const riskInfo = getRiskInfo(m.score);
  const riskColor = colors[riskInfo.colorKey as keyof typeof colors] as string;
  return (
    <TouchableOpacity style={s.candidateCard} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={s.candidateName}>{m.name}</Text>
        <Text style={s.candidateMeta}>
          {m.brands.join(', ')} · {m.fuel} · {m.transmission}
        </Text>
        <View style={[s.riskPill, { backgroundColor: rgba(riskColor, 0.15) }]}>
          <Text style={[s.riskPillText, { color: riskColor }]}>{m.risk}</Text>
        </View>
      </View>
      <ChevronRight size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: fonts.heading.bold,
      fontSize: 17,
      color: colors.cardForeground,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      minHeight: 110,
    },
    textInput: {
      flex: 1,
      color: colors.cardForeground,
      fontFamily: fonts.body.regular,
      fontSize: 14,
      minHeight: 90,
    },
    analyzeBtn: {
      marginTop: 14,
      backgroundColor: colors.primary,
      borderRadius: radius,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    analyzeBtnText: {
      color: colors.primaryForeground,
      fontFamily: fonts.body.bold,
      fontSize: 14,
    },
    hintText: {
      marginTop: 12,
      color: colors.mutedForeground,
      fontFamily: fonts.body.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    errorBox: {
      marginTop: 16,
      flexDirection: 'row',
      gap: 8,
      backgroundColor: rgba(colors.destructive, 0.1),
      borderRadius: radius,
      padding: 12,
      alignItems: 'flex-start',
    },
    errorText: {
      flex: 1,
      color: colors.destructive,
      fontFamily: fonts.body.regular,
      fontSize: 13,
      lineHeight: 18,
    },
    parsedCard: {
      marginTop: 20,
      backgroundColor: colors.card,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    parsedCardTitle: {
      fontFamily: fonts.body.bold,
      fontSize: 14,
      color: colors.cardForeground,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    parsedWarning: {
      marginTop: 4,
      color: colors.mutedForeground,
      fontFamily: fonts.body.regular,
      fontSize: 12,
      lineHeight: 18,
    },
    sectionTitle: {
      fontFamily: fonts.heading.bold,
      fontSize: 16,
      color: colors.cardForeground,
      marginBottom: 4,
    },
    sectionSubtitle: {
      color: colors.mutedForeground,
      fontFamily: fonts.body.regular,
      fontSize: 12,
      marginBottom: 12,
      lineHeight: 18,
    },
    candidateCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    candidateName: {
      fontFamily: fonts.body.bold,
      fontSize: 14,
      color: colors.cardForeground,
    },
    candidateMeta: {
      fontFamily: fonts.body.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
      marginBottom: 6,
    },
    riskPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    riskPillText: {
      fontFamily: fonts.body.semibold,
      fontSize: 11,
    },
    emptyBox: {
      marginTop: 20,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.mutedForeground,
      fontFamily: fonts.body.regular,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
