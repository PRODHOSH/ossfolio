import type { MergedPR } from '@/types';

interface LatestMergedPRsProps {
  mergedPRs: MergedPR[];
}

export function LatestMergedPRs({ mergedPRs }: LatestMergedPRsProps) {
  if (!mergedPRs || mergedPRs.length === 0) {
    return (
      <section style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, marginBottom: '12px' }}>
          Latest Merged Pull Requests
        </h2>
        <div
          style={{
            padding: '40px 20px',
            border: '1px dashed var(--color-hairline-strong)',
            borderRadius: '12px',
            textAlign: 'center',
            backgroundColor: 'var(--color-canvas-soft)',
          }}
        >
          <svg
            style={{ margin: '0 auto 12px', color: 'var(--color-ink-mute-2)' }}
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
            No merged pull requests yet
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', margin: '4px 0 0 0' }}>
            Merged PRs will appear here once they land in the contributor&apos;s repositories.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: '32px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0, marginBottom: '12px' }}>
        Latest Merged Pull Requests
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {mergedPRs.map((pr) => (
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
                {pr.repoName} • merged {new Date(pr.mergedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
