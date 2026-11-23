import type { FalAdjustmentShadowResult, FalAdjustmentSnapshotInput } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import type { BlockedScenario, Eligibility, PeriodStatus } from './payrollAdjustmentLabTypes';

export function parseWholeDong(value: string): number | null {
  const normalized = value.trim().replace(/[,.\s]/g, '');
  if (!/^-?\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function formatAmountInput(value: string): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return negative ? '-' : '';
  const amount = Number(digits);
  if (!Number.isSafeInteger(amount)) return value;
  return `${negative ? '-' : ''}${amount.toLocaleString('en-US')}`;
}

export function formatDong(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toLocaleString('en-US')} đ`;
}

export function getShadowStatusTagType(status: FalAdjustmentShadowResult['status']): StatusType {
  return status === 'READY_FOR_APPROVAL' ? 'success' : 'gold';
}

export function getCaseStatusTagType(status: string): StatusType {
  return status === 'APPROVED' ? 'success' : 'gold';
}

export function buildShadowSnapshotInput(params: {
  before: number;
  after: number;
  sourceStatus: PeriodStatus;
  targetStatus: PeriodStatus;
  eligibility: Eligibility;
}): FalAdjustmentSnapshotInput {
  return {
    eventKey: 'local-lab:synthetic-adjustment',
    falRule: 'Adjust',
    financialEligibility: params.eligibility,
    sourcePeriod: {
      periodKey: '2026-08',
      status: params.sourceStatus,
      calculationVersion: 'fal-transactional.v1',
    },
    targetPeriod: { periodKey: '2026-09', status: params.targetStatus },
    beforeSettlement: {
      mode: 'SHADOW_READ_ONLY',
      sourcePeriodKey: '2026-08',
      calculationVersion: 'fal-transactional.v1',
      subjectKey: 'synthetic:cc:001',
      lineCount: 1,
      grossAmount: params.before,
      capAmount: null,
      receivedAmount: params.before,
      holdAmount: 0,
    },
    afterSettlement: {
      mode: 'SHADOW_READ_ONLY',
      sourcePeriodKey: '2026-08',
      calculationVersion: 'fal-transactional.v1',
      subjectKey: 'synthetic:cc:001',
      lineCount: 1,
      grossAmount: params.after,
      capAmount: null,
      receivedAmount: params.after,
      holdAmount: 0,
    },
  };
}

export function buildBlockedScenarioInput(blockedScenario: BlockedScenario): FalAdjustmentSnapshotInput {
  const sourceStatusForScenario: PeriodStatus = blockedScenario === 'SOURCE_REVIEWING' ? 'REVIEWING' : 'LOCKED';
  const targetStatusForScenario: PeriodStatus = blockedScenario === 'TARGET_REVIEWING' ? 'REVIEWING' : 'OPEN';
  const eligibilityForScenario: Eligibility =
    blockedScenario === 'PENDING_LOG_APPROVAL' ? 'PENDING_LOG_APPROVAL' : 'READY';
  const beforeSettlement = {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: '2026-08',
    calculationVersion: 'fal-transactional.v1',
    subjectKey: 'synthetic:cc:002',
    lineCount: 1,
    grossAmount: 2_990,
    capAmount: null,
    receivedAmount: 2_990,
    holdAmount: 0,
  };

  return {
    eventKey: `local-lab:fal-adjustment:blocked:${blockedScenario.toLowerCase()}`,
    falRule: 'Log',
    financialEligibility: eligibilityForScenario,
    sourcePeriod: {
      periodKey: '2026-08',
      status: sourceStatusForScenario,
      calculationVersion: 'fal-transactional.v1',
    },
    targetPeriod: { periodKey: '2026-09', status: targetStatusForScenario },
    beforeSettlement,
    afterSettlement: { ...beforeSettlement, grossAmount: 2_925, receivedAmount: 2_925 },
  };
}
