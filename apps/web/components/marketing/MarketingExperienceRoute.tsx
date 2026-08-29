'use client';

import { useEffect, useMemo, useState } from 'react';
import { findMarketingExperienceManifestBySlug, type UiExperienceResolveResponse } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { MarketingStatePanel } from './MarketingStatePanel';
import { MarketingTrackingBoundary } from './MarketingTrackingBoundary';
import { renderMarketingExperience } from './registry';

export interface MarketingExperienceRouteProps {
  slug: string;
  previewToken?: string;
}

export function MarketingExperienceRoute({ slug, previewToken }: MarketingExperienceRouteProps) {
  const [response, setResponse] = useState<UiExperienceResolveResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const localManifest = useMemo(() => findMarketingExperienceManifestBySlug(slug), [slug]);

  useEffect(() => {
    let active = true;
    setResponse(null);
    setFailed(false);
    apiClient.uiExperiences
      .resolve({
        surface: 'PUBLIC_LANDING',
        route: `/campaigns/${slug}`,
        ...(previewToken ? { previewToken } : {}),
      })
      .then((result) => {
        if (active) setResponse(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [previewToken, slug]);

  if (failed) return <MarketingStatePanel kind="error" />;
  if (!response) return <MarketingStatePanel kind="loading" />;
  if (!response.data || !response.manifest || !localManifest) return <MarketingStatePanel kind="unavailable" />;

  const isPreview = Boolean(previewToken);
  const experience = renderMarketingExperience(response.manifest.key, response.manifest.version, {
    activation: response.data,
    manifest: response.manifest,
    preview: isPreview,
  });
  if (!experience) return <MarketingStatePanel kind="unavailable" />;

  return (
    <MarketingTrackingBoundary activationId={response.data.id} enabled={!isPreview}>
      {experience}
    </MarketingTrackingBoundary>
  );
}
