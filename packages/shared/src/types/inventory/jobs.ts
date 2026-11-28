import type { InventoryRolePreviewKey } from './permissions.js';

export const INVENTORY_JOB_KEYS = [
  'report-warehouse-item-state',
  'report-warehouse-item',
  'report-warehouse',
  'report-item-forecast',
  'process-end-of-month',
  'process-stock-checking',
  'push-warehouse-order',
] as const;

export type InventoryJobKey = (typeof INVENTORY_JOB_KEYS)[number];

export type InventoryJobCategory = 'report' | 'automation' | 'notification';

export type InventoryJobTriggerSource = 'manual' | 'api-legacy' | 'cli' | 'cron';

export interface InventoryJobDefinitionDto {
  key: InventoryJobKey;
  legacyScript: string;
  title: string;
  description: string;
  schedule: string;
  category: InventoryJobCategory;
  supportsDate: boolean;
  supportsWarehouse: boolean;
  supportsChain: boolean;
  defaultDryRun: boolean;
}

export const INVENTORY_JOB_DEFINITIONS: ReadonlyArray<InventoryJobDefinitionDto> = [
  {
    key: 'report-warehouse-item-state',
    legacyScript: 'generate-report-inventory-warehouse-item-state.php',
    title: 'Snapshot Trạng Thái Vật Tư Cuối Kỳ',
    description:
      'Chụp trạng thái từng mã QR vật lý cuối tháng vào report_inventory_warehouse_item_state và có thể chạy chuỗi báo cáo liên hoàn.',
    schedule: 'Hàng ngày lúc 00:05 (UTC+7)',
    category: 'report',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: true,
    defaultDryRun: true,
  },
  {
    key: 'report-warehouse-item',
    legacyScript: 'generate-report-inventory-warehouse-item.php',
    title: 'Tổng Hợp Đơn Giá Cuối Theo Kho × SKU',
    description:
      'Tổng hợp các cặp (kho, SKU) hoạt động hoặc phát sinh nhập/xuất trong kỳ cùng đơn giá cuối vào report_inventory_warehouse_item.',
    schedule: 'Hàng ngày sau Snapshot hoặc theo chuỗi',
    category: 'report',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: true,
    defaultDryRun: true,
  },
  {
    key: 'report-warehouse',
    legacyScript: 'generate-report-inventory-warehouse.php',
    title: 'Báo Cáo Nhập - Xuất - Tồn Kho (17 Chỉ Số)',
    description:
      'Tổng hợp 17 chỉ số số lượng & giá trị bán lẻ theo từng kho chi nhánh × 7 nhóm vật tư vào report_inventory_warehouse.',
    schedule: 'Hàng ngày & ngay sau khi nhập phiếu kho',
    category: 'report',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: false,
    defaultDryRun: true,
  },
  {
    key: 'report-item-forecast',
    legacyScript: 'generate-report-inventory-item-forecast.php',
    title: 'Dự Báo Tiêu Hao 1-6 Tháng',
    description:
      'Tính nhu cầu dự báo tiêu hao theo 6 khung tháng gần nhất cho từng (kho, SKU) vào report_inventory_item_forecast.',
    schedule: 'Hàng ngày lúc 01:30 (UTC+7)',
    category: 'report',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: false,
    defaultDryRun: true,
  },
  {
    key: 'process-end-of-month',
    legacyScript: 'process-inventory-end-of-month.php',
    title: 'Kiểm Kho & Nhắc Nhở Cuối Tháng (EOM)',
    description:
      'Khởi tạo phiếu kiểm kho New/Using cho các kho cần kiểm vào ngày nhắc (20, 25, T-2, T-1) hoặc chốt Checked lúc 00:00 ngày T-1.',
    schedule: 'Ngày 20, 25, T-2, T-1 lúc 00:00 & 08:30',
    category: 'automation',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: false,
    defaultDryRun: true,
  },
  {
    key: 'process-stock-checking',
    legacyScript: 'process-inventory-stock-checking.php',
    title: 'Tính Định Mức & Đặt Hàng Tự Động',
    description:
      'Cập nhật max_count / last_max_count từ lịch sử Used 3 tháng & cùng kỳ năm trước, đồng thời tạo phiếu đặt hàng nháp (New) khi thiếu hụt.',
    schedule: 'Thứ Hai hàng tuần lúc 02:00 hoặc bấm Đặt Hàng Tự Động',
    category: 'automation',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: false,
    defaultDryRun: true,
  },
  {
    key: 'push-warehouse-order',
    legacyScript: 'push-inventory-warehouse-order.php',
    title: 'Tổng Hợp Nhắc Duyệt Phiếu Kho Mới',
    description:
      'Quét các phiếu kho trạng thái New tạo ngày hôm qua, khớp người duyệt (nhóm 21/29) và phát thông báo nội bộ qua SSE.',
    schedule: 'Hàng ngày lúc 08:00 (UTC+7)',
    category: 'notification',
    supportsDate: true,
    supportsWarehouse: true,
    supportsChain: false,
    defaultDryRun: true,
  },
] as const;

