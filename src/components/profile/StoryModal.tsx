'use client';

import { useState } from 'react';
import type { ContributorStats, Repo } from '@/types';
import { generateOpenSourceStory } from '@/lib/open-source-story';

interface StoryModalProps {
  username: string;
  score: number;
  stats: ContributorStats;
  repos?: Repo[];
  isOpen: boolean;
  onClose: () => void;
}

export function StoryModal({
  username,
  score,
  stats,
  repos = [],
  isOpen,
  onClose,
}: StoryModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const story = generateOpenSourceStory(username, stats, repos, score);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(story.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy story markdown:', err);
    }
  };

  const handleShareX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(story.tweetText)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleDownloadFile = () => {
    const element = document.createElement('a');
    const file = new Blob([story.markdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${username}-open-source-story-${story.year}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-canvas)',
          border: '1px solid var(--color-hairline-strong)',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🚀</span>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                margin: 0,
              }}
            >
              My {story.year} Open Source Story
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--color-ink-mute)',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Story Card Content */}
        <div
          style={{
            backgroundColor: 'var(--color-canvas-soft)',
            border: '1px solid var(--color-hairline)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              marginBottom: '12px',
            }}
          >
            In {story.year}, @{username} made an impact on open source:
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                OSSfolio Score
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: 700, color: '#3ecf8e' }}
              >
                {score.toLocaleString('en-US')}
              </div>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                Total Commits
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                ⚡ {stats.totalCommits.toLocaleString('en-US')}
              </div>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                Merged PRs
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                🔀 {stats.totalPRs.toLocaleString('en-US')}
              </div>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
                Code Reviews
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                👀 {stats.totalReviews.toLocaleString('en-US')}
              </div>
            </div>
          </div>

          {story.topLanguage && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💻 Primary Language:</span>
              <strong style={{ color: 'var(--color-primary)' }}>
                {story.topLanguage}
              </strong>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={handleShareX}
            style={{
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: '#1d9bf0',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            Share Story on X (Twitter)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: copied ? '#3ecf8e' : 'var(--color-ink)',
                backgroundColor: 'var(--color-canvas-soft)',
                border: `1px solid ${copied ? '#3ecf8e' : 'var(--color-hairline)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {copied ? 'Markdown Copied!' : 'Copy Markdown'}
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--color-ink)',
                backgroundColor: 'var(--color-canvas-soft)',
                border: '1px solid var(--color-hairline)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Download .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
