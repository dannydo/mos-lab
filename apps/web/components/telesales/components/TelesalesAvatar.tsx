'use client';

import React from 'react';

interface TelesalesAvatarProps {
  member?: SafeAny;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  className?: string;
}

export function formatAvatarUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;
  let clean = url.trim();
  clean = clean.replace(/^(https?:\/\/)?(s|api|cdn)\.wingslashes\.com\/?/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://') && !clean.startsWith('data:')) {
    clean = `https://cdn.wingslashes.com/${clean.replace(/^\/+/, '')}`;
  }
  return clean;
}

export const TelesalesAvatar: React.FC<TelesalesAvatarProps> = ({ member, size = 'md', className = '' }) => {
  if (!member) return null;

  let sizePx = 32;
  let fontSizePx = 10;
  let sizeClass = 'w-8 h-8 text-[10px]';
  if (size === 'lg') {
    sizePx = 48;
    fontSizePx = 18;
    sizeClass = 'w-12 h-12 text-lg';
  }
  if (size === 'sm') {
    sizePx = 28;
    fontSizePx = 12;
    sizeClass = 'w-7 h-7 text-xs';
  }

  const avatarSrc = formatAvatarUrl(member.avatarUrl || member.avatar);

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden relative shrink-0 ${className}`}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        minWidth: `${sizePx}px`,
        minHeight: `${sizePx}px`,
        maxWidth: `${sizePx}px`,
        maxHeight: `${sizePx}px`,
        fontSize: `${fontSizePx}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: member.gradient || '#3b82f6',
        boxSizing: 'border-box',
      }}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={member.name || ''}
          className="w-full h-full object-cover relative z-10"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            display: 'block',
          }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center z-0">{member.initials}</span>
    </div>
  );
};

export default TelesalesAvatar;
