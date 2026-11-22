import type { ColumnsType } from 'antd/es/table';
import type { DesktopDensity } from '@mos-lab/shared';
import type { UiCatalogItem } from '~/components/design-system/catalog.manifest';
import type {
  BreakpointDisplaySpec,
  CatalogAuditStats,
  CatalogCategoryBadgeInfo,
  DensityDisplaySpec,
  DesignSystemUser,
  ResponsiveDemoRecord,
  TokenSwatchSpec,
} from './designSystemPageTypes';

export const responsiveDemoColumns: ColumnsType<ResponsiveDemoRecord> = [
  { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', width: 180 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 150 },
  { title: 'Thao tác tiếp', dataIndex: 'nextAction', key: 'nextAction', width: 180 },
];

export const responsiveDemoRecords: ResponsiveDemoRecord[] = [
  { key: '1', customer: 'Nguyễn An', status: 'Cần gọi lại', nextAction: 'Gọi lúc 14:30' },
  { key: '2', customer: 'Trần Bình', status: 'Đã đặt lịch', nextAction: 'Xem hồ sơ' },
];

export const DESKTOP_DENSITY_SELECT_OPTIONS: Array<{ value: DesktopDensity; label: string }> = [
  { value: 'compact', label: 'Compact — 32px control / 16px icon' },
  { value: 'standard', label: 'Standard — 36px control / 18px icon' },
  { value: 'comfortable', label: 'Comfortable — 44px control / 20px icon' },
];

export const TOKEN_SWATCH_SPECS: readonly TokenSwatchSpec[] = [
  {
    key: 'primary',
    title: 'Primary Gold',
    className: 'bg-[rgb(133,91,14)] dark:bg-[rgb(212,168,75)] text-white',
  },
  {
    key: 'info',
    title: 'Info / Cyan',
    className: 'bg-[rgb(2,132,199)] dark:bg-[rgb(56,189,248)] text-white',
  },
  {
    key: 'success',
    title: 'Success Green',
    className: 'bg-[rgb(22,163,74)] dark:bg-[rgb(82,196,26)] text-white',
  },
  {
    key: 'error',
    title: 'Error Red',
    className: 'bg-[rgb(220,38,38)] dark:bg-[rgb(255,77,79)] text-white',
  },
];

export const BREAKPOINT_DISPLAY_SPECS: readonly BreakpointDisplaySpec[] = [
  { key: 'phone', label: 'phone', iconKey: 'phone', iconColorClass: 'text-blue-500' },
  { key: 'ipad', label: 'ipad', iconKey: 'ipad', iconColorClass: 'text-cyan-500' },
  { key: 'laptop', label: 'laptop', iconKey: 'laptop', iconColorClass: 'text-purple-500' },
  { key: 'desktop', label: 'desktop', iconKey: 'desktop', iconColorClass: 'text-emerald-500' },
  { key: 'fourK', label: 'fourK', iconKey: 'fourK', iconColorClass: 'text-amber-500' },
];

export const DISPLAY_DENSITY_SPECS: readonly DensityDisplaySpec[] = [
  { title: 'Compact', description: 'control 32px, icon 16px, padding 8px 12px, gap 8px' },
  { title: 'Standard', description: 'control 36px, icon 18px, padding 12px 16px, gap 12px' },
  { title: 'Comfortable', description: 'control 44px, icon 20px, padding 16px 24px, gap 16px' },
  { title: 'Mobile Compact', description: 'content compact, nhưng control 44px và icon 20px' },
];

export const VIEWPORT_QA_PRESETS: readonly string[] = [
  'iPhone 12: 390 × 844',
  'iPad portrait: 768 × 1024',
  'FHD: 1920 × 1080',
  '4K: 3840 × 2160',
];

export function isDesignSystemAdmin(user: DesignSystemUser | null): boolean {
  if (!user) return false;
  const roleStr = (user.role || '').toLowerCase();
  const usernameStr = (user.username || '').toLowerCase();
  const emailStr = (user.email || '').toLowerCase();
  return (
    roleStr === 'admin' ||
    usernameStr === 'admin' ||
    usernameStr === 'danhdo@gmail.com' ||
    emailStr === 'danhdo@gmail.com'
  );
}

export function computeCatalogAuditStats(items: readonly UiCatalogItem[]): CatalogAuditStats {
  const totalCount = items.length;
  const foundationCount = items.filter((item) => item.status === 'FOUNDATION').length;
  const migratingCount = items.filter((item) => item.status === 'MIGRATING').length;
  const foundationPercent = totalCount > 0 ? Math.round((foundationCount / totalCount) * 100) : 0;

  return {
    totalCount,
    foundationCount,
    migratingCount,
    foundationPercent,
  };
}

export function filterCatalogItems(items: readonly UiCatalogItem[], auditFilter: string): UiCatalogItem[] {
  return items.filter((item) => {
    if (auditFilter === 'ALL') return true;
    return item.status === auditFilter;
  });
}

export function groupCatalogItemsByCategory(items: readonly UiCatalogItem[]): Record<string, UiCatalogItem[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, UiCatalogItem[]>
  );
}

export function getCategoryBadgeInfo(categoryName: string): CatalogCategoryBadgeInfo {
  if (categoryName === 'Foundation') return { status: 'processing', label: 'Foundation' };
  if (categoryName === 'Page assemblies') return { status: 'gold', label: 'Assembly' };
  if (categoryName === 'Data') return { status: 'success', label: 'Data' };
  if (categoryName === 'Filters & period') return { status: 'cyan', label: 'Filters' };
  if (categoryName === 'Forms & overlays') return { status: 'purple', label: 'Overlay' };
  if (categoryName === 'Feedback & state') return { status: 'orange', label: 'State' };
  return { status: 'default', label: 'Shell' };
}
