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

export const DEFAULT_WINGS_GARDEN_FEATHER_RULES: WingsGardenFeatherRule[] = [
  {
    ruleId: 'rule-lash-full-set',
    trigger: 'LASH_FULL_SET',
    label: 'Nối Mi Mới (Full Set)',
    description: 'Mỗi ca nối mi trên hoàn tất (tính 1.0 bộ vào mốc ngày)',
    enabled: true,
    feathers: 12,
    claimMode: 'AUTO',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    isSystem: true,
  },
  {
    ruleId: 'rule-lash-refill',
    trigger: 'LASH_REFILL',
    label: 'Dặm Mi (Retain / Refill)',
    description: 'Mỗi ca dặm mi; Admin chỉnh được hệ số quy đổi vào mốc ngày',
    enabled: true,
    feathers: 6,
    claimMode: 'AUTO',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    refillSetWeight: 0.5,
    isSystem: true,
  },
  {
    ruleId: 'rule-daily-milestone',
    trigger: 'DAILY_LASH_MILESTONE',
    label: 'Mốc Nối Mi Theo Ngày (3 / 4 / 5 bộ)',
    description: 'Thưởng bậc thang theo số bộ đạt được trong ngày (tự cộng cuối ngày nếu quên bấm)',
    enabled: true,
    feathers: 15,
    claimMode: 'CLAIM',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    milestoneTiers: [
      { id: 'm3', thresholdSets: 3, feathers: 15, bonusChest: null },
      { id: 'm4', thresholdSets: 4, feathers: 20, bonusChest: null },
      { id: 'm5', thresholdSets: 5, feathers: 30, bonusChest: 'bronze' },
    ],
    isSystem: true,
  },
  {
    ruleId: 'rule-bottom-lash',
    trigger: 'BOTTOM_LASH',
    label: 'Nối 1 Bộ Mi Dưới (Under)',
    description: 'Hoàn tất dịch vụ nối mi dưới cho khách',
    enabled: true,
    feathers: 8,
    claimMode: 'CLAIM',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    isSystem: true,
  },
  {
    ruleId: 'rule-serum-upsell',
    trigger: 'SERUM_UPSELL',
    label: 'Bán 1 Cây Dưỡng Mi (Serum)',
    description: 'Ghi nhận chốt sản phẩm dưỡng mi cho khách hàng',
    enabled: true,
    feathers: 15,
    claimMode: 'CLAIM',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    isSystem: true,
  },
  {
    ruleId: 'rule-customer-combo',
    trigger: 'CUSTOMER_COMBO_BUY',
    label: 'Khách Mới Nối Mi Mua Combo',
    description: 'Thưởng cho Chuyên Viên vừa nối mi khi khách đó mua gói Combo',
    enabled: true,
    feathers: 25,
    claimMode: 'CLAIM',
    roles: ['CV', 'CVL', 'CVLL', 'ADMIN'],
    comboAttributionWindowDays: 0,
    isSystem: true,
  },
  {
    ruleId: 'rule-scan-import',
    trigger: 'SCAN_IMPORT',
    label: 'Scan Nhập Hàng Vào Kho (NEW)',
    description: 'Mỗi Unique QR nhập kho shop nhận tối đa 1 lần',
    enabled: true,
    feathers: 1,
    claimMode: 'AUTO',
    roles: ['CVLL', 'FM', 'ADMIN'],
    isSystem: true,
  },
  {
    ruleId: 'rule-scan-using',
    trigger: 'SCAN_USING',
    label: 'Scan Bắt Đầu Dùng (USING)',
    description: 'Mỗi Unique QR quét mở nắp dùng tại bàn nghề nhận tối đa 1 lần',
    enabled: true,
    feathers: 2,
    claimMode: 'AUTO',
    roles: ['CV', 'CVL', 'CVLL', 'FM', 'ADMIN'],
    isSystem: true,
  },
  {
    ruleId: 'rule-scan-used',
    trigger: 'SCAN_USED',
    label: 'Scan Kết Thúc Sản Phẩm (USED)',
    description: 'Mỗi Unique QR gặt vỏ dùng hết nhận thêm thưởng (+ Lông Tái Sinh)',
    enabled: true,
    feathers: 3,
    claimMode: 'AUTO',
    roles: ['CV', 'CVL', 'CVLL', 'FM', 'ADMIN'],
    isSystem: true,
  },
];

