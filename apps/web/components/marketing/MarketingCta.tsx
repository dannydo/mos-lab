'use client';

import type { MouseEventHandler, ReactNode } from 'react';
import styles from './MarketingPrimitives.module.css';

export interface MarketingCtaProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  accessibleLabel?: string;
}

export function MarketingCta({ href, children, className = '', onClick, accessibleLabel }: MarketingCtaProps) {
  const opensNewTab = href.startsWith('https:');
  return (
    <a
      href={href}
      className={[styles.cta, className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={accessibleLabel}
      target={opensNewTab ? '_blank' : undefined}
      rel={opensNewTab ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}
