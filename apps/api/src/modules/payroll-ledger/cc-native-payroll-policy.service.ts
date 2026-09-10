import { createHash } from 'node:crypto';
import { CC_GAMIFICATION_SYSTEM_CONFIG } from '@mos-lab/shared';
import type { Prisma } from '../../generated/crm-client/index.js';
import { PayrollLedgerEventService, type PayrollLedgerEventInput } from './payroll-ledger-event.service.js';
import type { PayrollSettlementPolicySnapshot } from './payroll-settlement-builder.service.js';

export const CC_NATIVE_PAYROLL_POLICY_VERSION = 'cc-native-payroll.v1';

const CC_SOURCE_COMPONENTS = ['CC_DAILY_BONUS', 'CC_XOAY_CASH', 'CC_TIP_CASH'] as const;
type CcSourceComponent = (typeof CC_SOURCE_COMPONENTS)[number];

export type CcXoayCashRuleInput = {
  /** CC points accumulated before the service; each new month starts at zero. */
  previousPoints: number;
  /** One CC owns the shift, or two distinct CCs share it equally. */
  shareCount: 1 | 2;
};

/**
 * The native CC Cash formula mirrors the operational rule exactly, in
 * half-VND units: floor(previous points / 100) + 1, multiplied by 65 VND,
 * then split equally when CC IN and CC OUT are distinct. It deliberately
 * keeps 32.5 VND as 65 half-VND rather than rounding a single service.
 */
export function calculateCcXoayCashHalfDong(input: CcXoayCashRuleInput): number {
  if (!Number.isFinite(input.previousPoints) || input.previousPoints < 0) {
    throw new Error('CC Cash calculation requires a non-negative prior point balance');
  }
  const level = Math.floor(input.previousPoints / CC_GAMIFICATION_SYSTEM_CONFIG.POINTS_PER_LEVEL) + 1;
  const fullBonusHalfDong = level * CC_GAMIFICATION_SYSTEM_CONFIG.BONUS_PER_LEVEL_VND * 2;
  return fullBonusHalfDong / input.shareCount;
}

type CcSourceEvent = {
  eventKey: string;
  component: CcSourceComponent;
  amountHalfDong: number;
  sourceReference: string;
  sourceHash: string;
  sourceOccurredAt: Date;
  metadata?: Record<string, unknown> | null;
};

export type CcNativePayrollCaptureInput = {
  payrollPeriodId: number;
  periodKey: string;
  subjectKey: string;
  events: readonly CcSourceEvent[];
};

export type PreparedCcNativePayrollCapture = {
  policy: PayrollSettlementPolicySnapshot;
  ledgerEvents: readonly PayrollLedgerEventInput[];
  dailyBonusHalfDong: number;
  rawXoayHalfDong: number;
  capHalfDong: number;
  heldXoayHalfDong: number;
};

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertSourceEvent(event: CcSourceEvent, knownKeys: Set<string>) {
  if (
    !event.eventKey.trim() ||
    !event.sourceReference.trim() ||
    !event.sourceHash.trim() ||
    !CC_SOURCE_COMPONENTS.includes(event.component) ||
    knownKeys.has(event.eventKey)
  ) {
    throw new Error('A native CC event requires a unique key, known component, and source evidence');
  }
  if (!event.sourceReference.startsWith('mos:')) {
    throw new Error('Native CC payroll accepts evidence created by mOS, never a Legacy or iOS reference');
  }
  if (!Number.isSafeInteger(event.amountHalfDong) || event.amountHalfDong < 0) {
    throw new Error('A native CC source event must be a non-negative exact half-VND amount');
  }
  knownKeys.add(event.eventKey);
}

/**
 * Converts verified mOS CC evidence into an append-only payroll-event bundle.
 * It deliberately does not read or recalculate Legacy/iOS rows. Cash Xoay
 * must already be supplied as source evidence; missing cash evidence is zero,
 * never a Level x 65 fallback. The 150% cap is represented as a separate,
 * immutable hold event so the generic settlement builder can audit it.
 */
