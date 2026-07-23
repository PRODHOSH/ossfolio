/**
 * src/app/[username]/loading.tsx
 *
 * Next.js App Router loading UI — displayed automatically while page.tsx
 * awaits its GitHub API fetches. Mirrors the ProfileView layout section by
 * section using grey shimmer blocks per the DESIGN.md palette:
 * canvas  var(--color-canvas) · hairline-cool var(--color-hairline) · hairline var(--color-hairline-strong)
 *
 * Rules: inline styles only, no Tailwind, no TypeScript errors. (Issue #42)
 */

import type { CSSProperties } from 'react';

// Shimmer base style — reused by every skeleton block.
// The 800px backgroundSize combined with the keyframe position sweep
// produces the left-to-right highlight that reads as a loading state.
const shimmer: CSSProperties = {
  background:
    'linear-gradient(90deg, var(--color-hairline) 25%, var(--color-hairline-strong) 50%, var(--color-hairline) 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.4s infinite linear',
  borderRadius: '6px',
};

// Reusable shimmer block. Accepts explicit dimensions and optional style
// overrides (e.g. borderRadius for circles/pills).
function Block({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        ...shimmer,
        width,
        height,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export default function ProfileLoading() {
  return (
    <>
      {/* Keyframe injected as a style tag — the only way to use @keyframes
          with inline-style-only components. */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
      `}</style>

      <main
        style={{ backgroundColor: 'var(--color-canvas)', minHeight: '100vh' }}
      >
        {/* Outer container mirrors ProfileView's maxWidth + padding exactly */}
        <div
          style={{
            maxWidth: '56rem',
            margin: '0 auto',
            padding: '48px 20px 80px',
          }}
        >
          {/* ── Profile header ──────────────────────────────────────── */}
          {/* Mirrors: flex row (avatar + info column), borderBottom */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '24px',
              flexWrap: 'wrap',
              paddingBottom: '40px',
              borderBottom: '1px solid var(--color-hairline)',
            }}
          >
            {/* Avatar — 88×88 circle matching Image dimensions in ProfileView */}
            <Block width={88} height={88} style={{ borderRadius: '9999px' }} />

            {/* Name / username / bio / links / follower counts */}
            <div
              style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0px',
              }}
            >
              {/* Display name — h1 24px */}
              <Block width={180} height={20} />
              {/* @username — 14px muted */}
              <Block width={110} height={14} style={{ marginTop: '8px' }} />
              {/* Bio — two lines */}
              <Block width="90%" height={14} style={{ marginTop: '14px' }} />
              <Block width="65%" height={14} style={{ marginTop: '6px' }} />

              {/* Location / website / twitter / github link row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '14px',
                }}
              >
                {([88, 110, 78, 68] as number[]).map((w, i) => (
                  <Block key={i} width={w} height={13} />
                ))}
              </div>

              {/* Followers · following · repos row */}
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                  marginTop: '14px',
                }}
              >
                {([72, 72, 56] as number[]).map((w, i) => (
                  <Block key={i} width={w} height={13} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Popular repositories ────────────────────────────────── */}
          {/* Mirrors: heading + repeat(auto-fill, minmax(280px, 1fr)) grid */}
          <div style={{ marginTop: '40px' }}>
            <Block width={158} height={16} style={{ marginBottom: '20px' }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '20px',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: '12px',
                    backgroundColor: 'var(--color-canvas-soft)',
                  }}
                >
                  {/* Repo name */}
                  <Block width="55%" height={14} />
                  {/* Description — two lines */}
                  <Block width="92%" height={12} />
                  <Block width="75%" height={12} />
                  {/* Language dot + stars + forks */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '4px',
                    }}
                  >
                    <Block width={52} height={12} />
                    <Block width={38} height={12} />
                    <Block width={38} height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Contribution stats ──────────────────────────────────── */}
          {/* Mirrors: heading + repeat(auto-fit, minmax(140px, 1fr)) grid */}
          <div style={{ marginTop: '44px' }}>
            <Block width={148} height={16} style={{ marginBottom: '20px' }} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '16px',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-canvas-soft)',
                  }}
                >
                  {/* Stat number */}
                  <Block width="55%" height={24} />
                  {/* Stat label */}
                  <Block width="80%" height={12} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Tech stack ──────────────────────────────────────────── */}
          {/* Mirrors: heading + flex-wrap pill row */}
          <div style={{ marginTop: '44px' }}>
            <Block width={96} height={16} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {([72, 90, 68, 80, 64, 88, 74, 66] as number[]).map((w, i) => (
                <Block
                  key={i}
                  width={w}
                  height={28}
                  style={{ borderRadius: '9999px' }}
                />
              ))}
            </div>
          </div>

          {/* ── Organizations ───────────────────────────────────────── */}
          {/* Mirrors: heading + flex-wrap row of avatar + name chips */}
          <div style={{ marginTop: '44px' }}>
            <Block width={118} height={16} style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {([80, 96, 72, 88, 76] as number[]).map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px 6px 6px',
                    border: '1px solid var(--color-hairline)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-canvas-soft)',
                  }}
                >
                  {/* Org avatar circle — 36×36 matching Image size in ProfileView */}
                  <Block
                    width={36}
                    height={36}
                    style={{ borderRadius: '9999px' }}
                  />
                  {/* Org handle */}
                  <Block width={w} height={13} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Contribution activity (heatmap) ─────────────────────── */}
          {/* Mirrors the heatmap section heading + the grid of week columns */}
          <div style={{ marginTop: '44px' }}>
            <Block width={178} height={16} style={{ marginBottom: '16px' }} />
            {/* Single shimmer rectangle represents the 52-week heatmap */}
            <Block width="100%" height={88} style={{ borderRadius: '8px' }} />
          </div>
        </div>
      </main>
    </>
  );
}
