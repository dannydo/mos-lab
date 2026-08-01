import React from 'react';
import { CalendarOutlined } from '@ant-design/icons';

interface CalendarPlusIconProps {
  fontSize?: number | string;
  className?: string;
  style?: React.CSSProperties;
  badgeBg?: string;
  badgeColor?: string;
}

export const CalendarPlusIcon: React.FC<CalendarPlusIconProps> = ({
  fontSize = 16,
  className = '',
  style,
  badgeBg = '#10B981',
  badgeColor = '#FFFFFF',
}) => {
  const sizeNum = typeof fontSize === 'number' ? fontSize : parseInt(String(fontSize), 10) || 16;
  const badgeSize = Math.max(11, Math.round(sizeNum * 0.65));

  return (
    <span
      className={`relative inline-flex items-center justify-center leading-none ${className}`}
      style={{
        width: `${sizeNum}px`,
        height: `${sizeNum}px`,
        verticalAlign: '-0.125em',
        ...style,
      }}
    >
      <CalendarOutlined style={{ fontSize: `${sizeNum}px` }} />
      <svg
        width={badgeSize}
        height={badgeSize}
        viewBox="0 0 12 12"
        style={{
          position: 'absolute',
          bottom: '-3px',
          right: '-4px',
          overflow: 'visible',
        }}
      >
        <circle cx="6" cy="6" r="5.5" fill={badgeBg} stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
        <path d="M6 2.8v6.4M2.8 6h6.4" stroke={badgeColor} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
};

export default CalendarPlusIcon;
