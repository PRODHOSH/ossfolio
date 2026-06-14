"use client";

import Image from "next/image";
import Link from "next/link";

const links: Record<string, { label: string; href: string; badge?: string }[]> = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Leaderboard", href: "/explore", badge: "New" },
    { label: "How scoring works", href: "/score-explained" },
  ],
  Developers: [
    { label: "GitHub", href: "https://github.com/PRODHOSH/ossfolio" },
    { label: "Contributing", href: "https://github.com/PRODHOSH/ossfolio/blob/main/CONTRIBUTING.md" },
    { label: "Issues", href: "https://github.com/PRODHOSH/ossfolio/issues" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "License (MIT)", href: "https://github.com/PRODHOSH/ossfolio/blob/main/LICENSE" },
  ],
};

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #ededed" }}>
      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "56px 20px" }}>

        {/* Top grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "40px",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <Image
                src="/logo.png"
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: "6px", flexShrink: 0 }}
              />
              <span style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#171717" }}>OSS</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#3ecf8e" }}>folio</span>
              </span>
            </Link>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#707070", maxWidth: "180px" }}>
              Your open-source identity, beyond GitHub.
            </p>
            <a
              href="https://github.com/PRODHOSH/ossfolio"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#9a9a9a",
                textDecoration: "none",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
          </div>

          {/* Link cols */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#171717" }}>
                {section}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                {items.map(({ label, href, badge }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      style={{
                        fontSize: "13px",
                        color: "#707070",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
                    >
                      {label}
                      {badge && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            lineHeight: 1,
                            color: "#171717",
                            backgroundColor: "#3ecf8e",
                            borderRadius: "4px",
                            padding: "2px 5px",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid #ededed",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <p style={{ fontSize: "12px", color: "#9a9a9a" }}>
            © {new Date().getFullYear()} OSSfolio. MIT License.
          </p>

          <a
            href="https://github.com/PRODHOSH"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "12px", color: "#9a9a9a" }}>Built by</span>
            <Image
              src="https://avatars.githubusercontent.com/u/213995806?v=4"
              alt="PRODHOSH V.S"
              width={22}
              height={22}
              style={{ borderRadius: "9999px", border: "1px solid #ededed" }}
            />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#171717" }}>
              PRODHOSH V.S
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
