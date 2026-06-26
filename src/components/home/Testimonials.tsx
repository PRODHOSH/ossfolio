"use client";

interface Testimonial {
  quote: string;
  name: string;
  username: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "OSSfolio finally gave me a way to show my open-source work beyond just a GitHub link.",
    name: "Aryan Mehta",
    username: "aryanmehta",
    role: "Open Source Contributor",
  },
  {
    quote:
      "I shared my OSSfolio link in my internship application and got called back the same day.",
    name: "Priya Nair",
    username: "priyanair",
    role: "GSoC Participant",
  },
  {
    quote:
      "All my contributions across orgs in one place. Recruiters finally see the full picture.",
    name: "Daniel Okoro",
    username: "danielokoro",
    role: "Backend Engineer",
  },
  {
    quote:
      "The contribution heatmap is gorgeous. It made me realise how consistent I had actually been.",
    name: "Sofia Reyes",
    username: "sofiareyes",
    role: "Full-Stack Developer",
  },
  {
    quote:
      "Set up in seconds, no manual tagging. My tech stack was detected automatically and it was spot on.",
    name: "Kenji Watanabe",
    username: "kenjiwatanabe",
    role: "Open Source Maintainer",
  },
  {
    quote:
      "I put my OSSfolio link at the top of my resume. It says more than any bullet point ever could.",
    name: "Amara Singh",
    username: "amarasingh",
    role: "GSSoC Mentor",
  },
  {
    quote:
      "Seeing my GSoC badge sit next to my merged PRs makes the whole journey feel real and shareable.",
    name: "Lucas Ferreira",
    username: "lucasferreira",
    role: "GSoC Participant",
  },
  {
    quote:
      "The leaderboard turned my open-source habit into a bit of friendly competition. I love it.",
    name: "Mei Lin",
    username: "meilin",
    role: "Frontend Engineer",
  },
];

// Split into two rows for the opposing-direction marquees
const rowOne = testimonials.slice(0, 4);
const rowTwo = testimonials.slice(4);

function TestimonialCard({ quote, name, username, role }: Testimonial) {
  return (
    <div
  onMouseEnter={(e) => {
    e.currentTarget.style.transform =
      "translateY(-6px) scale(1.02)";
    e.currentTarget.style.boxShadow =
      "0 10px 24px rgba(0,0,0,0.12)";
    e.currentTarget.style.borderColor =
      "var(--color-hairline-strong)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform =
      "translateY(0) scale(1)";
    e.currentTarget.style.boxShadow = "none";
    e.currentTarget.style.borderColor =
      "var(--color-hairline)";
  }}
  style={{
    flex: "0 0 auto",
    width: "340px",
    backgroundColor: "var(--color-canvas)",
    border: "1px solid var(--color-hairline)",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    whiteSpace: "normal",
    cursor: "pointer",
    transition: "all 0.3s ease",
  }}
>
      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--color-ink)",
          margin: 0,
          transition: "color 0.2s ease",
        }}
      >
        &ldquo;{quote}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://github.com/${username}.png`}
          alt={name}
          width={36}
          height={36}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9999px",
            backgroundColor: "var(--color-canvas-soft)",
            objectFit: "cover",
            transition: "background-color 0.2s ease",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{ 
              fontSize: "13px", 
              fontWeight: 600, 
              color: "var(--color-ink)",
              transition: "color 0.2s ease" 
            }}
          >
            {name}
          </span>
          <span 
            style={{ 
              fontSize: "12px", 
              color: "var(--color-ink-mute)",
              transition: "color 0.2s ease" 
            }}
          >
            {role}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section
      style={{
        backgroundColor: "var(--color-canvas-soft)",
        borderTop: "1px solid var(--color-hairline-cool)",
        borderBottom: "1px solid var(--color-hairline-cool)",
        overflow: "hidden",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "72rem",
          margin: "0 auto",
          padding: "80px 20px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-primary)",
              marginBottom: "10px",
              transition: "color 0.2s ease",
            }}
          >
            Loved by contributors
          </p>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 36px)",
              fontWeight: 600,
              color: "var(--color-ink)",
              letterSpacing: "-0.72px",
              lineHeight: 1.15,
              transition: "color 0.2s ease",
            }}
          >
            Developers are already sharing their story
          </h2>
        </div>
      </div>

      {/* Marquee rows (full-bleed, outside the max-width wrapper) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          paddingBottom: "80px",
        }}
      >
        <div className="ossfolio-marquee">
          <div className="ossfolio-marquee-track ossfolio-marquee-left">
            {[...rowOne, ...rowOne].map((t, i) => (
              <TestimonialCard
                key={`row1-${i}`}
                quote={t.quote}
                name={t.name}
                username={t.username}
                role={t.role}
              />
            ))}
          </div>
        </div>

        <div className="ossfolio-marquee">
          <div className="ossfolio-marquee-track ossfolio-marquee-right">
            {[...rowTwo, ...rowTwo].map((t, i) => (
              <TestimonialCard
                key={`row2-${i}`}
                quote={t.quote}
                name={t.name}
                username={t.username}
                role={t.role}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ossfolio-marquee {
  display: flex;
  overflow-x: hidden;
  overflow-y: visible;
  width: 100%;
  padding: 10px 0;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 8%,
    #000 92%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 8%,
    #000 92%,
    transparent 100%
  );
}
        .ossfolio-marquee-track {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  width: max-content;
  will-change: transform;
}
        .ossfolio-marquee-left {
          animation: ossfolio-scroll-left 40s linear infinite;
        }
        .ossfolio-marquee-right {
          animation: ossfolio-scroll-right 40s linear infinite;
        }
        .ossfolio-marquee:hover .ossfolio-marquee-track {
          animation-play-state: paused;
        }
        @keyframes ossfolio-scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @keyframes ossfolio-scroll-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ossfolio-marquee-left,
          .ossfolio-marquee-right {
            animation: none;
          }
          .ossfolio-marquee {
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}