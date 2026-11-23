'use client';

import React from 'react';
import {
  UNDER_MINK_PREP_SPEC,
  parseUnderMinkCountFibers,
  parseUnderMinkLengthMm,
  stepUnderMinkCount,
  stepUnderMinkLength,
} from '../LashMaterialConstraintMatrix';

interface ConsultationUnderMinkStripProps {
  isDark: boolean;
  underMinkCurl: 'B' | 'C';
  setUnderMinkCurl: React.Dispatch<React.SetStateAction<'B' | 'C'>>;
  underMinkLength: string;
  setUnderMinkLength: React.Dispatch<React.SetStateAction<string>>;
  underMinkCount: string;
  setUnderMinkCount: React.Dispatch<React.SetStateAction<string>>;
  underMinkServiceType: 'Normal' | 'Retain';
  setUnderMinkServiceType: React.Dispatch<React.SetStateAction<'Normal' | 'Retain'>>;
  hasUnderMinkCombo: boolean;
  underComboNormalRemaining: number;
  underComboRetainRemaining: number;
}

export function ConsultationUnderMinkStrip({
  isDark,
  underMinkCurl,
  setUnderMinkCurl,
  underMinkLength,
  setUnderMinkLength,
  underMinkCount,
  setUnderMinkCount,
  underMinkServiceType,
  setUnderMinkServiceType,
  hasUnderMinkCombo,
  underComboNormalRemaining,
  underComboRetainRemaining,
}: ConsultationUnderMinkStripProps) {
  return (
    <div
      className={`pt-2 border-t flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap ${
        isDark ? 'border-neutral-800' : 'border-neutral-200/70'
      }`}
    >
      <div className="flex items-center gap-1">
        <div
          className={`inline-flex items-center p-0.5 rounded-lg border ${
            isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
          }`}
        >
          {(['B', 'C'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setUnderMinkCurl(c)}
              className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                underMinkCurl === c
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : isDark
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-neutral-600 hover:text-black'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div
          className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
            isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, -1))}
            disabled={parseUnderMinkLengthMm(underMinkLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
            className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            −
          </button>
          <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
            {parseUnderMinkLengthMm(underMinkLength)}
          </span>
          <button
            type="button"
            onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, 1))}
            disabled={parseUnderMinkLengthMm(underMinkLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
            className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            +
          </button>
        </div>

        <div
          className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
            isDark ? 'bg-[#1C1C1E] border-neutral-700' : 'bg-white border-neutral-200'
          }`}
        >
          <button
            type="button"
            onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, -10))}
            disabled={parseUnderMinkCountFibers(underMinkCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
            className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            −
          </button>
          <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
            {parseUnderMinkCountFibers(underMinkCount)}
          </span>
          <button
            type="button"
            onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, 10))}
            disabled={parseUnderMinkCountFibers(underMinkCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
            className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            +
          </button>
        </div>
      </div>

      <div
        className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${
          isDark ? 'bg-[#1C1C1E] border-purple-800' : 'bg-white border-purple-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setUnderMinkServiceType('Normal')}
          className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
            underMinkServiceType === 'Normal'
              ? 'bg-[#FFB400] text-black shadow-2xs'
              : isDark
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-black'
          }`}
        >
          {hasUnderMinkCombo ? `Mới (${underComboNormalRemaining})` : 'Mới'}
        </button>
        <button
          type="button"
          onClick={() => setUnderMinkServiceType('Retain')}
          className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
            underMinkServiceType === 'Retain'
              ? 'bg-[#34C759] text-white shadow-2xs'
              : isDark
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-black'
          }`}
        >
          {hasUnderMinkCombo ? `Dặm (${underComboRetainRemaining})` : 'Dặm'}
        </button>
      </div>
    </div>
  );
}
