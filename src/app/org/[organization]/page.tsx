import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrganizationData } from '@/lib/org-data';
import { OrgDashboard } from '@/components/profile/OrgDashboard';

interface OrgPageProps {
  params: Promise<{ organization: string }>;
}

export async function generateMetadata({
  params,
}: OrgPageProps): Promise<Metadata> {
  const { organization } = await params;
  const org = await getOrganizationData(organization);

  const title = `${org.name} Team Dashboard | OSSfolio`;
  const description =
    org.description ||
    `Explore open-source contributor impact, team rankings, and repository statistics for ${org.name} on OSSfolio. Team Score: ${org.stats.teamScore}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [
        {
          url: org.avatarUrl,
          width: 200,
          height: 200,
          alt: org.name,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function OrgPage({ params }: OrgPageProps) {
  const { organization } = await params;

  if (!organization) {
    notFound();
  }

  const orgData = await getOrganizationData(organization);

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
      }}
    >
      <OrgDashboard initialOrg={orgData} />
    </main>
  );
}
