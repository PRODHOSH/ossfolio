import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function CompareLoading() {
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
          style={{ maxWidth: '72rem', margin: '0 auto', padding: '56px 20px' }}
        >
          <header style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div
              style={{
                width: '320px',
                height: '36px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                margin: '0 auto 16px',
              }}
            />
            <div
              style={{
                width: '480px',
                height: '16px',
                backgroundColor: 'var(--color-hairline-cool)',
                borderRadius: '6px',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
                margin: '0 auto',
              }}
            />
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginTop: '48px',
            }}
          >
            {/* Left Col */}
            <div
              style={{
                height: '600px',
                backgroundColor: 'var(--color-canvas-soft)',
                borderRadius: '12px',
                border: '1px solid var(--color-hairline)',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Right Col */}
            <div
              style={{
                height: '600px',
                backgroundColor: 'var(--color-canvas-soft)',
                borderRadius: '12px',
                border: '1px solid var(--color-hairline)',
                animation: 'sk-pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </>
  );
}
