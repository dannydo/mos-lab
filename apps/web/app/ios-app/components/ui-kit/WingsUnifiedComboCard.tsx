'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { MatchedComboPackageOption } from '@mos-lab/shared';
import { WingsComboCard } from './WingsComboCard';

export interface WingsUnifiedComboCardProps {
  packages: MatchedComboPackageOption[];
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  selectedPackageId?: string | null;
  onSelectPackage: (pkg: MatchedComboPackageOption) => void;
  onSelectLocked?: () => void;
}

/**
 * WingsUnifiedComboCard — Gom 4 combo card riêng biệt thành 1 card duy nhất
 * với tier selector ở trên (Mua N Tặng M), hiển thị card động theo tier được chọn.
 *
 * User chỉ nhìn thấy 1 card thay vì 4 card — giảm cognitive load.
 * Thông tin khách hàng hiển thị 1 lần duy nhất trên card đang được chọn.
 */
export function WingsUnifiedComboCard({
  packages,
  customerName,
  customerPhone,
  customerAvatar,
  selectedPackageId,
  onSelectPackage,
  onSelectLocked,
}: WingsUnifiedComboCardProps) {
  // Lọc ra các gói không bị khoá để hiển thị tiers, kể cả gói bị khoá
  const unlockedPkgs = useMemo(() => packages.filter((p) => !p.isLocked), [packages]);
  const lockedPkgs = useMemo(() => packages.filter((p) => p.isLocked), [packages]);
  const allPkgs = useMemo(() => [...unlockedPkgs, ...lockedPkgs], [unlockedPkgs, lockedPkgs]);

  // Chọn tier mặc định: ưu tiên selectedPackageId, sau đó index 2 (phổ biến nhất) hoặc 1
  const defaultIdx = useMemo(() => {
    if (selectedPackageId) {
      const idx = allPkgs.findIndex((p) => p.id === selectedPackageId);
      if (idx >= 0) return idx;
    }
    // Ưu tiên "7 tặng 3" (phổ biến nhất) hoặc index 2
    const popularIdx = allPkgs.findIndex((p) => p.ruleName?.includes('7 tặng'));
    if (popularIdx >= 0) return popularIdx;
    return Math.min(2, allPkgs.length - 1);
  }, [selectedPackageId, allPkgs]);

  const [activeTierIdx, setActiveTierIdx] = useState(defaultIdx);

  // Cập nhật activeTierIdx khi selectedPackageId thay đổi từ bên ngoài
  useEffect(() => {
    if (selectedPackageId) {
      const idx = allPkgs.findIndex((p) => p.id === selectedPackageId);
      if (idx >= 0) setActiveTierIdx(idx);
    }
  }, [selectedPackageId, allPkgs]);

  if (allPkgs.length === 0) return null;

  const activePkg = allPkgs[activeTierIdx] ?? allPkgs[0];

  /** Tạo label cho từng tier: "2 Tặng 1", "4 Tặng 1", "7 Tặng 3", "10 Tặng 6" */
  function getTierLabel(pkg: MatchedComboPackageOption): string {
    const totalPaid = pkg.comboNewCount + pkg.comboRefillCount;
    const totalBonus = pkg.bonusNewCount + pkg.bonusRefillCount;
    if (totalBonus > 0) return `${totalPaid} Tặng ${totalBonus}`;
    return pkg.ruleName || `${totalPaid} lần`;
  }

  return (
    <div className="space-y-2">
      {/* Tier Selector Row — 1 hàng ngang, chọn gói */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
        {allPkgs.map((pkg, idx) => {
          const isActive = idx === activeTierIdx;
          const isLocked = pkg.isLocked;
          const label = getTierLabel(pkg);

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  onSelectLocked?.();
                  return;
                }
                setActiveTierIdx(idx);
              }}
              className={[
                'shrink-0 rounded-xl px-3 py-2 flex flex-col items-center transition-all border',
                isActive && !isLocked
                  ? 'bg-amber-500 border-amber-400 shadow-md'
                  : isLocked
                    ? 'bg-neutral-800/60 border-neutral-700/60 opacity-60'
                    : 'bg-[#1C1C1E] border-neutral-700/60',
              ].join(' ')}
              style={{ minWidth: 68 }}
            >
              {isLocked && (
                <span className="text-[8px] font-black text-neutral-400 uppercase leading-none mb-0.5">🔒</span>
              )}
              <span
                className={[
                  'text-[11px] font-black leading-tight text-center',
                  isActive && !isLocked ? 'text-black' : isLocked ? 'text-neutral-500' : 'text-white',
                ].join(' ')}
              >
                {label}
              </span>
              {typeof pkg.discountPct === 'number' && pkg.discountPct > 0 && (
                <span
                  className={[
                    'text-[9px] font-extrabold mt-0.5',
                    isActive && !isLocked ? 'text-black/70' : 'text-amber-400',
                  ].join(' ')}
                >
                  +{pkg.discountPct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Combo Card — hiển thị đầy đủ chỉ tier đang chọn */}
      <WingsComboCard
        pkg={activePkg}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAvatar={customerAvatar}
        selected={selectedPackageId === activePkg.id}
        compact
        showActionFooter={!activePkg.isLocked}
        onSelect={() => {
          if (!activePkg.isLocked) {
            onSelectPackage(activePkg);
          }
        }}
        onSelectLocked={() => onSelectLocked?.()}
      />
    </div>
  );
}
