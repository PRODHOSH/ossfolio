"use client";

import {
  GitPullRequest,
  Activity,
  Code2,
  Building2,
  Award,
  Trophy,
  Share2,
  Flame,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { sectionEyebrowStyle } from "@/lib/sectionEyebrowStyle";

const features = [
  {
    icon: GitPullRequest,
    title: "Merged PRs & Issues",
    description:
      "Every PR you've merged into any public repo, every issue you've filed — counted, surfaced, and credited to you.",
  },
  {
    icon: Activity,
    title: "Contribution Heatmap",
    description:
      "A full-year heatmap of your activity across all repos, not just your own. Your streak and longest run are highlighted.",
  },
  {
    icon: Code2,
    title: "Tech Stack Detection",
    description:
      "Languages auto-detected from every repo you've contributed to — no tagging, no manual input, just your actual work.",
  },
  {
    icon: Building2,
    title: "Organization History",
    description:
      "Every open-source organization you've contributed to, displayed with their logo and a link. Your network, made visible.",
  },
  {
    icon: Award,
    title: "GSoC & GSSoC Badges",
    description:
      "Participated in Google Summer of Code, GSSoC, or other programs? Your badges show up automatically on your profile.",
  },
  {
    icon: Trophy,
    title: "Contributor Score",
    description:
      "A single number that summarises your impact — commits, PRs, reviews, stars earned — calibrated across the community.",
  },
  {
    icon: Flame,
    title: "Leaderboard",
    description:
      "See how you rank globally and within your stack. Filter by language, org, or program. Compete, get noticed.",
  },
  {
    icon: Share2,
    title: "Shareable Profile Link",
    description:
      "One link — ossfolio.me/username — that shows everything. Share it on your resume, LinkedIn, or anywhere else.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function Features() {
  return (
    <section
      id="features"
      style={{
        backgroundColor: "var(--color-canvas-soft)", // Swaps dynamically between light tint & dark layout layer
        borderTop: "1px solid var(--color-hairline-cool)",
        borderBottom: "1px solid var(--color-hairline-cool)",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
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
          <p style={sectionEyebrowStyle}>What you get</p>
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
            Everything GitHub doesn&apos;t show
          </h2>
          <p
            style={{
              marginTop: "12px",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "var(--color-ink-mute)",
              maxWidth: "480px",
              margin: "12px auto 0",
              transition: "color 0.2s ease",
            }}
          >
            OSSfolio pulls from the GitHub GraphQL API to build a complete
            picture of your contributions — automatically.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              variants={cardVariants}
              style={{
                backgroundColor: "var(--color-canvas)", // Switches back to default crisp base background per theme
                border: "1px solid var(--color-hairline)",
                borderRadius: "12px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition:
                  "background-color 0.2s ease, border-color 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "36px",
                  width: "36px",
                  backgroundColor: "var(--color-primary-soft)", // Replaces hardcoded alpha tint mix
                  borderRadius: "8px",
                }}
              >
                <Icon size={17} style={{ color: "var(--color-primary)" }} />
              </div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  transition: "color 0.2s ease",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--color-ink-mute)",
                  transition: "color 0.2s ease",
                }}
              >
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
