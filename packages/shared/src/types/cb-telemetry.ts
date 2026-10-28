export interface CbRevenueTelemetry {
  comboSalesNet: number;
  productSalesNet: number;
  totalSalesNet: number;
  comboOrderCount: number;
  comboItemCount: number;
  productOrderCount: number;
  productItemCount: number;
  comboAov: number;
  comboAttainmentPercent?: number;
  productAttainmentPercent?: number;
  totalAttainmentPercent?: number;
  shortfallOrSurplus?: number;
}

export interface CbGreenFunnelTelemetry {
  greenVisitsCount: number;
  greenVisitsTarget: number;
  greenComboOrdersCount: number;
  closingRatePercent: number;
  benchmarkRatePercent: number;
  progressPercent: number;
  status: 'BELOW_BENCHMARK' | 'ON_TRACK' | 'EXCEEDING';
  greenBookingsCount?: number;
}

export interface CbRetentionTelemetry {
  balanceDeductionVisitsCount: number; // Tổng lượt Done có trừ lượt gói (850 / Target 1000)
  packageUsageNonGreenVisitsCount: number; // Done nguồn dùng gói ngoài VX (794 / mô hình 900)
  targetVisits: number;
  repurchaseOrdersCount: number; // Đơn mua tiếp/gia hạn từ nhóm dùng gói ngoài VX (55 đơn)
  repurchaseComboSalesNet: number; // Doanh số gói từ nhóm dùng gói ngoài VX (301,1M)
  uniquePaxCount: number;
  progressPercent: number;
}

export interface CbAttributionGroup {
  sourceGroup: 'VONG_XANH' | 'DUNG_GOI_NGOAI_VX' | 'LE_KHAC';
  name: string;
  doneVisitsCount: number;
  comboOrderCount: number;
  comboItemCount: number;
  comboSalesNet: number;
  comboAov: number;
}

export interface CbAttributionTelemetry {
  vongXanh: CbAttributionGroup;
  dungGoiNgoaiVx: CbAttributionGroup;
  leKhac: CbAttributionGroup;
  totalComboSalesNet: number;
  totalComboOrderCount: number;
  totalDoneVisitsCount: number;
  reconciliationStatus: 'MATCHED' | 'DISCREPANCY';
}

export interface CbDailyRecord {
  date: string; // YYYY-MM-DD
  displayDate: string; // DD/MM
  comboSalesNet: number;
  productSalesNet: number;
  totalSalesNet: number;
  greenVisitsCount: number;
  greenComboOrdersCount: number;
  packageUsageVisitsCount: number;
  packageUsageComboOrdersCount: number;
  varianceToPace: number;
  cumulativeSales: number;
  targetCumulativeSales: number;
  dailyPlanTarget: number;
  isClosedDate: boolean;
}

export interface CbForecastTelemetry {
  last7DaysAvg: number;
  last7DaysTotal: number;
  remainingDays: number;
  forecastTotal: number;
  forecastPercent: number;
  forecastVariance: number;
  summaryFormula: string;
  status: 'ON_TRACK' | 'BORDERLINE' | 'BEHIND';
}

export interface CbTargetConfig {
  configured: boolean;
  month: string; // YYYY-MM
  storeScope: 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL';
  comboSalesTarget: number;
  productSalesTarget: number;
  totalSalesTarget: number;
  dailyPlanPace: number;
  greenFunnelBookTarget: number;
  greenFunnelDoneTarget: number;
  greenFunnelConversionTarget: number;
  packageUsageDoneTarget: number;
  repeatComboSalesTarget: number;
  aovPackageUsageTarget: number;
  daysInMonth: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CbDrilldownItem {
  id: number;
  bookingDateStart: string;
  storeName: string;
  customerName?: string;
  customerPhone?: string;
  amountNet: number;
  category: 'COMBO' | 'PRODUCT' | 'GREEN_FUNNEL' | 'PACKAGE_USAGE';
  details?: string;
}

export interface CbLiveTelemetryResponse {
  targets: CbTargetConfig;
  revenue: CbRevenueTelemetry;
  greenFunnel: CbGreenFunnelTelemetry;
  retention: CbRetentionTelemetry;
  attribution: CbAttributionTelemetry;
  daily: CbDailyRecord[];
  forecast: CbForecastTelemetry;
  meta: {
    lastSyncAt: string;
    dateFrom: string;
    dateTo: string;
    month: string;
    isCurrentMonth: boolean;
    periodState: 'future' | 'in_progress' | 'closed';
    storeScope: string;
    pacingStatus: 'ĐÚNG TIẾN ĐỘ' | 'SÁT MỤC TIÊU' | 'HỤT MỤC TIÊU' | 'CHƯA CẤU HÌNH';
    uniquePaxPerVisit: number;
    totalDoneVisits: number;
  };
}

export interface CbTelemetryQueryParams {
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  storeScope?: string;
}
