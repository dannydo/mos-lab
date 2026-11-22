import type { FastifyInstance } from 'fastify';
import type {
  CashAccount,
  CashAccountBalanceAdjustment,
  CashFlowCategory,
  CashFlowEntry,
  CashFlowEntryListQuery,
  CashFlowPriority,
  CashFlowStatus,
  CashFlowType,
} from '@mos-lab/shared';
import { mapCashAccount, mapCashFlowEntry } from './cash-flow-mappers.js';

export type CreateCashFlowEntryInput = {
  flowType: CashFlowType;
  category: CashFlowCategory;
  title: string;
  projectName?: string;
  description?: string;
  amount: number;
  hasVat?: boolean;
  vatRate?: number;
  priority?: CashFlowPriority;
  status?: CashFlowStatus;
  expectedDate: string;
  dueDate?: string;
  actualDate?: string;
  accountId?: number;
  storeId?: number;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurringInterval?: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  recurringEndDate?: string;
  sourceRef?: string;
};

export type UpdateCashFlowEntryInput = Partial<CreateCashFlowEntryInput>;

/**
 * Lấy danh sách các khoản thu chi có phân trang và bộ lọc
 */
export async function getCashFlowEntries(fastify: FastifyInstance, query: CashFlowEntryListQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    status: query.status ? query.status : { not: 'CANCELLED' },
  };

  if (query.flowType) where.flowType = query.flowType;
  if (query.category) where.category = query.category;
  if (query.priority) where.priority = query.priority;
  if (query.storeId) where.storeId = query.storeId;
  if (query.accountId) where.accountId = query.accountId;
  if (query.hasVat !== undefined) where.hasVat = query.hasVat ? 1 : 0;

  if (query.startDate && query.endDate) {
    where.expectedDate = {
      gte: new Date(`${query.startDate}T00:00:00.000Z`),
      lte: new Date(`${query.endDate}T23:59:59.999Z`),
    };
  } else if (query.startDate) {
    where.expectedDate = { gte: new Date(`${query.startDate}T00:00:00.000Z`) };
  } else if (query.endDate) {
    where.expectedDate = { lte: new Date(`${query.endDate}T23:59:59.999Z`) };
  }

  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { description: { contains: query.search } },
      { sourceRef: { contains: query.search } },
    ];
  }

  const [total, items] = await Promise.all([
    fastify.prisma.crm.crmCashFlowEntry.count({ where }),
    fastify.prisma.crm.crmCashFlowEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ expectedDate: 'asc' }, { priority: 'desc' }, { id: 'desc' }],
    }),
  ]);

  return {
    items: items.map(mapCashFlowEntry),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Tạo khoản thu / chi mới (Có VAT & Mức độ ưu tiên)
 */
export async function createCashFlowEntry(
  fastify: FastifyInstance,
  data: CreateCashFlowEntryInput,
  staff: { id: number; displayName: string }
): Promise<CashFlowEntry> {
  const hasVat = Boolean(data.hasVat);
  const vatRate = hasVat ? Number(data.vatRate || 0) : 0;
  const amount = Number(data.amount || 0);
  const vatAmount = hasVat && vatRate > 0 ? Math.round(amount * (vatRate / 100)) : 0;
  const totalAmount = amount + vatAmount;

  const resolvedSourceRef = data.projectName
    ? data.projectName.startsWith('PROJECT:')
      ? data.projectName
      : `PROJECT: ${data.projectName}`
    : data.sourceRef || null;

  const entry = await fastify.prisma.crm.crmCashFlowEntry.create({
    data: {
      flowType: data.flowType,
      category: data.category,
      title: data.title,
      description: data.description || null,
      amount,
      hasVat,
      vatRate,
      vatAmount,
      totalAmount,
      priority: data.priority || 'MEDIUM',
      status: data.status || 'PENDING',
      expectedDate: new Date(`${data.expectedDate}T00:00:00.000Z`),
      dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null,
      actualDate: data.actualDate ? new Date(`${data.actualDate}T00:00:00.000Z`) : null,
      accountId: data.accountId || null,
      storeId: data.storeId || null,
      paymentMethod: data.paymentMethod || null,
      isRecurring: Boolean(data.isRecurring),
      recurringInterval: data.recurringInterval || null,
      recurringEndDate: data.recurringEndDate ? new Date(`${data.recurringEndDate}T00:00:00.000Z`) : null,
      sourceRef: resolvedSourceRef,
      createdByStaffId: staff.id,
      createdByName: staff.displayName,
    },
  });

  // Ghi audit log
  await fastify.prisma.crm.crmCashFlowAudit.create({
    data: {
      entryId: entry.id,
      action: 'CREATE',
      staffId: staff.id,
      staffName: staff.displayName,
      payload: data,
      note: `Tạo khoản ${data.flowType === 'INFLOW' ? 'thu' : 'chi'}: ${data.title} (${totalAmount.toLocaleString('vi-VN')}đ)`,
    },
  });

  return mapCashFlowEntry(entry);
}

/**
 * Cập nhật khoản thu / chi
 */
export async function updateCashFlowEntry(
  fastify: FastifyInstance,
  id: number,
  data: UpdateCashFlowEntryInput,
  staff: { id: number; displayName: string }
): Promise<CashFlowEntry> {
  const existing = await fastify.prisma.crm.crmCashFlowEntry.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error(`Khoản thu chi #${id} không tồn tại.`);
  }

  const hasVat = data.hasVat !== undefined ? Boolean(data.hasVat) : existing.hasVat;
  const vatRate = hasVat ? (data.vatRate !== undefined ? Number(data.vatRate) : existing.vatRate) : 0;
  const amount = data.amount !== undefined ? Number(data.amount) : existing.amount;
  const vatAmount = hasVat && vatRate > 0 ? Math.round(amount * (vatRate / 100)) : 0;
  const totalAmount = amount + vatAmount;

  let actualDate = existing.actualDate;
  if (data.actualDate) {
    actualDate = new Date(`${data.actualDate}T00:00:00.000Z`);
  } else if ((data.status === 'PAID' || data.status === 'COLLECTED') && !existing.actualDate) {
    actualDate = new Date();
  }

  let approvedByStaffId = existing.approvedByStaffId;
  let approvedByName = existing.approvedByName;
  if (data.status === 'APPROVED' && existing.status !== 'APPROVED') {
    approvedByStaffId = staff.id;
    approvedByName = staff.displayName;
  }

  const resolvedSourceRef =
    data.projectName !== undefined
      ? data.projectName
        ? data.projectName.startsWith('PROJECT:')
          ? data.projectName
          : `PROJECT: ${data.projectName}`
        : null
      : data.sourceRef !== undefined
        ? data.sourceRef
        : undefined;

  const updated = await fastify.prisma.crm.crmCashFlowEntry.update({
    where: { id },
    data: {
      ...(data.flowType ? { flowType: data.flowType } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.title ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      amount,
      hasVat,
      vatRate,
      vatAmount,
      totalAmount,
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.expectedDate ? { expectedDate: new Date(`${data.expectedDate}T00:00:00.000Z`) } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null }
        : {}),
      actualDate,
      ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
      ...(data.storeId !== undefined ? { storeId: data.storeId } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
      ...(data.isRecurring !== undefined ? { isRecurring: Boolean(data.isRecurring) } : {}),
      ...(data.recurringInterval !== undefined ? { recurringInterval: data.recurringInterval } : {}),
      ...(data.recurringEndDate !== undefined
        ? { recurringEndDate: data.recurringEndDate ? new Date(`${data.recurringEndDate}T00:00:00.000Z`) : null }
        : {}),
      ...(resolvedSourceRef !== undefined ? { sourceRef: resolvedSourceRef } : {}),
      approvedByStaffId,
      approvedByName,
    },
  });

  await fastify.prisma.crm.crmCashFlowAudit.create({
    data: {
      entryId: id,
      action: 'UPDATE',
      staffId: staff.id,
      staffName: staff.displayName,
      payload: data,
      note: `Cập nhật khoản #${id} sang trạng thái ${data.status || existing.status}`,
    },
  });

  return mapCashFlowEntry(updated);
}

