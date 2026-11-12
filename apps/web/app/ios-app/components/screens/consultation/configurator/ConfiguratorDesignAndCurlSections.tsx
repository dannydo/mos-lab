'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { ALL_LASH_DESIGNS, type LashMaterialSpec } from '../../LashMaterialConstraintMatrix';
import { LASH_CURL_LIST } from '../../LashCurlData';
import { LashCurlIllustration } from '../../LashCurlIllustration';

export interface ConfiguratorDesignAndCurlSectionsProps {
  activeMaterial: LashMaterialSpec;
  updateActiveMaterial: (updater: (prev: LashMaterialSpec) => LashMaterialSpec, toastMsg?: string) => void;
  handleToggleDesign: (designId: string) => void;
  handleToggleCurl: (curlCode: string) => void;
}

export const ConfiguratorDesignAndCurlSections: React.FC<ConfiguratorDesignAndCurlSectionsProps> = ({
  activeMaterial,
  updateActiveMaterial,
  handleToggleDesign,
  handleToggleCurl,
}) => {
  return (
    <>
      {/* CONFIG SECTION 1: THIẾT KẾ CHO PHÉP (DESIGNS) */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-black text-gray-900 uppercase">
              1. {activeMaterial.shortLabel} → Có thể ra Thiết Kế gì?
            </div>
            <div className="text-[10px] text-gray-500 font-medium">
              Bấm để Bật / Khóa thiết kế. Bấm ngôi sao ★ để đặt làm mặc định.
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                updateActiveMaterial(
                  (m) => ({
                    ...m,
                    allowedDesigns: ['Natural'],
                    defaultDesign: 'Natural',
                  }),
                  `Chỉ mở Natural cho ${activeMaterial.shortLabel}`
                )
              }
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[9px] font-extrabold text-gray-700"
            >
              Chỉ Natural
            </button>
            <button
              type="button"
              onClick={() =>
                updateActiveMaterial(
                  (m) => ({
                    ...m,
                    allowedDesigns: ['Natural', 'Doll', 'Wing', 'Kim - K'],
                  }),
                  `Mở đủ 4 dáng cho ${activeMaterial.shortLabel}`
                )
              }
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[9px] font-extrabold text-gray-700"
            >
              Mở cả 4
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ALL_LASH_DESIGNS.map((d) => {
            const isAllowed = activeMaterial.allowedDesigns.includes(d.id);
            const isDefault = activeMaterial.defaultDesign === d.id;
            return (
              <div
                key={d.id}
                onClick={() => handleToggleDesign(d.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-1.5 ${
                  isAllowed
                    ? 'bg-emerald-50/70 border-emerald-500 text-gray-900 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-400 opacity-75'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black ${
                        isAllowed ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isAllowed ? '✓' : '✕'}
                    </span>
                    <span className="text-[12px] font-extrabold truncate">{d.shortName}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                    {isAllowed ? d.desc : 'Đang khóa cho chất liệu này'}
                  </div>
                </div>

                {isAllowed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateActiveMaterial(
                        (m) => ({ ...m, defaultDesign: d.id }),
                        `Đặt ${d.shortName} làm thiết kế mặc định`
                      );
                    }}
                    title="Đặt làm thiết kế mặc định"
                    className={`p-1 rounded-lg border shrink-0 ${
                      isDefault
                        ? 'bg-[#FFB400] text-black border-amber-500'
                        : 'bg-white text-gray-400 border-gray-200 hover:text-gray-700'
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIG SECTION 2: ĐỘ CONG CHO PHÉP (CURLS) */}
      <div className="bg-white rounded-2xl p-3 shadow-xs border border-gray-200 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div>
            <div className="text-[12px] font-black text-gray-900 uppercase">
              2. {activeMaterial.shortLabel} → Có Độ Cong thế nào?
            </div>
            <div className="text-[10px] text-gray-500 font-medium">
              Chọn trong 7 độ cong chuẩn (`J, B, C, D` & `LJ, LB, LC`).
            </div>
          </div>

          {/* Quick Curl Presets */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Chỉ B', curls: ['B'] },
              { label: 'Chỉ B, C', curls: ['B', 'C'] },
              { label: 'Chỉ B, C, D', curls: ['B', 'C', 'D'] },
              { label: 'J, B, C, D', curls: ['J', 'B', 'C', 'D'] },
              { label: 'Chỉ LJ, LB, LC', curls: ['LJ', 'LB', 'LC'] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  updateActiveMaterial(
                    (m) => ({
                      ...m,
                      allowedCurls: preset.curls,
                      defaultCurl: preset.curls.includes(m.defaultCurl) ? m.defaultCurl : preset.curls[0],
                    }),
                    `Đã đặt độ cong [${preset.curls.join(', ')}] cho ${activeMaterial.shortLabel}`
                  )
                }
                className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-extrabold"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {LASH_CURL_LIST.map((curlItem) => {
            const isAllowed = activeMaterial.allowedCurls.includes(curlItem.id);
            const isDefault = activeMaterial.defaultCurl === curlItem.id;
            return (
              <div
                key={curlItem.id}
                onClick={() => handleToggleCurl(curlItem.id)}
                className={`p-1.5 rounded-xl border cursor-pointer transition-all flex flex-col items-center relative ${
                  isAllowed
                    ? 'bg-emerald-50/60 border-emerald-500 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 opacity-45 grayscale'
                }`}
              >
                <div className="w-full flex items-center justify-between px-0.5 mb-0.5">
                  <span className={`text-[11px] font-black ${isAllowed ? 'text-emerald-900' : 'text-gray-400'}`}>
                    {curlItem.code}
                  </span>
                  {isAllowed ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateActiveMaterial(
                          (m) => ({ ...m, defaultCurl: curlItem.id }),
                          `Đặt độ cong ${curlItem.code} làm mặc định`
                        );
                      }}
                      className={`p-0.5 rounded ${
                        isDefault ? 'bg-[#FFB400] text-black' : 'text-gray-300 hover:text-gray-600'
                      }`}
                      title="Đặt làm độ cong mặc định"
                    >
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </button>
                  ) : (
                    <span className="text-[8px] font-bold text-gray-400">Khóa</span>
                  )}
                </div>

                <div className="w-full">
                  <LashCurlIllustration curl={curlItem} variant="card" isActive={isAllowed} showLabels={false} />
                </div>

                <div className="text-[8.5px] font-bold text-gray-600 mt-0.5 truncate w-full text-center">
                  {curlItem.angleLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
