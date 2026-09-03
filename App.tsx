import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { FavoritesProvider } from './src/state/FavoritesContext';
import { MembersProvider } from './src/state/MembersContext';
import { CatalogProvider } from './src/state/CatalogContext';
import { VehicleProvider } from './src/state/VehicleContext';
import { NotificationsProvider } from './src/state/NotificationsContext';
import { ReviewsProvider } from './src/state/ReviewsContext';
import { PricingProvider } from './src/state/PricingContext';
import { MaintenanceProvider } from './src/state/MaintenanceContext';
import { UsageStatsProvider } from './src/state/UsageStatsContext';
import { AdsProvider } from './src/state/AdsContext';
import { PurchasesProvider } from './src/state/PurchasesContext';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function MainApp() {
  const { mode } = useTheme();

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <MembersProvider>
        <FavoritesProvider>
          <CatalogProvider>
            <VehicleProvider>
              <NotificationsProvider>
                <ReviewsProvider>
                  <PricingProvider>
                    <MaintenanceProvider>
                      <UsageStatsProvider>
                        <PurchasesProvider>
                          <AdsProvider>
                            <RootNavigator />
                          </AdsProvider>
                        </PurchasesProvider>
                      </UsageStatsProvider>
                    </MaintenanceProvider>
                  </PricingProvider>
                </ReviewsProvider>
              </NotificationsProvider>
            </VehicleProvider>
          </CatalogProvider>
        </FavoritesProvider>
      </MembersProvider>
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