/**
 * Xóa / Hủy khoản thu chi
 */
export async function deleteCashFlowEntry(
  fastify: FastifyInstance,
  id: number,
  staff: { id: number; displayName: string }
): Promise<void> {
  await fastify.prisma.crm.crmCashFlowEntry.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  await fastify.prisma.crm.crmCashFlowAudit.create({
    data: {
      entryId: id,
      action: 'CANCEL',
      staffId: staff.id,
      staffName: staff.displayName,
      note: `Hủy khoản thu chi #${id}`,
    },
  });
}

/**
 * Lấy danh sách tài khoản tiền mặt / ngân hàng
 */
export async function getCashAccounts(fastify: FastifyInstance): Promise<CashAccount[]> {
  const accounts = await fastify.prisma.crm.crmCashAccount.findMany({
    orderBy: { id: 'asc' },
  });
  return accounts.map(mapCashAccount);
}

/**
 * Cập nhật số dư hoặc ngưỡng an toàn tài khoản
 */
export async function updateCashAccount(
  fastify: FastifyInstance,
  id: number,
  data: {
    initialBalance?: number;
    currentBalance?: number;
    minSafetyThreshold?: number;
    notes?: string;
  }
): Promise<CashAccount> {
  const updated = await fastify.prisma.crm.crmCashAccount.update({
    where: { id },
    data: {
      ...(data.initialBalance !== undefined ? { initialBalance: Number(data.initialBalance) } : {}),
      ...(data.currentBalance !== undefined ? { currentBalance: Number(data.currentBalance) } : {}),
      ...(data.minSafetyThreshold !== undefined ? { minSafetyThreshold: Number(data.minSafetyThreshold) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
  return mapCashAccount(updated);
}

/**
 * Cập nhật số dư hàng loạt cho nhiều tài khoản quỹ
 */
export async function batchUpdateCashAccountBalances(
  fastify: FastifyInstance,
  items: CashAccountBalanceAdjustment[]
): Promise<CashAccount[]> {
  const results = await fastify.prisma.crm.$transaction(
    items.map((item) =>
      fastify.prisma.crm.crmCashAccount.update({
        where: { id: item.id },
        data: {
          currentBalance: Number(item.currentBalance),
          ...(item.minSafetyThreshold !== undefined ? { minSafetyThreshold: Number(item.minSafetyThreshold) } : {}),
          ...(item.notes !== undefined ? { notes: item.notes } : {}),
        },
      })
    )
  );
  return results.map(mapCashAccount);
}
