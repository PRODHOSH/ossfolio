import type { Achievement } from '@/lib/achievements';

/**
 * The achievements grid.
 *
 * Locked achievements are rendered too, dimmed, with a progress bar — that's the point of
 * the feature. The issue asks for "milestones to strive for", and a milestone you can't
 * see isn't one you can strive for, so this shows the whole set rather than only the
 * trophies already won.
 *
 * Styling follows DESIGN.md and the surrounding profile sections: CSS-variable tokens
 * (so it themes light/dark for free) and the 6px `--radius-sm` card corner.
 */

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 5"
        stroke="var(--color-on-primary)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { name, tagline, unlocked, current, target, progress } = achievement;
  const pct = Math.round(progress * 100);

  return (
    <li
      style={{
        listStyle: 'none',
        padding: '16px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${unlocked ? 'var(--color-primary)' : 'var(--color-hairline)'}`,
        backgroundColor: unlocked
          ? 'var(--color-canvas-soft)'
          : 'var(--color-canvas)',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            flexShrink: 0,
            borderRadius: 'var(--radius-full)',
            backgroundColor: unlocked ? 'var(--color-primary)' : 'transparent',
            border: unlocked
              ? 'none'
              : '1px dashed var(--color-hairline-strong)',
          }}
        >
          {unlocked && <CheckIcon />}
        </span>

        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
            letterSpacing: '-0.1px',
            color: unlocked ? 'var(--color-ink)' : 'var(--color-ink-mute)',
          }}
        >
          {name}
        </h3>
      </div>

      <p
        style={{
          fontSize: '13px',
          margin: '0 0 12px 0',
          color: 'var(--color-ink-mute)',
          lineHeight: 1.4,
        }}
      >
        {tagline}
      </p>

      {/* The bar is decorative; the accessible value lives on the row below, so a screen
          reader hears "Century: 42 of 100" once rather than twice. */}
      <div
        aria-hidden="true"
        style={{
          height: '4px',
          width: '100%',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-hairline)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 'var(--radius-full)',
            backgroundColor: unlocked
              ? 'var(--color-primary)'
              : 'var(--color-ink-mute-2)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          fontWeight: 500,
          color: unlocked
            ? 'var(--color-primary-deep)'
            : 'var(--color-ink-mute)',
        }}
      >
        <span aria-hidden="true">
          {unlocked ? 'Earned' : `${current} / ${target}`}
        </span>
        <span className="sr-only">
          {unlocked
            ? `${name} earned: ${tagline}.`
            : `${name} locked. ${current} of ${target}. ${tagline}.`}
        </span>
      </div>
    </li>
  );
}

export function AchievementsGrid({
  achievements,
  unlockedCount,
}: {
  achievements: Achievement[];
  unlockedCount: number;
}) {
  if (achievements.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '32px',
        borderBottom: '1px solid var(--color-hairline)',
        paddingBottom: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            margin: 0,
            letterSpacing: '-0.2px',
          }}
        >
          Achievements
        </h2>
        <span style={{ fontSize: '13px', color: 'var(--color-ink-mute)' }}>
          {unlockedCount} of {achievements.length} earned
        </span>
      </div>

      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          margin: 0,
          padding: 0,
        }}
      >
        {achievements.map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </ul>
    </div>
  );
}
