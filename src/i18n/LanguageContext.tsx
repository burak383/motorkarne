import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations['tr'];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  toggleLanguage: () => {},
  t: translations.tr,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('tr');

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'tr' ? 'en' : 'tr'));
  }, []);

  const currentT = translations[language] || translations.tr;

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t: currentT }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);