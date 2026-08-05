import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface TrendingProject {
  id?: string;
  repoName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  contributorsCount: number;
  recentActivityScore: number;
  topics: string[];
  seekingContributors: boolean;
  updatedAt?: string;
}

export const FALLBACK_TRENDING_PROJECTS: TrendingProject[] = [
  {
    repoName: 'facebook/react',
    description: 'The library for web and native user interfaces.',
    stars: 230000,
    forks: 46000,
    language: 'JavaScript',
    url: 'https://github.com/facebook/react',
    contributorsCount: 1650,
    recentActivityScore: 98.5,
    topics: ['react', 'ui', 'frontend', 'library'],
    seekingContributors: true,
  },
  {
    repoName: 'vercel/next.js',
    description: 'The React Framework for the Web.',
    stars: 125000,
    forks: 26000,
    language: 'TypeScript',
    url: 'https://github.com/vercel/next.js',
    contributorsCount: 3100,
    recentActivityScore: 96.2,
    topics: ['nextjs', 'react', 'framework', 'ssr'],
    seekingContributors: true,
  },
  {
    repoName: 'shadcn-ui/ui',
    description:
      'Beautifully designed components that you can copy and paste into your apps.',
    stars: 75000,
    forks: 5800,
    language: 'TypeScript',
    url: 'https://github.com/shadcn-ui/ui',
    contributorsCount: 420,
    recentActivityScore: 94.0,
    topics: ['tailwind', 'radix-ui', 'components', 'react'],
    seekingContributors: true,
  },
  {
    repoName: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    stars: 82000,
    forks: 4200,
    language: 'TypeScript',
    url: 'https://github.com/tailwindlabs/tailwindcss',
    contributorsCount: 320,
    recentActivityScore: 89.5,
    topics: ['css', 'tailwind', 'design-system'],
    seekingContributors: false,
  },
  {
    repoName: 'supabase/supabase',
    description: 'The open source Firebase alternative.',
    stars: 74000,
    forks: 5400,
    language: 'TypeScript',
    url: 'https://github.com/supabase/supabase',
    contributorsCount: 1200,
    recentActivityScore: 92.8,
    topics: ['database', 'postgres', 'auth', 'realtime'],
    seekingContributors: true,
  },
  {
    repoName: 'astral-sh/uv',
    description:
      'An extremely fast Python package and project manager, written in Rust.',
    stars: 38000,
    forks: 950,
    language: 'Rust',
    url: 'https://github.com/astral-sh/uv',
    contributorsCount: 180,
    recentActivityScore: 95.0,
    topics: ['python', 'rust', 'package-manager'],
    seekingContributors: true,
  },
];

/** Fetch trending projects from Supabase database with fallback to curated defaults */
export async function fetchTrendingProjects(
  limit = 6,
): Promise<TrendingProject[]> {
  try {
    const { data, error } = await supabase
      .from('trending_projects')
      .select('*')
      .order('recent_activity_score', { ascending: false })
      .order('stars', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return FALLBACK_TRENDING_PROJECTS.slice(0, limit);
    }

    return data.map((row) => ({
      id: row.id,
      repoName: row.repo_name,
      description: row.description,
      stars: Number(row.stars) || 0,
      forks: Number(row.forks) || 0,
      language: row.language,
      url: row.url,
      contributorsCount: Number(row.contributors_count) || 0,
      recentActivityScore: Number(row.recent_activity_score) || 0,
      topics: Array.isArray(row.topics) ? row.topics : [],
      seekingContributors: Boolean(row.seeking_contributors),
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Failed to fetch trending projects:', err);
    return FALLBACK_TRENDING_PROJECTS.slice(0, limit);
  }
}

/** Sync and persist trending projects to the database using service role client */
export async function syncTrendingProjects(
  projects: TrendingProject[] = FALLBACK_TRENDING_PROJECTS,
): Promise<{ success: boolean; count: number }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase configuration missing for syncTrendingProjects');
    return { success: false, count: 0 };
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();
    const records = projects.map((p) => ({
      repo_name: p.repoName,
      description: p.description,
      stars: p.stars,
      forks: p.forks,
      language: p.language,
      url: p.url,
      contributors_count: p.contributorsCount,
      recent_activity_score: p.recentActivityScore,
      topics: p.topics,
      seeking_contributors: p.seekingContributors,
      updated_at: now,
    }));

    const { error } = await admin.from('trending_projects').upsert(records, {
      onConflict: 'repo_name',
    });

    if (error) {
      console.error('Failed to upsert trending_projects:', error.message);
      return { success: false, count: 0 };
    }

    return { success: true, count: projects.length };
  } catch (err) {
    console.error('Error in syncTrendingProjects:', err);
    return { success: false, count: 0 };
  }
}
