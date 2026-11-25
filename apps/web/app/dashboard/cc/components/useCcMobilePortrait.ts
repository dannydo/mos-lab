'use client';

import { themeTokens } from '@mos-lab/shared';
import { useResponsiveTier, useViewportSize } from '~/hooks/useResponsiveTier';

export function useCcMobilePortrait() {
  const tier = useResponsiveTier();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const { mobileLandscapeMaxWidth, mobileLandscapeMaxHeight } = themeTokens.responsive.breakpoints;
  const isMobile = tier === 'mobile';
  const isPhoneLandscape =
    viewportWidth > viewportHeight &&
    viewportWidth <= mobileLandscapeMaxWidth &&
    viewportHeight <= mobileLandscapeMaxHeight;

  return {
    tier,
    isMobile,
    isPhoneLandscape,
    showMobilePortrait: isMobile && !isPhoneLandscape,
  };
}
