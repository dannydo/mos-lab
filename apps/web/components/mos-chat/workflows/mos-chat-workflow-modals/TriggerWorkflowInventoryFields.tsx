'use client';

import React from 'react';
import { WORKFLOW_WAREHOUSE_OPTIONS } from './workflowModalUtils';
import { WORKFLOW_COMPACT_CONTROL_CLASS, WORKFLOW_CONTROL_CLASS, WorkflowField } from './WorkflowModalShell';

export interface TriggerWorkflowInventoryFieldsProps {
  idPrefix: string;
  warehouse: string;
  inventoryText: string;
  onWarehouseChange: (value: string) => void;
  onInventoryTextChange: (value: string) => void;
}

export const TriggerWorkflowInventoryFields: React.FC<TriggerWorkflowInventoryFieldsProps> = ({
  idPrefix,
  warehouse,
  inventoryText,
  onWarehouseChange,
  onInventoryTextChange,
}) => (
  <>
    <WorkflowField label="Kho kiểm kê (mOS Kho)" htmlFor={`${idPrefix}-warehouse`}>
      <select
        id={`${idPrefix}-warehouse`}
        value={warehouse}
        onChange={(e) => onWarehouseChange(e.target.value)}
        className={WORKFLOW_CONTROL_CLASS}
      >
        {WORKFLOW_WAREHOUSE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </WorkflowField>

    <WorkflowField
      label="Số liệu đếm thực tế (Mỗi dòng: Tên vật tư | Số lượng thực tế — Để trống để lấy tự động từ mOS Kho)"
      htmlFor={`${idPrefix}-inventory`}
    >
      <textarea
        id={`${idPrefix}-inventory`}
        rows={3}
        value={inventoryText}
        onChange={(e) => onInventoryTextChange(e.target.value)}
        className={WORKFLOW_COMPACT_CONTROL_CLASS}
      />
    </WorkflowField>
  </>
);
