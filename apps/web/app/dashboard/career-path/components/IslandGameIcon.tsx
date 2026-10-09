import React from 'react';
import { HardHat, Castle, HeartHandshake, Gem, HelpCircle, LucideProps } from 'lucide-react';

/**
 * Biểu tượng Hàng Mi Nàng Thơ (Lash Icon) chuyên biệt chuẩn nét Lucide (2px stroke)
 * Khắc hoạ vòm mí mắt cong thanh thoát cùng các sợi mi cong vút mềm mại đặc trưng ngành Nối Mi Wings.
 */
export const LashIcon: React.FC<LucideProps> = ({ size = 24, strokeWidth = 2, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Vòm mí mắt cong thanh thoát khép hờ */}
    <path d="M2.5 15C5.5 10 9.5 7.5 12 7.5s6.5 2.5 9.5 7.5" />
    {/* Các sợi mi cong vút mềm mại tỏa đều theo dáng mắt */}
    <path d="M5 13.5C4 11 3.5 8.5 2.5 6.5" />
    <path d="M7.8 11.2C7 8.5 6.8 6 6 3.8" />
    <path d="M10.5 9.5C10.2 7 10 4.5 9.8 2" />
    <path d="M13.5 9.5C13.8 7 14 4.5 14.2 2" />
    <path d="M16.2 11.2C17 8.5 17.2 6 18 3.8" />
    <path d="M19 13.5C20 11 20.5 8.5 21.5 6.5" />
  </svg>
);

/**
 * Biểu tượng Cánh Thiên Thần Wings (Angel Wing) chuẩn nét Lucide (2px stroke)
 * side = 'left': Tự động lật đối xứng (-scale-x-100) để gốc cánh ôm vào tâm và lông vũ xòe ra ngoài bên trái.
 * side = 'right': Cánh vươn sang bên phải.
 */
