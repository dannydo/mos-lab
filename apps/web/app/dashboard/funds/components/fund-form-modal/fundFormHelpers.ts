import type {
  CreateFundRequest,
  CreateFundRoleInput,
  Fund,
  FundApprovalStepConfig,
  FundApprovalWorkflowConfig,
  FundStatus,
  ToleranceMode,
} from '@mos-lab/shared';
import { removeVietnameseTones } from '~/lib/utils/search';
import { createDefaultApprovalSteps, createDefaultStandardRoles } from './fundFormConstants';
import type { FundFormValues } from './types';

export function generateSuggestedFundCode(name: string): string {
  if (!name.trim()) return '';
  let noTones = removeVietnameseTones(name)
    .toUpperCase()
    .replace(/[^A-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  if (!noTones) return 'FUND_CUSTOM';
  if (noTones.startsWith('QUY_')) {
    noTones = noTones.substring(4);
  }
  if (!noTones.startsWith('FUND_')) {
    return `FUND_${noTones}`;
  }
  return noTones;
}

export function formatCurrencyInput(val: number | string | undefined): string {
  if (val === undefined || val === null) return '';
  return `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseCurrencyInput(val: string | undefined): number {
  return val ? Number(val.replace(/\$\s?|(,*)/g, '')) : 0;
}

export function mapFundRolesToInputs(initialFund: Fund): CreateFundRoleInput[] {
  if (!Array.isArray(initialFund.roles) || initialFund.roles.length === 0) {
    return createDefaultStandardRoles();
  }

  return initialFund.roles.map((r) => {
    const assignedIds = (initialFund.assignments || []).filter((a) => a.roleKey === r.roleKey).map((a) => a.staffId);
    return {
      roleKey: r.roleKey,
      roleName: r.roleName,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      assignedStaffIds: assignedIds,
    };
  });
}

export function resolveInitialApprovalConfig(initialFund: Fund): {
  enabled: boolean;
  steps: FundApprovalStepConfig[];
} {
  if (!initialFund.approvalConfig) {
    return {
      enabled: true,
      steps: createDefaultApprovalSteps(),
    };
  }

  const hasSteps = Array.isArray(initialFund.approvalConfig.steps) && initialFund.approvalConfig.steps.length > 0;
  return {
    enabled: initialFund.approvalConfig.enabled ?? true,
    steps: hasSteps ? initialFund.approvalConfig.steps : createDefaultApprovalSteps(),
  };
}

export function buildFundFormInitialValues(initialFund?: Fund | null): FundFormValues {
  if (!initialFund) {
    return {
      name: '',
      code: '',
      description: '',
      status: 'DRAFT',
      maxQuota: 2000000,
      unitQuota: 50000,
      alertThresholdPercent: 80,
      toleranceMode: 'STRICT',
      toleranceAmount: 0,
    };
  }

  return {
    name: initialFund.name,
    code: initialFund.code,
    description: initialFund.description || '',
    status: initialFund.status || 'DRAFT',
    maxQuota: initialFund.maxQuota || 1000000,
    unitQuota: initialFund.unitQuota || 50000,
    alertThresholdPercent: initialFund.alertThresholdPercent ?? 80,
    toleranceMode: initialFund.toleranceMode || 'STRICT',
    toleranceAmount: initialFund.toleranceAmount || 0,
  };
}

export function buildCreateFundPayload(
  values: FundFormValues,
  roles: CreateFundRoleInput[],
  approvalEnabled: boolean,
  approvalSteps: FundApprovalStepConfig[]
): CreateFundRequest {
  const approvalConfig: FundApprovalWorkflowConfig = {
    enabled: approvalEnabled,
    steps: approvalSteps,
  };

  return {
    name: values.name.trim(),
    code: values.code.trim().toUpperCase(),
    description: values.description ? values.description.trim() : '',
    status: values.status as FundStatus,
    maxQuota: Number(values.maxQuota),
    unitQuota: Number(values.unitQuota),
    alertThresholdPercent: Number(values.alertThresholdPercent ?? 80),
    toleranceMode: values.toleranceMode as ToleranceMode,
    toleranceAmount: values.toleranceMode === 'TOLERANCE_FIXED' ? Number(values.toleranceAmount || 0) : 0,
    roles,
    approvalConfig,
  };
}
