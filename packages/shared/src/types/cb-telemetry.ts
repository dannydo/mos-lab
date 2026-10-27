export interface CbRevenueTelemetry {
  comboSalesNet: number;
  productSalesNet: number;
  totalSalesNet: number;
  comboOrderCount: number;
  comboItemCount: number;
  productOrderCount: number;
  productItemCount: number;
  comboAov: number;
}

export interface CbGreenFunnelTelemetry {
  greenVisitsCount: number;
  greenVisitsTarget: number;
  greenComboOrdersCount: number;
  closingRatePercent: number;
  benchmarkRatePercent: number;
  progressPercent: number;
  status: 'BELOW_BENCHMARK' | 'ON_TRACK' | 'EXCEEDING';
}

export interface CbRetentionTelemetry {
  balanceDeductionVisitsCount: number;
  targetVisits: number;
  repurchaseOrdersCount: number;
  uniquePaxCount: number;
  progressPercent: number;
}

export interface CbLiveTelemetryResponse {
  revenue: CbRevenueTelemetry;
  greenFunnel: CbGreenFunnelTelemetry;
  retention: CbRetentionTelemetry;
  meta: {
    lastSyncAt: string;
    dateFrom: string;
    dateTo: string;
    month: string;
    isCurrentMonth: boolean;
  };
}

export interface CbTelemetryQueryParams {
  dateFrom?: string;
  dateTo?: string;
  month?: string; // YYYY-MM
  storeId?: string;
}
