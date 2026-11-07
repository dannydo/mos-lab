'use client';

import React from 'react';

export interface ComboSessionBadgeProps {
  normalRemaining?: number;
  retainRemaining?: number;
  remainingSessions?: number;
  comboName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'badge' | 'inline' | 'expanded';
  showZeroRetain?: boolean;
  theme?: 'dark' | 'light';
}

export function formatComboSessionUnicode(
  normal?: number,
  retain?: number,
  total?: number,
  _showZeroRetain = true
): { normalCount: number; retainCount: number; displayStr: string; isZeroNew: boolean; hasRetain: boolean } {
  let normalCount = 0;
  let retainCount = 0;

  if (normal !== undefined && retain !== undefined) {
    normalCount = Number(normal) || 0;
    retainCount = Number(retain) || 0;
  } else if (total !== undefined) {
    const t = Number(total) || 0;
    normalCount = Math.max(0, Math.floor(t / 2));
    retainCount = Math.max(0, t - normalCount);
  }

  const isZeroNew = normalCount === 0 && retainCount > 0;
  // The Pair Invariant: Wings combo luôn luôn đi theo bộ đầy đủ [✦ Nối · ↻ Dặm]
  // Kể cả khi số lượng = 0 vẫn hiển thị rõ ràng số 0 để Chuyên Viên không phải phỏng đoán
  const hasRetain = true;

  const displayStr = `✦ ${normalCount} · ↻ ${retainCount}`;

  return { normalCount, retainCount, displayStr, isZeroNew, hasRetain };
}

export function ComboSessionBadge({
  normalRemaining,
  retainRemaining,
  remainingSessions,
  comboName,
  className = '',
  size = 'xs',
  variant = 'badge',
  showZeroRetain = false,
  theme = 'dark',
}: ComboSessionBadgeProps) {
  const { normalCount, retainCount, isZeroNew, hasRetain } = formatComboSessionUnicode(
    normalRemaining,
    retainRemaining,
    remainingSessions,
    showZeroRetain
  );

  const total = normalCount + retainCount;
  if (total <= 0) return null;

  const sizeClass =
    size === 'xs' ? 'text-[11px] px-2 py-0.5' : size === 'sm' ? 'text-[12px] px-2.5 py-0.5' : 'text-[13px] px-3 py-1';

  // Badge Container Styling: ALWAYS SOLID OPAQUE for maximum readability & high contrast
  const isLowBalance = total <= 2;

  let badgeBg = '';
  if (theme === 'light') {
    if (isZeroNew) {
      badgeBg = 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs';
    } else if (isLowBalance) {
      badgeBg = 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs';
    } else {
      badgeBg = 'bg-neutral-100 border-neutral-300 text-neutral-900 shadow-xs';
    }
  } else {
    // Dark Theme (Solid #18181B Capsule - Dynamic Island style)
    if (isZeroNew) {
      badgeBg = 'bg-[#18181B] border-rose-500/80 text-rose-300 shadow-xs ring-1 ring-rose-500/30';
    } else if (isLowBalance) {
      badgeBg = 'bg-[#18181B] border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40';
    } else {
      badgeBg = 'bg-[#18181B] border-neutral-700/80 text-neutral-200 shadow-xs';
    }
  }

  // Text Color Styling: High Contrast
  // The Pair Invariant: Ký hiệu số 0 luôn có màu xám trung tính (text-neutral-500 font-bold)
  // Số > 0 luôn có màu sắc nhận diện đặc trưng (✦ Vàng Amber / ↻ Xanh Cyan)
  const normalTextColor =
    normalCount === 0
      ? theme === 'light'
        ? 'text-neutral-400 font-bold'
        : 'text-neutral-500 font-bold'
      : theme === 'light'
        ? 'text-amber-950 font-black'
        : 'text-amber-400 font-black';

  const retainTextColor =
    retainCount === 0
      ? theme === 'light'
        ? 'text-neutral-400 font-bold'
        : 'text-neutral-500 font-bold'
      : theme === 'light'
        ? 'text-sky-800 font-black'
        : 'text-cyan-400 font-black';

  const dotColor = theme === 'light' ? 'text-neutral-400 font-bold' : 'text-neutral-500 font-bold';

  if (variant === 'expanded') {
    return (
      <span
        title={comboName || 'Gói ❖ Mi'}
        className={`inline-flex items-center gap-1.5 rounded-full font-black border tabular-nums select-none ${badgeBg} ${sizeClass} ${className}`}
      >
        <span className={normalTextColor}>✦ {normalCount} Nối</span>
        <span className={dotColor}>·</span>
        <span className={retainTextColor}>↻ {retainCount} Dặm</span>
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        title={comboName || 'Gói ❖ Mi'}
        className={`inline-flex items-center gap-1 font-black tabular-nums select-none ${className}`}
      >
        <span className={normalTextColor}>✦ {normalCount}</span>
        <span className={dotColor}>·</span>
        <span className={retainTextColor}>↻ {retainCount}</span>
      </span>
    );
  }

  return (
    <span
      title={comboName || 'Gói ❖ Mi'}
      className={`inline-flex items-center gap-1 rounded-full font-black border tabular-nums select-none ${badgeBg} ${sizeClass} ${className}`}
    >
      <span className={normalTextColor}>✦ {normalCount}</span>
      <span className={dotColor}>·</span>
      <span className={retainTextColor}>↻ {retainCount}</span>
    </span>
  );
}
