'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface IosNavAction {
  label: string;
  onClick: () => void;
}

interface IosNavigationBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backTitle?: string;
  rightAction?: React.ReactNode | IosNavAction;
  leftAction?: React.ReactNode | IosNavAction;
}

function isNavAction(action: any): action is IosNavAction {
  return action && typeof action === 'object' && 'label' in action && typeof action.onClick === 'function';
}

export function IosNavigationBar({
  title,
  subtitle,
  onBack,
  backTitle,
  rightAction,
  leftAction,
}: IosNavigationBarProps) {
  const renderAction = (action?: React.ReactNode | IosNavAction) => {
    if (!action) return null;
    if (isNavAction(action)) {
      return (
        <button
          onClick={action.onClick}
          className="text-[15px] font-medium active:opacity-60 transition-opacity py-1 px-1"
          style={{ color: 'var(--mos-accent)' }}
        >
          {action.label}
        </button>
      );
    }
    return action;
  };

  return (
    <header
      className="w-full pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 px-4 flex items-center justify-between border-b select-none z-40 relative min-h-[50px] shrink-0 transition-colors"
      style={{
        backgroundColor: 'var(--mos-surface)',
        borderColor: 'var(--mos-surface-border)',
        color: 'var(--mos-text)',
      }}
    >
      {/* Left Item */}
      <div className="z-10 flex items-center justify-start">
        {leftAction ? (
          renderAction(leftAction)
        ) : onBack ? (
          <button
            onClick={onBack}
            className="flex items-center active:opacity-60 transition-opacity text-[15px] font-medium -ml-1 py-1"
            style={{ color: 'var(--mos-accent)' }}
          >
            <ChevronLeft className="w-4 h-4 -mr-0.5 shrink-0" />
            <span className="truncate max-w-[110px]">{backTitle || 'Back'}</span>
          </button>
        ) : null}
      </div>

      {/* Center Title - Perfectly centered */}
      <div className="absolute inset-x-0 bottom-2.5 top-[calc(env(safe-area-inset-top,0px)+10px)] flex flex-col items-center justify-center pointer-events-none px-28">
        <h1
          className="font-bold text-[15.5px] tracking-tight truncate leading-tight pointer-events-auto"
          style={{ color: 'var(--mos-text)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <span
            className="text-[11px] font-normal truncate leading-tight pointer-events-auto"
            style={{ color: 'var(--mos-text-muted)' }}
          >
            {subtitle}
          </span>
        )}
      </div>

      {/* Right Item */}
      <div className="z-10 flex items-center justify-end">{renderAction(rightAction)}</div>
    </header>
  );
}
