export type WingsGardenCategory = 'GLUE' | 'SWAB' | 'TAPE' | 'EYEPAD' | 'SOLUTION' | 'HYGIENE' | 'LASH';

export type WingsGardenPayMethod = 'FEATHER' | 'CASH';

export type WingsGardenWarehouseId = 3 | 41;

export type WingsGardenPreviewRole = 'CVL' | 'CVLL' | 'CV' | 'FM' | 'ADMIN';

export type WingsGardenChestKind = 'bronze' | 'silver' | 'gold';

export type WingsGardenPerkKind = 'LATE_30' | 'EARLY_30' | 'OFF_DAY';

export interface WingsGardenWarehouseMeta {
  warehouseId: WingsGardenWarehouseId;
  clientStoreId: number;
  name: string;
  shortName: string;
}

export const WINGS_GARDEN_WAREHOUSES: readonly WingsGardenWarehouseMeta[] = [
  { warehouseId: 3, clientStoreId: 6, name: 'Đảo Đề Thám', shortName: 'Đề Thám' },
  { warehouseId: 41, clientStoreId: 16, name: 'Đảo Estella', shortName: 'Estella' },
] as const;

export const WINGS_GARDEN_OVERDRAFT_FLOOR = -50;
export const WINGS_GARDEN_GLUE_FRESHNESS_DAYS = 21;

export interface WingsGardenSkuConfig {
  skuId: string;
  name: string;
  legacyName: string;
  category: WingsGardenCategory;
  unit: string;
  listedPriceVnd: number;
  costFeathers: number;
  cashbackFeathers: number;
  freshnessDays: number | null;
  isMandatoryCvKit: boolean;
  isSharedDefault?: boolean;
  legacyItemIds: number[];
  keywords: string[];
}

