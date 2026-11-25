'use client';

import React from 'react';

export interface CcWalletStripMetric {
  key: string;
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  valueClassName?: string;
}

interface CcMobileWalletStripProps {
  items: readonly [CcWalletStripMetric, CcWalletStripMetric, CcWalletStripMetric];
  ariaLabel: string;
  testId?: string;
}

export const CcMobileWalletStrip: React.FC<CcMobileWalletStripProps> = ({ items, ariaLabel, testId }) => {
  return (
    <section
      data-testid={testId}
      aria-label={ariaLabel}
      className="rounded-2xl px-3 py-2.5 bg-white/95 border border-slate-200/80 shadow-xs dark:bg-white/[0.045] dark:border-white/[0.08]"
    >
      <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-white/[0.08]">
        {items.map((item, idx) => {
          const padClass = idx === 0 ? 'pr-2' : idx === 1 ? 'px-2.5' : 'pl-2.5';
          return (
            <div key={item.key} className={`${padClass} min-w-0`}>
              <div className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.label}</div>
              <div
                className={`mt-0.5 text-[16px] font-bold leading-tight tabular-nums truncate ${
                  item.valueClassName || 'text-slate-900 dark:text-slate-50'
                }`}
              >
                {item.value}
              </div>
              {item.subtext ? (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  {item.subtext}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
