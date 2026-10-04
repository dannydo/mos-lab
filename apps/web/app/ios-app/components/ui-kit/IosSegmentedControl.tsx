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
    <div className="w-full bg-[#1c1c1e] p-1 rounded-xl flex items-center border border-neutral-800 select-none">
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            key={option.key}
            onClick={() => onChange(option.key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 relative ${
              isActive ? 'bg-[#2c2c2e] text-[#FFB400] shadow-sm font-bold' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>{option.label}</span>
            {typeof option.badge === 'number' && option.badge > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums leading-tight font-bold ${
                  isActive ? 'bg-[#FFB400] text-black' : 'bg-neutral-800 text-neutral-400'
                }`}
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
