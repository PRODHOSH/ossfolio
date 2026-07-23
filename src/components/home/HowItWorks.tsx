"use client";

import { motion, type Variants } from "framer-motion";
import { sectionEyebrowStyle } from "@/lib/sectionEyebrowStyle";

const steps = [
  {
    number: "01",
    title: "Sign in with GitHub",
    description:
      "One click with your GitHub account. No forms, no manual data entry. We only request read access to public information.",
  },
  {
    number: "02",
    title: "Your profile is built automatically",
    description:
      "We pull your contributions, PRs, issues, orgs, and tech stack from the GitHub API. Your profile is ready in seconds.",
  },
  {
    number: "03",
    title: "Share your link",
    description:
      "You get a public profile at ossfolio.me/username. Drop it on your resume, LinkedIn, or anywhere you want your work to be seen.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{
        backgroundColor: "var(--color-canvas)",
        transition: "background-color 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "80px 20px",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "48px" }}
        >
          <p style={sectionEyebrowStyle}>Simple by design</p>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 36px)",
              fontWeight: 600,
              color: "var(--color-ink)",
              letterSpacing: "-0.72px",
              lineHeight: 1.15,
              transition: "color 0.2s ease",
            }}
          >
            Up and running in 30 seconds
          </h2>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "32px",
          }}
        >
          {steps.map(({ number, title, description }) => (
            <motion.div
              key={number}
              variants={stepVariants}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "44px",
                  width: "44px",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "9999px",
                  backgroundColor: "var(--color-canvas)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                }}
              >
                {number}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    marginTop: "8px",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "var(--color-ink-mute)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
