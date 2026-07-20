import en from "./i18n/en.json" with { type: "json" };
import es from "./i18n/es.json" with { type: "json" };

export type I18nLocale = "en" | "es";
export type SharedI18n = typeof en;

const dictionaries = {
  en,
  es,
} satisfies Record<I18nLocale, SharedI18n>;

const alternateLocales = {
  en: "es",
  es: "en",
} as const satisfies Record<I18nLocale, I18nLocale>;

const caseStudyPathPrefixes = {
  en: "/case-studies",
  es: "/es/casos",
} as const satisfies Record<I18nLocale, string>;

export function getSharedI18n(locale: I18nLocale): SharedI18n {
  return dictionaries[locale];
}

export function getAlternateLocale(locale: I18nLocale): I18nLocale {
  return alternateLocales[locale];
}

export function getLocalizedCaseStudyPath(locale: I18nLocale, localizedSlug: string): string {
  return `${caseStudyPathPrefixes[locale]}/${localizedSlug}`;
}

export function getLocalizedValue<T>(locale: I18nLocale, values: Record<I18nLocale, T>): T {
  return values[locale];
}

export function formatI18n(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => values[key] ?? match);
}
