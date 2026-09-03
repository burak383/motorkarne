import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bell, BellOff } from 'lucide-react-native';
import { fonts, radius, rgba } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useNotifications } from '../state/NotificationsContext';
import { ensureNotificationPermission } from '../utils/pushNotifications';

type Nav = NativeStackNavigationProp<any>;

export default function BildirimlerScreen() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const { notifications, markAllRead } = useNotifications();

  useEffect(() => {
    markAllRead();
    ensureNotificationPermission().catch(() => {
      // yok say
    });
    // Ekran açıldığında tüm bildirimleri okunmuş olarak işaretle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Bildirimler</Text>
          <View style={{ width: 40 }} />
        </View>

        {notifications.length === 0 ? (
          <View style={s.emptyBox}>
            <BellOff size={28} color={colors.mutedForeground} />
            <Text style={s.emptyText}>Şu an yeni bildiriminiz bulunmuyor.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {notifications.map((n) => (
              <View key={n.id} style={s.card}>
                <View style={s.iconBox}>
                  <Bell size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{n.title}</Text>
                  <Text style={s.cardBody}>{n.body}</Text>
                  <Text style={s.cardTime}>{n.createdAt}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { fontSize: 13, color: colors.mutedForeground },
    card: {
      flexDirection: 'row',
      gap: 12,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: rgba(colors.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontFamily: fonts.body.bold, fontSize: 13, color: colors.foreground },
    cardBody: { fontSize: 12, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 },
    cardTime: { fontSize: 10, color: colors.mutedForeground, marginTop: 6 },
  });