export function prepareCcNativePayrollCapture(input: CcNativePayrollCaptureInput): PreparedCcNativePayrollCapture {
  if (
    !Number.isSafeInteger(input.payrollPeriodId) ||
    input.payrollPeriodId <= 0 ||
    !input.periodKey.trim() ||
    !input.subjectKey.trim() ||
    !input.events.length
  ) {
    throw new Error('A native CC payroll capture requires a period, subject, and source events');
  }

  const eventKeys = new Set<string>();
  let dailyBonusHalfDong = 0;
  let dailyBonusEventCount = 0;
  let rawXoayHalfDong = 0;
  const orderedEvents = [...input.events].sort(
    (left, right) =>
      left.sourceOccurredAt.getTime() - right.sourceOccurredAt.getTime() || left.eventKey.localeCompare(right.eventKey)
  );
  for (const event of orderedEvents) {
    assertSourceEvent(event, eventKeys);
    if (event.component === 'CC_DAILY_BONUS') {
      dailyBonusEventCount += 1;
      dailyBonusHalfDong += event.amountHalfDong;
    }
    if (event.component === 'CC_XOAY_CASH') rawXoayHalfDong += event.amountHalfDong;
  }
  if (!dailyBonusEventCount) {
    throw new Error('Native CC policy finalization requires a daily-sales-close evidence for the payroll month');
  }
  if (dailyBonusHalfDong % 2 !== 0) {
    throw new Error('Native CC Daily Bonus must be whole VND so its 150% cap stays exact to half-VND');
  }

  const capHalfDong = (dailyBonusHalfDong * 3) / 2;
  const heldXoayHalfDong = Math.max(0, rawXoayHalfDong - capHalfDong);
  const evidence = orderedEvents.map((event) => ({
    eventKey: event.eventKey,
    component: event.component,
    amountHalfDong: event.amountHalfDong,
    sourceReference: event.sourceReference,
    sourceHash: event.sourceHash,
    sourceOccurredAt: event.sourceOccurredAt.toISOString(),
  }));
  const policyHash = stableHash({
    version: CC_NATIVE_PAYROLL_POLICY_VERSION,
    periodKey: input.periodKey,
    subjectKey: input.subjectKey,
    rule: 'CC_XOAY_CASH <= 150% CC_DAILY_BONUS',
    evidence,
  });

  const ledgerEvents: PayrollLedgerEventInput[] = orderedEvents.map((event) => ({
    eventKey: event.eventKey,
    payrollPeriodId: input.payrollPeriodId,
    subjectKey: input.subjectKey,
    sourceType: 'CC',
    component: event.component,
    amountHalfDong: event.amountHalfDong,
    sourceReference: event.sourceReference,
    sourceHash: event.sourceHash,
    sourceOccurredAt: event.sourceOccurredAt,
    metadata: event.metadata ?? null,
  }));
  if (heldXoayHalfDong > 0) {
    ledgerEvents.push({
      eventKey: `mos:cc:xoay-hold:${input.periodKey}:${input.subjectKey}`,
      payrollPeriodId: input.payrollPeriodId,
      subjectKey: input.subjectKey,
      sourceType: 'CC',
      component: 'CC_XOAY_CAP_HOLD',
      amountHalfDong: -heldXoayHalfDong,
      sourceReference: `mos:cc-policy:${input.periodKey}:${input.subjectKey}`,
      sourceHash: policyHash,
      sourceOccurredAt: orderedEvents.at(-1)!.sourceOccurredAt,
      metadata: { policyVersion: CC_NATIVE_PAYROLL_POLICY_VERSION, capHalfDong, heldXoayHalfDong },
    });
  }
  ledgerEvents.push({
    eventKey: `mos:cc:policy-finalized:${input.periodKey}:${input.subjectKey}`,
    payrollPeriodId: input.payrollPeriodId,
    subjectKey: input.subjectKey,
    sourceType: 'CC',
    component: 'CC_POLICY_FINALIZED',
    amountHalfDong: 0,
    sourceReference: `mos:cc-policy:${input.periodKey}:${input.subjectKey}`,
    sourceHash: policyHash,
    sourceOccurredAt: orderedEvents.at(-1)!.sourceOccurredAt,
    metadata: { policyVersion: CC_NATIVE_PAYROLL_POLICY_VERSION, capHalfDong, heldXoayHalfDong },
  });

  return {
    policy: {
      subjectKey: input.subjectKey,
      capAmountHalfDong: null,
      policyVersion: CC_NATIVE_PAYROLL_POLICY_VERSION,
      policyReference: 'CC-003,PAY-001',
      policyHash,
    },
    ledgerEvents,
    dailyBonusHalfDong,
    rawXoayHalfDong,
    capHalfDong,
    heldXoayHalfDong,
  };
}

/** Captures a fully prepared CC bundle atomically. It cannot review, lock, export, or post money. */
export class CcNativePayrollPolicyService {
  static async capture(
    tx: Prisma.TransactionClient,
    input: CcNativePayrollCaptureInput
  ): Promise<PreparedCcNativePayrollCapture> {
    const prepared = prepareCcNativePayrollCapture(input);
    for (const event of prepared.ledgerEvents) await PayrollLedgerEventService.append(tx, event);
    return prepared;
  }
}

export const __test__ = { prepareCcNativePayrollCapture, calculateCcXoayCashHalfDong };
