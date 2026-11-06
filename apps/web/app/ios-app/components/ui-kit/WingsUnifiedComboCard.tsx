'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { MatchedComboPackageOption } from '@mos-lab/shared';
import { WingsComboCard, type WingsTierOption } from './WingsComboCard';

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
 * WingsUnifiedComboCard — Gom các combo card thành 1 card duy nhất
 * Tier selector nằm BÊN TRONG card (thay thế bảng 390/770/880),
 * dạng vertical list: "Mua 2 Tặng 1 — 1.05M | Mua 7 Tặng 3 — 3.54M"
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
  const unlockedPkgs = useMemo(() => packages.filter((p) => !p.isLocked), [packages]);
  const lockedPkgs = useMemo(() => packages.filter((p) => p.isLocked), [packages]);
  const allPkgs = useMemo(() => [...unlockedPkgs, ...lockedPkgs], [unlockedPkgs, lockedPkgs]);

  // Chọn tier mặc định: ưu tiên selectedPackageId, sau đó "7 tặng" hoặc index 2
  const defaultIdx = useMemo(() => {
    if (selectedPackageId) {
      const idx = allPkgs.findIndex((p) => p.id === selectedPackageId);
      if (idx >= 0) return idx;
    }
    const popularIdx = allPkgs.findIndex((p) => p.ruleName?.includes('7 tặng'));
    if (popularIdx >= 0) return popularIdx;
    return Math.min(2, allPkgs.length - 1);
  }, [selectedPackageId, allPkgs]);

  const [activeTierIdx, setActiveTierIdx] = useState(defaultIdx);

  useEffect(() => {
    if (selectedPackageId) {
      const idx = allPkgs.findIndex((p) => p.id === selectedPackageId);
      if (idx >= 0) setActiveTierIdx(idx);
    }
  }, [selectedPackageId, allPkgs]);

  if (allPkgs.length === 0) return null;

  const activePkg = allPkgs[activeTierIdx] ?? allPkgs[0];

  /** Label tier: "Mua 2 Tặng 1", "Mua 7 Tặng 3", ... */
  function getTierLabel(pkg: MatchedComboPackageOption): string {
    const totalPaid = pkg.comboNewCount + pkg.comboRefillCount;
    const totalBonus = pkg.bonusNewCount + pkg.bonusRefillCount;
    if (totalBonus > 0) return `Mua ${totalPaid} Tặng ${totalBonus}`;
    return pkg.ruleName || `Mua ${totalPaid} lần`;
  }

  // Build allTiers prop cho WingsComboCard
  const allTiers: WingsTierOption[] = allPkgs.map((pkg, idx) => ({
    label: getTierLabel(pkg),
    comboPrice: pkg.comboPrice,
    avgPerSessionPrice: pkg.avgPerSessionPrice,
    discountPct: typeof pkg.discountPct === 'number' && pkg.discountPct > 0 ? pkg.discountPct : undefined,
    isActive: idx === activeTierIdx,
    isLocked: Boolean(pkg.isLocked),
    onSelect: () => {
      setActiveTierIdx(idx);
      onSelectPackage(pkg);
    },
  }));

  return (
    <WingsComboCard
      pkg={activePkg}
      customerName={customerName}
      customerPhone={customerPhone}
      customerAvatar={customerAvatar}
      selected={selectedPackageId === activePkg.id}
      compact
      showActionFooter={!activePkg.isLocked}
      allTiers={allTiers}
      onSelect={() => {
        if (!activePkg.isLocked) {
          onSelectPackage(activePkg);
        }
      }}
      onSelectLocked={() => onSelectLocked?.()}
    />
  );
}
