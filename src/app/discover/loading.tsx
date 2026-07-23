import { SkeletonCard } from '@/components/ui/skeleton-card';

export default function DiscoverLoading() {
  return (
    <div style={{ padding: '24px 0' }}>
      <div
        style={{
          width: '100%',
          height: '44px',
          backgroundColor: 'var(--color-hairline-cool)',
          borderRadius: '6px',
          animation: 'sk-pulse 1.5s ease-in-out infinite',
          marginBottom: '24px',
        }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
      <style>{`@keyframes sk-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
    </div>
  );
}
