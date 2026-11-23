'use client';

import React from 'react';
import { Columns3 } from 'lucide-react';
import { ProfileOmiCallSection } from '../ProfileOmiCallSection';
import { DESKTOP_DENSITY_OPTIONS } from './profileSheetUtils';
import type { DesktopDensityOption } from './types';

export interface ProfileGeneralControlsProps {
  isDark: boolean;
  desktopDensity: DesktopDensityOption;
  setDesktopDensity?: (density: DesktopDensityOption) => void;
}

export const ProfileGeneralControls: React.FC<ProfileGeneralControlsProps> = ({
  isDark,
  desktopDensity,
  setDesktopDensity,
}) => {
  return (
    <>
      <ProfileOmiCallSection isDark={isDark} />

      {setDesktopDensity && (
        <div className="p-3 rounded-2xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-raised,var(--mos-surface))] space-y-2 transition-colors">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-0.5 text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Columns3 className="w-3.5 h-3.5 text-amber-500" />
              <span>Mật độ hiển thị</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)]">
            {DESKTOP_DENSITY_OPTIONS.map((opt) => {
              const active = desktopDensity === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDesktopDensity(opt.id)}
                  aria-pressed={active}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-black shadow-xs'
                      : isDark
                        ? 'text-neutral-300 hover:text-white'
                        : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
