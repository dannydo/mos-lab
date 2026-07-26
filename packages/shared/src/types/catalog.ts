// ══════════════════════════════════════════════════════════════════════════════
// Catalog Management Shared Types & Constants
// Verified against WingsLashes legacy DB schema (management)
// ══════════════════════════════════════════════════════════════════════════════

// ─── Enum Constants ──────────────────────────────────────────────────────────

export const SERVICE_TYPES = ['Normal', 'Retain', 'Fix', 'Adjust', 'Removal', 'Log', 'Product'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_GROUPS = ['Lashes', 'LashesTop', 'LashesUnder', 'Sauna', 'Product', 'combo'] as const;
export type ServiceGroup = (typeof SERVICE_GROUPS)[number];

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
