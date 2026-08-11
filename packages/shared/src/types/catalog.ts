// ══════════════════════════════════════════════════════════════════════════════
// Catalog Management Shared Types & Constants
// Verified against WingsLashes legacy DB schema (management)
// ══════════════════════════════════════════════════════════════════════════════

// ─── Enum Constants ──────────────────────────────────────────────────────────

export const SERVICE_TYPES = ['Normal', 'Retain', 'Fix', 'Adjust', 'Removal', 'Log', 'Product'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CATALOG_SERVICE_MASTER_TYPES = ['Normal', 'Retain', 'Removal'] as const;
export type CatalogServiceMasterType = (typeof CATALOG_SERVICE_MASTER_TYPES)[number];

export const SERVICE_GROUPS = ['Lashes', 'LashesTop', 'LashesUnder', 'Sauna', 'Product', 'combo'] as const;
export type ServiceGroup = (typeof SERVICE_GROUPS)[number];

export const CATALOG_SERVICE_MASTER_GROUPS = ['LashesTop', 'LashesUnder'] as const;
export type CatalogServiceMasterGroup = (typeof CATALOG_SERVICE_MASTER_GROUPS)[number];

export const SERVICE_PRICE_TYPES = ['Single', 'Combo', 'Log', 'Fix', 'Adjust'] as const;
export type ServicePriceType = (typeof SERVICE_PRICE_TYPES)[number];

// ─── Single-Tenant Defaults ─────────────────────────────────────────────────

export const CATALOG_DEFAULTS = {
  CLIENT_ID: 1,
  CLIENT_BUSINESS_ID: 1,
  DEFAULT_CURRENCY_ID: 1, // VND
  DEFAULT_LANGUAGE_ID: 1, // Vietnamese
} as const;

// ─── Service Interfaces ─────────────────────────────────────────────────────

export interface CatalogService {
  id: number;
  clientId: number;
  clientBusinessId: number;
  parentServiceId: number | null;
  serviceKey: string;
  serviceType: string;
  serviceGroup: string;
  durationMinute: number;
  durationMinuteStandard: number;
  imageFilename: string | null;
  imageExtension: string | null;
  remindingIntervalDay: number;
  position: number;
  isTemporary: boolean;
  isDisabled: boolean;
  dateUpdated: string | null;
  dateCreated: string;
  // Joined from service_language
  serviceName?: string;
  serviceShortDescription?: string;
  serviceDescription?: string;
  lashStyle?: string;
  lashCount?: number | null;
  // Joined from service_price (for listing)
  prices?: CatalogServicePrice[];
}

export interface CatalogServicePrice {
  id: number;
  serviceId: number;
  currencyId: number;
  servicePricePackageKey: string;
  servicePriceType: string;
  servicePrice: number;
  normalCount: number;
  bonusNormalCount: number;
  retainCount: number;
  bonusRetainCount: number;
  perNormalPrice: number;
  perRetainPrice: number;
  expiryAfterDay: number;
  bonusActiveDay: number;
  position: number;
  isSameCount: boolean;
  isNewUserDisabled: boolean;
  isDisabled: boolean;
}

export interface CatalogProduct {
  id: number;
  clientId: number;
  clientBusinessId: number;
  createdStaffId: number | null;
  inventoryItemId: number;
  productSku: string;
  position: number;
  isDisabled: boolean;
  dateUpdated: string | null;
  dateCreated: string;
  // Joined from product_language
  productName?: string;
  productShortDescription?: string;
  productDescription?: string;
  // Joined from product_price
  productPrice?: number;
  // Joined from inventory_warehouse_item
  inStockCount?: number;
  totalStockCount?: number;
}

// ─── Request / Input Types ──────────────────────────────────────────────────

export interface CreateServiceInput {
  serviceKey: string;
  serviceType: string;
  serviceGroup: string;
  durationMinute: number;
  durationMinuteStandard: number;
  remindingIntervalDay: number;
  parentServiceId?: number | null;
  isTemporary?: boolean;
  isDisabled?: boolean;
  // Language fields
  serviceName: string;
  serviceShortDescription?: string;
  serviceDescription?: string;
  // Price fields (simplified — single price for now)
  servicePrice?: number;
  servicePriceType?: string;
  servicePricePackageKey?: string;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  position?: number;
}

export interface CreateServicePriceInput {
  serviceId: number;
  servicePricePackageKey: string;
  servicePriceType: string;
  servicePrice: number;
  normalCount: number;
  retainCount: number;
  perNormalPrice: number;
  perRetainPrice: number;
  expiryAfterDay: number;
  bonusActiveDay: number;
  isSameCount?: boolean;
  isNewUserDisabled?: boolean;
  isDisabled?: boolean;
}

export interface CreateProductInput {
  productSku: string;
  inventoryItemId?: number;
  isDisabled?: boolean;
  // Language fields
  productName: string;
  productShortDescription?: string;
  productDescription?: string;
  // Price field
  productPrice?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  position?: number;
}

// ─── Query Parameters ───────────────────────────────────────────────────────

export interface CatalogListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  group?: string;
  type?: string;
  isDisabled?: boolean;
}

// ─── Response Envelopes ─────────────────────────────────────────────────────

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CatalogListResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
}

export interface CatalogDetailResponse<T> {
  success: boolean;
  data: T;
}

// ─── Catalog Stats ──────────────────────────────────────────────────────────

