"use client";

import { useState } from "react";
import { getProfileUrl, generateQRCodePngUrl } from "@/lib/qr-code";

interface QRCodeModalProps {
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ username, isOpen, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const profileUrl = getProfileUrl(username);
  const qrImageUrl = generateQRCodePngUrl(profileUrl);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy profile link:", err);
    }
  };

  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `${username}-ossfolio-qr.png`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Failed to download QR code image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--color-canvas)",
          border: "1px solid var(--color-hairline-strong)",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "360px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "18px" }}>📱</span>
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              Profile QR Code
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "var(--color-ink-mute)",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* QR Code Card Frame */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            display: "inline-block",
            marginBottom: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt={`QR code linking to @${username}'s OSSfolio profile`}
            width={200}
            height={200}
            style={{ display: "block", margin: "0 auto" }}
          />

          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#171717",
              marginTop: "12px",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            @{username}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginTop: "2px",
            }}
          >
            OSSfolio Open Source Profile
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadPNG}
            style={{
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "var(--color-primary)",
              border: "none",
              borderRadius: "8px",
              cursor: isDownloading ? "wait" : "pointer",
            }}
          >
            {isDownloading ? "Downloading..." : "Download QR Code (.png)"}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              padding: "8px",
              fontSize: "12px",
              fontWeight: 500,
              color: copied ? "var(--color-primary)" : "var(--color-ink)",
              backgroundColor: "var(--color-canvas-soft)",
              border: `1px solid ${
                copied ? "var(--color-primary)" : "var(--color-hairline)"
              }`,
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {copied ? "Link Copied!" : "Copy Profile Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
