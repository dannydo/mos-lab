import type { ComboTodayUsageMode } from '../../catalog/combo-expiry.js';
import type { IosPromotionOption } from '../ios-promotions.js';
import type { IosCvSelfSpeedHistoryProfile, IosSelfChallengeTierKey } from '../../utils/ios-self-challenge.js';
import type { IosServicingRound } from '../../utils/ios-servicing-rounds.js';
import type { CvToCvPlusRequirements } from '../career-progression.js';

export type IosUserRole = 'CVL' | 'CVLL' | 'CC' | 'CV' | 'STORE' | 'INVENTORY';
export type BookingScopeMode = 'MY_CUSTOMERS' | 'STORE_ALL';
export type CustomerBookingTab = 'INCOMING' | 'SERVICING' | 'DONE' | 'CANCEL';
export type IosBookingStatus = 'INCOMING' | 'CHECKED_IN' | 'SERVICING' | 'DONE' | 'CANCELLED';
export type IosSettlementStatus =
  | 'SETTLED_COMPLETED'
  | 'PENDING_COUNTER_SETTLEMENT'
  | 'PENDING_POST_CHECKOUT_ADJUSTMENT'
  | 'DEMO_ONLY'
  | 'BRIDGE_DEFERRED';

export const IOS_SIM_BOOKING_ID_MIN = 900_000_000;

export function isIosSyntheticSimBookingId(bookingId: number | string | null | undefined): boolean {
  const num = Number(bookingId);
  return Number.isFinite(num) && num >= IOS_SIM_BOOKING_ID_MIN;
}

export interface IosBranchConfig {
  id: number;
  code: string;
  name: string;
  shortName: string;
  address: string;
  receiptName: string;
}

export interface IosSegmentCounts {
  incoming: number;
  servicing: number;
  done: number;
  cancel: number;
}

export interface IosStaffMonthlyStats {
  staffId: number;
  month: number;
  monthLabel: string;
  monthlyRevenue: number;
  monthlyRevenueFormatted: string;
  completedShiftsCount: number;
  satisfactionRate: number;
  rating: number;
  completedToday?: number;
  pointsToday?: number;
  monthlyPoints?: number;
  serviceBonusMonth?: number;
  tipEarnedToday?: number;
  tipEarnedMonth?: number;
  comboBonusToday?: number;
  serumBonusToday?: number;
  comboBonusMonth?: number;
  hourlyPayMonth?: number;
  shiftHours?: string;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  cvSelfSpeedHistory?: IosCvSelfSpeedHistoryProfile;
}

export interface IosActiveActorProfile {
  staffId: number;
  name: string;
  tier: 'CVL' | 'CVLL' | 'CV' | 'CC' | 'ADMIN';
  badgeLabel: string;
  avatar?: string;
  storeId?: number;
  branchCode?: string;
  branchName?: string;
}

export interface NaturalLashConsultationAttributes {
  naturalLashLength?: string;
  naturalLashThickness?: string;
  naturalLashCount?: string;
  naturalLashDensity?: string;
  lashTrail?: string;
  eyeShape?: string;
  lashHealth?: string;
  medicalProblem?: string;
  isNewClientDiagnosticDone?: boolean;
}

export interface LashHistoryPhoto {
  type: 'before' | 'cleaned' | 'after';
  label: string;
  url: string;
  sublabel?: string;
}

export interface LashHistoryStaffMember {
  role: string;
  name: string;
  avatar?: string;
  tier?: string;
}

export interface LashHistoryItem {
  id?: number;
  orderId?: number;
  date: string;
  serviceName: string;
  staffName: string;
  rating?: number;
  review?: string;
  bookingNote?: string;
  totalPrice?: number;
  photos?: LashHistoryPhoto[];
  underPhotos?: LashHistoryPhoto[];
  underServiceName?: string;
  staffMembers?: {
    bookedBy?: LashHistoryStaffMember;
    checkInBy?: LashHistoryStaffMember;
    lashedBy?: LashHistoryStaffMember;
    checkOutBy?: LashHistoryStaffMember;
  };
  attributes?: {
    style?: string;
    curl?: string;
    length?: string;
    thickness?: string;
    fanCount?: string;
    volume?: string;
    material?: string;
    color?: string;
    eyeShape?: string;
    naturalLashLength?: string;
    naturalLashThickness?: string;
    notes?: string;
  };
}

export interface ComboPackageOption {
  id: string;
  name: string;
  sessions: number;
  price: number;
  cvBonus: number;
  badge: string;
}

export interface SerumTierOption {
  id: string;
  label: string;
  price: number;
  cvBonus: number;
  desc: string;
}

export interface IosSelectedComboRemaining {
  paidNew: number;
  paidRefill: number;
  bonusNew: number;
  bonusRefill: number;
  totalPaidRemaining: number;
  totalBonusRemaining: number;
  totalRemaining: number;
}

export interface IosSelectedCombo {
  id: string;
  name: string;
  price: number;
  bonus: number;
  sessions: number;
  ruleName?: string;
  categoryId?: string;
  categoryName?: string;
  volume?: number | 'under';
  paidNewCount?: number;
  paidRefillCount?: number;
  bonusNewCount?: number;
  bonusRefillCount?: number;
  validityMonths?: number;
  retailTotal?: number;
  savingsAmount?: number;
  avgPerSessionPrice?: number;
  todaySingleServiceWaived?: boolean;
  todayUsageMode?: ComboTodayUsageMode;
  dateExpired?: string;
  dateExpiredDisplay?: string;
  expiryFormulaSummary?: string;
  revivedExpiredSessions?: number;
  isUpTierUpgrade?: boolean;
  originalServiceCategory?: string;
  recognizedRevenueToday?: number;
  deferredRevenueBalance?: number;
  remainingAfterToday?: IosSelectedComboRemaining;
}

