import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, Locale, Messages } from "./config";

const messagesMap: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import("../../messages/en.json"),
  es: () => import("../../messages/es.json"),
};

// Cookie-based locale resolution (no locale-prefixed routing), so existing
// routes — including `[username]` profiles and `api/*` — are left untouched.
// On the first visit (no cookie yet) we negotiate from Accept-Language.
export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get(LOCALE_COOKIE)?.value;

  let locale = isLocale(requested) ? requested : undefined;
  if (!locale) {
    // Scan the Accept-Language header in preference order and pick the first
    // supported locale, rather than only checking the first token.
    const header = (await headers()).get("accept-language");
    if (header) {
      for (const part of header.split(",")) {
        const tag = part.split(";")[0]?.split("-")[0]?.trim();
        if (isLocale(tag)) {
          locale = tag;
          break;
        }
      }
    }
    locale = locale ?? defaultLocale;
  }

  return {
    locale,
    messages: (await messagesMap[locale as Locale]()).default,
  };
});
