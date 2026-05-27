import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", padding: "0 16px" }}>
        <p
          style={{
            fontSize: "64px",
            fontWeight: 500,
            color: "#3ecf8e",
            margin: "0 0 8px",
            letterSpacing: "-1.92px",
            lineHeight: 1.1,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "#171717",
            margin: "0 0 8px",
            letterSpacing: "-0.42px",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#707070",
            margin: "0 auto 28px",
            maxWidth: "400px",
            lineHeight: 1.5,
          }}
        >
          The page you are looking for does not exist or has been moved.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 28px",
              borderRadius: "6px",
              backgroundColor: "#3ecf8e",
              color: "#171717",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              lineHeight: 1,
              border: "none",
              cursor: "pointer",
            }}
          >
            Home
          </Link>
          <Link
            href="/explore"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 28px",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              color: "#171717",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              lineHeight: 1,
              border: "1px solid #c7c7c7",
              cursor: "pointer",
            }}
          >
            Explore
          </Link>
        </div>
      </div>
    </main>
  );
}
