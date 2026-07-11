"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface DiscoverPaginationProps {
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function DiscoverPagination({
  currentPage,
  hasNext,
  hasPrev,
  baseUrl,
  searchParams = {},
}: DiscoverPaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  const btnStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--color-ink)",
    backgroundColor: "var(--color-canvas)",
    border: "1px solid var(--color-hairline-strong)",
    borderRadius: "6px",
    padding: "8px 16px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "border-color 0.15s, background-color 0.15s",
  };

  const disabledStyle: React.CSSProperties = {
    ...btnStyle,
    color: "var(--color-ink-faint)",
    borderColor: "var(--color-hairline)",
    pointerEvents: "none",
    opacity: 0.6,
  };

  const pageNumbers: (number | "...")[] = [];
  const total = hasNext ? currentPage + 2 : currentPage;
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(total, currentPage + 2);

  if (start > 1) pageNumbers.push(1);
  if (start > 2) pageNumbers.push("...");
  for (let i = start; i <= end; i++) pageNumbers.push(i);
  if (end < total - 1) pageNumbers.push("...");
  if (end < total) pageNumbers.push(total);

  return (
    <nav
      aria-label="Pagination"
      style={{
        marginTop: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div>
        {hasPrev ? (
          <Link href={buildUrl(currentPage - 1)} style={btnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Link>
        ) : (
          <span style={disabledStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {pageNumbers.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} style={{ fontSize: "13px", color: "var(--color-ink-mute-2)", padding: "0 4px" }}>
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page)}
              style={{
                minWidth: "36px",
                height: "36px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: page === currentPage ? 600 : 400,
                color: page === currentPage ? "#171717" : "var(--color-ink)",
                backgroundColor: page === currentPage ? "#3ecf8e" : "transparent",
                border: page === currentPage ? "none" : "1px solid var(--color-hairline)",
                borderRadius: "6px",
                textDecoration: "none",
                position: "relative",
              }}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page === currentPage && (
                <motion.div
                  layoutId="active-page"
                  className="absolute inset-0 bg-[#3ecf8e] rounded-md z-[-1]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {page}
            </Link>
          )
        )}
      </div>

      <div>
        {hasNext ? (
          <Link href={buildUrl(currentPage + 1)} style={btnStyle}>
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : (
          <span style={disabledStyle}>
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        )}
      </div>
    </nav>
  );
}
