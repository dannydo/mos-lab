import type { ComboExpiryState, IosCustomerComboWalletItem } from '../../catalog/combo-expiry.js';
import type { IosCvSelfSpeedHistoryProfile } from '../../utils/ios-self-challenge.js';
import type { IosPromotionOption } from '../ios-promotions.js';
import type {
  IosPostCheckoutAdjustmentEntry,
  IosPostCheckoutPaymentMode,
  IosPostCheckoutPendingDraft,
} from '../ios-post-checkout.js';
import type {
  BookingScopeMode,
  IosBookingAttributes,
  IosBookingProgress,
  IosBookingStatus,
  IosCartProductItem,
  IosComboRedemption,
  IosSegmentCounts,
  IosSelectedCombo,
  IosSelectedUnderCombo,
  IosSettlementStatus,
  IosStaffMonthlyStats,
  IosUserRole,
  LashHistoryItem,
} from './booking-models.js';
import type { IosCustomerNoteItem } from './customer-history.js';
import type { IosPaymentBreakdown, IosPaymentMethod } from './scope-and-payments.js';

export interface IosBookingItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId: number;
  customerDateOfBirth?: string | null;
  customerVisits: number;
  customerNote: string;
  timeSlot: string;
  time12h?: string;
  serviceName: string;
  serviceType?: string;
  servicePrice: number;
  serviceDuration: number;
  originalBookedServiceName?: string;
  originalBookedServicePrice?: number;
  upgradePrice?: number;
  cvRotationPoints?: number;
  cvRotationBreakdown?: string;
  bookerName?: string;
  bookerAvatar?: string;
  customerTypeIcon?: string;
  hasDiscountTag?: boolean;
  assignedStaffName?: string;
  assignedStaffId?: number;
  assignedStaffAvatar?: string;
  assignedStaffTier?: string;
  isTrainingCvlOrder?: boolean;
  trainingMentorName?: string;
  checkInStaffId?: number;
  checkInStaffName?: string;
  checkInStaffTier?: string;
  checkInStaffAvatar?: string;
  checkOutStaffId?: number;
  checkOutStaffName?: string;
  checkOutStaffTier?: string;
  checkOutStaffAvatar?: string;
  customerAvatar?: string;
  assignedBed?: string;
  isUnassignedQueue?: boolean;
  isNextQueueCustomer?: boolean;
  isBookedInAdvance?: boolean;
  isTuaAssigned?: boolean;
  bookingAccessTag?: 'NEXT_CUSTOMER' | 'NEXT_QUEUE_CUSTOMER' | 'MY_BOOKED_CUSTOMER' | 'STORE_CUSTOMER';
  status: IosBookingStatus;
  orderState?: string;
  comboLiveStatus?: {
    balanceId?: number;
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity: boolean;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  };
  underMinkComboStatus?: {
    balanceId?: number;
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  };
  comboWallets?: IosCustomerComboWalletItem[];
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  diamondBalance?: number;
  debtAmount?: number;
  storeId?: number;
  branchCode?: string;
  branchName?: string;
  bookingDateYmd?: string;
  lastVisitDate?: string;
  lashHistory?: LashHistoryItem[];
  cvlNotes?: IosCustomerNoteItem[];
  isSimulationBooking?: boolean;
  isSimulationDraftBooking?: boolean;
  simulationAttemptCount?: number;
  simulationLatestAttemptId?: string;
  simulationFastForwardUnlocked?: boolean;
  simulationReadOnly?: boolean;
  selectedCombo?: IosSelectedCombo | null;
  selectedUnderCombo?: IosSelectedUnderCombo | null;
  comboRedemption?: IosComboRedemption | null;
  _localComboUpdatedAt?: number;
  attributes?: IosBookingAttributes;
  progress?: IosBookingProgress;
  cvSelfSpeedHistory?: IosCvSelfSpeedHistoryProfile;
  survey?: {
    rating: number;
    emotion: 'happy' | 'satisfied' | 'neutral' | 'unhappy';
    feedbackNote?: string;
  };
  cartProducts?: IosCartProductItem[];
  promotionId?: number | null;
  appliedPromotion?: IosPromotionOption | null;
  servicePromotionId?: number | null;
  servicePromotion?: IosPromotionOption | null;
  comboPromotionId?: number | null;
  comboPromotion?: IosPromotionOption | null;
  underComboPromotionId?: number | null;
  underComboPromotion?: IosPromotionOption | null;
  cvRewardBreakdown?: {
    techTipPercent: number;
    checkInTipPercent: number;
    checkOutTipPercent: number;
    cvTotalTipPercent: number;
    comboBonusAmount: number;
    serumBonusAmount: number;
    totalOrderBonusForCheckoutStaff: number;
  };
  billing?: {
    subtotal: number;
    vatRate?: number;
    vatAmount?: number;
    serviceTotal: number;
    comboTotal?: number;
    productTotal: number;
    promotionId?: number | null;
    promotionName?: string;
    promotionDiscountAmount?: number;
    serviceDiscountAmount?: number;
    comboDiscountAmount?: number;
    productDiscountAmount?: number;
    paymentMethod: IosPaymentMethod;
    paymentBreakdown?: IosPaymentBreakdown;
    tipAmount: number;
    tipCvShare: number;
    tipCheckInShare?: number;
    tipCheckOutShare?: number;
    tipCcShare: number;
    diamondUsed?: number;
    diamondDiscountAmount?: number;
    transferProofPhoto?: string;
    tipTransferProofPhoto?: string;
    qrSplitTipSeparate?: boolean;
    preCheckoutTipAmount?: number;
    preCheckoutServicePaidAmount?: number;
    preCheckoutPaymentMethod?: IosPaymentMethod;
    preCheckoutPaymentBreakdown?: IosPaymentBreakdown;
    preCheckoutQrSplitMode?: 'COMBINED' | 'SEPARATE';
    preCheckoutTransferProofPhoto?: string;
    preCheckoutTipTransferProofPhoto?: string;
    preCheckoutRecordedAt?: string;
    preCheckoutRecordedByStaffId?: number;
    preCheckoutRecordedByStaffName?: string;
    preCheckoutNote?: string;
    zaloConsent?: {
      agreed: boolean;
      phone: string;
      sentAt?: string;
      voucherCode?: string;
    };
    grandTotal: number;
    debtAmount?: number;
    completedAt?: string;
    settlementStatus?: IosSettlementStatus;
    bankTransferRef?: string;
    posTransactionId?: string;
    legacySyncedAt?: string;
    previousPaidGrandTotal?: number;
    previousPaymentMethod?: IosPaymentMethod;
    previousPaymentBreakdown?: IosPaymentBreakdown;
    lastAdjustmentMode?: IosPostCheckoutPaymentMode;
    lastAdjustmentDeltaAmount?: number;
  };
  pendingPostCheckoutAdjustment?: IosPostCheckoutPendingDraft | null;
  postCheckoutAdjustments?: IosPostCheckoutAdjustmentEntry[];
}