export const AngelWing: React.FC<{
  side?: 'left' | 'right';
  size?: number;
  className?: string;
  strokeWidth?: number;
}> = ({ side = 'right', size = 20, className = '', strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block shrink-0 ${side === 'left' ? '-scale-x-100' : ''} ${className}`}
  >
    <path d="M19 4c-3 0-7 2-10 6-3 4-4 8-4 10 2 0 6-1 9-3 3-2 5-5 5-9v-4z" />
    <path d="M9 10c2-1 5-1.5 7-1.5" />
    <path d="M7 14c2.5-.5 5-1 7-2" />
    <path d="M6 18c2-.5 4-1 6-2" />
  </svg>
);

/**
 * Biểu tượng 1 Cánh Trái (vươn sang bên trái, lật chuẩn) cho Ải 2 (CV+)
 */
export const LeftWingIcon: React.FC<LucideProps> = ({ size = 24, strokeWidth = 2, className = '' }) => (
  <AngelWing
    side="left"
    size={typeof size === 'number' ? size : 24}
    strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : 2}
    className={className}
  />
);

/**
 * Biểu tượng Đôi Cánh Đối Xứng (Trái + Phải) cho Ải 3 (CV++)
 */
export const BothWingsIcon: React.FC<LucideProps> = ({ size = 24, strokeWidth = 2, className = '' }) => {
  const numSize = typeof size === 'number' ? size : 24;
  const singleWingSize = Math.round(numSize * 0.75);
  return (
    <span className={`inline-flex items-center justify-center -space-x-1 ${className}`}>
      <AngelWing side="left" size={singleWingSize} strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : 2} />
      <AngelWing side="right" size={singleWingSize} strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : 2} />
    </span>
  );
};

export type IslandId = 'ktv' | 'cv' | 'cv_plus' | 'cv_plus_plus' | 'fm' | 'cho' | 'boss' | string;

interface IslandGameIconProps {
  islandId: IslandId;
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  className?: string;
}

interface IslandTheme {
  Icon: React.ComponentType<LucideProps>;
  baseBg: string;
  activeBg: string;
  iconColor: string;
  glowColor: string;
  name: string;
}

const ISLAND_THEMES: Record<string, IslandTheme> = {
  ktv: {
    Icon: HardHat,
    baseBg: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
    activeBg:
      'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300 ring-2 ring-amber-500/40 shadow-md shadow-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glowColor: 'shadow-amber-500/30',
    name: 'KTV Thử Việc (Mũ Bảo Hộ Kỹ Thuật)',
  },
  cv: {
    Icon: LashIcon,
    baseBg: 'bg-pink-500/10 border-pink-500/25 text-pink-600 dark:text-pink-400',
    activeBg:
      'bg-pink-500/20 border-pink-500/50 text-pink-600 dark:text-pink-300 ring-2 ring-pink-500/40 shadow-md shadow-pink-500/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
    glowColor: 'shadow-pink-500/30',
    name: 'CV · Dịu Dàng (Hàng Mi Nàng Thơ)',
  },
  cv_plus: {
    Icon: LeftWingIcon,
    baseBg: 'bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400',
    activeBg:
      'bg-purple-500/20 border-purple-500/50 text-purple-600 dark:text-purple-300 ring-2 ring-purple-500/40 shadow-md shadow-purple-500/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    glowColor: 'shadow-purple-500/30',
    name: '🪽 CV · Thanh Lịch (1 Cánh)',
  },
  cv_plus_plus: {
    Icon: BothWingsIcon,
    baseBg: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
    activeBg:
      'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300 ring-2 ring-amber-500/40 shadow-md shadow-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    glowColor: 'shadow-amber-500/30',
    name: '🪽 CV 🪽 · Quí Phái (Đôi Cánh)',
  },
  fm: {
    Icon: Castle,
    baseBg: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
    activeBg:
      'bg-sky-500/20 border-sky-500/50 text-sky-600 dark:text-sky-300 ring-2 ring-sky-500/40 shadow-md shadow-sky-500/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    glowColor: 'shadow-sky-500/30',
    name: 'FM Thành Trì Vận Hành',
  },
  cho: {
    Icon: HeartHandshake,
    baseBg: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400',
    activeBg:
      'bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-300 ring-2 ring-rose-500/40 shadow-md shadow-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    glowColor: 'shadow-rose-500/30',
    name: 'CHO Trái Tim Thiên Thần',
  },
  boss: {
    Icon: Gem,
    baseBg: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-600 dark:text-yellow-400',
    activeBg:
      'bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-300 ring-2 ring-yellow-500/40 shadow-md shadow-yellow-500/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    glowColor: 'shadow-yellow-500/30',
    name: 'BOSS Kim Cương Chí Tôn',
  },
};

export const IslandGameIcon: React.FC<IslandGameIconProps> = ({
  islandId,
  size = 'md',
  isActive = false,
  className = '',
}) => {
  const theme = ISLAND_THEMES[islandId] || {
    Icon: HelpCircle,
    baseBg: 'bg-slate-500/10 border-slate-500/25 text-slate-500',
    activeBg: 'bg-slate-500/20 border-slate-500/50 text-slate-400 ring-2 ring-slate-500/40',
    iconColor: 'text-slate-500',
    glowColor: 'shadow-slate-500/30',
    name: 'Chưa xác định',
  };

  const { Icon } = theme;

  const sizeConfigs = {
    sm: {
      container: 'w-7 h-7 rounded-lg border',
      iconSize: 14,
      strokeWidth: 2,
    },
    md: {
      container: 'w-9 h-9 rounded-xl border',
      iconSize: 18,
      strokeWidth: 2,
    },
    lg: {
      container: 'w-12 h-12 rounded-2xl border-2',
      iconSize: 24,
      strokeWidth: 2,
    },
  };

  const currentSize = sizeConfigs[size];

  return (
    <div
      className={`inline-flex items-center justify-center transition-all duration-300 select-none ${
        currentSize.container
      } ${isActive ? theme.activeBg : theme.baseBg} ${className}`}
      title={theme.name}
    >
      <Icon
        size={currentSize.iconSize}
        strokeWidth={currentSize.strokeWidth}
        className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : 'opacity-90'}`}
      />
    </div>
  );
};

/**
 * Component hiển thị nhãn cấp bậc có cánh với cánh trái được lật đối xứng (-scale-x-100) chuẩn xác
 * Ví dụ: "🪽 CV 🪽" -> [cánh trái lật] CV [cánh phải]
 *        "🪽 CV" -> [cánh trái lật] CV
 */
export const WingRoleLabel: React.FC<{
  text?: string | null;
  className?: string;
  wingClassName?: string;
}> = ({ text, className = '', wingClassName = '' }) => {
  if (!text) return null;

  // Nếu text chứa "🪽 CV 🪽"
  if (text.includes('🪽 CV 🪽') || text.includes('🪽CV🪽')) {
    const parts = text.split(/🪽\s*CV\s*🪽/);
    return (
      <span className={`inline-flex items-center justify-center gap-0.5 ${className}`}>
        {parts[0] && <span>{parts[0]}</span>}
        <span className={`inline-block -scale-x-100 select-none ${wingClassName}`}>🪽</span>
        <span className="font-black">CV</span>
        <span className={`inline-block select-none ${wingClassName}`}>🪽</span>
        {parts[1] && <span>{parts[1]}</span>}
      </span>
    );
  }

  // Nếu text chứa "🪽 CV"
  if (text.includes('🪽 CV') || text.includes('🪽CV')) {
    const parts = text.split(/🪽\s*CV/);
    return (
      <span className={`inline-flex items-center justify-center gap-0.5 ${className}`}>
        {parts[0] && <span>{parts[0]}</span>}
        <span className={`inline-block -scale-x-100 select-none ${wingClassName}`}>🪽</span>
        <span className="font-black">CV</span>
        {parts[1] && <span>{parts[1]}</span>}
      </span>
    );
  }

  return <span className={className}>{text}</span>;
};
