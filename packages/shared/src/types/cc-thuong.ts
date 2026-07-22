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
  store_code?: string;
  combo_sales: number;
  combo_count?: number;
  product_sales: number;
  product_count?: number;
  single_sales: number;
  debt_collected: number;
  vat: number;
  debt: number;
  total_sales: number;
  commission_rate_percent: number;
  daily_bonus: number;
  green_visits?: number;
  total_visits?: number;
}

export interface DailySalesBonusConsultantResponse {
  data: DailySalesBonusConsultantRecord[];
  total: number;
  activeStaff?: { userId: number; displayName: string }[];
}

export interface DailySalesBonusLeaderboardEntry {
  rank: number;
  consultantId: number;
  displayName: string;
  store: string;
  comboSalesCount: number;
  comboSales: number;
  productSalesCount: number;
  singleSales: number;
  totalVisits: number;
  greenVisits: number;
  greenComboConversionRate: number;
  totalSales: number;
  totalBonus: number;
  targetCompletionRate: number;
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
  recorded_bonus: number;
}

export interface DailySalesBonusQueryParams {
  dateFrom?: string;
  dateTo?: string;
  consultantId?: string | number;
  storeId?: string;
}

export interface DailySalesBonusTransactionsQueryParams {
  date: string;
  consultantId: string | number;
}
