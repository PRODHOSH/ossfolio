'use client';

import { useEffect, useState, useCallback } from 'react';
import type { GoodFirstIssue } from '@/lib/good-first-issues';

const LANGUAGES = ['All', 'TypeScript', 'Python', 'Rust', 'JavaScript', 'Go'];

export function GoodFirstIssueFinder() {
  const [issues, setIssues] = useState<GoodFirstIssue[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const loadIssues = useCallback(async (lang: string) => {
    setIsLoading(true);
    try {
      const url =
        lang === 'All'
          ? '/api/good-first-issues?limit=20'
          : `/api/good-first-issues?language=${encodeURIComponent(lang)}&limit=20`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setIssues(json.issues || []);
      }
    } catch (err) {
      console.error('Failed to load good first issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIssues(selectedLanguage);
  }, [selectedLanguage, loadIssues]);

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Header & Filter Pills */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              margin: '0 0 4px 0',
              letterSpacing: '-0.3px',
            }}
          >
            Find a Good First Issue
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink-mute)',
              margin: 0,
            }}
          >
            Beginner-friendly open-source issues labeled{' '}
            <code style={{ color: 'var(--color-primary)' }}>
              good first issue
            </code>{' '}
            or{' '}
            <code style={{ color: 'var(--color-primary)' }}>help wanted</code>.
          </p>
        </div>

        {/* Language Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLanguage(lang)}
                style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: isSelected
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--color-hairline)',
                  backgroundColor: isSelected
                    ? 'rgba(62, 207, 142, 0.12)'
                    : 'var(--color-canvas-soft)',
                  color: isSelected
                    ? 'var(--color-primary)'
                    : 'var(--color-ink-mute)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            padding: '40px 0',
            textAlign: 'center',
            color: 'var(--color-ink-mute)',
            fontSize: '14px',
          }}
        >
          Loading beginner issues...
        </div>
      )}

      {/* Issue cards listing */}
      {!isLoading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-canvas-soft)',
                border: '1px solid var(--color-hairline)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <a
                    href={issue.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      textDecoration: 'none',
                      backgroundColor: 'var(--color-canvas)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-hairline)',
                    }}
                  >
                    📦 {issue.repoName}
                  </a>

                  {issue.language && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-ink-mute)',
                        fontWeight: 500,
                      }}
                    >
                      • {issue.language}
                    </span>
                  )}
                </div>

                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                  }}
                >
                  View Issue on GitHub →
                </a>
              </div>

              <a
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-ink)';
                }}
              >
                {issue.title}
              </a>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                {/* Labels */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {issue.labels.map((label) => (
                    <span
                      key={label}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: label.includes('good first')
                          ? 'rgba(62, 207, 142, 0.12)'
                          : 'var(--color-canvas)',
                        color: label.includes('good first')
                          ? 'var(--color-primary)'
                          : 'var(--color-ink-mute)',
                        border: '1px solid var(--color-hairline)',
                      }}
                    >
                      🏷️ {label}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-mute)',
                  }}
                >
                  💬 {issue.commentsCount} comments
                </div>
              </div>
            </div>
          ))}

          {issues.length === 0 && (
            <div
              style={{
                padding: '32px 0',
                textAlign: 'center',
                color: 'var(--color-ink-mute)',
                fontSize: '14px',
              }}
            >
              No beginner issues found matching the selected language filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
