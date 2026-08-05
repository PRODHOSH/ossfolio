import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function DigestLoading() {
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
          style={{ maxWidth: '56rem', margin: '0 auto', padding: '56px 20px' }}
        >
          {/* Header Skeleton */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-hairline-cool)',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                margin: '0 auto 16px',
              }}
            />
            <div
              style={{
                width: '240px',
                height: '32px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                margin: '0 auto 12px',
              }}
            />
            <div
              style={{
                width: '320px',
                height: '16px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                margin: '0 auto',
              }}
            />
          </div>

          {/* Digest Cards Skeleton */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: '200px',
                  backgroundColor: 'var(--color-canvas-soft)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-hairline)',
                  animation: 'sk-pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </>
  );
}