const DEFAULT_WINGS_GARDEN_SKUS: WingsGardenSkuConfig[] = [
  // 24 Mandatory CV / CVL Kit Items (IMG_5958.heic)
  {
    skuId: 'keo-den',
    name: 'Keo Đen (Wings SH)',
    legacyName: 'Glue - Wings SH (X1 5G · #714)',
    category: 'GLUE',
    unit: 'Túi/Lọ',
    listedPriceVnd: 95000,
    costFeathers: 28,
    cashbackFeathers: 4,
    freshnessDays: 21,
    isMandatoryCvKit: true,
    legacyItemIds: [714, 703],
    keywords: ['wings sh', 'keo đen', 'strong hold'],
  },
  {
    skuId: 'keo-xanh',
    name: 'Keo Xanh (Sky Zone)',
    legacyName: 'Glue Sky zone (X1 5ML · #293)',
    category: 'GLUE',
    unit: 'Túi/Lọ',
    listedPriceVnd: 96000,
    costFeathers: 28,
    cashbackFeathers: 4,
    freshnessDays: 21,
    isMandatoryCvKit: true,
    legacyItemIds: [293, 294],
    keywords: ['sky zone', 'glue', 'keo xanh'],
  },
  {
    skuId: 'bong-tam-lon',
    name: 'Bông Tăm Lớn',
    legacyName: 'Cotton Bud / Sky (#273)',
    category: 'SWAB',
    unit: 'Hộp',
    listedPriceVnd: 30000,
    costFeathers: 10,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [273, 469],
    keywords: ['cotton bud', 'bông tăm lớn', 'bông ráy tai'],
  },
  {
    skuId: 'bong-tam-nho',
    name: 'Bông Tăm Nhỏ (Micro Brush)',
    legacyName: 'Micro brush (bag · X4 X100 · #702)',
    category: 'SWAB',
    unit: 'Túi',
    listedPriceVnd: 28000,
    costFeathers: 9,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [702, 278],
    keywords: ['micro brush', 'bông tăm nhỏ'],
  },
  {
    skuId: 'bang-keo-gai',
    name: 'Băng Keo Gai',
    legacyName: 'Tape Eyelash Plastic - 12mm (#279)',
    category: 'TAPE',
    unit: 'Hộp',
    listedPriceVnd: 85000,
    costFeathers: 24,
    cashbackFeathers: 4,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [279],
    keywords: ['tape eyelash plastic', 'băng keo gai'],
  },
  {
    skuId: 'bang-keo-nhat',
    name: 'Băng Keo Nhật',
    legacyName: 'Tape Eyelash Silk Japan - 12mm (#718)',
    category: 'TAPE',
    unit: 'Hộp',
    listedPriceVnd: 122000,
    costFeathers: 35,
    cashbackFeathers: 5,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [718],
    keywords: ['silk japan', 'băng keo nhật'],
  },
  {
    skuId: 'bang-keo-lua',
    name: 'Băng Keo Lụa',
    legacyName: 'Tape Eyelash Silk - 12mm (#694)',
    category: 'TAPE',
    unit: 'Cuộn/Hộp',
    listedPriceVnd: 46000,
    costFeathers: 14,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [694],
    keywords: ['tape eyelash silk', 'băng keo lụa'],
  },
  {
    skuId: 'bang-keo-2-mat',
    name: 'Băng Keo 2 Mặt',
    legacyName: 'Double Sided Tape - 5mm (#364)',
    category: 'TAPE',
    unit: 'Hộp',
    listedPriceVnd: 10000,
    costFeathers: 3,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [364],
    keywords: ['double sided tape', 'keo hai mặt', 'băng keo 2 mặt'],
  },
  {
    skuId: 'eyepatch-gel',
    name: 'Eyepatch Gel',
    legacyName: 'Eyepad - Gel (X50 · #284)',
    category: 'EYEPAD',
    unit: 'Hộp',
    listedPriceVnd: 26000,
    costFeathers: 8,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [284],
    keywords: ['eyepad - gel', 'eyepad cô gái'],
  },
  {
    skuId: 'eyepatch-vuong',
    name: 'Eyepatch Vuông',
    legacyName: 'Eyepad (#592)',
    category: 'EYEPAD',
    unit: 'Hộp',
    listedPriceVnd: 30000,
    costFeathers: 10,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [592],
    keywords: ['eyepatch vuông'],
  },
  {
    skuId: 'eyepatch-cong',
    name: 'Eyepatch Cong',
    legacyName: 'Eyepad - Small (#283)',
    category: 'EYEPAD',
    unit: 'Hộp',
    listedPriceVnd: 50000,
    costFeathers: 15,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [283],
    keywords: ['eyepad - small', 'eyepad cong'],
  },
  {
    skuId: 'eyepatch-giay',
    name: 'Eyepatch Giấy',
    legacyName: 'Eyepad Giấy',
    category: 'EYEPAD',
    unit: 'Hộp',
    listedPriceVnd: 20000,
    costFeathers: 6,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [],
    keywords: ['eyepad giấy', 'eyepatch giấy'],
  },
  {
    skuId: 'nuoc-muoi',
    name: 'Nước Muối Sinh Lý',
    legacyName: 'Saline Water (X10 10ML · #281)',
    category: 'SOLUTION',
    unit: 'Hộp',
    listedPriceVnd: 25000,
    costFeathers: 8,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [281],
    keywords: ['saline water', 'nước nhỏ mắt', 'nước muối'],
  },
  {
    skuId: 'nuoc-tay-trang',
    name: 'Nước Tẩy Trang',
    legacyName: 'Makeup Remover (X1 150ML · #289)',
    category: 'SOLUTION',
    unit: 'Chai/Hộp',
    listedPriceVnd: 60000,
    costFeathers: 18,
    cashbackFeathers: 3,
    freshnessDays: 120,
    isMandatoryCvKit: true,
    legacyItemIds: [289],
    keywords: ['makeup remover', 'tẩy trang'],
  },
  {
    skuId: 'bong-tay-trang',
    name: 'Bông Tẩy Trang',
    legacyName: 'Cotton Pad (X1000 · #291)',
    category: 'SOLUTION',
    unit: 'Hộp/Túi',
    listedPriceVnd: 35000,
    costFeathers: 11,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [291],
    keywords: ['cotton pad', 'bông tẩy trang'],
  },
  {
    skuId: 'sap-thao-mi',
    name: 'Sáp Tháo Mi',
    legacyName: 'Remover Gold Star (X1 5G · #741)',
    category: 'SOLUTION',
    unit: 'Hũ/Hộp',
    listedPriceVnd: 30000,
    costFeathers: 10,
    cashbackFeathers: 2,
    freshnessDays: 90,
    isMandatoryCvKit: true,
    legacyItemIds: [741, 388],
    keywords: ['gold star', 'sáp tháo'],
  },
  {
    skuId: 'remove-xanh',
    name: 'Remove Xanh',
    legacyName: 'Remover Liquid Korea (X1 15G · #744)',
    category: 'SOLUTION',
    unit: 'Chai/Hũ',
    listedPriceVnd: 40000,
    costFeathers: 12,
    cashbackFeathers: 2,
    freshnessDays: 90,
    isMandatoryCvKit: true,
    legacyItemIds: [744],
    keywords: ['remover liquid', 'remove xanh'],
  },
  {
    skuId: 'protein-do',
    name: 'Protein Đỏ',
    legacyName: 'Protein Remover (X1 10ML · #295)',
    category: 'SOLUTION',
    unit: 'Chai/Hộp',
    listedPriceVnd: 56000,
    costFeathers: 17,
    cashbackFeathers: 3,
    freshnessDays: 90,
    isMandatoryCvKit: true,
    legacyItemIds: [295, 623],
    keywords: ['protein remover', 'protein đỏ'],
  },
  {
    skuId: 'primer',
    name: 'Primer',
    legacyName: 'Primer (X1 15ML · #280)',
    category: 'SOLUTION',
    unit: 'Chai/Hộp',
    listedPriceVnd: 109000,
    costFeathers: 32,
    cashbackFeathers: 5,
    freshnessDays: 90,
    isMandatoryCvKit: true,
    legacyItemIds: [280],
    keywords: ['primer'],
  },
  {
    skuId: 'debonder',
    name: 'Debonder',
    legacyName: 'Debonder (X1 10ML · #274)',
    category: 'SOLUTION',
    unit: 'Chai/Hộp',
    listedPriceVnd: 32000,
    costFeathers: 10,
    cashbackFeathers: 2,
    freshnessDays: 90,
    isMandatoryCvKit: true,
    legacyItemIds: [274],
    keywords: ['debonder'],
  },
  {
    skuId: 'bot-rua-mi',
    name: 'Bọt Rửa Mi',
    legacyName: 'Lash Shampoo - Rose (X1 50ML · #745)',
    category: 'HYGIENE',
    unit: 'Chai',
    listedPriceVnd: 21000,
    costFeathers: 7,
    cashbackFeathers: 1,
    freshnessDays: 60,
    isMandatoryCvKit: true,
    legacyItemIds: [745],
    keywords: ['lash shampoo', 'bọt rửa'],
  },
  {
    skuId: 'chai-mi',
    name: 'Cây Chải Mi',
    legacyName: 'Eyelash Brush (#275 · #716)',
    category: 'HYGIENE',
    unit: 'Hộp/Gói',
    listedPriceVnd: 37000,
    costFeathers: 11,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [275, 716, 719, 701],
    keywords: ['eyelash brush', 'chải mi'],
  },
  {
    skuId: 'khan-giay',
    name: 'Khăn Giấy',
    legacyName: 'Tissue (X250 · #767)',
    category: 'HYGIENE',
    unit: 'Hộp/Gói',
    listedPriceVnd: 20000,
    costFeathers: 6,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [767, 287],
    keywords: ['tissue', 'khăn giấy'],
  },
  {
    skuId: 'bao-rac',
    name: 'Bao Rác',
    legacyName: 'Garbage Bags - 45x55 (#306)',
    category: 'HYGIENE',
    unit: 'Cuộn/Hộp',
    listedPriceVnd: 25000,
    costFeathers: 8,
    cashbackFeathers: 1,
    freshnessDays: null,
    isMandatoryCvKit: true,
    legacyItemIds: [306],
    keywords: ['garbage bags', 'bao rác', 'túi rác'],
  },
  // Extra operational SKUs (Handwritten note + Shared Lash Trays)
  {
    skuId: 'khau-trang',
    name: 'Khẩu Trang',
    legacyName: 'Face Mask (X50 · #479)',
    category: 'HYGIENE',
    unit: 'Hộp',
    listedPriceVnd: 35000,
    costFeathers: 11,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: false,
    legacyItemIds: [479, 277],
    keywords: ['face mask', 'khẩu trang'],
  },
  {
    skuId: 'khay-mi-lua',
    name: 'Khay Mi Lụa 0.07 / 0.10',
    legacyName: 'Mi SILK 1D 0-07 / 0-10 (C/B/D)',
    category: 'LASH',
    unit: 'Khay',
    listedPriceVnd: 45000,
    costFeathers: 14,
    cashbackFeathers: 2,
    freshnessDays: null,
    isMandatoryCvKit: false,
    isSharedDefault: true,
    legacyItemIds: [],
    keywords: ['mi silk 1d', 'mi lụa'],
  },
  {
    skuId: 'khay-mi-hyper',
    name: 'Khay Mi Hyper 3X / 4X',
    legacyName: 'Mi HL SILK 3X1 / 4X 0-05',
    category: 'LASH',
    unit: 'Khay',
    listedPriceVnd: 50000,
    costFeathers: 16,
    cashbackFeathers: 3,
    freshnessDays: null,
    isMandatoryCvKit: false,
    isSharedDefault: true,
    legacyItemIds: [833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850],
    keywords: ['mi hl silk', 'mi hyper'],
  },
];

