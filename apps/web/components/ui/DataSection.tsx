'use client';

import React from 'react';
import { SectionCard } from './SectionCard';
import type { SectionCardProps } from './SectionCard';
import { StatePanel } from './StatePanel';
import type { StatePanelKind } from './StatePanel';

export interface DataSectionProps extends Omit<SectionCardProps, 'children'> {
  children?: React.ReactNode;
  /** Render a canonical loading, empty, or error state in place of content. */
  state?: StatePanelKind;
  stateTitle?: string;
  stateDescription?: React.ReactNode;
  stateExtra?: React.ReactNode;
  stateMinHeight?: number;
}

/**
 * SectionCard plus a standard async state. Use it around a table, card list,
 * or chart so every feature presents loading, empty, and failure consistently.
 */
export function DataSection({
  children,
  state,
  stateTitle,
  stateDescription,
  stateExtra,
  stateMinHeight,
  ...sectionProps
}: DataSectionProps) {
  return (
    <SectionCard {...sectionProps}>
      {state ? (
        <StatePanel
          kind={state}
          title={stateTitle}
          description={stateDescription}
          extra={stateExtra}
          minHeight={stateMinHeight}
          surface={false}
        />
      ) : (
        children
      )}
    </SectionCard>
  );
}

export default React.memo(DataSection);
