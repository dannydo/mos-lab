'use client';

import React from 'react';
import { NATURAL_LASH_BEZIER, LASH_CURL_LIST, type LashCurlDetail, type Point2D } from './LashCurlData';

interface LashCurlIllustrationProps {
  curl: LashCurlDetail;
  variant?: 'card' | 'zoom';
  isActive?: boolean;
  className?: string;
  showLabels?: boolean;
  isDark?: boolean;
}

/**
 * Evaluate a Cubic Bezier point at parameter t in [0, 1]
 */
function evalCubicPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}

/**
 * Evaluate a Cubic Bezier first derivative (tangent vector) at parameter t in [0, 1]
 */
function evalCubicTangent(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

/**
 * Evaluate point & tangent for either a standard Cubic Bezier curl or the G1-continuous L-curl spline
 */
function sampleCurlSpline(
  curl: {
    p0: Point2D;
    p1: Point2D;
    p2: Point2D;
    p3: Point2D;
    isLForm?: boolean;
    lElbow?: Point2D;
    lCtrl1?: Point2D;
    lCtrl2?: Point2D;
  },
  t: number
): { pt: Point2D; tan: Point2D } {
  if (curl.isLForm && curl.lElbow && curl.lCtrl1 && curl.lCtrl2) {
    const split = 0.36;
    if (t <= split) {
      // Segment 1: Straight bonding base hugging the downward-sloping natural lash
      const u = t / split;
      const midCtrl: Point2D = {
        x: (curl.p0.x + curl.lElbow.x) * 0.5,
        y: (curl.p0.y + curl.lElbow.y) * 0.5 + 0.4,
      };
      return {
        pt: evalCubicPoint(curl.p0, midCtrl, midCtrl, curl.lElbow, u),
        tan: evalCubicTangent(curl.p0, midCtrl, midCtrl, curl.lElbow, u),
      };
    } else {
      // Segment 2: Smooth G1 rounded L-elbow and straight-ish upward lift to needle tip
      const u = (t - split) / (1 - split);
      return {
        pt: evalCubicPoint(curl.lElbow, curl.lCtrl1, curl.lCtrl2, curl.p3, u),
        tan: evalCubicTangent(curl.lElbow, curl.lCtrl1, curl.lCtrl2, curl.p3, u),
      };
    }
  }

  return {
    pt: evalCubicPoint(curl.p0, curl.p1, curl.p2, curl.p3, t),
    tan: evalCubicTangent(curl.p0, curl.p1, curl.p2, curl.p3, t),
  };
}

/**
 * Build a precision normal-offset tapered SVG ribbon path with a razor-sharp needle tip (ngọn nhọn)
 * and authentic slender eyelash thickness-to-length ratio (~1:40).
 */
export function buildTaperedLashRibbon(
  spline: {
    p0: Point2D;
    p1: Point2D;
    p2: Point2D;
    p3: Point2D;
    isLForm?: boolean;
    lElbow?: Point2D;
    lCtrl1?: Point2D;
    lCtrl2?: Point2D;
  },
  halfWidthRoot: number,
  steps = 44
): { ribbonPath: string; spinePath: string } {
  const upperPts: Point2D[] = [];
  const lowerPts: Point2D[] = [];
  const centerPts: Point2D[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const { pt, tan } = sampleCurlSpline(spline, t);
    centerPts.push(pt);

    const len = Math.hypot(tan.x, tan.y) || 1;
    // Unit normal vector pointing "up/inside" the curl
    const nx = tan.y / len;
    const ny = -tan.x / len;

    // Slender anatomical lash profile matching BL Lashes reference:
    // - Smooth root taper (0..0.08)
    // - Sleek, clearly visible shaft through the belly and curl (0.08..0.80)
    // - Razor-sharp needle point taper (ngọn nhọn) at the tip (t -> 1.0)
    let profile: number;
    if (t < 0.08) {
      profile = 0.65 + 0.35 * (t / 0.08);
    } else {
      const rem = (t - 0.08) / 0.92;
      profile = Math.pow(1 - rem, 0.78);
    }

    const w = halfWidthRoot * profile;

    upperPts.push({
      x: pt.x + nx * w,
      y: pt.y + ny * w,
    });
    lowerPts.push({
      x: pt.x - nx * w,
      y: pt.y - ny * w,
    });
  }

  const tip = centerPts[centerPts.length - 1];
  const fmt = (p: Point2D) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;

  const upperCmds = upperPts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${fmt(p)}`).join(' ');
  const lowerReversed = [...lowerPts].reverse().slice(1);
  const lowerCmds = lowerReversed.map((p) => `L ${fmt(p)}`).join(' ');

  // Close smoothly around the root base
  const ribbonPath = `${upperCmds} L ${fmt(tip)} ${lowerCmds} Z`;
  const spinePath = centerPts
    .slice(2, -3)
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${fmt(p)}`)
    .join(' ');

  return { ribbonPath, spinePath };
}

