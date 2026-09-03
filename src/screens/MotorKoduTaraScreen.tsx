import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, ScanLine } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { recognizeTextFromImage, isOcrConfigured } from '../utils/ocr';

type Nav = NativeStackNavigationProp<any>;

export default function MotorKoduTaraScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = getStyles(colors);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    setErrorMsg(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setErrorMsg('Fotoğraf çekebilmek için kamera izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);

    if (!isOcrConfigured()) {
      setErrorMsg(
        'Bu özellik henüz aktif değil: uygulamayı yöneten kişinin bir Google Cloud Vision API anahtarı tanımlaması gerekiyor.'
      );
      return;
    }

    if (!asset.base64) {
      setErrorMsg('Fotoğraf işlenemedi, lütfen tekrar deneyin.');
      return;
    }

    setLoading(true);
    const ocrResult = await recognizeTextFromImage(asset.base64);
    setLoading(false);

    if (!ocrResult.success || !ocrResult.text) {
      setErrorMsg(ocrResult.error ?? 'Motor kodu okunamadı.');
      return;
    }

    nav.navigate('AramaSonuclari', { query: ocrResult.text });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
          <ArrowLeft size={20} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Motor Kodunu Tara</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <View style={s.previewBox}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={s.previewImage} resizeMode="cover" />
          ) : (
            <View style={s.previewPlaceholder}>
              <ScanLine size={40} color={colors.mutedForeground} />
              <Text style={s.previewPlaceholderText}>
                Motor bloğu üzerindeki kod etiketini net bir şekilde çerçeveleyip fotoğraf çekin.
              </Text>
            </View>
          )}
          {loading && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={s.loadingText}>Motor kodu okunuyor...</Text>
            </View>
          )}
        </View>

        {errorMsg && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{errorMsg}</Text>
          </View>
        )}

        <TouchableOpacity style={s.captureBtn} onPress={handleTakePhoto} disabled={loading}>
          <Camera size={18} color={colors.primaryForeground} />
          <Text style={s.captureBtnText}>{photoUri ? 'Tekrar Çek' : 'Fotoğraf Çek'}</Text>
        </TouchableOpacity>

        <Text style={s.hintText}>
          Not: Bu özellik motor bloğu üzerindeki kısa, büyük harfli kod etiketlerini (örn. "EA288", "B48") tanımaya
          çalışır. Işık ve netlik sonucu doğrudan etkiler.
        </Text>
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
      width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
    previewBox: {
      height: 280, borderRadius: radius, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    },
    previewImage: { width: '100%', height: '100%' },
    previewPlaceholder: { alignItems: 'center', paddingHorizontal: 24, gap: 12 },
    previewPlaceholderText: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject, backgroundColor: rgba(colors.background, 0.85),
      alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    loadingText: { fontSize: 13, color: colors.foreground },
    errorBox: {
      marginTop: 16, backgroundColor: rgba(colors.destructive, 0.1), borderRadius: radius,
      borderWidth: 1, borderColor: rgba(colors.destructive, 0.3), padding: 14,
    },
    errorText: { fontSize: 13, color: colors.destructive, lineHeight: 18 },
    captureBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 15, marginTop: 20,
    },
    captureBtnText: { fontSize: 14, fontFamily: fonts.body.bold, color: colors.primaryForeground },
    hintText: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  });
