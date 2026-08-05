'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { setLocale } from '@/i18n/locale';
import { locales, type Locale } from '@/i18n/config';

const LOCALE_CONFIG: Record<
  Locale,
  { label: string; short: string; ariaKey: 'english' | 'spanish' }
> = {
  en: { label: 'English', short: 'EN', ariaKey: 'english' },
  es: { label: 'Español', short: 'ES', ariaKey: 'spanish' },
};

/**
 * Interactive header dropdown language selector for switching UI locales.
 * Persists choice via `setLocale` server action (NEXT_LOCALE cookie), then calls
 * `router.refresh()` so Server Components re-render with the new messages while
 * preserving active path parameters and query strings.
 *
 * Styled per DESIGN.md specifications: canvas background, hairline-strong border,
 * ink typography, level 2 elevation menu, and emerald selection highlight.
 */
export function LanguageSwitcher() {
  const active = useLocale() as Locale;
  const t = useTranslations('LanguageSwitcher');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside container
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard accessibility
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!isOpen) setIsOpen(true);
    }
  }

  function handleSelect(next: Locale) {
    setIsOpen(false);
    if (next === active || isPending) return;

    startTransition(async () => {
      try {
        await setLocale(next);
        router.refresh();
      } catch {
        // Fall back gracefully if server action fails
      }
    });
  }

  const currentConfig = LOCALE_CONFIG[active] || LOCALE_CONFIG.en;

  return (
    <div
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('label')}
        disabled={isPending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-ink)',
          backgroundColor: 'var(--color-canvas)',
          border: '1px solid var(--color-hairline-strong)',
          borderRadius: '6px',
          cursor: 'pointer',
          lineHeight: 1,
          opacity: isPending ? 0.6 : 1,
          transition: 'all 0.15s ease',
        }}
      >
        <Globe
          size={14}
          style={{ color: 'var(--color-ink-mute)' }}
          aria-hidden="true"
        />
        <span>{currentConfig.short}</span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--color-ink-mute)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('label')}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '140px',
            margin: 0,
            padding: '4px',
            listStyle: 'none',
            backgroundColor: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            zIndex: 50,
          }}
        >
          {locales.map((loc) => {
            const isSelected = loc === active;
            const config = LOCALE_CONFIG[loc];

            return (
              <li key={loc} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  aria-label={t(config.ariaKey)}
                  onClick={() => handleSelect(loc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected
                      ? 'var(--color-ink)'
                      : 'var(--color-ink-mute)',
                    backgroundColor: isSelected
                      ? 'rgba(62, 207, 142, 0.12)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span>{config.label}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      style={{ color: 'var(--color-primary)' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
