'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Navbar />
      <main
        style={{
          backgroundColor: 'var(--color-canvas)',
          color: 'var(--color-ink)',
          minHeight: '100vh',
          transition: 'background-color 0.2s ease, color 0.2s ease',
        }}
      >
        <div
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            padding: '56px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              margin: '0 auto',
              padding: '48px 24px',
              border: '1px solid var(--color-hairline)',
              borderRadius: '12px',
              backgroundColor: 'var(--color-canvas-soft)',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-ink-mute-2)"
              strokeWidth="2"
              style={{ margin: '0 auto 16px', display: 'block' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                margin: '0 0 8px',
              }}
            >
              Leaderboard unavailable
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-ink-mute)',
                margin: '0 0 24px',
              }}
            >
              {error.message ||
                'Could not load the leaderboard. Please try again later.'}
            </p>
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}
            >
              <button
                onClick={reset}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#3ecf8e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-hairline-strong)',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  textDecoration: 'none',
                }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
