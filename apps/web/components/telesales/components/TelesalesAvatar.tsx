'use client';

import React from 'react';

interface TelesalesAvatarProps {
  member?: SafeAny;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  className?: string;
}

export const TelesalesAvatar: React.FC<TelesalesAvatarProps> = ({ member, size = 'md', className = '' }) => {
  if (!member) return null;

  let sizeClass = 'w-8 h-8 text-[10px]';
  if (size === 'lg') sizeClass = 'w-12 h-12 text-lg';
  if (size === 'sm') sizeClass = 'w-7 h-7 text-xs';

  const rawUrl = member.avatarUrl || member.avatar;
  const avatarSrc = rawUrl
    ? rawUrl.startsWith('http') || rawUrl.startsWith('data:')
      ? rawUrl
      : `https://api.wingslashes.com${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`
    : undefined;

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm overflow-hidden relative shrink-0 ${className}`}
      style={{ background: member.gradient }}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={member.name || ''}
          className="w-full h-full object-cover relative z-10"
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
