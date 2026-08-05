import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  HeatmapWithYearNav,
  HEATMAP_THEMES,
  getShadeForCount,
} from '../HeatmapWithYearNav';
import type { HeatmapWeek } from '@/types';

const mockWeeks: HeatmapWeek[] = [
  {
    days: [
      { date: '2026-05-01', count: 0, color: '#ebedf0' },
      { date: '2026-05-02', count: 2, color: '#9be9a8' },
      { date: '2026-05-03', count: 5, color: '#40c463' },
      { date: '2026-05-04', count: 8, color: '#30a14e' },
      { date: '2026-05-05', count: 12, color: '#216e39' },
    ],
  },
];

describe('Heatmap Color Theme Engine', () => {
  it('computes correct shades for counts across different color themes', () => {
    expect(getShadeForCount(0, 'emerald')).toBe(
      HEATMAP_THEMES.emerald.shades[0],
    );
    expect(getShadeForCount(2, 'emerald')).toBe(
      HEATMAP_THEMES.emerald.shades[1],
    );
    expect(getShadeForCount(10, 'emerald')).toBe(
      HEATMAP_THEMES.emerald.shades[4],
    );

    expect(getShadeForCount(0, 'violet')).toBe(HEATMAP_THEMES.violet.shades[0]);
    expect(getShadeForCount(2, 'violet')).toBe(HEATMAP_THEMES.violet.shades[1]);
    expect(getShadeForCount(10, 'violet')).toBe(
      HEATMAP_THEMES.violet.shades[4],
    );
  });
});

describe('HeatmapWithYearNav Customization UI', () => {
  beforeEach(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
  });

  it('renders customization toggle button', () => {
    render(
      <HeatmapWithYearNav
        username="octocat"
        initialWeeks={mockWeeks}
        initialCurrentStreak={5}
        initialLongestStreak={10}
      />,
    );

    const customizeBtn = screen.getByRole('button', {
      name: /Customize Heatmap Theme/i,
    });
    expect(customizeBtn).toBeInTheDocument();
  });

  it('opens color scheme popover menu when Customize button is clicked', () => {
    render(
      <HeatmapWithYearNav
        username="octocat"
        initialWeeks={mockWeeks}
        initialCurrentStreak={5}
        initialLongestStreak={10}
      />,
    );

    const customizeBtn = screen.getByRole('button', {
      name: /Customize Heatmap Theme/i,
    });
    fireEvent.click(customizeBtn);

    expect(screen.getByText('Color Scheme')).toBeInTheDocument();
    expect(screen.getByText('Electric Violet')).toBeInTheDocument();
    expect(screen.getByText('Solar Amber')).toBeInTheDocument();
  });

  it('updates selected theme and persists to localStorage', () => {
    render(
      <HeatmapWithYearNav
        username="octocat"
        initialWeeks={mockWeeks}
        initialCurrentStreak={5}
        initialLongestStreak={10}
      />,
    );

    const customizeBtn = screen.getByRole('button', {
      name: /Customize Heatmap Theme/i,
    });
    fireEvent.click(customizeBtn);

    const violetOption = screen.getByText('Electric Violet');
    fireEvent.click(violetOption);

    expect(window.localStorage.getItem('heatmap_theme')).toBe('violet');
  });
});
