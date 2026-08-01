"use client";

import { useLocale } from "@/lib/locale";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/locale-boot";

export function LanguageSelect() {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-2.5 py-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="h-4 w-4 shrink-0 text-[var(--accent-bright)]"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{t("lang.aria")}</span>
      <select
        className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[var(--text)] outline-none"
        value={locale}
        aria-label={t("lang.aria")}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
