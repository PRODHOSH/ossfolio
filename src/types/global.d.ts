import en from "../../messages/en.json";

export type Messages = typeof en;

declare global {
  // Enables type-safe global message keys for Next-Intl (useTranslations, getTranslations)
  interface IntlMessages extends Messages {}
}
