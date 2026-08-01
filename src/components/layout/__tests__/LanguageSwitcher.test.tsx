import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageSwitcher } from '../LanguageSwitcher';

const mockRefresh = vi.fn();
const mockSetLocale = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish',
    };
    return translations[key] || key;
  },
}));

vi.mock('@/i18n/locale', () => ({
  setLocale: (locale: string) => mockSetLocale(locale),
}));

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button with current locale indicator', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: 'Language' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('opens dropdown menu listing supported locales when clicked', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: 'Language' });

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('English');
    expect(options[1]).toHaveTextContent('Español');
  });

  it('marks active locale option with aria-selected=true', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));

    const englishOption = screen.getByRole('option', { name: 'English' });
    const spanishOption = screen.getByRole('option', { name: 'Spanish' });

    expect(englishOption).toHaveAttribute('aria-selected', 'true');
    expect(spanishOption).toHaveAttribute('aria-selected', 'false');
  });

  it('closes dropdown menu when pressing Escape key', () => {
    render(<LanguageSwitcher />);
    const button = screen.getByRole('button', { name: 'Language' });

    fireEvent.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('invokes setLocale server action and router.refresh when selecting a new language', async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));

    const spanishOption = screen.getByRole('option', { name: 'Spanish' });
    fireEvent.click(spanishOption);

    await waitFor(() => {
      expect(mockSetLocale).toHaveBeenCalledWith('es');
      expect(mockRefresh).toHaveBeenCalled();
    });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
