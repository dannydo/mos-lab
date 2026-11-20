'use client';

import React from 'react';
import {
  isCvRole,
  type WingsGardenCategory,
  type WingsGardenChestKind,
  type WingsGardenWingTier,
} from '@mos-lab/shared';
import { Lock } from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge, FeatherSvg } from '../../ios-app/components/ui-kit/CvFeatherLabels';

export { CvFeather1Badge, CvFeather2Badge, FeatherSvg };

export function HeavenIslandSvg({
  islandName,
  wingTierObj,
  wingTier,
  darkCloudCount,
}: {
  islandName: string;
  wingTierObj: WingsGardenWingTier | null;
  wingTier: number;
  darkCloudCount: number;
}) {
  const wPrim = wingTierObj?.primaryColor || '#e2e8f0';
  const wAcc = wingTierObj?.accentColor || '#94a3b8';
  const wingScale = wingTierObj ? 0.85 + wingTierObj.tier * 0.08 : 0.6;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-200/70 shadow-md bg-gradient-to-b from-sky-300/35 via-white/30 to-amber-100/50 p-2">
      <svg className="w-full h-44" viewBox="0 0 360 175" role="img" aria-label={`Đảo Thiên Đường ${islandName}`}>
        <defs>
          <radialGradient id="wgSunHalo" cx="50%" cy="24%" r="48%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wgTerraceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
        </defs>

        <circle cx="180" cy="40" r="88" fill="url(#wgSunHalo)" />
        <circle cx="180" cy="34" r="18" fill="#fef08a" opacity="0.9" />

        {/* Drifting Fluffy Clouds */}
        <g className="wg-anim-cloud" opacity="0.92">
          <ellipse cx="52" cy="40" rx="26" ry="11" fill="#ffffff" />
          <circle cx="42" cy="34" r="11" fill="#ffffff" />
          <circle cx="58" cy="33" r="13" fill="#ffffff" />
        </g>
        <g className="wg-anim-cloud-rev" opacity="0.9">
          <ellipse cx="304" cy="46" rx="28" ry="11" fill="#ffffff" />
          <circle cx="294" cy="39" r="12" fill="#ffffff" />
          <circle cx="312" cy="40" r="10" fill="#ffffff" />
        </g>

        {darkCloudCount > 0 && (
          <g className="wg-anim-cloud-rev">
            <ellipse cx="292" cy="24" rx="26" ry="10" fill="#475569" />
            <circle cx="282" cy="19" r="10" fill="#64748b" />
            <circle cx="298" cy="18" r="11" fill="#475569" />
            <path d="M290 30l-4 8h5l-3 7" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        )}

        {/* Airship Supply Courier */}
        <g className="wg-anim-airship">
          <ellipse cx="64" cy="76" rx="20" ry="11" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <path d="M52 76h24" stroke="#fef3c7" strokeWidth="2" />
          <rect x="57" y="90" width="14" height="7" rx="2" fill="#78350f" />
        </g>

        {/* Floating Celestial Island + Evolving Crafted Wings */}
        <g className="wg-anim-island">
          <path d="M62 126 L180 164 L298 126 Z" fill="#d97706" opacity="0.85" />
          <path d="M84 126 L180 156 L276 126 Z" fill="#f59e0b" />
          <ellipse cx="180" cy="122" rx="126" ry="26" fill="url(#wgTerraceGrad)" stroke="#f59e0b" strokeWidth="2" />
          <ellipse cx="180" cy="120" rx="112" ry="20" fill="#ecfdf5" opacity="0.92" />

          {/* Evolving Crafted Wings */}
          <g className="wg-anim-wing" transform={`translate(180, 74) scale(${wingScale})`}>
            <path
              d="M-12 10 C-42 -18, -74 -12, -82 8 C-62 8, -48 16, -54 26 C-34 22, -22 24, -12 18 Z"
              fill={wPrim}
              stroke={wAcc}
              strokeWidth="2"
              opacity={wingTierObj ? 0.96 : 0.42}
            />
            <path d="M-16 14 C-38 -2, -56 2, -62 14" stroke={wAcc} strokeWidth="1.5" fill="none" />
            <path
              d="M12 10 C42 -18, 74 -12, 82 8 C62 8, 48 16, 54 26 C34 22, 22 24, 12 18 Z"
              fill={wPrim}
              stroke={wAcc}
              strokeWidth="2"
              opacity={wingTierObj ? 0.96 : 0.42}
            />
            <path d="M16 14 C38 -2, 56 2, 62 14" stroke={wAcc} strokeWidth="1.5" fill="none" />
            {wingTier >= 4 && <circle cx="0" cy="-16" r="7" fill="none" stroke="#fbbf24" strokeWidth="2.4" />}
          </g>

          {/* Golden Marble Archway */}
          <path
            d="M144 112 V74 A36 28 0 0 1 216 74 V112"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M144 112 V74 A36 28 0 0 1 216 74 V112"
            fill="none"
            stroke={wAcc}
            strokeWidth="2"
            strokeLinecap="round"
          />

          <rect x="136" y="102" width="88" height="18" rx="4" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
          <text x="180" y="114" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#b45309">
            THIÊN ĐƯỜNG NỐI LÔNG
          </text>
        </g>
      </svg>
      <div className="flex items-center justify-between px-2 pb-1 text-xs">
        <span className="font-bold text-amber-900">
          {islandName} · {wingTierObj ? wingTierObj.name : 'Chưa kết cánh'}
        </span>
        <span className="text-slate-800 font-semibold tabular-nums">Bậc Cánh {wingTier}/4</span>
      </div>
    </div>
  );
}

