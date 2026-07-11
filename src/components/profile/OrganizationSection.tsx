"use client";

import Image from "next/image";
import type { Org } from "@/types";

interface OrganizationSectionProps {
  orgs: Org[];
}

export function OrganizationSection({ orgs }: OrganizationSectionProps) {
  if (orgs.length === 0) return null;

  return (
    <div style={{ marginTop: "44px" }}>
      <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: "0 0 16px 0", letterSpacing: "-0.2px" }}>
        Organizations
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {orgs.map((org) => (
          <a
            key={org.login}
            href={org.url}
            target="_blank"
            rel="noopener noreferrer"
            title={org.name ?? org.login}
            aria-label={`Organization ${org.name ?? org.login} (opens in a new tab)`}
            style={{
              display: "inline-flex",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--color-hairline)",
              transition: "border-color 0.15s",
            }}
          >
            <Image src={org.avatarUrl} alt={org.login} width={36} height={36} style={{ display: "block" }} />
          </a>
        ))}
      </div>
    </div>
  );
}
