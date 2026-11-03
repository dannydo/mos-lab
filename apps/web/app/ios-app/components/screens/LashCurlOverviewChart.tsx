'use client';

import React from 'react';
import { LASH_CURL_LIST } from './LashCurlData';
import { LashCurlIllustration, LashCurlGroupFanIllustration } from './LashCurlIllustration';

interface LashCurlOverviewChartProps {
  selectedCurlId: string;
  onSelectCurl: (curlId: string) => void;
}

export const LashCurlOverviewChart: React.FC<LashCurlOverviewChartProps> = ({ selectedCurlId, onSelectCurl }) => {
  const subtleCurls = LASH_CURL_LIST.filter((c) => c.category === 'SUBTLE');
  const dramaticCurls = LASH_CURL_LIST.filter((c) => c.category === 'DRAMATIC');
  const liftUpCurls = LASH_CURL_LIST.filter((c) => c.category === 'LIFT UP');

  const groups: Array<{
    category: 'SUBTLE' | 'DRAMATIC' | 'LIFT UP';
    title: string;
    subtitle: string;
    badge: string;
    badgeColor: string;
    curls: typeof subtleCurls;
  }> = [
    {
      category: 'SUBTLE',
      title: 'SUBTLE · TỰ NHIÊN',
      subtitle: 'For Straight-Angle Natural Lash (Mi thật mọc thẳng)',
      badge: '30° - 45°',
      badgeColor: '#38BDF8',
      curls: subtleCurls,
    },
    {
      category: 'DRAMATIC',
      title: 'DRAMATIC · NỔI BẬT & CUỐN HÚT',
      subtitle: 'For Straight & Downwards Natural Lash (Mi ngang & chúc)',
      badge: '55° - 70° (HOT)',
      badgeColor: '#FFB400',
      curls: dramaticCurls,
    },
    {
      category: 'LIFT UP',
      title: 'LIFT UP · NÂNG MÍ SỤP / MỘT MÍ',
      subtitle: 'For Hooded Eyelids, Deep Set Or Droopy Eyes',
      badge: '85° LIFT',
      badgeColor: '#10B981',
      curls: liftUpCurls,
    },
  ];

  return (
    <div className="w-full space-y-3.5 py-1 select-none">
      {/* Top Legend Bar */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 flex items-center justify-between text-[11px] text-amber-200">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9E6B55] border border-amber-300 inline-block" />
          <span>
            Màu nâu: <strong>Mi Thật (Natural Lash)</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-black border border-amber-400 inline-block" />
          <span>
            Màu đen: <strong>Mi Nối Ngọn Nhọn</strong>
          </span>
        </div>
      </div>

      {/* 3 Category Rows Matching BL Lashes Reference Chart */}
      {groups.map((grp) => (
        <div
          key={grp.category}
          className="bg-white/5 border border-white/10 rounded-3xl p-3 space-y-2.5 backdrop-blur-sm"
        >
          {/* Category Header + Multi-Curl Overlay Fan Comparison */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white tracking-wide">{grp.title}</span>
                <span
                  className="text-[9.5px] font-black px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${grp.badgeColor}22`,
                    color: grp.badgeColor,
                    border: `1px solid ${grp.badgeColor}44`,
                  }}
                >
                  {grp.badge}
                </span>
              </div>
              <p className="text-[10.5px] text-gray-400 mt-0.5 leading-snug">{grp.subtitle}</p>
            </div>

            {/* Superimposed Group Fan Box (Left-column of BL Lashes Chart) */}
            <div className="w-[106px] shrink-0 bg-black/45 border border-white/10 rounded-2xl px-1.5 py-0.5 flex flex-col items-center">
              <LashCurlGroupFanIllustration category={grp.category} activeCurlId={selectedCurlId} />
            </div>
          </div>

          {/* Individual Curl Cards in this Category (White card background like BL Chart so black lash + brown natural lash pop clearly) */}
          <div
            className={`grid gap-2 ${
              grp.curls.length === 3 ? 'grid-cols-3' : grp.curls.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {grp.curls.map((c) => {
              const active = selectedCurlId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCurl(c.id)}
                  className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                    active
                      ? 'bg-[#FFFBEB] border-[#FFB400] text-black shadow-lg ring-2 ring-[#FFB400]'
                      : 'bg-[#F8FAFC] border-white/20 text-gray-900 hover:bg-white'
                  }`}
                >
                  {/* Curl Code & Degree */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-black text-black">{c.code} Curl</span>
                    <span
                      className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                        active ? 'bg-[#FFB400] text-black' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {c.angleLabel}
                    </span>
                  </div>

                  {/* 1:1 BL Lashes Tapered Illustration with Natural Lash Base */}
                  <div className="w-full my-0.5">
                    <LashCurlIllustration curl={c} variant="card" isActive={active} showLabels={true} />
                  </div>

                  {/* Short Vietnamese description */}
                  <span className="text-[9.5px] text-gray-600 font-semibold block mt-0.5 line-clamp-1">
                    {c.shortDesc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
