'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import dynamicIconImports from 'lucide-react/dynamicIconImports';

// Antd Icons whitelist to avoid importing all of them
import {
  OrderedListOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  ShopOutlined,
  GiftOutlined,
  MessageOutlined,
  SolutionOutlined,
  InfoCircleOutlined,
  StarOutlined,
  TagOutlined,
  HeartOutlined,
  SettingOutlined,
  ClusterOutlined,
  ShareAltOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
} from '@ant-design/icons';

export interface IconProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

// Custom SVG Icons
export const LipsIcon: React.FC<IconProps> = ({ size = 14, style, className }) => {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 48 48',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '4',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style,
      className,
    },
    React.createElement('path', {
      d: 'M4 24s6-9 10-9s8 2 10 2s6-2 10-2s10 9 10 9s-10 10-20 10S4 24 4 24m0 0h40',
    })
  );
};

export const EyeLashesIcon: React.FC<IconProps> = ({ size = 14, style, className }) => {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 48 48',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '4',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style,
      className,
    },
    React.createElement('path', {
      d: 'M24 41c9.941 0 18-8.322 18-14s-8.059-14-18-14S6 21.328 6 27s8.059 14 18 14Z',
    }),
    React.createElement('path', {
      d: 'M24 33a6 6 0 1 0 0-12a6 6 0 0 0 0 12Z',
    }),
    React.createElement('circle', {
      cx: 24,
      cy: 27,
      r: 3.5,
      fill: 'currentColor',
    }),
    React.createElement('path', { d: 'M 22 14 L 24 8' }),
    React.createElement('path', { d: 'M 26.5 15 L 30 8' }),
    React.createElement('path', { d: 'M 31 17 L 36 9.5' }),
    React.createElement('path', { d: 'M 35 20 L 41.5 12.5' }),
    React.createElement('path', { d: 'M 38.5 24.5 L 46 17' })
  );
};

export const EyelashesBlueIcon: React.FC<IconProps> = ({ size = 14, style, className }) => {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 80 80',
      fill: 'none',
      strokeWidth: '4',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style,
      className,
    },
    React.createElement('path', {
      d: 'M9.316 28c0 2.101.802 4.182 2.36 6.123s3.841 3.705 6.72 5.19s6.296 2.665 10.057 3.47c3.76.803 7.792 1.217 11.863 1.217s8.102-.414 11.863-1.218s7.179-1.983 10.057-3.468c2.879-1.486 5.162-3.25 6.72-5.191s2.36-4.022 2.36-6.123',
      stroke: '#40a9ff',
    }),
    React.createElement('path', {
      d: 'M10.195 31.783L4 37.104l.001.002l6.196-5.319zm4.027 14.375h.002l4.373-6.74l-.004-.003zm12.836 4.506h.002l2.283-7.7h-.005zM40.317 52l.002-8h-.006l.002 8zm13.255-1.335h.002l-2.28-7.701h-.005zm12.836-4.506l.002-.001l-4.37-6.743l-.005.002zm10.222-9.052l.002-.002l-6.195-5.322l-.002.005z',
      stroke: 'currentColor',
    })
  );
};

export const MascaraBrushIcon: React.FC<IconProps> = ({ size = 14, style, className }) => {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 80 80',
      fill: 'none',
      strokeWidth: '4',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style,
      className,
    },
    React.createElement('path', {
      d: 'M9.316 28c0 2.101.802 4.182 2.36 6.123s3.841 3.705 6.72 5.19s6.296 2.665 10.057 3.47c3.76.803 7.792 1.217 11.863 1.217s8.102-.414 11.863-1.218s7.179-1.983 10.057-3.468c2.879-1.486 5.162-3.25 6.72-5.191s2.36-4.022 2.36-6.123',
      stroke: 'currentColor',
    }),
    React.createElement('path', {
      d: 'M10.195 31.783L4 37.104l.001.002l6.196-5.319zm4.027 14.375h.002l4.373-6.74l-.004-.003zm12.836 4.506h.002l2.283-7.7h-.005zM40.317 52l.002-8h-.006l.002 8zm13.255-1.335h.002l-2.28-7.701h-.005zm12.836-4.506l.002-.001l-4.37-6.743l-.005.002zm10.222-9.052l.002-.002l-6.195-5.322l-.002.005z',
      stroke: 'currentColor',
    }),
    React.createElement('rect', {
      x: 58,
      y: 12,
      width: 18,
      height: 8,
      rx: 2,
      fill: 'currentColor',
    }),
    React.createElement('line', {
      x1: 58,
      y1: 16,
      x2: 48,
      y2: 16,
      stroke: 'currentColor',
      strokeWidth: 3,
    }),
    React.createElement('line', {
      x1: 48,
      y1: 16,
      x2: 10,
      y2: 16,
      stroke: 'currentColor',
      strokeWidth: 4,
    }),
    ...[14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44].map((x, index) => {
      const dist = Math.abs(x - 29);
      const halfHeight = Math.max(3, 8 - dist * 0.3);
      return React.createElement('line', {
        key: index,
        x1: x,
        y1: 16 - halfHeight,
        x2: x,
        y2: 16 + halfHeight,
        stroke: 'currentColor',
        strokeWidth: 2,
      });
    })
  );
};

