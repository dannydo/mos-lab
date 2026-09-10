import type { ShadowSettlementRequest, ShadowSettlementResult } from '@mos-lab/shared';

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an exact integer number of half-VND units`);
  }
}

/** Rounds one aggregated half-VND total, never its individual source lines. */
function roundHalfDong(amountHalfDong: number): number {
  return amountHalfDong >= 0 ? Math.floor((amountHalfDong + 1) / 2) : Math.ceil((amountHalfDong - 1) / 2);
}

/**
 * Read-only calculator for a closed payroll period. It accepts only a
 * locked-period snapshot, never reads live Level state and never writes a
 * settlement, adjustment, or legacy record.
 */
export function calculateShadowSettlement(request: ShadowSettlementRequest): ShadowSettlementResult {
  if (request.sourcePeriod.status !== 'LOCKED') {
    throw new Error('Shadow settlement requires a locked source payroll period');
  }
  if (!request.sourcePeriod.periodKey || !request.sourcePeriod.calculationVersion || !request.subjectKey) {
    throw new Error('Shadow settlement requires a source period, calculation version, and subject');
  }
  if (!request.lines.length) {
    throw new Error('Shadow settlement requires at least one source line');
  }

  const sourceKeys = new Set<string>();
  let grossAmountHalfDong = 0;
  for (const line of request.lines) {
    if (!line.sourceKey || sourceKeys.has(line.sourceKey)) {
      throw new Error('Shadow settlement source keys must be present and unique');
    }
    sourceKeys.add(line.sourceKey);
    assertSafeInteger(line.amountHalfDong, `Source line ${line.sourceKey}`);
    grossAmountHalfDong += line.amountHalfDong;
    assertSafeInteger(grossAmountHalfDong, 'Shadow settlement aggregate');
  }

  if (request.capAmountHalfDong != null) {
    assertSafeInteger(request.capAmountHalfDong, 'Shadow settlement cap');
    if (request.capAmountHalfDong < 0) throw new Error('Shadow settlement cap cannot be negative');
  }

  const grossAmount = roundHalfDong(grossAmountHalfDong);
  const capAmount = request.capAmountHalfDong == null ? null : roundHalfDong(request.capAmountHalfDong);
  const receivedAmount = capAmount == null || grossAmount <= 0 ? grossAmount : Math.min(grossAmount, capAmount);
  const holdAmount = Math.max(0, grossAmount - receivedAmount);

  return {
    mode: 'SHADOW_READ_ONLY',
    sourcePeriodKey: request.sourcePeriod.periodKey,
    calculationVersion: request.sourcePeriod.calculationVersion,
    subjectKey: request.subjectKey,
    lineCount: request.lines.length,
    grossAmount,
    capAmount,
    receivedAmount,
    holdAmount,
  };
}

/**
 * Calculates a settlement-review snapshot after its event inputs have been
 * captured in one local transaction. Unlike an adjustment, this creates the
 * source settlement itself, so its period is still REVIEWING at this point.
 */
export function calculateSettlementFromEventSnapshot(
  request: Omit<ShadowSettlementRequest, 'sourcePeriod'> & {
    sourcePeriod: Pick<ShadowSettlementRequest['sourcePeriod'], 'periodKey' | 'calculationVersion'>;
  }
): ShadowSettlementResult {
  return calculateShadowSettlement({
    ...request,
    sourcePeriod: { ...request.sourcePeriod, status: 'LOCKED' },
  });
}