export const DEFAULT_WINGS_GARDEN_CONFIG: WingsGardenConfig = {
  version: 1,
  serviceEarn: {
    fullSet: 12,
    refill: 6,
    removeOrSpa: 3,
  },
  overdraftFloor: WINGS_GARDEN_OVERDRAFT_FLOOR,
  skus: DEFAULT_WINGS_GARDEN_SKUS,
  wingTiers: [
    {
      tier: 1,
      name: 'Cánh Sương Mai',
      costFeathers: 50,
      bonusChest: 'bronze',
      description: 'Đôi cánh trắng bạc tinh khôi hiện trên Đảo Thiên Đường',
      primaryColor: '#e2e8f0',
      accentColor: '#94a3b8',
    },
    {
      tier: 2,
      name: 'Cánh Nắng Vàng',
      costFeathers: 120,
      bonusChest: 'silver',
      description: 'Đôi cánh vàng kim Wings toả nắng bình minh',
      primaryColor: '#fde047',
      accentColor: '#f59e0b',
    },
    {
      tier: 3,
      name: 'Cánh Pha Lê Thiên Đường',
      costFeathers: 250,
      bonusChest: 'gold',
      description: 'Đôi cánh pha lê xanh ngọc viền vàng lấp lánh',
      primaryColor: '#38bdf8',
      accentColor: '#fbbf24',
    },
    {
      tier: 4,
      name: 'Cánh Hoàng Kim Nghệ Nhân',
      costFeathers: 500,
      bonusChest: 'gold',
      description: 'Đôi cánh hào quang kép huyền thoại toàn chuỗi Wings',
      primaryColor: '#fbbf24',
      accentColor: '#b45309',
    },
  ],
  chests: {
    bronze: {
      kind: 'bronze',
      name: 'Rương Đồng',
      buyCostFeathers: 40,
      perkKind: 'LATE_30',
      perkTitle: 'Thẻ Đi Trễ Êm Ái ≤30p',
      perkRule: '1 lần đi trễ không quá 30 phút (không trừ hạnh kiểm)',
      perkValidDays: 60,
      featherMin: 15,
      featherMax: 30,
    },
    silver: {
      kind: 'silver',
      name: 'Rương Bạc',
      buyCostFeathers: 90,
      perkKind: 'EARLY_30',
      perkTitle: 'Thẻ Về Sớm Thảnh Thơi ≤30p',
      perkRule: '1 lần về sớm không quá 30 phút (không trừ hạnh kiểm)',
      perkValidDays: 75,
      featherMin: 35,
      featherMax: 60,
    },
    gold: {
      kind: 'gold',
      name: 'Rương Vàng',
      buyCostFeathers: 150,
      perkKind: 'OFF_DAY',
      perkTitle: 'Thẻ Vàng Off Gấp 1 Ngày',
      perkRule: '1 ngày off gấp không bị trừ hạnh kiểm (tối đa 1 slot/shop/ngày)',
      perkValidDays: 90,
      featherMin: 80,
      featherMax: 120,
    },
  },
  featherRules: DEFAULT_WINGS_GARDEN_FEATHER_RULES,
  updatedAt: '2026-11-19T00:00:00.000Z',
};

