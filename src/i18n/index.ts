import { createContext, useContext, useState, useCallback, createElement } from 'react';
import type { ReactNode } from 'react';
import en from './en';
import zh from './zh';

type Locale = 'en' | 'zh';

// Use Record type to allow any string values
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = {
  en: en as Translations,
  zh: zh as Translations,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider(props: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('locale') as Locale;
    if (saved && (saved === 'en' || saved === 'zh')) {
      return saved;
    }
    // Detect browser language
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[locale][key] || translations['en'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, () => String(v));
      });
    }
    return text;
  }, [locale]);

  const value: I18nContextType = { locale, setLocale, t };

  return createElement(I18nContext.Provider, { value }, props.children);
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export type { Locale };
