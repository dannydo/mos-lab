'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { MatchedComboPackageOption } from '@mos-lab/shared';
import { WingsComboCard, type WingsTierOption } from './WingsComboCard';

export interface ComboExpiryPreviewItem {
  dateExpiredDisplay: string;
  bonusBadge?: string;
  formulaSummary?: string;
}

export interface WingsUnifiedComboCardProps {
  packages: MatchedComboPackageOption[];
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  selectedPackageId?: string | null;
  dimmed?: boolean;
  includeVat?: boolean;
  showStaffRewards?: boolean;
  expiryPreviewByPkgId?: Record<string, ComboExpiryPreviewItem>;
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
  dimmed = false,
  includeVat = false,
  showStaffRewards = false,
  expiryPreviewByPkgId,
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
      if (idx >= 0) {
        setActiveTierIdx(idx);
        return;
      }
    }
    // Giữ activeTierIdx trong giới hạn nếu allPkgs thay đổi hoặc selectedPackageId là null
    setActiveTierIdx((prev) => {
      if (prev >= 0 && prev < allPkgs.length) return prev;
      const popularIdx = allPkgs.findIndex((p) => p.ruleName?.includes('7 tặng'));
      if (popularIdx >= 0) return popularIdx;
      return 0;
    });
  }, [selectedPackageId, allPkgs]);

  if (allPkgs.length === 0) return null;

  const activePkg = allPkgs[activeTierIdx] ?? allPkgs[0];

  /** Label tier ngắn gọn tối giản: "2 + 1", "4 + 1", "7 + 3", "10 + 6", "VIP 20" */
  function getTierShortLabel(pkg: MatchedComboPackageOption): string {
    if (pkg.packageKind === 'vvip_pass') return 'VIP 20';
    const totalPaid = pkg.comboNewCount + pkg.comboRefillCount;
    const totalBonus = pkg.bonusNewCount + pkg.bonusRefillCount;
    if (totalBonus > 0) return `${totalPaid} + ${totalBonus}`;
    return `${totalPaid} lần`;
  }

  // Build allTiers prop cho WingsComboCard
  const allTiers: WingsTierOption[] = allPkgs.map((pkg, idx) => {
    const effectiveComboPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
    const effectiveAvgSessionPrice = includeVat
      ? Math.round(pkg.comboPriceWithVat / (pkg.totalSessions || 1))
      : pkg.avgPerSessionPrice;

    const preview = expiryPreviewByPkgId?.[pkg.id];
    return {
      label: getTierShortLabel(pkg),
      fullLabel: pkg.ruleName || `Gói ${pkg.totalSessions} buổi`,
      comboPrice: effectiveComboPrice,
      avgPerSessionPrice: effectiveAvgSessionPrice,
      discountPct: typeof pkg.discountPct === 'number' && pkg.discountPct > 0 ? pkg.discountPct : undefined,
      expiryDateDisplay: preview?.dateExpiredDisplay,
      expiryBonusBadge: preview?.bonusBadge,
      isActive:
        selectedPackageId !== undefined
          ? Boolean(selectedPackageId && selectedPackageId === pkg.id)
          : idx === activeTierIdx,
      isLocked: Boolean(pkg.isLocked),
      onSelect: () => {
        setActiveTierIdx(idx);
        onSelectPackage(pkg);
      },
      onSelectLocked: () => {
        onSelectLocked?.();
      },
    };
  });

  const activePreview = expiryPreviewByPkgId?.[activePkg.id];

  return (
    <WingsComboCard
      pkg={activePkg}
      customerName={customerName}
      customerPhone={customerPhone}
      customerAvatar={customerAvatar}
      selected={Boolean(selectedPackageId && selectedPackageId === activePkg.id)}
      dimmed={dimmed}
      includeVat={includeVat}
      showStaffRewards={showStaffRewards}
      compact
      showActionFooter={!activePkg.isLocked}
      allTiers={allTiers}
      expiryDateLabel={activePreview?.dateExpiredDisplay}
      expiryFormulaSummary={activePreview?.formulaSummary}
      onSelect={() => {
        if (!activePkg.isLocked) {
          onSelectPackage(activePkg);
        }
      }}
      onSelectLocked={() => onSelectLocked?.()}
    />
  );
}
