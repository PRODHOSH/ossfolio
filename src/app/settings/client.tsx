"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";

interface CustomLink {
  label: string;
  url: string;
}

interface Badge {
  program: string;
  years: number[];
}

import type { FundingLink, SponsorItem } from "@/types";

interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface ProfileSettings {
  headline: string;
  pinned_repos: string[];
  custom_links: CustomLink[];
  badges: Badge[];
  visibility: "public" | "unlisted" | "private";
  funding_links: FundingLink[];
  sponsors: SponsorItem[];
}

const AVAILABLE_BADGES = [
  "GSoC",
  "Hacktoberfest",
  "MLH Fellow",
  "GitHub Star",
  "Arctic Code Vault",
  "Mars 2020",
  "ELUSOC 2026",
];

export function SettingsClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Account deletion. `deleteConfirm` holds what the user has typed into the confirmation box: the
  // button stays disabled until it matches their username exactly, so this cannot be triggered by a
  // stray click on an irreversible action.
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Developer API key state
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createKeyError, setCreateKeyError] = useState<string | null>(null);
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null); // key id being revoked
  const [copiedKey, setCopiedKey] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    headline: "",
    pinned_repos: [],
    custom_links: [],
    badges: [],
    visibility: "public",
    funding_links: [],
    sponsors: [],
  });

  const fetchSettings = async (token: string) => {
    try {
      const resp = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setSettings({
          headline: data.headline || "",
          pinned_repos: data.pinned_repos || [],
          custom_links: data.custom_links || [],
          badges: data.badges || [],
          visibility: data.visibility || "public",
          funding_links: data.funding_links || [],
          sponsors: data.sponsors || [],
        });
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeys = useCallback(async (token: string) => {
    setApiKeyLoading(true);
    try {
      const resp = await fetch("/api/settings/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        setApiKeys(Array.isArray(json.data) ? json.data : []);
      }
    } finally {
      setApiKeyLoading(false);
    }
  }, []);

  const handleCreateKey = useCallback(async () => {
    if (!session || !newKeyName.trim()) return;
    setCreatingKey(true);
    setCreateKeyError(null);
    try {
      const resp = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = await resp.json();
      if (resp.ok) {
        setNewKeyName("");
        setNewKeyResult({ key: json.data.key, name: json.data.name });
        fetchApiKeys(session.access_token);
      } else {
        setCreateKeyError(json.error?.message || "Failed to create key");
      }
    } catch {
      setCreateKeyError("Network error. Please try again.");
    } finally {
      setCreatingKey(false);
    }
  }, [session, newKeyName, fetchApiKeys]);

  const handleRevokeKey = useCallback(async (keyId: string) => {
    if (!session) return;
    setRevoking(keyId);
    try {
      const resp = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (resp.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } finally {
      setRevoking(null);
    }
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchSettings(s.access_token);
        fetchApiKeys(s.access_token);
      } else {
        setLoading(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSave = useCallback(async () => {
    if (!session || !loaded) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const payload = {
      headline: settings.headline.trim(),
      pinned_repos: settings.pinned_repos
        .map((r) => r.trim())
        .filter((r) => r.length > 0),
      custom_links: settings.custom_links.filter(
        (l) => l.label.trim() && l.url.trim(),
      ),
      badges: settings.badges.filter((b) => b.program.trim()),
      visibility: settings.visibility,
      funding_links: settings.funding_links.filter((f) => f.url.trim()),
      sponsors: settings.sponsors.filter((s) => s.name.trim()),
    };

    try {
      const resp = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        setSaved(true);
      } else {
        const body = await resp.json().catch(() => ({}));
        setSaveError(body.error || "Failed to save. Please try again.");
      }
    } catch {
      // A request that never produces a response — offline, DNS failure, an
      // aborted connection — rejects rather than resolving, so it took neither
      // branch above. Without this the spinner cleared in `finally` and nothing
      // else changed: the entered values were still on screen, unsaved, with no
      // indication that anything had gone wrong.
      setSaveError("Network error. Your changes were not saved.");
    } finally {
      setSaving(false);
    }
  }, [session, settings, loaded]);

  const handleDelete = useCallback(async () => {
    if (!session || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const resp = await fetch("/api/settings", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setDeleteError(
          body.error || "Failed to delete account. Please try again.",
        );
        setDeleting(false);
        return;
      }

      // The account is gone, so the session in localStorage now points at a user that no longer
      // exists. Signing out clears it; a hard navigation rather than a router push, because every
      // cached server component on this origin was rendered for a user who has just ceased to be.
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }, [session, deleting]);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  if (loading) {
    return (
      <p style={{ color: "var(--color-ink-mute-2)", fontSize: "14px" }}>
        Loading...
      </p>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          border: "1px solid var(--color-hairline)",
          borderRadius: "12px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--color-ink)",
            margin: "0 0 16px 0",
          }}
        >
          Sign in to customize your profile
        </p>
        <button
          onClick={handleLogin}
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-on-dark)",
            backgroundColor: "var(--color-ink)",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: "15px",
    padding: "10px 14px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "6px",
    backgroundColor: "var(--color-canvas-soft)",
    color: "var(--color-ink)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--color-ink)",
    display: "block",
    marginBottom: "6px",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "32px",
    paddingBottom: "32px",
    borderBottom: "1px solid var(--color-hairline)",
  };

  return (
    <div>
      <div style={sectionStyle}>
        <label style={labelStyle}>Custom Headline</label>
        <input
          type="text"
          placeholder="Your custom tagline (replaces GitHub bio)"
          value={settings.headline}
          onChange={(e) =>
            setSettings((s) => ({ ...s, headline: e.target.value }))
          }
          maxLength={160}
          style={inputStyle}
          aria-label="Custom headline"
        />
        <p
          style={{
            fontSize: "12px",
            color: "var(--color-ink-mute-2)",
            marginTop: "4px",
          }}
        >
          {settings.headline.length}/160 characters
        </p>
        <div
          style={{
            marginTop: "16px",
            padding: "16px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "8px",
            backgroundColor: "var(--color-canvas-soft)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-ink-mute)",
              margin: "0 0 8px 0",
            }}
          >
            Live Preview
          </p>

          <p
            style={{
              fontSize: "14px",
              color: "var(--color-ink)",
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            {settings.headline.trim()
              ? settings.headline
              : "Your GitHub bio will appear here if no custom headline is set."}
          </p>
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Pinned Repositories (up to 6)</label>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-mute)",
            margin: "0 0 8px 0",
          }}
        >
          Enter repo names (e.g. &quot;my-project&quot;) to pin on your profile.
        </p>
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            type="text"
            placeholder={`Repo ${i + 1}`}
            value={settings.pinned_repos[i] || ""}
            onChange={(e) => {
              setSettings((s) => {
                const repos = [...s.pinned_repos];
                repos[i] = e.target.value;
                return { ...s, pinned_repos: repos };
              });
            }}
            style={{ ...inputStyle, marginBottom: "8px" }}
            aria-label={`Pinned repo ${i + 1}`}
          />
        ))}
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Badges</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {AVAILABLE_BADGES.map((badge) => {
            const isSelected = settings.badges.some((b) => b.program === badge);
            return (
              <button
                key={badge}
                type="button"
                onClick={() => {
                  setSettings((s) => ({
                    ...s,
                    badges: isSelected
                      ? s.badges.filter((b) => b.program !== badge)
                      : [
                          ...s.badges,
                          { program: badge, years: [new Date().getFullYear()] },
                        ],
                  }));
                }}
                style={{
                  fontSize: "13px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: isSelected
                    ? "1px solid var(--color-primary-deep)"
                    : "1px solid var(--color-hairline)",
                  backgroundColor: isSelected
                    ? "rgba(62, 207, 142, 0.1)"
                    : "var(--color-canvas)",
                  color: isSelected
                    ? "var(--color-primary-deep)"
                    : "var(--color-ink-mute)",
                  fontWeight: 500,
                }}
                aria-pressed={isSelected}
              >
                {badge}
              </button>
            );
          })}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Custom Links (up to 5)</label>
        {Array.from({
          length: Math.min(5, (settings.custom_links.length || 0) + 1),
        }).map((_, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
          >
            <input
              type="text"
              placeholder="Label"
              value={settings.custom_links[i]?.label || ""}
              onChange={(e) => {
                setSettings((s) => {
                  const links = [...s.custom_links];
                  links[i] = {
                    label: e.target.value,
                    url: links[i]?.url || "",
                  };
                  return { ...s, custom_links: links };
                });
              }}
              style={{ ...inputStyle, flex: 1 }}
              aria-label={`Link ${i + 1} label`}
            />
            <input
              type="url"
              placeholder="https://..."
              value={settings.custom_links[i]?.url || ""}
              onChange={(e) => {
                setSettings((s) => {
                  const links = [...s.custom_links];
                  links[i] = {
                    label: links[i]?.label || "",
                    url: e.target.value,
                  };
                  return { ...s, custom_links: links };
                });
              }}
              style={{ ...inputStyle, flex: 2 }}
              aria-label={`Link ${i + 1} URL`}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "32px" }}>
        <label style={labelStyle}>Profile Visibility</label>
        <select
          value={settings.visibility}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              visibility: e.target.value as "public" | "unlisted" | "private",
            }))
          }
          style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
          aria-label="Profile visibility"
        >
          <option value="public">Public (visible on Discover)</option>
          <option value="unlisted">
            Unlisted (only accessible via direct link)
          </option>
          <option value="private">Private (profile page returns 404)</option>
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !loaded}
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#ffffff",
          backgroundColor: "var(--color-primary-deep)",
          border: "none",
          borderRadius: "6px",
          padding: "12px 24px",
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
      {saved && (
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-primary-deep)",
            marginLeft: "12px",
          }}
        >
          Saved successfully!
        </span>
      )}
      {saveError && (
        <span
          style={{ fontSize: "13px", color: "#b91c1c", marginLeft: "12px" }}
        >
          {saveError}
        </span>
      )}

      {/* ── Developer API ──────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: "48px",
          paddingTop: "32px",
          borderTop: "1px solid var(--color-hairline)",
          marginBottom: "32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
            Developer API
          </h2>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", margin: "0 0 20px 0", lineHeight: 1.6 }}>
          Use API keys to authenticate requests to{" "}
          <code style={{ fontSize: "12px", backgroundColor: "var(--color-canvas-soft)", padding: "1px 5px", borderRadius: "4px", border: "1px solid var(--color-hairline)" }}>
            GET /api/v1/users/:username
          </code>.
          Authenticated requests get a higher rate limit (1 000 req/min vs 60 for anonymous).
          Keys start with <code style={{ fontSize: "12px", backgroundColor: "var(--color-canvas-soft)", padding: "1px 5px", borderRadius: "4px", border: "1px solid var(--color-hairline)" }}>osk_</code>.
        </p>

        {/* Existing keys */}
        {apiKeyLoading ? (
          <p style={{ fontSize: "13px", color: "var(--color-ink-mute)" }}>Loading keys…</p>
        ) : apiKeys.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--color-ink-mute)", marginBottom: "16px" }}>No API keys yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {apiKeys.map((k) => (
              <div
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 16px",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "8px",
                  backgroundColor: "var(--color-canvas-soft)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-ink)" }}>{k.name}</span>
                  <span style={{ fontSize: "12px", color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}>
                    {k.key_prefix}•••••••••••••••••••
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--color-ink-mute)" }}>
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at ? ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}` : " · Never used"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeKey(k.id)}
                  disabled={revoking === k.id}
                  aria-label={`Revoke API key ${k.name}`}
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "1px solid #b91c1c",
                    backgroundColor: "transparent",
                    color: "#b91c1c",
                    cursor: revoking === k.id ? "wait" : "pointer",
                    opacity: revoking === k.id ? 0.5 : 1,
                    flexShrink: 0,
                  }}
                >
                  {revoking === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create new key */}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Key name (e.g. My Portfolio Widget)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            maxLength={64}
            style={{
              fontSize: "14px",
              padding: "9px 12px",
              border: "1px solid var(--color-hairline)",
              borderRadius: "6px",
              backgroundColor: "var(--color-canvas-soft)",
              color: "var(--color-ink)",
              flex: "1 1 200px",
              minWidth: "160px",
            }}
            aria-label="New API key name"
            id="api-key-name-input"
          />
          <button
            type="button"
            onClick={handleCreateKey}
            disabled={creatingKey || !newKeyName.trim()}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              padding: "9px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--color-primary-deep)",
              color: "#ffffff",
              cursor: creatingKey || !newKeyName.trim() ? "not-allowed" : "pointer",
              opacity: creatingKey || !newKeyName.trim() ? 0.6 : 1,
              flexShrink: 0,
            }}
            id="create-api-key-btn"
          >
            {creatingKey ? "Creating…" : "Create key"}
          </button>
        </div>
        {createKeyError && (
          <p role="alert" style={{ fontSize: "12px", color: "#b91c1c", marginTop: "6px" }}>
            {createKeyError}
          </p>
        )}
      </div>

      {/* One-time key reveal modal */}
      <AnimatePresence>
        {newKeyResult && (
          <motion.div
            key="key-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "24px",
            }}
            onClick={() => setNewKeyResult(null)}
            role="dialog"
            aria-modal="true"
            aria-label="New API key created"
          >
            <motion.div
              key="key-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "var(--color-canvas)",
                border: "1px solid var(--color-hairline)",
                borderRadius: "14px",
                padding: "32px",
                maxWidth: "520px",
                width: "100%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(62,207,142,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                    API key created
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--color-ink-mute)", margin: 0 }}>
                    {newKeyResult.name}
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626", margin: "0 0 4px 0" }}>⚠ Copy this key now — it won&apos;t be shown again</p>
                <p style={{ fontSize: "12px", color: "var(--color-ink-mute)", margin: 0, lineHeight: 1.5 }}>
                  This is the only time the full key is visible. If you lose it, revoke it and create a new one.
                </p>
              </div>

              <div style={{ position: "relative", marginBottom: "20px" }}>
                <code
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "var(--color-canvas-soft)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: "8px",
                    padding: "14px 52px 14px 14px",
                    wordBreak: "break-all",
                    color: "var(--color-ink)",
                    lineHeight: 1.6,
                  }}
                  id="new-api-key-value"
                >
                  {newKeyResult.key}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newKeyResult.key);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  aria-label="Copy API key"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    padding: "5px",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: "6px",
                    backgroundColor: "var(--color-canvas)",
                    color: copiedKey ? "var(--color-primary)" : "var(--color-ink-mute)",
                    cursor: "pointer",
                  }}
                >
                  {copiedKey ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setNewKeyResult(null)}
                style={{
                  width: "100%",
                  fontSize: "14px",
                  fontWeight: 500,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-hairline)",
                  backgroundColor: "var(--color-canvas-soft)",
                  color: "var(--color-ink)",
                  cursor: "pointer",
                }}
                id="close-api-key-modal"
              >
                Done — I&apos;ve copied the key
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Danger zone. Kept visually and structurally apart from the settings above, because every
        control up there is reversible and this one is not.

        The confirmation is a typed word rather than a second "are you sure?" dialog: a dialog is
        dismissed by reflex, typing is not. It asks for DELETE rather than the username because this
        component has no username prop — it would have to be dug out of `user_metadata`, whose shape
        depends on the OAuth provider, and a confirmation that silently fails to match is worse than
        one that's slightly less personal.
      */}
      <div
        style={{
          marginTop: "48px",
          paddingTop: "24px",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#b91c1c",
            margin: "0 0 4px",
          }}
        >
          Danger zone
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-soft)",
            margin: "0 0 16px",
            lineHeight: 1.6,
          }}
        >
          Deleting your account removes your OSSfolio profile, score and
          settings permanently. Your GitHub account is not affected. This cannot
          be undone.
        </p>

        <label
          htmlFor="delete-confirm"
          style={{
            display: "block",
            fontSize: "13px",
            color: "var(--color-ink)",
            marginBottom: "6px",
          }}
        >
          Type <strong>DELETE</strong> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          disabled={deleting}
          autoComplete="off"
          style={{ ...inputStyle, maxWidth: "220px", marginBottom: "12px" }}
        />

        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteConfirm !== "DELETE" || deleting || !session}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #b91c1c",
              backgroundColor:
                deleteConfirm === "DELETE" && !deleting
                  ? "#b91c1c"
                  : "transparent",
              color:
                deleteConfirm === "DELETE" && !deleting ? "#fff" : "#b91c1c",
              fontSize: "14px",
              fontWeight: 500,
              cursor:
                deleteConfirm === "DELETE" && !deleting && session
                  ? "pointer"
                  : "not-allowed",
              opacity:
                deleteConfirm === "DELETE" && !deleting && session ? 1 : 0.5,
            }}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>

          {deleteError && (
            <span
              role="alert"
              style={{ fontSize: "13px", color: "#b91c1c", marginLeft: "12px" }}
            >
              {deleteError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
