import type { Metadata } from 'next';
import { findMarketingExperienceManifestBySlug } from '@mos-lab/shared';
import { MarketingExperienceRoute } from '../../../components/marketing';

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
}

export async function generateMetadata({ params, searchParams }: CampaignPageProps): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const manifest = findMarketingExperienceManifestBySlug(slug);
  const isPreview = Boolean(query.preview);
  return {
    title: manifest?.seo.title || 'Chiến dịch — Wings Lashes',
    description: manifest?.seo.description || 'Trải nghiệm theo mùa từ Wings Lashes.',
    alternates: { canonical: `/campaigns/${slug}` },
    robots: isPreview ? { index: false, follow: false } : undefined,
    openGraph: manifest
      ? {
          title: manifest.seo.title,
          description: manifest.seo.description,
          type: 'website',
          locale: 'vi_VN',
        }
      : undefined,
  };
}

export default async function CampaignPage({ params, searchParams }: CampaignPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const previewToken = Array.isArray(query.preview) ? query.preview[0] : query.preview;
  return <MarketingExperienceRoute slug={slug} previewToken={previewToken} />;
}
