'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { getStaticTranslation, getCachedTranslation, setCachedTranslation } from '@/app/lib/translations';

/**
 * Returns the translated version of `text` for the current locale.
 * Uses a synchronous cache check for the initial state to prevent
 * the English-text → translated-text flash on mount.
 */
export const useTranslation = (text: string) => {
  const { currentLocale } = useLanguage();

  // Initialise state synchronously from cache/static to prevent flash
  const [translatedText, setTranslatedText] = useState<string>(() => {
    if (currentLocale === 'en' || !text) return text;
    return getStaticTranslation(text, currentLocale)
      || getCachedTranslation(text, currentLocale)
      || text;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (currentLocale === 'en' || !text) return false;
    return !(getStaticTranslation(text, currentLocale) || getCachedTranslation(text, currentLocale));
  });

  useEffect(() => {
    const performTranslation = async () => {
      if (currentLocale === 'en' || !text) {
        setTranslatedText(text);
        setIsLoading(false);
        return;
      }

      // Static / cached — synchronous, no network needed
      const staticTranslation = getStaticTranslation(text, currentLocale);
      if (staticTranslation) {
        setTranslatedText(staticTranslation);
        setIsLoading(false);
        return;
      }

      const cachedTranslation = getCachedTranslation(text, currentLocale);
      if (cachedTranslation) {
        setTranslatedText(cachedTranslation);
        setIsLoading(false);
        return;
      }

      // Not cached — fetch from API
      setIsLoading(true);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sourceLocale: 'en', targetLocale: currentLocale, type: 'text' }),
        });
        const data = await response.json();
        if (data.success) {
          setCachedTranslation(text, currentLocale, data.result);
          setTranslatedText(data.result);
        } else {
          setTranslatedText(text);
        }
      } catch {
        setTranslatedText(text);
      } finally {
        setIsLoading(false);
      }
    };

    performTranslation();
  }, [text, currentLocale]);

  return { text: translatedText, isLoading };
};

export const useObjectTranslation = <T extends Record<string, any>>(obj: T) => {
  const { translateObject, currentLocale } = useLanguage();
  const [translatedObj, setTranslatedObj] = useState(obj);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const performTranslation = async () => {
      if (currentLocale === 'en') {
        setTranslatedObj(obj);
        return;
      }
      setIsLoading(true);
      try {
        const result = await translateObject(obj);
        setTranslatedObj(result);
      } catch {
        setTranslatedObj(obj);
      } finally {
        setIsLoading(false);
      }
    };
    performTranslation();
  }, [obj, currentLocale, translateObject]);

  return { data: translatedObj, isLoading };
};