export function normalizeWingsGardenScanCode(raw: string): {
  cleaned: string;
  numericSerial: number | null;
} {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return { cleaned: '', numericSerial: null };
  const stripped = cleaned.replace(/^#/, '').trim();
  const numericSerial = /^\d{4,12}$/.test(stripped) ? Number(stripped) : null;
  return { cleaned, numericSerial };
}

export function matchWingsGardenSku(
  legacyItemId: number | null | undefined,
  legacyItemName: string | null | undefined,
  config: WingsGardenConfig = DEFAULT_WINGS_GARDEN_CONFIG
): WingsGardenSkuConfig | null {
  const numId = Number(legacyItemId || 0);
  if (numId > 0) {
    const byId = config.skus.find((sku) => sku.legacyItemIds.includes(numId));
    if (byId) return byId;
  }
  const haystack = String(legacyItemName || '').toLowerCase();
  if (!haystack) return null;
  return config.skus.find((sku) => sku.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) || null;
}

export function computeItemDaysOpened(item: WingsGardenOverlayItem, nowMs: number = Date.now()): number {
  const openedMs = Date.parse(item.openedAt);
  const baseDays = Number.isFinite(openedMs) ? Math.max(0, Math.floor((nowMs - openedMs) / 86400000)) : 0;
  return baseDays + Math.max(0, Number(item.daysOffset || 0));
}

export function isWingsGardenGlueExpired(item: WingsGardenOverlayItem, nowMs: number = Date.now()): boolean {
  if (item.state !== 'USING') return false;
  if (item.category !== 'GLUE') return false;
  const limit = item.freshLimitDays ?? WINGS_GARDEN_GLUE_FRESHNESS_DAYS;
  return computeItemDaysOpened(item, nowMs) > limit;
}

export function hasExpiredGlueInItems(items: WingsGardenOverlayItem[], nowMs: number = Date.now()): boolean {
  return items.some((item) => isWingsGardenGlueExpired(item, nowMs));
}

export function computeMandatoryKitCoverage(
  items: WingsGardenOverlayItem[],
  config: WingsGardenConfig = DEFAULT_WINGS_GARDEN_CONFIG,
  nowMs: number = Date.now()
): WingsGardenMandatoryCoverage {
  const mandatorySkus = config.skus.filter((s) => s.isMandatoryCvKit);
  let coveredCount = 0;
  let ripeCount = 0;
  let expiredCount = 0;

  const statuses: WingsGardenMandatorySkuStatus[] = mandatorySkus.map((sku) => {
    const active = items.filter((it) => it.state === 'USING' && it.skuId === sku.skuId);
    if (active.length === 0) {
      return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'MISSING', activeCount: 0 };
    }
    coveredCount += 1;
    const anyExpired = active.some((it) => isWingsGardenGlueExpired(it, nowMs));
    if (anyExpired) {
      expiredCount += 1;
      return {
        skuId: sku.skuId,
        name: sku.name,
        category: sku.category,
        status: 'EXPIRED',
        activeCount: active.length,
      };
    }
    const anyRipe = active.some((it) => it.remainingPct <= 0);
    if (anyRipe) {
      ripeCount += 1;
      return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'RIPE', activeCount: active.length };
    }
    return { skuId: sku.skuId, name: sku.name, category: sku.category, status: 'OK', activeCount: active.length };
  });

  return {
    totalRequired: mandatorySkus.length,
    coveredCount,
    ripeCount,
    expiredCount,
    items: statuses,
  };
}

