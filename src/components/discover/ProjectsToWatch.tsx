'use client';

import type { TrendingProject } from '@/lib/trending-projects';

interface ProjectsToWatchProps {
  projects: TrendingProject[];
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  'C++': '#f34b7d',
  Java: '#b07219',
  Ruby: '#701516',
};

export function ProjectsToWatch({ projects }: ProjectsToWatchProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <section
      style={{
        marginTop: '40px',
        marginBottom: '40px',
        padding: '24px',
        borderRadius: '16px',
        backgroundColor: 'var(--color-canvas-soft)',
        border: '1px solid var(--color-hairline)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-primary)',
              marginBottom: '4px',
            }}
          >
            <span>🔥</span> Community Highlights
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-ink)',
              margin: 0,
              letterSpacing: '-0.3px',
            }}
          >
            Projects to Watch
          </h2>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-mute)',
            margin: 0,
            maxWidth: '420px',
          }}
        >
          Discover high-impact open-source repositories with growing community
          activity and contribution opportunities.
        </p>
      </div>

      {/* Grid of Project Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {projects.map((project) => {
          const langColor =
            (project.language && LANG_COLORS[project.language]) ||
            'var(--color-ink-mute)';

          return (
            <div
              key={project.repoName}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline)',
                transition: 'border-color 0.2s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--color-hairline-strong)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-hairline)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      textDecoration: 'none',
                      wordBreak: 'break-word',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-ink)';
                    }}
                  >
                    {project.repoName}
                  </a>

                  {project.seekingContributors && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(62, 207, 142, 0.12)',
                        color: '#3ecf8e',
                        border: '1px solid rgba(62, 207, 142, 0.3)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      🌱 Seeking Contributors
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-ink-mute)',
                    lineHeight: 1.45,
                    margin: '0 0 12px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {project.description || 'No description provided.'}
                </p>

                {/* Topics tags */}
                {project.topics && project.topics.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      marginBottom: '14px',
                    }}
                  >
                    {project.topics.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-ink-mute)',
                          backgroundColor: 'var(--color-canvas-soft)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'ui-monospace, Menlo, Monaco, monospace',
                        }}
                      >
                        #{topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: 'var(--color-ink-mute)',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--color-hairline)',
                  marginTop: 'auto',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  {project.language && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: langColor,
                        }}
                      />
                      {project.language}
                    </span>
                  )}

                  <span>⭐ {project.stars.toLocaleString('en-US')}</span>
                </div>

                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                  }}
                >
                  View Project →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
