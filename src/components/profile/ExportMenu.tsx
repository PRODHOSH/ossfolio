"use client";

import { useState } from "react";
import { Download, Code, FileJson, FileSpreadsheet, QrCode, ChevronDown } from "lucide-react";
import { EmbedModal } from "./EmbedModal";
import { QRCodeModal } from "./QRCodeModal";

interface ExportMenuProps {
  username: string;
}

export function ExportMenu({ username }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);

  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-ink, #f8fafc)",
    backgroundColor: "var(--color-canvas-soft, rgba(255, 255, 255, 0.05))",
    border: "1px solid var(--color-hairline-strong, rgba(255, 255, 255, 0.12))",
    borderRadius: "6px",
    cursor: "pointer",
    lineHeight: 1,
    transition: "all 0.15s ease",
  };

  const itemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    color: "var(--color-ink, #f8fafc)",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    textDecoration: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={btnStyle}
        aria-label="Export profile contribution data"
      >
        <Download size={13} />
        <span>Export / Embed</span>
        <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "6px",
            width: "200px",
            backgroundColor: "var(--color-canvas-soft, #0d1117)",
            border: "1px solid var(--color-hairline-strong, rgba(255, 255, 255, 0.12))",
            borderRadius: "10px",
            padding: "6px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
            zIndex: 50,
          }}
        >
          <a
            href={`/api/export/${encodeURIComponent(username)}?format=json`}
            download
            onClick={() => setIsOpen(false)}
            style={itemStyle}
          >
            <FileJson size={14} color="#818cf8" />
            <span>Export JSON</span>
          </a>

          <a
            href={`/api/export/${encodeURIComponent(username)}?format=csv`}
            download
            onClick={() => setIsOpen(false)}
            style={itemStyle}
          >
            <FileSpreadsheet size={14} color="#34d399" />
            <span>Export CSV</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsEmbedOpen(true);
            }}
            style={itemStyle}
          >
            <Code size={14} color="#fbbf24" />
            <span>Embed / Get Badges</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsQROpen(true);
            }}
            style={itemStyle}
          >
            <QrCode size={14} color="#ec4899" />
            <span>QR Code</span>
          </button>
        </div>
      )}

      <EmbedModal
        username={username}
        isOpen={isEmbedOpen}
        onClose={() => setIsEmbedOpen(false)}
      />

      <QRCodeModal
        username={username}
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
      />
    </div>
  );
}
