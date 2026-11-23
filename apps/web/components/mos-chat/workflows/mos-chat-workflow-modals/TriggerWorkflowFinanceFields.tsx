'use client';

import React from 'react';
import { WORKFLOW_CONTROL_CLASS, WorkflowField } from './WorkflowModalShell';

export interface TriggerWorkflowFinanceFieldsProps {
  idPrefix: string;
  amount: string;
  bankInfo: string;
  reason: string;
  onAmountChange: (value: string) => void;
  onBankInfoChange: (value: string) => void;
  onReasonChange: (value: string) => void;
}

export const TriggerWorkflowFinanceFields: React.FC<TriggerWorkflowFinanceFieldsProps> = ({
  idPrefix,
  amount,
  bankInfo,
  reason,
  onAmountChange,
  onBankInfoChange,
  onReasonChange,
}) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <WorkflowField label="Số tiền tạm ứng (VNĐ)" htmlFor={`${idPrefix}-amount`}>
        <input
          id={`${idPrefix}-amount`}
          type="text"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="tabular-nums w-full px-2.5 py-2 rounded-lg border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface-raised)] text-emerald-600 dark:text-emerald-400 font-bold text-[13px] focus:outline-none focus:border-[var(--mos-accent)]"
        />
      </WorkflowField>

      <WorkflowField label="Tài khoản nhận (Ngân hàng / STK)" htmlFor={`${idPrefix}-bank`}>
        <input
          id={`${idPrefix}-bank`}
          type="text"
          value={bankInfo}
          onChange={(e) => onBankInfoChange(e.target.value)}
          placeholder="VD: Vietcombank - 007100..."
          className={WORKFLOW_CONTROL_CLASS}
        />
      </WorkflowField>
    </div>

    <WorkflowField
      label="Lý do / Hạng mục chi (Tự động ghi sổ CrmCashFlowEntry khi hoàn tất)"
      htmlFor={`${idPrefix}-reason`}
    >
      <input
        id={`${idPrefix}-reason`}
        type="text"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Nhập chi tiết mục đích sử dụng..."
        className={WORKFLOW_CONTROL_CLASS}
      />
    </WorkflowField>
  </>
);
