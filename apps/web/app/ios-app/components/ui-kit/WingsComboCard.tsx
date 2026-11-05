'use client';

import React from 'react';
import { User, Phone, Eye, Sparkles } from 'lucide-react';
import type { MatchedComboPackageOption, WingsComboRulePrice } from '@mos-lab/shared';

export interface WingsComboCardProps {
  pkg: MatchedComboPackageOption;
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  selected?: boolean;
  includeVat?: boolean;
  compact?: boolean;
  showActionFooter?: boolean;
  onSelect?: () => void;
  onZoomOriginalCard?: (e: React.MouseEvent) => void;
  onCopyQuote?: (e: React.MouseEvent) => void;
  copiedQuote?: boolean;
}

function formatCompactVnd(amount: number): string {
  if (!amount || amount <= 0) return '0đ';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/0$/, '');
    return `${formatted}M`;
  }
  return `${Math.round(amount / 1_000)}K`;
}

function getCardBackgroundStyle(categoryId: string, theme?: string): React.CSSProperties {
  const isIvy = categoryId.startsWith('IvyLight') || theme === 'green';
  if (isIvy) {
    return {
      backgroundImage: `linear-gradient(115deg, rgba(5, 22, 12, 0.35) 0%, rgba(4, 18, 10, 0.52) 55%, rgba(3, 14, 8, 0.72) 100%), url('/images/combo-cards/bg-ivylight.webp')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (categoryId.startsWith('UltraLight') || theme === 'red') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #9e161a 0%, #61090c 48%, #260304 82%, #120102 100%)',
    };
  }
  if (categoryId.startsWith('HyperLight') || theme === 'purple') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #9622b8 0%, #52106e 48%, #220533 82%, #11021a 100%)',
    };
  }
  if (categoryId === 'Classic_Volume' || theme === 'blue') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #2f3fd4 0%, #19227c 48%, #0a0e3f 82%, #050721 100%)',
    };
  }
  if (categoryId === 'VVIP' || theme === 'black-fire') {
    return {
      background: 'radial-gradient(circle at 80% 22%, #591111 0%, #240909 42%, #0d090a 78%, #050507 100%)',
    };
  }
  // Default: FlawlessMink (black-gold)
  return {
    background: 'radial-gradient(circle at 22% 20%, #2e2514 0%, #15120c 48%, #090807 82%, #040405 100%)',
  };
}

function formatCardBrandSubtitle(categoryId: string, categoryName: string): string {
  switch (categoryId) {
    case 'IvyLight_3L':
      return 'IVYLIGHT 3ℓ';
    case 'IvyLight_4L':
      return 'IVYLIGHT 4ℓ';
    case 'IvyLight_5L':
      return 'IVYLIGHT 5ℓ';
    case 'HyperLight_2X':
      return 'HYPERLIGHT 2X';
    case 'HyperLight_3X':
      return 'HYPERLIGHT 3X';
    case 'HyperLight_4X':
      return 'HYPERLIGHT 4X';
    case 'HyperLight_5X':
      return 'HYPERLIGHT 5X';
    case 'UltraLight_3D':
      return 'ULTRALIGHT 3D';
    case 'UltraLight_4D':
      return 'ULTRALIGHT 4D';
    case 'UltraLight_5D':
      return 'ULTRALIGHT 5D';
    case 'FlawlessMink':
      return 'FLAWLESS MINK';
    case 'Classic_Volume':
      return 'CLASSIC & VOLUME';
    case 'VVIP':
      return 'VVIP PASS · 20 LẦN';
    default:
      return categoryName.toUpperCase();
  }
}

/**
 * Vector SVG Golden Laurel Wreath + 3D Curved Metallic Ribbon
 * Renders infinitely sharp at any resolution with dynamic discount % and rule label.
 */
function GoldLaurelWreathBadge({
  discountPct,
  ribbonLabel,
  validityMonths,
  cvBonus,
  compact,
}: {
  discountPct: number;
  ribbonLabel: string;
  validityMonths: number;
  cvBonus?: number;
  compact?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const size = compact ? 88 : 100;

  // Generate 7 pairs of laurel leaves along left and right arcs
  const leafAngles = [-62, -42, -22, -2, 18, 38, 58];

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size + 14,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 140 132"
        width={size}
        height={Math.round(size * 0.94)}
        style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.55))' }}
      >
        <defs>
          <linearGradient id={`goldLeaf-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF7C2" />
            <stop offset="35%" stopColor="#F3CE68" />
            <stop offset="70%" stopColor="#C89629" />
            <stop offset="100%" stopColor="#8F6310" />
          </linearGradient>
          <linearGradient id={`goldRibbon-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9E7116" />
            <stop offset="22%" stopColor="#E6BE5A" />
            <stop offset="50%" stopColor="#FFF2B2" />
            <stop offset="78%" stopColor="#E6BE5A" />
            <stop offset="100%" stopColor="#9E7116" />
          </linearGradient>
          <linearGradient id={`goldRibbonDark-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7A540C" />
            <stop offset="100%" stopColor="#B88722" />
          </linearGradient>
        </defs>

        {/* Left & Right Laurel Stems */}
        <path
          d="M 48 92 C 18 76, 14 34, 42 12"
          fill="none"
          stroke={`url(#goldLeaf-${uid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M 92 92 C 122 76, 126 34, 98 12"
          fill="none"
          stroke={`url(#goldLeaf-${uid})`}
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Left Branch Leaves */}
        {leafAngles.map((deg, idx) => {
          const t = idx / (leafAngles.length - 1);
          const angleRad = ((165 - t * 112) * Math.PI) / 180;
          const cx = 70 + Math.cos(angleRad) * 44;
          const cy = 52 - Math.sin(angleRad) * 39;
          return (
            <g key={`L-${idx}`} transform={`translate(${cx}, ${cy}) rotate(${deg})`}>
              {/* Outer leaf */}
              <path
                d="M 0 0 C -8 -5, -13 -14, -5 -20 C 2 -14, 3 -5, 0 0 Z"
                fill={`url(#goldLeaf-${uid})`}
                stroke="#5E4008"
                strokeWidth="0.6"
              />
              {/* Inner leaf */}
              {idx < leafAngles.length - 1 && (
                <path
                  d="M 2 -2 C 9 -6, 14 -13, 8 -19 C 2 -14, 0 -6, 2 -2 Z"
                  fill={`url(#goldLeaf-${uid})`}
                  stroke="#5E4008"
                  strokeWidth="0.6"
                />
              )}
            </g>
          );
        })}

        {/* Right Branch Leaves (Mirrored) */}
        {leafAngles.map((deg, idx) => {
          const t = idx / (leafAngles.length - 1);
          const angleRad = ((15 + t * 112) * Math.PI) / 180;
          const cx = 70 + Math.cos(angleRad) * 44;
          const cy = 52 - Math.sin(angleRad) * 39;
          return (
            <g key={`R-${idx}`} transform={`translate(${cx}, ${cy}) scale(-1, 1) rotate(${deg})`}>
              <path
                d="M 0 0 C -8 -5, -13 -14, -5 -20 C 2 -14, 3 -5, 0 0 Z"
                fill={`url(#goldLeaf-${uid})`}
                stroke="#5E4008"
                strokeWidth="0.6"
              />
              {idx < leafAngles.length - 1 && (
                <path
                  d="M 2 -2 C 9 -6, 14 -13, 8 -19 C 2 -14, 0 -6, 2 -2 Z"
                  fill={`url(#goldLeaf-${uid})`}
                  stroke="#5E4008"
                  strokeWidth="0.6"
                />
              )}
            </g>
          );
        })}

        {/* Ribbon Tail Left */}
        <path
          d="M 8 100 L 28 93 L 32 117 L 12 118 L 17 108 Z"
          fill={`url(#goldRibbonDark-${uid})`}
          stroke="#4F3505"
          strokeWidth="0.8"
        />
        {/* Ribbon Tail Right */}
        <path
          d="M 132 100 L 112 93 L 108 117 L 128 118 L 123 108 Z"
          fill={`url(#goldRibbonDark-${uid})`}
          stroke="#4F3505"
          strokeWidth="0.8"
        />

        {/* Main 3D Curved Gold Ribbon Banner */}
        <path
          d="M 20 88 C 45 81, 95 81, 120 88 C 122 96, 120 105, 116 111 C 92 105, 48 105, 24 111 C 20 105, 18 96, 20 88 Z"
          fill={`url(#goldRibbon-${uid})`}
          stroke="#6A4808"
          strokeWidth="1"
        />

        {/* Discount % Inside Wreath */}
        <text
          x="70"
          y="58"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="26"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.75))' }}
        >
          +{discountPct}%
        </text>

        {/* Rule Label On Ribbon ("2 TẶNG 1", "4 TẶNG 1", etc.) */}
        <text
          x="70"
          y="102.5"
          textAnchor="middle"
          fill="#1F1402"
          fontSize="13.5"
          fontWeight="900"
          letterSpacing="0.4"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {ribbonLabel.toUpperCase()}
        </text>
      </svg>

      {/* Validity Months Underneath Ribbon (bỏ chữ viết tắt (9T)) */}
      <div
        style={{
          marginTop: -4,
          fontSize: compact ? 9 : 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#F3CE68',
          textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {validityMonths} MONTHS
      </div>

      {/* Shortened CV Bonus Badge under Laurel Wreath: 150🪶 */}
      {typeof cvBonus === 'number' && cvBonus > 0 && (
        <div
          style={{
            marginTop: 3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5px 7px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(5, 150, 105, 0.5) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.8)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
            color: '#A7F3D0',
            fontSize: compact ? 9.5 : 10.5,
            fontWeight: 900,
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>+{Math.round(cvBonus / 1000)}🪶</span>
        </div>
      )}
    </div>
  );
}

/**
 * Diagonal Eye Lash Icon matching the physical membership card columns
 */
function LashVolumeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="13" height="9" viewBox="0 0 16 11" fill="none" style={{ flexShrink: 0, opacity: active ? 1 : 0.78 }}>
      <path
        d="M1.5 6.5C4.2 3.2 11.8 3.2 14.5 6.5C11.8 9.2 4.2 9.2 1.5 6.5Z"
        stroke={active ? '#FFE27A' : '#D4AF37'}
        strokeWidth="1.3"
      />
      <circle cx="8" cy="6.5" r="1.7" fill={active ? '#FFE27A' : '#D4AF37'} />
      <path
        d="M4 4L2.8 1.8M6.5 3.2L6 1M9.5 3.2L10 1M12 4L13.2 1.8"
        stroke={active ? '#FFE27A' : '#D4AF37'}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WingsComboCard({
  pkg,
  customerName,
  customerPhone,
  customerAvatar,
  selected = false,
  includeVat = false,
  compact = false,
  showActionFooter = true,
  onSelect,
  onZoomOriginalCard,
  onCopyQuote,
  copiedQuote = false,
}: WingsComboCardProps) {
  const bgStyle = getCardBackgroundStyle(pkg.categoryId, pkg.theme);
  const brandSubtitle = formatCardBrandSubtitle(pkg.categoryId, pkg.categoryName);
  const displayPrice = includeVat ? pkg.comboPriceWithVat : pkg.comboPrice;

  // Build volume matrix columns from allVolumePrices (or fallback to current volume)
  const volumePrices: WingsComboRulePrice[] = React.useMemo(() => {
    if (pkg.allVolumePrices && pkg.allVolumePrices.length > 0) {
      // Put 'under' first (leftmost column on the physical card), then ascending numeric volumes
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
      ? 'COMBO 20 LẦN NỐI MỚI VIP'
      : `COMBO ${pkg.comboNewCount} NEW${pkg.comboRefillCount > 0 ? ` ${pkg.comboRefillCount} REFILL` : ''}`;

  const bonusParts: string[] = [];
  if (pkg.bonusNewCount > 0) bonusParts.push(`${pkg.bonusNewCount} NEW`);
  if (pkg.bonusRefillCount > 0) bonusParts.push(`${pkg.bonusRefillCount} REFILL`);
  const bonusSessionLabel =
    pkg.packageKind === 'vvip_pass'
      ? 'CHIA SẺ NGƯỜI THÂN'
      : bonusParts.length > 0
        ? `BONUS ${bonusParts.join(' ')}`
        : '';

  return (
    <div
      onClick={() => {
        if (!pkg.isLocked && onSelect) onSelect();
      }}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: pkg.isLocked ? 'not-allowed' : onSelect ? 'pointer' : 'default',
        opacity: pkg.isLocked ? 0.68 : 1,
        border: selected ? '2.5px solid #F5C451' : '1.5px solid rgba(212, 175, 55, 0.42)',
        boxShadow: selected
          ? '0 10px 28px rgba(245, 196, 81, 0.28), 0 0 0 2px rgba(245, 196, 81, 0.22)'
          : '0 6px 20px rgba(0, 0, 0, 0.22)',
        transition: 'all 0.2s ease',
        color: '#FFFFFF',
        ...bgStyle,
      }}
    >
      {/* Subtle Luxury Inner Gold Frame Line */}
      <div
        style={{
          position: 'absolute',
          inset: 5,
          borderRadius: 12,
          border: '1px solid rgba(243, 206, 104, 0.18)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Top-Right Diagonal Red Corner Ribbon for WELCOME (2 tặng 1) */}
      {pkg.isWelcomePackage && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: -34,
            width: 132,
            transform: 'rotate(42deg)',
            background: pkg.isLocked
              ? 'linear-gradient(135deg, #64748b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #ff2a2a 0%, #b91010 100%)',
            color: '#FFFFFF',
            textAlign: 'center',
            fontSize: 9.5,
            fontWeight: 900,
            letterSpacing: '0.1em',
            padding: '3px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            zIndex: 4,
            textTransform: 'uppercase',
          }}
        >
          {pkg.isLocked ? '🔒 NGÀY ĐẦU' : 'WELCOME'}
        </div>
      )}

      {/* Selected Top-Left Glow Pill */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            zIndex: 5,
            background: 'linear-gradient(135deg, #FFE27A 0%, #D49B27 100%)',
            color: '#1F1402',
            fontSize: 10,
            fontWeight: 900,
            padding: '2px 8px',
            borderRadius: 999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>✓ ĐANG CHỌN GÓI NÀY</span>
        </div>
      )}

      {/* Card Main Body */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: compact ? '11px 12px 8px' : '13px 14px 10px',
          paddingTop: selected ? (compact ? 24 : 26) : compact ? 11 : 13,
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

            {/* Customer Name, Phone & Lash Density Dotted Lines */}
            <div
              style={{
                marginTop: compact ? 7 : 9,
                display: 'flex',
                flexDirection: 'column',
                gap: compact ? 5 : 6,
                maxWidth: 250,
              }}
            >
              {/* Line 1: Customer Avatar & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {customerAvatar ? (
                  <img
                    src={customerAvatar}
                    alt={customerName || 'Avatar'}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid #F3CE68',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
                      flexShrink: 0,
                    }}
                  />
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
                      boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      flexShrink: 0,
                    }}
                  >
                    <User style={{ width: 11, height: 11, color: '#1A1102', strokeWidth: 2.5 }} />
                  </span>
                )}
                <div
                  style={{
                    flex: 1,
                    borderBottom: '1.5px dotted rgba(243, 206, 104, 0.55)',
                    paddingBottom: 1.5,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#FFF6D6',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {customerName || 'Khách hàng VIP Wings'}
                </div>
              </div>

              {/* Line 2: Customer Phone with Vector Phone Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(243, 206, 104, 0.5)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Phone style={{ width: 9.5, height: 9.5, color: '#1A1102', strokeWidth: 2.5 }} />
                </span>
                <div
                  style={{
                    flex: 1,
                    borderBottom: '1.5px dotted rgba(243, 206, 104, 0.55)',
                    paddingBottom: 1.5,
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: 'rgba(255, 246, 214, 0.9)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {customerPhone || '0938.204.567'}
                </div>
              </div>

              {/* Line 3: Lash Density Specification with Vector Eye Icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #F7DF8B 0%, #B8861E 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(243, 206, 104, 0.5)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                >
                  <Eye style={{ width: 10.5, height: 10.5, color: '#1A1102', strokeWidth: 2.5 }} />
                </span>
                <div
                  style={{
                    flex: 1,
                    borderBottom: '1.5px dotted rgba(243, 206, 104, 0.55)',
                    paddingBottom: 1.5,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#FFE27A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pkg.volume === 'under'
                    ? 'Mi Dưới 390'
                    : `${pkg.volumeMeta.countPerEye} ${pkg.volumeMeta.unitWord || 'trụ'}/mắt`}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Gold Laurel Wreath + Ribbon + Shortened 150🪶 Badge */}
          <GoldLaurelWreathBadge
            discountPct={pkg.discountPct}
            ribbonLabel={pkg.packageKind === 'vvip_pass' ? '20 LẦN VIP' : pkg.ruleName}
            validityMonths={pkg.validityMonths}
            cvBonus={pkg.cvBonus}
            compact={compact}
          />
        </div>

        {/* Elegant Section Divider: Separating Customer Profile & Combo Details */}
        <div
          style={{
            margin: compact ? '12px 0 10px' : '14px 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, rgba(243, 206, 104, 0.45) 0%, rgba(243, 206, 104, 0.08) 100%)',
            }}
          />
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'rgba(255, 230, 160, 0.85)',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4.5,
              userSelect: 'none',
            }}
          >
            <Sparkles style={{ width: 9.5, height: 9.5, color: '#F3CE68' }} />
            <span>ĐẶC QUYỀN GÓI COMBO</span>
          </div>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, rgba(243, 206, 104, 0.08) 0%, rgba(243, 206, 104, 0.45) 100%)',
            }}
          />
        </div>

        {/* Session Formula Bar: COMBO X NEW Y REFILL  |  BONUS Z REFILL */}
        <div
          style={{
            marginTop: compact ? 6 : 7,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 7,
            background: 'rgba(0, 0, 0, 0.34)',
            border: '1px solid rgba(243, 206, 104, 0.22)',
          }}
        >
          <div
            style={{
              fontSize: compact ? 10 : 11,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '0.03em',
            }}
          >
            {paidSessionLabel}
          </div>
          {bonusSessionLabel && (
            <div
              style={{
                fontSize: compact ? 10 : 11,
                fontWeight: 900,
                color: '#FFE27A',
                letterSpacing: '0.03em',
              }}
            >
              ✦ {bonusSessionLabel} (0Đ)
            </div>
          )}
        </div>

        {/* Volume Price Matrix Strip (Matching the Physical Card Bottom Row!) */}
        {pkg.packageKind !== 'vvip_pass' ? (
          <div
            style={{
              marginTop: 6,
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(volumePrices.length, 6)}, minmax(0, 1fr))`,
              gap: 3.5,
              alignItems: 'stretch',
            }}
          >
            {volumePrices.slice(0, 6).map((vp) => {
              const isCurrentVol =
                pkg.volume === 'under'
                  ? Boolean(vp.isUnderLash || vp.volume === 'under')
                  : !vp.isUnderLash && Number(vp.volume) === Number(pkg.volume);
              const vpComboPrice = includeVat ? Math.round(vp.comboPrice * 1.08) : vp.comboPrice;
              const vpRetail = vp.retailTotal || vp.comboPrice;

              return (
                <div
                  key={vp.isUnderLash ? 'under' : String(vp.volume)}
                  style={{
                    padding: '4px 2px',
                    borderRadius: 7,
                    textAlign: 'center',
                    background: isCurrentVol
                      ? 'linear-gradient(180deg, rgba(245, 196, 81, 0.28) 0%, rgba(212, 155, 39, 0.16) 100%)'
                      : 'rgba(0, 0, 0, 0.28)',
                    border: isCurrentVol ? '1.5px solid #FFE27A' : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: isCurrentVol ? '0 0 8px rgba(245, 196, 81, 0.25)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {/* Volume Code Row */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      fontSize: compact ? 9.5 : 10,
                      fontWeight: 800,
                      color: isCurrentVol ? '#FFE27A' : '#E2E8F0',
                    }}
                  >
                    <LashVolumeIcon active={isCurrentVol} />
                    <span>{vp.isUnderLash ? '390' : vp.volume}</span>
                  </div>

                  {/* Crossed-out Retail Price */}
                  <div
                    style={{
                      fontSize: compact ? 8.5 : 9,
                      fontWeight: 600,
                      color: 'rgba(226, 232, 240, 0.62)',
                      textDecoration: 'line-through',
                      lineHeight: 1.15,
                      marginTop: 1.5,
                    }}
                  >
                    {formatCompactVnd(vpRetail)}
                  </div>

                  {/* Gold Combo Price */}
                  <div
                    style={{
                      fontSize: compact ? 10.5 : 11.5,
                      fontWeight: 900,
                      color: isCurrentVol ? '#FFE27A' : '#F3CE68',
                      lineHeight: 1.15,
                      marginTop: 1,
                    }}
                  >
                    {formatCompactVnd(vpComboPrice)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              marginTop: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(0,0,0,0.38)',
              border: '1px solid rgba(243, 206, 104, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 10.5, color: '#F8E7B0', fontWeight: 700 }}>
                20 Lần Nối Mi Tự Chọn Tất Cả Dòng Mi & Độ Dày
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)' }}>
                Áp dụng dùng chung cho bạn bè & người thân · Hạn 36 tháng
              </div>
            </div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'rgba(255,255,255,0.6)',
                  textDecoration: 'line-through',
                }}
              >
                35.40M
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#FFE27A' }}>{formatCompactVnd(displayPrice)}</div>
            </div>
          </div>
        )}

        {/* Footer Bar: Exact Customer Price + Optional Actions */}
        {showActionFooter && (
          <div
            style={{
              marginTop: compact ? 6 : 8,
              paddingTop: compact ? 6 : 8,
              borderTop: '1px solid rgba(243, 206, 104, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {/* Left: Exact Matched Price & Per-Session Breakdown */}
            <div style={{ fontVariantNumeric: 'tabular-nums', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>Giá gói:</span>
                <span
                  style={{
                    fontSize: compact ? 14.5 : 16,
                    fontWeight: 900,
                    color: '#FFE27A',
                    textShadow: '0 1px 3px rgba(0,0,0,0.65)',
                  }}
                >
                  {displayPrice.toLocaleString('vi-VN')}đ
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: 'rgba(255,255,255,0.55)',
                    textDecoration: 'line-through',
                  }}
                >
                  {pkg.retailTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255, 246, 214, 0.82)', marginTop: 1 }}>
                TB ~{pkg.avgPerSessionPrice.toLocaleString('vi-VN')}đ/lần · {pkg.readableContent}
              </div>
            </div>

            {/* Right: Optional Action Buttons (Thẻ gốc, Báo giá) */}
            {(onZoomOriginalCard || onCopyQuote) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {onZoomOriginalCard && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoomOriginalCard(e);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 7,
                      border: '1px solid rgba(243, 206, 104, 0.35)',
                      background: 'rgba(0, 0, 0, 0.35)',
                      color: '#F8E7B0',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Thẻ gốc
                  </button>
                )}

                {onCopyQuote && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyQuote(e);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 7,
                      border: '1px solid rgba(243, 206, 104, 0.35)',
                      background: copiedQuote ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0, 0, 0, 0.35)',
                      color: copiedQuote ? '#A7F3D0' : '#F8E7B0',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedQuote ? '✓ Đã chép' : '📋 Báo giá'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
