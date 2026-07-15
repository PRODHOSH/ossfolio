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
        <div style={{ 
          padding: "16px", 
          border: "1px solid var(--color-hairline)", 
          borderRadius: "6px",
          color: "var(--color-ink-mute)",
          fontSize: "13px",
          backgroundColor: "var(--color-canvas-soft)"
        }}>
          No merged pull requests found.
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
