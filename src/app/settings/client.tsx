"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

interface CustomLink {
  label: string;
  url: string;
}

interface Badge {
  program: string;
  years: number[];
}

import type { FundingLink, SponsorItem } from "@/types";
import { ProfileReadme } from "@/components/profile/ProfileReadme";

interface ProfileSettings {
  headline: string;
  readme: string;
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
  const [readmeTab, setReadmeTab] = useState<"edit" | "preview">("edit");

  // Account deletion. `deleteConfirm` holds what the user has typed into the confirmation box: the
  // button stays disabled until it matches their username exactly, so this cannot be triggered by a
  // stray click on an irreversible action.
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState<ProfileSettings>({
    headline: "",
    readme: "",
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
          readme: data.readme || "",
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchSettings(s.access_token);
      else setLoading(false);
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
      readme: settings.readme,
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <label style={{ ...labelStyle, margin: 0 }}>Profile README (Markdown)</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setReadmeTab("edit")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-hairline)",
                backgroundColor:
                  readmeTab === "edit"
                    ? "var(--color-primary-deep)"
                    : "var(--color-canvas)",
                color: readmeTab === "edit" ? "#ffffff" : "var(--color-ink-mute)",
                cursor: "pointer",
              }}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setReadmeTab("preview")}
              style={{
                fontSize: "12px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-hairline)",
                backgroundColor:
                  readmeTab === "preview"
                    ? "var(--color-primary-deep)"
                    : "var(--color-canvas)",
                color:
                  readmeTab === "preview" ? "#ffffff" : "var(--color-ink-mute)",
                cursor: "pointer",
              }}
            >
              Preview
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "var(--color-ink-mute)",
            margin: "0 0 8px 0",
          }}
        >
          Introduce yourself in detail using Markdown. You can format headings, list accomplishments, add code blocks, or embed images.
        </p>

        {readmeTab === "edit" ? (
          <>
            <textarea
              placeholder="## Hi there 👋&#10;&#10;I'm a full-stack open source contributor..."
              value={settings.readme}
              onChange={(e) =>
                setSettings((s) => ({ ...s, readme: e.target.value }))
              }
              maxLength={10000}
              rows={10}
              style={{
                ...inputStyle,
                fontFamily: "monospace",
                fontSize: "14px",
                lineHeight: 1.5,
                resize: "vertical",
              }}
              aria-label="Profile README Markdown"
            />
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-ink-mute-2)",
                marginTop: "4px",
              }}
            >
              {settings.readme.length}/10000 characters
            </p>
          </>
        ) : (
          <div style={{ marginTop: "12px" }}>
            {settings.readme.trim() ? (
              <ProfileReadme readme={settings.readme} />
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-ink-mute)",
                  fontStyle: "italic",
                  padding: "16px",
                  border: "1px dashed var(--color-hairline)",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                Nothing to preview yet. Switch to &quot;Write&quot; to add custom Markdown.
              </p>
            )}
          </div>
        )}
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
