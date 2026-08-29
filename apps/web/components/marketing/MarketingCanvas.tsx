'use client';

import type { ReactNode } from 'react';
import styles from './MarketingPrimitives.module.css';

export interface MarketingCanvasProps {
  children: ReactNode;
  className?: string;
  label?: string;
}

/** A visual sandbox. Campaign CSS may style this subtree but never the app root. */
export function MarketingCanvas({ children, className = '', label }: MarketingCanvasProps) {
  return (
    <main
      className={[styles.canvas, className].filter(Boolean).join(' ')}
      data-marketing-canvas="true"
      aria-label={label}
    >
      {children}
    </main>
  );
}
