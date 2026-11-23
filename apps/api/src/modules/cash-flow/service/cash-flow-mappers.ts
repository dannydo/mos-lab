import type {
  CashAccount,
  CashFlowCategory,
  CashFlowEntry,
  CashFlowPriority,
  CashFlowStatus,
  CashFlowType,
} from '@mos-lab/shared';

export function mapCashAccount(a: {
  id: number;
  code: string;
  name: string;
  accountType: string;
  accountNumber: string | null;
  bankName: string | null;
  storeId: number | null;
  initialBalance: number;
  currentBalance: number;
  minSafetyThreshold: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CashAccount {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    accountType: a.accountType as CashAccount['accountType'],
    accountNumber: a.accountNumber,
    bankName: a.bankName,
    storeId: a.storeId,
    initialBalance: a.initialBalance,
    currentBalance: a.currentBalance,
    minSafetyThreshold: a.minSafetyThreshold,
    isActive: Boolean(a.isActive),
    notes: a.notes,
    createdAt: a.createdAt?.toISOString(),
    updatedAt: a.updatedAt?.toISOString(),
  };
}

export function mapCashFlowEntry(e: {
  id: number;
  flowType: string;
  category: string;
  title: string;
  description: string | null;
  amount: number;
  hasVat: boolean;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  priority: string;
  status: string;
  expectedDate: Date;
  dueDate: Date | null;
  actualDate: Date | null;
  accountId: number | null;
  storeId: number | null;
  paymentMethod: string | null;
  isRecurring: boolean;
  recurringInterval: string | null;
  recurringEndDate: Date | null;
  sourceRef: string | null;
  createdByStaffId: number | null;
  createdByName: string | null;
  approvedByStaffId: number | null;
  approvedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CashFlowEntry {
  return {
    id: e.id,
    flowType: e.flowType as CashFlowType,
    category: e.category as CashFlowCategory,
    title: e.title,
    description: e.description,
    amount: e.amount,
    hasVat: Boolean(e.hasVat),
    vatRate: e.vatRate,
    vatAmount: e.vatAmount,
    totalAmount: e.totalAmount,
    priority: e.priority as CashFlowPriority,
    status: e.status as CashFlowStatus,
    expectedDate: e.expectedDate.toISOString().slice(0, 10),
    dueDate: e.dueDate ? e.dueDate.toISOString().slice(0, 10) : null,
    actualDate: e.actualDate ? e.actualDate.toISOString().slice(0, 10) : null,
    accountId: e.accountId,
    storeId: e.storeId,
    paymentMethod: e.paymentMethod,
    isRecurring: Boolean(e.isRecurring),
    recurringInterval: e.recurringInterval as CashFlowEntry['recurringInterval'],
    recurringEndDate: e.recurringEndDate ? e.recurringEndDate.toISOString().slice(0, 10) : null,
    sourceRef: e.sourceRef,
    projectName: e.sourceRef?.startsWith('PROJECT:')
      ? e.sourceRef.replace(/^PROJECT:\s*/, '')
      : e.category === 'REVENUE_OTHER'
        ? e.title
        : null,
    createdByStaffId: e.createdByStaffId,
    createdByName: e.createdByName,
    approvedByStaffId: e.approvedByStaffId,
    approvedByName: e.approvedByName,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
