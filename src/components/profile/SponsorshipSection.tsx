'use client';

import { Heart, ExternalLink, ShieldCheck, DollarSign } from 'lucide-react';
import type { SponsorshipData, FundingLink } from '@/lib/sponsors';

interface SponsorshipSectionProps {
  sponsorshipData: SponsorshipData;
}

const PLATFORM_COLORS: Record<
  FundingLink['platform'],
  { bg: string; color: string; border: string }
> = {
  'GitHub Sponsors': {
    bg: 'rgba(236, 72, 153, 0.12)',
    color: '#f472b6',
    border: 'rgba(236, 72, 153, 0.3)',
  },
  Patreon: {
    bg: 'rgba(249, 115, 22, 0.12)',
    color: '#fb923c',
    border: 'rgba(249, 115, 22, 0.3)',
  },
  'Open Collective': {
    bg: 'rgba(59, 130, 246, 0.12)',
    color: '#60a5fa',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  'Buy Me a Coffee': {
    bg: 'rgba(245, 158, 11, 0.12)',
    color: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  Custom: {
    bg: 'rgba(147, 51, 234, 0.12)',
    color: '#c084fc',
    border: 'rgba(147, 51, 234, 0.3)',
  },
};

export function SponsorshipSection({
  sponsorshipData,
}: SponsorshipSectionProps) {
  const { username, fundingLinks, sponsors } = sponsorshipData;

  if (fundingLinks.length === 0 && sponsors.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: '32px',
        padding: '24px',
        borderRadius: 'var(--radius-sm, 12px)',
        backgroundColor: 'var(--color-canvas-soft, rgba(15, 23, 42, 0.6))',
        border: '1px solid var(--color-hairline, rgba(255, 255, 255, 0.1))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={18} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--color-ink, #f8fafc)',
                margin: 0,
              }}
            >
              Sponsorship & Open Source Funding
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-mute, #94a3b8)',
                margin: '2px 0 0 0',
              }}
            >
              Support @{username}&apos;s open source work directly or join as a
              sponsor
            </p>
          </div>
        </div>
      </div>

      {/* Funding Action Buttons */}
      {fundingLinks.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: sponsors.length > 0 ? '24px' : '0',
          }}
        >
          {fundingLinks.map((link, idx) => {
            const styles =
              PLATFORM_COLORS[link.platform] || PLATFORM_COLORS.Custom;
            return (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: styles.bg,
                  color: styles.color,
                  border: `1px solid ${styles.border}`,
                  textDecoration: 'none',
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                }}
              >
                <Heart size={15} fill="currentColor" />
                <span>Sponsor on {link.platform}</span>
                <ExternalLink size={14} style={{ opacity: 0.7 }} />
              </a>
            );
          })}
        </div>
      )}

      {/* Active Sponsors Display */}
      {sponsors.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-ink, #f8fafc)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} color="#34d399" />
            <span>Active Sponsors & Backers ({sponsors.length})</span>
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id || sponsor.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {sponsor.logoUrl ? (
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    {sponsor.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ overflow: 'hidden' }}>
                  {sponsor.url ? (
                    <a
                      href={sponsor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-ink, #f8fafc)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sponsor.name}
                      </span>
                    </a>
                  ) : (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-ink, #f8fafc)',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sponsor.name}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#34d399',
                      backgroundColor: 'rgba(52, 211, 153, 0.1)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginTop: '2px',
                    }}
                  >
                    {sponsor.tier || 'Sponsor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
