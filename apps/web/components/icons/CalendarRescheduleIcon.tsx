import React from 'react';
import { CalendarOutlined } from '@ant-design/icons';

interface CalendarRescheduleIconProps {
  fontSize?: number | string;
  className?: string;
  style?: React.CSSProperties;
  badgeBg?: string;
  badgeColor?: string;
}

export const CalendarRescheduleIcon: React.FC<CalendarRescheduleIconProps> = ({
  fontSize = 16,
  className = '',
  style,
  badgeBg = '#2563EB',
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
        <path
          d="M3.2 4.2h3.6M5.6 2.8l1.6 1.4-1.6 1.4M8.8 7.8H5.2M6.4 9.2L4.8 7.8l1.6-1.4"
          stroke={badgeColor}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
};

export default CalendarRescheduleIcon;
