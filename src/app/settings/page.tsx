import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SettingsClient } from './client';

export const metadata: Metadata = {
  title: 'Profile Settings - OSSfolio',
  description:
    'Customize your OSSfolio profile with a custom headline, pinned repos, badges, and links.',
};

export default function SettingsPage() {
  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        <div
          style={{ maxWidth: '48rem', margin: '0 auto', padding: '56px 20px' }}
        >
          <header style={{ marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 500,
                color: '#171717',
                letterSpacing: '-0.42px',
                margin: 0,
              }}
            >
              Profile Settings
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: '#707070',
                margin: '8px 0 0 0',
              }}
            >
              Customize how your OSSfolio profile appears to visitors.
            </p>
          </header>
          <SettingsClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
