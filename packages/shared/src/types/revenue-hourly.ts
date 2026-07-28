/**
 * Revenue Hourly API Types
 * Used by Calendar Summary Financial View (Revenue View toggle)
 */

// ─── Summary KPI Cards ─────────────────────────────────────────
export interface RevenueHourlySummary {
  /** Tổng doanh thu đơn Completed (Math.round, VND) */
  totalRevenue: number;
  /** Tổng doanh thu sau VAT */
  totalNetRevenue: number;
  /** Average Order Value */
  aov: number;
  /** Số combo bán được */
  comboCount: number;
  /** Doanh thu combo */
  comboRevenue: number;
  /** Mục tiêu doanh thu ngày (từ CRM config hoặc auto-calc) */
  dailyTarget: number;
  /** Dự báo doanh thu cuối ngày (Run-rate Rule #14) */
  projectedRevenue: number;
  /** Tỷ lệ trôi qua (E) - 0 → 1.0 */
  elapsedRatio: number;
  /** Số đơn completed */
  completedOrders: number;
  /** Doanh thu dịch vụ lẻ */
  singleRevenue: number;
  /** Doanh thu sản phẩm */
  productRevenue: number;
  /** Số ngày trong kỳ được chọn */
  daysInPeriod?: number;
  /** Đang lọc 1 ngày duy nhất hay nhiều ngày */
  isSingleDay?: boolean;
}

// ─── Hourly Breakdown (Stacked Bar + Cumulative Line) ──────────
export interface RevenueHourlyBreakdownItem {
  /** Giờ: "08:00", "09:00", ..., "21:00" */
  hour: string;
  /** Doanh thu combo trong khung giờ */
  comboRevenue: number;
  /** Doanh thu dịch vụ lẻ trong khung giờ */
  singleRevenue: number;
  /** Doanh thu sản phẩm trong khung giờ */
  productRevenue: number;
  /** Doanh thu lũy kế đến giờ này */
  cumulativeRevenue: number;
  /** Số đơn completed trong khung giờ */
  orderCount: number;
}

// ─── Branch Heatmap Matrix ─────────────────────────────────────
export interface RevenueBranchHourlyCell {
  hour: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueBranchHourlyRow {
  branchKey: string;
  branchName: string;
  hours: RevenueBranchHourlyCell[];
  totalRevenue: number;
  totalOrders: number;
}

// ─── Combined Response ─────────────────────────────────────────
export interface RevenueHourlyResponse {
  summary: RevenueHourlySummary;
  hourlyBreakdown: RevenueHourlyBreakdownItem[];
  branchHourlyMatrix: RevenueBranchHourlyRow[];
}

// ─── Drill-down Transaction Detail ─────────────────────────────
export interface RevenueDetailTransaction {
  orderId: number;
  customerName: string;
  customerId: number;
  customerPhone: string;
  serviceName: string;
  serviceType: 'combo' | 'single' | 'product';
  price: number;
  netPrice: number;
  ccInName: string | null;
  ccOutName: string | null;
  cvName: string | null;
  checkinTime: string;
  orderState: string;
  branchKey: string;
  branchName: string;
}

export interface RevenueDetailSummary {
  totalRevenue: number;
  comboRevenue: number;
  singleRevenue: number;
  productRevenue: number;
  orderCount: number;
  aov: number;
}

export interface RevenueDetailResponse {
  transactions: RevenueDetailTransaction[];
  summary: RevenueDetailSummary;
}
