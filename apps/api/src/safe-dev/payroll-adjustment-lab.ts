import type {
  FalAdjustmentSnapshotInput,
  HrCustomAdjustmentInput,
  PayrollAdjustmentLabHrCustomResponse,
  PayrollAdjustmentLabShadowResponse,
} from '@mos-lab/shared';
import { calculateFalAdjustmentShadow } from '../modules/payroll-ledger/fal-adjustment-shadow.service.js';
import { validateHrCustomAdjustment } from '../modules/payroll-ledger/hr-custom-adjustment.service.js';

/**
 * A deliberately narrow bridge for the disposable local lab. It invokes the
 * canonical read-only calculator and never receives a database client.
 */
export function calculatePayrollAdjustmentLabShadow(
  input: FalAdjustmentSnapshotInput
): PayrollAdjustmentLabShadowResponse {
  return {
    mode: 'LOCAL_ONLY',
    result: calculateFalAdjustmentShadow(input),
  };
}

export function validatePayrollAdjustmentLabHrCustom(
  input: HrCustomAdjustmentInput
): PayrollAdjustmentLabHrCustomResponse {
  return { mode: 'LOCAL_ONLY', draft: validateHrCustomAdjustment(input) };
}
