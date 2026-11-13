'use client';

import React from 'react';

interface SegmentOption {
  key: string;
  label: string;
  badge?: number;
}

interface IosSegmentedControlProps {
  options: SegmentOption[];
  activeKey: string;
  onChange: (key: any) => void;
}

export function IosSegmentedControl({ options, activeKey, onChange }: IosSegmentedControlProps) {
  return (
    <div
      className="w-full p-1 rounded-xl flex items-center border select-none transition-colors"
      style={{
        backgroundColor: 'var(--mos-surface-muted)',
        borderColor: 'var(--mos-surface-border)',
      }}
    >
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all duration-200 relative cursor-pointer ${
              isActive ? 'shadow-sm font-bold' : 'font-semibold'
            }`}
            style={
              isActive
                ? {
                    backgroundColor: 'var(--mos-surface)',
                    color: 'var(--mos-accent)',
                  }
                : {
                    color: 'var(--mos-text-muted)',
                  }
            }
          >
            <span>{option.label}</span>
            {typeof option.badge === 'number' && option.badge > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.2 rounded-full tabular-nums leading-tight font-bold"
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--mos-accent)',
                        color: 'var(--mos-accent-contrast)',
                      }
                    : {
                        backgroundColor: 'var(--mos-surface-border)',
                        color: 'var(--mos-text-muted)',
                      }
                }
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
