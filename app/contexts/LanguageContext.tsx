'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface LanguageContextType {
  currentLocale: string;
  setLocale: (locale: string) => void;
  translate: (text: string) => Promise<string>;
  translateObject: <T extends Record<string, any>>(obj: T) => Promise<T>;
  translateHtml: (html: string) => Promise<string>;
  availableLocales: string[];
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const availableLocales = ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ar', 'pt', 'ja', 'bn', 'te', 'mr', 'ta', 'gu'];

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read locale synchronously on first render to prevent English → Hindi flash
  const [currentLocale, setCurrentLocale] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferredLocale');
      if (saved && availableLocales.includes(saved)) {
        document.documentElement.lang = saved;
        return saved;
      }
    }
    return 'en';
  });

  const [isTranslating, setIsTranslating] = useState(false);

  // Keep document.documentElement.lang in sync when locale changes
  useEffect(() => {
    document.documentElement.lang = currentLocale;
  }, [currentLocale]);

  const setLocale = useCallback((locale: string) => {
    setCurrentLocale(locale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLocale', locale);
      document.documentElement.lang = locale;
    }
  }, []);

  const translate = useCallback(async (text: string): Promise<string> => {
    if (!text || currentLocale === 'en') return text;

    const { getStaticTranslation, getCachedTranslation, setCachedTranslation } = await import('../lib/translations');

    const staticTranslation = getStaticTranslation(text, currentLocale);
    if (staticTranslation) return staticTranslation;

    const cachedTranslation = getCachedTranslation(text, currentLocale);
    if (cachedTranslation) return cachedTranslation;

    try {
      setIsTranslating(true);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLocale: 'en', targetLocale: currentLocale, type: 'text' }),
      });
      const data = await response.json();
      if (data.success) {
        setCachedTranslation(text, currentLocale, data.result);
        return data.result;
      }
      return text;
    } catch {
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLocale]);

  const translateObject = useCallback(async <T extends Record<string, any>>(obj: T): Promise<T> => {
    if (!obj || currentLocale === 'en') return obj;
    try {
      setIsTranslating(true);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: obj, sourceLocale: 'en', targetLocale: currentLocale, type: 'object' }),
      });
      const data = await response.json();
      return data.success ? (data.result as T) : obj;
    } catch {
      return obj;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLocale]);

  const translateHtml = useCallback(async (html: string): Promise<string> => {
    if (!html || currentLocale === 'en') return html;
    try {
      setIsTranslating(true);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: html, sourceLocale: 'en', targetLocale: currentLocale, type: 'html' }),
      });
      const data = await response.json();
      return data.success ? data.result : html;
    } catch {
      return html;
    } finally {
      setIsTranslating(false);
    }
  }, [currentLocale]);

  return (
    <LanguageContext.Provider
      value={{ currentLocale, setLocale, translate, translateObject, translateHtml, availableLocales, isTranslating }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
