'use client';

import React, { useState } from 'react';
import type { Achievement } from '@/lib/achievements';
import { MilestoneCard } from './MilestoneCard';

interface MilestoneTimelineProps {
  achievements: Achievement[];
  currentStreak?: number;
  longestStreak?: number;
  onCelebrate: (achievement: Achievement) => void;
  onShare: (achievement: Achievement) => void;
}

type FilterCategory =
  'all' | 'unlocked' | 'streak' | 'contributions' | 'community' | 'funding';

export function MilestoneTimeline({
  achievements,
  currentStreak = 0,
  longestStreak = 0,
  onCelebrate,
  onShare,
}: MilestoneTimelineProps) {
  const [filter, setFilter] = useState<FilterCategory>('all');

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const filteredAchievements = achievements.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'all') return true;
    return a.category === filter;
  });

  // Calculate next streak target
  const streakTargets = [7, 30, 100];
  const activeStreak = Math.max(currentStreak, longestStreak);
  const nextStreakTarget = streakTargets.find((t) => t > activeStreak) || 100;
  const streakProgressPct = Math.min(
    100,
    Math.round((activeStreak / nextStreakTarget) * 100),
  );

  return (
    <div
      style={{
        marginTop: '40px',
        paddingBottom: '32px',
        borderBottom: '1px solid var(--color-hairline, #21262d)',
      }}
    >
      {/* Header & Stats Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-ink, #f0f6fc)',
              margin: 0,
              letterSpacing: '-0.2px',
            }}
          >
            Streaks & Milestones 🏆
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-mute, #8b949e)',
              margin: '4px 0 0',
            }}
          >
            Track your open-source streaks, PR milestones, and community
            achievements.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Current Streak pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#fbbf24',
            }}
          >
            <span>🔥</span>
            <span>{currentStreak} Day Streak</span>
          </div>

          {/* Longest Streak pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#60a5fa',
            }}
          >
            <span>⚡</span>
            <span>{longestStreak} Day Max</span>
          </div>

          {/* Total Unlocked counter */}
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-mute, #8b949e)',
              fontWeight: 500,
            }}
          >
            {unlockedCount} / {achievements.length} Earned
          </span>
        </div>
      </div>

      {/* Gamified Active Streak Banner */}
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          background:
            'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🔥</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-ink, #f0f6fc)',
              }}
            >
              Streak Progress
            </span>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#fbbf24',
            }}
          >
            {activeStreak} / {nextStreakTarget} days
          </span>
        </div>

        <div
          style={{
            height: '8px',
            width: '100%',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${streakProgressPct}%`,
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
              transition: 'width 0.5s ease-out',
            }}
          />
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-ink-mute, #8b949e)',
          }}
        >
          {activeStreak >= nextStreakTarget
            ? "Awesome work! You've unlocked the streak milestone!"
            : `${nextStreakTarget - activeStreak} more active days to reach your next streak milestone (${nextStreakTarget} days)!`}
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {[
          { key: 'all', label: 'All Milestones' },
          { key: 'unlocked', label: `Unlocked (${unlockedCount})` },
          { key: 'streak', label: 'Streaks 🔥' },
          { key: 'contributions', label: 'Contributions 🚀' },
          { key: 'community', label: 'Community 👀' },
          { key: 'funding', label: 'Funding 💖' },
        ].map(({ key, label }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key as FilterCategory)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                borderRadius: '20px',
                border: `1px solid ${
                  isActive
                    ? 'var(--color-primary, #3b82f6)'
                    : 'var(--color-hairline, #21262d)'
                }`,
                backgroundColor: isActive
                  ? 'var(--color-primary, #3b82f6)'
                  : 'var(--color-canvas-soft, #161b22)',
                color: isActive ? '#ffffff' : 'var(--color-ink-mute, #8b949e)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Grid of Milestone Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {filteredAchievements.map((achievement) => (
          <MilestoneCard
            key={achievement.id}
            achievement={achievement}
            onCelebrate={onCelebrate}
            onShare={onShare}
          />
        ))}
      </div>
    </div>
  );
}
