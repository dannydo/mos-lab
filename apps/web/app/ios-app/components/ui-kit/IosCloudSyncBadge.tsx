'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, CloudCheck, CloudOff } from 'lucide-react';

export type IosCloudSyncStatus = 'idle' | 'uploading' | 'synced' | 'offline';

interface IosCloudSyncBadgeProps {
  status: IosCloudSyncStatus;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Minimalist Apple-style Cloud Sync Indicator (SF Symbol Style).
 * - Ultra-thin frosted glass background (Apple Material).
 * - High-visibility micro-animation:
 *   - uploading: Spinning Loader2 (sky-400) + sky-blue ring pulse.
 *   - synced: Crisp CloudCheck (emerald-400) with spring zoom + emerald ring flash.
 *   - offline: CloudOff (amber-400).
 * - Zero clutter: 1 single icon, no text, no emojis.
 */
export function IosCloudSyncBadge({ status, className = '', size = 'md' }: IosCloudSyncBadgeProps) {
  const isSm = size === 'sm';
  const containerSize = isSm ? 'w-6 h-6' : 'w-8 h-8';
  const iconSize = isSm ? 'w-3 h-3' : 'w-4 h-4';

  const [justSynced, setJustSynced] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'synced') {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const effectiveStatus = status === 'idle' ? 'synced' : status;

  const tooltip =
    effectiveStatus === 'uploading'
      ? 'Đang tải ảnh lên Cloud...'
      : effectiveStatus === 'offline'
        ? 'Chờ mạng để đồng bộ Cloud'
        : 'Đã lưu ảnh an toàn lên Cloud';

  return (
    <div
      className={`inline-flex items-center justify-center ${containerSize} rounded-full backdrop-blur-md shadow-md pointer-events-auto select-none transition-all duration-300 ${
        effectiveStatus === 'uploading'
          ? 'bg-black/90 border border-sky-400 ring-2 ring-sky-400/50 shadow-sky-500/30 scale-105'
          : justSynced
            ? 'bg-black/90 border border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30 scale-110'
            : 'bg-black/60 border border-white/20'
      } ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {effectiveStatus === 'uploading' ? (
        <Loader2 className={`${iconSize} text-sky-400 animate-spin`} strokeWidth={2.8} />
      ) : effectiveStatus === 'offline' ? (
        <CloudOff className={`${iconSize} text-amber-400`} strokeWidth={2.4} />
      ) : (
        <CloudCheck
          className={`${iconSize} text-emerald-400 transition-transform duration-300 ${
            justSynced ? 'scale-110 animate-in zoom-in-75' : 'scale-100'
          }`}
          strokeWidth={2.5}
        />
      )}
    </div>
  );
}
