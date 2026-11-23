import type { Fund, FundProposal, FundTransaction, ProposalType } from '@mos-lab/shared';

export type FundOverviewData = Fund & {
  recentTransactions: FundTransaction[];
  pendingProposals: FundProposal[];
};

export interface FundDetailDrawerProps {
  open: boolean;
  fundId: string | null;
  onClose: () => void;
  onRefreshList?: () => void;
}

export interface ExpenseFormValues {
  amount: number;
  description: string;
  beneficiaryStaffName?: string;
  beneficiaryPhone?: string;
  telco?: string;
  receiptUrl?: string;
  expenseCategory?: string;
}

export interface ProposalFormValues {
  proposalType?: ProposalType;
  title: string;
  description?: string;
  requestedAmount: number;
}

export interface ApprovalFormValues {
  approved?: string | boolean;
  approvedAmount?: number;
  note?: string;
}

export interface DisburseFormValues {
  actualDisbursedAmount: number;
  paymentMethod: string;
  bankRefCode: string;
  disbursementReceiptUrl?: string;
  disbursementNote?: string;
}

export interface ConfirmReceiptFormValues {
  note?: string;
}

export interface ReconcileFormValues {
  actualBalance: number;
  notes?: string;
}
