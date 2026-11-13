import React from 'react';
import { DEFAULT_IOS_FONT_SCALE_INDEX, IOS_FONT_SCALE_STEPS, useIosFontScale } from '../../state/useIosFontScale';

interface IosFontSizeControlProps {
  isDark: boolean;
  staffId?: number;
}

/**
 * Apple iOS Dynamic Type stepped text-size control with per-user persistence.
 */
export function IosFontSizeControl({ isDark, staffId }: IosFontSizeControlProps) {
  const {
    stepIndex,
    percentLabel,
    isDefault,
    canDecrease,
    canIncrease,
    setStepIndex,
    decreaseStep,
    increaseStep,
    resetFontScale,
  } = useIosFontScale(staffId);

  const maxStepIndex = IOS_FONT_SCALE_STEPS.length - 1;
  const activeFillPct = maxStepIndex > 0 ? Math.round((stepIndex / maxStepIndex) * 100) : 0;

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex items-center justify-between px-0.5 text-[10.5px]">
        <span className={isDark ? 'text-neutral-400 font-medium' : 'text-neutral-600 font-medium'}>
          Cỡ chữ cá nhân:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 font-extrabold tabular-nums">
            {isDefault ? `${percentLabel} · Mặc định` : percentLabel}
          </span>
          {!isDefault && (
            <button
              type="button"
              onClick={resetFontScale}
              aria-label="Đặt lại cỡ chữ mặc định"
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer active:scale-95 ${
                isDark
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700'
                  : 'bg-neutral-200/80 text-neutral-700 hover:bg-neutral-300 border border-neutral-300'
              }`}
            >
              Mặc định
            </button>
          )}
        </div>
      </div>

      <div
        className={`rounded-xl px-2 py-1.5 border flex items-center gap-2 transition-colors ${
          isDark ? 'bg-black/50 border-neutral-800' : 'bg-white border-neutral-200/90 shadow-2xs'
        }`}
      >
        <button
          type="button"
          onClick={decreaseStep}
          disabled={!canDecrease}
          aria-label="Giảm cỡ chữ"
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${
            isDark ? 'text-neutral-200 hover:bg-neutral-800/80' : 'text-neutral-700 hover:bg-neutral-100'
          }`}
        >
          <span className="ios-font-scale-fixed-sm">A</span>
        </button>

        <div className="flex-1 h-7 relative flex items-center select-none">
          {/* Visual track + discrete Apple notch ticks aligned to range thumb center */}
          <div className="absolute inset-x-[11px] top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            <div
              className={`w-full h-[3px] rounded-full relative overflow-hidden ${
                isDark ? 'bg-neutral-700/90' : 'bg-neutral-300'
              }`}
            >
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-150"
                style={{ width: `${activeFillPct}%` }}
              />
            </div>
            <div className="absolute inset-x-0 flex items-center justify-between">
              {IOS_FONT_SCALE_STEPS.map((step, idx) => {
                const isDefaultNotch = idx === DEFAULT_IOS_FONT_SCALE_INDEX;
                const isPassed = idx <= stepIndex;
                return (
                  <span
                    key={step}
                    className={`rounded-full transition-colors ${
                      isDefaultNotch
                        ? 'w-[2px] h-3 bg-amber-500'
                        : isPassed
                          ? 'w-[1.5px] h-2 bg-amber-500'
                          : isDark
                            ? 'w-[1.5px] h-2 bg-neutral-600'
                            : 'w-[1.5px] h-2 bg-neutral-400'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={maxStepIndex}
            step={1}
            value={stepIndex}
            onChange={(e) => setStepIndex(Number(e.target.value))}
            aria-label="Thanh trượt cỡ chữ cá nhân"
            className="ios-apple-font-slider relative z-10 w-full h-7"
          />
        </div>

        <button
          type="button"
          onClick={increaseStep}
          disabled={!canIncrease}
          aria-label="Tăng cỡ chữ"
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-extrabold transition-all cursor-pointer active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${
            isDark ? 'text-white hover:bg-neutral-800/80' : 'text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          <span className="ios-font-scale-fixed-lg">A</span>
        </button>
      </div>
    </div>
  );
}
