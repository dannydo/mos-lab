'use client';

import React from 'react';
import { Zap, Award } from 'lucide-react';
import { IslandGameIcon } from './IslandGameIcon';

export interface CareerIslandData {
  id: string;
  name: string;
  sub: string;
  badge: string;
  icon: string;
  title: string;
  desc: string;
  focus: string;
  gateText: string;
  skills: Array<{ name: string; desc: string }>;
  perks: string[];
}

interface CareerRealmEncyclopediaProps {
  currentIslandData: CareerIslandData;
}

export const CareerRealmEncyclopedia: React.FC<CareerRealmEncyclopediaProps> = ({ currentIslandData }) => {
  return (
    <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">
            {currentIslandData.badge}: {currentIslandData.name}
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">{currentIslandData.title}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 italic">&ldquo;{currentIslandData.desc}&rdquo;</p>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <IslandGameIcon islandId={currentIslandData.id} size="lg" isActive={true} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Sứ mệnh */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">🎯 Trọng tâm sứ mệnh</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentIslandData.focus}
          </div>
          <div className="pt-1">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300">
              🎯 <strong>Cổng thăng cấp:</strong> {currentIslandData.gateText}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Bộ kỹ năng cần luyện</span>
          </div>
          <div className="space-y-1.5">
            {currentIslandData.skills.map((skill, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{skill.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{skill.desc}</div>
                </div>
                <span className="text-[9px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-500/10 px-1.5 py-0.5 rounded-md font-mono border border-pink-200 dark:border-pink-800 shrink-0">
                  Lv.Max
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Perks */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/30 space-y-2">
          <div className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Quyền lợi & Thu nhập mở khóa</span>
          </div>
          <ul className="text-[11px] text-amber-800 dark:text-amber-200 space-y-1.5 pl-4 list-disc">
            {currentIslandData.perks.map((perk, idx) => (
              <li key={idx}>{perk}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
