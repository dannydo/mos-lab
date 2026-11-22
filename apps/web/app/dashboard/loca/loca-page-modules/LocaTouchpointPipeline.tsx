'use client';

import React, { useCallback } from 'react';
import { Button, InputNumber, Typography } from 'antd';
import type { CustomTouchpoint, Touchpoint } from '../hooks/use-loca-data/types';
import { getTouchpointPalette } from './locaPageUtils';
import styles from './LocaPage.module.css';

const { Text } = Typography;

interface LocaTouchpointChipProps {
  touchpoint: Touchpoint;
  count: number;
  isSelected: boolean;
  themeMode: 'light' | 'dark';
  onSelect: (key: string) => void;
}

function LocaTouchpointChip({ touchpoint, count, isSelected, themeMode, onSelect }: LocaTouchpointChipProps) {
  const palette = getTouchpointPalette(touchpoint.color, themeMode);

  const applyPaletteRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      el.style.setProperty('--tp-bg', palette.bg);
      el.style.setProperty('--tp-border', palette.border);
      el.style.setProperty('--tp-text', palette.text);
      el.style.setProperty('--tp-dot', palette.dot);
    },
    [palette.bg, palette.border, palette.dot, palette.text]
  );

  return (
    <div
      ref={applyPaletteRef}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Lọc chạm ${touchpoint.label}`}
      onClick={() => onSelect(touchpoint.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(touchpoint.key);
        }
      }}
      className={`min-w-[68px] shrink-0 cursor-pointer select-none rounded-xl border px-[9px] py-[5px] text-center transition-all duration-300 focus:ring-2 focus:ring-amber-400/60 focus:outline-none ${
        isSelected
          ? `${styles.touchpointChipSelected} scale-[1.03] border-amber-400 shadow-md ring-2 ring-amber-400/30`
          : `${styles.touchpointChip} hover:scale-[1.01]`
      }`}
    >
      <div className="mb-0.5 flex items-center justify-center gap-1.5">
        <span className={`${styles.touchpointDot} h-[5px] w-[5px] shrink-0 rounded-full`} />
        <span
          className={`${styles.touchpointChipLabel} text-[10px] font-extrabold tracking-[0.02em] uppercase whitespace-nowrap`}
        >
          {touchpoint.label}
        </span>
      </div>
      <div className={`${styles.touchpointChipCount} text-[14px] font-black tabular-nums`}>{count}</div>
    </div>
  );
}

export interface LocaTouchpointPipelineProps {
  themeMode: 'light' | 'dark';
  activeTouchpointKey: string;
  activeTouchpointsList: Touchpoint[];
  customTouchpoints: CustomTouchpoint[];
  tabCounts: Record<string, number>;
  touchpointCounts: Record<string, number>;
  onSelectTouchpoint: (key: string) => void;
  onUpdateCustomTouchpoint: (index: number, daysMin: number, daysMax: number) => void;
}

export function LocaTouchpointPipeline({
  themeMode,
  activeTouchpointKey,
  activeTouchpointsList,
  customTouchpoints,
  tabCounts,
  touchpointCounts,
  onSelectTouchpoint,
  onUpdateCustomTouchpoint,
}: LocaTouchpointPipelineProps) {
  const isDark = themeMode === 'dark';
  const separatorClass = `h-[2px] w-[3px] shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.06]'}`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Text className="text-xs font-bold tracking-[0.05em] text-[var(--mos-text)] uppercase">
          QUY TRÌNH CHĂM SÓC THEO CHẠM
        </Text>
        {activeTouchpointKey !== 'ALL' && (
          <Button type="link" size="small" onClick={() => onSelectTouchpoint('ALL')} className="p-0">
            Xem tất cả khách hàng
          </Button>
        )}
      </div>

      <div
        className={`inline-flex min-h-[62px] max-w-full flex-row items-center justify-start gap-[5px] overflow-x-auto scroll-smooth rounded-xl border p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDark ? 'border-white/5 bg-neutral-900' : 'border-slate-100 bg-slate-50/50'
        }`}
      >
        {/* All touchpoints capsule */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={activeTouchpointKey === 'ALL'}
          aria-label="Lọc tất cả điểm chạm"
          onClick={() => onSelectTouchpoint('ALL')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectTouchpoint('ALL');
            }
          }}
          className={`min-w-[72px] shrink-0 cursor-pointer select-none rounded-xl border-2 px-[9px] py-[5px] text-center transition-all duration-300 focus:ring-2 focus:ring-amber-400/60 focus:outline-none ${
            activeTouchpointKey === 'ALL'
              ? 'scale-[1.02] border-gold bg-gold/10 shadow-[0_2px_10px_rgba(212,168,75,0.15)]'
              : isDark
                ? 'border-transparent bg-white/[0.02] hover:bg-white/[0.04]'
                : 'border-transparent bg-white hover:border-slate-200 hover:bg-white'
          }`}
        >
          <div className="text-[10px] font-bold whitespace-nowrap text-neutral-500 uppercase">Tất cả chạm</div>
          <div
            className={`mt-[1px] text-[14px] font-black tabular-nums ${
              activeTouchpointKey === 'ALL'
                ? isDark
                  ? 'text-[var(--color-primary)]'
                  : 'text-amber-800'
                : 'text-[var(--mos-text)]'
            }`}
          >
            {tabCounts['LOCA_ALL'] || 0}
          </div>
        </div>

        {/* Individual touchpoints up to 30 days */}
        {activeTouchpointsList
          .filter((tp) => tp.daysMax <= 30)
          .map((tp, idx) => (
            <React.Fragment key={tp.key}>
              {idx > 0 && <div className={separatorClass} />}
              <LocaTouchpointChip
                touchpoint={tp}
                count={touchpointCounts[tp.key] || 0}
                isSelected={activeTouchpointKey === tp.key}
                themeMode={themeMode}
                onSelect={onSelectTouchpoint}
              />
            </React.Fragment>
          ))}

        {/* 3 Custom Minimalist Day Filter Capsules after Chạm 30 */}
        {customTouchpoints.map((ctp, idx) => {
          const isSelected = activeTouchpointKey === ctp.key;
          const count = touchpointCounts[ctp.key] || touchpointCounts[`tp_${ctp.key}`] || 0;

          return (
            <React.Fragment key={ctp.key}>
              <div className={separatorClass} />
              <div
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Lọc tùy chỉnh từ ${ctp.daysMin} đến ${ctp.daysMax} ngày`}
                onClick={() => onSelectTouchpoint(ctp.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTouchpoint(ctp.key);
                  }
                }}
                className={`min-w-[105px] shrink-0 cursor-pointer select-none rounded-xl border px-[7px] py-[5px] text-center transition-all duration-300 focus:ring-2 focus:ring-amber-400/60 focus:outline-none ${
                  isSelected
                    ? 'scale-[1.03] border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-400/30 dark:bg-amber-500/15'
                    : isDark
                      ? 'border-white/[0.08] bg-white/[0.02] hover:scale-[1.01]'
                      : 'border-slate-200 bg-white hover:scale-[1.01]'
                }`}
              >
                <div className="mb-0.5 flex items-center justify-center gap-1">
                  <span
                    className={`h-[5px] w-[5px] shrink-0 rounded-full ${
                      isSelected
                        ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]'
                        : 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]'
                    }`}
                  />
                  <div
                    className={`${styles.customRangeInputs} flex items-center gap-0.5 text-[11px] font-semibold`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeTouchpointKey !== ctp.key) {
                        onSelectTouchpoint(ctp.key);
                      }
                    }}
                  >
                    <InputNumber
                      size="small"
                      min={0}
                      max={999}
                      controls={false}
                      value={ctp.daysMin}
                      aria-label={`Số ngày bắt đầu khoảng tùy chỉnh ${idx + 1}`}
                      className={isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--mos-text)]'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTouchpointKey !== ctp.key) {
                          onSelectTouchpoint(ctp.key);
                        }
                      }}
                      onFocus={() => {
                        if (activeTouchpointKey !== ctp.key) {
                          onSelectTouchpoint(ctp.key);
                        }
                      }}
                      onChange={(val) => {
                        if (val !== null && val !== undefined) {
                          onUpdateCustomTouchpoint(idx, Number(val), ctp.daysMax);
                        }
                      }}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-neutral-500'
                      }`}
                    >
                      -
                    </span>
                    <InputNumber
                      size="small"
                      min={0}
                      max={999}
                      controls={false}
                      value={ctp.daysMax}
                      aria-label={`Số ngày kết thúc khoảng tùy chỉnh ${idx + 1}`}
                      className={isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--mos-text)]'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTouchpointKey !== ctp.key) {
                          onSelectTouchpoint(ctp.key);
                        }
                      }}
                      onFocus={() => {
                        if (activeTouchpointKey !== ctp.key) {
                          onSelectTouchpoint(ctp.key);
                        }
                      }}
                      onChange={(val) => {
                        if (val !== null && val !== undefined) {
                          onUpdateCustomTouchpoint(idx, ctp.daysMin, Number(val));
                        }
                      }}
                    />
                  </div>
                </div>
                <div
                  className={`text-[14px] font-black tabular-nums ${
                    isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--mos-text)]'
                  }`}
                >
                  {count}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
