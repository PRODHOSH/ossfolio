'use client';

import type { TechEntry, Repo } from '@/types';
import { calculateLanguageTreemapData } from '@/lib/language-treemap';

interface LanguageTreemapProps {
  techStack: TechEntry[];
  repos?: Repo[];
}

export function LanguageTreemap({
  techStack,
  repos = [],
}: LanguageTreemapProps) {
  const items = calculateLanguageTreemapData(techStack, repos);
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: 0,
            letterSpacing: '-0.1px',
          }}
        >
          Contribution Languages Treemap
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-ink-mute)' }}>
          Proportion of open-source projects
        </span>
      </div>

      {/* Proportional Stacked Bar */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '12px',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '16px',
          backgroundColor: 'var(--color-canvas-soft)',
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.language}
            title={`${item.language}: ${item.percentage}% (${item.repoCount} repo${item.repoCount === 1 ? '' : 's'})`}
            style={{
              width: `${item.percentage}%`,
              backgroundColor: item.color,
              borderTopLeftRadius: i === 0 ? '9999px' : 0,
              borderBottomLeftRadius: i === 0 ? '9999px' : 0,
              borderTopRightRadius: i === items.length - 1 ? '9999px' : 0,
              borderBottomRightRadius: i === items.length - 1 ? '9999px' : 0,
              transition: 'opacity 0.15s ease',
            }}
          />
        ))}
      </div>

      {/* Visual Treemap Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {items.map((item) => (
          <div
            key={item.language}
            style={{
              flexGrow: item.flexGrow,
              flexBasis: '120px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-canvas-soft)',
              border: '1px solid var(--color-hairline)',
              borderLeft: `4px solid ${item.color}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '68px',
              transition: 'border-color 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor =
                'var(--color-hairline-strong)';
              e.currentTarget.style.borderLeftColor = item.color;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-hairline)';
              e.currentTarget.style.borderLeftColor = item.color;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {item.language}
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-ink-mute)',
                  backgroundColor: 'var(--color-canvas)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {item.percentage}%
              </span>
            </div>

            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-mute)',
                marginTop: '4px',
              }}
            >
              {item.repoCount} repository{item.repoCount === 1 ? '' : 'ies'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
