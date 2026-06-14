import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service - OSSfolio",
  description:
    "The terms that govern your use of OSSfolio. This page is a placeholder while the full terms are being finalised.",
};

// Placeholder Terms of Service page. The footer links here, so the route needs
// to resolve rather than 404. The detailed terms are still being written; the
// section outline below shows what the finished page will cover. Styled with the
// same inline-style language as the rest of the app (see score-explained/page.tsx)
// so it stays consistent with the existing pages.
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Acceptance of terms",
    body: "By using OSSfolio you agree to these terms. The full acceptance language will be provided here.",
  },
  {
    heading: "Use of the service",
    body: "What you can and cannot do when using OSSfolio will be detailed in this section.",
  },
  {
    heading: "Profiles and public data",
    body: "An explanation of how profiles are generated from public GitHub data and what that means for you will go here.",
  },
  {
    heading: "Limitation of liability",
    body: "The standard limitation-of-liability terms for the service will be documented here.",
  },
  {
    heading: "Changes to these terms",
    body: "How updates to these terms are made and communicated will be described in this section.",
  },
  {
    heading: "Contact",
    body: "Details on how to get in touch with questions about these terms will be added here.",
  },
];

export default function TermsOfServicePage() {
  const sectionTitleStyle = {
    fontSize: "18px",
    fontWeight: 500,
    color: "#171717",
    margin: "0 0 8px 0",
  };
  const paragraphStyle = {
    fontSize: "15px",
    lineHeight: 1.55,
    color: "#707070",
    margin: 0,
  };

  return (
    <>
      <Navbar />
      <main style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>
        <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "56px 20px" }}>
          {/* Header */}
          <header style={{ marginBottom: "24px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "#171717",
                letterSpacing: "-0.42px",
                margin: 0,
              }}
            >
              Terms of Service
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#707070",
                margin: "8px 0 0 0",
                lineHeight: 1.55,
              }}
            >
              The terms that govern your use of OSSfolio.
            </p>
          </header>

          {/* Placeholder notice */}
          <div
            style={{
              border: "1px solid #ededed",
              borderRadius: "12px",
              backgroundColor: "#fafafa",
              padding: "16px 18px",
              marginBottom: "40px",
            }}
          >
            <p style={{ fontSize: "14px", lineHeight: 1.55, color: "#707070", margin: 0 }}>
              This is a placeholder page - the full terms of service are being finalised.
              The sections below outline what they will cover.
            </p>
          </div>

          {/* Section outline */}
          {SECTIONS.map((section, i) => (
            <section
              key={section.heading}
              style={{ marginBottom: i === SECTIONS.length - 1 ? "40px" : "28px" }}
            >
              <h2 style={sectionTitleStyle}>{section.heading}</h2>
              <p style={paragraphStyle}>{section.body}</p>
            </section>
          ))}

          {/* Back link */}
          <p style={{ margin: 0 }}>
            <Link
              href="/"
              style={{ fontSize: "14px", fontWeight: 500, color: "#171717" }}
            >
              Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
