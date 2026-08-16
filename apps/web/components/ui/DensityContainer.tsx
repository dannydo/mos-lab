'use client';

import React from 'react';
import { resolveDensityProfile, themeTokens, type DensityProfile } from '@mos-lab/shared';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';

export type DensityMode = DensityProfile | 'auto';

export interface DensityContainerProps {
  children: React.ReactNode;
  density?: DensityMode;
  className?: string;
  style?: React.CSSProperties;
}

type DensityStyleProperties = React.CSSProperties & Record<`--${string}`, string>;

/**
 * Catalog/playground scope for the shared density contract. The app-wide
 * preference lives on <html>; this wrapper is useful when documenting or
 * previewing a profile without creating page-local pixel values.
 */
export function DensityContainer({ children, density = 'auto', className = '', style = {} }: DensityContainerProps) {
  const tier = useResponsiveTier();
  const requestedDensity = density === 'auto' ? themeTokens.responsive.densityByTier[tier] : density;
  const resolvedDensity = tier === 'mobile' ? resolveDensityProfile('standard', tier) : requestedDensity;
  const densityPreset = themeTokens.density[resolvedDensity] || themeTokens.density.standard;

  const combinedStyle: DensityStyleProperties = {
    '--mos-control-height': densityPreset.controlHeight,
    '--mos-control-height-compact': densityPreset.controlHeight,
    '--mos-action-icon-size': densityPreset.iconSize,
    '--mos-density-padding': densityPreset.padding,
    '--mos-density-gap': densityPreset.gap,
    '--mos-density-font-size': densityPreset.fontSize,
    '--mos-density-cell-padding': densityPreset.cellPadding,
    padding: densityPreset.padding,
    gap: densityPreset.gap,
    fontSize: densityPreset.fontSize,
    ...style,
  };

  return (
    <div
      className={`density-container density-${resolvedDensity} flex flex-col w-full transition-all duration-200 ${className}`}
      style={combinedStyle}
    >
      {children}
    </div>
  );
}
