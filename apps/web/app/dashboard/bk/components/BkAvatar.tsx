'use client';

import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';

interface BkAvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  isSelected?: boolean;
}

export default function BkAvatar({ name, src, size = 36, isSelected = false }: BkAvatarProps) {
  const { themeMode } = useTheme();

  const getInitials = (fullName: string) => {
    if (!fullName) return 'BK';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const ringStyle = isSelected
    ? 'ring-2 ring-amber-500 ring-offset-2 shadow-md'
    : 'ring-1 ring-slate-200 dark:ring-slate-700';

  if (src) {
    return (
      <Avatar
        src={src}
        size={size}
        className={`transition-all duration-200 ${ringStyle}`}
        style={{ flexShrink: 0 }}
      />
    );
  }

  return (
    <Avatar
      size={size}
      icon={<UserOutlined />}
      className={`transition-all duration-200 ${ringStyle}`}
      style={{
        backgroundColor: themeMode === 'dark' ? '#1e293b' : '#e2e8f0',
        color: themeMode === 'dark' ? '#94a3b8' : '#475569',
        fontWeight: 600,
        fontSize: size >= 40 ? 16 : 13,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </Avatar>
  );
}
