"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface ProviderIntegrationsProps {
  username: string;
  isOwner?: boolean;
}

interface ProviderStatsItem {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  totalContributions?: number;
}

export function ProviderIntegrations({
  username,
  isOwner = false,
}: ProviderIntegrationsProps) {
  const [gitlabHandle, setGitlabHandle] = useState<string | null>(null);
  const [bitbucketHandle, setBitbucketHandle] = useState<string | null>(null);
  const [providerStats, setProviderStats] = useState<
    Record<string, ProviderStatsItem>
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [inputGitlab, setInputGitlab] = useState("");
  const [inputBitbucket, setInputBitbucket] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/profile/providers?username=${encodeURIComponent(username)}`,
      );
      if (res.ok) {
        const json = await res.json();
        setGitlabHandle(json.gitlabUsername || null);
        setBitbucketHandle(json.bitbucketUsername || null);
        setProviderStats(json.providerStats || {});
        setInputGitlab(json.gitlabUsername || "");
        setInputBitbucket(json.bitbucketUsername || "");
      }
    } catch (err) {
      console.error("Failed to load provider integrations:", err);
    }
  }, [username]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSaveProviders = async () => {
    setIsSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const res = await fetch("/api/profile/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          gitlabUsername: inputGitlab.trim() || null,
          bitbucketUsername: inputBitbucket.trim() || null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        await loadProviders();
      }
    } catch (err) {
      console.error("Error saving provider handles:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "32px",
        padding: "20px",
        borderRadius: "16px",
        backgroundColor: "var(--color-canvas-soft)",
        border: "1px solid var(--color-hairline)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Multi-Platform Integrations
          </h3>
          <p
            style={{
              fontSize: "12px",
              color: "var(--color-ink-mute)",
              margin: "2px 0 0 0",
            }}
          >
            Aggregated open-source contribution statistics across code hosting platforms.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-primary)",
              backgroundColor: "transparent",
              border: "1px solid var(--color-hairline)",
              borderRadius: "6px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {isEditing ? "Cancel" : "Manage Accounts"}
          </button>
        )}
      </div>

      {/* Edit Handles Form */}
      {isEditing && (
        <div
          style={{
            padding: "14px",
            borderRadius: "10px",
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-hairline-strong)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: "4px",
                }}
              >
                GitLab Handle
              </label>
              <input
                type="text"
                placeholder="e.g. gitlab-username"
                value={inputGitlab}
                onChange={(e) => setInputGitlab(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline)",
                  backgroundColor: "var(--color-canvas-soft)",
                  color: "var(--color-ink)",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-ink)",
                  marginBottom: "4px",
                }}
              >
                Bitbucket Handle
              </label>
              <input
                type="text"
                placeholder="e.g. bitbucket-username"
                value={inputBitbucket}
                onChange={(e) => setInputBitbucket(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-hairline)",
                  backgroundColor: "var(--color-canvas-soft)",
                  color: "var(--color-ink)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveProviders}
                style={{
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#ffffff",
                  backgroundColor: "var(--color-primary)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isSaving ? "wait" : "pointer",
                }}
              >
                {isSaving ? "Saving..." : "Save Handles"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {/* GitHub Card */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            backgroundColor: "var(--color-canvas)",
            border: "1px solid var(--color-hairline)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)" }}>
              🐙 GitHub
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#3ecf8e",
                backgroundColor: "rgba(62, 207, 142, 0.12)",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              Primary
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
            @{username}
          </div>
        </div>

        {/* GitLab Card */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            backgroundColor: "var(--color-canvas)",
            border: `1px solid ${
              gitlabHandle ? "rgba(252, 109, 38, 0.4)" : "var(--color-hairline)"
            }`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)" }}>
              🦊 GitLab
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: gitlabHandle ? "#fc6d26" : "var(--color-ink-mute)",
                backgroundColor: gitlabHandle
                  ? "rgba(252, 109, 38, 0.12)"
                  : "var(--color-canvas-soft)",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {gitlabHandle ? "Connected" : "Not Linked"}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
            {gitlabHandle ? `@${gitlabHandle}` : "No GitLab handle linked"}
          </div>

          {providerStats.gitlab && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--color-ink-mute)",
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid var(--color-hairline)",
              }}
            >
              ⚡ {providerStats.gitlab.commits} commits · 🔀 {providerStats.gitlab.prs} PRs
            </div>
          )}
        </div>

        {/* Bitbucket Card */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "10px",
            backgroundColor: "var(--color-canvas)",
            border: `1px solid ${
              bitbucketHandle ? "rgba(32, 80, 129, 0.4)" : "var(--color-hairline)"
            }`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)" }}>
              🪣 Bitbucket
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: bitbucketHandle ? "#205081" : "var(--color-ink-mute)",
                backgroundColor: bitbucketHandle
                  ? "rgba(32, 80, 129, 0.12)"
                  : "var(--color-canvas-soft)",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {bitbucketHandle ? "Connected" : "Not Linked"}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
            {bitbucketHandle ? `@${bitbucketHandle}` : "No Bitbucket handle linked"}
          </div>

          {providerStats.bitbucket && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--color-ink-mute)",
                marginTop: "6px",
                paddingTop: "6px",
                borderTop: "1px solid var(--color-hairline)",
              }}
            >
              ⚡ {providerStats.bitbucket.commits} commits · 🔀 {providerStats.bitbucket.prs} PRs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
