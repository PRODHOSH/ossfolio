"use client";

import { useMemo } from "react";
import { isSafeUrl, sanitizeMarkdownContent } from "@/lib/readme";

interface ProfileReadmeProps {
  readme: string;
}

/**
 * Parses inline markdown formatting (bold, italic, code, links, images, strikethrough)
 * safely into React elements.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Image: ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const alt = imgMatch[1];
      const url = imgMatch[2];
      if (isSafeUrl(url)) {
        elements.push(
          <img
            key={`img-${keyIdx++}`}
            src={url}
            alt={alt}
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "8px",
              display: "inline-block",
              margin: "6px 0",
            }}
          />,
        );
      } else {
        elements.push(<span key={`txt-${keyIdx++}`}>{alt}</span>);
      }
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // 2. Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const url = linkMatch[2];
      if (isSafeUrl(url)) {
        elements.push(
          <a
            key={`link-${keyIdx++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-primary-deep)",
              textDecoration: "underline",
              fontWeight: 500,
            }}
          >
            {renderInlineMarkdown(linkText)}
          </a>,
        );
      } else {
        elements.push(<span key={`txt-${keyIdx++}`}>{linkText}</span>);
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 3. Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(
        <code
          key={`code-${keyIdx++}`}
          style={{
            backgroundColor: "var(--color-canvas-soft)",
            color: "var(--color-ink)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.88em",
            fontFamily: "monospace",
            border: "1px solid var(--color-hairline)",
          }}
        >
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 4. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      elements.push(
        <strong key={`bold-${keyIdx++}`} style={{ fontWeight: 600 }}>
          {renderInlineMarkdown(boldMatch[2])}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 5. Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/);
    if (strikeMatch) {
      elements.push(
        <del key={`strike-${keyIdx++}`} style={{ opacity: 0.75 }}>
          {renderInlineMarkdown(strikeMatch[1])}
        </del>,
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // 6. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch) {
      elements.push(
        <em key={`italic-${keyIdx++}`} style={{ fontStyle: "italic" }}>
          {renderInlineMarkdown(italicMatch[2])}
        </em>,
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Plain text character
    const nextCharIndex = remaining.search(/[!\[`*_~]/);
    if (nextCharIndex === -1) {
      elements.push(<span key={`txt-${keyIdx++}`}>{remaining}</span>);
      break;
    } else if (nextCharIndex > 0) {
      elements.push(
        <span key={`txt-${keyIdx++}`}>{remaining.slice(0, nextCharIndex)}</span>,
      );
      remaining = remaining.slice(nextCharIndex);
    } else {
      // Unmatched special char, push as plain text
      elements.push(<span key={`txt-${keyIdx++}`}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
  }

  return elements;
}

export function ProfileReadme({ readme }: ProfileReadmeProps) {
  const sanitized = useMemo(
    () => sanitizeMarkdownContent(readme),
    [readme],
  );

  if (!sanitized.trim()) return null;

  const lines = sanitized.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let blockKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        blocks.push(
          <pre
            key={`codeblock-${blockKey++}`}
            style={{
              backgroundColor: "var(--color-canvas-soft)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "8px",
              padding: "12px 16px",
              overflowX: "auto",
              fontSize: "13px",
              fontFamily: "monospace",
              margin: "12px 0",
              color: "var(--color-ink)",
            }}
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>,
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headings #, ##, ###
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2
          key={`h1-${blockKey++}`}
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "20px 0 10px 0",
            borderBottom: "1px solid var(--color-hairline)",
            paddingBottom: "6px",
          }}
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </h2>,
      );
    } else if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3
          key={`h2-${blockKey++}`}
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: "16px 0 8px 0",
          }}
        >
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4
          key={`h3-${blockKey++}`}
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: "14px 0 6px 0",
          }}
        >
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith("> ")) {
      // Blockquotes
      blocks.push(
        <blockquote
          key={`quote-${blockKey++}`}
          style={{
            borderLeft: "4px solid var(--color-primary-deep)",
            paddingLeft: "12px",
            margin: "12px 0",
            color: "var(--color-ink-mute)",
            fontStyle: "italic",
          }}
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>,
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      // Unordered List Items
      blocks.push(
        <li
          key={`li-${blockKey++}`}
          style={{
            marginLeft: "20px",
            listStyleType: "disc",
            fontSize: "14px",
            color: "var(--color-ink)",
            lineHeight: 1.6,
            marginBottom: "4px",
          }}
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </li>,
      );
    } else {
      // Regular paragraph
      blocks.push(
        <p
          key={`p-${blockKey++}`}
          style={{
            fontSize: "14px",
            lineHeight: 1.65,
            color: "var(--color-ink)",
            margin: "8px 0",
          }}
        >
          {renderInlineMarkdown(line)}
        </p>,
      );
    }
  }

  return (
    <div
      style={{
        marginTop: "32px",
        padding: "24px",
        borderRadius: "12px",
        border: "1px solid var(--color-hairline)",
        backgroundColor: "var(--color-canvas)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--color-hairline)",
        }}
      >
        <span style={{ fontSize: "16px" }}>📖</span>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: "-0.2px",
          }}
        >
          README.md
        </h3>
      </div>
      <div>{blocks}</div>
    </div>
  );
}
