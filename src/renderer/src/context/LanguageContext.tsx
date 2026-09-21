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
      (window as any).api?.saveAppSettings?.({ language: lang });
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const appSettings = await (window as any).api?.getAppSettings?.();
        if (appSettings && (appSettings.language === 'bg' || appSettings.language === 'en')) {
          const local = localStorage.getItem(STORAGE_KEY);
          if (local !== appSettings.language) {
            // Priority: if local has a saved value, sync backend to local; else sync local to backend
            if (local === 'bg' || local === 'en') {
              (window as any).api?.saveAppSettings?.({ language: local });
            } else {
              setLanguageState(appSettings.language);
              localStorage.setItem(STORAGE_KEY, appSettings.language);
            }
          }
        }
      } catch (err) {}
    };
    syncWithBackend();
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
