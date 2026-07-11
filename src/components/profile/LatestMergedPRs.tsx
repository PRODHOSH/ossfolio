import { useState } from 'react';
import type { MergedPR } from '@/types';

interface LatestMergedPRsProps {
  mergedPRs: MergedPR[];
}

export function LatestMergedPRs({ mergedPRs }: LatestMergedPRsProps) {
  const [filter, setFilter] = useState<'merged' | 'open' | 'closed'>('merged');

  if (!mergedPRs) {
    return null;
  }

  const selectStyle: React.CSSProperties = {
    padding: "5px 10px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--color-ink)",
    backgroundColor: "var(--color-canvas-soft)",
    border: "1px solid var(--color-hairline-strong)",
    borderRadius: "6px",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
  };

  const filtered = mergedPRs.filter((pr) => {
    const prState = pr.state || 'merged';
    return prState === filter;
  });

  const formatPRDate = (dateStr: string, prState: 'open' | 'closed' | 'merged') => {
    try {
      const formattedDate = new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (prState === 'merged') return `merged ${formattedDate}`;
      if (prState === 'closed') return `closed ${formattedDate}`;
      return `opened ${formattedDate}`;
    } catch {
      return '';
    }
  };

  return (
    <section style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
          Pull Requests
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          style={selectStyle}
          aria-label="Filter pull requests by status"
        >
          <option value="merged">Merged</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', margin: 0, padding: '12px 8px' }}>
          No {filter} pull requests found.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {filtered.map((pr) => (
            <li key={pr.url} style={{ marginBottom: '12px' }}>
              <a
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  color: 'var(--color-ink)',
                  backgroundColor: 'var(--color-canvas-soft)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-hairline-strong)',
                  transition: 'background-color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-hairline)';
                  e.currentTarget.style.borderColor = 'var(--color-ink)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-canvas-soft)';
                  e.currentTarget.style.borderColor = 'var(--color-hairline-strong)';
                }}
              >
                <span style={{ fontWeight: 500, marginBottom: '4px' }}>{pr.title}</span>
                <span style={{ fontSize: '13px', color: 'var(--color-ink-mute)' }}>
                  {pr.repoName} • {formatPRDate(pr.mergedAt, pr.state || 'merged')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
