'use client';

import React from 'react';
import { AdaptiveDrawer, AdaptiveOverlayFooter } from './AdaptiveOverlay';
import type { AdaptiveDrawerProps } from './AdaptiveOverlay';

export interface EntityFormDrawerProps extends Omit<AdaptiveDrawerProps, 'children' | 'footer' | 'title'> {
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerClassName?: string;
}

/**
 * Canonical create/edit drawer. Mobile becomes full-screen automatically and
 * the action footer remains visible above the safe area.
 */
export function EntityFormDrawer({
  title,
  children,
  footer,
  footerClassName,
  intent = 'form',
  ...drawerProps
}: EntityFormDrawerProps) {
  return (
    <AdaptiveDrawer {...drawerProps} intent={intent} title={title} footer={null}>
      <div className="entity-form-drawer-content">{children}</div>
      {footer && <AdaptiveOverlayFooter className={footerClassName}>{footer}</AdaptiveOverlayFooter>}
    </AdaptiveDrawer>
  );
}

export default React.memo(EntityFormDrawer);
