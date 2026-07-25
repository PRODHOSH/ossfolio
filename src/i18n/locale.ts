'use server';

import { cookies } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';

// Persist the chosen locale in a cookie. The Language switcher calls this and
// then refreshes so Server Components re-render with the new messages.
export async function setLocale(locale: Locale): Promise<void> {
  const next = isLocale(locale) ? locale : defaultLocale;
  const store = await cookies();
  store.set(LOCALE_COOKIE, next, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
