import { createElement, type ComponentType } from 'react';
import type { MarketingExperienceManifest, UiExperienceActivation } from '@mos-lab/shared';
import { IndependenceDay2026Landing } from './experiences/IndependenceDay2026Landing';

export interface MarketingExperienceComponentProps {
  activation: UiExperienceActivation;
  manifest: MarketingExperienceManifest;
  preview?: boolean;
}

const componentRegistry: Record<string, ComponentType<MarketingExperienceComponentProps>> = {
  'independence-day-2026@1.0.0': IndependenceDay2026Landing,
};

export function renderMarketingExperience(key: string, version: string, props: MarketingExperienceComponentProps) {
  const Experience = componentRegistry[`${key}@${version}`];
  return Experience ? createElement(Experience, props) : null;
}
