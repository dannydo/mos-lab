'use client';

import React from 'react';
import { IslandGameIcon, WingRoleLabel } from '../components/IslandGameIcon';
import type { CareerIsland } from '../career-path.constants';
import type { CareerIslandId } from './careerPathTypesAndHelpers';

interface CareerWorldMapBannerProps {
  islands: CareerIsland[];
  activeIsland: CareerIslandId;
  onSelectIsland: (islandId: CareerIsland['id']) => void;
}

export const CareerWorldMapBanner: React.FC<CareerWorldMapBannerProps> = ({
  islands,
  activeIsland,
  onSelectIsland,
}) => {
  return (
    <div className="hidden md:block rounded-3xl p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-sky-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 border-2 border-pink-200/80 dark:border-pink-500/30 shadow-md relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-black tracking-wide shadow-xs">
          🗺️ BẢN ĐỒ THẾ GIỚI THIÊN THẦN
        </div>
        <span className="text-[10px] text-pink-600 dark:text-pink-300 font-bold font-mono">
          7 Vương Quốc Panoramic · Nhìn trọn 1 màn hình
        </span>
      </div>

      <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
        <span>Hành Trình Thăng Cấp RPG</span>
        <span className="text-sm">✨</span>
      </h1>
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mt-1">
        Vượt ải ⛑️ KTV Thử Việc ➔ CV ➔ <WingRoleLabel text="CVL" /> ➔ <WingRoleLabel text="CVLL" /> ➔{' '}
        <WingRoleLabel text="🪽 FM 🪽" /> ➔ 💖 CHO ➔ 💎 BOSS Co-Owner!
      </p>

      {/* ISLANDS PANORAMIC GRID ON DESKTOP FHD */}
      <div className="mt-3 pt-1 border-t border-pink-200/60 dark:border-pink-500/20">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5 pt-3.5">
          {islands.map((island) => {
            const isActive = activeIsland === island.id;
            return (
              <button
                key={island.id}
                type="button"
                onClick={() => onSelectIsland(island.id)}
                className={`w-full p-2 sm:p-2.5 rounded-2xl border transition-all text-center relative group active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 border-pink-500 shadow-md shadow-pink-500/20 ring-2 ring-pink-500/30'
                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80 hover:opacity-100'
                }`}
              >
                <span
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap shadow-xs z-10 ${
                    isActive
                      ? 'bg-pink-500 text-white shadow-pink-500/30 ring-1 ring-white/50'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {island.badge}
                </span>
                <div className="mt-1 mb-1 flex justify-center">
                  <IslandGameIcon islandId={island.id} size="md" isActive={isActive} />
                </div>
                <div className="text-[10px] sm:text-[11px] font-black text-slate-900 dark:text-white mt-0.5">
                  <WingRoleLabel text={island.name.split('·')[0]?.trim()} />
                </div>
                <div className="text-[8px] sm:text-[9px] text-pink-700 dark:text-pink-300 font-bold truncate">
                  {island.name.split('·')[1]?.trim()}
                </div>
                <div className="text-[7.5px] sm:text-[8px] text-slate-400 font-mono mt-0.5 truncate">{island.sub}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
