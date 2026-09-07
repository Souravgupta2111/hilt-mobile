import React, { useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';
import { LOCALES, type Locale } from './i18n';

let listener: ((l: Locale) => void) | null = null;
let cached: Locale = 'en';

function detect(): Locale {
  try {
    const locales = getLocales();
    const code = locales[0]?.languageCode?.toLowerCase() ?? 'en';
    return (LOCALES as readonly string[]).includes(code) ? (code as Locale) : 'en';
  } catch {
    return 'en';
  }
}

export function initLocale() {
  cached = detect();
}

export function getActiveLocale(): Locale {
  return cached;
}

export function setActiveLocale(locale: Locale) {
  cached = locale;
  listener?.(locale);
}

/** Re-renders when locale changes. Children read the latest copy via t(). */
export function useLocale(): [Locale, (l: Locale) => void] {
  const [current, setCurrent] = useState<Locale>(cached);
  useEffect(() => {
    listener = setCurrent;
    return () => {
      listener = null;
    };
  }, []);
  return [current, setActiveLocale];
}
