import React from 'react';

interface RocketPlusIconProps {
  fontSize?: number | string;
  className?: string;
  style?: React.CSSProperties;
  badgeBg?: string;
  badgeColor?: string;
}

export const RocketPlusIcon: React.FC<RocketPlusIconProps> = ({
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
      <svg
        width={sizeNum}
        height={sizeNum}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81l-3.79-3.79s-1.1.08-1.79.79z" />
        <path d="M12 15l-3-3 8.5-8.5c1-.9 2.5-.9 3.5 0s.9 2.5 0 3.5L12 15z" />
        <path d="M9 18l-1.5 1.5M15 9l1.5-1.5" />
      </svg>
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

export default RocketPlusIcon;
