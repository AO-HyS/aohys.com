import type { Locale } from "@aohys/content-graph";
import en from "./i18n/en.json" with { type: "json" };
import es from "./i18n/es.json" with { type: "json" };

const dictionaries = {
  en,
  es,
} as const satisfies Record<Locale, unknown>;

export function getUiCopy(locale: Locale) {
  return dictionaries[locale];
}
