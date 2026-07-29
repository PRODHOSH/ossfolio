'use client';

import React from 'react';
import { getScoreBreakdown, SCORE_WEIGHTS, STAR_CAP } from '@/lib/score';
import type { ContributorStats } from '@/types';

interface ScoreBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ContributorStats;
  stars: number;
  score: number;
}

export function ScoreBreakdownModal({
  isOpen,
  onClose,
  stats,
  stars,
  score,
}: ScoreBreakdownModalProps) {
  if (!isOpen) return null;
  const rawSum =
    (stats.totalCommits || 0) * SCORE_WEIGHTS.COMMIT +
    (stats.totalPRs || 0) * SCORE_WEIGHTS.PR +
    (stats.totalIssues || 0) * SCORE_WEIGHTS.ISSUE +
    (stats.totalReviews || 0) * SCORE_WEIGHTS.REVIEW +
    Math.min(stars || 0, STAR_CAP) * SCORE_WEIGHTS.STAR;

  const hasDiscount = rawSum > score;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--color-canvas)',
          border: '1px solid var(--color-hairline)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Score Calculation Breakdown
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-ink-mute)',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Breakdown Items */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'var(--color-ink-mute)' }}>
              Commits ({stats.totalCommits || 0} &times; {SCORE_WEIGHTS.COMMIT})
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              +{(stats.totalCommits || 0) * SCORE_WEIGHTS.COMMIT}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'var(--color-ink-mute)' }}>
              Pull Requests ({stats.totalPRs || 0} &times; {SCORE_WEIGHTS.PR})
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              +{(stats.totalPRs || 0) * SCORE_WEIGHTS.PR}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'var(--color-ink-mute)' }}>
              Issues ({stats.totalIssues || 0} &times; {SCORE_WEIGHTS.ISSUE})
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              +{(stats.totalIssues || 0) * SCORE_WEIGHTS.ISSUE}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'var(--color-ink-mute)' }}>
              Reviews ({stats.totalReviews || 0} &times; {SCORE_WEIGHTS.REVIEW})
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              +{(stats.totalReviews || 0) * SCORE_WEIGHTS.REVIEW}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'var(--color-ink-mute)' }}>
              Stars (Cap {STAR_CAP})
            </span>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              +{Math.min(stars || 0, STAR_CAP) * SCORE_WEIGHTS.STAR}
            </span>
          </div>
        </div>

        {/* Anti-Gaming Transparency Callout */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: hasDiscount ? '#f59e0b' : 'var(--color-primary)',
              marginBottom: '4px',
            }}
          >
            {hasDiscount
              ? 'Anti-Gaming Heuristic Adjustment'
              : 'Anti-Gaming Verification'}
          </div>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-ink-mute)',
              margin: 0,
            }}
          >
            {hasDiscount
              ? 'Algorithmic anomaly discounts were applied to normalize repetitive activity and maintain score fairness.'
              : 'No suspicious activity detected. All contribution activities pass standard anti-gaming verification thresholds.'}
          </p>
        </div>

        {/* Total Score Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '14px',
            borderTop: '1px solid var(--color-hairline)',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--color-ink)',
            }}
          >
            Final Computed Rating
          </span>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}
          >
            {score.toLocaleString('en-US')}
          </span>
        </div>
      </div>
    </div>
  );
}
