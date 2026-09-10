import { Prisma } from '../../generated/crm-client/index.js';

type PayrollLedgerTransaction = Prisma.TransactionClient;

export type PayrollLedgerEventInput = {
  eventKey: string;
  payrollPeriodId: number;
  subjectKey: string;
  sourceType: 'FAL' | 'HR' | 'SYSTEM';
  component: string;
  amountHalfDong: number;
  sourceReference: string;
  sourceHash: string;
  sourceOccurredAt: Date;
  metadata?: Record<string, unknown> | null;
};

/** The only writer for append-only source evidence used to build a settlement. */
export class PayrollLedgerEventService {
  static async append(tx: PayrollLedgerTransaction, input: PayrollLedgerEventInput): Promise<void> {
    this.assertTraceable(input);
    const period = await tx.crmPayrollPeriod.findUnique({ where: { id: input.payrollPeriodId } });
    if (!period) throw new Error('Payroll ledger event requires an existing payroll period');
    if (period.status === 'LOCKED' || period.status === 'ARCHIVED') {
      throw new Error('A locked payroll period cannot accept new ledger events');
    }
    const frozenInput = await tx.crmPayrollSettlement.findFirst({
      where: { payrollPeriodId: input.payrollPeriodId, status: { in: ['REVIEWING', 'LOCKED'] } },
      select: { id: true },
    });
    if (frozenInput) {
      throw new Error('A settlement review already freezes this payroll period event input');
    }
    await tx.crmPayrollLedgerEvent.create({
      data: {
        eventKey: input.eventKey,
        payrollPeriodId: input.payrollPeriodId,
        subjectKey: input.subjectKey,
        sourceType: input.sourceType,
        component: input.component,
        amountHalfDong: input.amountHalfDong,
        sourceReference: input.sourceReference,
        sourceHash: input.sourceHash,
        sourceOccurredAt: input.sourceOccurredAt,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  private static assertTraceable(input: PayrollLedgerEventInput) {
    if (
      !input.eventKey.trim() ||
      !input.subjectKey.trim() ||
      !input.component.trim() ||
      !input.sourceReference.trim() ||
      !input.sourceHash.trim()
    ) {
      throw new Error('A payroll ledger event requires idempotency, subject, component and source evidence');
    }
    if (
      !Number.isSafeInteger(input.payrollPeriodId) ||
      input.payrollPeriodId <= 0 ||
      !Number.isSafeInteger(input.amountHalfDong)
    ) {
      throw new Error('A payroll ledger event requires an exact period and half-VND amount');
    }
  }
}

export const __test__ = { assertTraceable: PayrollLedgerEventService['assertTraceable'] };