export interface IosBookingListQuery {
  storeId?: number;
  segment?: string;
  scope?: BookingScopeMode | string;
  role?: IosUserRole | string;
  staffId?: number;
  date?: string;
  limit?: number;
  demo?: boolean | '1' | '0';
  sim?: boolean | '1' | '0';
  menteeStaffId?: number;
}

export interface IosBookingListResponse {
  success: boolean;
  source?: 'mysql_live' | 'demo_mode';
  demoMode?: boolean;
  simulationMode?: boolean;
  simulationActorStaffId?: number;
  simulationActorStaffName?: string;
  isReadOnlyMentorView?: boolean;
  storeId?: number;
  segment?: string;
  role?: string;
  scope?: string;
  activeStaffId?: number;
  targetDate?: string;
  counts: IosSegmentCounts;
  count?: number;
  totalStoreCount?: number;
  bookings: IosBookingItem[];
  staffStats?: IosStaffMonthlyStats;
  timestamp?: string;
  error?: string;
}

export type IosBookingActionType =
  | 'CHECK_IN'
  | 'SAVE_CONSULTATION_DRAFT'
  | 'SAVE_CONSULTATION'
  | 'ASSIGN_STAFF'
  | 'SAVE_PROGRESS'
  | 'START_SERVICE'
  | 'NEXT_SERVICE_ROUND'
  | 'SAVE_SURVEY'
  | 'SAVE_UPSELL'
  | 'SAVE_PROMOTION'
  | 'SAVE_PRE_CHECKOUT_PAYMENT'
  | 'COMPLETE_CHECKOUT'
  | 'UPDATE_CUSTOMER_AVATAR'
  | 'RESET_DEMO'
  | 'REVERT_TO_INCOMING'
  | 'SUBMIT_POST_CHECKOUT_ADJUSTMENT'
  | 'APPROVE_POST_CHECKOUT_ADJUSTMENT'
  | 'REJECT_POST_CHECKOUT_ADJUSTMENT'
  | 'SIM_REVERT_CONSULTATION'
  | 'SIM_RESET_TO_INCOMING'
  | 'SIM_FAST_FORWARD_TO_UPSELL';

export interface IosBookingActionPayload {
  bookingId: number;
  action: IosBookingActionType | string;
  simulationMode?: boolean;
  actorStaffId?: number;
  actorStaffName?: string;
  actorStaffTier?: string;
  [key: string]: unknown;
}

export interface IosBookingActionResponse {
  success: boolean;
  bookingId?: number;
  action?: string;
  simulationMode?: boolean;
  attemptSnapshot?: IosSimulationAttemptSummary | null;
  updatedOverride?: Record<string, unknown>;
  savedAt?: string;
  error?: string;
}

