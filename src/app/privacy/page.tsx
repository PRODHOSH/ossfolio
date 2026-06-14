import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy - OSSfolio",
  description:
    "How OSSfolio handles your data. This page is a placeholder while the full privacy policy is being finalised.",
};

// Placeholder Privacy Policy page. The footer links here, so the route needs to
// resolve rather than 404. The detailed policy copy is still being written; the
// section outline below shows what the finished page will cover. Styled with the
// same inline-style language as the rest of the app (see score-explained/page.tsx)
// so it stays consistent with the existing pages.
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Information we collect",
    body: "OSSfolio builds your profile from public GitHub data. The full list of what is read and stored will be detailed here.",
  },
  {
    heading: "How we use your information",
    body: "An explanation of how your public activity is used to generate profiles, scores, and leaderboards will go here.",
  },
  {
    heading: "Data sharing",
    body: "Details on whether and how any data is shared with third parties will be documented in this section.",
  },
  {
    heading: "Your rights and choices",
    body: "Information about accessing, correcting, or removing your data will be provided here.",
  },
  {
    heading: "Contact",
    body: "Details on how to get in touch with questions about privacy will be added here.",
  },
];

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "#707070",
                margin: "8px 0 0 0",
                lineHeight: 1.55,
              }}
            >
              How OSSfolio handles your data, in plain language.
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
              This is a placeholder page - the full privacy policy is being finalised.
              The sections below outline what it will cover.
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
