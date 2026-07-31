"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className="mt-8 flex items-center justify-between gap-3 flex-wrap"
    >
      <div>
        {hasPrev ? (
          <Button asChild variant="outline" size="default">
            <Link href={buildUrl(currentPage - 1)}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="default" disabled>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {pageNumbers.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="text-xs text-ink-mute-2 px-1"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page)}
              className={cn(
                buttonVariants({
                  variant: page === currentPage ? "default" : "outline",
                  size: "sm",
                }),
                "min-w-9 h-9 relative no-underline",
                page !== currentPage && "border-hairline bg-transparent text-ink font-normal"
              )}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page === currentPage && (
                <motion.div
                  layoutId="active-page"
                  className="absolute inset-0 bg-primary rounded-sm z-[-1]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {page}
            </Link>
          ),
        )}
      </div>

      <div>
        {hasNext ? (
          <Button asChild variant="outline" size="default">
            <Link href={buildUrl(currentPage + 1)}>
              Next
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="default" disabled>
            Next
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        )}
      </div>
    </nav>
  );
}
