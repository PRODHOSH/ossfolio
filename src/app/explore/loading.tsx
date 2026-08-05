import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function ExploreLoading() {
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
          <header style={{ marginBottom: '32px' }}>
            <div
              style={{
                width: '280px',
                height: '28px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                width: '420px',
                height: '15px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
          </header>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '44px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '160px',
                height: '44px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '44px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} variant="list" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </>
  );
}
