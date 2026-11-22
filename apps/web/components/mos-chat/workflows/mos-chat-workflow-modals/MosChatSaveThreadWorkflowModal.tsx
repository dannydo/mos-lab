'use client';

import React, { useId } from 'react';
import type { MosChatWorkflowCategory, MosChatWorkflowTargetHook } from '@mos-lab/shared';
import type { MosChatSaveThreadWorkflowModalProps, SaveThreadWorkflowMode } from './workflowModalTypes';
import { WORKFLOW_CATEGORY_OPTIONS, WORKFLOW_TARGET_HOOK_OPTIONS } from './workflowModalUtils';
import { useSaveThreadWorkflowForm } from './useSaveThreadWorkflowForm';
import {
  WORKFLOW_COMPACT_CONTROL_CLASS,
  WORKFLOW_CONTROL_CLASS,
  WorkflowField,
  WorkflowModalShell,
} from './WorkflowModalShell';

const MODE_BUTTON_BASE_CLASS = 'flex-1 py-[7px] px-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors';
const MODE_BUTTON_ACTIVE_CLASS =
  'border border-[var(--mos-accent)] bg-[var(--mos-focus-ring)] text-[var(--mos-accent)]';
const MODE_BUTTON_INACTIVE_CLASS =
  'border border-[var(--mos-surface-border-strong)] bg-[var(--mos-surface-raised)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]';

const SAVE_WORKFLOW_MODE_TABS: ReadonlyArray<{ mode: SaveThreadWorkflowMode; label: string }> = [
  { mode: 'NEW_FROM_THREAD', label: 'Đóng gói Thread này thành Workflow mới' },
  { mode: 'UPGRADE_EXISTING', label: 'Nâng cấp Workflow đang có' },
];

export const MosChatSaveThreadWorkflowModal: React.FC<MosChatSaveThreadWorkflowModalProps> = ({
  open,
  isDark,
  conversationId,
  messageId,
  defaultName,
  existingTemplates,
  onClose,
  onSaved,
}) => {
  const idPrefix = useId();
  const {
    mode,
    setMode,
    selectedExistingCode,
    setSelectedExistingCode,
    name,
    setName,
    category,
    setCategory,
    targetHook,
    setTargetHook,
    upgradeInstruction,
    setUpgradeInstruction,
    submitting,
    errorMsg,
    handleSave,
  } = useSaveThreadWorkflowForm({
    conversationId,
    messageId,
    defaultName,
    existingTemplates,
    onClose,
    onSaved,
  });

  return (
    <WorkflowModalShell
      open={open}
      isDark={isDark}
      eyebrow="✨ Adaptive Workflow Builder (Super Admin)"
      title="Chuẩn hóa Ngữ cảnh Chat thành Workflow / Nâng cấp Quy trình"
      maxWidthClassName="max-w-[500px]"
      titleClassName="text-[16.5px]"
      errorMsg={errorMsg}
      submitting={submitting}
      submitLabel="✨ Lưu & Áp dụng Quy Trình"
      submittingLabel="Đang lưu..."
      onClose={onClose}
      onSubmit={() => void handleSave()}
    >
      <div className="flex gap-2">
        {SAVE_WORKFLOW_MODE_TABS.map((tab) => {
          const isActive = mode === tab.mode;
          return (
            <button
              key={tab.mode}
              type="button"
              onClick={() => setMode(tab.mode)}
              className={`${MODE_BUTTON_BASE_CLASS} ${isActive ? MODE_BUTTON_ACTIVE_CLASS : MODE_BUTTON_INACTIVE_CLASS}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === 'NEW_FROM_THREAD' ? (
        <>
          <WorkflowField
            label="Tên quy trình mới (Tự động học các bước từ người tham gia trong Thread)"
            htmlFor={`${idPrefix}-name`}
          >
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={WORKFLOW_CONTROL_CLASS}
            />
          </WorkflowField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <WorkflowField label="Phân loại" htmlFor={`${idPrefix}-category`}>
              <select
                id={`${idPrefix}-category`}
                value={category}
                onChange={(e) => setCategory(e.target.value as MosChatWorkflowCategory)}
                className={WORKFLOW_COMPACT_CONTROL_CLASS}
              >
                {WORKFLOW_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </WorkflowField>

            <WorkflowField label="Đồng bộ tự động khi hoàn tất" htmlFor={`${idPrefix}-hook`}>
              <select
                id={`${idPrefix}-hook`}
                value={targetHook}
                onChange={(e) => setTargetHook(e.target.value as MosChatWorkflowTargetHook)}
                className={WORKFLOW_COMPACT_CONTROL_CLASS}
              >
                {WORKFLOW_TARGET_HOOK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </WorkflowField>
          </div>
        </>
      ) : (
        <WorkflowField label="Chọn quy trình cần nâng cấp" htmlFor={`${idPrefix}-existing`}>
          <select
            id={`${idPrefix}-existing`}
            value={selectedExistingCode}
            onChange={(e) => setSelectedExistingCode(e.target.value)}
            className={WORKFLOW_CONTROL_CLASS}
          >
            {existingTemplates.map((tpl) => (
              <option key={tpl.code} value={tpl.code}>
                {tpl.name} (v{tpl.version})
              </option>
            ))}
          </select>
        </WorkflowField>
      )}

      <WorkflowField
        label="Chỉ dẫn nâng cấp / tùy chỉnh bằng ngôn ngữ tự nhiên (Tùy chọn)"
        htmlFor={`${idPrefix}-instruction`}
      >
        <textarea
          id={`${idPrefix}-instruction`}
          rows={3}
          value={upgradeInstruction}
          onChange={(e) => setUpgradeInstruction(e.target.value)}
          placeholder='VD: "Đổi bước duyệt 2 từ CEO sang Quản lý Vận hành" hoặc "Thêm bước Kế toán trưởng kiểm tra chứng từ"...'
          className={WORKFLOW_COMPACT_CONTROL_CLASS}
        />
      </WorkflowField>
    </WorkflowModalShell>
  );
};
