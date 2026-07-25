import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContributionDigest, DigestPeriod } from "@/lib/digest";
import { ContributionDigest } from "@/components/digest/ContributionDigest";

interface DigestPageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ period?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: DigestPageProps): Promise<Metadata> {
  const { username } = await params;
  const { period } = await searchParams;
  const validPeriod: DigestPeriod = period === "monthly" ? "monthly" : "weekly";
  const title = `Contribution Digest for ${username} (${validPeriod}) | OSSfolio`;
  const description = `Weekly & monthly open-source activity digest summarizing PRs merged, issues resolved, repos starred, and achievements earned by ${username}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://ossfolio.qzz.io/digest/${username}?period=${validPeriod}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DigestPage({ params, searchParams }: DigestPageProps) {
  const { username } = await params;
  const { period } = await searchParams;

  if (!username) {
    notFound();
  }

  const validPeriod: DigestPeriod = period === "monthly" ? "monthly" : "weekly";
  const digestData = await getContributionDigest(username, validPeriod);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#090d16", color: "#f8fafc" }}>
      <ContributionDigest initialDigest={digestData} />
    </main>
  );
}
