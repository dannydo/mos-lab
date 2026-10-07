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

export function getKpiColorClasses(percent: number, isNotStarted = false, isDark = true) {
  if (isNotStarted) {
    return {
      tier: 'BEHIND' as KpiColorTier,
      textClass: isDark ? 'text-zinc-400' : 'text-slate-400',
      bgClass: isDark ? 'bg-zinc-900/40' : 'bg-slate-100',
      bgSolidClass: isDark ? 'bg-zinc-800/80' : 'bg-slate-200',
      borderClass: isDark ? 'border-zinc-800' : 'border-slate-300',
      hoverBorderClass: isDark ? 'hover:border-zinc-700' : 'hover:border-slate-400',
      badgeClass: isDark
        ? 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/80'
        : 'bg-slate-100 text-slate-600 border border-slate-300',
      badgeLabel: 'Chưa bắt đầu',
      dotClass: isDark ? 'bg-zinc-600' : 'bg-slate-400',
      gradientClass: isDark ? 'from-zinc-900/40 to-zinc-950' : 'from-slate-100 to-white',
    };
  }

  const tier = getKpiColorTier(percent);
  switch (tier) {
    case 'ACHIEVED':
      return {
        tier,
        textClass: isDark ? 'text-emerald-400' : 'text-emerald-700',
        bgClass: isDark ? 'bg-emerald-950/20' : 'bg-emerald-50',
        bgSolidClass: isDark ? 'bg-emerald-950/80' : 'bg-emerald-100',
        borderClass: isDark ? 'border-emerald-500/40' : 'border-emerald-300',
        hoverBorderClass: isDark ? 'hover:border-emerald-400' : 'hover:border-emerald-500',
        badgeClass: isDark
          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
          : 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        badgeLabel: percent > 100 ? `🔥 VƯỢT ${percent}%` : 'Đạt',
        dotClass: isDark ? 'bg-emerald-400' : 'bg-emerald-500',
        gradientClass: isDark ? 'from-emerald-950/30 to-zinc-950' : 'from-emerald-50 to-white',
      };
    case 'APPROACHING':
      return {
        tier,
        textClass: isDark ? 'text-amber-400' : 'text-amber-800',
        bgClass: isDark ? 'bg-amber-950/20' : 'bg-amber-50',
        bgSolidClass: isDark ? 'bg-amber-950/80' : 'bg-amber-100',
        borderClass: isDark ? 'border-amber-500/40' : 'border-amber-300',
        hoverBorderClass: isDark ? 'hover:border-amber-400' : 'hover:border-amber-500',
        badgeClass: isDark
          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
          : 'bg-amber-100 text-amber-800 border border-amber-300',
        badgeLabel: 'Gần đạt',
        dotClass: isDark ? 'bg-amber-400' : 'bg-amber-500',
        gradientClass: isDark ? 'from-amber-950/30 to-zinc-950' : 'from-amber-50 to-white',
      };
    case 'BEHIND':
    default:
      return {
        tier,
        textClass: isDark ? 'text-rose-400' : 'text-rose-700',
        bgClass: isDark ? 'bg-rose-950/25' : 'bg-rose-50',
        bgSolidClass: isDark ? 'bg-rose-950/80' : 'bg-rose-100',
        borderClass: isDark ? 'border-rose-500/60' : 'border-rose-300',
        hoverBorderClass: isDark ? 'hover:border-rose-400' : 'hover:border-rose-500',
        badgeClass: isDark
          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 font-semibold'
          : 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        badgeLabel: 'Chưa đạt',
        dotClass: isDark ? 'bg-rose-500' : 'bg-rose-500',
        gradientClass: isDark ? 'from-rose-950/30 to-zinc-950' : 'from-rose-50 to-white',
      };
  }
}

export function getKpiProgressStroke(percent: number, token: GlobalToken, isNotStarted = false): string {
  if (isNotStarted) return token.colorTextQuaternary;
  if (percent >= 100) return token.colorSuccess;
  if (percent >= 80) return token.colorWarning;
  return token.colorError;
}
