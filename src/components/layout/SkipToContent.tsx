'use client';

import { useTranslations } from 'next-intl';

export function SkipToContent() {
  const t = useTranslations('Nav');

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-0 focus:left-0 rounded-br-md bg-primary px-5 py-3 text-sm font-semibold text-on-primary no-underline outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
    >
      {t('skipToMainContent') || 'Skip to main content'}
    </a>
  );
}
