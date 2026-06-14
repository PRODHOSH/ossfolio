import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OSSfolio — Your Open Source Identity",
  description:
    "A public profile platform for open-source contributors. Showcase your merged PRs, contribution streaks, orgs, and more at ossfolio.me/username.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "OSSfolio — Your Open Source Identity",
    description: "Your open-source identity, beyond GitHub.",
    type: "website",
    images: ["/logo.png"],
  },
  verification: {
    google: "mu6Hv6N121feTO3NCBM4W1n8IFPSRrIxIQ5NHGJCD6k",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-7Q6TXP5W7G"
        />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7Q6TXP5W7G');
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