export interface InventoryJobRunRequest {
  date?: string;
  warehouseId?: number;
  warehouseItemId?: number;
  inventoryItemId?: number;
  dryRun?: boolean;
  chainDownstream?: boolean;
  forceRun?: boolean;
  simulateDay?: number;
  simulateHour?: number;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryJobRunResultDto {
  jobKey: InventoryJobKey;
  legacyScript: string;
  dryRun: boolean;
  status: 'completed' | 'skipped' | 'failed';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  targetDate: string;
  warehouseId: number | null;
  summary: string;
  metrics: Record<string, number>;
  details?: Record<string, unknown>;
  chainedResults?: InventoryJobRunResultDto[];
  error?: string;
}

export interface InventoryJobHistoryEntryDto {
  runId: string;
  triggeredBy: string;
  triggerSource: InventoryJobTriggerSource;
  result: InventoryJobRunResultDto;
}

export interface InventoryJobsStatusResponse {
  success: true;
  cronEnabled: boolean;
  database: {
    name: string;
    isIsolatedTestDb: boolean;
  };
  runningJobKeys: InventoryJobKey[];
  jobs: InventoryJobDefinitionDto[];
  history: InventoryJobHistoryEntryDto[];
}

export interface InventoryAutoOrderRequest {
  inventory_warehouse_id: number;
  date?: string;
  dryRun?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export interface InventoryRegenerateStateRequest {
  date_to: string;
  warehouseId?: number;
  dryRun?: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
}

export function computeInventoryForecastQuantity(usedQuantity: number, endQuantity: number): number {
  const usedRatio = endQuantity > 0 ? usedQuantity / endQuantity : 1;
  if (usedRatio < 0.9) return 0;
  let forecast = usedQuantity + usedQuantity * 0.05 - endQuantity;
  if (forecast < 0) forecast = 0;
  forecast += endQuantity < 2 ? forecast * 0.15 : forecast * 0.05;
  return forecast;
}

export function computeStockCheckingMaxCount(previous3Month: number, lastMonthYear: number): number {
  const avg = previous3Month / 3;
  let maxCount = avg;
  if (lastMonthYear > 0) {
    if (avg > 0 && lastMonthYear / avg < 0.7) {
      maxCount = avg;
    } else {
      maxCount = (avg + lastMonthYear * 2) / 2;
    }
  }
  return Math.ceil(maxCount);
}

export function computeStockNeedQuantity(params: {
  minCount: number;
  maxCount: number;
  lastMaxCount: number;
  limitCountStandard: number;
  currentStock: number;
  isMainWarehouse: boolean;
}): number {
  const { minCount, maxCount, lastMaxCount, limitCountStandard, currentStock, isMainWarehouse } = params;
  let rawNeed: number;
  if (isMainWarehouse) {
    if (minCount > 0 && limitCountStandard > 0 && maxCount > 0) {
      rawNeed = currentStock <= limitCountStandard ? maxCount - currentStock : 0;
    } else {
      rawNeed = lastMaxCount - currentStock;
    }
  } else if (limitCountStandard > 0 && maxCount > 0) {
    rawNeed = currentStock <= limitCountStandard ? maxCount - currentStock : 0;
  } else {
    rawNeed = lastMaxCount - currentStock;
  }

  if (rawNeed <= 0) return 0;
  return Math.ceil(Math.ceil(rawNeed) * 1.1);
}

export function getEndOfMonthRemindDays(daysInMonth: number): number[] {
  return [20, 25, daysInMonth - 2, daysInMonth - 1];
}
