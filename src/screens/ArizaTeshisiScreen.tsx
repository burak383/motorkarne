import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Stethoscope, Search, ChevronRight, AlertTriangle, Info } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useCatalog } from '../state/CatalogContext';
import { SYMPTOMS, findMatchingIssues, findMatchingIssuesFreeText, type DiagnosisMatch } from '../utils/diagnosis';

type Nav = NativeStackNavigationProp<any>;

export default function ArizaTeshisiScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { motors } = useCatalog();

  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const results: DiagnosisMatch[] = useMemo(() => {
    if (freeText.trim().length > 0) {
      return findMatchingIssuesFreeText(freeText, motors);
    }
    if (selectedSymptomId) {
      const symptom = SYMPTOMS.find((s2) => s2.id === selectedSymptomId);
      if (symptom) return findMatchingIssues(symptom.keywords, motors);
    }
    return [];
  }, [selectedSymptomId, freeText, motors]);

  const hasSearched = selectedSymptomId !== null || freeText.trim().length > 0;

  const handleSelectSymptom = (id: string) => {
    setFreeText('');
    setSelectedSymptomId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Arıza Teşhisi</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.introBox}>
          <View style={s.introIconBox}>
            <Stethoscope size={24} color={colors.primary} />
          </View>
          <Text style={s.introText}>
            Aracınızda fark ettiğiniz bir belirtiyi seçin veya yazın; hangi motorların bu belirtiyle
            ilişkili bilinen bir kronik sorunu olduğunu gösterelim.
          </Text>
        </View>

        {/* Free text search */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={s.searchBox}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              style={s.searchInput}
              placeholder="örn. tıkırtı sesi, yağ kaçağı, ısınma..."
              placeholderTextColor={colors.mutedForeground}
              value={freeText}
              onChangeText={(t) => {
                setFreeText(t);
                if (t.trim().length > 0) setSelectedSymptomId(null);
              }}
            />
          </View>
        </View>

        {/* Symptom chips */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Text style={s.sectionLabel}>Ya da yaygın bir belirti seçin</Text>
          <View style={s.chipWrap}>
            {SYMPTOMS.map((symptom) => (
              <TouchableOpacity
                key={symptom.id}
                style={[s.chip, selectedSymptomId === symptom.id && s.chipActive]}
                onPress={() => handleSelectSymptom(symptom.id)}
              >
                <Text style={[s.chipText, selectedSymptomId === symptom.id && s.chipTextActive]}>
                  {symptom.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          {!hasSearched ? (
            <View style={s.emptyBox}>
              <Info size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
              <Text style={s.emptyText}>Bir belirti seçtiğinizde veya yazdığınızda sonuçlar burada görünecek.</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={s.emptyBox}>
              <Info size={24} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
              <Text style={s.emptyText}>
                Bu belirtiyle eşleşen bilinen bir kronik sorun bulunamadı. Bu, sorunun nadir olduğu
                anlamına gelebilir; yine de bir yetkili servise danışmanız önerilir.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.resultsCount}>{results.length} eşleşme bulundu</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {results.map((m, i) => (
                  <TouchableOpacity
                    key={`${m.motor.id}-${m.issue.title}-${i}`}
                    style={s.resultCard}
                    onPress={() => nav.navigate('MotorVeAracDetay', { motorId: m.motor.id })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} color={colors.chart3} />
                      <Text style={s.resultMotorName} numberOfLines={1}>{m.motor.name}</Text>
                    </View>
                    <Text style={s.resultIssueTitle}>{m.issue.title}</Text>
                    <Text style={s.resultIssueDesc} numberOfLines={3}>{m.issue.desc}</Text>
                    <View style={s.resultFooter}>
                      <View style={[s.riskPill, { backgroundColor: rgba(colors.chart3, 0.15) }]}>
                        <Text style={[s.riskPillText, { color: colors.chart3 }]}>{m.issue.risk}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.detailLink}>Detaya git</Text>
                        <ChevronRight size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <Text style={s.disclaimer}>
          Bu araç yalnızca bilgilendirme amaçlıdır ve kesin bir teşhis değildir. Aracınızda ciddi bir
          belirti fark ederseniz mutlaka yetkili bir servise başvurun.
        </Text>
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
      width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    },
    introBox: {
      marginHorizontal: 20, marginBottom: 16, borderRadius: radius, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.card, padding: 16, alignItems: 'center',
    },
    introIconBox: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    introText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: radius,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, paddingHorizontal: 14,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
    sectionLabel: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.mutedForeground, marginBottom: 10 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1,
      borderColor: colors.border, backgroundColor: colors.secondary,
    },
    chipActive: { backgroundColor: rgba(colors.primary, 0.15), borderColor: colors.primary },
    chipText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.secondaryForeground },
    chipTextActive: { color: colors.primary },
    emptyBox: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
    resultsCount: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
    resultCard: {
      borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14,
    },
    resultMotorName: { flex: 1, fontFamily: fonts.body.bold, fontSize: 13, color: colors.foreground },
    resultIssueTitle: { fontFamily: fonts.heading.bold, fontSize: 14, color: colors.foreground, marginTop: 8 },
    resultIssueDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, lineHeight: 18 },
    resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    riskPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    riskPillText: { fontSize: 10, fontFamily: fonts.body.bold },
    detailLink: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
    disclaimer: {
      fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 24, marginHorizontal: 32, lineHeight: 16,
    },
  });
