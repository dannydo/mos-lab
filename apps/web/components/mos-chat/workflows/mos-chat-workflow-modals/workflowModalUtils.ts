import type {
  MosChatStaffMember,
  MosChatWorkflowCategory,
  MosChatWorkflowTargetHook,
  MosChatWorkflowTemplate,
} from '@mos-lab/shared';
import type { ParsedInventoryAuditRow, StepActorOverride } from './workflowModalTypes';

export const DEFAULT_TRIGGER_TEMPLATE_CODE = 'WF_CASH_ADVANCE';
export const DEFAULT_WORKFLOW_AMOUNT = '2000000';
export const DEFAULT_WORKFLOW_WAREHOUSE = 'detham';
export const DEFAULT_INVENTORY_AUDIT_TEXT = 'Keo nối mi Dark Lashes Premium | 14\nKhay mi Lụa Thiết kế 0.07 C | 42';
export const DEFAULT_NEW_WORKFLOW_NAME = 'Quy trình Phối hợp Nội bộ Mới';

export const WORKFLOW_WAREHOUSE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'detham', label: 'Kho Đề Thám (detham)' },
  { value: 'central', label: 'Kho Tổng (central)' },
];

export const WORKFLOW_CATEGORY_OPTIONS: ReadonlyArray<{ value: MosChatWorkflowCategory; label: string }> = [
  { value: 'OPERATIONS', label: 'Vận hành nội bộ' },
  { value: 'FINANCE', label: 'Tài chính / Tạm ứng' },
  { value: 'INVENTORY', label: 'Kiểm kho & Vật tư' },
  { value: 'BRAINSTORM', label: 'Nghiên cứu & Brainstorm' },
];

export const WORKFLOW_TARGET_HOOK_OPTIONS: ReadonlyArray<{ value: MosChatWorkflowTargetHook; label: string }> = [
  { value: 'NONE', label: 'Chỉ lưu hồ sơ quy trình' },
  { value: 'CASHFLOW_ENTRY', label: 'Ghi sổ Báo cáo Thu Chi' },
  { value: 'STOCK_INVENTORY', label: 'Đồng bộ tồn mOS Kho' },
];

export function resolveDefaultWorkflowTitle(template: MosChatWorkflowTemplate): string {
  if (template.code === 'WF_CASH_ADVANCE') {
    return 'Đề xuất tạm ứng kinh phí vận hành';
  }
  if (template.code === 'WF_INVENTORY_AUDIT') {
    return 'Báo cáo kiểm kho & đối soát thực tế mOS Kho';
  }
  return template.name;
}

export function parseInventoryAuditLines(inventoryText: string): ParsedInventoryAuditRow[] {
  return inventoryText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      return {
        materialName: parts[0] || 'Vật tư kho',
        actualQty: Number(parts[1] || 0),
      };
    });
}

export function buildTriggerWorkflowFormData(params: {
  template: MosChatWorkflowTemplate;
  title: string;
  amount: string;
  reason: string;
  bankInfo: string;
  warehouse: string;
  inventoryText: string;
}): Record<string, unknown> {
  const { template, title, amount, reason, bankInfo, warehouse, inventoryText } = params;
  const formData: Record<string, unknown> = {};

  if (template.targetSystemHook === 'CASHFLOW_ENTRY' || template.category === 'FINANCE') {
    formData.amount = Number(String(amount).replace(/[^0-9]/g, '')) || 0;
    formData.reason = reason.trim() || title.trim();
    formData.bankInfo = bankInfo.trim();
    formData.cashFlowCategory = 'OPEX';
    return formData;
  }

  if (template.targetSystemHook === 'STOCK_INVENTORY' || template.category === 'INVENTORY') {
    formData.warehouse = warehouse;
    const parsedRows = parseInventoryAuditLines(inventoryText);
    if (parsedRows.length > 0) {
      formData.inventoryItems = parsedRows;
    }
    return formData;
  }

  formData.reason = reason.trim();
  return formData;
}

export function buildStepActorOverrides(
  stepActors: Record<number, number | ''>,
  staffDirectory: MosChatStaffMember[]
): Record<number, StepActorOverride> {
  const overrides: Record<number, StepActorOverride> = {};
  for (const [idxStr, staffIdVal] of Object.entries(stepActors)) {
    if (!staffIdVal) continue;
    const staff = staffDirectory.find((member) => Number(member.id) === Number(staffIdVal));
    if (staff) {
      overrides[Number(idxStr)] = {
        actorStaffId: staff.id,
        actorName: staff.displayName || staff.username,
      };
    }
  }
  return overrides;
}

export function extractWorkflowErrorMessage(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err instanceof Error ? err.message : fallback)
  );
}
