"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface NavbarProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

const navLinks = ["Features", "How it works", "Leaderboard"];

/** Circular GitHub avatar with a graceful initial-letter fallback. */
function Avatar({ src, name, size }: { src?: string; name?: string; size: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "Profile"}
        width={size}
        height={size}
        style={{ borderRadius: "9999px", border: "1px solid #ededed", flexShrink: 0 }}
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
        borderRadius: "9999px",
        backgroundColor: "#ededed",
        color: "#171717",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.45),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

export function Navbar({ onSignIn, onGetStarted }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    // onAuthStateChange emits SIGNED_OUT, which resets `user` to null and
    // restores the Sign in / Get started buttons.
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #ededed",
      }}
    >
      {/* Inner container */}
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
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            priority
            style={{ borderRadius: "6px", flexShrink: 0 }}
          />
          <span style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#171717", letterSpacing: "-0.3px" }}>OSS</span>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#3ecf8e", letterSpacing: "-0.3px" }}>folio</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}
          className="hide-on-mobile">
          {navLinks.map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              style={{ fontSize: "14px", fontWeight: 500, color: "#707070", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#171717")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#707070")}
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs / profile */}
        {user ? (
          <div
            ref={menuRef}
            className="hide-on-mobile"
            style={{ position: "relative", alignItems: "center" }}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#ffffff",
                border: "1px solid #c7c7c7",
                borderRadius: "9999px",
                padding: "4px 12px 4px 4px",
                cursor: "pointer",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              <Avatar src={avatarUrl} name={username} size={28} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#171717" }}>
                {username ?? "Account"}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "180px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #ededed",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                  padding: "6px",
                  zIndex: 50,
                }}
              >
                <Link
                  href={profileHref}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "8px 10px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#171717",
                    textDecoration: "none",
                    borderRadius: "6px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  My Portfolio
                </Link>
                <div
                  role="separator"
                  style={{
                    height: "1px",
                    backgroundColor: "#ededed",
                    margin: "4px 10px",
                  }}
                />
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#171717",
                    background: "none",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}
            className="hide-on-mobile">
            <button
              onClick={() => onSignIn?.()}
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#171717",
                background: "#ffffff",
                border: "1px solid #c7c7c7",
                cursor: "pointer",
                padding: "7px 16px",
                borderRadius: "6px",
                letterSpacing: "0",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fafafa";
                e.currentTarget.style.borderColor = "#b2b2b2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#c7c7c7";
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => onGetStarted?.()}
              style={{
                fontSize: "14px",
                fontWeight: 500,
                backgroundColor: "#3ecf8e",
                color: "#171717",
                padding: "7px 16px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#24b47e")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3ecf8e")}
            >
              Get started
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#171717",
            padding: "4px",
            display: "none",
          }}
          className="show-on-mobile"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            borderTop: "1px solid #ededed",
            backgroundColor: "#ffffff",
            display: "none",
          }}
          className="show-on-mobile"
        >
          <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {navLinks.map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  padding: "8px 0",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#707070",
                  textDecoration: "none",
                  display: "block",
                }}
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #ededed", display: "flex", flexDirection: "column", gap: "8px" }}>
              {user ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0 8px" }}>
                    <Avatar src={avatarUrl} name={username} size={32} />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#171717" }}>
                      {username ?? "Account"}
                    </span>
                  </div>
                  <Link
                    href={profileHref}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#171717",
                      backgroundColor: "#ffffff",
                      border: "1px solid #c7c7c7",
                      borderRadius: "6px",
                      textAlign: "center",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    My Portfolio
                  </Link>
                  <div
                    role="separator"
                    style={{
                      height: "1px",
                      backgroundColor: "#ededed",
                      margin: "8px 0",
                    }}
                  />
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#171717",
                      backgroundColor: "#ffffff",
                      border: "1px solid #c7c7c7",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setMobileOpen(false); if (onSignIn) onSignIn(); }}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#171717",
                      backgroundColor: "#ffffff",
                      border: "1px solid #c7c7c7",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { setMobileOpen(false); if (onGetStarted) onGetStarted(); }}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      fontSize: "14px",
                      fontWeight: 500,
                      backgroundColor: "#3ecf8e",
                      color: "#171717",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 768px) {
          .hide-on-mobile { display: flex !important; }
          .show-on-mobile { display: none !important; }
        }
        @media (max-width: 767px) {
          .hide-on-mobile { display: none !important; }
          .show-on-mobile { display: block !important; }
        }
      `}</style>
    </header>
  );
}
