"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import {
  GitPullRequest,
  CheckCircle2,
  Star,
  Award,
  Download,
  Share2,
  Copy,
  Check,
  Rss,
  Calendar,
  Sparkles,
  ExternalLink,
  Users,
  Code2,
  FileText,
} from "lucide-react";
import type { ContributionDigestData, DigestPeriod } from "@/lib/digest";

interface ContributionDigestProps {
  initialDigest: ContributionDigestData;
}

export function ContributionDigest({ initialDigest }: ContributionDigestProps) {
  const [period, setPeriod] = useState<DigestPeriod>(initialDigest.period);
  const [digest, setDigest] = useState<ContributionDigestData>(initialDigest);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePeriodChange = async (newPeriod: DigestPeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const res = await fetch(`/api/${initialDigest.username}/digest?period=${newPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch (err) {
      console.error("Failed to load digest period:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/digest/${digest.username}?period=${period}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy link failed:", err);
    }
  };

  const handleShareX = () => {
    const url = `${window.location.origin}/digest/${digest.username}?period=${period}`;
    const text = `Check out my ${period} Open Source Contribution Digest on OSSfolio! ${digest.stats.prsMerged} PRs merged, ${digest.stats.issuesResolved} issues resolved. 🚀\n${url}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 0.95 });
      const link = document.createElement("a");
      link.download = `${digest.username}-contribution-digest-${period}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image card:", err);
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Header Controls & Period Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => handlePeriodChange("weekly")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: period === "weekly" ? "#6366f1" : "transparent",
                color: period === "weekly" ? "#ffffff" : "var(--color-ink-muted, #94a3b8)",
              }}
            >
              Weekly Digest
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange("monthly")}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor: period === "monthly" ? "#6366f1" : "transparent",
                color: period === "monthly" ? "#ffffff" : "var(--color-ink-muted, #94a3b8)",
              }}
            >
              Monthly Digest
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleDownloadCard}
            disabled={downloading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={15} />
            {downloading ? "Exporting..." : "Download Card"}
          </button>

          <button
            type="button"
            onClick={handleShareX}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: "var(--color-ink, #f8fafc)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
            }}
          >
            <Share2 size={15} />
            Share on X
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: copied ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: copied ? "#4ade80" : "var(--color-ink, #f8fafc)",
              border: copied ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>

          <a
            href={`/api/${digest.username}/digest/feed`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "rgba(249, 115, 22, 0.15)",
              color: "#fb923c",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              textDecoration: "none",
            }}
          >
            <Rss size={15} />
            RSS Feed
          </a>
        </div>
      </div>

      {/* Main Digest Card Container (Exportable) */}
      <div
        ref={cardRef}
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow Effects */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%)",
            pointerEvents: "none",
          }}
        />

        {/* User Banner Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
            paddingBottom: "24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <img
              src={digest.avatarUrl}
              alt={digest.username}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "2px solid #6366f1",
                objectFit: "cover",
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  {digest.name || digest.username}
                </h1>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Score: {digest.score}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "#94a3b8", margin: "4px 0 0 0" }}>
                @{digest.username} • {digest.period.toUpperCase()} DIGEST
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#94a3b8",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Calendar size={15} color="#818cf8" />
            <span>
              {formatDate(digest.startDate)} – {formatDate(digest.endDate)}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            margin: "24px 0",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>PRs Merged</span>
              <GitPullRequest size={18} color="#a5b4fc" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", marginTop: "8px" }}>
              {digest.stats.prsMerged}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid rgba(34, 197, 94, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>Issues Resolved</span>
              <CheckCircle2 size={18} color="#4ade80" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", marginTop: "8px" }}>
              {digest.stats.issuesResolved}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>Repos Starred</span>
              <Star size={18} color="#fbbf24" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", marginTop: "8px" }}>
              {digest.stats.reposStarred}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              padding: "20px",
              borderRadius: "14px",
              border: "1px solid rgba(236, 72, 153, 0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>Achievements</span>
              <Award size={18} color="#f472b6" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", marginTop: "8px" }}>
              {digest.stats.achievementsEarned}
            </div>
          </motion.div>
        </div>

        {/* Top Contributions & Achievements Showcase Section */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", margin: "24px 0" }}>
          {/* Top Contributions */}
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Sparkles size={16} color="#818cf8" />
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#ffffff" }}>Top Contributions</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {digest.topContributions.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc" }}>{item.title}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{item.repoName}</div>
                  </div>
                  <ExternalLink size={14} color="#64748b" style={{ flexShrink: 0, marginLeft: "8px" }} />
                </a>
              ))}
            </div>
          </div>

          {/* Unlocked Achievements */}
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              borderRadius: "14px",
              padding: "20px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Award size={16} color="#f472b6" />
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#ffffff" }}>Earned Achievements</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {digest.achievements.map((ach, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(236, 72, 153, 0.08)",
                    border: "1px solid rgba(236, 72, 153, 0.2)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(236, 72, 153, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Award size={20} color="#f472b6" />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>{ach.name}</div>
                    <div style={{ fontSize: "11px", color: "#cbd5e1" }}>{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Timeline Section */}
        <div style={{ marginTop: "32px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
            Contribution Timeline
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {digest.activities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "14px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    marginTop: "2px",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor:
                      act.type === "pr_merged"
                        ? "rgba(99, 102, 241, 0.2)"
                        : act.type === "org_joined"
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(236, 72, 153, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {act.type === "pr_merged" && <GitPullRequest size={14} color="#818cf8" />}
                  {act.type === "org_joined" && <Users size={14} color="#34d399" />}
                  {act.type === "achievement_earned" && <Award size={14} color="#f472b6" />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>{act.title}</span>
                    <span style={{ fontSize: "11px", color: "#64748b", flexShrink: 0 }}>
                      {formatDate(act.timestamp)}
                    </span>
                  </div>
                  {act.description && (
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>{act.description}</p>
                  )}
                  {act.repoName && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "6px",
                        fontSize: "11px",
                        color: "#818cf8",
                        backgroundColor: "rgba(99, 102, 241, 0.1)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      {act.repoName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Brand Tag */}
        <div
          style={{
            marginTop: "32px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <span>Generated via OSSfolio Automated Contribution Digest</span>
          <span>https://ossfolio.qzz.io</span>
        </div>
      </div>
    </div>
  );
}
