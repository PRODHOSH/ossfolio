'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

interface HeroProps {
  onGetStarted: () => void;
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function Hero({ onGetStarted }: HeroProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/${trimmed}`);
  }

  return (
    <section
      style={{
        width: '100%',
        backgroundColor: 'var(--color-canvas)',
        transition: 'background-color 0.2s ease',
      }}
    >
      {/* 💡 Explicit pseudo-selector styling to link the placeholder directly to our dynamic theme typography layer */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hero-search-input::placeholder {
          color: var(--color-ink-mute) !important;
          opacity: 0.85;
          transition: color 0.2s ease;
        }
      `,
        }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={container}
        style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '80px 20px 96px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Pill */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 12px',
            marginBottom: '24px',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              height: '6px',
              width: '6px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-on-primary)',
            }}
          />
          Open Source · Free Forever
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            color: 'var(--color-ink)',
            maxWidth: '720px',
            transition: 'color 0.2s ease',
          }}
        >
          Your open-source identity,{' '}
          <span style={{ color: 'var(--color-primary)' }}>beyond GitHub.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          variants={fadeUp}
          style={{
            marginTop: '20px',
            maxWidth: '520px',
            fontSize: '18px',
            lineHeight: 1.6,
            color: 'var(--color-ink-mute)',
            transition: 'color 0.2s ease',
          }}
        >
          Sign in once. Get a shareable profile at{' '}
          <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>
            ossfolio.qzz.io/username
          </span>{' '}
          showing your real open-source impact — merged PRs, streaks, orgs,
          badges, and more.
        </motion.p>

        {/* Search bar */}
        <motion.form
          variants={fadeUp}
          onSubmit={handleSearch}
          style={{
            marginTop: '28px',
            display: 'flex',
            width: '100%',
            maxWidth: '420px',
            gap: '0',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-ink-mute-2)',
                pointerEvents: 'none',
                zIndex: 10,
                transition: 'color 0.2s ease',
              }}
            />
            <input
              type="text"
              value={query}
              className="hero-search-input"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a GitHub username..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                fontSize: '15px',
                fontWeight: 400,
                lineHeight: 1.5,
                color: 'var(--color-ink)',
                backgroundColor: 'var(--color-canvas)',
                border: '1px solid var(--color-hairline-strong)',
                borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                outline: 'none',
                transition:
                  'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-primary)')
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor =
                  'var(--color-hairline-strong)')
              }
            />
          </div>
          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              backgroundColor: 'var(--color-canvas-soft)',
              border: '1px solid var(--color-hairline-strong)',
              borderLeft: 'none',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition:
                'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-hairline-cool)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--color-canvas-soft)';
            }}
          >
            View profile
          </button>
        </motion.form>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          style={{
            marginTop: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={onGetStarted}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              WebkitFontSmoothing: 'antialiased',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                'var(--color-primary-deep)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-primary)')
            }
          >
            Get your profile free
            <ArrowRight
              size={15}
              style={{ color: 'var(--color-on-primary)' }}
            />
          </button>
          <a
            href="#how-it-works"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-canvas)',
              color: 'var(--color-ink)',
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--color-hairline-strong)',
              textDecoration: 'none',
              transition:
                'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                'var(--color-canvas-soft)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--color-canvas)')
            }
          >
            See how it works
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={fadeUp}
          style={{
            marginTop: '56px',
            paddingTop: '32px',
            borderTop: '1px solid var(--color-hairline-cool)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '48px',
            width: '100%',
            maxWidth: '480px',
            transition: 'border-color 0.2s ease',
          }}
        >
          {[
            { value: '10K+', label: 'Contributors' },
            { value: '500K+', label: 'PRs tracked' },
            { value: '100%', label: 'Free & open source' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  letterSpacing: '-0.4px',
                  transition: 'color 0.2s ease',
                }}
              >
                {value}
              </p>
              <p
                style={{
                  marginTop: '2px',
                  fontSize: '13px',
                  color: 'var(--color-ink-mute)',
                  transition: 'color 0.2s ease',
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
