export type WingsComboCategoryId =
  | 'Classic_Volume'
  | 'Classic_1D'
  | 'Volume_2D'
  | 'Volume_3D'
  | 'FlawlessMink'
  | 'HyperLight_2X'
  | 'HyperLight_3X'
  | 'HyperLight_4X'
  | 'HyperLight_5X'
  | 'IvyLight_3L'
  | 'IvyLight_4L'
  | 'IvyLight_5L'
  | 'UltraLight_3D'
  | 'UltraLight_4D'
  | 'UltraLight_5D'
  | 'VVIP';

export type WingsComboPackageKind = 'mixed_new_refill' | 'new_only' | 'vvip_pass';

export interface WingsComboCardImage {
  id: string;
  image: string;
  type: 'header' | 'card' | string;
  preview: string;
  previewSrcset?: string;
}

export interface WingsComboUnitPrice {
  volume: number | 'under';
  newPrice: number;
  refillPrice: number;
  serviceKey?: string;
  label?: string;
  isUnderLash?: boolean;
}

export interface WingsComboRulePrice {
  volume: number | 'under';
  newPrice: number;
  refillPrice: number;
  retailTotal: number;
  comboPrice: number;
  serviceKey?: string;
  label?: string;
  isUnderLash?: boolean;
}

export interface WingsComboRule {
  name: string;
  content: string;
  validityMonths: number;
  discountPct: number;
  note?: string;
  isWelcomePackage: boolean;
  packageKind: WingsComboPackageKind | string;
  comboNewCount: number;
  comboRefillCount: number;
  bonusNewCount: number;
  bonusRefillCount: number;
  totalPaidSessions: number;
  totalBonusSessions: number;
  totalSessions: number;
  imageId?: number;
  cardImageUrl: string;
  cardPreviewUrl: string;
  special?: string;
  fixedPrice?: number;
  prices: WingsComboRulePrice[];
}

export interface WingsComboCategory {
  id: WingsComboCategoryId;
  name: string;
  theme: string;
  segment: string;
  images: WingsComboCardImage[];
  unitPrices: WingsComboUnitPrice[];
  rules: WingsComboRule[];
}

export interface VolumeFiberMetadata {
  skuCode: number | 'under';
  countPerEye: number;
  totalFibers: number;
  unitWord: 'trụ' | 'fan' | 'sợi';
  specLabel: string;
  fanLabel: string;
  shortLabel: string;
  detailLabel: string;
  levelCode?: string;
  badge?: 'BEST SELLER' | 'MOST POPULAR';
}

export interface WelcomeComboEligibilityResult {
  eligible: boolean;
  isFirstDayService: boolean;
  visitCount: number;
  reason: string;
  badgeText: string;
}

export interface MatchedComboPackageOption {
  id: string;
  categoryId: WingsComboCategoryId;
  categoryName: string;
  ruleName: string;
  displayName: string;
  shortRuleLabel: string;
  volume: number | 'under';
  volumeMeta: VolumeFiberMetadata;
  packageKind: WingsComboPackageKind | string;
  isWelcomePackage: boolean;
  isLocked: boolean;
  lockReason?: string;
  validityMonths: number;
  discountPct: number;
  comboNewCount: number;
  comboRefillCount: number;
  bonusNewCount: number;
  bonusRefillCount: number;
  totalPaidSessions: number;
  totalBonusSessions: number;
  totalSessions: number;
  newUnitPrice: number;
  refillUnitPrice: number;
  retailTotal: number;
  comboPrice: number;
  comboPriceWithVat: number;
  savingsAmount: number;
  avgPerSessionPrice: number;
  cvBonus: number;
  /** Tổng giá trị quà tặng thực tế theo giá lẻ = (bonusNewCount * newUnitPrice) + (bonusRefillCount * refillUnitPrice) */
  bonusRetailValue: number;
  cardImageUrl: string;
  cardPreviewUrl: string;
  readableContent: string;
  specialNote?: string;
  theme?: string;
  allVolumePrices?: WingsComboRulePrice[];
}

