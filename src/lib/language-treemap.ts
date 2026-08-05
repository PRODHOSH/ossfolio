import type { TechEntry, Repo } from '@/types';
import { LANG_COLORS } from '@/lib/languages';

export interface LanguageTreemapItem {
  language: string;
  repoCount: number;
  percentage: number;
  color: string;
  flexGrow: number;
}

/**
 * Calculates proportional language treemap items from tech stack data
 */
export function calculateLanguageTreemapData(
  techStack: TechEntry[] = [],
  repos: Repo[] = [],
): LanguageTreemapItem[] {
  if (!techStack || techStack.length === 0) return [];

  // Compute total repo count
  const totalCount = techStack.reduce((sum, item) => sum + item.repoCount, 0);
  if (totalCount === 0) return [];

  return techStack.map((item) => {
    const percentage = Math.round((item.repoCount / totalCount) * 100);
    const color = LANG_COLORS[item.language] || '#9a9a9a';
    // Scale flex-grow between 1 and 10 for clean grid layout balance
    const flexGrow = Math.max(
      1,
      Math.round((item.repoCount / totalCount) * 10),
    );

    return {
      language: item.language,
      repoCount: item.repoCount,
      percentage,
      color,
      flexGrow,
    };
  });
}
