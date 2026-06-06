import { ImageResponse } from "next/og";

export const runtime = "edge";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
const userRes = await fetch(
  `https://api.github.com/users/${username}`,
  {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
    next: { revalidate: 3600 },
  }
);

if (!userRes.ok) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0f172a",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        OSSfolio
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

const user = await userRes.json();
  return new ImageResponse(
  (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: "#0f172a",
        color: "white",
        padding: 60,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          {user.name || user.login}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 30,
          }}
        >
          @{user.login}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 42,
          fontWeight: 700,
        }}
      >
        OSSfolio
      </div>
    </div>
  ),
  {
    width: 1200,
    height: 630,
  }
);
}