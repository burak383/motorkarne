import React, { useMemo } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Compass,
  LayoutGrid,
  Columns3,
  Sparkles,
  Bookmark,
} from 'lucide-react-native';

import { fonts, darkColors } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

import KesfetScreen from '../screens/KesfetScreen';
import MarkalarKatalogScreen from '../screens/MarkalarKatalogScreen';
import KarsilastirScreen from '../screens/KarsilastirScreen';
import BanaAracBulScreen from '../screens/BanaAracBulScreen';
import KaydedilenlerScreen from '../screens/KaydedilenlerScreen';
import AramaSonuclariScreen from '../screens/AramaSonuclariScreen';
import MotorVeAracDetayScreen from '../screens/MotorVeAracDetayScreen';
import ProfilScreen from '../screens/ProfilScreen';
import AdminPaneliScreen from '../screens/AdminPaneliScreen';
import VeriYonetimiScreen from '../screens/VeriYonetimiScreen';
import KayitOlScreen from '../screens/KayitOlScreen';
import GirisYapScreen from '../screens/GirisYapScreen';
import SifremiUnuttumScreen from '../screens/SifremiUnuttumScreen';
import GorselKaynaklariScreen from '../screens/GorselKaynaklariScreen';
import GizlilikPolitikasiScreen from '../screens/GizlilikPolitikasiScreen';
import BildirimlerScreen from '../screens/BildirimlerScreen';
import HakkindaScreen from '../screens/HakkindaScreen';
import ArizaTeshisiScreen from '../screens/ArizaTeshisiScreen';

export type RootStackParamList = {
  Tabs: undefined;
  AramaSonuclari: { query?: string; filter?: string } | undefined;
  MotorVeAracDetay: { motorId: string } | undefined;
  Profil: undefined;
  AdminPaneli: undefined;
  VeriYonetimi: undefined;
  KayitOl: undefined;
  GirisYap: undefined;
  SifremiUnuttum: undefined;
  GorselKaynaklari: undefined;
  GizlilikPolitikasi: undefined;
  Bildirimler: undefined;
  Hakkinda: undefined;
  ArizaTeshisi: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const props = { color, size };
  switch (name) {
    case 'Kesfet':
      return <Compass {...props} />;
    case 'Markalar & Katalog':
      return <LayoutGrid {...props} />;
    case 'Karşılaştır':
      return <Columns3 {...props} />;
    case 'Bana Araç Bul':
      return <Sparkles {...props} />;
    case 'Kaydedilenler':
      return <Bookmark {...props} />;
    default:
      return null;
  }
}

function TabsNavigator() {
  const { themeColors } = useTheme();
  const colors = themeColors || darkColors;
  const { t } = useLanguage();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: fonts.body.semibold,
          fontSize: 11,
        },
        tabBarIcon: ({ color, size }) => (
          <TabIcon name={route.name} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="Kesfet" component={KesfetScreen} options={{ title: t.exploreTitle || 'Keşfet' }} />
      <Tabs.Screen name="Markalar & Katalog" component={MarkalarKatalogScreen} options={{ title: 'Katalog' }} />
      <Tabs.Screen name="Karşılaştır" component={KarsilastirScreen} options={{ title: t.compareTitle || 'Karşılaştır' }} />
      <Tabs.Screen name="Bana Araç Bul" component={BanaAracBulScreen} options={{ title: 'Araç Bul' }} />
      <Tabs.Screen name="Kaydedilenler" component={KaydedilenlerScreen} options={{ title: t.saved || 'Kaydedilenler' }} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { mode, themeColors } = useTheme();
  const colors = themeColors || darkColors;

  const navTheme = useMemo(() => {
    const baseTheme = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: colors.background,
        card: colors.card,
        text: colors.foreground,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [mode, colors]);

  const linking = useMemo(
    () => ({
      prefixes: ['motorkarne://'],
      config: {
        screens: {
          Tabs: '',
          MotorVeAracDetay: 'motor/:motorId',
          AramaSonuclari: 'arama',
          Profil: 'profil',
        },
      },
    }),
    []
  );

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen name="AramaSonuclari" component={AramaSonuclariScreen} />
        <Stack.Screen name="MotorVeAracDetay" component={MotorVeAracDetayScreen} />
        <Stack.Screen name="Profil" component={ProfilScreen} />
        <Stack.Screen name="AdminPaneli" component={AdminPaneliScreen} />
        <Stack.Screen name="VeriYonetimi" component={VeriYonetimiScreen} />
        <Stack.Screen name="KayitOl" component={KayitOlScreen} />
        <Stack.Screen name="GirisYap" component={GirisYapScreen} />
        <Stack.Screen name="SifremiUnuttum" component={SifremiUnuttumScreen} />
        <Stack.Screen name="GorselKaynaklari" component={GorselKaynaklariScreen} />
        <Stack.Screen name="GizlilikPolitikasi" component={GizlilikPolitikasiScreen} />
        <Stack.Screen name="Bildirimler" component={BildirimlerScreen} />
        <Stack.Screen name="Hakkinda" component={HakkindaScreen} />
        <Stack.Screen name="ArizaTeshisi" component={ArizaTeshisiScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}