'use client';

import React from 'react';
import { FeatherSvg } from '../CvFeatherLabels';

/**
 * Vector SVG Golden Laurel Wreath + 3D Curved Metallic Ribbon
 * Renders infinitely sharp at any resolution with dynamic discount % and rule label.
 */
export function GoldLaurelWreathBadge({
  discountPct,
  ribbonLabel,
  validityMonths,
  expiryDateLabel,
  cvBonus,
  compact,
}: {
  discountPct: number;
  ribbonLabel: string;
  validityMonths: number;
  expiryDateLabel?: string;
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

      {/* Validity Months Underneath Ribbon */}
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

      {/* Live Computed Expiry Date Pill (HSD: dd/MM/yyyy) */}
      {expiryDateLabel && (
        <div
          style={{
            marginTop: 2,
            padding: '1px 6px',
            borderRadius: 999,
            background: 'rgba(0, 0, 0, 0.52)',
            border: '1px solid rgba(243, 206, 104, 0.55)',
            color: '#FFE27A',
            fontSize: compact ? 8.5 : 9,
            fontWeight: 800,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          HSD {expiryDateLabel}
        </div>
      )}

      {/* Shortened CV Bonus Badge under Laurel Wreath: 150 Feather */}
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
          <span className="inline-flex items-center gap-0.5">
            +{Math.round(cvBonus / 1000)}
            <FeatherSvg className="w-2.5 h-2.5 text-emerald-300" />
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Diagonal Eye Lash Icon matching the physical membership card columns
 */
export function LashVolumeIcon({ active }: { active?: boolean }) {
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