export const getCustomIconComponent = (name: string, props?: IconProps): React.ReactElement | null => {
  if (name === 'custom:lips') return React.createElement(LipsIcon, props);
  if (name === 'custom:eye-lashes') return React.createElement(EyeLashesIcon, props);
  if (name === 'custom:eyelashes-blue') return React.createElement(EyelashesBlueIcon, props);
  if (name === 'custom:mascara-brush') return React.createElement(MascaraBrushIcon, props);
  return null;
};

const lucideComponentsCache: Record<string, React.ComponentType<any>> = {};

export const getDynamicLucideIcon = (name: string): React.ComponentType<any> | null => {
  const importFn = (dynamicIconImports as any)[name];
  if (!importFn) return null;

  if (!lucideComponentsCache[name]) {
    lucideComponentsCache[name] = dynamic(importFn, {
      ssr: false,
      loading: () =>
        React.createElement('span', {
          style: { display: 'inline-block', width: '14px', height: '14px', marginRight: '6px' },
        }),
    });
  }

  return lucideComponentsCache[name];
};

// Ant Design Icons whitelist mapping
const ANTD_ICON_MAP: Record<string, React.ComponentType<any>> = {
  OrderedListOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  ShopOutlined,
  GiftOutlined,
  MessageOutlined,
  SolutionOutlined,
  InfoCircleOutlined,
  StarOutlined,
  TagOutlined,
  HeartOutlined,
  SettingOutlined,
  ClusterOutlined,
  ShareAltOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
};

export const getAntdIconComponent = (name: string): React.ComponentType<any> | null => {
  return ANTD_ICON_MAP[name] || null;
};

// List of custom icons
export const CUSTOM_ICONS = ['custom:lips', 'custom:eye-lashes', 'custom:eyelashes-blue', 'custom:mascara-brush'];

export const AVAILABLE_ICONS = [
  { value: '', label: 'Mặc định (Auto)' },
  { value: 'custom:lips', label: 'Lips (Đôi môi)' },
  { value: 'custom:eye-lashes', label: 'Eye & Lashes (Mắt)' },
  { value: 'custom:eyelashes-blue', label: 'Eyelashes Blue (Mắt nước)' },
  { value: 'custom:mascara-brush', label: 'Mascara (Mascara)' },
  { value: 'UserOutlined', label: 'User (Cá nhân)' },
  { value: 'TeamOutlined', label: 'Team (Nhóm)' },
  { value: 'PhoneOutlined', label: 'Phone (Điện thoại)' },
  { value: 'CalendarOutlined', label: 'Calendar (Lịch hẹn)' },
  { value: 'ClockCircleOutlined', label: 'Clock (Giờ giấc)' },
  { value: 'ShopOutlined', label: 'Shop (Chi nhánh)' },
  { value: 'GiftOutlined', label: 'Gift (Khuyến mãi)' },
  { value: 'MessageOutlined', label: 'Message (Ghi chú)' },
  { value: 'SolutionOutlined', label: 'CV/Nhân viên' },
  { value: 'InfoCircleOutlined', label: 'Info (Trạng thái)' },
  { value: 'StarOutlined', label: 'Star (Sao)' },
  { value: 'TagOutlined', label: 'Tag (Nhãn)' },
  { value: 'HeartOutlined', label: 'Heart (Yêu thích)' },
  { value: 'SettingOutlined', label: 'Settings (Hành động)' },
  { value: 'none', label: 'Không có icon' },
];

export const getDefaultIcon = (key: string): string => {
  const k = key.toLowerCase();
  if (k.includes('index') || k === 'stt') return 'OrderedListOutlined';
  if (k.includes('time') || k.includes('date') || k === 'bookingdatetime') return 'CalendarOutlined';
  if (k.includes('create')) return 'ClockCircleOutlined';
  if (k.includes('booker')) return 'UserOutlined';
  if (k.includes('customer') || k === 'client') return 'UserOutlined';
  if (k.includes('phone') || k === 'sđt') return 'PhoneOutlined';
  if (k.includes('branch') || k === 'chinhanh') return 'ShopOutlined';
  if (k.includes('group') || k === 'nhom') return 'ClusterOutlined';
  if (k.includes('channel')) return 'ShareAltOutlined';
  if (k.includes('promo')) return 'GiftOutlined';
  if (k.includes('cv')) return 'SolutionOutlined';
  if (k.includes('note') || k.includes('notes')) return 'MessageOutlined';
  if (k.includes('status') || k.includes('trangthai')) return 'InfoCircleOutlined';
  if (k.includes('action')) return 'SettingOutlined';
  if (k === 'cc') return 'CustomerServiceOutlined';
  return '';
};

// Render helper dynamically selects and displays icon
export const renderIconHelper = (iconName: string): React.ReactElement | null => {
  if (!iconName || iconName === 'none') return null;

  if (iconName.startsWith('custom:')) {
    return getCustomIconComponent(iconName, {
      style: {
        marginRight: '6px',
        display: 'inline-block',
        verticalAlign: 'middle',
      },
    });
  }

  if (iconName.startsWith('lucide:')) {
    const name = iconName.slice(7);
    const IconComponent = getDynamicLucideIcon(name);
    return IconComponent
      ? React.createElement(IconComponent, {
          style: {
            marginRight: '6px',
            width: '14px',
            height: '14px',
            display: 'inline-block',
            verticalAlign: 'middle',
          },
        })
      : null;
  }

  const IconComponent = getAntdIconComponent(iconName);
  return IconComponent ? React.createElement(IconComponent, { style: { marginRight: '6px' } }) : null;
};
