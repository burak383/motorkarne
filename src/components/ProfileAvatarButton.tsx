import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fonts } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useMembers } from '../state/MembersContext';

type Nav = NativeStackNavigationProp<any>;

export default function ProfileAvatarButton() {
  const nav = useNavigation<Nav>();
  const { themeColors: colors } = useTheme();
  const { currentUser } = useMembers();

  const initials = useMemo(() => {
    if (!currentUser?.fullName) return '?';
    const parts = currentUser.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }, [currentUser?.fullName]);

  return (
    <TouchableOpacity
      style={[styles.avatar, { backgroundColor: colors.primary }]}
      onPress={() => nav.navigate('Profil')}
      accessibilityRole="button"
      accessibilityLabel="Profilim"
    >
      <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.heading.bold,
    fontSize: 13,
  },
});
