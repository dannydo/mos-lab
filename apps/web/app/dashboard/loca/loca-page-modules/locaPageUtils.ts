import type { SafeAny, Staff } from '@mos-lab/shared';
import type { TouchpointPalette } from './locaPageTypes';

const NAMED_RGB_MAP: Record<string, readonly [number, number, number]> = {
  blue: [37, 99, 235],
  cyan: [8, 145, 178],
  green: [22, 163, 74],
  emerald: [5, 150, 105],
  amber: [217, 119, 6],
  orange: [234, 88, 12],
  rose: [225, 29, 72],
  red: [220, 38, 38],
  purple: [147, 51, 234],
  indigo: [79, 70, 229],
  pink: [219, 39, 119],
  slate: [71, 85, 105],
};

const LOCA_SORTABLE_FIELDS: Record<string, string> = {
  daysSinceLastVisit: 'daysSinceLastVisit',
  totalSpent: 'totalSpent',
  name: 'name',
  id: 'id',
};

function parseHexColorToRgb(colorStr: string): readonly [number, number, number] {
  if (colorStr.startsWith('#')) {
    const rawHex = colorStr.slice(1);
    const fullHex =
      rawHex.length === 3 ? `${rawHex[0]}${rawHex[0]}${rawHex[1]}${rawHex[1]}${rawHex[2]}${rawHex[2]}` : rawHex;
    if (fullHex.length === 6) {
      const r = parseInt(fullHex.slice(0, 2), 16);
      const g = parseInt(fullHex.slice(2, 4), 16);
      const b = parseInt(fullHex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return [r, g, b];
      }
    }
  }

  return NAMED_RGB_MAP[colorStr.toLowerCase()] ?? [37, 99, 235];
}

export function getTouchpointPalette(colorStr: string | undefined, themeMode: string): TouchpointPalette {
  const isDark = themeMode === 'dark';

  if (!colorStr) {
    return {
      bg: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgb(239, 246, 255)',
      border: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgb(191, 219, 254)',
      text: isDark ? 'rgb(147, 197, 253)' : 'rgb(29, 78, 216)',
      dot: 'rgb(59, 130, 246)',
    };
  }

  const [r, g, b] = parseHexColorToRgb(colorStr);
  const dotColor = `rgb(${r}, ${g}, ${b})`;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (isDark) {
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      border: `rgba(${r}, ${g}, ${b}, 0.32)`,
      text:
        luminance > 0.7
          ? `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`
          : dotColor,
      dot: dotColor,
    };
  }

  const scale = luminance > 0.55 ? 0.52 : 0.75;
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.07)`,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
    text: `rgb(${Math.round(r * scale)}, ${Math.round(g * scale)}, ${Math.round(b * scale)})`,
    dot: dotColor,
  };
}

export function resolveLocaTableSortField(tableSorter: SafeAny): string | null {
  const sorter = Array.isArray(tableSorter) ? tableSorter[0] : tableSorter;
  if (!sorter?.field) return null;

  if (!sorter.order) {
    return 'daysSinceLastVisit_asc';
  }

  const sortableField = LOCA_SORTABLE_FIELDS[String(sorter.field)];
  if (!sortableField) return null;

  return `${sortableField}_${sorter.order === 'ascend' ? 'asc' : 'desc'}`;
}

export function buildBookerSelectOptions(staffList: Staff[]) {
  return [
    { value: 'ALL', label: 'All Bookers' },
    { value: 'unassigned', label: 'Chưa phân bổ' },
    ...staffList.map((staff) => ({
      value: staff.id.toString(),
      label: staff.displayName,
    })),
  ];
}
