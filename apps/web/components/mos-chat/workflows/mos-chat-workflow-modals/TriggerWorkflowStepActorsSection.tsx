'use client';

import React from 'react';
import type { MosChatStaffMember, MosChatWorkflowStepDefinition } from '@mos-lab/shared';

export interface TriggerWorkflowStepActorsSectionProps {
  idPrefix: string;
  steps: MosChatWorkflowStepDefinition[];
  staffDirectory: MosChatStaffMember[];
  stepActors: Record<number, number | ''>;
  onStepActorChange: (stepIndex: number, staffIdValue: string) => void;
}

export const TriggerWorkflowStepActorsSection: React.FC<TriggerWorkflowStepActorsSectionProps> = ({
  idPrefix,
  steps,
  staffDirectory,
  stepActors,
  onStepActorChange,
}) => (
  <div className="p-3 rounded-[10px] bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)]">
    <div className="text-xs font-bold mb-2">Phân công nhân sự thực hiện từng bước (Tự động tạo Nhắc việc)</div>
    <div className="flex flex-col gap-2">
      {steps.map((step, idx) => (
        <div key={step.id || idx} className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2 items-center text-xs">
          <label htmlFor={`${idPrefix}-step-${idx}`} className="tabular-nums">
            <strong>Bước {idx + 1}:</strong> {step.title} ({step.actorRole})
          </label>
          <select
            id={`${idPrefix}-step-${idx}`}
            value={stepActors[idx] ?? ''}
            onChange={(e) => onStepActorChange(idx, e.target.value)}
            className="px-2 py-[5px] rounded-md border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface)] text-[var(--mos-text)] text-[11.5px] focus:outline-none focus:border-[var(--mos-accent)]"
          >
            <option value="">Mặc định theo vai trò ({step.actorRole})</option>
            {staffDirectory.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.displayName || staff.username} ({staff.role})
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  </div>
);
