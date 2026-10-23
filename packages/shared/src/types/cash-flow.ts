export type CashFlowType = 'INFLOW' | 'OUTFLOW';

export type CashFlowCategory =
  | 'REVENUE_SERVICE'
  | 'REVENUE_PRODUCT'
  | 'REVENUE_ACADEMY'
  | 'REVENUE_OTHER'
  | 'SALARY'
  | 'RENT'
  | 'SUPPLIER_MATERIAL'
  | 'TAX'
  | 'TRANSACTION_FEE'
  | 'OPEX'
  | 'OTHER';

export type CashFlowPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CashFlowStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'COLLECTED' | 'OVERDUE' | 'DEFERRED' | 'CANCELLED';

export type CashAccountType = 'CASH' | 'BANK' | 'WALLET';

export interface CashAccount {
  id: number;
  code: string;
  name: string;
  accountType: CashAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  storeId?: number | null;
  storeName?: string | null;
  initialBalance: number;
  currentBalance: number;
  minSafetyThreshold: number;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashFlowEntry {
  id: number;
  flowType: CashFlowType;
  category: CashFlowCategory;
  title: string;
  description?: string | null;
  amount: number; // Số tiền trước VAT
  hasVat: boolean; // Có VAT hay không (theo Triage Note của Danny)
  vatRate: number; // Thuế suất VAT % (ví dụ: 0, 8, 10)
  vatAmount: number; // Tiền thuế VAT
  totalAmount: number; // Tổng thanh toán (amount + vatAmount)
  priority: CashFlowPriority; // Mức độ ưu tiên chi: CRITICAL, HIGH, MEDIUM, LOW
  status: CashFlowStatus;
  expectedDate: string; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  actualDate?: string | null; // YYYY-MM-DD
  accountId?: number | null;
  accountName?: string | null;
  storeId?: number | null;
  storeName?: string | null;
  paymentMethod?: string | null;
  isRecurring: boolean;
  recurringInterval?: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  recurringEndDate?: string | null;
  sourceRef?: string | null;
  projectName?: string | null;
  createdByStaffId?: number | null;
  createdByName?: string | null;
  approvedByStaffId?: number | null;
  approvedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashFlowInflowBreakdown {
  // Wings Lashes (đồng bộ live MOS / CC Leaderboard)
  wingsLashesAchieved: number;
  wingsLashesProjectedAdditional: number;
  wingsLashesTotalProjected: number;

  // Wings Academy (nhập thủ công)
  academyExpectedInflow: number;

  // Dự án khác (nhập thủ công)
  otherProjectsExpectedInflow: number;

  // Tổng dự kiến Thu = Dự kiến thêm Wings Lashes + Dự kiến thu Academy + Dự kiến thu Dự án khác
  totalExpectedInflow: number;
}

export interface CashFlowForecastSummary {
  openingBalance: number;
  totalExpectedInflow: number;
  totalActualInflow: number;
  totalExpectedOutflow: number;
  totalActualOutflow: number;
  closingForecastBalance: number;
  currentActualBalance: number;
  netCashFlowForecast: number;
  varianceAmount: number; // Chênh lệch thực tế vs dự báo
  isShortfallRisk: boolean; // Cảnh báo nguy cơ thiếu tiền (dưới ngưỡng an toàn)
  shortfallDate: string | null; // Ngày đầu tiên dự báo rơi vào vùng nguy hiểm
  minForecastBalance: number;
  minSafetyThreshold: number;
  criticalOutflowPending: number; // Tổng các khoản chi CRITICAL & HIGH đang chờ thanh toán
  totalVatOutflow: number; // Tổng tiền thuế VAT trong các khoản chi
  inflowBreakdown?: CashFlowInflowBreakdown;
  inflowCategoryBreakdown: Record<string, number>;
  outflowCategoryBreakdown: Record<string, number>;
  priorityOutflowBreakdown: Record<string, number>;
}

export interface CashFlowTimelinePoint {
  date: string;
  dayOfWeek: string;
  openingBalance: number;
  expectedInflow: number;
  actualInflow: number;
  expectedOutflow: number;
  actualOutflow: number;
  closingBalance: number;
  isBelowSafety: boolean;
  inflowCount: number;
  outflowCount: number;
  inflows?: CashFlowEntry[];
  outflows?: CashFlowEntry[];
}

export interface CashFlowForecastResponse {
  summary: CashFlowForecastSummary;
  timeline: CashFlowTimelinePoint[];
  accounts: CashAccount[];
  shortfallRiskAlerts: Array<{
    date: string;
    forecastBalance: number;
    deficitAmount: number;
    criticalPendingOutflows: CashFlowEntry[];
  }>;
}

export interface CashFlowEntryListQuery {
  flowType?: CashFlowType;
  category?: CashFlowCategory;
  priority?: CashFlowPriority;
  status?: CashFlowStatus;
  storeId?: number;
  accountId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  hasVat?: boolean;
  page?: number;
  limit?: number;
}

export interface CashAccountBalanceAdjustment {
  id: number;
  currentBalance: number;
  minSafetyThreshold?: number;
  notes?: string;
}

