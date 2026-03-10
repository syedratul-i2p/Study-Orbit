import { createContext, useContext, useState, useCallback } from "react";
import { type Language, type TranslationKey, en, bn, setLanguage as setI18nLanguage, getLanguage } from "./i18n";

interface LanguageContextType {
  language: Language;
  t: TranslationKey;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  t: en,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(getLanguage());
  const translations: Record<Language, TranslationKey> = { en, bn };

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    setI18nLanguage(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
