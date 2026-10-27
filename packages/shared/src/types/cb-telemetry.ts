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
  balanceDeductionVisitsCount: number;
  targetVisits: number;
  repurchaseOrdersCount: number;
  repurchaseComboSalesNet?: number;
  uniquePaxCount: number;
  progressPercent: number;
}

export interface CbDailyRecord {
  date: string; // YYYY-MM-DD
  displayDate: string; // DD/MM
  comboSalesNet: number;
  productSalesNet: number;
  totalSalesNet: number;
  greenVisitsCount: number;
  packageUsageVisitsCount: number;
  varianceToPace: number;
  cumulativeSales: number;
  targetCumulativeSales: number;
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
  daily: CbDailyRecord[];
  forecast: CbForecastTelemetry;
  meta: {
    lastSyncAt: string;
    dateFrom: string;
    dateTo: string;
    month: string;
    isCurrentMonth: boolean;
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