export function computeWingsGardenEconomyPreview(config: WingsGardenConfig): WingsGardenEconomyPreview {
  const rules = Array.isArray(config.featherRules) ? config.featherRules : DEFAULT_WINGS_GARDEN_FEATHER_RULES;
  const findRule = (trigger: WingsGardenFeatherRule['trigger']) => rules.find((r) => r.trigger === trigger);

  const fullRule = findRule('LASH_FULL_SET');
  const refillRule = findRule('LASH_REFILL');
  const msRule = findRule('DAILY_LASH_MILESTONE');
  const bottomRule = findRule('BOTTOM_LASH');
  const serumRule = findRule('SERUM_UPSELL');
  const usingRule = findRule('SCAN_USING');
  const usedRule = findRule('SCAN_USED');

  const fullGain = fullRule?.enabled ? fullRule.feathers : 0;
  const refillGain = refillRule?.enabled ? refillRule.feathers : 0;
  const refillWeight = typeof refillRule?.refillSetWeight === 'number' ? refillRule.refillSetWeight : 0.5;
  const standardSets = 3 + refillWeight;

  const milestoneGain =
    msRule?.enabled && Array.isArray(msRule.milestoneTiers)
      ? msRule.milestoneTiers
          .filter((tier) => standardSets >= tier.thresholdSets)
          .reduce((sum, tier) => sum + tier.feathers, 0)
      : 0;

  const bottomGain = bottomRule?.enabled ? bottomRule.feathers : 0;
  const serumGain = serumRule?.enabled ? serumRule.feathers : 0;
  const scanGain = (usingRule?.enabled ? usingRule.feathers : 0) * 2 + (usedRule?.enabled ? usedRule.feathers : 0) * 2;

  const total = 3 * fullGain + refillGain + milestoneGain + bottomGain + serumGain + scanGain;
  const glueSku = config.skus.find((s) => s.skuId === 'keo-den') || config.skus[0];
  const glueCost = Math.max(1, glueSku?.costFeathers || 28);
  const glueBottleEquivalent = Number((total / glueCost).toFixed(1));
  const wing2Cost = config.wingTiers.find((w) => w.tier === 2)?.costFeathers || 120;
  const wing2Pct = Math.min(999, Math.round((total / Math.max(1, wing2Cost)) * 100));

  return {
    standardDayFeathers: total,
    glueBottleEquivalent,
    wing2Pct,
    breakdown: `3 nối mới + 1 dặm + mốc ${standardSets} bộ + 1 mi dưới + 1 dưỡng mi + quét 2 tem`,
  };
}
