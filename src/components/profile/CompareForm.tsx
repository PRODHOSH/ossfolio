"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CompareFormProps {
  defaultA?: string;
  defaultB?: string;
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "10px 12px",
  fontSize: "14px",
  fontWeight: 400,
  color: "var(--color-ink)",
  backgroundColor: "var(--color-canvas)",
  border: "1px solid var(--color-hairline)",
  borderRadius: "6px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

export function CompareForm({ defaultA = "", defaultB = "" }: CompareFormProps) {
  const router = useRouter();
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);

  function handleSubmit() {
    const trimA = a.trim();
    const trimB = b.trim();
    if (!trimA || !trimB) return;
    router.push(`/compare?a=${encodeURIComponent(trimA)}&b=${encodeURIComponent(trimB)}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <input
        type="text"
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="Username A"
        aria-label="First GitHub username"
        autoComplete="off"
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
      />
      <span
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--color-ink-mute)",
        }}
      >
        vs
      </span>
      <input
        type="text"
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="Username B"
        aria-label="Second GitHub username"
        autoComplete="off"
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-hairline)")}
      />
      <button
        type="submit"
        style={{
          fontSize: "14px",
          fontWeight: 500,
          backgroundColor: "var(--color-primary)",
          color: "var(--color-on-primary)",
          border: "none",
          borderRadius: "6px",
          padding: "10px 20px",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background-color 0.2s ease, outline-color 0.2s ease",
          outline: "2px solid transparent",
          outlineOffset: "2px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary-deep)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
        onFocus={(e) => (e.currentTarget.style.outlineColor = "var(--color-primary)")}
        onBlur={(e) => (e.currentTarget.style.outlineColor = "transparent")}
      >
        Compare
      </button>
    </form>
  );
}