export interface CatalogStats {
  totalServices: number;
  activeServices: number;
  totalCombos: number;
  activeCombos: number;
  totalProducts: number;
  activeProducts: number;
}

// ─── Catalog Leaderboard & Report DTOs ──────────────────────────────────────

export type CatalogItemType = 'service' | 'combo' | 'product';

export interface CatalogLeaderboardEntry {
  id: string;
  rank: number;
  itemId: number;
  itemType: CatalogItemType;
  name: string;
  groupOrKey: string;
  unitPrice: number;
  unitsSold: number;
  revenue: number;
  revenueSharePercent: number;
  isDisabled: boolean;
}

export interface CatalogReportSummary {
  totalRevenue: number;
  singleServiceRevenue: number;
  comboRevenue: number;
  productRevenue: number;
  totalOrdersCount: number;
  totalUnitsSold: number;
  leaderboard: CatalogLeaderboardEntry[];
}

export interface CatalogReportSummaryParams {
  period?: 'today' | 'week' | 'month' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  itemType?: 'all' | 'service' | 'combo' | 'product';
}

export interface CatalogItemHistoryRow {
  orderId: number;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  orderDate: string;
  staffName?: string;
  quantity: number;
  amount: number;
}

export interface CatalogItemHistoryParams {
  itemId: number;
  itemType: CatalogItemType;
  dateFrom?: string;
  dateTo?: string;
}

export interface CatalogItemHistoryResponse {
  success: boolean;
  item: {
    itemId: number;
    itemType: CatalogItemType;
    name: string;
    unitPrice: number;
    totalRevenue: number;
    totalUnitsSold: number;
    isDisabled: boolean;
  };
  orders: CatalogItemHistoryRow[];
}

// ─── Combo Live Types ───────────────────────────────────────────────────────

export interface ComboLiveOwnerItem {
  balanceId: number;
  userId: number;
  customerName: string;
  customerPhone?: string;
  normalCount: number;
  retainCount: number;
  dateExpired: string | null;
  dateCreated: string;
  daysRemaining: number | null;
  isExpiringSoon: boolean;
}

export interface ComboLiveSummaryItem {
  id: string;
  comboName: string;
  packageKey: string;
  serviceId: number;
  servicePriceId?: number;
  packagePrice: number;
  expiryAfterDay: number;
  ownerCount: number;
  totalNormalBalance: number;
  totalRetainBalance: number;
  expiringSoonOwnerCount: number;
  owners: ComboLiveOwnerItem[];
}

export interface ComboLiveParams {
  search?: string;
  expiringSoon?: boolean;
}

export interface ComboLiveResponse {
  success: boolean;
  meta: {
    totalCombos: number;
    totalActiveOwners: number;
    totalNormalBalance: number;
    totalRetainBalance: number;
    totalExpiringSoonOwners: number;
  };
  data: ComboLiveSummaryItem[];
}

export interface AffectedComboItem {
  comboName: string;
  packagePrice: number;
  ownerCount: number;
  totalNormalBalance: number;
  totalRetainBalance: number;
}

export interface ServiceLiveComboCheckResult {
  serviceId: number;
  totalOwners: number;
  totalNormalBalance: number;
  totalRetainBalance: number;
  affectedCombos: AffectedComboItem[];
}

// ─── Lash Type Benchmark Types ──────────────────────────────────────────────

export const LASH_STYLES = [
  'Classic',
  'Mink',
  'Volume 3D',
  'Volume 4D',
  'Volume 5D',
  'Ultralight',
  'Hyperlight',
  'Flawless',
  'Ivylight',
  'Ivylight 3L',
  'Ivylight 4L',
  'Ivylight 5L',
  'Under Mink',
] as const;
export type LashStyle = (typeof LASH_STYLES)[number];

export const BENCHMARK_SERVICE_TYPES = ['Normal', 'Retain', 'Fix', 'Replace'] as const;
export type BenchmarkServiceType = (typeof BENCHMARK_SERVICE_TYPES)[number];

export interface LashTypeBenchmark {
  id: number;
  lashStyle: string;
  serviceType: string;
  lashCount: number | null;
  benchmarkMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  sampleSize: number;
  isAutoGenerated: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface LashEtaEstimate {
  etaMinutes: number;
  layer: 1 | 2 | 3;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface LashBenchmarkSeedResult {
  inserted: number;
  updated: number;
  total: number;
}

// ─── Branch Management Types ─────────────────────────────────────────────

export type BranchType = 'SALON' | 'ACADEMY' | 'OFFICE';

export interface CrmBranch {
  id: number;
  code: string;
  name: string;
  nameEn: string | null;
  storeType: BranchType;
  addressMap: string | null;
  addressSms: string | null;
  addressWeb: string | null;
  addressCity: string | null;
  sortOrder: number;
  isActive: boolean;
  legacyClientStoreId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed / Joined fields
  staffCount?: number;
  customerCount?: number;
  completedOrdersCount?: number;
  staffList?: BranchStaffInfo[];
}

export interface BranchStaffInfo {
  id: number;
  displayName: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface CreateBranchDto {
  code: string;
  name: string;
  nameEn?: string | null;
  storeType?: BranchType;
  addressMap?: string | null;
  addressSms?: string | null;
  addressWeb?: string | null;
  addressCity?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  notes?: string | null;
}

export type UpdateBranchDto = Partial<CreateBranchDto>;

export interface BranchFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
  onlyHidden?: boolean;
}

export interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  totalStaff: number;
  totalCustomers: number;
  totalCompletedOrders: number;
}
