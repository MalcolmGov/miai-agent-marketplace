export const LOCALE_STORAGE_KEY = "miai-locale";

export const LOCALES = ["en", "es", "fr", "de", "it", "zh", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  zh: "中文",
  hi: "हिन्दी",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && (LOCALES as readonly string[]).includes(value));
}

/** Inline boot — set html lang + data-locale before paint. */
export const LOCALE_BOOT_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});var ok=${JSON.stringify([...LOCALES])}.indexOf(v)>=0;var l=ok?v:"en";document.documentElement.lang=l;document.documentElement.setAttribute("data-locale",l);}catch(e){document.documentElement.lang="en";document.documentElement.setAttribute("data-locale","en");}})();`;
