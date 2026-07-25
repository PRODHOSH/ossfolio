"use client";

import { Component, createElement } from "react";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            border: "1px solid var(--color-hairline)",
            borderRadius: "12px",
            backgroundColor: "var(--color-canvas-soft)",
            margin: "24px 0",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-ink-mute-2)"
            strokeWidth="2"
            style={{ margin: "0 auto 12px", display: "block" }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-ink)",
              margin: "0 0 4px",
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-ink-mute)",
              margin: "0 0 16px",
            }}
          >
            {this.state.error?.message ||
              "An unexpected error occurred in this section."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "#3ecf8e",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-ink)",
              border: "1px solid var(--color-hairline-strong)",
              borderRadius: "6px",
              padding: "8px 16px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Back to home
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
