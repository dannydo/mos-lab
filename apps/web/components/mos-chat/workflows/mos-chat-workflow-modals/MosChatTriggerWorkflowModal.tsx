'use client';

import React, { useId } from 'react';
import type { MosChatTriggerWorkflowModalProps } from './workflowModalTypes';
import { useTriggerWorkflowForm } from './useTriggerWorkflowForm';
import { WORKFLOW_CONTROL_CLASS, WorkflowField, WorkflowModalShell } from './WorkflowModalShell';
import { TriggerWorkflowFinanceFields } from './TriggerWorkflowFinanceFields';
import { TriggerWorkflowInventoryFields } from './TriggerWorkflowInventoryFields';
import { TriggerWorkflowStepActorsSection } from './TriggerWorkflowStepActorsSection';

export const MosChatTriggerWorkflowModal: React.FC<MosChatTriggerWorkflowModalProps> = ({
  open,
  isDark,
  conversationId,
  templates,
  staffDirectory,
  initialTemplateCode,
  onClose,
  onCreated,
}) => {
  const idPrefix = useId();
  const {
    selectedCode,
    setSelectedCode,
    title,
    setTitle,
    amount,
    setAmount,
    reason,
    setReason,
    bankInfo,
    setBankInfo,
    warehouse,
    setWarehouse,
    inventoryText,
    setInventoryText,
    stepActors,
    handleStepActorChange,
    submitting,
    errorMsg,
    activeTemplate,
    handleSubmit,
  } = useTriggerWorkflowForm({
    open,
    conversationId,
    templates,
    staffDirectory,
    initialTemplateCode,
    onClose,
    onCreated,
  });

  return (
    <WorkflowModalShell
      open={open}
      isDark={isDark}
      eyebrow="⚡ Super Admin Operational OS"
      title="Khởi tạo Quy trình Sống trong mOS Chat"
      maxWidthClassName="max-w-[540px]"
      titleClassName="text-[17px]"
      errorMsg={errorMsg}
      submitting={submitting}
      submitLabel="⚡ Phát Thẻ Quy Trình vào Nhóm"
      submittingLabel="Đang khởi tạo..."
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
    >
      <WorkflowField label="Chọn mẫu Quy trình (Workflow Template)" htmlFor={`${idPrefix}-template`}>
        <select
          id={`${idPrefix}-template`}
          value={selectedCode}
          onChange={(e) => setSelectedCode(e.target.value)}
          className={WORKFLOW_CONTROL_CLASS}
        >
          {templates.map((tpl) => (
            <option key={tpl.code} value={tpl.code}>
              {tpl.name} (v{tpl.version})
            </option>
          ))}
        </select>
      </WorkflowField>

      <WorkflowField label="Tiêu đề phiếu quy trình" htmlFor={`${idPrefix}-title`}>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={WORKFLOW_CONTROL_CLASS}
        />
      </WorkflowField>

      {activeTemplate?.targetSystemHook === 'CASHFLOW_ENTRY' && (
        <TriggerWorkflowFinanceFields
          idPrefix={idPrefix}
          amount={amount}
          bankInfo={bankInfo}
          reason={reason}
          onAmountChange={setAmount}
          onBankInfoChange={setBankInfo}
          onReasonChange={setReason}
        />
      )}

      {activeTemplate?.targetSystemHook === 'STOCK_INVENTORY' && (
        <TriggerWorkflowInventoryFields
          idPrefix={idPrefix}
          warehouse={warehouse}
          inventoryText={inventoryText}
          onWarehouseChange={setWarehouse}
          onInventoryTextChange={setInventoryText}
        />
      )}

      {activeTemplate && (
        <TriggerWorkflowStepActorsSection
          idPrefix={idPrefix}
          steps={activeTemplate.steps}
          staffDirectory={staffDirectory}
          stepActors={stepActors}
          onStepActorChange={handleStepActorChange}
        />
      )}
    </WorkflowModalShell>
  );
};
