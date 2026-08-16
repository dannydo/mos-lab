'use client';

import React from 'react';
import { PageHeader } from './PageHeader';
import type { PageHeaderProps } from './PageHeader';
import { FeatureToolbar } from './FeatureToolbar';
import type { FeatureToolbarProps } from './FeatureToolbar';

export interface FeaturePageProps extends Omit<PageHeaderProps, 'extra' | 'className'> {
  /** Primary page actions, rendered in the canonical PageHeader action slot. */
  headerActions?: React.ReactNode;
  /** Optional standard toolbar for list, report, or operational pages. */
  toolbar?: FeatureToolbarProps;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Canonical page frame for a product feature. It owns the responsive page
 * spacing and delegates header and toolbar behavior to existing primitives.
 */
export function FeaturePage({
  title,
  subtitle,
  icon,
  tag,
  headerActions,
  toolbar,
  children,
  className = '',
  contentClassName = '',
}: FeaturePageProps) {
  return (
    <main className={`responsive-page responsive-workspace feature-page ${className}`.trim()}>
      <PageHeader title={title} subtitle={subtitle} icon={icon} tag={tag} extra={headerActions} />
      {toolbar && <FeatureToolbar {...toolbar} />}
      <div className={`feature-page-content ${contentClassName}`.trim()}>{children}</div>
    </main>
  );
}

export default React.memo(FeaturePage);
