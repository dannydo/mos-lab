export type CbStoreScope = 'DE_THAM_ESTELLA' | 'DE_THAM' | 'ESTELLA' | 'ALL';

export type CbDrilldownCategory = 'COMBO' | 'PRODUCT' | 'GREEN_FUNNEL' | 'PACKAGE_USAGE';

export type CbDailyViewMode = 'RECENT_7' | 'ALL_MONTH';

export interface CbLiveTelemetryWidgetProps {
  autoRefreshIntervalSec?: number;
  showCardWrapper?: boolean;
}

export interface CbCumulativeChartPoint {
  x: number;
  y: number;
  val: number;
  day: string;
}

export interface CbCumulativeChartData {
  actualPath: string;
  planPath: string;
  maxVal: number;
  points: CbCumulativeChartPoint[];
}

export interface CbDailyTotals {
  combo: number;
  product: number;
  total: number;
  greenVisits: number;
  packageUsageVisits: number;
}
