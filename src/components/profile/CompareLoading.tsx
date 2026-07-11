"use client";

import { SkeletonCard } from "@/components/ui/skeleton-card";

export function CompareLoading() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px",
        marginTop: "32px",
      }}
    >
      <SkeletonCard variant="profile-header" />
      <SkeletonCard variant="profile-header" />
    </div>
  );
}
