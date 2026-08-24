export interface DailySalesBonusConfigTier {
  id?: number;
  position: number;
  value_required_min: number;
  value_required_max: number;
  reward_amount: number; // percentage, e.g., 0.5, 1.0, 1.5, 2.0, 2.5, 3.0
}

export interface DailySalesBonusConfig {
  combo_unit_bonus: number; // e.g. 200,000đ
  product_unit_bonus: number; // e.g. 50,000đ
  tiers: DailySalesBonusConfigTier[];
}

export interface DailySalesBonusConsultantRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  user_id: number;
  consultant_name: string;
  avatar?: string | null;
  store_code?: string;
  combo_sales: number;
  combo_count?: number;
  /** Combo quantities sold on visits that were Vòng Xanh at booking time. */
  green_combo_count: number;
  product_sales: number;
  product_count?: number;
  single_sales: number;
  debt_collected: number;
  vat: number;
  debt: number;
  total_sales: number;
  commission_rate_percent: number;
  daily_bonus: number;
  /** Completed customer visits, allocated 50/50 when CC IN differs from CC OUT. */
  green_visits: number;
  total_visits: number;

  // 1.5x Wheel Bonus Cap fields
  monthlyDailyBonus?: number;
  monthlyWheelBonus?: number;
  maxWheelBonusAllowed?: number;
  wheelCapPercent?: number;
  capStatus?: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
}

export interface DailySalesBonusConsultantResponse {
  data: DailySalesBonusConsultantRecord[];
  total: number;
  summary?: {
    totalComboSales: number;
    totalProductSales: number;
    totalSingleSales?: number;
    totalSales: number;
    totalCcBonus: number;
    projectedComboSales?: number;
    projectedProductSales?: number;
    projectedTotalSales?: number;
    projectedCcBonus?: number;
    elapsedRatioPercent?: number;
    comparison?: DailySalesBonusPeriodComparison;
  };
  activeStaff?: { userId: number; displayName: string }[];
}

export interface DailySalesBonusPeriodComparison {
  /** The dashboard selector that determines the matching previous period. */
  mode: 'month' | 'week' | 'day';
  /** Inclusive date bounds of the matched previous period, for explanatory UI. */
  dateFrom: string;
  dateTo: string;
  totalComboSales: number;
  totalProductSales: number;
  totalSingleSales: number;
  totalSales: number;
  totalCcBonus: number;
}

export interface DailySalesBonusLeaderboardEntry {
  rank: number;
  consultantId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  comboSalesCount: number;
  greenComboSalesCount: number;
  comboSales: number;
  productSalesCount: number;
  singleSales: number;
  totalVisits: number;
  greenVisits: number;
  greenComboConversionRate: number;
  totalSales: number;
  totalBonus: number;
  targetCompletionRate: number;

  // 1.5x Wheel Bonus Cap fields
  monthlyDailyBonus?: number;
  monthlyWheelBonus?: number;
  maxWheelBonusAllowed?: number;
  wheelCapPercent?: number;
  capStatus?: 'NORMAL' | 'WARNING' | 'HARDCAPPED';
}

export interface DailySalesBonusTransaction {
  order_service_id: number;
  order_id: number;
  order_time: string;
  customer_name: string;
  store_code: string;
  item_title: string;
  item_type: 'Combo' | 'Product' | 'Service';
  payment_value: number;
  gross_value?: number;
  net_value?: number;
  tax_amount?: number;
  recorded_bonus: number;
  is_eligible?: boolean;
  cc_in_name?: string | null;
  cc_out_name?: string | null;
  is_split?: boolean;
  split_ratio?: number;
  full_order_value?: number;
  debt_amount?: number;
}

export interface DailySalesBonusQueryParams {
  dateFrom?: string;
  dateTo?: string;
  consultantId?: string | number;
  storeId?: string;
  comparisonMode?: 'month' | 'week' | 'day';
}

export interface DailySalesBonusTransactionsQueryParams {
  date: string;
  consultantId: string | number;
}
