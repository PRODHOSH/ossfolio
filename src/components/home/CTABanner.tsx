"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CTABannerProps {
  onGetStarted: () => void;
}

export function CTABanner({ onGetStarted }: CTABannerProps) {
  return (
    <section
      style={{
        backgroundColor: "var(--color-canvas-soft)",
        borderTop: "1px solid var(--color-hairline-cool)",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        viewport={{ once: true }}
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "80px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 3.5vw, 36px)",
            fontWeight: 600,
            color: "var(--color-ink)",
            letterSpacing: "-0.72px",
            lineHeight: 1.15,
            maxWidth: "560px",
            transition: "color 0.2s ease",
          }}
        >
          Ready to share your open-source story?
        </h2>
        <p
          style={{
            marginTop: "16px",
            maxWidth: "420px",
            fontSize: "16px",
            lineHeight: 1.6,
            color: "var(--color-ink-mute)",
            transition: "color 0.2s ease",
          }}
        >
          It&apos;s free, takes 30 seconds, and your profile is live at
          ossfolio.me/username the moment you sign in.
        </p>
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <button
  onClick={onGetStarted}
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-on-primary)",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-3px) scale(1.03)";
    e.currentTarget.style.boxShadow =
      "0 8px 20px rgba(0,0,0,0.15)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "none";
  }}
>
  Get started for free

  <ArrowRight
    size={15}
    style={{
      transition: "transform 0.3s ease",
    }}
  />
</button>
          <a
  href="https://github.com/PRODHOSH/ossfolio"
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--color-canvas)",
    color: "var(--color-ink)",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 500,
    border: "1px solid var(--color-hairline)",
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor =
      "var(--color-canvas-soft)";
    e.currentTarget.style.borderColor =
      "var(--color-hairline-strong)";
    e.currentTarget.style.transform =
      "translateY(-3px) scale(1.03)";
    e.currentTarget.style.boxShadow =
      "0 8px 20px rgba(0,0,0,0.12)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor =
      "var(--color-canvas)";
    e.currentTarget.style.borderColor =
      "var(--color-hairline)";
    e.currentTarget.style.transform =
      "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "none";
  }}
>
  Star on GitHub
</a>
        </div>
      </motion.div>
    </section>
  );
}