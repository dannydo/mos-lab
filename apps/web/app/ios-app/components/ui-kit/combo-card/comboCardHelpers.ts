import type React from 'react';

export function formatCompactVnd(amount: number): string {
  if (!amount || amount <= 0) return '0đ';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/0$/, '');
    return `${formatted}M`;
  }
  return `${Math.round(amount / 1_000)}K`;
}

export function formatCompactBonusValue(val: number): string {
  if (val >= 1000000) {
    const millions = val / 1000000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (val >= 1000) {
    return `${Math.round(val / 1000)}K`;
  }
  return `${val.toLocaleString('vi-VN')}đ`;
}

export function getCardBackgroundStyle(categoryId: string, theme?: string): React.CSSProperties {
  const isIvy = categoryId.startsWith('IvyLight') || theme === 'green';
  if (isIvy) {
    return {
      backgroundImage: `linear-gradient(115deg, rgba(5, 22, 12, 0.35) 0%, rgba(4, 18, 10, 0.52) 55%, rgba(3, 14, 8, 0.72) 100%), url('/images/combo-cards/bg-ivylight.webp')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (categoryId.startsWith('UltraLight') || theme === 'red') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #9e161a 0%, #61090c 48%, #260304 82%, #120102 100%)',
    };
  }
  if (categoryId.startsWith('HyperLight') || theme === 'purple') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #9622b8 0%, #52106e 48%, #220533 82%, #11021a 100%)',
    };
  }
  if (categoryId.startsWith('Volume') || theme === 'teal') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #0d5c63 0%, #083c41 48%, #031c1f 82%, #010d0e 100%)',
    };
  }
  if (categoryId.startsWith('Classic') || categoryId === 'Classic_Volume' || theme === 'blue') {
    return {
      background: 'radial-gradient(circle at 18% 22%, #1a3680 0%, #102354 48%, #08112c 82%, #030714 100%)',
    };
  }
  if (categoryId === 'VVIP' || theme === 'black-fire') {
    return {
      background: 'radial-gradient(circle at 80% 22%, #591111 0%, #240909 42%, #0d090a 78%, #050507 100%)',
    };
  }
  // Default: FlawlessMink (black-gold luxury)
  return {
    background: 'radial-gradient(circle at 22% 20%, #2e2514 0%, #15120c 48%, #090807 82%, #040405 100%)',
  };
}

export function formatCardBrandSubtitle(categoryId: string, categoryName: string): string {
  switch (categoryId) {
    case 'IvyLight_3L':
      return 'IVYLIGHT 3𝓵';
    case 'IvyLight_4L':
      return 'IVYLIGHT 4𝓵';
    case 'IvyLight_5L':
      return 'IVYLIGHT 5𝓵';
    case 'HyperLight_2X':
      return 'HYPERLIGHT 2𝑿';
    case 'HyperLight_3X':
      return 'HYPERLIGHT 3𝑿';
    case 'HyperLight_4X':
      return 'HYPERLIGHT 4𝑿';
    case 'HyperLight_5X':
      return 'HYPERLIGHT 5𝑿';
    case 'UltraLight_3D':
      return 'ULTRALIGHT 3D';
    case 'UltraLight_4D':
      return 'ULTRALIGHT 4D';
    case 'UltraLight_5D':
      return 'ULTRALIGHT 5D';
    case 'Classic_1D':
    case 'Classic_Volume':
      return 'CLASSIC 1D';
    case 'Volume_2D':
      return 'VOLUME 2D';
    case 'Volume_3D':
      return 'VOLUME 3D';
    case 'FlawlessMink':
      return 'FLAWLESS MINK 𝓜';
    case 'VVIP':
      return 'VVIP PASS · 20 LẦN';
    default:
      return categoryName.toUpperCase();
  }
}
