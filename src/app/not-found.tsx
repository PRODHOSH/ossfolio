/**
 * src/app/not-found.tsx
 *
 * Global 404 fallback for any unmatched route across the app (the per-profile
 * 404 lives at src/app/[username]/not-found.tsx). Inline styles only - no
 * Tailwind layout/color classes - using the DESIGN.md palette:
 *   canvas #ffffff | ink #171717 | ink-mute #707070 | primary #3ecf8e
 *
 * Rules: inline styles only, no Tailwind, no TypeScript errors. (Issue #41)
 */

import Link from 'next/link';
import type { CSSProperties } from 'react';

const primaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '130px',
  padding: '10px 28px',
  borderRadius: '8px',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-on-primary)',
  fontSize: '16px',
  fontWeight: 600,
  textDecoration: 'none',
};

export default function NotFound() {
  return (
    <main
      style={{
        backgroundColor: 'var(--color-canvas)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
        {/* Illustration: astronaut floating in space */}
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <svg
            width="180"
            height="180"
            viewBox="0 0 180 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Astronaut floating in space"
          >
            {/* Stars */}
            <circle cx="20" cy="30" r="1.5" fill="#d1d5db" />
            <circle cx="50" cy="14" r="1" fill="#d1d5db" />
            <circle cx="145" cy="22" r="1.5" fill="#d1d5db" />
            <circle cx="165" cy="50" r="1" fill="#d1d5db" />
            <circle cx="160" cy="140" r="1.5" fill="#d1d5db" />
            <circle cx="14" cy="130" r="1" fill="#d1d5db" />
            <circle cx="35" cy="155" r="1.5" fill="#d1d5db" />
            <circle cx="130" cy="160" r="1" fill="#d1d5db" />

            {/* Tether */}
            <path
              d="M108 68 C120 60 138 55 155 50"
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
              fill="none"
            />

            {/* Suit body */}
            <ellipse cx="90" cy="105" rx="28" ry="32" fill="#e5e7eb" />

            {/* Helmet */}
            <circle cx="90" cy="72" r="22" fill="#e5e7eb" />
            {/* Visor */}
            <ellipse
              cx="90"
              cy="72"
              rx="14"
              ry="13"
              fill="#3ecf8e"
              opacity="0.85"
            />
            {/* Visor glare */}
            <ellipse cx="84" cy="66" rx="4" ry="3" fill="white" opacity="0.5" />

            {/* Suit chest panel */}
            <rect x="78" y="96" width="24" height="18" rx="4" fill="#d1d5db" />
            <rect x="82" y="100" width="6" height="4" rx="1" fill="#3ecf8e" />
            <rect x="91" y="100" width="6" height="4" rx="1" fill="#6b7280" />
            <rect x="82" y="107" width="15" height="3" rx="1" fill="#9ca3af" />

            {/* Left arm */}
            <path
              d="M62 100 C50 105 44 115 46 125"
              stroke="#e5e7eb"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Left glove */}
            <circle cx="46" cy="127" r="8" fill="#d1d5db" />

            {/* Right arm (waving) */}
            <path
              d="M118 100 C132 92 140 80 136 68"
              stroke="#e5e7eb"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right glove */}
            <circle cx="136" cy="66" r="8" fill="#d1d5db" />

            {/* Left leg */}
            <path
              d="M76 134 C72 148 70 158 68 165"
              stroke="#e5e7eb"
              strokeWidth="13"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="67" cy="166" rx="9" ry="5" fill="#d1d5db" />

            {/* Right leg */}
            <path
              d="M104 134 C108 148 110 158 112 165"
              stroke="#e5e7eb"
              strokeWidth="13"
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="113" cy="166" rx="9" ry="5" fill="#d1d5db" />

            {/* Helmet outline ring */}
            <circle
              cx="90"
              cy="72"
              r="22"
              stroke="#d1d5db"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        <p
          style={{
            fontSize: '72px',
            fontWeight: 700,
            lineHeight: 1,
            color: 'var(--color-primary)',
          }}
        >
          404
        </p>
        <h1
          style={{
            marginTop: '16px',
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            marginTop: '12px',
            fontSize: '16px',
            color: 'var(--color-ink-mute)',
          }}
        >
          The page you are looking for does not exist or may have moved.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '28px',
          }}
        >
          <Link href="/" style={primaryButton}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
