'use client';

import type { FormEventHandler, ReactNode } from 'react';
import styles from './MarketingPrimitives.module.css';

export interface MarketingFormShellProps {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  className?: string;
  label: string;
}

/** Shared behavior boundary for future lead forms; visual fields remain campaign-owned. */
export function MarketingFormShell({ children, onSubmit, className = '', label }: MarketingFormShellProps) {
  return (
    <form
      className={[styles.formShell, className].filter(Boolean).join(' ')}
      onSubmit={onSubmit}
      aria-label={label}
      noValidate
    >
      {children}
    </form>
  );
}
