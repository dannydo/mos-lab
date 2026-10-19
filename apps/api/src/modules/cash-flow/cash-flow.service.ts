import { FastifyInstance } from 'fastify';
import {
  CashAccount,
  CashFlowCategory,
  CashFlowEntry,
  CashFlowEntryListQuery,
  CashFlowForecastResponse,
  CashFlowForecastSummary,
  CashFlowPriority,
  CashFlowStatus,
  CashFlowTimelinePoint,
  CashFlowType,
} from '@mos-lab/shared';

export class CashFlowService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Lấy dữ liệu dự báo dòng tiền theo kỳ và chi nhánh
   */
  async getForecast(params: {
    startDate?: string;
    endDate?: string;
    storeId?: number;
    accountId?: number;
  }): Promise<CashFlowForecastResponse> {
    const today = new Date();
    const startDateStr = params.startDate || today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const endDateStr = params.endDate || futureDate.toISOString().slice(0, 10);

    const startDateTime = new Date(`${startDateStr}T00:00:00.000Z`);
    const endDateTime = new Date(`${endDateStr}T23:59:59.999Z`);

    // 1. Lấy danh sách tài khoản tiền
    const accounts = await this.fastify.prisma.crm.crmCashAccount.findMany({
      where: {
        isActive: true,
        ...(params.storeId ? { storeId: params.storeId } : {}),
        ...(params.accountId ? { id: params.accountId } : {}),
      },
      orderBy: { id: 'asc' },
    });

    const totalCurrentBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalSafetyThreshold = accounts.reduce((sum, a) => sum + a.minSafetyThreshold, 0);

    // 2. Lấy các bản ghi thu chi trong khoảng thời gian
    const entries = await this.fastify.prisma.crm.crmCashFlowEntry.findMany({
      where: {
        expectedDate: {
          gte: startDateTime,
          lte: endDateTime,
        },
        status: { not: 'CANCELLED' },
        ...(params.storeId ? { storeId: params.storeId } : {}),
        ...(params.accountId ? { accountId: params.accountId } : {}),
      },
      orderBy: [{ expectedDate: 'asc' }, { priority: 'desc' }],
    });

    // 3. Lấy thực thu từ Legacy Orders (đơn hàng đã hoàn thành)
    let legacyCompletedOrdersTotal = 0;
    try {
      const legacyOrders = await this.fastify.prisma.legacy.order.findMany({
        where: {
          order_state: 'Completed',
          booking_date_only: {
            gte: startDateTime,
            lte: endDateTime,
          },
          ...(params.storeId ? { client_store_id: params.storeId } : {}),
        },
        select: {
          total_price: true,
          booking_date_only: true,
        },
      });
      legacyCompletedOrdersTotal = legacyOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    } catch {
      // Legacy DB fallback
    }

    // 4. Xây dựng Timeline theo từng ngày
    const timeline: CashFlowTimelinePoint[] = [];
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

    let runningBalance = totalCurrentBalance;
    let minForecastBalance = totalCurrentBalance;
    let isShortfallRisk = false;
    let shortfallDate: string | null = null;
    const shortfallRiskAlerts: CashFlowForecastResponse['shortfallRiskAlerts'] = [];

    let totalExpectedInflow = 0;
    let totalActualInflow = 0;
    let totalExpectedOutflow = 0;
    let totalActualOutflow = 0;
    let criticalOutflowPending = 0;
    let totalVatOutflow = 0;

    const inflowCategoryBreakdown: Record<string, number> = {};
    const outflowCategoryBreakdown: Record<string, number> = {};
    const priorityOutflowBreakdown: Record<string, number> = {};

    const currentDateCursor = new Date(startDateTime);
    while (currentDateCursor <= endDateTime) {
      const dateStr = currentDateCursor.toISOString().slice(0, 10);
      const dayOfWeek = dayNames[currentDateCursor.getUTCDay()];

      // Tìm các entries của ngày hôm đó
      const dayEntries = entries.filter((e) => {
        const entryDate = new Date(e.expectedDate).toISOString().slice(0, 10);
        return entryDate === dateStr;
      });

      const dayInflows = dayEntries.filter((e) => e.flowType === 'INFLOW');
      const dayOutflows = dayEntries.filter((e) => e.flowType === 'OUTFLOW');

      let dayExpectedInflow = 0;
      let dayActualInflow = 0;
      let dayExpectedOutflow = 0;
      let dayActualOutflow = 0;

      for (const inf of dayInflows) {
        if (inf.status === 'COLLECTED') {
          dayActualInflow += inf.totalAmount;
        } else {
          dayExpectedInflow += inf.totalAmount;
        }
        inflowCategoryBreakdown[inf.category] = (inflowCategoryBreakdown[inf.category] || 0) + inf.totalAmount;
      }

      for (const outf of dayOutflows) {
        if (outf.status === 'PAID') {
          dayActualOutflow += outf.totalAmount;
        } else {
          dayExpectedOutflow += outf.totalAmount;
          if (outf.priority === 'CRITICAL' || outf.priority === 'HIGH') {
            criticalOutflowPending += outf.totalAmount;
          }
        }
        totalVatOutflow += outf.vatAmount;
        outflowCategoryBreakdown[outf.category] = (outflowCategoryBreakdown[outf.category] || 0) + outf.totalAmount;
        priorityOutflowBreakdown[outf.priority] = (priorityOutflowBreakdown[outf.priority] || 0) + outf.totalAmount;
      }

      const openingBal = runningBalance;
      // Dòng tiền ròng trong ngày: (Thu thực tế + Thu dự kiến) - (Chi thực tế + Chi dự kiến)
      const dayNetFlow = dayActualInflow + dayExpectedInflow - (dayActualOutflow + dayExpectedOutflow);
      runningBalance += dayNetFlow;

      if (runningBalance < minForecastBalance) {
        minForecastBalance = runningBalance;
      }

      const isBelowSafety = runningBalance < totalSafetyThreshold;
      if (isBelowSafety) {
        isShortfallRisk = true;
        if (!shortfallDate) {
          shortfallDate = dateStr;
        }
        const highPriorityOutflows = dayOutflows.filter(
          (o) => (o.priority === 'CRITICAL' || o.priority === 'HIGH') && o.status !== 'PAID'
        );
        shortfallRiskAlerts.push({
          date: dateStr,
          forecastBalance: runningBalance,
          deficitAmount: totalSafetyThreshold - runningBalance,
          criticalPendingOutflows: highPriorityOutflows.map(this.mapEntry),
        });
      }

      totalExpectedInflow += dayExpectedInflow;
      totalActualInflow += dayActualInflow;
      totalExpectedOutflow += dayExpectedOutflow;
      totalActualOutflow += dayActualOutflow;

      timeline.push({
        date: dateStr,
        dayOfWeek,
        openingBalance: openingBal,
        expectedInflow: dayExpectedInflow,
        actualInflow: dayActualInflow,
        expectedOutflow: dayExpectedOutflow,
        actualOutflow: dayActualOutflow,
        closingBalance: runningBalance,
        isBelowSafety,
        inflowCount: dayInflows.length,
        outflowCount: dayOutflows.length,
        inflows: dayInflows.map(this.mapEntry),
        outflows: dayOutflows.map(this.mapEntry),
      });

      // Tăng thêm 1 ngày (UTC)
      currentDateCursor.setUTCDate(currentDateCursor.getUTCDate() + 1);
    }

    const summary: CashFlowForecastSummary = {
      openingBalance: totalCurrentBalance,
      totalExpectedInflow,
      totalActualInflow: totalActualInflow + legacyCompletedOrdersTotal,
      totalExpectedOutflow,
      totalActualOutflow,
      closingForecastBalance: runningBalance,
      currentActualBalance: totalCurrentBalance + totalActualInflow - totalActualOutflow,
      netCashFlowForecast: totalExpectedInflow + totalActualInflow - (totalExpectedOutflow + totalActualOutflow),
      varianceAmount: totalActualInflow - totalActualOutflow - (totalExpectedInflow - totalExpectedOutflow),
      isShortfallRisk,
      shortfallDate,
      minForecastBalance,
      minSafetyThreshold: totalSafetyThreshold,
      criticalOutflowPending,
      totalVatOutflow,
      inflowCategoryBreakdown,
      outflowCategoryBreakdown,
      priorityOutflowBreakdown,
    };

    return {
      summary,
      timeline,
      accounts: accounts.map(this.mapAccount),
      shortfallRiskAlerts,
    };
  }

  /**
   * Lấy danh sách các khoản thu chi có phân trang và bộ lọc
   */
  async getEntries(query: CashFlowEntryListQuery) {
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
      this.fastify.prisma.crm.crmCashFlowEntry.count({ where }),
      this.fastify.prisma.crm.crmCashFlowEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ expectedDate: 'asc' }, { priority: 'desc' }, { id: 'desc' }],
      }),
    ]);

    return {
      items: items.map(this.mapEntry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Tạo khoản thu / chi mới (Có VAT & Mức độ ưu tiên)
   */
  async createEntry(
    data: {
      flowType: CashFlowType;
      category: CashFlowCategory;
      title: string;
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
    },
    staff: { id: number; displayName: string }
  ): Promise<CashFlowEntry> {
    const hasVat = Boolean(data.hasVat);
    const vatRate = hasVat ? Number(data.vatRate || 0) : 0;
    const amount = Number(data.amount || 0);
    const vatAmount = hasVat && vatRate > 0 ? Math.round(amount * (vatRate / 100)) : 0;
    const totalAmount = amount + vatAmount;

    const entry = await this.fastify.prisma.crm.crmCashFlowEntry.create({
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
        sourceRef: data.sourceRef || null,
        createdByStaffId: staff.id,
        createdByName: staff.displayName,
      },
    });

    // Ghi audit log
    await this.fastify.prisma.crm.crmCashFlowAudit.create({
      data: {
        entryId: entry.id,
        action: 'CREATE',
        staffId: staff.id,
        staffName: staff.displayName,
        payload: data,
        note: `Tạo khoản ${data.flowType === 'INFLOW' ? 'thu' : 'chi'}: ${data.title} (${totalAmount.toLocaleString('vi-VN')}đ)`,
      },
    });

    return this.mapEntry(entry);
  }

  /**
   * Cập nhật khoản thu / chi
   */
  async updateEntry(
    id: number,
    data: Partial<{
      flowType: CashFlowType;
      category: CashFlowCategory;
      title: string;
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
    }>,
    staff: { id: number; displayName: string }
  ): Promise<CashFlowEntry> {
    const existing = await this.fastify.prisma.crm.crmCashFlowEntry.findUnique({
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

    const updated = await this.fastify.prisma.crm.crmCashFlowEntry.update({
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
        approvedByStaffId,
        approvedByName,
      },
    });

    await this.fastify.prisma.crm.crmCashFlowAudit.create({
      data: {
        entryId: id,
        action: 'UPDATE',
        staffId: staff.id,
        staffName: staff.displayName,
        payload: data,
        note: `Cập nhật khoản #${id} sang trạng thái ${data.status || existing.status}`,
      },
    });

    return this.mapEntry(updated);
  }

  /**
   * Xóa / Hủy khoản thu chi
   */
  async deleteEntry(id: number, staff: { id: number; displayName: string }): Promise<void> {
    await this.fastify.prisma.crm.crmCashFlowEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.fastify.prisma.crm.crmCashFlowAudit.create({
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
  async getAccounts(): Promise<CashAccount[]> {
    const accounts = await this.fastify.prisma.crm.crmCashAccount.findMany({
      orderBy: { id: 'asc' },
    });
    return accounts.map(this.mapAccount);
  }

  /**
   * Cập nhật số dư hoặc ngưỡng an toàn tài khoản
   */
  async updateAccount(
    id: number,
    data: {
      initialBalance?: number;
      currentBalance?: number;
      minSafetyThreshold?: number;
      notes?: string;
    }
  ): Promise<CashAccount> {
    const updated = await this.fastify.prisma.crm.crmCashAccount.update({
      where: { id },
      data: {
        ...(data.initialBalance !== undefined ? { initialBalance: Number(data.initialBalance) } : {}),
        ...(data.currentBalance !== undefined ? { currentBalance: Number(data.currentBalance) } : {}),
        ...(data.minSafetyThreshold !== undefined ? { minSafetyThreshold: Number(data.minSafetyThreshold) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    return this.mapAccount(updated);
  }

  /**
   * Xuất báo cáo CSV dự báo dòng tiền
   */
  async exportCsv(params: { startDate?: string; endDate?: string; storeId?: number }): Promise<string> {
    const forecast = await this.getForecast(params);
    const headers = [
      'Ngày',
      'Thứ',
      'Số dư đầu ngày (VNĐ)',
      'Thu dự kiến (VNĐ)',
      'Thu thực tế (VNĐ)',
      'Chi dự kiến (VNĐ)',
      'Chi thực tế (VNĐ)',
      'Số dư cuối ngày (VNĐ)',
      'Trạng thái',
    ];

    const rows: (string | number)[][] = forecast.timeline.map((t: CashFlowTimelinePoint) => [
      t.date,
      t.dayOfWeek,
      Math.round(t.openingBalance),
      Math.round(t.expectedInflow),
      Math.round(t.actualInflow),
      Math.round(t.expectedOutflow),
      Math.round(t.actualOutflow),
      Math.round(t.closingBalance),
      t.isBelowSafety ? 'NGUY HIỂM (Dưới ngưỡng)' : 'An toàn',
    ]);

    // UTF-8 BOM for Excel compatibility
    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((r: (string | number)[]) =>
          r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');
    return csvContent;
  }

  private mapAccount(a: {
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

  private mapEntry(e: {
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
      createdByStaffId: e.createdByStaffId,
      createdByName: e.createdByName,
      approvedByStaffId: e.approvedByStaffId,
      approvedByName: e.approvedByName,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
