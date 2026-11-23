import type { Fund, FundStatus, ToleranceMode } from '@mos-lab/shared';

export interface FundFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: (savedFund: Fund) => void;
  initialFund?: Fund | null;
}

export interface FundFormValues {
  name: string;
  code: string;
  description?: string;
  status: FundStatus;
  maxQuota: number;
  unitQuota: number;
  alertThresholdPercent?: number;
  toleranceMode: ToleranceMode;
  toleranceAmount?: number;
}

export interface StaffSelectOption {
  label: string;
  value: number;
}

export interface PermissionOption {
  value: string;
  label: string;
}
