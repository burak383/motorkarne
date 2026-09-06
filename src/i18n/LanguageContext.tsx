import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['tr'];
}

const STORAGE_KEY = 'motorkarne_language';

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  toggleLanguage: () => {},
  t: translations.tr,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('tr');

  // Dil tercihi cihazda saklanır — aksi halde uygulama her açılışta varsayılan
  // Türkçe'ye dönüyordu (bkz. ThemeContext'teki aynı desen).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'tr' || saved === 'en') setLanguage(saved);
    }).catch(() => {});
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'tr' ? 'en' : 'tr';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const currentT = translations[language] || translations.tr;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: currentT }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);