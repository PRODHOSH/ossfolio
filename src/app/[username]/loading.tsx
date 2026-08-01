/**
 * src/app/[username]/loading.tsx
 *
 * Next.js App Router loading UI — displayed automatically while page.tsx
 * awaits its GitHub API fetches. Mirrors the ProfileView layout section by
 * section using the profile skeleton components (bg-neutral-800 + Tailwind's
 * animate-pulse), so the page holds its shape while data loads.
 */

import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

export default function ProfileLoading() {
  return (
    <main
      style={{ backgroundColor: "var(--color-canvas)", minHeight: "100vh" }}
    >
      <ProfileSkeleton />
    </main>
  );
}

