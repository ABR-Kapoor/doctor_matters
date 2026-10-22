'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';

// Cache for translated/transliterated names
const nameCache = new Map<string, string>();

// Convert locale code to script locale for transliteration
function getTargetLocaleWithScript(locale: string): string {
  const localeToScript: Record<string, string> = {
    'hi': 'hi-Deva',
    'bn': 'bn-Beng',
    'ta': 'ta-Taml',
    'te': 'te-Telu',
    'gu': 'gu-Gujr',
    'mr': 'mr-Deva',
    'kn': 'kn-Knda',
    'ml': 'ml-Mlym',
    'pa': 'pa-Guru',
    'or': 'or-Orya',
    'as': 'as-Beng',
    'ne': 'ne-Deva',
    'sa': 'sa-Deva',
  };

  return localeToScript[locale] || locale;
}

export function useNameTransliteration() {
  const { currentLocale } = useLanguage();
  const isTranslating = useRef(false);
  const prevLocale = useRef<string>(currentLocale);

  // Clear cache when switching to English to prevent Hindi names from persisting
  useEffect(() => {
    if (prevLocale.current !== 'en' && currentLocale === 'en') {
      nameCache.clear();
    }
    prevLocale.current = currentLocale;
  }, [currentLocale]);

  const transliterateName = useCallback(async (name: string): Promise<string> => {
    if (!name || typeof window === 'undefined') {
      return name;
    }

    // If English locale, return as-is - no translation needed
    if (currentLocale === 'en') {
      return name;
    }

    // Check cache first
    const cacheKey = `${name}_${currentLocale}`;
    if (nameCache.has(cacheKey)) {
      return nameCache.get(cacheKey)!;
    }

    // Prevent multiple concurrent translations of the same name
    if (isTranslating.current) {
      return name;
    }

    try {
      isTranslating.current = true;

      // If name already contains non-Latin characters, return as-is
      const hasNonLatin = /[\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F]/.test(name);
      if (hasNonLatin) {
        nameCache.set(cacheKey, name);
        return name;
      }

      const targetLocaleWithScript = getTargetLocaleWithScript(currentLocale);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: name,
          sourceLocale: 'en',
          targetLocale: targetLocaleWithScript,
          type: 'transliterate',
        }),
      });

      const data = await response.json();
      if (data?.success && data?.result) {
        nameCache.set(cacheKey, data.result);
        return data.result;
      }

      return name;
    } catch (error) {
      console.error('Name transliteration error:', error);
      return name;
    } finally {
      isTranslating.current = false;
    }
  }, [currentLocale]);

  const transliterateNames = useCallback(async (names: string[]): Promise<string[]> => {
    if (!names || names.length === 0 || typeof window === 'undefined') {
      return names;
    }
    if (currentLocale === 'en') {
      return names;
    }
    try {
      return await Promise.all(names.map((name) => transliterateName(name)));
    } catch (error) {
      console.error('Batch name transliteration error:', error);
      return names;
    }
  }, [currentLocale, transliterateName]);

  const clearCache = useCallback(() => {
    nameCache.clear();
  }, []);

  return { transliterateName, transliterateNames, clearCache };
}