export interface IosSelectedUnderCombo {
  id: string;
  name: string;
  price: number;
  bonus: number;
  sessions: number;
  ruleName?: string;
  validityMonths?: number;
  retailTotal?: number;
  savingsAmount?: number;
  avgPerSessionPrice?: number;
  todaySingleServiceWaived?: boolean;
  todayUsageMode?: ComboTodayUsageMode;
  dateExpired?: string;
  dateExpiredDisplay?: string;
  expiryFormulaSummary?: string;
  revivedExpiredSessions?: number;
  recognizedRevenueToday?: number;
  deferredRevenueBalance?: number;
  remainingAfterToday?: IosSelectedComboRemaining;
}

export interface IosComboRedemption {
  balanceId?: number | null;
  redeemSession?: boolean;
  comboName: string;
  deductedBucket: string;
  typeConversionSurcharge: number;
  upgradeVolumeSurcharge: number;
  totalCustomerPayToday: number;
  recognizedRevenueToday: number;
  remainingAfterToday: number;
  explanation: string;
  totalSessions: number;
  paidRemaining: number;
  bonusRemaining: number;
  dateExpired?: string | null;
  dateExpiredDisplay?: string | null;
}

export interface IosBookingAttributes extends NaturalLashConsultationAttributes {
  style: string;
  curl: string;
  length: string;
  thickness: string;
  material?: string;
  color?: string;
  volume?: string;
  count?: string;
  hasUnderMink?: boolean;
  underMinkServiceType?: 'Normal' | 'Retain';
  underMinkCurl?: string;
  underMinkThickness?: string;
  underMinkLength?: string;
  underMinkCount?: string;
  underMinkColor?: string;
  isOverridden?: boolean;
  overrideReason?: string;
  notes?: string;
}

export interface IosBookingProgress {
  activeServiceRound?: IosServicingRound;
  upperCompleted?: boolean;
  beforePhotoUrl?: string;
  cleanedPhotoUrl?: string;
  afterPhotoUrl?: string;
  beforePhotoSavedAt?: string;
  cleanedPhotoSavedAt?: string;
  afterPhotoSavedAt?: string;
  underBeforePhotoUrl?: string;
  underCleanedPhotoUrl?: string;
  underAfterPhotoUrl?: string;
  underBeforePhotoSavedAt?: string;
  underCleanedPhotoSavedAt?: string;
  underAfterPhotoSavedAt?: string;
  elapsedSeconds: number;
  timerRunning: boolean;
  startedAt?: string;
  completedAt?: string;
  upperStartedAt?: string;
  upperCompletedAt?: string;
  upperElapsedSeconds?: number;
  underStartedAt?: string;
  underCompletedAt?: string;
  underElapsedSeconds?: number;
  currentStep?: number;
  savedAt?: string;
  updatedAt?: string;
  cloudSynced?: boolean;
  cloudSyncedAt?: string;
  retainLashCountLeft?: number;
  retainLashCountRight?: number;
  retainLashes?: { left: number; right: number };
  retainAttributeValues?: Record<string, { attribute_option_value: string; attribute_key: string }>;
  underRetainLashCountLeft?: number;
  underRetainLashCountRight?: number;
  underRetainLashes?: { left: number; right: number };
  underRetainAttributeValues?: Record<string, { attribute_option_value: string; attribute_key: string }>;
  targetDurationMinutes?: number;
  upperTargetDurationMinutes?: number;
  underTargetDurationMinutes?: number;
  selfChallengeTier?: IosSelfChallengeTierKey;
  selfChallengeLabel?: string;
  selfChallengeBaselineMinutes?: number;
  selfChallengeSampleCount?: number;
  selfChallengeSlowerReason?: string;
  lastLegacyProgressState?: string;
  lastLegacyUpperState?: string;
  lastLegacyUnderState?: string;
  lastLegacyUpperPhotoSigs?: Record<string, string>;
  lastLegacyUnderPhotoSigs?: Record<string, string>;
}

export interface IosScannedProductUnit {
  inventoryWarehouseItemId: number;
  firstInventoryWarehouseOrderItemId: number;
  scanCode: string;
}

export interface IosScannedProductCatalogMatch {
  productId: number;
  productSku: string;
  productName: string;
  unitPrice: number;
  cvBonus: number;
  inventoryItemId: number;
  inventoryWarehouseId: number;
  clientStoreId: number;
  storeName?: string | null;
  scannedUnit: IosScannedProductUnit;
}

export interface IosScanProductRequest {
  bookingId: number;
  code: string;
  scannedItemIds?: number[];
}

export interface IosScanProductResponse {
  success: boolean;
  error?: string;
  product?: IosScannedProductCatalogMatch;
}

export interface IosCartProductItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  cvBonus?: number;
  promotionId?: number | null;
  appliedPromotion?: IosPromotionOption | null;
  scannedUnits?: IosScannedProductUnit[];
}
