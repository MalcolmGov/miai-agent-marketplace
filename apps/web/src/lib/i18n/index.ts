import type { Locale } from "@/lib/locale-boot";
import { de } from "./de";
import { en, type Dictionary, type MessageKey } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { hi } from "./hi";
import { it } from "./it";
import { zh } from "./zh";

const DICTS: Record<Locale, Dictionary> = {
  en,
  es,
  fr,
  de,
  it,
  zh,
  hi,
};

export type { Dictionary, MessageKey };

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const table = DICTS[locale] ?? en;
  let text = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
