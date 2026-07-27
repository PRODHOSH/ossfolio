"use client";

import { useState } from "react";
import { X, Copy, Check, Code, Shield, ExternalLink } from "lucide-react";

interface EmbedModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EmbedModal({ username, isOpen, onClose }: EmbedModalProps) {
  const [theme, setTheme] = useState<"dark" | "light" | "neon">("dark");
  const [compact, setCompact] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen) return null;

  const embedUrl = `https://ossfolio.qzz.io/embed/${username}?theme=${theme}&compact=${compact}&showHeatmap=${showHeatmap}`;
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="${
    compact ? "130" : "230"
  }" frameborder="0" style="border: none; border-radius: 14px; overflow: hidden;" title="OSSfolio Contributor Card"></iframe>`;

  const badgeUrl = `https://ossfolio.qzz.io/api/badge/${username}?type=score&theme=${theme}`;
  const markdownCode = `[![OSSfolio Score](${badgeUrl})](https://ossfolio.qzz.io/${username})`;

  const handleCopyIframe = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    } catch (err) {
      console.error("Copy iframe failed:", err);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownCode);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch (err) {
      console.error("Copy markdown failed:", err);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          backgroundColor: "#0d1117",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Code size={20} color="#818cf8" />
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
              Embed Widget &amp; Badges
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Customization Options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: "6px" }}>
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                backgroundColor: "#161b22",
                color: "#ffffff",
                border: "1px solid #30363d",
                fontSize: "13px",
              }}
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
              <option value="neon">Neon Theme</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
                style={{ accentColor: "#6366f1" }}
              />
              Compact Mode
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", marginTop: "8px" }}>
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                style={{ accentColor: "#6366f1" }}
              />
              Show Activity Graph
            </label>
          </div>
        </div>

        {/* Live Widget Preview */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>
            Live Widget Preview
          </div>
          <iframe
            src={`/embed/${username}?theme=${theme}&compact=${compact}&showHeatmap=${showHeatmap}`}
            width="100%"
            height={compact ? "130" : "230"}
            style={{ border: "none", borderRadius: "12px" }}
            title="Preview"
          />
        </div>

        {/* Copy HTML Iframe Code */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>HTML Iframe Code</span>
            <button
              type="button"
              onClick={handleCopyIframe}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: copiedIframe ? "#4ade80" : "#818cf8",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {copiedIframe ? <Check size={14} /> : <Copy size={14} />}
              {copiedIframe ? "Copied!" : "Copy Code"}
            </button>
          </div>
          <pre
            style={{
              backgroundColor: "#161b22",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e6edf3",
              overflowX: "auto",
              margin: 0,
              border: "1px solid #30363d",
            }}
          >
            <code>{iframeCode}</code>
          </pre>
        </div>

        {/* Copy Markdown Badge Code */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8" }}>Markdown Badge (GitHub README)</span>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: copiedMarkdown ? "#4ade80" : "#818cf8",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {copiedMarkdown ? <Check size={14} /> : <Copy size={14} />}
              {copiedMarkdown ? "Copied!" : "Copy Markdown"}
            </button>
          </div>
          <pre
            style={{
              backgroundColor: "#161b22",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e6edf3",
              overflowX: "auto",
              margin: 0,
              border: "1px solid #30363d",
            }}
          >
            <code>{markdownCode}</code>
          </pre>
        </div>

        {/* Documentation Link */}
        <div style={{ textAlign: "right" }}>
          <a
            href="/embed/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "13px",
              color: "#818cf8",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            View Embed Documentation <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
