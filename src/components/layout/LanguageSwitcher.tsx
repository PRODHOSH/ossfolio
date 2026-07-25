'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { setLocale } from '@/i18n/locale';
import { locales, type Locale } from '@/i18n/config';

const SHORT_LABELS: Record<Locale, string> = { en: 'EN', es: 'ES' };
const ARIA_KEYS: Record<Locale, 'english' | 'spanish'> = {
  en: 'english',
  es: 'spanish',
};

/**
 * Compact segmented toggle for switching the UI language. Persists the choice
 * via the `setLocale` server action, then refreshes so Server Components
 * re-render with the new messages. Styled to the DESIGN.md `pill-tag-soft`
 * shape: canvas-soft surface, hairline-strong border, emerald active state.
 */
export function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const t = useTranslations('LanguageSwitcher');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === active || isPending) return;
    startTransition(async () => {
      try {
        await setLocale(next);
        router.refresh();
      } catch {
        // Keep the current locale if the switch fails, rather than letting the
        // rejected server action bubble to the route error boundary.
      }
    });
  }

  return (
    <div
      role="group"
      aria-label={t('label')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px',
        borderRadius: '9999px',
        backgroundColor: 'var(--color-canvas-soft)',
        border: '1px solid var(--color-hairline-strong)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <Languages
        size={14}
        aria-hidden="true"
        style={{ color: 'var(--color-ink-mute)', margin: '0 2px 0 6px' }}
      />
      {locales.map((loc) => {
        const isActive = loc === active;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => change(loc)}
            aria-pressed={isActive}
            aria-label={t(ARIA_KEYS[loc])}
            disabled={isPending}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              lineHeight: 1,
              padding: '5px 9px',
              borderRadius: '9999px',
              border: 'none',
              cursor: isActive ? 'default' : 'pointer',
              backgroundColor: isActive
                ? 'var(--color-primary)'
                : 'transparent',
              color: isActive
                ? 'var(--color-on-primary)'
                : 'var(--color-ink-mute)',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {SHORT_LABELS[loc]}
          </button>
        );
      })}
    </div>
  );
}
