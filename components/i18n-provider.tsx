"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, TranslationKey, translations } from "@/lib/i18n/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "plantcare_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (savedLang && (savedLang === "en" || savedLang === "vi")) {
        setLanguageState(savedLang);
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
