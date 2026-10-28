export type ToleranceMode = 'STRICT' | 'TOLERANCE_FIXED';
export type FundStatus = 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'CLOSED';
export type ProposalType = 'REPLENISHMENT' | 'SPECIAL_EXPENSE';
export type ProposalStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PENDING_REAPPROVAL'
  | 'DISBURSED'
  | 'REJECTED'
  | 'CANCELLED';
export type TransactionType = 'TOPUP' | 'EXPENSE' | 'ADJUSTMENT';
export type TransactionStatus = 'COMPLETED' | 'LOCKED' | 'CANCELLED';
export type PeriodStatus = 'OPEN' | 'RECONCILING' | 'LOCKED';
export type FundRoleKey = 'HOLDER' | 'APPROVER_L1' | 'APPROVER_L2' | 'DISBURSER' | 'AUDITOR';

export interface FundRole {
  id: string;
  fundId: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FundRoleAssignment {
  id: string;
  fundId: string;
  roleKey: string;
  staffId: number;
  staffName: string;
  assignedByStaffId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundApprovalStepConfig {
  level: number;
  name: string;
  approverRoleKey?: string;
  approverStaffIds?: number[];
  approverStaffNames?: string[];
  requiredAmountAbove?: number;
  note?: string;
}

export interface FundApprovalWorkflowConfig {
  enabled: boolean;
  steps: FundApprovalStepConfig[];
}

export interface Fund {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  currentBalance: number;
  maxQuota: number;
  unitQuota: number;
  alertThresholdPercent: number;
  toleranceMode: ToleranceMode;
  toleranceAmount: number;
  status: FundStatus;
  isLowBalance: boolean;
  usedAmount: number;
  usedPercent: number;
  roles?: FundRole[];
  assignments?: FundRoleAssignment[];
  approvalConfig?: FundApprovalWorkflowConfig | null;
  currentPeriod?: FundPeriod | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalApprovalStep {
  level: number;
  staffId: number;
  staffName: string;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
  timestamp: string;
}

export interface FundProposal {
  id: string;
  fundId: string;
  proposalType: ProposalType;
  title: string;
  description?: string | null;
  requestedAmount: number;
  approvedAmount?: number | null;
  actualDisbursedAmount?: number | null;
  status: ProposalStatus;
  currentApprovalLevel: number;
  approvals: ProposalApprovalStep[];
  disbursedByStaffId?: number | null;
  disbursedByName?: string | null;
  disbursedAt?: string | null;
  paymentMethod?: string | null;
  bankRefCode?: string | null;
  disbursementReceiptUrls: string[];
  disbursementNote?: string | null;
  reapprovalReason?: string | null;
  createdByStaffId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FundTransaction {
  id: string;
  fundId: string;
  periodId?: string | null;
  proposalId?: string | null;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: TransactionStatus;
  beneficiaryStaffId?: number | null;
  beneficiaryStaffName?: string | null;
  beneficiaryPhone?: string | null;
  telco?: string | null;
  receiptUrls: string[];
  actorStaffId: number;
  actorStaffName: string;
  createdAt: string;
}

export interface FundPeriod {
  id: string;
  fundId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance?: number | null;
  totalIncome: number;
  totalExpense: number;
  systemBalance?: number | null;
  actualBalance?: number | null;
  variance?: number | null;
  status: PeriodStatus;
  lockedByStaffId?: number | null;
  lockedByName?: string | null;
  lockedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordExpenseRequest {
  amount: number;
  description: string;
  beneficiaryStaffId?: number;
  beneficiaryStaffName?: string;
  beneficiaryPhone?: string;
  telco?: string;
  receiptUrls?: string[];
}

export interface CreateProposalRequest {
  proposalType: ProposalType;
  title: string;
  description?: string;
  requestedAmount: number;
}

export interface ApproveProposalRequest {
  approved: boolean;
  approvedAmount?: number;
  note?: string;
}

export interface DisburseProposalRequest {
  actualDisbursedAmount: number;
  paymentMethod: string;
  bankRefCode: string;
  disbursementReceiptUrls?: string[];
  disbursementNote?: string;
  disbursedAt?: string;
}

export interface ReconcileAndLockPeriodRequest {
  actualBalance: number;
  notes?: string;
}

export interface UpdateFundConfigRequest {
  maxQuota?: number;
  unitQuota?: number;
  alertThresholdPercent?: number;
  toleranceMode?: ToleranceMode;
  toleranceAmount?: number;
}

export interface CreateFundRoleInput {
  roleKey: string;
  roleName: string;
  permissions: string[];
  assignedStaffIds?: number[];
}

export interface CreateFundRequest {
  code: string;
  name: string;
  description?: string;
  maxQuota: number;
  unitQuota: number;
  alertThresholdPercent?: number;
  toleranceMode?: ToleranceMode;
  toleranceAmount?: number;
  status?: FundStatus;
  roles?: CreateFundRoleInput[];
  approvalConfig?: FundApprovalWorkflowConfig;
}

export interface UpdateFundRequest {
  code?: string;
  name?: string;
  description?: string;
  maxQuota?: number;
  unitQuota?: number;
  alertThresholdPercent?: number;
  toleranceMode?: ToleranceMode;
  toleranceAmount?: number;
  status?: FundStatus;
  roles?: CreateFundRoleInput[];
  approvalConfig?: FundApprovalWorkflowConfig;
}
