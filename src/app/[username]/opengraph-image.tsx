import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

export const alt = "OSSfolio Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OGImageProps {
  params: Promise<{ username: string }>;
}

async function fetchGitHubUser(username: string) {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function OGImage({ params }: OGImageProps) {
  const { username } = await params;

  // Fetch Inter font from the Google Fonts CSS API.
  // We request the CSS with a User-Agent that triggers woff format (which Satori
  // can also read), then extract the font-file URL from the @font-face block.
  const interFontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap",
    {
      headers: {
        // A non-browser UA makes Google Fonts return TTF (TrueType) format,
        // which is what Satori/ImageResponse needs.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    }
  ).then((res) => res.text());

  // Extract the font file URL for weight 500 (medium) — used for display text
  const mediumUrlMatch = interFontData.match(
    /font-weight:\s*500;[^}]*?src:\s*url\(([^)]+)\)/
  );
  // Extract the font file URL for weight 400 (regular) — used for body text
  const regularUrlMatch = interFontData.match(
    /font-weight:\s*400;[^}]*?src:\s*url\(([^)]+)\)/
  );

  const [interMedium, interRegular] = await Promise.all([
    fetch(mediumUrlMatch?.[1] ?? "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50SjIa1ZL7.woff2").then(
      (res) => res.arrayBuffer()
    ),
    fetch(regularUrlMatch?.[1] ?? "https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fvbvMwCp50SjIa1ZL7.woff2").then(
      (res) => res.arrayBuffer()
    ),
  ]);

  // Fetch user data and score in parallel
  const [user, profileRow] = await Promise.all([
    fetchGitHubUser(username),
    supabase
      .from("profiles")
      .select("score")
      .eq("username", username)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  const displayName = user?.name || username;
  const avatarUrl = user?.avatar_url || `https://github.com/${username}.png`;
  const score =
    profileRow && typeof profileRow.score === "number"
      ? profileRow.score
      : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          fontFamily: "Inter",
          padding: "48px 64px",
        }}
      >
        {/* Top bar — logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Emerald dot */}
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "9999px",
              backgroundColor: "#3ecf8e",
            }}
          />
          <span
            style={{
              fontSize: "24px",
              fontWeight: 500,
              color: "#171717",
              letterSpacing: "-0.42px",
            }}
          >
            OSSfolio
          </span>
        </div>

        {/* Main content area — avatar + name (left) and score card (right) */}
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "24px",
          }}
        >
          {/* Left: avatar + name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
            }}
          >
            {/* Avatar — circular */}
            <img
              src={avatarUrl}
              alt={`${displayName} avatar`}
              width={120}
              height={120}
              style={{
                borderRadius: "9999px",
                objectFit: "cover",
              }}
            />
            {/* Name + username */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: 500,
                  color: "#171717",
                  letterSpacing: "-0.72px",
                  lineHeight: 1.15,
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: 400,
                  color: "#707070",
                  lineHeight: 1.4,
                }}
              >
                @{username}
              </span>
            </div>
          </div>

          {/* Right: score card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #3ecf8e",
              borderRadius: "12px",
              padding: "20px 40px",
              minWidth: "180px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#707070",
                letterSpacing: "1.2px",
                textTransform: "uppercase" as const,
                lineHeight: 1.45,
              }}
            >
              Contributor Score
            </span>
            <span
              style={{
                fontSize: "56px",
                fontWeight: 500,
                color: "#3ecf8e",
                lineHeight: 1.1,
                letterSpacing: "-1.44px",
                marginTop: "4px",
              }}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Bottom bar — URL + tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #dfdfdf",
            paddingTop: "20px",
            marginTop: "8px",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 400,
              color: "#707070",
              lineHeight: 1.5,
            }}
          >
            ossfolio.qzz.io/{username}
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 400,
              color: "#707070",
              lineHeight: 1.5,
            }}
          >
            Your open-source identity, beyond GitHub.
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: interMedium,
          weight: 500,
          style: "normal",
        },
        {
          name: "Inter",
          data: interRegular,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );
}
