import type { LashHistoryPhoto } from './booking-models.js';

export type IosCustomerHistoryTab = 'LASH_PHOTOS' | 'ALL' | 'PAYMENTS' | 'FIX' | 'REWARDS' | 'NOTES';

export type IosCustomerNoteSource = 'CVL' | 'CRM';

export interface IosCustomerNoteItem {
  id: number;
  customerId: number;
  note: string;
  noteFieldKey: string;
  source: IosCustomerNoteSource;
  isSticky: boolean;
  isIssue?: boolean;
  dateCreated: string;
  dateDisplay: string;
  timeDisplay: string;
  daysAgoLabel: string;
  staffId?: number;
  staffName: string;
  staffAvatar?: string | null;
  branchName?: string | null;
  orderId?: number | null;
  orderNumber?: string | null;
}

export interface IosCreateCustomerNotePayload {
  note: string;
  tags?: string[];
  isSticky?: boolean;
  bookingId?: number;
  simulationMode?: boolean;
}

export interface IosCreateCustomerNoteResponse {
  success: boolean;
  note?: IosCustomerNoteItem;
  error?: string;
}

export interface IosCustomerHistoryLashSpec {
  serviceName?: string;
  isUnder?: boolean;
  style?: string | null;
  curl?: string | null;
  length?: string | null;
  thickness?: string | null;
  strandCount?: string | null;
  fan?: string | null;
  color?: string | null;
  retainLeft?: number | null;
  retainRight?: number | null;
}

export interface IosCustomerHistoryServiceDetail {
  name: string;
  serviceType?: string | null;
  price: number;
  isFix?: boolean;
  isComboUsed?: boolean;
}

export interface IosCustomerHistoryStaffRef {
  id?: number;
  name: string;
  avatar?: string | null;
}

export interface IosCustomerHistoryVisitItem {
  orderId: number;
  orderNumber: string;
  bookingDateStart: string;
  dateDisplay: string;
  timeDisplay: string;
  daysAgoLabel: string;
  orderState: string;
  statusLabel: string;
  statusTone: 'completed' | 'upcoming' | 'servicing' | 'canceled';
  serviceName: string;
  services: IosCustomerHistoryServiceDetail[];
  isFixOrder: boolean;
  bookingNote: string | null;
  ccNote?: string | null;
  ccNoteStaffName?: string | null;
  ccNoteDate?: string | null;
  branchId: number | null;
  branchName: string;
  staffNames: string[];
  staffAvatars: IosCustomerHistoryStaffRef[];
  diamondEarned: number;
  diamondUsed: number;
  totalPrice: number;
  paidAmount: number;
  discountAmount: number;
  prepaidAmount: number;
  debtAmount: number;
  tipAmount: number;
  paymentMethodLabel: string;
  photos?: LashHistoryPhoto[];
  underPhotos?: LashHistoryPhoto[];
  underServiceName?: string | null;
  lashSpecs?: IosCustomerHistoryLashSpec[];
}

export interface IosCustomerDiamondTxnItem {
  id: number;
  orderId: number | null;
  amount: number;
  balanceAfter: number;
  dateCreated: string;
  dateDisplay: string;
  timeDisplay: string;
  daysAgoLabel: string;
  note: string | null;
  branchName: string | null;
  type: 'EARN' | 'SPEND' | 'ADJUST';
}

export interface IosCustomerHistorySummary {
  totalSpent: number;
  completedVisits: number;
  totalBookings: number;
  canceledBookings: number;
  fixCount: number;
  avgSpendPerVisit: number;
  diamondBalance: number;
  totalDiamondEarned: number;
  totalDiamondUsed: number;
  totalDebt: number;
  lastVisitDate: string | null;
  firstVisitDate: string | null;
}

export interface IosCustomerHistoryResponse {
  success: boolean;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerCode?: string | null;
  customerDateOfBirth?: string | null;
  summary: IosCustomerHistorySummary;
  visits: IosCustomerHistoryVisitItem[];
  payments: IosCustomerHistoryVisitItem[];
  fixVisits: IosCustomerHistoryVisitItem[];
  diamondTransactions: IosCustomerDiamondTxnItem[];
  notes?: IosCustomerNoteItem[];
  error?: string;
}