export function SupplyIconSvg({
  category,
  skuId,
  isRipe,
  isExpired,
}: {
  category: WingsGardenCategory;
  skuId?: string;
  isRipe?: boolean;
  isExpired?: boolean;
}) {
  const ring = isExpired ? '#ef4444' : isRipe ? '#f59e0b' : '#cbd5e1';

  if (category === 'GLUE') {
    const capColor = skuId === 'keo-xanh' ? '#0284c7' : '#f59e0b';
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#fffbeb" stroke={ring} strokeWidth="2" />
        <path d="M21 10h6l1 6h-8l1-6z" fill={capColor} />
        <rect x="17" y="16" width="14" height="20" rx="4" fill="#1e293b" />
        <rect x="19" y="21" width="10" height="8" rx="1.5" fill="#fef3c7" />
        <circle cx="24" cy="25" r="2" fill={capColor} />
        {isExpired && (
          <path
            d="M19 8c1-2 3-2 4 0M26 7c1-2 3-2 4 0"
            stroke="#ef4444"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
    );
  }

  if (category === 'LASH') {
    const accent = skuId === 'khay-mi-hyper' ? '#8b5cf6' : '#f59e0b';
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#f8fafc" stroke={ring} strokeWidth="2" />
        <rect x="12" y="11" width="24" height="26" rx="3" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="14" y="13" width="20" height="4" rx="1" fill={accent} />
        <path d="M16 21h16M16 25h16M16 29h16M16 33h12" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (category === 'EYEPAD') {
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#ecfeff" stroke={ring} strokeWidth="2" />
        <path d="M12 22c3-5 10-5 12 0-3 4-9 4-12 0z" fill="#38bdf8" />
        <path d="M24 26c3-5 10-5 12 0-3 4-9 4-12 0z" fill="#0ea5e9" />
      </svg>
    );
  }

  if (category === 'SWAB') {
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#eff6ff" stroke={ring} strokeWidth="2" />
        <path d="M17 34l6-18M24 34l3-19M31 34l0-18" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="23" cy="15" r="2" fill="#f8fafc" stroke="#2563eb" strokeWidth="1" />
        <circle cx="27" cy="14" r="2" fill="#f8fafc" stroke="#2563eb" strokeWidth="1" />
        <circle cx="31" cy="15" r="2" fill="#f8fafc" stroke="#2563eb" strokeWidth="1" />
      </svg>
    );
  }

  if (category === 'TAPE') {
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#f0fdf4" stroke={ring} strokeWidth="2" />
        <circle cx="24" cy="24" r="10" fill="#ffffff" stroke="#16a34a" strokeWidth="3.2" />
        <circle cx="24" cy="24" r="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
      </svg>
    );
  }

  if (category === 'HYGIENE') {
    return (
      <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" fill="#fff1f2" stroke={ring} strokeWidth="2" />
        <rect x="20" y="9" width="8" height="6" rx="1.5" fill="#f43f5e" />
        <rect x="17" y="15" width="14" height="22" rx="4" fill="#1e293b" />
        <rect x="19" y="21" width="10" height="9" rx="1.5" fill="#ffe4e6" />
        <circle cx="24" cy="25.5" r="2.3" fill="#e11d48" />
      </svg>
    );
  }

  return (
    <svg className="w-11 h-11 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="#fefce8" stroke={ring} strokeWidth="2" />
      <rect x="14" y="18" width="20" height="16" rx="4" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
      <rect x="16" y="14" width="16" height="5" rx="2" fill="#ffffff" stroke="#b45309" strokeWidth="1.3" />
    </svg>
  );
}