export type IosSimulationAttemptSourceAction = 'COMPLETE_ORDER' | 'SIM_REVERT_CONSULTATION' | 'SIM_RESET_TO_INCOMING';

export interface IosSimulationUpsellProductItem {
  productId?: number;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
}

export interface IosSimulationAttemptSummary {
  attemptId: string;
  attemptNumber: number;
  bookingId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  staffId: number;
  staffName?: string;
  createdAt: string;
  sourceAction: IosSimulationAttemptSourceAction;
  statusAtSnapshot: IosBookingStatus;
  serviceName: string;
  servicePrice: number;
  selectedStyle?: string;
  selectedComboName?: string | null;
  selectedComboPrice: number;
  selectedUnderComboName?: string | null;
  selectedUnderComboPrice: number;
  upsellProducts: IosSimulationUpsellProductItem[];
  upsellTotal: number;
  promotionName?: string | null;
  promotionDiscountAmount: number;
  grandTotal: number;
  tipAmount: number;
  tipActorShare: number;
  comboBonusAmount: number;
  serumBonusAmount: number;
  cvRotationPoints: number;
  totalEstimatedReward: number;
  elapsedSeconds: number;
  notes?: string;
}

export interface IosUpdateSimulationAttemptRequest {
  bookingId: number;
  menteeStaffId?: number;
  notes?: string;
  selectedStyle?: string;
  selectedComboName?: string | null;
  selectedComboPrice?: number;
  selectedUnderComboName?: string | null;
  selectedUnderComboPrice?: number;
  upsellProducts?: IosSimulationUpsellProductItem[];
  promotionName?: string | null;
  promotionDiscountAmount?: number;
  tipAmount?: number;
}

export interface IosSimulationMenteeOption {
  menteeStaffId: number;
  menteeName: string;
  mentorStaffId: number;
  mentorName: string;
  startDate: string;
  endDate: string;
}

export interface IosCustomerLookupCandidate {
  customerId: number;
  fullName: string;
  maskedPhone: string;
  customerVisits: number;
  lastVisitDate?: string | null;
  hasActiveCombo: boolean;
  comboName?: string | null;
  remainingSessions?: number;
  naturalLashRecorded: boolean;
}

export interface IosBookingServiceCatalogItem {
  serviceId: number;
  serviceName: string;
  serviceGroup: string;
  price: number;
  durationMinute: number;
}

export interface IosProductCatalogItem {
  productId: number;
  productSku: string;
  productName: string;
  price: number;
  isSerum?: boolean;
}

export interface IosCreateBookingRequest {
  simulationMode?: boolean;
  date?: string;
  timeSlot?: string;
  customerMode: 'NEW' | 'EXISTING';
  existingCustomerId?: number;
  customerName?: string;
  customerPhone?: string;
  serviceId?: number;
  serviceName?: string;
  servicePrice?: number;
  serviceDuration?: number;
  assignedStaffId?: number;
  bookingNote?: string;
  storeId?: number;
}

export interface IosCreateBookingResponse {
  success: boolean;
  simulationMode: boolean;
  booking?: IosBookingItem;
  bookingId?: number;
  customerId?: number;
  error?: string;
}

export interface IosPrintReceiptPayload {
  printerIp?: string;
  printerPort?: number;
  rawText: string;
}

export interface IosPrintReceiptResponse {
  success: boolean;
  printerIp?: string;
  printerPort?: number;
  bytesWritten?: number;
  error?: string;
}

export type IosAdminComboExpiryAction = 'EXTEND_DATE' | 'ADD_DAYS' | 'FREEZE' | 'UNFREEZE';

export interface IosAdminComboExpiryActionPayload {
  action: IosAdminComboExpiryAction;
  balanceId: number;
  customerId: number;
  bookingId?: number;
  serviceGroup?: 'upper' | 'under';
  targetDateExpired?: string;
  extendDays?: number;
  reason: string;
}

export interface IosAdminComboExpiryActionResponse {
  success: boolean;
  balanceId?: number;
  customerId?: number;
  dateExpired?: string | null;
  isFrozen?: boolean;
  message?: string;
  error?: string;
}

export interface ActorTipBreakdown {
  tipAmount: number;
  techStaffId: number;
  techStaffName: string;
  techShareAmount: number;
  checkInStaffId: number;
  checkInStaffName: string;
  checkInShareAmount: number;
  checkOutStaffId: number;
  checkOutStaffName: string;
  checkOutShareAmount: number;
  fundShareAmount: number;
  actorEarnedPercent: number;
  actorEarnedAmount: number;
  actorRoleSummary: string;
}

export type ServicingSubStatus = {
  key: 'CHECKIN' | 'CLEANING' | 'LASHING' | 'SURVEY' | 'CHECKOUT';
  label: string;
  colorClass: string;
  lightColorClass: string;
  darkColorClass: string;
  targetStep: number;
};
