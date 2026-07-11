"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useThemeContext } from "@/context/ThemeContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

// useLayoutEffect runs synchronously before the browser paints (client only);
// fall back to useEffect on the server to avoid React's SSR warning. This lets
// us re-assert the theme class before any light frame can reach the screen.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface NavbarProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

const navLinks = [
  { key: "features", href: "/#features" },
  { key: "howItWorks", href: "/#how-it-works" },
  { key: "leaderboard", href: "/explore" },
] as const;

// System Theme Design Tokens Mapping
const tokens = {
  canvas: "#ffffff",
  canvasNight: "#1c1c1c",
  canvasNightSoft: "#202020",
  ink: "#171717",
  textMutedLight: "#707070",
  textMutedDark: "#a3a3a3",
  borderLight: "#ededed",
  borderDark: "#2e2e2e",
  primary: "#3ecf8e", // Emerald accent color
  primaryHover: "#24b47e",
};

/** Circular GitHub avatar with a graceful initial-letter fallback. */
function Avatar({ src, name, size }: { src?: string; name?: string; size: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "Profile"}
        width={size}
        height={size}
        style={{ 
          borderRadius: "50%", 
          border: "1px solid var(--color-hairline-strong)", 
          flexShrink: 0,
          objectFit: "cover"
        }}
      />
    );
  }
  const initial = (name?.charAt(0) ?? "U").toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "var(--color-primary-soft)",
        color: "var(--color-on-primary)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.45),
        fontWeight: 600,
        flexShrink: 0,
        border: "1px solid var(--color-primary)"
      }}
    >
      {initial}
    </span>
  );
}

export function Navbar({ onSignIn, onGetStarted }: NavbarProps) {
  const t = useTranslations("Nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useThemeContext();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Resolve the current session on mount and keep it in sync with auth changes.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Close the profile dropdown when clicking outside of it.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const username = user?.user_metadata?.user_name as string | undefined;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const profileHref = username ? `/${username}` : "/";

  async function handleLogout() {
    setMenuOpen(false);
    setMobileOpen(false);
    await supabase.auth.signOut();
  }

  return (
    <header
      role="banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        backgroundColor: "var(--color-canvas)",
        borderBottom: "1px solid var(--color-hairline)",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          height: "56px",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }} aria-label={t("home")}>
          <Image src="/logo.png" alt="OSSfolio Logo" width={28} height={28} priority style={{ borderRadius: "6px", flexShrink: 0 }} />
          <span style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-ink)", letterSpacing: "-0.3px" }}>OSS</span>
            <span style={{ fontSize: "15px", fontWeight: 600, color: tokens.primary, letterSpacing: "-0.3px" }}>folio</span>
          </span>
        </Link>

        <nav aria-label={t("mainNav")} style={{ display: "flex", alignItems: "center", gap: "28px" }} className="hide-on-mobile">
          {navLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-ink-mute)", textDecoration: "none" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }} className="hide-on-mobile">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={!mounted ? t("toggleTheme") : isDarkMode ? t("switchToLight") : t("switchToDark")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-ink-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", borderRadius: "6px" }}
          >
            <Moon size={18} className="nav-theme-moon" />
            <Sun size={18} className="nav-theme-sun" />
          </button>

          {user ? (
            <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-canvas-soft)", border: "1px solid var(--color-hairline-strong)", borderRadius: "9999px", padding: "4px 12px 4px 4px", cursor: "pointer" }}
              >
                <Avatar src={avatarUrl} name={username} size={28} />
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-ink)" }}>{username ?? t("account")}</span>
              </button>

              {menuOpen && (
                <div role="menu" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: "180px", backgroundColor: "var(--color-canvas-soft)", border: "1px solid var(--color-hairline)", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)", padding: "6px", zIndex: 50 }}>
                  <Link href={profileHref} role="menuitem" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "8px 10px", fontSize: "14px", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none" }}>{t("myPortfolio")}</Link>
                  <button type="button" role="menuitem" onClick={handleLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", fontSize: "14px", fontWeight: 500, color: "var(--color-ink)", background: "none", border: "none", cursor: "pointer" }}>{t("logOut")}</button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button type="button" onClick={() => onSignIn?.()} style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-ink)", background: "transparent", border: "1px solid var(--color-hairline-strong)", cursor: "pointer", padding: "7px 16px", borderRadius: "6px" }}>{t("signIn")}</button>
              <button type="button" onClick={() => onGetStarted?.()} style={{ fontSize: "14px", fontWeight: 500, backgroundColor: tokens.primary, color: tokens.ink, padding: "7px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}>{t("getStarted")}</button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="show-on-mobile"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileOpen}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-mute)",
            padding: "8px",
            borderRadius: "6px",
            display: "none",
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile navigation overlay */}
      {mobileOpen && (
        <nav
          aria-label={t("mobileNav")}
          role="navigation"
          style={{
            position: "fixed",
            top: "56px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--color-canvas)",
            zIndex: 39,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            borderTop: "1px solid var(--color-hairline)",
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "var(--color-ink)",
                textDecoration: "none",
                padding: "10px 0",
              }}
            >
              {t(item.key)}
            </Link>
          ))}
          {user ? (
            <>
              <Link
                href={`/${username}`}
                onClick={() => setMobileOpen(false)}
                style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-ink)", textDecoration: "none", padding: "10px 0" }}
              >
                {t("myPortfolio")}
              </Link>
              <button
                type="button"
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                style={{
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--color-ink)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "10px 0",
                  textAlign: "left",
                }}
              >
                {t("logOut")}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
              <button type="button" onClick={() => { onSignIn?.(); setMobileOpen(false); }} style={{ fontSize: "16px", fontWeight: 500, color: "var(--color-ink)", background: "transparent", border: "1px solid var(--color-hairline-strong)", cursor: "pointer", padding: "12px 16px", borderRadius: "6px" }}>
                {t("signIn")}
              </button>
              <button type="button" onClick={() => { onGetStarted?.(); setMobileOpen(false); }} style={{ fontSize: "16px", fontWeight: 500, backgroundColor: tokens.primary, color: tokens.ink, padding: "12px 16px", borderRadius: "6px", border: "none", cursor: "pointer" }}>
                {t("getStarted")}
              </button>
            </div>
          )}
          <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid var(--color-hairline)" }}>
            <LanguageSwitcher />
          </div>
        </nav>
      )}
      <style>{`
        @media (min-width: 768px) { .hide-on-mobile { display: flex !important; } .show-on-mobile { display: none !important; } }
        @media (max-width: 767px) { .hide-on-mobile { display: none !important; } .show-on-mobile { display: flex !important; } }
        .nav-theme-sun { display: none; }
        :root.dark .nav-theme-sun { display: inline-block; }
        :root.dark .nav-theme-moon { display: none; }
      `}</style>
    </header>
  );
}
