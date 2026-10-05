import { GlobalToken } from 'antd';

export type KpiColorTier = 'ACHIEVED' | 'APPROACHING' | 'BEHIND';

/**
 * Phân loại màu sắc KPI theo chuẩn 3 màu:
 * - Xanh (Đạt / Vượt): >= 100%
 * - Vàng (Gần đạt): 80% - 99%
 * - Đỏ (Chưa đạt): < 80%
 */
export function getKpiColorTier(percent: number): KpiColorTier {
  if (percent >= 100) return 'ACHIEVED';
  if (percent >= 80) return 'APPROACHING';
  return 'BEHIND';
}

export function getKpiColorClasses(percent: number, isNotStarted = false) {
  if (isNotStarted) {
    return {
      tier: 'BEHIND' as KpiColorTier,
      textClass: 'text-zinc-400',
      bgClass: 'bg-zinc-900/40',
      bgSolidClass: 'bg-zinc-800/80',
      borderClass: 'border-zinc-800',
      hoverBorderClass: 'hover:border-zinc-700',
      badgeClass: 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/80',
      badgeLabel: 'Chưa bắt đầu',
      dotClass: 'bg-zinc-600',
      gradientClass: 'from-zinc-900/40 to-zinc-950',
    };
  }

  const tier = getKpiColorTier(percent);
  switch (tier) {
    case 'ACHIEVED':
      return {
        tier,
        textClass: 'text-emerald-400',
        bgClass: 'bg-emerald-950/20',
        bgSolidClass: 'bg-emerald-950/80',
        borderClass: 'border-emerald-500/40',
        hoverBorderClass: 'hover:border-emerald-400',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40',
        badgeLabel: percent > 100 ? `🔥 VƯỢT ${percent}%` : 'Đạt',
        dotClass: 'bg-emerald-400',
        gradientClass: 'from-emerald-950/30 to-zinc-950',
      };
    case 'APPROACHING':
      return {
        tier,
        textClass: 'text-amber-400',
        bgClass: 'bg-amber-950/20',
        bgSolidClass: 'bg-amber-950/80',
        borderClass: 'border-amber-500/40',
        hoverBorderClass: 'hover:border-amber-400',
        badgeClass: 'bg-amber-950/80 text-amber-300 border border-amber-500/40',
        badgeLabel: 'Gần đạt',
        dotClass: 'bg-amber-400',
        gradientClass: 'from-amber-950/30 to-zinc-950',
      };
    case 'BEHIND':
    default:
      return {
        tier,
        textClass: 'text-rose-400',
        bgClass: 'bg-rose-950/25',
        bgSolidClass: 'bg-rose-950/80',
        borderClass: 'border-rose-500/60',
        hoverBorderClass: 'hover:border-rose-400',
        badgeClass: 'bg-rose-950/80 text-rose-300 border border-rose-500/60 font-semibold',
        badgeLabel: 'Chưa đạt',
        dotClass: 'bg-rose-500',
        gradientClass: 'from-rose-950/30 to-zinc-950',
      };
  }
}

export function getKpiProgressStroke(percent: number, token: GlobalToken, isNotStarted = false): string {
  if (isNotStarted) return token.colorTextQuaternary;
  if (percent >= 100) return token.colorSuccess;
  if (percent >= 80) return token.colorWarning;
  return token.colorError;
}
