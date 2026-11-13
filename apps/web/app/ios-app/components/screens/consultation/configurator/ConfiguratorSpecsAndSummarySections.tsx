'use client';

import React from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../../../../context/ThemeContext';
import {
  ALL_LASH_THICKNESSES,
  ALL_LENGTH_MAPPINGS,
  ALL_SINGLE_LENGTHS,
  ALL_VOLUME_OPTIONS,
  type LashMaterialSpec,
} from '../../LashMaterialConstraintMatrix';

export interface ConfiguratorSpecsAndSummarySectionsProps {
  activeMaterial: LashMaterialSpec;
  draftCatalog: LashMaterialSpec[];
  setActiveId: (id: string) => void;
  updateActiveMaterial: (updater: (prev: LashMaterialSpec) => LashMaterialSpec, toastMsg?: string) => void;
  handleToggleThickness: (thicknessId: string) => void;
  handleToggleSingleLength: (mmLabel: string) => void;
  handleToggleLengthMapping: (mappingId: string) => void;
  handleToggleVolume: (vol: string) => void;
}

export const ConfiguratorSpecsAndSummarySections: React.FC<ConfiguratorSpecsAndSummarySectionsProps> = ({
  activeMaterial,
  draftCatalog,
  setActiveId,
  updateActiveMaterial,
  handleToggleThickness,
  handleToggleSingleLength,
  handleToggleLengthMapping,
  handleToggleVolume,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <>
      {/* CONFIG SECTION 3: ĐỘ DÀY CHO PHÉP (THICKNESS) */}
      <div className="bg-[var(--mos-surface)] rounded-2xl p-3 shadow-xs border border-[var(--mos-surface-border)] space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div>
            <div className="text-[12px] font-black text-[var(--mos-text)] uppercase">
              3. {activeMaterial.shortLabel} → Có Độ Dày thế nào?
            </div>
            <div className="text-[10px] text-[var(--mos-text-muted)] font-medium">
              Chọn các độ dày sợi (mm) được phép sử dụng cho chất liệu này.
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {[
              { label: '0.05 & 0.07', list: ['0.05 mm', '0.07 mm'] },
              { label: '0.07 & 0.10', list: ['0.07 mm', '0.10 mm'] },
              { label: '0.10, 0.12, 0.15', list: ['0.10 mm', '0.12 mm', '0.15 mm'] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  updateActiveMaterial(
                    (m) => ({
                      ...m,
                      allowedThicknesses: preset.list,
                      defaultThickness: preset.list.includes(m.defaultThickness) ? m.defaultThickness : preset.list[0],
                    }),
                    `Đã đặt độ dày [${preset.label}] cho ${activeMaterial.shortLabel}`
                  )
                }
                className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold cursor-pointer ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {ALL_LASH_THICKNESSES.map((t) => {
            const isAllowed = activeMaterial.allowedThicknesses.includes(t.id);
            const isDefault = activeMaterial.defaultThickness === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleToggleThickness(t.id)}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isAllowed
                    ? (isDark ? 'bg-emerald-500/15 border-emerald-500/60 text-[var(--mos-text)]' : 'bg-emerald-50/70 border-emerald-500 text-gray-900')
                    : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] opacity-65'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black">{t.label}</span>
                  {isAllowed ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateActiveMaterial(
                          (m) => ({ ...m, defaultThickness: t.id }),
                          `Đặt ${t.label} làm độ dày mặc định`
                        );
                      }}
                      className={`p-0.5 rounded cursor-pointer ${
                        isDefault ? 'bg-[#FFB400] text-black' : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]'
                      }`}
                    >
                      <Star className="w-3 h-3 fill-current" />
                    </button>
                  ) : (
                    <span className="text-[8px] font-bold">Khóa</span>
                  )}
                </div>
                <div className="text-[9px] text-[var(--mos-text-muted)] mt-0.5 leading-tight line-clamp-1">{t.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIG SECTION 4: ĐỘ DÀI CHO PHÉP (LENGTHS) */}
      <div className="bg-[var(--mos-surface)] rounded-2xl p-3 shadow-xs border border-[var(--mos-surface-border)] space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div>
            <div className="text-[12px] font-black text-[var(--mos-text)] uppercase">
              4. {activeMaterial.shortLabel} → Có Độ Dài thế nào?
            </div>
            <div className="text-[10px] text-[var(--mos-text-muted)] font-medium">
              Cấu hình cả dải phối độ dài (Mapping) và từng cỡ mm đơn lẻ (6mm – 15mm).
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() =>
                updateActiveMaterial(
                  (m) => ({
                    ...m,
                    allowedSingleLengths: ['6 mm', '7 mm', '8 mm'],
                    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) => ['6-7 mm', '7-8 mm'].includes(item.id)),
                    defaultLength: '6-7 mm',
                  }),
                  `Đã đặt độ dài Mi Dưới (6-8mm)`
                )
              }
              className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold cursor-pointer ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'}`}
            >
              Mi dưới 6–8mm
            </button>
            <button
              type="button"
              onClick={() =>
                updateActiveMaterial(
                  (m) => ({
                    ...m,
                    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm'],
                    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) =>
                      ['8-10 mm', '9-11 mm', '10-12 mm', '11-13 mm'].includes(item.id)
                    ),
                    defaultLength: '10-12 mm',
                  }),
                  `Đã đặt độ dài chuẩn 8-13mm`
                )
              }
              className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold cursor-pointer ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'}`}
            >
              Chuẩn 8–13mm
            </button>
            <button
              type="button"
              onClick={() =>
                updateActiveMaterial(
                  (m) => ({
                    ...m,
                    allowedSingleLengths: ['8 mm', '9 mm', '10 mm', '11 mm', '12 mm', '13 mm', '14 mm'],
                    allowedLengthMappings: ALL_LENGTH_MAPPINGS.filter((item) =>
                      ['8-10-12 mm', '9-11-13 mm', '10-12-14 mm'].includes(item.id)
                    ),
                    defaultLength: '8-10-12 mm',
                  }),
                  `Đã đặt độ dài so le Ivylight`
                )
              }
              className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold cursor-pointer ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'}`}
            >
              So le Ivylight
            </button>
          </div>
        </div>

        {/* Single mm chips */}
        <div>
          <div className="text-[10px] font-extrabold text-[var(--mos-text-muted)] uppercase mb-1">Cỡ mm đơn lẻ cho phép:</div>
          <div className="grid grid-cols-5 gap-1.5">
            {ALL_SINGLE_LENGTHS.map((mm) => {
              const isAllowed = activeMaterial.allowedSingleLengths.includes(mm);
              return (
                <button
                  key={mm}
                  type="button"
                  onClick={() => handleToggleSingleLength(mm)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    isAllowed
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border-[var(--mos-surface-border)]'
                  }`}
                >
                  {mm}
                </button>
              );
            })}
          </div>
        </div>

        {/* Length Mapping Presets */}
        <div className="pt-1 border-t border-[var(--mos-surface-border)]">
          <div className="text-[10px] font-extrabold text-[var(--mos-text-muted)] uppercase mb-1.5">
            Dải phối độ dài (Mapping gợi ý):
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_LENGTH_MAPPINGS.map((mapping) => {
              const isAllowed = activeMaterial.allowedLengthMappings.some((item) => item.id === mapping.id);
              return (
                <button
                  key={mapping.id}
                  type="button"
                  onClick={() => handleToggleLengthMapping(mapping.id)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    isAllowed
                      ? (isDark ? 'bg-emerald-500/15 border-emerald-500/60 text-[var(--mos-text)]' : 'bg-emerald-50/70 border-emerald-500 text-gray-900')
                      : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] opacity-65'
                  }`}
                >
                  <div className="text-[11px] font-black flex items-center justify-between">
                    <span>{mapping.id}</span>
                    <span>{isAllowed ? '✓' : 'Khóa'}</span>
                  </div>
                  <div className="text-[9px] text-[var(--mos-text-muted)] truncate mt-0.5">{mapping.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONFIG SECTION 5: VOLUME / KỸ THUẬT FAN */}
      <div className="bg-[var(--mos-surface)] rounded-2xl p-3 shadow-xs border border-[var(--mos-surface-border)] space-y-2">
        <div className="text-[12px] font-black text-[var(--mos-text)] uppercase">
          5. {activeMaterial.shortLabel} → Kỹ Thuật Sợi / Volume
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_VOLUME_OPTIONS.map((vol) => {
            const isAllowed = activeMaterial.allowedVolumes.includes(vol);
            return (
              <button
                key={vol}
                type="button"
                onClick={() => handleToggleVolume(vol)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  isAllowed
                    ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] border-[#FFB400]'
                    : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border-[var(--mos-surface-border)]'
                }`}
              >
                {isAllowed && '✓ '}
                {vol}
              </button>
            );
          })}
        </div>
      </div>

      {/* BẢNG TỔNG HỢP TOÀN BỘ MA TRẬN (OVERVIEW SUMMARY) */}
      <div className="bg-[var(--mos-surface)] rounded-2xl p-3 shadow-xs border border-[var(--mos-surface-border)] space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-[var(--mos-text)] uppercase">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Bảng Tổng Hợp Cấu Hình Hiện Tại ({draftCatalog.length} Chất Liệu)
        </div>
        <div className="divide-y divide-[var(--mos-surface-border)] text-[10.5px]">
          {draftCatalog.map((m) => (
            <div
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={`py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                m.id === activeMaterial.id
                  ? (isDark ? 'bg-amber-500/15' : 'bg-amber-50/70')
                  : 'hover:bg-[var(--mos-surface-muted)]'
              }`}
            >
              <div className="flex items-center justify-between font-black text-[var(--mos-text)]">
                <span>{m.shortLabel}</span>
                <span className={`text-[9.5px] font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Cong: {m.allowedCurls.join(', ')}</span>
              </div>
              <div className="text-[10px] text-[var(--mos-text-muted)] mt-0.5 flex flex-wrap gap-x-2">
                <span>
                  <b>Thiết kế:</b> {m.allowedDesigns.join(', ')}
                </span>
                <span>·</span>
                <span>
                  <b>Dày:</b> {m.allowedThicknesses.map((t) => t.replace(' mm', '')).join(', ')}mm
                </span>
                <span>·</span>
                <span>
                  <b>Dài:</b> {m.allowedSingleLengths[0]}–{m.allowedSingleLengths[m.allowedSingleLengths.length - 1]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
