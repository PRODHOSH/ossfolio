"use client";

import { useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff ,Loader2} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export function AuthModal({ open, onClose, defaultMode = "signin" }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !overlayRef.current) return;
      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email public_repo read:org",
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      } else {
        onClose();
      }
    } else {
      if (!name.trim()) {
        setError("Please enter your full name.");
        setLoading(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
      } else {
        setError("Check your email to confirm your account.");
        setLoading(false);
      }
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid var(--color-hairline)",
    borderRadius: "6px",
    fontSize: "14px",
    color: "var(--color-ink)",
    outline: "none",
    backgroundColor: "var(--color-canvas)",
    boxSizing: "border-box" as const,
    transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
  };

  const isSuccessMessage = error.startsWith("Check");

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signin" ? "Sign in to OSSfolio" : "Create your OSSfolio profile"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-md"
        style={{
          backgroundColor: "var(--color-canvas)",
          borderRadius: "12px",
          border: "1px solid var(--color-hairline-strong)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3)",
          padding: "40px",
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close sign in dialog"
          style={{
            position: "absolute",
            right: "20px",
            top: "20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-mute-2)",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-mute-2)")}
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px", margin: 0, transition: "color 0.2s ease" }}>
            {mode === "signin" ? "Welcome back" : "Create your profile"}
          </h2>
          <p style={{ marginTop: "6px", fontSize: "14px", color: "var(--color-ink-mute)", margin: "6px 0 0 0", transition: "color 0.2s ease" }}>
            {mode === "signin"
              ? "Sign in to access your OSSfolio profile."
              : "Sign up and showcase your open-source journey."}
          </p>
        </div>

        <button
          onClick={handleGitHubSignIn}
          disabled={loading}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "11px 16px",
            border: "1px solid var(--color-hairline)",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-ink)",
            backgroundColor: "var(--color-canvas)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
            
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--color-canvas-soft)"; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--color-canvas)"; }}
        >
          {loading ? (
           <Loader2 className="animate-spin" size={18} />
          ):(
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          )}
          {loading ? "Redirecting…" : "Continue with GitHub"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline-cool)" }} />
          <span style={{ fontSize: "12px", color: "var(--color-ink-mute-2)" }}>or</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-hairline-cool)" }} />
        </div>

        {error && (
          <p style={{
            marginBottom: "16px",
            fontSize: "13px",
            color: isSuccessMessage ? "var(--color-primary)" : "#ff4d88",
            backgroundColor: isSuccessMessage ? "var(--color-primary-soft)" : "rgba(255, 77, 136, 0.1)",
            padding: "10px 14px",
            borderRadius: "6px",
            border: `1px solid ${isSuccessMessage ? "var(--color-primary)" : "rgba(255, 77, 136, 0.2)"}`,
          }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {mode === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink)" }}>Full name</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink)" }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label 
              htmlFor="auth-password" 
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink)" }}
            >
              Password
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                style={{ ...inputStyle, paddingRight: "42px" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-hairline)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-mute-2)",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              width: "100%",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
              padding: "11px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "background-color 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--color-primary-deep)"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "var(--color-primary)"; }}
          >
             {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--color-ink-mute)" }}>
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-ink)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink)")}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}