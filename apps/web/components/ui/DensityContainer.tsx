'use client';

import React from 'react';
import { themeTokens, DensityTokens } from '@mos-lab/shared';

export type DensityMode = keyof DensityTokens;
export type BreakpointPreset = 'phone' | 'ipad' | 'laptop' | 'desktop' | 'fourK';

export interface DensityContainerProps {
  children: React.ReactNode;
  density?: DensityMode;
  breakpoint?: BreakpointPreset;
  className?: string;
  style?: React.CSSProperties;
}

export function DensityContainer({ children, density = 'comfort', className = '', style = {} }: DensityContainerProps) {
  const densityPreset = themeTokens.density[density] || themeTokens.density.comfort;

  const combinedStyle: React.CSSProperties = {
    padding: densityPreset.padding,
    gap: densityPreset.gap,
    fontSize: densityPreset.fontSize,
    ...style,
  };

  return (
    <div
      className={`density-container density-${density} flex flex-col w-full transition-all duration-200 ${className}`}
      style={combinedStyle}
    >
      {children}
    </div>
  );
}
