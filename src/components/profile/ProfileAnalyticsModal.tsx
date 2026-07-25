'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';

interface ProfileAnalyticsModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  days: number;
  totalViews: number;
  uniqueVisitors: number;
  viewsTrend: Array<{ date: string; views: number; uniqueViews: number }>;
  referrers: Array<{ source: string; count: number; percentage: number }>;
  topCountries: Array<{ country: string; count: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
}

export function ProfileAnalyticsModal({
  username,
  isOpen,
  onClose,
}: ProfileAnalyticsModalProps) {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function fetchAnalytics() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        const res = await fetch(`/api/analytics/${username}?days=${days}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || `Error ${res.status}`);
        }

        const json: AnalyticsData = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to load analytics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      isMounted = false;
    };
  }, [username, days, isOpen]);

  if (!isOpen) return null;

  const peakDayViews = data?.viewsTrend
    ? Math.max(...data.viewsTrend.map((t) => t.views), 0)
    : 0;

  const topReferrer = data?.referrers?.length
    ? data.referrers[0].source
    : 'None';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--color-canvas, #121212)',
          border: '1px solid var(--color-hairline-strong, #2a2a2a)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          color: 'var(--color-ink, #ffffff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid var(--color-hairline, #222)',
            paddingBottom: '16px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-ink, #ffffff)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3ecf8e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Profile Analytics
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-ink-mute, #94a3b8)',
                margin: '4px 0 0 0',
              }}
            >
              Private visitor metrics for @{username}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Time period filter */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--color-canvas-soft, #1e1e1e)',
                padding: '3px',
                borderRadius: '8px',
              }}
            >
              {[7, 30, 90].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDays(num)}
                  style={{
                    fontSize: '12px',
                    fontWeight: days === num ? 600 : 400,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: days === num ? '#3ecf8e' : 'transparent',
                    color:
                      days === num
                        ? '#121212'
                        : 'var(--color-ink-mute, #94a3b8)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {num}d
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-ink-mute, #94a3b8)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
              }}
              aria-label="Close analytics modal"
            >
              &times;
            </button>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--color-ink-mute)',
            }}
          >
            <svg
              className="animate-spin"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3ecf8e"
              strokeWidth="3"
              style={{ margin: '0 auto 12px' }}
            >
              <circle cx="12" cy="12" r="10" stroke="rgba(62, 207, 142, 0.2)" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading profile traffic metrics...
          </div>
        ) : errorMsg ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--color-error, #ef4444)',
            }}
          >
            {errorMsg}
          </div>
        ) : data ? (
          <>
            {/* Metric Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-mute)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Total Views
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#3ecf8e',
                    marginTop: '4px',
                  }}
                >
                  {data.totalViews.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-mute)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Unique Visitors
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#60a5fa',
                    marginTop: '4px',
                  }}
                >
                  {data.uniqueVisitors.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-mute)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Top Referral
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#c084fc',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {topReferrer}
                </div>
              </div>

              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-mute)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Peak Day
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#fbbf24',
                    marginTop: '4px',
                  }}
                >
                  {peakDayViews.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Daily Traffic Recharts Chart */}
            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                border: '1px solid var(--color-hairline, #282828)',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: '0 0 16px 0',
                  color: 'var(--color-ink)',
                }}
              >
                Views Over Time ({days} Days)
              </h3>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.viewsTrend}>
                    <defs>
                      <linearGradient
                        id="colorViews"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3ecf8e"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3ecf8e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(str) => str.slice(5)}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#3ecf8e',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="Page Views"
                      stroke="#3ecf8e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorViews)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdowns: Referrers & Top Countries */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Referral Sources */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 12px 0',
                  }}
                >
                  Referral Sources
                </h3>
                {data.referrers.length === 0 ? (
                  <p
                    style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}
                  >
                    No referrer data recorded yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {data.referrers.map((ref) => (
                      <div key={ref.source}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            marginBottom: '4px',
                          }}
                        >
                          <span>{ref.source}</span>
                          <span style={{ color: 'var(--color-ink-mute)' }}>
                            {ref.count} ({ref.percentage}%)
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: '#262626',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${ref.percentage}%`,
                              height: '100%',
                              backgroundColor: '#60a5fa',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geographic Top Countries */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-canvas-soft, #1a1a1a)',
                  border: '1px solid var(--color-hairline, #282828)',
                }}
              >
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 12px 0',
                  }}
                >
                  Top Visitor Locations
                </h3>
                {data.topCountries.length === 0 ? (
                  <p
                    style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}
                  >
                    No location data recorded yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {data.topCountries.map((c) => (
                      <div
                        key={c.country}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--color-canvas, #121212)',
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>📍 {c.country}</span>
                        <span style={{ color: '#3ecf8e', fontWeight: 600 }}>
                          {c.count} views
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
