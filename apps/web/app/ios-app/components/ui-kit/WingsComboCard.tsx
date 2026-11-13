'use client';

import React from 'react';
import { User, Phone, Eye } from 'lucide-react';
import type { MatchedComboPackageOption, WingsComboRulePrice } from '@mos-lab/shared';
import {
  formatCardBrandSubtitle,
  formatCompactBonusValue,
  getCardBackgroundStyle,
} from './combo-card/comboCardHelpers';
import { GoldLaurelWreathBadge } from './combo-card/GoldLaurelWreathBadge';
import { ComboCardBodySections } from './combo-card/ComboCardBodySections';
import { ComboCardDecorativeFrame } from './combo-card/ComboCardDecorativeFrame';

export interface WingsTierOption {
  label: string; // e.g. "Mua 2 Tặng 1"
  fullLabel?: string;
  comboPrice: number;
  avgPerSessionPrice: number;
  discountPct?: number;
  expiryDateDisplay?: string;
  expiryBonusBadge?: string;
  isActive: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onSelectLocked?: () => void;
}

export interface WingsComboCardProps {
  pkg: MatchedComboPackageOption;
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  selected?: boolean;
  /** Khi khách chỉ làm ca lẻ, card xám đi để báo hiệu không chọn */
  dimmed?: boolean;
  includeVat?: boolean;
  compact?: boolean;
  showActionFooter?: boolean;
  onSelect?: () => void;
  onSelectLocked?: () => void;
  onZoomOriginalCard?: (e: React.MouseEvent) => void;
  onCopyQuote?: (e: React.MouseEvent) => void;
  copiedQuote?: boolean;
  /** Cho phép hiển thị huy hiệu thưởng CV (ẩn khi tư vấn khách để bảo mật) */
  showStaffRewards?: boolean;
  /** Nếu có: thay thế bảng volume (390/770/880) bằng vertical tier selector bên trong card */
  allTiers?: WingsTierOption[];
  /** Ngày hết hạn dự kiến (dd/MM/yyyy) tính theo công thức chuẩn */
  expiryDateLabel?: string;
  /** Mô tả ngắn công thức tính HSD */
  expiryFormulaSummary?: string;
}

