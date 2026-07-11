"use client";

interface SearchAccessibilityAnnouncerProps {
  resultsCount: number;
  isLoading: boolean;
}

export function SearchAccessibilityAnnouncer({
  resultsCount,
  isLoading,
}: SearchAccessibilityAnnouncerProps) {
  const announcement = isLoading
    ? "Searching profiles, please wait..."
    : `Search completed. Found ${resultsCount} matching profile${resultsCount === 1 ? "" : "s"}.`;

  return (
    <output
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </output>
  );
}
