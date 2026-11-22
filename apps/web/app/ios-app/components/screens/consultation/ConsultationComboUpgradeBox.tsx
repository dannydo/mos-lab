'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import type { LashPricingAndCvPointResult } from '../LashMaterialConstraintMatrix';

interface ConsultationComboUpgradeBoxProps {
  serviceType: 'Normal' | 'Retain';
  comboBaseServicePrice: number;
  comboBaseRetainPrice: number;
  upgradeScope: 'SINGLE' | 'ALL';
  setUpgradeScope: React.Dispatch<React.SetStateAction<'SINGLE' | 'ALL'>>;
  retainUpgradeMode: 'DEDUCT_NORMAL' | 'PAY_DIFF';
  setRetainUpgradeMode: React.Dispatch<React.SetStateAction<'DEDUCT_NORMAL' | 'PAY_DIFF'>>;
  isComboLive: boolean;
  hasComboNormalRemaining: boolean;
  hasComboRetainRemaining: boolean;
  comboNormalRemaining: number;
  comboRetainRemaining: number;
  cleanServiceName: string;
  livePricingAndCvPoints: LashPricingAndCvPointResult;
  normalUpgradeDiff: number;
  retainUpgradeDiff: number;
  totalUpgradeAmount: number;
  showStaffRewards: boolean;
}

export function ConsultationComboUpgradeBox({
  serviceType,
  comboBaseServicePrice,
  comboBaseRetainPrice,
  upgradeScope,
  setUpgradeScope,
  retainUpgradeMode,
  setRetainUpgradeMode,
  isComboLive,
  hasComboNormalRemaining,
  hasComboRetainRemaining,
  comboNormalRemaining,
  comboRetainRemaining,
  cleanServiceName,
  livePricingAndCvPoints,
  normalUpgradeDiff,
  retainUpgradeDiff,
  totalUpgradeAmount,
  showStaffRewards,
}: ConsultationComboUpgradeBoxProps) {
  return (
    <div className="bg-gradient-to-b from-[#1E293B] to-[#0F172A] rounded-xl p-3 border border-sky-500/40 text-white space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" /> NÂNG CẤP TỪ GÓI COMBO
        </span>
        <span className="text-[10px] font-bold text-sky-200 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
          Gói: {(serviceType === 'Retain' ? comboBaseRetainPrice : comboBaseServicePrice).toLocaleString('vi-VN')} đ
        </span>
      </div>

      <div className="bg-black/40 p-1 rounded-lg grid grid-cols-2 gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setUpgradeScope('SINGLE')}
          className={`py-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
            upgradeScope === 'SINGLE' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>{serviceType === 'Normal' ? '✦ 1' : '↻ 1'}</span>
        </button>
        <button
          type="button"
          onClick={() => setUpgradeScope('ALL')}
          className={`py-1.5 px-2 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
            upgradeScope === 'ALL' ? 'bg-sky-500 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>
            ✦ {comboNormalRemaining} · ↻ {comboRetainRemaining}
          </span>
        </button>
      </div>

      {serviceType === 'Normal' && isComboLive && hasComboRetainRemaining && (
        <div className="space-y-1.5 bg-black/30 p-2 rounded-lg border border-white/5 text-[11px]">
          <div className="text-[10.5px] font-semibold text-neutral-300">
            {!hasComboNormalRemaining ? '⚠️ Hết ✦ (0) · Phương án làm ✦:' : 'Khách nối Mới:'}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={!hasComboNormalRemaining}
              onClick={() => setRetainUpgradeMode('DEDUCT_NORMAL')}
              className={`p-1.5 rounded-md text-left transition-all border ${
                retainUpgradeMode === 'DEDUCT_NORMAL' && hasComboNormalRemaining
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold'
                  : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              <div className="text-[10.5px] font-black">✦ 1</div>
              <div className="text-[9.5px] text-neutral-300">
                {hasComboNormalRemaining ? `✦ ${comboNormalRemaining} (0đ)` : '❌ 0'}
              </div>
            </button>
            <button
              type="button"
              disabled={!hasComboRetainRemaining}
              onClick={() => setRetainUpgradeMode('PAY_DIFF')}
              className={`p-1.5 rounded-md text-left transition-all border ${
                (retainUpgradeMode === 'PAY_DIFF' || !hasComboNormalRemaining) && hasComboRetainRemaining
                  ? 'bg-amber-600/30 border-amber-400 text-amber-200 font-bold'
                  : 'bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              <div className="text-[10.5px] font-black">↻ 1 + bù</div>
              <div className="text-[9.5px] text-neutral-300">
                {hasComboRetainRemaining
                  ? `+${(comboBaseServicePrice - comboBaseRetainPrice).toLocaleString('vi-VN')} đ (↻ ${comboRetainRemaining})`
                  : '❌ 0'}
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="bg-black/50 rounded-lg p-2.5 border border-white/10 space-y-1.5 text-[11.5px]">
        <div className="flex items-center justify-between text-neutral-300">
          <span>Dịch vụ:</span>
          <span className="font-bold text-white truncate max-w-[210px]">
            {cleanServiceName} ({livePricingAndCvPoints.skuPrice.toLocaleString('vi-VN')} đ)
          </span>
        </div>
        {upgradeScope === 'ALL' ? (
          <div className="pt-1.5 border-t border-white/10 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-neutral-300">
              <span>
                ✦ {comboNormalRemaining} (+{normalUpgradeDiff.toLocaleString('vi-VN')} đ):
              </span>
              <span className="font-bold text-white tabular-nums">
                +{(normalUpgradeDiff * comboNormalRemaining).toLocaleString('vi-VN')} đ
              </span>
            </div>
            {comboRetainRemaining > 0 && (
              <div className="flex items-center justify-between text-neutral-300">
                <span>
                  ↻ {comboRetainRemaining} (+{retainUpgradeDiff.toLocaleString('vi-VN')} đ):
                </span>
                <span className="font-bold text-white tabular-nums">
                  +{(retainUpgradeDiff * comboRetainRemaining).toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-emerald-400 font-bold pt-1 border-t border-white/5">
              <span>
                Phụ thu (✦ {comboNormalRemaining} · ↻ {comboRetainRemaining}):
              </span>
              <span className="text-[13px] font-black tabular-nums">
                +{totalUpgradeAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-neutral-300">
            <span>Phụ thu ({serviceType === 'Normal' ? '✦ 1' : '↻ 1'}):</span>
            <span
              className={`font-black tabular-nums text-[13px] ${
                totalUpgradeAmount > 0 ? 'text-emerald-400' : 'text-sky-300'
              }`}
            >
              {totalUpgradeAmount > 0 ? `+${totalUpgradeAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
            </span>
          </div>
        )}
        {showStaffRewards && (
          <div className="flex items-center justify-between text-neutral-400 text-[10.5px] pt-1 border-t border-white/10">
            <span className="inline-flex items-center gap-1">
              <span>↻</span>
              <CvFeather1Badge />:
            </span>
            <span className="font-bold text-amber-300 tabular-nums">+{livePricingAndCvPoints.totalPoints} pts</span>
          </div>
        )}
      </div>
    </div>
  );
}