export interface ComboPurchaseAccountingBreakdown {
  mode: 'BUY_NEW_COMBO';
  packageId: string;
  packageName: string;
  categoryId: WingsComboCategoryId;
  categoryName: string;
  ruleName: string;
  volume: number | 'under';
  comboPrice: number;
  comboPriceWithVat: number;
  retailTotal: number;
  savingsAmount: number;
  /** Khi mua gói mới tại Checkout: trừ luôn buổi đầu tiên vào gói, khách KHÔNG phải trả tiền lẻ buổi hôm nay */
  todaySingleServiceWaived: boolean;
  todaySingleServiceOriginalPrice: number;
  todayServiceChargeToCustomer: number;
  /** Kế toán doanh thu thực hiện vs doanh thu chờ phân bổ (Deferred Revenue) */
  recognizedRevenueToday: number;
  deferredRevenueBalance: number;
  avgPerSessionPrice: number;
  /** Số lượt trong ví gói (Tách bạch Lượt Mua vs Lượt Tặng 0đ theo chuẩn FIFO) */
  initialWallet: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalSessions: number;
  };
  deductedToday: {
    sessionType: 'PAID_NEW' | 'VVIP_PASS';
    count: 1;
    recognizedValue: number;
  };
  remainingWalletAfterToday: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalPaidRemaining: number;
    totalBonusRemaining: number;
    totalRemaining: number;
  };
  cvComboBonus: number;
  /** Tổng giá trị quà tặng thực tế theo giá lẻ ban đầu */
  bonusRetailValue: number;
  /** Giá trị các buổi tặng còn lại trong ví sau ca hôm nay */
  bonusRemainingRetailValue: number;
  accountingSummaryNote: string;
}

export interface ComboRedemptionAccountingBreakdown {
  mode: 'REDEEM_EXISTING_COMBO';
  comboName: string;
  categoryId: WingsComboCategoryId;
  baseVolume: number | 'under';
  targetVolume: number | 'under';
  requestedServiceType: 'Normal' | 'Retain';
  isWithin25DayCycle: boolean;
  /** Loại lượt bị trừ trong ví: ưu tiên trừ Lượt Mua (PAID) trước, hết lượt mua mới trừ Lượt Tặng (BONUS 0đ) */
  deductedBucket: 'PAID_NEW' | 'PAID_REFILL' | 'BONUS_NEW' | 'BONUS_REFILL' | 'CONVERTED_REFILL_TO_NEW';
  /** Phụ thu tự động nếu ví chỉ còn lượt Refill mà khách làm Nối Mới (hoặc quá hạn 25 ngày) */
  typeConversionSurcharge: number;
  /** Phụ thu tự động nếu khách nâng cấp số sợi (Up-size Volume) hoặc đổi lên dòng mi cao hơn */
  upgradeVolumeSurcharge: number;
  /** Tổng tiền khách cần trả thêm hôm nay (0đ nếu đúng gói & còn lượt phù hợp) */
  totalCustomerPayToday: number;
  totalCustomerPayTodayWithVat: number;
  /** Doanh thu ghi nhận cho ca làm hôm nay (Lượt Mua = đơn giá gốc + phụ thu; Lượt Tặng = 0đ + phụ thu) */
  recognizedRevenueToday: number;
  walletBefore: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalRemaining: number;
  };
  walletAfter: {
    paidNew: number;
    paidRefill: number;
    bonusNew: number;
    bonusRefill: number;
    totalRemaining: number;
  };
  explanation: string;
}

export interface LashFamilySibling {
  categoryId: WingsComboCategoryId;
  levelKey: string;
  levelLabel: string;
  shortLabel: string;
  unitWord: 'trụ' | 'fan' | 'sợi';
  fibersPerUnit: number;
  fiberDensityLabel: string;
}

export interface LashFamilyInfo {
  familyKey: 'HyperLight' | 'IvyLight' | 'UltraLight' | 'Classic' | 'Volume' | 'Mink' | 'Classic_Flawless' | 'VVIP';
  familyName: string;
  siblings: LashFamilySibling[];
}

export interface SavedComboSeed {
  id?: string | null;
  name?: string | null;
  ruleName?: string | null;
  categoryId?: string | null;
  volume?: number | 'under' | null;
  price?: number | null;
}