/**
 * Multi-curl Superimposed Fan Diagram (Left column of BL Lashes Curl Chart)
 */
export const LashCurlGroupFanIllustration: React.FC<{
  category: 'SUBTLE' | 'DRAMATIC' | 'LIFT UP';
  activeCurlId?: string;
}> = ({ category, activeCurlId }) => {
  const natRibbon = buildTaperedLashRibbon(NATURAL_LASH_BEZIER, 0.72, 36);
  const groupCurls = LASH_CURL_LIST.filter((c) => c.category === category);

  return (
    <svg
      viewBox="6 4 106 70"
      className="w-full h-[68px] overflow-visible select-none pointer-events-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Studio Ivory Canvas Backdrop (Matches BL Lashes Chart) */}
      <rect x="6" y="4" width="106" height="70" rx="8" fill="#FAF7F2" stroke="#E5DCCB" strokeWidth="0.8" />

      {/* Natural Lash Baseline in Warm Mink Brown */}
      <path d={natRibbon.ribbonPath} fill="#9E6B55" opacity="0.98" />
      <text
        x={NATURAL_LASH_BEZIER.p3.x}
        y={NATURAL_LASH_BEZIER.p3.y + 6.5}
        textAnchor="middle"
        fill="#8A5A44"
        fontSize="5.0"
        fontWeight="800"
        letterSpacing="0.03em"
      >
        NATURAL LASH
      </text>

      {/* Overlay all curls in this category */}
      {groupCurls.map((c) => {
        const isCurrent = activeCurlId === c.id;
        const { ribbonPath } = buildTaperedLashRibbon(c, isCurrent ? 1.08 : 0.95, 40);
        return (
          <g key={c.id}>
            <path d={ribbonPath} fill={isCurrent ? '#000000' : '#1E293B'} opacity={isCurrent ? 1 : 0.78} />
            <text
              x={c.p3.x + (c.id === 'D' || c.id === 'LC' ? -4 : c.id === 'LB' ? 0 : 4)}
              y={c.p3.y - 2.5}
              textAnchor="middle"
              fill={isCurrent ? '#D97706' : '#1E293B'}
              fontSize="6.2"
              fontWeight="900"
            >
              {c.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const LashCurlIllustration: React.FC<LashCurlIllustrationProps> = ({
  curl,
  variant = 'card',
  isActive = false,
  className = '',
  showLabels = true,
  isDark = false,
}) => {
  const isZoom = variant === 'zoom';

  // Generate true normal-offset tapered ribbons (identical geometry for card & zoom)
  const natRibbon = buildTaperedLashRibbon(NATURAL_LASH_BEZIER, 0.72, 40);
  const extRibbon = buildTaperedLashRibbon(curl, 1.08, 48);

  // Compute midpoint along the natural lash and extension lash for a subtle angle measurement arc
  const natMid = evalCubicPoint(
    NATURAL_LASH_BEZIER.p0,
    NATURAL_LASH_BEZIER.p1,
    NATURAL_LASH_BEZIER.p2,
    NATURAL_LASH_BEZIER.p3,
    0.78
  );
  const extMid = sampleCurlSpline(curl, 0.76).pt;

  if (!isZoom) {
    // ---------------------------------------------------------------------------
    // 1. COMPACT CARD VARIANT (1:1 BL Lashes Curl Chart proportions)
    // Downward-sloping root + rounded belly + razor-sharp needle tip + Natural lash
    // ---------------------------------------------------------------------------
    return (
      <div className={`w-full flex items-center justify-center relative select-none pointer-events-none ${className}`}>
        <svg
          viewBox="8 5 100 66"
          className="w-full h-[56px] overflow-visible pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`natGrad-card-${curl.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C4D3A" />
              <stop offset="65%" stopColor="#9E6B55" />
              <stop offset="100%" stopColor="#C29580" />
            </linearGradient>
            <linearGradient id={`extGrad-card-${curl.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
              {isDark ? (
                <>
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="65%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#000000" />
                  <stop offset="65%" stopColor="#111827" />
                  <stop offset="100%" stopColor="#09090B" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Subtle Angle Measurement Arc between Natural Lash & Extension Lash */}
          <path
            d={`M ${natMid.x.toFixed(1)} ${natMid.y.toFixed(1)} Q ${(Math.max(natMid.x, extMid.x) + 6).toFixed(1)} ${((natMid.y + extMid.y) * 0.5).toFixed(1)}, ${extMid.x.toFixed(1)} ${extMid.y.toFixed(1)}`}
            stroke={isActive ? '#D97706' : isDark ? '#64748B' : '#94A3B8'}
            strokeWidth="0.65"
            strokeDasharray="1.8 1.8"
            opacity="0.7"
          />

          {/* 1. Natural Lash (Sợi mi thật màu nâu ấm làm nền so sánh chuẩn BL Lashes) */}
          <path d={natRibbon.ribbonPath} fill={`url(#natGrad-card-${curl.id})`} />

          {/* Natural Lash Label */}
          {showLabels && (
            <text
              x={NATURAL_LASH_BEZIER.p3.x + 2}
              y={NATURAL_LASH_BEZIER.p3.y + 6.2}
              textAnchor="end"
              fill={isDark ? '#D4A373' : '#8C5843'}
              fontSize="5.4"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              Mi thật
            </text>
          )}

          {/* 2. Extension Lash (Sợi mi nối đen bóng hoặc ánh bạch kim trên nền tối) */}
          <path
            d={extRibbon.ribbonPath}
            fill={`url(#extGrad-card-${curl.id})`}
            filter={
              isDark ? 'drop-shadow(0 1px 2px rgba(255,255,255,0.15))' : 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.18))'
            }
          />

          {/* Subtle silk sheen along the lower/middle belly */}
          <path
            d={extRibbon.spinePath}
            stroke={isActive ? '#F59E0B' : isDark ? '#94A3B8' : '#64748B'}
            strokeWidth="0.32"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. HIGH-RES ZOOM LIGHTBOX VARIANT
  // Uses the exact same anatomical Bezier coordinate space so aspect ratio & curl
  // curvature are 100% undistorted, enriched with angle protractor & ghost comparison
  // ---------------------------------------------------------------------------
  const ghostCurls = LASH_CURL_LIST.filter((c) => c.category === curl.category && c.id !== curl.id);

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center relative select-none ${className}`}>
      <svg
        viewBox="2 0 124 78"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-[420px] max-h-[340px] overflow-visible drop-shadow-xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={`glow-zoom-${curl.id}`} cx="50%" cy="60%" r="55%">
            <stop offset="0%" stopColor="#FFB400" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#FFB400" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`natGrad-zoom-${curl.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C4A36" />
            <stop offset="55%" stopColor="#9E6B55" />
            <stop offset="100%" stopColor="#C49680" />
          </linearGradient>

          <linearGradient id={`extGrad-zoom-${curl.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="60%" stopColor="#09090B" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
        </defs>

        {/* Studio Ivory Canvas Plate (1:1 BL Lashes Chart Aesthetic for Maximum Lash Contrast) */}
        <rect x="3" y="1" width="122" height="75" rx="10" fill="#FAF7F2" stroke="#E5DCCB" strokeWidth="0.9" />

        {/* Soft Ambient Spotlight */}
        <circle cx="58" cy="42" r="42" fill={`url(#glow-zoom-${curl.id})`} />

        {/* Horizontal Reference Grid Line through Belly Tangent */}
        <line x1="10" y1="61.8" x2="116" y2="61.8" stroke="#CBD5E1" strokeWidth="0.45" strokeDasharray="2 2" />

        {/* Faint Ghost Curls in the Same Category for Instant Curvature Comparison */}
        {ghostCurls.map((gc) => {
          const ghostRibbon = buildTaperedLashRibbon(gc, 0.85, 36);
          return (
            <g key={gc.id} opacity="0.18">
              <path d={ghostRibbon.ribbonPath} fill="#334155" />
              <text x={gc.p3.x} y={gc.p3.y - 2} textAnchor="middle" fill="#475569" fontSize="4.2" fontWeight="700">
                {gc.code}
              </text>
            </g>
          );
        })}

        {/* Angle Protractor Sector between Natural Lash and Extension Lash */}
        <path
          d={`M ${natMid.x.toFixed(1)} ${natMid.y.toFixed(1)} Q ${(Math.max(natMid.x, extMid.x) + 8).toFixed(1)} ${((natMid.y + extMid.y) * 0.5).toFixed(1)}, ${extMid.x.toFixed(1)} ${extMid.y.toFixed(1)}`}
          stroke="#D97706"
          strokeWidth="0.85"
          strokeDasharray="2 1.5"
        />

        {/* Angle Degree Pill on the Protractor Arc */}
        <g transform={`translate(${Math.max(natMid.x, extMid.x) + 12}, ${(natMid.y + extMid.y) * 0.5})`}>
          <rect x="-10.5" y="-4.8" width="21" height="9.6" rx="3" fill="#FFB400" stroke="#000000" strokeWidth="0.3" />
          <text
            x="0"
            y="1.8"
            textAnchor="middle"
            fill="#000000"
            fontSize="4.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {curl.angleLabel}
          </text>
        </g>

        {/* 1. NATURAL LASH (Sợi Mi Thật màu nâu ấm - Nền so sánh chuẩn BL Lashes) */}
        <path
          d={natRibbon.ribbonPath}
          fill={`url(#natGrad-zoom-${curl.id})`}
          filter="drop-shadow(0 0.8px 1px rgba(124,74,54,0.25))"
        />
        <text
          x={NATURAL_LASH_BEZIER.p3.x}
          y={NATURAL_LASH_BEZIER.p3.y + 6.8}
          textAnchor="middle"
          fill="#8C5843"
          fontSize="4.3"
          fontWeight="800"
          letterSpacing="0.04em"
        >
          NATURAL LASH (MI THẬT)
        </text>

        {/* 2. EXTENSION LASH (Sợi Mi Nối đen tuyền, ngọn nhọn sắc nét 100%, chuẩn độ cong) */}
        <path
          d={extRibbon.ribbonPath}
          fill={`url(#extGrad-zoom-${curl.id})`}
          filter="drop-shadow(0 1.2px 2px rgba(0,0,0,0.28))"
        />

        {/* Silk Spine Sheen */}
        <path d={extRibbon.spinePath} stroke="#64748B" strokeWidth="0.28" strokeLinecap="round" opacity="0.5" />

        {/* Studio Title Badge (Top-Left of Ivory Canvas, never overlapping tip) */}
        <g transform="translate(8, 6)">
          <rect x="0" y="0" width="32" height="8.5" rx="2.8" fill="#111827" />
          <text
            x="16"
            y="5.7"
            textAnchor="middle"
            fill="#FFB400"
            fontSize="4.1"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {curl.code} Curl
          </text>
        </g>

        {/* Root Bonding Zone Annotation (Does NOT cover the root taper) */}
        <text x="10" y="38.5" fill="#64748B" fontSize="3.8" fontWeight="700">
          Gốc mi dán keo
        </text>

        {/* Clean Tip Label right above p3 (Matches BL Lashes Chart, 100% unobstructed needle tip) */}
        <text
          x={curl.p3.x}
          y={Math.max(curl.p3.y - 2.6, 7.5)}
          textAnchor="middle"
          fill="#0F172A"
          fontSize="4.6"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {curl.code}
        </text>
      </svg>
    </div>
  );
};
