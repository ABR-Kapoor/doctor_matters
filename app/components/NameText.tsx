'use client';

import { useState, useEffect } from 'react';
import { useNameTransliteration } from '@/app/hooks/useNameTransliteration';

interface NameTextProps {
  name?: string;
  fallback?: string;
  className?: string;
}

/**
 * Renders a person's name transliterated into the active locale's script.
 * e.g. "Saurabh Sharma" → "सौरभ शर्मा" in Hindi.
 * Falls back to the original name on error or while loading.
 */
export function NameText({ name, fallback = '', className = '' }: NameTextProps) {
  const { transliterateName } = useNameTransliteration();
  const [display, setDisplay] = useState(name || fallback);

  useEffect(() => {
    if (!name) {
      setDisplay(fallback);
      return;
    }
    transliterateName(name).then(setDisplay);
  }, [name, transliterateName, fallback]);

  return <span className={`devanagari-small${className ? ` ${className}` : ''}`}>{display}</span>;
}
