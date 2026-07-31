import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { FavoritesProvider } from './src/state/FavoritesContext';
import { MembersProvider } from './src/state/MembersContext';
import { CatalogProvider } from './src/state/CatalogContext';
import { NotificationsProvider } from './src/state/NotificationsContext';
import { ReviewsProvider } from './src/state/ReviewsContext';
import { PricingProvider } from './src/state/PricingContext';
import { MaintenanceProvider } from './src/state/MaintenanceContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function MainApp() {
  const { mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <FavoritesProvider>
        <MembersProvider>
          <CatalogProvider>
            <NotificationsProvider>
              <ReviewsProvider>
                <PricingProvider>
                  <MaintenanceProvider>
                    <RootNavigator />
                  </MaintenanceProvider>
                </PricingProvider>
              </ReviewsProvider>
            </NotificationsProvider>
          </CatalogProvider>
        </MembersProvider>
      </FavoritesProvider>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          <ThemeProvider>
            <MainApp />
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}