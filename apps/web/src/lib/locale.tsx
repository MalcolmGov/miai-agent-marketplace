"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translate, type MessageKey } from "@/lib/i18n";
import {
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/locale-boot";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : "en";
  } catch {
    return "en";
  }
}

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.setAttribute("data-locale", locale);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const next = readStoredLocale();
    setLocaleState(next);
    applyLocale(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    applyLocale(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en" as Locale,
      setLocale: () => undefined,
      t: (key: MessageKey, vars?: Record<string, string | number>) => translate("en", key, vars),
    };
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}
