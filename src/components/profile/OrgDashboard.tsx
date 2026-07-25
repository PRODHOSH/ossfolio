'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  GitFork,
  Star,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Code2,
  Award,
  Globe,
  Github,
} from 'lucide-react';
import type { OrgDashboardData } from '@/lib/org-data';

interface OrgDashboardProps {
  initialOrg: OrgDashboardData;
}

export function OrgDashboard({ initialOrg }: OrgDashboardProps) {
  const [org, setOrg] = useState<OrgDashboardData>(initialOrg);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(org.slug)}/refresh`,
        {
          method: 'POST',
        },
      );
      if (res.ok) {
        const data = await res.json();
        setOrg(data);
      }
    } catch (err) {
      console.error('Failed to refresh org dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch(
        `/api/org/${encodeURIComponent(org.slug)}/claim`,
        {
          method: 'POST',
        },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setClaimSuccess(true);
        setOrg((prev) => ({ ...prev, isClaimed: true }));
        setTimeout(() => {
          setIsClaimModalOpen(false);
          setClaimSuccess(false);
        }, 1500);
      } else {
        setClaimError(
          data.error || 'Claim failed. Make sure you are signed in.',
        );
      }
    } catch (err) {
      setClaimError('An unexpected error occurred.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Header Banner */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '32px',
          marginBottom: '24px',
          color: '#f8fafc',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img
              src={org.avatarUrl}
              alt={org.name}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                border: '2px solid #6366f1',
                objectFit: 'cover',
                backgroundColor: '#0d1117',
              }}
            />
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <h1
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    margin: 0,
                    color: '#ffffff',
                  }}
                >
                  {org.name}
                </h1>
                {org.isClaimed ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Verified Org
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <ShieldAlert size={13} />
                    Unclaimed (Claim Org)
                  </button>
                )}
              </div>

              {org.description && (
                <p
                  style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    margin: '6px 0 0 0',
                    maxWidth: '600px',
                  }}
                >
                  {org.description}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  marginTop: '10px',
                  fontSize: '13px',
                }}
              >
                <a
                  href={org.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#a5b4fc',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Github size={14} /> GitHub
                </a>
                {org.websiteUrl && (
                  <a
                    href={
                      org.websiteUrl.startsWith('http')
                        ? org.websiteUrl
                        : `https://${org.websiteUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#a5b4fc',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Globe size={14} /> Website
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {refreshing ? 'Refreshing...' : 'Refresh Stats'}
          </button>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginTop: '28px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <div
              style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 500 }}
            >
              Team Score
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#ffffff',
                marginTop: '4px',
              }}
            >
              {org.stats.teamScore}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Public Members
              </span>
              <Users size={16} color="#818cf8" />
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                marginTop: '4px',
              }}
            >
              {org.stats.memberCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Public Repos
              </span>
              <Code2 size={16} color="#4ade80" />
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                marginTop: '4px',
              }}
            >
              {org.stats.repoCount}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Total Stars
              </span>
              <Star size={16} color="#fbbf24" />
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
                marginTop: '4px',
              }}
            >
              {org.stats.totalStars.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Member Rankings & Showcase */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Members Leaderboard */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <Users size={18} color="#818cf8" />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                color: '#ffffff',
              }}
            >
              Member Contributor Leaderboard
            </h2>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {org.members.map((member, idx) => (
              <a
                key={member.login}
                href={`/${member.login}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#64748b',
                      width: '18px',
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <img
                    src={member.avatarUrl}
                    alt={member.login}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                    >
                      @{member.login}
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {member.role.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#818cf8',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  Score: {member.score}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Public Repositories */}
        <div
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <Code2 size={18} color="#4ade80" />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                color: '#ffffff',
              }}
            >
              Public Repositories
            </h2>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {org.repos.slice(0, 6).map((repo) => (
              <a
                key={repo.name}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {repo.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12px',
                      color: '#94a3b8',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Star size={12} color="#fbbf24" /> {repo.stars}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <GitFork size={12} /> {repo.forks}
                    </span>
                  </div>
                </div>
                {repo.description && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {repo.description}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {isClaimModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#0d1117',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              color: '#ffffff',
            }}
          >
            <h3
              style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}
            >
              Claim Ownership of @{org.slug}
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: '#94a3b8',
                lineHeight: 1.5,
                margin: '0 0 16px 0',
              }}
            >
              Claiming an organization verifies your ownership on OSSfolio,
              enables team customization, and grants administrator privileges.
            </p>

            {claimError && (
              <div
                style={{
                  color: '#f87171',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                {claimError}
              </div>
            )}

            {claimSuccess && (
              <div
                style={{
                  color: '#4ade80',
                  fontSize: '13px',
                  marginBottom: '12px',
                }}
              >
                ✓ Organization successfully claimed!
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming || claimSuccess}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {claiming ? 'Claiming...' : 'Confirm Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