export function WingsComboCard({
  pkg,
  customerName,
  customerPhone,
  customerAvatar,
  selected = false,
  dimmed = false,
  includeVat = false,
  compact = false,
  showActionFooter = true,
  onSelect,
  onSelectLocked,
  onZoomOriginalCard,
  onCopyQuote,
  copiedQuote = false,
  showStaffRewards = false,
  allTiers,
  expiryDateLabel,
  expiryFormulaSummary,
}: WingsComboCardProps) {
  const bgStyle = getCardBackgroundStyle(pkg.categoryId, pkg.theme);
  const brandSubtitle = formatCardBrandSubtitle(pkg.categoryId, pkg.categoryName);
  const displayPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;
  const displayRetailTotal = includeVat ? Math.round(pkg.retailTotal * 1.08) : pkg.retailTotal;
  const displayAvgPerSession = includeVat
    ? Math.round(pkg.comboPriceWithVat / (pkg.totalSessions || 1))
    : pkg.avgPerSessionPrice;

  // Build volume matrix columns from allVolumePrices (or fallback to current volume)
  const volumePrices: WingsComboRulePrice[] = React.useMemo(() => {
    if (pkg.allVolumePrices && pkg.allVolumePrices.length > 0) {
      const underCols = pkg.allVolumePrices.filter((p) => p.isUnderLash || p.volume === 'under');
      const mainCols = pkg.allVolumePrices.filter((p) => !p.isUnderLash && p.volume !== 'under');
      return [...underCols, ...mainCols];
    }
    return [
      {
        volume: pkg.volume,
        newPrice: pkg.newUnitPrice,
        refillPrice: pkg.refillUnitPrice,
        retailTotal: pkg.retailTotal,
        comboPrice: pkg.comboPrice,
        isUnderLash: pkg.volume === 'under',
      },
    ];
  }, [pkg]);

  // Format COMBO X NEW Y REFILL & BONUS Z REFILL header
  const paidSessionLabel =
    pkg.packageKind === 'vvip_pass'
      ? '20 Lần Nối VIP'
      : `${pkg.comboNewCount} New${pkg.comboRefillCount > 0 ? ` · ${pkg.comboRefillCount} Refill` : ''}`;

  const bonusParts: string[] = [];
  if (pkg.bonusNewCount > 0) bonusParts.push(`${pkg.bonusNewCount} New`);
  if (pkg.bonusRefillCount > 0) bonusParts.push(`${pkg.bonusRefillCount} Refill`);

  const bonusValStr =
    pkg.bonusRetailValue && pkg.bonusRetailValue > 0 ? ` (${formatCompactBonusValue(pkg.bonusRetailValue)})` : '';

  const bonusSessionLabel =
    pkg.packageKind === 'vvip_pass'
      ? 'Dùng chung người thân'
      : bonusParts.length > 0
        ? `${bonusParts.join(' · ')}${bonusValStr}`
        : '';

  return (
    <div
      onClick={() => {
        if (allTiers && allTiers.length > 0) return;
        if (pkg.isLocked) {
          if (onSelectLocked) onSelectLocked();
          return;
        }
        if (onSelect) onSelect();
      }}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor:
          allTiers && allTiers.length > 0
            ? 'default'
            : pkg.isLocked
              ? onSelectLocked
                ? 'pointer'
                : 'not-allowed'
              : onSelect
                ? 'pointer'
                : 'default',
        opacity: pkg.isLocked ? 0.68 : dimmed ? 0.52 : 1,
        filter: dimmed ? 'grayscale(0.92) contrast(0.88)' : undefined,
        border: selected
          ? '2.5px solid #F5C451'
          : dimmed
            ? '1.5px solid rgba(150, 150, 150, 0.28)'
            : '1.5px solid rgba(212, 175, 55, 0.42)',
        boxShadow: selected
          ? '0 10px 28px rgba(245, 196, 81, 0.28), 0 0 0 2px rgba(245, 196, 81, 0.22)'
          : dimmed
            ? 'none'
            : '0 6px 20px rgba(0, 0, 0, 0.22)',
        transition: 'all 0.25s ease',
        color: '#FFFFFF',
        ...bgStyle,
      }}
    >
      <ComboCardDecorativeFrame pkg={pkg} selected={selected} onSelect={onSelect} />

      {/* Card Main Body */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: compact ? '11px 12px 8px' : '13px 14px 10px',
          paddingTop: compact ? 12 : 14,
        }}
      >
        {/* Top Row: Left (Wings Gold Logo + Lash Line + Customer Dotted Lines) & Right (Gold Laurel Wreath) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          {/* Left Column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Wings Gold Script Logo + Lash Category Name */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <img
                src="/images/combo-cards/wings-logo-gold.png"
                alt="Wings Lashes"
                style={{
                  height: compact ? 22 : 25,
                  width: 'auto',
                  objectFit: 'contain',
                  marginLeft: -4,
                  filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
                }}
              />
              <div
                style={{
                  marginTop: 0.5,
                  fontSize: compact ? 12.5 : 14.5,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: '#F8E7B0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.75)',
                  fontFamily: ' Georgia, "Times New Roman", serif',
                }}
              >
                {brandSubtitle}
              </div>
            </div>

            {/* Customer Identity Plate (Player Profile HUD) */}
            <div
              style={{
                marginTop: compact ? 7 : 9,
                display: 'flex',
                flexDirection: 'column',
                gap: compact ? 4.5 : 5.5,
                maxWidth: 250,
              }}
            >
              {/* Line 1: Customer Avatar & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {customerAvatar ? (
                    <>
                      <img
                        src={customerAvatar}
                        alt={customerName || 'Avatar'}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid #F3CE68',
                          boxShadow: '0 0 6px rgba(243, 206, 104, 0.5)',
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          const fallback = parent?.querySelector('.avatar-fallback') as HTMLElement | null;
                          if (fallback) fallback.style.display = 'inline-flex';
                        }}
                      />
                      <span
                        className="avatar-fallback"
                        style={{
                          display: 'none',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #FFE27A',
                          boxShadow: '0 0 6px rgba(243, 206, 104, 0.5)',
                          flexShrink: 0,
                        }}
                      >
                        <User style={{ width: 11, height: 11, color: '#1A1102', strokeWidth: 2.5 }} />
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #FFE27A',
                        boxShadow: '0 0 6px rgba(243, 206, 104, 0.5)',
                        flexShrink: 0,
                      }}
                    >
                      <User style={{ width: 11, height: 11, color: '#1A1102', strokeWidth: 2.5 }} />
                    </span>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#FFE27A',
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 3px rgba(0,0,0,0.65)',
                  }}
                >
                  {customerName || 'Khách hàng VIP Wings'}
                </div>
              </div>

              {/* Line 2: Customer Phone with Vector Phone Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(243, 206, 104, 0.6)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      flexShrink: 0,
                    }}
                  >
                    <Phone style={{ width: 10, height: 10, color: '#1A1102', strokeWidth: 2.5 }} />
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'rgba(255, 246, 214, 0.92)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {(customerPhone || '0938.204.567').replace(/\*+\s*/g, '').trim()}
                </div>
              </div>

              {/* Line 3: Lash Density Specification with Vector Eye Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(243, 206, 104, 0.6)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      flexShrink: 0,
                    }}
                  >
                    <Eye style={{ width: 11, height: 11, color: '#1A1102', strokeWidth: 2.5 }} />
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#F8E7B0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pkg.volume === 'under'
                    ? 'Mi Dưới 390'
                    : pkg.volumeMeta.levelCode
                      ? `${pkg.volumeMeta.levelCode} · ${pkg.volumeMeta.countPerEye} ${pkg.volumeMeta.unitWord || 'trụ'}/mắt`
                      : `${pkg.volumeMeta.countPerEye} ${pkg.volumeMeta.unitWord || 'trụ'}/mắt`}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Gold Laurel Wreath + Ribbon + Shortened Bonus Badge */}
          <GoldLaurelWreathBadge
            discountPct={pkg.discountPct}
            ribbonLabel={pkg.packageKind === 'vvip_pass' ? '20 LẦN VIP' : pkg.ruleName}
            validityMonths={pkg.validityMonths}
            expiryDateLabel={expiryDateLabel}
            cvBonus={showStaffRewards ? pkg.cvBonus : undefined}
            compact={compact}
          />
        </div>

        {/* Subtle Luxury Divider */}
        <div
          style={{
            margin: compact ? '8px 0 6px' : '10px 0 8px',
            height: 1,
            background:
              'linear-gradient(90deg, rgba(243, 206, 104, 0.08) 0%, rgba(243, 206, 104, 0.45) 50%, rgba(243, 206, 104, 0.08) 100%)',
          }}
        />

        <ComboCardBodySections
          pkg={pkg}
          compact={compact}
          includeVat={includeVat}
          showActionFooter={showActionFooter}
          paidSessionLabel={paidSessionLabel}
          bonusSessionLabel={bonusSessionLabel}
          volumePrices={volumePrices}
          displayPrice={displayPrice}
          displayRetailTotal={displayRetailTotal}
          displayAvgPerSession={displayAvgPerSession}
          allTiers={allTiers}
          expiryDateLabel={expiryDateLabel}
          expiryFormulaSummary={expiryFormulaSummary}
          onZoomOriginalCard={onZoomOriginalCard}
          onCopyQuote={onCopyQuote}
          copiedQuote={copiedQuote}
        />
      </div>
    </div>
  );
}
