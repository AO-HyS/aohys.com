import type { Locale } from "@aohys/content-graph";
import en from "./i18n/en.json" with { type: "json" };
import es from "./i18n/es.json" with { type: "json" };

export type UiCopy = typeof en;

const dictionaries = {
  en,
  es,
} satisfies Record<Locale, UiCopy>;

export function getUiCopy(locale: Locale): UiCopy {
  return dictionaries[locale];
}
