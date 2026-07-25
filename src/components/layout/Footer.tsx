"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Contact address surfaced in the footer. Defined as a constant so it lives in
 * one place if it changes.
 */
const CONTACT_EMAIL = "support@ossfolio.com";

const linkSections = [
  {
    key: "product",
    items: [
      { key: "features", href: "#features" },
      { key: "howItWorks", href: "#how-it-works" },
      { key: "leaderboard", href: "/explore", badge: true },
      { key: "howScoringWorks", href: "/score-explained" },
    ],
  },
  {
    key: "developers",
    items: [
      { key: "github", href: "https://github.com/PRODHOSH/ossfolio" },
      { key: "contributing", href: "https://github.com/PRODHOSH/ossfolio/blob/main/CONTRIBUTING.md" },
      { key: "issues", href: "https://github.com/PRODHOSH/ossfolio/issues" },
    ],
  },
  {
    key: "legal",
    items: [
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
      { key: "license", href: "https://github.com/PRODHOSH/ossfolio/blob/main/LICENSE" },
    ],
  },
] as const;

export function Footer() {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("Footer");
  const tSections = useTranslations("Footer.sections");
  const tLinks = useTranslations("Footer.links");
  return (
    <footer 
      role="contentinfo"
      aria-label={t("ariaLabel")}
      style={{ 
        backgroundColor: "var(--color-canvas)", 
        borderTop: "1px solid var(--color-hairline-cool)",
        transition: "background-color 0.2s ease, border-color 0.2s ease" 
      }}
    >
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
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)", transition: "color 0.2s ease" }}>OSS</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-primary)" }}>folio</span>
              </span>
            </Link>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--color-ink-mute)", maxWidth: "180px", transition: "color 0.2s ease" }}>
              {t("tagline")}
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
                color: "var(--color-ink-mute-2)",
                textDecoration: "none",
                transition: "color 0.2s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute-2)")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t("starOnGitHub")}
            </a>

            {/* Copy the contact address. Mirrors the inline "copied" feedback used by
                ProfileActions rather than introducing a toast dependency. */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(CONTACT_EMAIL);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                  console.error("Copy to clipboard failed:", err);
                }
              }}
              aria-label={t("copyEmailAria", { email: CONTACT_EMAIL })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: copied ? "var(--color-primary)" : "var(--color-ink-mute-2)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                transition: "color 0.2s ease",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {copied ? t("emailCopied") : t("copyEmail")}
            </button>
          </div>

          {/* Link cols */}
          {linkSections.map((section) => (
            <div key={section.key} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-ink)", transition: "color 0.2s ease" }}>
                {tSections(section.key)}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", padding: 0, margin: 0 }}>
                {section.items.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      style={{
                        fontSize: "13px",
                        color: "var(--color-ink-mute)",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "color 0.2s ease"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute)")}
                    >
                      {tLinks(item.key)}
                      {"badge" in item && item.badge && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            lineHeight: 1,
                            color: "var(--color-on-primary)",
                            backgroundColor: "var(--color-primary)",
                            borderRadius: "4px",
                            padding: "2px 5px",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {t("new")}
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
            borderTop: "1px solid var(--color-hairline-cool)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            transition: "border-color 0.2s ease"
          }}
        >
          <p style={{ fontSize: "12px", color: "var(--color-ink-mute-2)", transition: "color 0.2s ease" }}>
            {t("rights", { year: new Date().getFullYear() })}
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
            onMouseEnter={(e) => {
              const textSpan = e.currentTarget.querySelector('.author-name') as HTMLElement;
              if (textSpan) textSpan.style.color = "var(--color-primary)";
            }}
            onMouseLeave={(e) => {
              const textSpan = e.currentTarget.querySelector('.author-name') as HTMLElement;
              if (textSpan) textSpan.style.color = "var(--color-ink)";
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--color-ink-mute-2)", transition: "color 0.2s ease" }}>{t("builtBy")}</span>
            <Image
              src="https://avatars.githubusercontent.com/u/213995806?v=4"
              alt="PRODHOSH V.S"
              width={22}
              height={22}
              style={{ borderRadius: "9999px", border: "1px solid var(--color-hairline)", transition: "border-color 0.2s ease" }}
            />
            <span 
              className="author-name"
              style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-ink)", transition: "color 0.2s ease" }}
            >
              PRODHOSH V.S
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}