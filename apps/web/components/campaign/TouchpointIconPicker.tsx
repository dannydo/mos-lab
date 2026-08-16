'use client';

import React, { useState } from 'react';
import { theme } from 'antd';
import { IconPickerModal } from '../IconPickerModal';
import { getAntdIconComponent, getDynamicLucideIcon, getCustomIconComponent } from '../IconSystem';
import {
  BedDouble,
  Bell,
  Calendar,
  Clock,
  Handshake,
  Heart,
  MessageCircle,
  Smile,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

const STANDARD_TOUCHPOINT_ICONS: Record<string, LucideIcon> = {
  smile: Smile,
  handshake: Handshake,
  heart: Heart,
  beddouble: BedDouble,
  sparkles: Sparkles,
  calendar: Calendar,
  clock: Clock,
  bell: Bell,
  userplus: UserPlus,
  messagecircle: MessageCircle,
};

export const getIconComponent = (keyOrEmoji?: string): React.ReactNode => {
  if (!keyOrEmoji) return <Smile size={16} className="text-amber-400" />;

  const str = keyOrEmoji.trim();
  const normalizedName = str
    .replace(/^lucide:/i, '')
    .replace(/(?:outlined|icon)$/i, '')
    .replace(/[\s_-]/g, '')
    .toLowerCase();

  // Some established campaigns persist their touchpoint icon as an emoji,
  // not as a Lucide/Ant Design icon name. Render it before trying the icon
  // registries: a deferred loader for an emoji name resolves to no component.
  if (normalizedName === 'kiss') {
    return (
      <span aria-hidden="true" className="text-sm">
        😚
      </span>
    );
  }

  if (/\p{Extended_Pictographic}/u.test(str)) {
    return (
      <span aria-hidden="true" className="text-sm leading-none">
        {str}
      </span>
    );
  }

  // Campaign touchpoints appear in dense table headers. These known icons
  // must render synchronously rather than waiting through nested dynamic
  // imports, which leaves headers visually blank during (and after) hydration.
  const StandardIcon = STANDARD_TOUCHPOINT_ICONS[normalizedName];
  if (StandardIcon) {
    return <StandardIcon aria-hidden="true" size={16} strokeWidth={2} />;
  }

  // 1. Antd Icon (e.g. AndroidOutlined, SmileOutlined)
  const AntdComp = getAntdIconComponent(str);
  if (AntdComp) {
    return React.createElement(AntdComp, { style: { fontSize: '15px' } });
  }

  // 2. Lucide Icon with prefix lucide: (e.g. lucide:android, lucide:user)
  if (str.startsWith('lucide:')) {
    const lucideName = str.slice(7);
    const LucideComp = getDynamicLucideIcon(lucideName);
    if (LucideComp) {
      return React.createElement(LucideComp, { size: 16 });
    }
  }

  // 3. Lucide Icon without prefix (e.g. Smile, Handshake, Heart, BedDouble, Sparkles)
  const DirectLucideComp = getDynamicLucideIcon(str);
  if (DirectLucideComp) {
    return React.createElement(DirectLucideComp, { size: 16 });
  }

  // 4. Custom Icon (e.g. custom:eyelashes)
  if (str.startsWith('custom:')) {
    return getCustomIconComponent(str, { size: 16 });
  }

  // 5. Fallback to raw Emoji or Text
  return <span className="text-sm">{str}</span>;
};

interface TouchpointIconPickerProps {
  value?: string;
  onChange?: (val: string) => void;
  size?: 'small' | 'middle' | 'large';
  className?: string;
}

export const TouchpointIconPicker: React.FC<TouchpointIconPickerProps> = ({
  value = 'Smile',
  onChange,
  size = 'small',
  className = '',
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer === '#141414' || token.colorBgContainer === '#1f1f1f';

  const iconDisplayNode = getIconComponent(value);
  const displayLabel = value
    ? value.replace('lucide:', '').replace('Outlined', '').replace('custom:', '')
    : 'Chọn icon';

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`flex items-center justify-between px-2.5 py-1 rounded-lg border cursor-pointer select-none transition-all hover:border-amber-400 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
        } ${className}`}
        style={{ height: size === 'small' ? '26px' : '32px' }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="flex items-center justify-center shrink-0">{iconDisplayNode}</span>
          <span className="text-xs font-medium truncate max-w-[90px]">{displayLabel}</span>
        </div>
        <span className="text-[10px] text-slate-400 ml-1">▼</span>
      </div>

      <IconPickerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(iconName) => {
          onChange?.(iconName);
        }}
        value={value}
      />
    </>
  );
};
