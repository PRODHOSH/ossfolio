"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Compass, Calculator, GitCompare, Settings, User, Home, ArrowRight, X } from "lucide-react";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { supabase } from "@/lib/supabase";

interface NavCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  category: "Navigation" | "Profile";
}

interface ProfileSearchResult {
  username: string;
  name: string | null;
  avatar_url: string | null;
  score: number | null;
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch logged in username
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uname = data?.session?.user?.user_metadata?.user_name;
      if (uname) setCurrentUsername(uname);
    });
  }, []);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search for profiles
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discover?q=${encodeURIComponent(query.trim())}&limit=5`);
        if (res.ok) {
          const json = await res.json();
          const profiles = json?.profiles || json?.data?.profiles || [];
          setSearchResults(
            profiles.map((p: any) => ({
              username: p.username,
              name: p.name || null,
              avatar_url: p.avatar_url || p.avatarUrl || null,
              score: typeof p.score === "number" ? p.score : null,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to search profiles:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const navCommands: NavCommand[] = [
    {
      id: "nav-explore",
      label: "Explore Contributors",
      description: "Discover open-source developers & leaderboard",
      icon: <Compass size={16} />,
      url: "/explore",
      category: "Navigation",
    },
    {
      id: "nav-score",
      label: "Score Calculator",
      description: "Understand the open-source scoring formula",
      icon: <Calculator size={16} />,
      url: "/score-explained",
      category: "Navigation",
    },
    {
      id: "nav-compare",
      label: "Compare Profiles",
      description: "Side-by-side contributor comparisons",
      icon: <GitCompare size={16} />,
      url: "/compare",
      category: "Navigation",
    },
    {
      id: "nav-settings",
      label: "Profile Settings",
      description: "Manage headline, links, README, and badges",
      icon: <Settings size={16} />,
      url: "/settings",
      category: "Navigation",
    },
    {
      id: "nav-home",
      label: "Home Page",
      description: "Return to OSSfolio landing page",
      icon: <Home size={16} />,
      url: "/",
      category: "Navigation",
    },
  ];

  if (currentUsername) {
    navCommands.unshift({
      id: "nav-my-profile",
      label: "My Profile",
      description: `View @${currentUsername}'s public profile`,
      icon: <User size={16} />,
      url: `/${currentUsername}`,
      category: "Profile",
    });
  }

  // Filter navigation items
  const filteredNav = navCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()),
  );

  // Total selectable items
  const totalItemsCount = filteredNav.length + searchResults.length;

  const handleSelect = useCallback(
    (url: string) => {
      close();
      router.push(url);
    },
    [close, router],
  );

  // Handle keyboard navigation (Up, Down, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev + 1) % totalItemsCount : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItemsCount > 0 ? (prev - 1 + totalItemsCount) % totalItemsCount : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < filteredNav.length) {
        handleSelect(filteredNav[selectedIndex].url);
      } else {
        const searchIdx = selectedIndex - filteredNav.length;
        if (searchResults[searchIdx]) {
          handleSelect(`/${searchResults[searchIdx].username}`);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        paddingLeft: "16px",
        paddingRight: "16px",
      }}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        style={{
          width: "100%",
          maxWidth: "560px",
          backgroundColor: "var(--color-canvas)",
          border: "1px solid var(--color-hairline-strong)",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 16px",
            borderBottom: "1px solid var(--color-hairline)",
          }}
        >
          <Search size={18} style={{ color: "var(--color-ink-mute)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search contributors..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              width: "100%",
              fontSize: "15px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--color-ink)",
            }}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close command palette"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--color-ink-mute)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {/* Quick Navigation Items */}
          {filteredNav.length > 0 && (
            <div style={{ padding: "0 8px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--color-ink-mute)",
                  padding: "6px 10px 4px 10px",
                }}
              >
                Navigation
              </div>
              {filteredNav.map((cmd, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => handleSelect(cmd.url)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isSelected ? "var(--color-canvas-soft)" : "transparent",
                      color: "var(--color-ink)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: isSelected ? "var(--color-primary-deep)" : "var(--color-ink-mute)" }}>
                        {cmd.icon}
                      </span>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>{cmd.label}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
                          {cmd.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && <ArrowRight size={14} style={{ color: "var(--color-primary-deep)" }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Dynamic Contributor Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <div style={{ padding: "0 8px", marginTop: filteredNav.length > 0 ? "8px" : 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--color-ink-mute)",
                  padding: "6px 10px 4px 10px",
                }}
              >
                Contributors {isSearching && "..."}
              </div>
              {searchResults.map((user, idx) => {
                const itemIdx = filteredNav.length + idx;
                const isSelected = selectedIndex === itemIdx;
                return (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => handleSelect(`/${user.username}`)}
                    onMouseEnter={() => setSelectedIndex(itemIdx)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: isSelected ? "var(--color-canvas-soft)" : "transparent",
                      color: "var(--color-ink)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                        />
                      ) : (
                        <User size={16} style={{ color: "var(--color-ink-mute)" }} />
                      )}
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 500 }}>
                          {user.name || `@${user.username}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--color-ink-mute)" }}>
                          @{user.username} {user.score !== null ? `• Score ${user.score}` : ""}
                        </div>
                      </div>
                    </div>
                    {isSelected && <ArrowRight size={14} style={{ color: "var(--color-primary-deep)" }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {totalItemsCount === 0 && !isSearching && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--color-ink-mute)",
              }}
            >
              No matching commands or contributors found.
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "var(--color-canvas-soft)",
            borderTop: "1px solid var(--color-hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--color-ink-mute)",
          }}
        >
          <span>Tip: Use ↑ ↓ arrows to navigate, Enter to select</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid var(--color-hairline-strong)",
              backgroundColor: "var(--color-canvas)",
              fontWeight: 500,
            }}
          >
            ESC to close
          </span>
        </div>
      </div>
    </div>
  );
}
