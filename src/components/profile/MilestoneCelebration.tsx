"use client";

import React, { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import type { Achievement } from "@/lib/achievements";

interface MilestoneCelebrationProps {
  achievement: Achievement | null;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function triggerConfettiBurst() {
  if (typeof window === "undefined") return;

  try {
    // Left cannon
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.7 },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
    });

    // Right cannon
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.7 },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
    });

    // Center star explosion
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        shapes: ["star", "circle"],
        colors: ["#fbbf24", "#f43f5e", "#6366f1"],
      });
    }, 250);
  } catch (err) {
    console.warn("Canvas confetti failed to render:", err);
  }
}

export function MilestoneCelebration({
  achievement,
  username,
  isOpen,
  onClose,
}: MilestoneCelebrationProps) {
  const fireConfetti = useCallback(() => {
    triggerConfettiBurst();
  }, []);

  useEffect(() => {
    if (isOpen && achievement) {
      fireConfetti();
    }
  }, [isOpen, achievement, fireConfetti]);

  // Declared above the early return below, with the other hooks.
  //
  // React identifies hook state by call order, so every hook has to run on
  // every render. This one sat after `if (!isOpen || !achievement) return null`,
  // which meant the component called two hooks while closed and three while
  // open. The `copied` state was created and torn down as the dialog toggled,
  // and any hook added after it would have landed on a shifting index — the
  // failure mode where state appears to belong to the wrong variable.
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !achievement) return null;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/milestones/${achievement.id}/share?username=${encodeURIComponent(username)}`
    : "";

  const shareText = `🏆 I unlocked the "${achievement.name}" milestone on OSSfolio (${achievement.tagline})! Check out my open-source profile:`;

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Milestone: ${achievement.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-celebration-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "var(--color-canvas, #0d1117)",
          border: "1px solid var(--color-hairline-strong, #30363d)",
          borderRadius: "16px",
          padding: "32px 24px 24px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          animation: "milestonePopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "var(--color-ink-mute, #8b949e)",
            fontSize: "20px",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "6px",
          }}
        >
          ✕
        </button>

        {/* Badge Banner */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "84px",
            height: "84px",
            borderRadius: "50%",
            backgroundColor: "var(--color-canvas-soft, #161b22)",
            border: "3px solid var(--color-primary, #3b82f6)",
            fontSize: "42px",
            marginBottom: "16px",
            boxShadow: "0 0 24px rgba(59, 130, 246, 0.4)",
          }}
        >
          {achievement.icon || "🏆"}
        </div>

        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "1.2px",
            color: "var(--color-primary, #3b82f6)",
            marginBottom: "6px",
          }}
        >
          Milestone Unlocked! 🎉
        </div>

        <h2
          id="milestone-celebration-title"
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--color-ink, #f0f6fc)",
            margin: "0 0 8px",
          }}
        >
          {achievement.name}
        </h2>

        <p
          style={{
            fontSize: "14px",
            color: "var(--color-ink-mute, #8b949e)",
            margin: "0 0 20px",
            lineHeight: "1.5",
          }}
        >
          {achievement.tagline}
        </p>

        {/* Re-fire Confetti Button */}
        <button
          onClick={fireConfetti}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            borderRadius: "20px",
            backgroundColor: "rgba(59, 130, 246, 0.15)",
            color: "var(--color-primary, #3b82f6)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            cursor: "pointer",
            marginBottom: "24px",
            transition: "all 0.2s ease",
          }}
        >
          ✨ Celebrate Again!
        </button>

        {/* Social Sharing Section */}
        <div
          style={{
            borderTop: "1px solid var(--color-hairline, #21262d)",
            paddingTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-ink-mute, #8b949e)",
              marginBottom: "12px",
            }}
          >
            Share your achievement
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleTwitterShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                backgroundColor: "#1da1f2",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Post on 𝕏
            </button>

            <button
              onClick={handleLinkedInShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                backgroundColor: "#0a66c2",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              LinkedIn
            </button>

            <button
              onClick={handleNativeShare}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                backgroundColor: "var(--color-canvas-soft, #21262d)",
                color: "var(--color-ink, #f0f6fc)",
                border: "1px solid var(--color-hairline-strong, #30363d)",
                cursor: "pointer",
              }}
            >
              {copied ? "Link Copied! ✓" : "Share / Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
