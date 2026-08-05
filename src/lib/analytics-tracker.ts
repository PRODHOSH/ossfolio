import { supabase } from '@/lib/supabase';

function isDomain(hostname: string, targetDomain: string): boolean {
  return hostname === targetDomain || hostname.endsWith('.' + targetDomain);
}

function isGoogleDomain(hostname: string): boolean {
  return (
    isDomain(hostname, 'google.com') ||
    /^([a-z0-9-]+\.)*google\.[a-z]{2,}(\.[a-z]{2})?$/.test(hostname)
  );
}

export function parseReferrer(referrerHeader?: string | null): string {
  if (!referrerHeader || referrerHeader.trim() === '') {
    return 'Direct';
  }

  let hostname = '';
  try {
    const trimmed = referrerHeader.trim();
    // Ensure the URL has a protocol so the native URL constructor can parse the hostname
    const urlString = trimmed.toLowerCase().startsWith('http')
      ? trimmed
      : `https://${trimmed}`;

    const url = new URL(urlString);
    hostname = url.hostname.toLowerCase();
  } catch {
    // Gracefully fallback to Direct for completely malformed/unparseable strings
    return 'Direct';
  }

  if (!hostname) return 'Direct';

  if (isDomain(hostname, 'github.com')) return 'GitHub';
  if (
    isDomain(hostname, 't.co') ||
    isDomain(hostname, 'twitter.com') ||
    isDomain(hostname, 'x.com')
  ) {
    return 'Twitter / X';
  }
  if (isDomain(hostname, 'linkedin.com') || isDomain(hostname, 'lnkd.in')) {
    return 'LinkedIn';
  }
  if (
    isGoogleDomain(hostname) ||
    isDomain(hostname, 'bing.com') ||
    isDomain(hostname, 'duckduckgo.com') ||
    isDomain(hostname, 'yahoo.com')
  ) {
    return 'Search Engine';
  }
  if (isDomain(hostname, 'reddit.com')) return 'Reddit';
  if (isDomain(hostname, 'ycombinator.com')) return 'Hacker News';
  if (
    isDomain(hostname, 'dev.to') ||
    isDomain(hostname, 'hashnode.com') ||
    isDomain(hostname, 'medium.com')
  ) {
    return 'Tech Blogs';
  }

  return hostname.replace(/^www\./, '');
}

export function parseDeviceType(
  userAgent?: string | null,
): 'desktop' | 'mobile' | 'tablet' {
  if (!userAgent) return 'desktop';
  const lower = userAgent.toLowerCase();
  if (
    lower.includes('ipad') ||
    lower.includes('tablet') ||
    (lower.includes('android') && !lower.includes('mobile'))
  ) {
    return 'tablet';
  }
  if (
    lower.includes('mobile') ||
    lower.includes('iphone') ||
    lower.includes('android')
  ) {
    return 'mobile';
  }
  return 'desktop';
}

export async function hashVisitorIp(ip: string): Promise<string> {
  if (!ip) return 'anon';

  try {
    // 1. Uniqueness Guarantee: Use Web Crypto SHA-256 for collision resistance
    const data = new TextEncoder().encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `ip_${hashHex.slice(0, 16)}`;
  } catch {
    // Fallback for older runtime environments lacking crypto.subtle
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `ip_${Math.abs(hash).toString(36)}`;
  }
}

export interface TrackViewParams {
  username: string;
  referrerHeader?: string | null;
  visitorIp?: string | null;
  countryHeader?: string | null;
  cityHeader?: string | null;
  userAgent?: string | null;
}

export async function recordProfileView({
  username,
  referrerHeader,
  visitorIp,
  countryHeader,
  cityHeader,
  userAgent,
}: TrackViewParams): Promise<boolean> {
  if (!username || username.trim() === '') return false;

  const cleanUsername = username.toLowerCase();
  const referrer = parseReferrer(referrerHeader);
  const country = (
    countryHeader && countryHeader !== 'XX' ? countryHeader : 'Unknown'
  ).toUpperCase();
  const city = cityHeader || 'Unknown';
  const device_type = parseDeviceType(userAgent);

  // Await the new async crypto hashing function
  const ip_hash = await hashVisitorIp(visitorIp || '127.0.0.1');

  try {
    // Deduplicate / rate-limit: Check if same ip_hash viewed this username within 10 minutes (600s)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentView } = await supabase
      .from('profile_views')
      .select('id')
      .eq('username', cleanUsername)
      .eq('ip_hash', ip_hash)
      .gte('viewed_at', tenMinutesAgo)
      .limit(1)
      .maybeSingle();

    if (recentView) {
      // Already recorded a view from this visitor within 10 minutes
      return false;
    }

    // Insert new view log entry
    const { error } = await supabase.from('profile_views').insert({
      username: cleanUsername,
      referrer,
      country,
      city,
      ip_hash,
      device_type,
      viewed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to insert profile view:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Analytics view tracking bypassed:', err);
    return false;
  }
}
