import en from '../../messages/en.json';
import es from '../../messages/es.json';

// Supported locales for the app. Keep in sync with the files under `messages/`.
export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Cookie that persists the visitor's chosen locale (no URL prefix — see request.ts).
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export type Messages = typeof en;

// Static compile-time type assertions.
// Ensures that `es.json` matches `en.json` structure exactly.
// If any key is missing or mismatched in either locale file, TypeScript raises a compile-time error.
const _schemaValidationEs: Messages = es;
const _schemaValidationEn: typeof es = en;

/** Type guard: is `value` one of the supported locales? */
export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}
