'use client';

import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface CcAvatarProps {
  name?: string;
  src?: string | null;
  size?: number;
  isSelected?: boolean;
  className?: string;
}

export default function CcAvatar({ name = '', src, size = 36, isSelected, className = '' }: CcAvatarProps) {
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  let formattedSrc: string | undefined = undefined;
  if (src && src.trim()) {
    let s = src.trim();
    s = s.replace(/^https?:\/\/(s|api)\.wingslashes\.com/, 'https://cdn.wingslashes.com');
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) {
      formattedSrc = s;
    } else {
      formattedSrc = s.startsWith('/') ? `https://cdn.wingslashes.com${s}` : `https://cdn.wingslashes.com/${s}`;
    }
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform ${isSelected ? 'scale-105' : ''} ${className}`}
    >
      <Avatar
        src={formattedSrc}
        size={size}
        style={{
          backgroundColor: isSelected ? '#f59e0b' : formattedSrc ? undefined : 'rgba(245, 158, 11, 0.15)',
          color: isSelected ? '#000000' : '#f59e0b',
          fontWeight: 'bold',
          border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.25)',
          boxShadow: isSelected ? '0 0 10px rgba(245, 158, 11, 0.4)' : undefined,
        }}
        icon={!formattedSrc && !name ? <UserOutlined /> : undefined}
        className="font-bold text-xs flex items-center justify-center cursor-pointer select-none"
      >
        {!formattedSrc && initial}
      </Avatar>
    </div>
  );
}
