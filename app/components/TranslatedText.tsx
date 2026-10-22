'use client';

import React from 'react';
import { useTranslation } from '@/app/hooks/useTranslation';
import { useLanguage } from '@/app/contexts/LanguageContext';

interface TranslatedTextProps {
  children: string;
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'button' | 'fragment';
}

const DEVANAGARI_LOCALES = ['hi', 'mr', 'ne', 'sa'];
const hasDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);

export const TranslatedText: React.FC<TranslatedTextProps> = ({
  children,
  className = '',
  as: Component = 'span',
}) => {
  const { text, isLoading } = useTranslation(children);
  const { currentLocale } = useLanguage();

  const isDevanagari = DEVANAGARI_LOCALES.includes(currentLocale) && hasDevanagari(text);
  const cls = [
    isDevanagari ? 'devanagari-hindi' : '',
    className,
    isLoading ? 'opacity-70 transition-opacity' : '',
  ].filter(Boolean).join(' ');

  if (Component === 'fragment') {
    return <>{text}</>;
  }

  return <Component className={cls}>{text}</Component>;
};