export function ChestIconSvg({ kind, className = 'w-11 h-11' }: { kind: WingsGardenChestKind; className?: string }) {
  const colors =
    kind === 'gold'
      ? { lid: '#fbbf24', body: '#d97706', trim: '#fef08a', lock: '#78350f' }
      : kind === 'silver'
        ? { lid: '#e2e8f0', body: '#94a3b8', trim: '#ffffff', lock: '#1e293b' }
        : { lid: '#d97706', body: '#92400e', trim: '#fdba74', lock: '#451a03' };

  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="19" width="36" height="21" rx="4" fill={colors.body} stroke={colors.lock} strokeWidth="1.8" />
      <path d="M6 21 C6 11, 42 11, 42 21 Z" fill={colors.lid} stroke={colors.lock} strokeWidth="1.8" />
      <rect x="6" y="20" width="36" height="4" fill={colors.trim} opacity="0.9" />
      <rect x="20" y="18" width="8" height="10" rx="2" fill={colors.trim} stroke={colors.lock} strokeWidth="1.5" />
      <circle cx="24" cy="23" r="1.5" fill={colors.lock} />
    </svg>
  );
}

export function switchWingsGardenAccount(): void {
  if (typeof window === 'undefined') return;
  [
    'mos_token',
    'mos_user',
    'mos_omicall_auto_init',
    'mos_original_token',
    'mos_original_user',
    'mos_original_omicall_auto_init',
    'mos_impersonation_audit_id',
  ].forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore storage failure
    }
  });
  window.location.replace(`/login?next=${encodeURIComponent('/wings-garden')}&switch=1`);
}

export function WingsGardenAuthScreen({
  mode,
  checkingSlow,
}: {
  mode: 'checking' | 'forbidden';
  checkingSlow: boolean;
}) {
  if (mode === 'checking') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold opacity-75">Đang mở Thiên Đường Nối Lông...</p>
          {checkingSlow && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={switchWingsGardenAccount}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Đổi tài khoản / Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs font-semibold cursor-pointer"
              >
                Tải lại
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-sm w-full rounded-3xl border border-amber-500/30 bg-[var(--card)] p-6 text-center space-y-3 shadow-xl">
        <Lock className="w-10 h-10 text-amber-500 mx-auto" aria-hidden="true" />
        <h1 className="text-base font-bold">Thiên Đường Nối Lông (Admin-Only)</h1>
        <p className="text-xs opacity-80">
          Nguyên mẫu đang trong giai đoạn kiểm thử nội bộ dành riêng cho Admin theo quy chuẩn bảo mật UI-010.
        </p>
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={switchWingsGardenAccount}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
          >
            Đổi tài khoản / Đăng nhập vai trò khác
          </button>
          <button
            type="button"
            onClick={() => {
              const rawUser = typeof window !== 'undefined' ? window.localStorage.getItem('mos_user') : null;
              const role = rawUser ? (JSON.parse(rawUser)?.role as string) : '';
              window.location.replace(isCvRole(role) ? '/dashboard/cv' : '/dashboard');
            }}
            className="w-full py-2 rounded-xl border border-amber-500/40 text-xs font-semibold cursor-pointer"
          >
            Quay về Trang chính
          </button>
        </div>
      </div>
    </div>
  );
}
