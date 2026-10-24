'use client';

import React, { useState, useMemo } from 'react';
import type { MosChatStaffMember } from '@mos-lab/shared';
import { resolveStaffAvatarUrl, getAvatarInitials, getAvatarColorPalette } from './utils/chat-helpers';

export type MosChatAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface MosChatAvatarProps {
  src?: string | null;
  name?: string | null;
  staffId?: number | string | null;
  username?: string | null;
  staffDirectory?: MosChatStaffMember[];
  size?: MosChatAvatarSize;
  className?: string;
  shape?: 'circle' | 'square';
  showOnline?: boolean;
  isOnline?: boolean;
  alt?: string;
}

const SIZE_CONFIGS: Record<string, { sizePx: number; textClass: string; dotClass: string }> = {
  xs: { sizePx: 18, textClass: 'text-[9px] font-bold', dotClass: 'w-1.5 h-1.5 border' },
  sm: { sizePx: 24, textClass: 'text-[10px] font-bold', dotClass: 'w-2 h-2 border' },
  md: { sizePx: 32, textClass: 'text-[12px] font-extrabold', dotClass: 'w-2.5 h-2.5 border-[1.5px]' },
  lg: { sizePx: 40, textClass: 'text-[14px] font-extrabold', dotClass: 'w-3 h-3 border-2' },
  xl: { sizePx: 48, textClass: 'text-[16px] font-extrabold', dotClass: 'w-3.5 h-3.5 border-2' },
};

export const MosChatAvatar: React.FC<MosChatAvatarProps> = ({
  src,
  name,
  staffId,
  username,
  staffDirectory,
  size = 'md',
  className = '',
  shape = 'circle',
  showOnline = false,
  isOnline = false,
  alt,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  // Determine size in pixels & classes
  const config = useMemo(() => {
    if (typeof size === 'number') {
      const fontSize = Math.max(9, Math.round(size * 0.38));
      return {
        sizePx: size,
        textClass: `text-[${fontSize}px] font-extrabold`,
        dotClass: 'w-2.5 h-2.5 border-[1.5px]',
      };
    }
    return SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  }, [size]);

  // Resolve final avatar URL
  const resolvedUrl = useMemo(() => {
    return resolveStaffAvatarUrl({
      staffId,
      name,
      username,
      rawAvatar: src,
      staffDirectory,
    });
  }, [src, name, staffId, username, staffDirectory]);

  // Initials & Color Palette
  const initials = useMemo(() => getAvatarInitials(name), [name]);
  const palette = useMemo(() => getAvatarColorPalette(name), [name]);

  const roundedClass = shape === 'square' ? 'rounded-2xl' : 'rounded-full';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: `${config.sizePx}px`,
        height: `${config.sizePx}px`,
        minWidth: `${config.sizePx}px`,
        minHeight: `${config.sizePx}px`,
      }}
    >
      {resolvedUrl && !imgError ? (
        <img
          src={resolvedUrl}
          alt={alt || name || 'Avatar'}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${roundedClass} shadow-sm border border-white/10`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-tr ${palette.bg} ${palette.border} border flex items-center justify-center ${palette.text} ${roundedClass} shadow-sm uppercase tracking-tight ${config.textClass}`}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      {showOnline && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${config.dotClass} rounded-full border-slate-950 shadow-sm ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-500'
          }`}
          title={isOnline ? 'Đang hoạt động' : 'Offline'}
        />
      )}
    </div>
  );
};
