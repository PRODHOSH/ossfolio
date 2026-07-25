import { supabase } from '@/lib/supabase';
import { sanitizeUrl } from '@/lib/validators/api';
import { sanitizeString } from '@/lib/sanitizer';
import type { FundingLink, SponsorItem } from '@/types';

export type { FundingLink, SponsorItem };

export interface SponsorshipData {
  username: string;
  fundingLinks: FundingLink[];
  sponsors: SponsorItem[];
}

export const SUPPORTED_FUNDING_PLATFORMS = [
  'GitHub Sponsors',
  'Patreon',
  'Open Collective',
  'Buy Me a Coffee',
  'Custom',
] as const;

/**
 * Validate and sanitize an array of funding link objects
 */
export function sanitizeFundingLinks(rawLinks: unknown): FundingLink[] {
  if (!Array.isArray(rawLinks)) return [];

  return rawLinks
    .slice(0, 10)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const l = item as Record<string, unknown>;
      const platformRaw = String(l.platform || 'Custom');
      const platform = (
        SUPPORTED_FUNDING_PLATFORMS as readonly string[]
      ).includes(platformRaw)
        ? (platformRaw as FundingLink['platform'])
        : 'Custom';

      const url = sanitizeUrl(l.url);
      if (!url) return null;

      return { platform, url };
    })
    .filter((item): item is FundingLink => item !== null);
}

/**
 * Validate and sanitize an array of sponsor items
 */
export function sanitizeSponsors(rawSponsors: unknown): SponsorItem[] {
  if (!Array.isArray(rawSponsors)) return [];

  const sponsors: SponsorItem[] = [];

  for (let index = 0; index < Math.min(rawSponsors.length, 20); index++) {
    const item = rawSponsors[index];
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const name = sanitizeString(s.name, 60);
    if (!name) continue;

    const tier = sanitizeString(s.tier, 40) || 'Sponsor';
    const logoUrl = sanitizeUrl(s.logoUrl) || undefined;
    const url = sanitizeUrl(s.url) || undefined;

    sponsors.push({
      id: `sponsor-${index}`,
      name,
      tier,
      logoUrl,
      url,
    });
  }

  return sponsors;
}

/**
 * Fetch public sponsorship and funding data for a given username
 */
export async function getSponsorshipData(
  username: string,
): Promise<SponsorshipData> {
  const cleanUsername = username.trim().toLowerCase();

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('funding_links, sponsors')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (profile) {
      return {
        username: cleanUsername,
        fundingLinks: sanitizeFundingLinks(profile.funding_links),
        sponsors: sanitizeSponsors(profile.sponsors),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch sponsorship data from Supabase:', err);
  }

  // Fallback defaults (or GitHub Sponsors link if none configured)
  return {
    username: cleanUsername,
    fundingLinks: [
      {
        platform: 'GitHub Sponsors',
        url: `https://github.com/sponsors/${cleanUsername}`,
      },
    ],
    sponsors: [],
  };
}
