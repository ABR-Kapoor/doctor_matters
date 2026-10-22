'use client';

import React from 'react';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { Globe, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  hi: 'हिन्दी',
  zh: '中文',
  ar: 'العربية',
  pt: 'Português',
  ja: '日本語',
  bn: 'বাংলা',
  te: 'తెలుగు',
  mr: 'మరాठी',
  ta: 'தமிழ்',
  gu: 'ગુજરાతీ',
};

export const LanguageSwitcher: React.FC = () => {
  const { currentLocale, setLocale, availableLocales, isTranslating } = useLanguage();

  return (
    <div className="flex items-center shrink-0">
      <Select 
        value={currentLocale} 
        onValueChange={(val) => val && setLocale(val)}
        disabled={isTranslating}
      >
        <SelectTrigger 
          hideChevron={true}
          className="h-9 px-3 md:px-4 flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white text-blue-800 hover:bg-blue-50 smooth-transition shrink-0 focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100/50 outline-none select-none"
          title="Change Language"
        >
          <div className="flex items-center justify-center relative">
            <Globe className="w-[18px] h-[18px] text-blue-500 shrink-0" />
            {isTranslating && (
              <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-600" />
              </span>
            )}
          </div>
          <span className="hidden md:inline text-xs font-black tracking-tight text-blue-900 select-none">
            {languageNames[currentLocale] || currentLocale.toUpperCase()}
          </span>
        </SelectTrigger>
        <SelectContent
          side="top"
          sideOffset={12}
          align="end"
          className="rounded-2xl border-blue-100 bg-white shadow-xl min-w-[180px] max-h-[260px] overflow-y-auto p-1.5 z-[100] animate-in slide-in-from-bottom-2 duration-300"
        >
          {availableLocales.map((locale) => (
            <SelectItem 
              key={locale} 
              value={locale}
              className={cn(
                "rounded-xl mx-0 my-0.5 py-2.5 pr-10 pl-3 font-medium transition-colors cursor-pointer text-xs",
                currentLocale === locale 
                  ? "bg-blue-600 text-white focus:bg-blue-500 focus:text-white data-[state=checked]:bg-blue-600 data-[state=checked]:text-white" 
                  : "text-blue-900 hover:bg-blue-50 focus:bg-blue-50"
              )}
            >
              {languageNames[locale] || locale.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
