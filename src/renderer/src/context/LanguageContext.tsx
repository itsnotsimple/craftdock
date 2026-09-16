import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKey } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'craftdock_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'bg' || saved === 'en') {
        return saved;
      }
    } catch (e) {
      // ignore localStorage errors
    }
    return 'en'; // Default to English as requested
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'bg' : 'en');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey | string, vars?: Record<string, string | number>): string => {
      const dict = translations[language] as Record<string, string>;
      const fallbackDict = translations.en as Record<string, string>;
      let text = dict[key] || fallbackDict[key] || key;

      if (vars) {
        for (const [varKey, varVal] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(varVal));
        }
      }

      return text;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