export interface WingsGardenWingTier {
  tier: number;
  name: string;
  costFeathers: number;
  bonusChest: WingsGardenChestKind;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export interface WingsGardenChestConfig {
  kind: WingsGardenChestKind;
  name: string;
  buyCostFeathers: number;
  perkKind: WingsGardenPerkKind;
  perkTitle: string;
  perkRule: string;
  perkValidDays: number;
  featherMin: number;
  featherMax: number;
}

export type WingsGardenFeatherRuleTrigger =
  | 'LASH_FULL_SET'
  | 'LASH_REFILL'
  | 'DAILY_LASH_MILESTONE'
  | 'BOTTOM_LASH'
  | 'SERUM_UPSELL'
  | 'CUSTOMER_COMBO_BUY'
  | 'SCAN_IMPORT'
  | 'SCAN_USING'
  | 'SCAN_USED'
  | 'CUSTOM';

export type WingsGardenClaimMode = 'AUTO' | 'CLAIM';

export interface WingsGardenMilestoneTier {
  id: string;
  thresholdSets: number;
  feathers: number;
  bonusChest?: WingsGardenChestKind | null;
}

export interface WingsGardenFeatherRule {
  ruleId: string;
  trigger: WingsGardenFeatherRuleTrigger;
  label: string;
  description: string;
  enabled: boolean;
  feathers: number;
  claimMode: WingsGardenClaimMode;
  roles: WingsGardenPreviewRole[];
  refillSetWeight?: number;
  milestoneTiers?: WingsGardenMilestoneTier[];
  comboAttributionWindowDays?: number;
  isSystem?: boolean;
}

export interface WingsGardenPendingClaim {
  id: string;
  eventKey: string;
  ruleId: string;
  trigger: WingsGardenFeatherRuleTrigger;
  title: string;
  detail: string;
  feathers: number;
  bonusChest?: WingsGardenChestKind | null;
  dateKey: string;
  createdAt: string;
  status: 'READY' | 'CLAIMED' | 'AUTO_CLAIMED';
  claimedAt?: string;
}

export interface WingsGardenDailyQuestProgress {
  dateKey: string;
  lashSetsToday: number;
  fullSetsToday: number;
  refillsToday: number;
  bottomLashToday: number;
  serumSoldToday: number;
  comboConvertedToday: number;
  scanImportToday: number;
  scanUsingToday: number;
  scanUsedToday: number;
  claimedMilestoneIds: string[];
  lastLegacySyncAt: string | null;
  syncedLegacyEventsCount: number;
}

export interface WingsGardenQrStageRecord {
  importedAt?: string;
  importedBy?: string;
  usingRewarded?: boolean;
  usedRewarded?: boolean;
}

export interface WingsGardenEconomyPreview {
  standardDayFeathers: number;
  glueBottleEquivalent: number;
  wing2Pct: number;
  breakdown: string;
}

export interface WingsGardenConfig {
  version: number;
  serviceEarn: {
    fullSet: number;
    refill: number;
    removeOrSpa: number;
  };
  overdraftFloor: number;
  skus: WingsGardenSkuConfig[];
  wingTiers: WingsGardenWingTier[];
  chests: Record<WingsGardenChestKind, WingsGardenChestConfig>;
  featherRules: WingsGardenFeatherRule[];
  updatedAt: string;
}

export interface WingsGardenPerkCard {
  id: string;
  chestKind: WingsGardenChestKind;
  perkKind: WingsGardenPerkKind;
  title: string;
  rule: string;
  validDays: number;
  status: 'READY' | 'USED';
  createdAt: string;
  activatedAt?: string;
}

export interface WingsGardenWallet {
  staffId: number;
  staffName: string;
  feathers: number;
  cashSpentVnd: number;
  cashOrdersCount: number;
  wingTier: number;
  streakDays: number;
  servicesDoneToday: number;
  chests: Record<WingsGardenChestKind, number>;
  chestOpenedCount: Record<WingsGardenChestKind, number>;
  perkCards: WingsGardenPerkCard[];
  dailyProgress?: WingsGardenDailyQuestProgress;
  pendingClaims?: WingsGardenPendingClaim[];
  processedEventKeys?: string[];
  updatedAt: string;
}

export interface WingsGardenItemTimelineEntry {
  time: string;
  actor: string;
  detail: string;
}

export interface WingsGardenOverlayItem {
  uid: string;
  scanCode: string;
  legacyWarehouseItemId?: number | null;
  legacyItemId?: number | null;
  skuId: string;
  name: string;
  category: WingsGardenCategory;
  ownerStaffId: number;
  ownerName: string;
  warehouseId: WingsGardenWarehouseId;
  state: 'USING' | 'USED';
  payMethod: WingsGardenPayMethod;
  payLabel: string;
  listedPriceVnd: number;
  costFeathers: number;
  cashbackFeathers: number;
  isShared: boolean;
  remainingPct: number;
  openedAt: string;
  daysOffset: number;
  freshLimitDays: number | null;
  timeline: WingsGardenItemTimelineEntry[];
}

export interface WingsGardenUsedRecord {
  uid: string;
  scanCode: string;
  skuId: string;
  name: string;
  actorName: string;
  warehouseId: WingsGardenWarehouseId;
  payMethod: WingsGardenPayMethod;
  payLabel: string;
  usedAt: string;
  originSummary: string;
}

export interface WingsGardenAirshipOrder {
  id: string;
  requesterName: string;
  skuId: string;
  itemName: string;
  warehouseId: WingsGardenWarehouseId;
  createdAt: string;
  dueAt: string;
}

export interface WingsGardenDarkCloud {
  id: string;
  warehouseId: WingsGardenWarehouseId;
  text: string;
  kind: 'RIPE_SHELL' | 'LOW_STOCK' | 'EXPIRED_GLUE';
  createdAt: string;
}

export interface WingsGardenLedgerEntry {
  id: string;
  time: string;
  type: string;
  message: string;
}

export interface WingsGardenIslandState {
  warehouseId: WingsGardenWarehouseId;
  lightHp: number;
  harvestedToday: number;
  comboCount: number;
  emergencyOffDate: string;
  emergencyOffCountToday: number;
  items: WingsGardenOverlayItem[];
  usedHistory: WingsGardenUsedRecord[];
  airshipOrders: WingsGardenAirshipOrder[];
  darkClouds: WingsGardenDarkCloud[];
  ledger: WingsGardenLedgerEntry[];
  qrStageRewards?: Record<string, WingsGardenQrStageRecord>;
  updatedAt: string;
}

export interface WingsGardenLegacyQrLookup {
  found: boolean;
  legacyOnline: boolean;
  rawCode: string;
  cleanedCode: string;
  numericSerial: number | null;
  inventoryWarehouseItemId: number | null;
  inventoryWarehouseId: number | null;
  warehouseName: string | null;
  inventoryItemId: number | null;
  itemCode: string | null;
  itemName: string | null;
  itemUnit: string | null;
  legacyState: string | null;
  retailPriceVnd: number | null;
  matchedSkuId: string | null;
  matchedSkuName: string | null;
  overlayState: 'USING' | 'USED' | null;
  overlayOwnerName: string | null;
  legacyTimeline: WingsGardenItemTimelineEntry[];
}

export interface WingsGardenLiveSampleQr {
  scanCode: string;
  serialNumber: number;
  legacyWarehouseItemId: number;
  legacyItemId: number;
  legacyItemName: string;
  skuId: string | null;
  skuName: string;
  retailPriceVnd: number;
  warehouseId: WingsGardenWarehouseId;
  isLiveFromDb: boolean;
}

export interface WingsGardenMandatorySkuStatus {
  skuId: string;
  name: string;
  category: WingsGardenCategory;
  status: 'OK' | 'RIPE' | 'EXPIRED' | 'MISSING';
  activeCount: number;
}

export interface WingsGardenMandatoryCoverage {
  totalRequired: number;
  coveredCount: number;
  ripeCount: number;
  expiredCount: number;
  items: WingsGardenMandatorySkuStatus[];
}

export interface WingsGardenLegacyWarehouseCounts {
  warehouseId: WingsGardenWarehouseId;
  legacyOnline: boolean;
  totalNew: number;
  totalUsing: number;
  totalUsed: number;
  totalLost: number;
  bySkuNew: Record<string, number>;
  sampleNewStickers: WingsGardenLiveSampleQr[];
}

export interface WingsGardenReportsSummary {
  report1NewCount: number;
  report1LegacyNewCount: number;
  report2UsingCount: number;
  report2PersonalUsing: number;
  report2SharedUsing: number;
  report3UsedTodayCount: number;
  report4WalletFeathers: number;
  report4CashSpentVnd: number;
  report4CashOrdersCount: number;
  report5DeThamLightHp: number;
  report5EstellaLightHp: number;
  report7ActiveSkuCount: number;
  report8SuggestedReorderCount: number;
  report9LegacyLostBaseline: number;
}

export interface WingsGardenStateResponse {
  success: boolean;
  config: WingsGardenConfig;
  wallet: WingsGardenWallet;
  island: WingsGardenIslandState;
  otherIslandSummary: {
    warehouseId: WingsGardenWarehouseId;
    name: string;
    lightHp: number;
    harvestedToday: number;
    emergencyOffCountToday: number;
  };
  legacyCounts: WingsGardenLegacyWarehouseCounts;
  mandatoryCoverage: WingsGardenMandatoryCoverage;
  hasExpiredGlue: boolean;
  reports: WingsGardenReportsSummary;
  previewRole: WingsGardenPreviewRole;
  actor: {
    id: number;
    displayName: string;
    role: string;
  };
}

export type WingsGardenActionType =
  | 'SIMULATE_SERVICE'
  | 'BONUS_FEATHERS'
  | 'FAST_FORWARD_DAYS'
  | 'SCAN_QR'
  | 'CONSUME_ITEM_STEP'
  | 'CRAFT_WING'
  | 'BUY_CHEST'
  | 'OPEN_CHEST'
  | 'ACTIVATE_PERK'
  | 'DISPATCH_AIRSHIP'
  | 'CREATE_AIRSHIP'
  | 'CREATE_CLOUD'
  | 'CLEAR_CLOUD'
  | 'FM_INSURANCE_REFUND'
  | 'UPDATE_SKU_CONFIG'
  | 'CLAIM_REWARD'
  | 'TRIGGER_EARN_EVENT'
  | 'SCAN_IMPORT_QR'
  | 'SYNC_LEGACY_TODAY'
  | 'SAVE_FEATHER_RULES'
  | 'RESET_PROTOTYPE';

export interface WingsGardenActionRequest {
  action: WingsGardenActionType;
  warehouseId: WingsGardenWarehouseId;
  previewRole?: WingsGardenPreviewRole;
  serviceKind?: 'FULL_SET' | 'REFILL' | 'REMOVE';
  scanCode?: string;
  skuId?: string;
  payMethod?: WingsGardenPayMethod;
  itemUid?: string;
  chestKind?: WingsGardenChestKind;
  perkCardId?: string;
  airshipOrderId?: string;
  cloudId?: string;
  reason?: string;
  amountFeathers?: number;
  listedPriceVnd?: number;
  costFeathers?: number;
  claimId?: string;
  claimAll?: boolean;
  ruleId?: string;
  earnTrigger?: WingsGardenFeatherRuleTrigger;
  featherRules?: WingsGardenFeatherRule[];
}

export interface WingsGardenActionResponse {
  success: boolean;
  message: string;
  chestOutcome?: {
    chestKind: WingsGardenChestKind;
    rewardType: 'PERK' | 'FEATHERS';
    feathersAwarded?: number;
    perkCard?: WingsGardenPerkCard;
  };
  state: WingsGardenStateResponse;
}
