import en from "./i18n/en.json" with { type: "json" };
import es from "./i18n/es.json" with { type: "json" };
import { type Locale } from "@aohys/core/domain";

export type SharedI18n = typeof en;

const dictionaries = {
  en,
  es,
} satisfies Record<Locale, SharedI18n>;

const alternateLocales = {
  en: "es",
  es: "en",
} as const satisfies Record<Locale, Locale>;

const caseStudyPathPrefixes = {
  en: "/case-studies",
  es: "/es/casos",
} as const satisfies Record<Locale, string>;

export function getSharedI18n(locale: Locale): SharedI18n {
  return dictionaries[locale];
}

export function getAlternateLocale(locale: Locale): Locale {
  return alternateLocales[locale];
}

export function getLocalizedCaseStudyPath(
  locale: Locale,
  localizedSlug: string,
): string {
  return `${caseStudyPathPrefixes[locale]}/${localizedSlug}`;
}

export function getLocalizedValue<T>(
  locale: Locale,
  values: Record<Locale, T>,
): T {
  return values[locale];
}

export function formatI18n(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (match, key: string) => values[key] ?? match,
  );
}
